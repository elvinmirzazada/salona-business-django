// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeBooking();
});

async function initializeBooking() {
    await fetchServices();
    renderCalendar();
    setupEventListeners();
}

// Fetch services from API
async function fetchServices() {
    try {
        const response = await fetch(`http://127.0.0.1:8000/api/v1/services/companies/${bookingState.companyId}/services`);
        const data = await response.json();

        if (data.success && data.data) {
            bookingState.allServices = data.data;
            renderServices('all');
        }
    } catch (error) {
        console.error('Error fetching services:', error);
        document.getElementById('services-grid').innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <div>Failed to load services</div>
            </div>`;
    }
}

// Fetch staff from API
async function fetchStaff() {
    try {
        const response = await fetch(`http://127.0.0.1:8000/api/v1/services/companies/${bookingState.companyId}/users`);
        const data = await response.json();

        if (data.success && data.data) {
            bookingState.allStaff = data.data;
            renderStaff();
        }
    } catch (error) {
        console.error('Error fetching staff:', error);
    }
}

// Render services
function renderServices(category) {
    const grid = document.getElementById('services-grid');
    grid.innerHTML = '';

    bookingState.allServices.forEach(cat => {
        if (cat.services && cat.services.length > 0) {
            cat.services.forEach(service => {
                if (service.status === 'active') {
                    const shouldShow = category === 'all' || cat.name.toLowerCase() === category;
                    if (shouldShow) {
                        const price = service.discount_price || service.price;
                        const isSelected = bookingState.selectedServices.has(service.id);

                        const card = document.createElement('div');
                        card.className = `service-card ${isSelected ? 'selected' : ''}`;
                        card.dataset.id = service.id;
                        card.dataset.price = price;
                        card.dataset.duration = service.duration;
                        card.innerHTML = `
                            <div class="service-card-header">
                                <div class="service-name">${service.name}</div>
                                <div class="service-checkbox"></div>
                            </div>
                            <div class="service-meta">
                                <div class="service-duration">⏱ ${service.duration} min</div>
                                <div class="service-price">€${price}</div>
                            </div>
                        `;
                        card.addEventListener('click', () => toggleService(service.id, service.name, price, service.duration));
                        grid.appendChild(card);
                    }
                }
            });
        }
    });
}

// Render staff
function renderStaff() {
    const grid = document.getElementById('staff-grid');
    grid.innerHTML = '';

    // Add "Any Professional" option
    const anyCard = document.createElement('div');
    anyCard.className = 'staff-card';
    anyCard.dataset.id = 'any';
    anyCard.innerHTML = `
        <div class="staff-avatar">👤</div>
        <div class="staff-name">Any Available</div>
        <div class="staff-role">No preference</div>
    `;
    anyCard.addEventListener('click', () => selectStaff('any', 'Any Available Professional'));
    grid.appendChild(anyCard);

    // Add staff members
    bookingState.allStaff.forEach(item => {
        if (item.user) {
            const user = item.user;
            const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
            const initials = (user.first_name?.[0] || '') + (user.last_name?.[0] || '');

            const card = document.createElement('div');
            card.className = 'staff-card';
            card.dataset.id = user.id;
            card.innerHTML = `
                <div class="staff-avatar">${initials || '👤'}</div>
                <div class="staff-name">${fullName || 'Professional'}</div>
                <div class="staff-role">Specialist</div>
            `;
            card.addEventListener('click', () => selectStaff(user.id, fullName));
            grid.appendChild(card);
        }
    });
}

