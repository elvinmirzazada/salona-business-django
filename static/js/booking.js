// ========================================
// Utility Functions - Toast Notifications & Loading
// ========================================

// Toast Notification System
function showToast(message, type = 'info', duration = 5000) {
    const container = document.getElementById('toast-container');

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    const titles = {
        success: 'Success',
        error: 'Error',
        warning: 'Warning',
        info: 'Info'
    };

    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || icons.info}</div>
        <div class="toast-content">
            <div class="toast-title">${titles[type] || titles.info}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;

    container.appendChild(toast);

    // Auto remove after duration
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 300);
    }, duration);

    return toast;
}

// Loading Overlay
function showLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.remove('hidden');
    }
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

// Initialize - hide loading after page load
window.addEventListener('load', () => {
    setTimeout(hideLoading, 500);
});

// Add staggered animations to elements
function addAnimationClasses() {
    // Animate service cards when they load
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.style.animation = `fadeInUp 0.5s ease-out forwards`;
                }, index * 50);
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe cards
    setTimeout(() => {
        document.querySelectorAll('.service-card, .staff-card').forEach(card => {
            card.style.opacity = '0';
            observer.observe(card);
        });
    }, 100);
}

// ========================================
// Multi-Step Booking Initialization
// ========================================

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    showLoading();
    initializeBooking();
    setupStepNavigation();
    setupSummaryToggle();
    addAnimationClasses();
});

