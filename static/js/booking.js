// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeBooking();
    setupStepNavigation();
    setupSummaryToggle();
});

async function initializeBooking() {
    await fetchServices();
    renderCalendar();
    setupEventListeners();
}

// ========================================
// Multi-Step Navigation
// ========================================

function setupStepNavigation() {
    // Next buttons
    document.getElementById('next-step-1').addEventListener('click', () => goToStep(2));
    document.getElementById('next-step-2').addEventListener('click', () => goToStep(3));
    document.getElementById('next-step-3').addEventListener('click', () => goToStep(4));

    // Previous buttons
    document.getElementById('prev-step-2').addEventListener('click', () => goToStep(1));
    document.getElementById('prev-step-3').addEventListener('click', () => goToStep(2));
    document.getElementById('prev-step-4').addEventListener('click', () => goToStep(3));

    // Progress step navigation (click on progress circles)
    document.querySelectorAll('.progress-step').forEach(step => {
        step.addEventListener('click', function() {
            const targetStep = parseInt(this.dataset.step);
            if (canNavigateToStep(targetStep)) {
                goToStep(targetStep);
            }
        });
    });
}

function canNavigateToStep(step) {
    // Can always go back to previous steps
    if (step <= bookingState.currentStep) return true;

    // Check requirements for forward navigation
    if (step === 2) return bookingState.selectedServices.size > 0;
    if (step === 3) return bookingState.selectedStaff !== null;
    if (step === 4) return bookingState.selectedDate && bookingState.selectedTime;

    return false;
}

function goToStep(stepNumber) {
    const currentStepEl = document.getElementById(`step-${bookingState.currentStep}`);
    const nextStepEl = document.getElementById(`step-${stepNumber}`);

    if (!nextStepEl) return;

    // Add sliding out animation
    currentStepEl.classList.add('sliding-out');

    setTimeout(() => {
        // Hide current step
        currentStepEl.classList.remove('active', 'sliding-out');

        // Show next step
        nextStepEl.classList.add('active');

        // Update state
        bookingState.currentStep = stepNumber;

        // Update progress indicator
        updateProgressIndicator();

        // Scroll to top smoothly
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Load data for the step if needed
        if (stepNumber === 2) {
            renderStaff();
        }
        if (stepNumber === 3 && bookingState.selectedDate) {
            fetchAvailableSlots();
        }
    }, 300);
}

function updateProgressIndicator() {
    const steps = document.querySelectorAll('.progress-step');
    const progressFill = document.getElementById('progress-line-fill');

    steps.forEach((step, index) => {
        const stepNum = index + 1;

        if (stepNum < bookingState.currentStep) {
            step.classList.add('completed');
            step.classList.remove('active');
        } else if (stepNum === bookingState.currentStep) {
            step.classList.add('active');
            step.classList.remove('completed');
        } else {
            step.classList.remove('active', 'completed');
        }
    });

    // Update progress line fill
    const progress = ((bookingState.currentStep - 1) / 3) * 100;
    progressFill.style.width = `${progress}%`;
}

function updateStepButtons() {
    // Step 1: Enable next if services selected
    const nextBtn1 = document.getElementById('next-step-1');
    if (nextBtn1) {
        nextBtn1.disabled = bookingState.selectedServices.size === 0;
    }

    // Step 2: Enable next if staff selected
    const nextBtn2 = document.getElementById('next-step-2');
    if (nextBtn2) {
        nextBtn2.disabled = !bookingState.selectedStaff;
    }

    // Step 3: Enable next if date and time selected
    const nextBtn3 = document.getElementById('next-step-3');
    if (nextBtn3) {
        nextBtn3.disabled = !bookingState.selectedDate || !bookingState.selectedTime;
    }

    // Step 4: Enable book button if form is valid
    updateBookButton();
}

function updateBookButton() {
    const bookButton = document.getElementById('book-button');
    if (!bookButton) return;

    const firstName = document.getElementById('first-name')?.value.trim() || '';
    const lastName = document.getElementById('last-name')?.value.trim() || '';
    const email = document.getElementById('email')?.value.trim() || '';
    const phone = document.getElementById('phone')?.value.trim() || '';

    const canBook = bookingState.services.length > 0 &&
                   bookingState.selectedStaff &&
                   bookingState.selectedDate &&
                   bookingState.selectedTime &&
                   firstName && lastName && email && phone;

    bookButton.disabled = !canBook;
}

// ========================================
// Summary Toggle (Mobile)
// ========================================

function setupSummaryToggle() {
    const summary = document.getElementById('booking-summary');
    const toggle = document.getElementById('summary-toggle');

    if (toggle) {
        toggle.addEventListener('click', () => {
            summary.classList.toggle('expanded');
        });
    }
}

// ========================================
// Service Selection
// ========================================