// Toggle service selection
function toggleService(id, name, price, duration) {
    const serviceData = { id, name, price, duration };

    if (bookingState.selectedServices.has(id)) {
        bookingState.selectedServices.delete(id);
        bookingState.services = bookingState.services.filter(s => s.id !== id);
    } else {
        bookingState.selectedServices.add(id);
        bookingState.services.push(serviceData);
    }

    // Update UI
    const card = document.querySelector(`.service-card[data-id="${id}"]`);
    if (card) {
        card.classList.toggle('selected');
    }

    updateSummary();

    // Load staff if first service selected
    if (bookingState.selectedServices.size === 1 && !bookingState.allStaff.length) {
        fetchStaff();
        document.getElementById('staff-number').classList.remove('inactive');
    } else if (bookingState.selectedServices.size === 0) {
        document.getElementById('staff-number').classList.add('inactive');
    }
}

// Select staff
function selectStaff(id, name) {
    bookingState.selectedStaff = { id, name };

    // Update UI
    document.querySelectorAll('.staff-card').forEach(card => {
        card.classList.remove('selected');
    });
    document.querySelector(`.staff-card[data-id="${id}"]`).classList.add('selected');

    document.getElementById('datetime-number').classList.remove('inactive');
    updateSummary();

    // Fetch available slots if date is selected
    if (bookingState.selectedDate) {
        fetchAvailableSlots();
    }
}

// Calendar rendering
function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const monthDisplay = document.getElementById('calendar-month');

    const year = bookingState.currentMonth.getFullYear();
    const month = bookingState.currentMonth.getMonth();

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
    monthDisplay.textContent = `${monthNames[month]} ${year}`;

    // Clear existing days (keep headers)
    const existingDays = grid.querySelectorAll('.calendar-day');
    existingDays.forEach(day => day.remove());

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day disabled';
        grid.appendChild(emptyDay);
    }

    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = day;
        dayElement.dataset.date = date.toISOString().split('T')[0];

        if (date < today) {
            dayElement.classList.add('disabled');
        } else {
            if (date.toDateString() === today.toDateString()) {
                dayElement.classList.add('today');
            }
            if (bookingState.selectedDate === dayElement.dataset.date) {
                dayElement.classList.add('selected');
            }
            dayElement.addEventListener('click', () => selectDate(dayElement.dataset.date));
        }

        grid.appendChild(dayElement);
    }
}

// Select date
function selectDate(date) {
    bookingState.selectedDate = date;

    // Update UI
    document.querySelectorAll('.calendar-day').forEach(day => {
        day.classList.remove('selected');
    });
    document.querySelector(`.calendar-day[data-date="${date}"]`).classList.add('selected');

    document.getElementById('customer-number').classList.remove('inactive');
    updateSummary();

    // Fetch available time slots
    if (bookingState.selectedStaff) {
        fetchAvailableSlots();
    }
}