async function initializeBooking() {
    await fetchServices();
    renderCalendar();
    setupEventListeners();
    setupServiceSearch(); // Setup search functionality
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
            setupStaffSearch(); // Setup staff search functionality
        }
        if (stepNumber === 3) {
            // Ensure we have monthly availability data
            if (bookingState.selectedStaff) {
                fetchMonthlyAvailability();
            }
            // If a date is already selected, render its time slots
            if (bookingState.selectedDate) {
                renderTimeSlotsForDate(bookingState.selectedDate);
            }
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
    const termsAgreed = document.getElementById('terms-agreement')?.checked || false;

    const canBook = bookingState.services.length > 0 &&
                   bookingState.selectedStaff &&
                   bookingState.selectedDate &&
                   bookingState.selectedTime &&
                   firstName && lastName && email && phone && termsAgreed;

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
        const apiUrl = window.API_BASE_URL;
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
                        card.dataset.category = cat.name; // Add category name for search

                        // Build image HTML if image_url exists
                        const imageHTML = service.image_url
                            ? `<div class="service-image">
                                <img src="${service.image_url}" alt="${service.name}" onerror="this.parentElement.style.display='none'">
                               </div>`
                            : '';

                        // Build description HTML if additional_info exists
                        const descriptionHTML = service.additional_info && service.additional_info.trim()
                            ? `<div class="service-description">${service.additional_info}</div>`
                            : '';

                        card.innerHTML = `
                            ${imageHTML}
                            <div class="service-card-header">
                                <div class="service-name">${service.name}</div>
                                <div class="service-checkbox"></div>
                            </div>
                            ${descriptionHTML}
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
// Service Search Functionality
// ========================================

function setupServiceSearch() {
    const searchInput = document.getElementById('service-search');
    const clearBtn = document.getElementById('search-clear');
    const resultsCount = document.getElementById('search-results-count');
    const resultsText = document.getElementById('search-results-text');

    if (!searchInput) return;

    // Real-time search as user types
    searchInput.addEventListener('input', function() {
        const query = this.value.trim().toLowerCase();

        // Show/hide clear button
        clearBtn.style.display = query ? 'flex' : 'none';

        // Filter services
        filterServices(query);

        // Update results count
        const visibleCards = document.querySelectorAll('.service-card:not([style*="display: none"])');
        if (query) {
            resultsCount.style.display = 'block';
            resultsText.textContent = `${visibleCards.length} service${visibleCards.length !== 1 ? 's' : ''} found`;
        } else {
            resultsCount.style.display = 'none';
        }
    });

    // Clear button functionality
    clearBtn.addEventListener('click', function() {
        searchInput.value = '';
        searchInput.focus();
        clearBtn.style.display = 'none';
        resultsCount.style.display = 'none';
        filterServices('');
    });

    // Clear search when changing category tabs
    document.querySelector('.service-tabs')?.addEventListener('click', function(e) {
        if (e.target.classList.contains('service-tab')) {
            searchInput.value = '';
            clearBtn.style.display = 'none';
            resultsCount.style.display = 'none';
        }
    });
}

function filterServices(query) {
    const serviceCards = document.querySelectorAll('.service-card');

    serviceCards.forEach(card => {
        if (!query) {
            // Show all services if no query
            card.style.display = '';
            return;
        }

        // Get service data from card
        const serviceName = card.querySelector('.service-name')?.textContent.toLowerCase() || '';
        const serviceDescription = card.querySelector('.service-description')?.textContent.toLowerCase() || '';
        const categoryName = card.dataset.category?.toLowerCase() || '';

        // Check if query matches name, description, or category
        const matches = serviceName.includes(query) ||
                       serviceDescription.includes(query) ||
                       categoryName.includes(query);

        // Show/hide card with animation
        if (matches) {
            card.style.display = '';
            card.style.animation = 'fadeInUp 0.3s ease-out';
        } else {
            card.style.display = 'none';
        }
    });

    // Show empty state if no results
    const visibleCards = document.querySelectorAll('.service-card:not([style*="display: none"])');
    const grid = document.getElementById('services-grid');

    if (visibleCards.length === 0 && query) {
        const existingEmpty = grid.querySelector('.search-empty-state');
        if (!existingEmpty) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state search-empty-state';
            emptyState.innerHTML = `
                <div class="empty-state-icon">🔍</div>
                <div>No services found for "${query}"</div>
                <div style="font-size: 14px; color: #6B7280; margin-top: 8px;">Try a different search term</div>
            `;
            grid.appendChild(emptyState);
        }
    } else {
        // Remove empty state if it exists
        const existingEmpty = grid.querySelector('.search-empty-state');
        if (existingEmpty) {
            existingEmpty.remove();
        }
    }
}

// ========================================
// Staff Search Functionality
// ========================================

function setupStaffSearch() {
    const searchInput = document.getElementById('staff-search');
    const clearBtn = document.getElementById('staff-search-clear');
    const resultsCount = document.getElementById('staff-search-results-count');
    const resultsText = document.getElementById('staff-search-results-text');

    if (!searchInput) return;

    // Real-time search as user types
    searchInput.addEventListener('input', function() {
        const query = this.value.trim().toLowerCase();

        // Show/hide clear button
        clearBtn.style.display = query ? 'flex' : 'none';

        // Filter staff
        filterStaff(query);

        // Update results count
        const visibleCards = document.querySelectorAll('.staff-card:not([style*="display: none"])');
        if (query) {
            resultsCount.style.display = 'block';
            resultsText.textContent = `${visibleCards.length} professional${visibleCards.length !== 1 ? 's' : ''} found`;
        } else {
            resultsCount.style.display = 'none';
        }
    });

    // Clear button functionality
    clearBtn.addEventListener('click', function() {
        searchInput.value = '';
        searchInput.focus();
        clearBtn.style.display = 'none';
        resultsCount.style.display = 'none';
        filterStaff('');
    });
}

function filterStaff(query) {
    const staffCards = document.querySelectorAll('.staff-card');

    staffCards.forEach(card => {
        if (!query) {
            // Show all staff if no query
            card.style.display = '';
            return;
        }

        // Get staff data from card
        const staffName = card.querySelector('.staff-name')?.textContent.toLowerCase() || '';
        const staffRole = card.querySelector('.staff-role')?.textContent.toLowerCase() || '';
        const staffLanguages = card.querySelector('.staff-languages')?.textContent.toLowerCase() || '';

        // Check if query matches name, role, or languages
        const matches = staffName.includes(query) ||
                       staffRole.includes(query) ||
                       staffLanguages.includes(query);

        // Show/hide card with animation
        if (matches) {
            card.style.display = '';
            card.style.animation = 'fadeInUp 0.3s ease-out';
        } else {
            card.style.display = 'none';
        }
    });

    // Show empty state if no results
    const visibleCards = document.querySelectorAll('.staff-card:not([style*="display: none"])');
    const grid = document.getElementById('staff-grid');

    if (visibleCards.length === 0 && query) {
        const existingEmpty = grid.querySelector('.search-empty-state');
        if (!existingEmpty) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state search-empty-state';
            emptyState.innerHTML = `
                <div class="empty-state-icon">🔍</div>
                <div>No professionals found for "${query}"</div>
                <div style="font-size: 14px; color: #6B7280; margin-top: 8px;">Try a different search term</div>
            `;
            grid.appendChild(emptyState);
        }
    } else {
        // Remove empty state if it exists
        const existingEmpty = grid.querySelector('.search-empty-state');
        if (existingEmpty) {
            existingEmpty.remove();
        }
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
                if (bookingState.selectedServices.has(service.id) && service.service_staff) {
                    service.service_staff.forEach(staff => {
                        if (!staffMap.has(staff.user_id)) {
                            staffMap.set(staff.user_id, staff.user);
                        }
                    });
                }
            });
        }
    });

    if (staffMap.size === 0) {
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
    }
    // Add unique staff members from selected services
    staffMap.forEach(staff => {
        const fullName = `${staff.first_name || ''} ${staff.last_name || ''}`.trim();
        const initials = (staff.first_name?.[0] || '') + (staff.last_name?.[0] || '');
        const position = staff.position || 'Specialist';
        const languages = staff.languages || '';

        // Build staff avatar - use profile photo if available, otherwise show initials
        let avatarHTML;
        if (staff.profile_photo_url) {
            avatarHTML = `<div class="staff-avatar"><img src="${staff.profile_photo_url}" alt="${fullName}" class="staff-avatar-img" /></div>`;
        } else {
            avatarHTML = `<div class="staff-avatar">${initials || '👤'}</div>`;
        }

        // Build staff info HTML with position and languages
        let staffInfoHTML = `
            ${avatarHTML}
            <div class="staff-name">${fullName || 'Professional'}</div>
            <div class="staff-role">${position}</div>
        `;

        // Add languages if available
        if (languages) {
            const languageList = languages.split(',').map(lang => lang.trim()).slice(0, 3); // Show max 3 languages
            const languageBadges = languageList.map(lang => `<span class="language-badge">${lang}</span>`).join('');
            staffInfoHTML += `<div class="staff-languages">${languageBadges}</div>`;
        }

        const card = document.createElement('div');
        card.className = 'staff-card';
        card.dataset.id = staff.id;
        card.innerHTML = staffInfoHTML;
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
        // Format date manually to avoid timezone issues
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        dayElement.dataset.date = dateString;

        // Check if day is in the past
        if (date < today) {
            dayElement.classList.add('disabled');
        } else {
            if (date.toDateString() === today.toDateString()) {
                dayElement.classList.add('today');
            }

            // Check if this day has available time slots
            const hasAvailability = checkDayHasAvailability(dateString);
            if (!hasAvailability) {
                dayElement.classList.add('disabled');
            } else {
                // Only add click listener if day has availability
                if (bookingState.selectedDate === dateString) {
                    dayElement.classList.add('selected');
                }
                dayElement.addEventListener('click', () => selectDate(dateString));
            }
        }

        grid.appendChild(dayElement);
    }
}

// Check if a specific day has available time slots
function checkDayHasAvailability(dateString) {
    if (!bookingState.monthlyAvailability || !bookingState.monthlyAvailability[dateString]) {
        return false;
    }

    const daySlots = bookingState.monthlyAvailability[dateString];
    return daySlots && daySlots.length > 0;
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

    // Render time slots from cached monthly availability
    renderTimeSlotsForDate(date);
}

// ========================================
// Time Slot Selection
// ========================================

// Fetch monthly availability data
async function fetchMonthlyAvailability() {
    // Show loading state on calendar
    showCalendarLoading();

    try {
        const apiUrl = window.API_BASE_URL;
        const staffId = bookingState.selectedStaff.id;

        // Get the first day of the current month
        const year = bookingState.currentMonth.getFullYear();
        const month = bookingState.currentMonth.getMonth();
        const dateFrom = `${year}-${String(month + 1).padStart(2, '0')}-01`;

        let url, response, data;

        // Call different endpoint based on staff selection
        if (staffId === 'any') {
            // Call company-level availabilities endpoint for "any" staff
            url = `${apiUrl}/api/v1/companies/${bookingState.companyId}/availabilities?date_from=${dateFrom}&availability_type=monthly`;
        } else {
            // Call user-specific availability endpoint
            url = `${apiUrl}/api/v1/companies/${bookingState.companyId}/users/${staffId}/availability?date_from=${dateFrom}&availability_type=monthly`;
        }

        console.log('Fetching monthly availability from:', url);
        response = await fetch(url);
        data = await response.json();
        console.log('Monthly availability response:', data);

        if (data.success && data.data) {
            // Process the monthly data and store in bookingState
            processMonthlyAvailability(data.data, staffId);

            // Re-render the calendar with availability information
            renderCalendar();

            // If a date is already selected, render its time slots
            if (bookingState.selectedDate) {
                renderTimeSlotsForDate(bookingState.selectedDate);
            }
        } else {
            console.error('Invalid response format:', data);
            bookingState.monthlyAvailability = {};
            renderCalendar();
        }
    } catch (error) {
        console.error('Error fetching monthly availability:', error);
        bookingState.monthlyAvailability = {};
        renderCalendar();
        showToast('Failed to load availability data', 'error');
    } finally {
        // Hide loading state
        hideCalendarLoading();
    }
}

// Show loading state on calendar
function showCalendarLoading() {
    const calendarGrid = document.getElementById('calendar-grid');
    if (calendarGrid) {
        calendarGrid.classList.add('calendar-loading');
    }
}

// Hide loading state on calendar
function hideCalendarLoading() {
    const calendarGrid = document.getElementById('calendar-grid');
    if (calendarGrid) {
        calendarGrid.classList.remove('calendar-loading');
    }
}

// Process monthly availability data
function processMonthlyAvailability(data, staffId) {
    const availability = {};

    if (staffId === 'any') {
        // For "any" staff, data is an array of user availabilities
        console.log('Processing array of availabilities for "any" staff');

        if (Array.isArray(data) && data.length > 0) {
            // Merge all time slots from all available staff by date
            data.forEach(userAvailability => {
                if (userAvailability.monthly && userAvailability.monthly.weekly_slots) {
                    // Process the new nested structure: weekly_slots -> daily_slots
                    userAvailability.monthly.weekly_slots.forEach(week => {
                        if (week.daily_slots && Array.isArray(week.daily_slots)) {
                            week.daily_slots.forEach(daySlot => {
                                if (daySlot.date && daySlot.time_slots && daySlot.time_slots.length > 0) {
                                    if (!availability[daySlot.date]) {
                                        availability[daySlot.date] = [];
                                    }
                                    availability[daySlot.date].push(...daySlot.time_slots);
                                }
                            });
                        }
                    });
                }
            });

            // Remove duplicate time slots for each date
            Object.keys(availability).forEach(date => {
                const uniqueSlots = Array.from(new Set(availability[date].map(slot =>
                    `${slot.start_time}-${slot.end_time}-${slot.is_available}`
                ))).map(str => {
                    const [start_time, end_time, is_available] = str.split('-');
                    return { start_time, end_time, is_available: is_available === 'true' };
                });
                availability[date] = uniqueSlots;
            });

            console.log('Merged availability by date:', availability);
        }
    } else {
        // For specific staff, data is a single object with monthly property
        console.log('Processing single staff availability');

        if (data.monthly && data.monthly.weekly_slots) {
            // Process the new nested structure: weekly_slots -> daily_slots
            data.monthly.weekly_slots.forEach(week => {
                if (week.daily_slots && Array.isArray(week.daily_slots)) {
                    week.daily_slots.forEach(daySlot => {
                        if (daySlot.date && daySlot.time_slots && daySlot.time_slots.length > 0) {
                            availability[daySlot.date] = daySlot.time_slots;
                        }
                    });
                }
            });
        }
    }

    bookingState.monthlyAvailability = availability;
    console.log('Processed monthly availability:', bookingState.monthlyAvailability);
}

// Render time slots for a specific date from cached data
function renderTimeSlotsForDate(date) {
    const slotsGrid = document.getElementById('time-slots-grid');

    if (!bookingState.monthlyAvailability || !bookingState.monthlyAvailability[date]) {
        slotsGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📅</div>
                <div>No times available for this date</div>
                <div style="font-size: 14px; color: #6B7280; margin-top: 8px;">Please select a different date</div>
            </div>`;
        return;
    }

    const timeRanges = bookingState.monthlyAvailability[date];

    if (!timeRanges || timeRanges.length === 0) {
        slotsGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📅</div>
                <div>No times available for this date</div>
                <div style="font-size: 14px; color: #6B7280; margin-top: 8px;">Please select a different date</div>
            </div>`;
        return;
    }

    // Convert time ranges to 30-minute slots
    const slots = convertTimeRangesToSlots(timeRanges);
    console.log('Converted slots for', date, ':', slots);
    bookingState.availableTimeSlots = slots;

    if (slots.length === 0) {
        slotsGrid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📅</div>
                <div>No times available for this date</div>
                <div style="font-size: 14px; color: #6B7280; margin-top: 8px;">Please select a different date</div>
            </div>`;
    } else {
        renderTimeSlots(slots);
    }
}