// Fetch services from API
async function fetchServices() {
    try {
        const apiUrl = window.EXTERNAL_API_URL || 'http://localhost:8000';
        const response = await fetch(`${apiUrl}/api/v1/services/companies/${bookingState.companyId}/services`);
        const data = await response.json();

        if (data.success && data.data) {
            bookingState.allServices = data.data;
            renderCategories();
            renderServices('all');
        }
    } catch (error) {
        console.error('Error fetching services:', error);
        document.getElementById('services-grid').innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <div>Failed to load services</div>
            </div>`;
        document.querySelector('.service-tabs').innerHTML = `
            <div class="empty-state">Failed to load categories</div>`;
    }
}

// Render categories dynamically
function renderCategories() {
    const tabsContainer = document.querySelector('.service-tabs');
    tabsContainer.innerHTML = '';

    // Add "All Services" tab
    const allTab = document.createElement('button');
    allTab.className = 'service-tab active';
    allTab.dataset.category = 'all';
    allTab.textContent = 'All Services';
    tabsContainer.appendChild(allTab);

    // Add category tabs from API data
    bookingState.allServices.forEach(category => {
        if (category.services && category.services.length > 0) {
            const tab = document.createElement('button');
            tab.className = 'service-tab';
            tab.dataset.category = category.id;
            tab.dataset.categoryName = category.name;
            tab.textContent = category.name;
            tabsContainer.appendChild(tab);
        }
    });

    // Setup click handlers for tabs
    tabsContainer.querySelectorAll('.service-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            tabsContainer.querySelectorAll('.service-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            renderServices(this.dataset.category);
        });
    });
}

// Render services
function renderServices(category) {
    const grid = document.getElementById('services-grid');
    grid.innerHTML = '';

    let hasServices = false;

    bookingState.allServices.forEach(cat => {
        if (cat.services && cat.services.length > 0) {
            // Filter by category: show all or match the selected category
            const shouldShowCategory = category === 'all' || cat.id === category;

            if (shouldShowCategory) {
                cat.services.forEach(service => {
                    if (service.status === 'active') {
                        hasServices = true;
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
                });
            }
        }
    });

    // Show empty state if no services found
    if (!hasServices) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <div>No services available in this category</div>
            </div>`;
    }
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

    // Debug logging
    console.log('Service toggled:', {
        id,
        name,
        totalSelected: bookingState.selectedServices.size
    });

    // Update selection count
    updateServiceSelectionCount();
    updateSummary();
    updateStepButtons();

    // Debug: Check button state
    const nextBtn = document.getElementById('next-step-1');
    console.log('Next button state:', {
        exists: !!nextBtn,
        disabled: nextBtn?.disabled,
        selectedCount: bookingState.selectedServices.size
    });
}

function updateServiceSelectionCount() {
    const count = bookingState.selectedServices.size;
    const countEl = document.getElementById('services-selection-count');
    const badgeEl = document.getElementById('services-count');
    const textEl = document.getElementById('services-count-text');

    if (count > 0) {
        countEl.style.display = 'inline-flex';
        badgeEl.textContent = count;
        textEl.textContent = count === 1 ? 'service selected' : 'services selected';
    } else {
        countEl.style.display = 'none';
    }
}

// ========================================
// Staff Selection
// ========================================

// Render staff based on selected services
function renderStaff() {
    const grid = document.getElementById('staff-grid');
    grid.innerHTML = '';

    // Collect unique staff from selected services
    const staffMap = new Map();

    bookingState.allServices.forEach(category => {
        if (category.services) {
            category.services.forEach(service => {
                // Only consider staff from selected services
                if (bookingState.selectedServices.has(service.id) && service.assigned_staff) {
                    service.assigned_staff.forEach(staff => {
                        if (!staffMap.has(staff.id)) {
                            staffMap.set(staff.id, staff);
                        }
                    });
                }
            });
        }
    });

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

    // Add unique staff members from selected services
    staffMap.forEach(staff => {
        const fullName = `${staff.first_name || ''} ${staff.last_name || ''}`.trim();
        const initials = (staff.first_name?.[0] || '') + (staff.last_name?.[0] || '');

        const card = document.createElement('div');
        card.className = 'staff-card';
        card.dataset.id = staff.id;
        card.innerHTML = `
            <div class="staff-avatar">${initials || '👤'}</div>
            <div class="staff-name">${fullName || 'Professional'}</div>
            <div class="staff-role">Specialist</div>
        `;
        card.addEventListener('click', () => selectStaff(staff.id, fullName));
        grid.appendChild(card);
    });

    // Show message if no staff available
    if (staffMap.size === 0) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'empty-state';
        messageDiv.innerHTML = `
            <div class="empty-state-icon">ℹ️</div>
            <div>Any available professional can provide the selected services</div>
        `;
        grid.appendChild(messageDiv);
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

    updateSummary();
    updateStepButtons();

    // Fetch available slots if date is selected
    if (bookingState.selectedDate) {
        fetchAvailableSlots();
    }
}

// ========================================
// Calendar & Date Selection
// ========================================

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
    const selectedDay = document.querySelector(`.calendar-day[data-date="${date}"]`);
    if (selectedDay) {
        selectedDay.classList.add('selected');
    }

    updateSummary();
    updateStepButtons();

    // Fetch available time slots
    if (bookingState.selectedStaff) {
        fetchAvailableSlots();
    }
}

// ========================================
// Time Slot Selection
// ========================================

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
    updateStepButtons();
}

// Format time to 12h format
function formatTime12h(time24) {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
}

// ========================================
// Summary Updates
// ========================================

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
}

// ========================================
// Event Listeners
// ========================================

function setupEventListeners() {
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

    // Form validation
    const formInputs = document.querySelectorAll('#customer-form .form-input');
    formInputs.forEach(input => {
        input.addEventListener('input', updateBookButton);
    });
}

// ========================================
// Submit Booking
// ========================================

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

    // Show loading state
    const bookButton = document.getElementById('book-button');
    const originalText = bookButton.innerHTML;
    bookButton.innerHTML = '<span>Processing...</span>';
    bookButton.disabled = true;

    try {
        // In production, send to API
        // const response = await fetch('/api/bookings/create', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(bookingData)
        // });
        // const result = await response.json();

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Redirect to confirmation page
        window.location.href = `/customers/booking/${bookingState.companyId}/confirmation`;
    } catch (error) {
        console.error('Booking error:', error);
        alert('Something went wrong. Please try again.');
        bookButton.innerHTML = originalText;
        bookButton.disabled = false;
    }
}