// Fetch available time slots
async function fetchAvailableSlots() {
    const slotsGrid = document.getElementById('time-slots-grid');
    slotsGrid.innerHTML = '<div class="loading">Loading available times...</div>';

    try {
        // Generate sample time slots (in production, fetch from API)
        const slots = generateTimeSlots();
        bookingState.availableTimeSlots = slots;
        renderTimeSlots(slots);
    } catch (error) {
        console.error('Error fetching time slots:', error);
        slotsGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <div>Failed to load time slots</div>
            </div>`;
    }
}

// Generate time slots (mock data)
function generateTimeSlots() {
    const slots = [];
    const startHour = 9;
    const endHour = 18;

    for (let hour = startHour; hour < endHour; hour++) {
        for (let min of [0, 30]) {
            const time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
            slots.push({ time, available: Math.random() > 0.3 });
        }
    }

    return slots;
}

// Render time slots
function renderTimeSlots(slots) {
    const grid = document.getElementById('time-slots-grid');
    grid.innerHTML = '';

    slots.forEach(slot => {
        const slotElement = document.createElement('div');
        slotElement.className = `time-slot ${!slot.available ? 'disabled' : ''} ${bookingState.selectedTime === slot.time ? 'selected' : ''}`;
        slotElement.textContent = formatTime12h(slot.time);

        if (slot.available) {
            slotElement.addEventListener('click', () => selectTime(slot.time));
        }

        grid.appendChild(slotElement);
    });
}

// Select time
function selectTime(time) {
    bookingState.selectedTime = time;

    // Update UI
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.classList.remove('selected');
    });
    event.target.classList.add('selected');

    updateSummary();
}

// Format time to 12h format
function formatTime12h(time24) {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
}

// Update summary
function updateSummary() {
    // Services
    const servicesContainer = document.getElementById('summary-services');
    if (bookingState.services.length > 0) {
        servicesContainer.innerHTML = bookingState.services.map(service => `
            <div class="summary-item">
                <div>
                    <div class="summary-item-name">${service.name}</div>
                    <div class="summary-item-details">${service.duration} min</div>
                </div>
                <div class="summary-item-price">€${service.price}</div>
            </div>
        `).join('');
    } else {
        servicesContainer.innerHTML = '<div class="summary-placeholder">No services selected</div>';
    }

    // Staff
    const staffContainer = document.getElementById('summary-staff');
    if (bookingState.selectedStaff) {
        staffContainer.textContent = bookingState.selectedStaff.name;
    } else {
        staffContainer.innerHTML = '<div class="summary-placeholder">Not selected</div>';
    }

    // Date & Time
    const datetimeContainer = document.getElementById('summary-datetime');
    if (bookingState.selectedDate && bookingState.selectedTime) {
        const date = new Date(bookingState.selectedDate);
        const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        datetimeContainer.innerHTML = `
            <div>${dateStr}</div>
            <div class="summary-item-details">${formatTime12h(bookingState.selectedTime)}</div>
        `;
    } else if (bookingState.selectedDate) {
        const date = new Date(bookingState.selectedDate);
        const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        datetimeContainer.innerHTML = `
            <div>${dateStr}</div>
            <div class="summary-item-details">No time selected</div>
        `;
    } else {
        datetimeContainer.innerHTML = '<div class="summary-placeholder">Not selected</div>';
    }

    // Total
    const total = bookingState.services.reduce((sum, service) => sum + parseFloat(service.price), 0);
    document.getElementById('summary-total').textContent = `€${total.toFixed(2)}`;

    // Enable/disable book button
    const bookButton = document.getElementById('book-button');
    const canBook = bookingState.services.length > 0 &&
                   bookingState.selectedStaff &&
                   bookingState.selectedDate &&
                   bookingState.selectedTime;
    bookButton.disabled = !canBook;
}

// Setup event listeners
function setupEventListeners() {
    // Service tabs
    document.querySelectorAll('.service-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.service-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            renderServices(this.dataset.category);
        });
    });

    // Calendar navigation
    document.getElementById('prev-month').addEventListener('click', () => {
        bookingState.currentMonth.setMonth(bookingState.currentMonth.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('next-month').addEventListener('click', () => {
        bookingState.currentMonth.setMonth(bookingState.currentMonth.getMonth() + 1);
        renderCalendar();
    });

    // Book button
    document.getElementById('book-button').addEventListener('click', submitBooking);
}

// Submit booking
async function submitBooking() {
    const firstName = document.getElementById('first-name').value;
    const lastName = document.getElementById('last-name').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const notes = document.getElementById('notes').value;

    if (!firstName || !lastName || !email || !phone) {
        alert('Please fill in all required fields');
        return;
    }

    const bookingData = {
        company_id: bookingState.companyId,
        services: Array.from(bookingState.selectedServices),
        professional_id: bookingState.selectedStaff.id,
        date: bookingState.selectedDate,
        time: bookingState.selectedTime,
        customer: {
            first_name: firstName,
            last_name: lastName,
            email: email,
            phone: phone,
            notes: notes
        }
    };

    console.log('Booking data:', bookingData);

    // In production, send to API
    alert('Booking submitted successfully! (Demo mode)');

    // Redirect to confirmation page
    // window.location.href = `/customers/booking/${bookingState.companyId}/confirmation`;
}