// Legacy function - kept for compatibility but now uses monthly data
async function fetchAvailableSlots() {
    // This function is now replaced by fetchMonthlyAvailability
    // Keeping it for any legacy calls
    if (bookingState.selectedDate) {
        renderTimeSlotsForDate(bookingState.selectedDate);
    }
}

// Convert API time ranges into 30-minute slots
function convertTimeRangesToSlots(timeRanges) {
    const slots = [];

    timeRanges.forEach(range => {
        if (!range.is_available) return;

        const [startHour, startMin] = range.start_time.split(':').map(Number);
        const [endHour, endMin] = range.end_time.split(':').map(Number);

        // Convert to minutes for easier calculation
        let currentMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;

        // Generate 30-minute slots
        while (currentMinutes < endMinutes) {
            const hour = Math.floor(currentMinutes / 60);
            const min = currentMinutes % 60;
            const time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;

            slots.push({ time, available: true });
            currentMinutes += 30; // 30-minute intervals
        }
    });

    return slots;
}

// Render time slots
function renderTimeSlots(slots) {
    const grid = document.getElementById('time-slots-grid');
    grid.innerHTML = '';

    // Check if slots array is empty
    if (!slots || slots.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📅</div>
                <div>No times available for this date</div>
                <div style="font-size: 14px; color: #6B7280; margin-top: 8px;">Please select a different date</div>
            </div>`;
        return;
    }

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
        // Parse date correctly to avoid timezone issues
        const [year, month, day] = bookingState.selectedDate.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        datetimeContainer.innerHTML = `
            <div>${dateStr}</div>
            <div class="summary-item-details">${formatTime12h(bookingState.selectedTime)}</div>
        `;
    } else if (bookingState.selectedDate) {
        // Parse date correctly to avoid timezone issues
        const [year, month, day] = bookingState.selectedDate.split('-').map(Number);
        const date = new Date(year, month - 1, day);
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

    // Update summary title data attribute for collapsed view on mobile
    const summaryTitle = document.querySelector('.summary-title');
    if (summaryTitle) {
        summaryTitle.setAttribute('data-total', `€${total.toFixed(2)}`);
    }
}

// ========================================
// Event Listeners
// ========================================

function setupEventListeners() {
    // Calendar navigation
    document.getElementById('prev-month').addEventListener('click', () => {
        bookingState.currentMonth.setMonth(bookingState.currentMonth.getMonth() - 1);

        // Fetch new monthly availability if staff is selected
        if (bookingState.selectedStaff) {
            fetchMonthlyAvailability();
        } else {
            renderCalendar();
        }
    });

    document.getElementById('next-month').addEventListener('click', () => {
        bookingState.currentMonth.setMonth(bookingState.currentMonth.getMonth() + 1);

        // Fetch new monthly availability if staff is selected
        if (bookingState.selectedStaff) {
            fetchMonthlyAvailability();
        } else {
            renderCalendar();
        }
    });

    // Book button
    document.getElementById('book-button').addEventListener('click', submitBooking);

    // Form validation
    const formInputs = document.querySelectorAll('#customer-form .form-input');
    formInputs.forEach(input => {
        input.addEventListener('input', updateBookButton);
    });

    // Terms checkbox validation
    const termsCheckbox = document.getElementById('terms-agreement');
    if (termsCheckbox) {
        termsCheckbox.addEventListener('change', updateBookButton);
    }

    // Terms and Privacy links - using event delegation
    document.addEventListener('click', (e) => {
        if (e.target.id === 'booking-terms-link' || e.target.closest('#booking-terms-link')) {
            e.preventDefault();
            e.stopPropagation();
            window.open('/customers/accept/booking-terms/', '_blank');
        } else if (e.target.id === 'booking-privacy-link' || e.target.closest('#booking-privacy-link')) {
            e.preventDefault();
            e.stopPropagation();
            window.open('/customers/accept/booking-privacy/', '_blank');
        }
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

    // Combine date and time into ISO datetime format
    const startDateTime = new Date(`${bookingState.selectedDate}T${bookingState.selectedTime}:00`);
    const startTimeISO = startDateTime.toISOString();

    // Format services array with required structure
    const servicesArray = bookingState.services.map(service => ({
        category_service_id: service.id,
        user_id: bookingState.selectedStaff.id === 'any' ? null : bookingState.selectedStaff.id,
        notes: notes || ""
    }));

    const bookingData = {
        company_id: bookingState.companyId,
        start_time: startTimeISO,
        services: servicesArray,
        notes: notes || "",
        customer_info: {
            id: null, // Set to null for new customers, or use existing customer ID if available
            first_name: firstName,
            last_name: lastName,
            email: email,
            phone: phone
        }
    };

    console.log('Booking data to be sent:', bookingData);

    // Show loading state
    const bookButton = document.getElementById('book-button');
    const originalText = bookButton.innerHTML;
    bookButton.innerHTML = '<span>Processing...</span>';
    bookButton.disabled = true;

    try {
        const apiUrl = window.API_BASE_URL;
        const response = await fetch(`${apiUrl}/api/v1/bookings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bookingData)
        });

        const result = await response.json();
        console.log('Booking response:', result);

        if (response.ok && result.success && result.data) {
            // Successful booking - redirect to confirmation page with booking ID
            // The confirmation page will fetch the booking data from the API
            window.location.href = `/book/${bookingState.companySlug}/confirmation?booking_id=${result.data.id}`;
        } else {
            // Handle API error
            throw new Error(result.message || 'Failed to create booking');
        }
    } catch (error) {
        console.error('Booking error:', error);
        showToast(error.message || 'Something went wrong. Please try again.', 'error');
        bookButton.innerHTML = originalText;
        bookButton.disabled = false;
    }
}
