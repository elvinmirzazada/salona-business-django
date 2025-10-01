// Dashboard functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check for authentication
    const accessToken = localStorage.getItem('accessToken');

    if (!accessToken) {
        // Redirect to login if not authenticated
        window.location.href = '/users/login/';
        return;
    }

    // Authentication header creator for API requests
    const getAuthHeader = () => {
        return {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        };
    };

    // Fetch current user information
    const fetchCurrentUser = async () => {
        try {
            const response = await fetch('http://127.0.0.1:8000/api/v1/users/me', {
                method: 'GET',
                headers: {
                    ...getAuthHeader(),
                    'Accept': 'application/json'
                },
                mode: 'cors' // Explicitly set CORS mode
                // Remove credentials: 'include' to avoid preflight complexity
            });

            if (!response.ok) {
                if (response.status === 401) {
                    // If unauthorized, redirect to login
                    localStorage.removeItem('accessToken');
                    window.location.href = '/users/login/';
                    return null;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.data; // Return the user data from the response
        } catch (error) {
            console.error('Error fetching user data:', error);
            return null;
        }
    };

    // Update the UI with user information
    const updateUserInfo = (userData) => {
        if (!userData) return;

        // Update the welcome message with user's name
        const userNameElement = document.querySelector('.user-name');
        if (userNameElement) {
            userNameElement.textContent = `Welcome, ${userData.first_name} ${userData.last_name}!`;
        }

        // You can update other UI elements with user data here
    };

    // Load user data when page loads
    (async function loadUserData() {
        const userData = await fetchCurrentUser();
        updateUserInfo(userData);
    })();

    // Logout functionality
    document.getElementById('logout-btn').addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.removeItem('accessToken');
        localStorage.removeItem('tokenType');
        localStorage.removeItem('tokenExpiresIn');
        window.location.href = '/users/login/';
    });

    // Calendar functionality
    let currentDate = new Date();

    // // Set initial date to September 27, 2025 (for demonstration)
    // currentDate = new Date(2025, 8, 27); // Month is 0-indexed in JS

    // Calendar display configuration
    const calendarConfig = {
        startHour: 8,  // 8:00 AM
        endHour: 20,   // 8:00 PM
        intervalMinutes: 15  // 15-minute intervals
    };

    // Calculate start date (3 days before current date)
    const getStartDate = (date) => {
        const startDate = new Date(date);
        startDate.setDate(date.getDate() - 3);
        return startDate;
    };

    // Format date as YYYY-MM-DD
    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Format date for display
    const formatDisplayDate = (date) => {
        const options = { weekday: 'short', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    };

    // Format time for display
    const formatTime = (hours, minutes) => {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    };

    // Update the calendar header to show current week range
    const updateCalendarHeader = (startDate) => {
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);

        const startFormatted = startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
        const endFormatted = endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

        document.getElementById('current-week').textContent = `${startFormatted} - ${endFormatted}`;
    };

    // Render calendar with days and time slots
    const renderCalendar = async (date) => {
        const startDate = getStartDate(date);
        updateCalendarHeader(startDate);

        // Calculate the end date (start date + 6 days = full week)
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);

        const calendarGrid = document.querySelector('.calendar-grid');
        calendarGrid.innerHTML = '';

        // Show loading spinner
        const spinner = document.getElementById('calendar-spinner');
        spinner.style.display = 'flex';

        try {
            // Fetch real booking data from API with date range
            const bookings = await fetchBookings(startDate, endDate);
            const calendarEvents = convertBookingsToEvents(bookings);

            // Create time column first
            const timeColumn = document.createElement('div');
            timeColumn.className = 'time-column';

            // Add header to time column
            const timeHeader = document.createElement('div');
            timeHeader.className = 'day-header';
            timeHeader.innerHTML = '&nbsp;'; // Empty header for time column
            timeColumn.appendChild(timeHeader);

            // Generate time slots (limited to configured hours)
            for (let hour = calendarConfig.startHour; hour <= calendarConfig.endHour; hour++) {
                const timeSlot = document.createElement('div');
                timeSlot.className = 'time-slot';
                timeSlot.textContent = formatTime(hour, 0);
                timeSlot.style.height = 'var(--time-slot-height)';
                timeColumn.appendChild(timeSlot);
            }

            calendarGrid.appendChild(timeColumn);

            // Create day columns
            const today = new Date(date);

            // Generate 7 day columns (3 before today, today, 3 after today)
            for (let i = 0; i < 7; i++) {
                const currentDateInLoop = new Date(startDate);
                currentDateInLoop.setDate(startDate.getDate() + i);

                const isToday = currentDateInLoop.toDateString() === today.toDateString();

                const dayColumn = document.createElement('div');
                dayColumn.className = `day-column ${isToday ? 'today' : ''}`;

                // Create day header
                const dayHeader = document.createElement('div');
                dayHeader.className = 'day-header';
                dayHeader.textContent = formatDisplayDate(currentDateInLoop);
                dayColumn.appendChild(dayHeader);

                // Container for the slots
                const slotsContainer = document.createElement('div');
                slotsContainer.className = 'slots-container';

                // Generate hour slots for the configured range
                for (let hour = calendarConfig.startHour; hour <= calendarConfig.endHour; hour++) {
                    const hourContainer = document.createElement('div');
                    hourContainer.className = 'hour-container';
                    hourContainer.dataset.hour = hour;

                    // Create 4 slots for each hour (15-min intervals)
                    for (let quarter = 0; quarter < 4; quarter++) {
                        const slot = document.createElement('div');
                        slot.className = 'slot';
                        slot.dataset.hour = hour;
                        slot.dataset.minute = quarter * 15;
                        slot.dataset.time = formatTime(hour, quarter * 15);

                        // Add click event to show slot action popup
                        slot.addEventListener('click', function(e) {
                            // Store date information for the clicked slot
                            const slotDate = new Date(currentDateInLoop);
                            slotDate.setHours(hour, quarter * 15, 0, 0);

                            // Show slot action popup
                            showSlotActionPopup(slotDate, e.clientX, e.clientY);
                        });

                        hourContainer.appendChild(slot);
                    }

                    slotsContainer.appendChild(hourContainer);
                }

                dayColumn.appendChild(slotsContainer);

                // Filter events for this day
                const dayEvents = calendarEvents.filter(event => {
                    return event.start.toDateString() === currentDateInLoop.toDateString();
                });

                // Add events to the day column
                dayEvents.forEach(event => {
                    const eventElement = createEventElement(event, currentDateInLoop);
                    if (eventElement) {
                        // Add the event to the slots container instead of the day column
                        slotsContainer.appendChild(eventElement);
                    }
                });

                calendarGrid.appendChild(dayColumn);
            }
        } catch (error) {
            console.error('Error rendering calendar:', error);
            // Display error message to user
            calendarGrid.innerHTML = '<div style="padding: 20px; text-align: center;">Error loading calendar data. Please try again later.</div>';
        } finally {
            // Hide loading spinner regardless of success or failure
            spinner.style.display = 'none';
        }
    };

    // Create event element and position it on the calendar
    const createEventElement = (event, day) => {
        if (event.start.toDateString() !== day.toDateString()) return null;

        const startHour = event.start.getHours();
        const startMinute = event.start.getMinutes();

        // Skip events outside the configured time range
        if (startHour < calendarConfig.startHour || startHour > calendarConfig.endHour) {
            return null;
        }

        const endHour = event.end.getHours();
        const endMinute = event.end.getMinutes();

        // Adjust position calculation based on the configured start hour
        const hourOffset = calendarConfig.startHour;
        const slotHeight = 60 / (60 / calendarConfig.intervalMinutes); // Height per 15min slot

        // Calculate position relative to the start of the displayed calendar (8:00)
        const startPosition = ((startHour - hourOffset) * 60 + startMinute) * (slotHeight / calendarConfig.intervalMinutes);
        let endPosition;

        if (endHour > calendarConfig.endHour) {
            // Cap events that extend beyond the visible range
            endPosition = (calendarConfig.endHour - hourOffset + 1) * 60 * (slotHeight / calendarConfig.intervalMinutes);
        } else {
            endPosition = ((endHour - hourOffset) * 60 + endMinute) * (slotHeight / calendarConfig.intervalMinutes);
        }

        const height = endPosition - startPosition;

        const eventElement = document.createElement('div');
        eventElement.className = `event ${event.color || ''}`;
        eventElement.style.top = `${startPosition}px`;
        eventElement.style.height = `${height}px`;
        // Position events relative to the slots container, not the day column
        eventElement.style.position = 'absolute';
        eventElement.style.left = '0';
        eventElement.style.right = '0';
        // Make event clickable
        eventElement.style.cursor = 'pointer';

        // Format the event content
        const eventTime = `${formatTime(startHour, startMinute)} - ${formatTime(Math.min(endHour, calendarConfig.endHour), endHour > calendarConfig.endHour ? 0 : endMinute)}`;

        const eventTitle = document.createElement('div');
        eventTitle.className = 'event-title';
        eventTitle.textContent = event.title;

        const eventTimeElement = document.createElement('div');
        eventTimeElement.className = 'event-time';
        eventTimeElement.textContent = eventTime;

        eventElement.appendChild(eventTitle);
        eventElement.appendChild(eventTimeElement);

        if (event.description) {
            const descriptions = event.description.split('\n');
            descriptions.forEach(desc => {
                if (desc.trim()) {
                    const descElement = document.createElement('div');
                    descElement.className = 'event-description';
                    descElement.textContent = desc;
                    eventElement.appendChild(descElement);
                }
            });
        }

        // Add click event to show the popup
        eventElement.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent click from reaching elements underneath
            showEventPopup(event, e.clientX, e.clientY);
        });

        return eventElement;
    };

    // Show event popup with details
    const showEventPopup = (event, x, y) => {
        const popup = document.getElementById('event-popup');

        // Set popup content
        document.querySelector('#event-popup-time-value').textContent =
            `${event.start.toLocaleDateString()} ${formatTime(event.start.getHours(), event.start.getMinutes())} - ${formatTime(event.end.getHours(), event.end.getMinutes())}`;

        // Set status with appropriate styling
        const statusElement = document.querySelector('#event-popup-status-value');
        statusElement.textContent = event.status.charAt(0).toUpperCase() + event.status.slice(1);
        statusElement.className = `status-${event.status}`;

        // Set price
        document.querySelector('#event-popup-price-value').textContent =
            event.totalPrice ? `$${event.totalPrice}` : 'Not specified';

        // Set customer information
        if (event.customer) {
            // Set customer name
            document.querySelector('#event-popup-customer-name').textContent =
                `${event.customer.first_name || ''} ${event.customer.last_name || ''}`.trim() || 'Unknown';

            // Set customer email
            document.querySelector('#event-popup-customer-email').textContent =
                event.customer.email || 'No email provided';

            // Set customer phone
            document.querySelector('#event-popup-customer-phone').textContent =
                event.customer.phone || 'No phone provided';
        } else {
            // If no customer info is available
            document.querySelector('#event-popup-customer-name').textContent = 'No customer information';
            document.querySelector('#event-popup-customer-email').textContent = '';
            document.querySelector('#event-popup-customer-phone').textContent = '';
        }

        // Set notes
        document.querySelector('#event-popup-notes-value').textContent =
            event.description || 'No notes';

        // Position popup near the click but ensure it stays in viewport
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const popupWidth = 300; // Match the CSS width

        // Calculate position to keep popup within viewport
        let left = x + 10;
        let top = y + 10;

        // Adjust if popup would go off right edge
        if (left + popupWidth > viewportWidth) {
            left = Math.max(10, x - popupWidth - 10);
        }

        // Adjust if popup would go off bottom edge
        const popupHeight = popup.offsetHeight || 200; // Estimate if not yet shown
        if (top + popupHeight > viewportHeight) {
            top = Math.max(10, viewportHeight - popupHeight - 10);
        }

        // Set popup position
        popup.style.left = `${left}px`;
        popup.style.top = `${top}px`;

        // Show popup
        popup.style.display = 'block';

        // Add click handler to close button
        const closeButton = popup.querySelector('.event-popup-close');
        const closePopup = () => {
            popup.style.display = 'none';
            closeButton.removeEventListener('click', closePopup);
            document.removeEventListener('click', documentClickHandler);
        };

        closeButton.addEventListener('click', closePopup);

        // Close when clicking outside the popup
        const documentClickHandler = (e) => {
            if (!popup.contains(e.target) && e.target.closest('.event') === null) {
                closePopup();
            }
        };

        // Use setTimeout to prevent the immediate closing of popup
        setTimeout(() => {
            document.addEventListener('click', documentClickHandler);
        }, 10);
    };

    // Show slot action popup for adding booking or time off
    const showSlotActionPopup = (slotDate, x, y) => {
        const popup = document.getElementById('slot-action-popup');

        // Set the selected time in the popup title
        const dateString = slotDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });

        // Format time for display in popup title
        const timeString = formatTime(slotDate.getHours(), slotDate.getMinutes());
        document.getElementById('slot-action-time').textContent = `${dateString}, ${timeString}`;

        // Store the selected date and time for use in action handlers
        popup.dataset.year = slotDate.getFullYear();
        popup.dataset.month = slotDate.getMonth();
        popup.dataset.day = slotDate.getDate();
        popup.dataset.hour = slotDate.getHours();
        popup.dataset.minute = slotDate.getMinutes();

        // Position popup near the click but ensure it stays in viewport
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const popupWidth = 200; // Match the CSS width

        // Calculate position to keep popup within viewport
        let left = x + 10;
        let top = y + 10;

        // Adjust if popup would go off right edge
        if (left + popupWidth > viewportWidth) {
            left = Math.max(10, x - popupWidth - 10);
        }

        // Adjust if popup would go off bottom edge
        const popupHeight = popup.offsetHeight || 100; // Estimate if not yet shown
        if (top + popupHeight > viewportHeight) {
            top = Math.max(10, viewportHeight - popupHeight - 10);
        }

        // Set popup position
        popup.style.left = `${left}px`;
        popup.style.top = `${top}px`;

        // Show popup
        popup.style.display = 'block';

        // Set up button event handlers
        const addBookingBtn = document.getElementById('add-booking-btn');
        const addTimeoffBtn = document.getElementById('add-timeoff-btn');

        const handleAddBooking = async () => {
            // Show spinner
            const spinner = document.getElementById('booking-spinner');
            if (spinner) spinner.style.display = 'flex';

            // Close the slot action popup
            closePopup();

            // Show the booking form panel (wait for it to finish)
            await showBookingForm(slotDate);

            // Hide spinner after form is shown
            if (spinner) spinner.style.display = 'none';
        };

        const handleAddTimeoff = () => {
            console.log('Add time off clicked for:', slotDate);
            // Here you would add time off block to the calendar
            alert(`Adding time off for ${dateString} at ${timeString}`);
            closePopup();
        };

        // Clean up existing event listeners to prevent duplicates
        addBookingBtn.removeEventListener('click', handleAddBooking);
        addTimeoffBtn.removeEventListener('click', handleAddTimeoff);

        // Add event listeners
        addBookingBtn.addEventListener('click', handleAddBooking);
        addTimeoffBtn.addEventListener('click', handleAddTimeoff);

        // Function to close the popup
        const closePopup = () => {
            popup.style.display = 'none';

            // Clean up event listeners
            addBookingBtn.removeEventListener('click', handleAddBooking);
            addTimeoffBtn.removeEventListener('click', handleAddTimeoff);
            document.removeEventListener('click', documentClickHandler);
        };

        // Close when clicking outside the popup
        const documentClickHandler = (e) => {
            if (!popup.contains(e.target) && !e.target.classList.contains('slot')) {
                closePopup();
            }
        };

        // Use setTimeout to prevent the immediate closing of popup
        setTimeout(() => {
            document.addEventListener('click', documentClickHandler);
        }, 10);
    };

    // Show booking form panel with the selected time slot data
    const showBookingForm = async (slotDate) => {
        const panel = document.getElementById('booking-form-panel');
        const form = document.getElementById('booking-form');

        // Format the date for the date input
        const formattedDate = formatDate(slotDate);

        // Format the time for the time inputs
        const startTime = formatTime(slotDate.getHours(), slotDate.getMinutes());

        // Calculate end time (default to 1 hour later)
        const endDate = new Date(slotDate);
        endDate.setHours(endDate.getHours() + 1);
        const endTime = formatTime(endDate.getHours(), endDate.getMinutes());

        // Set form values for date and time
        document.getElementById('booking-date').value = formattedDate;
        document.getElementById('booking-start-time').value = startTime;
        document.getElementById('booking-end-time').value = endTime;

        // Reset form to first step
        goToStep(1);

        // Clear other form fields that exist
        if (document.getElementById('booking-worker')) {
            document.getElementById('booking-worker').value = '';
        }
        if (document.getElementById('booking-customer')) {
            document.getElementById('booking-customer').value = 'new';
        }
        if (document.getElementById('booking-description')) {
            document.getElementById('booking-description').value = '';
        }
        if (document.getElementById('service-search')) {
            document.getElementById('service-search').value = '';
        }

        // Show the new customer fields initially
        document.getElementById('new-customer-fields').style.display = 'block';

        // Fetch and populate services - this will create the hidden booking-service select element
        await loadServices();

        // Fetch and populate customers in the dropdown
        await loadCustomers();

        // Reset any existing selections from the hidden select
        const serviceSelect = document.getElementById('booking-service');
        if (serviceSelect) {
            // Deselect all options
            Array.from(serviceSelect.options).forEach(option => {
                option.selected = false;
            });
        }

        // Reset selected services summary
        updateSelectedServicesSummary();

        // Setup service search
        setupServiceSearch();

        // Setup step navigation
        setupStepNavigation();

        // Setup customer selection change handler
        setupCustomerChangeHandler();

        // Setup close button
        const closeBtn = panel.querySelector('.close-panel-btn');
        closeBtn.addEventListener('click', () => {
            panel.classList.remove('active');
        });

        // Handle form submission
        form.onsubmit = function(e) {
            e.preventDefault();
            submitBooking();
        };

        // Show the panel
        panel.classList.add('active');
    };

    // Setup step navigation
    const setupStepNavigation = () => {
        // Step tab click handlers
        document.querySelectorAll('.booking-step').forEach(step => {
            step.addEventListener('click', function() {
                const stepNumber = parseInt(this.dataset.step);

                // Only allow going back to step 1 from step 2
                // For going to step 2, use the Next button instead
                if (stepNumber === 1) {
                    goToStep(stepNumber);
                }
            });
        });

        // Next button (step 1 to step 2)
        document.getElementById('step-1-next').addEventListener('click', function() {
            const serviceSelect = document.getElementById('booking-service');

            // Check if at least one service is selected
            if (serviceSelect.selectedOptions.length === 0) {
                alert('Please select at least one service before proceeding.');
                return;
            }

            // Proceed to step 2 and load staff members
            goToStep(2);
            loadStaffMembers();
        });

        // Back button (step 2 to step 1)
        document.getElementById('step-2-back').addEventListener('click', function() {
            goToStep(1);
        });
    };

    // Navigate to a specific step
    const goToStep = (stepNumber) => {
        // Update step tabs
        document.querySelectorAll('.booking-step').forEach(step => {
            step.classList.remove('active');
            if (parseInt(step.dataset.step) === stepNumber) {
                step.classList.add('active');
            }
        });

        // Show the corresponding step content
        document.querySelectorAll('.booking-step-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`booking-step-${stepNumber}`).classList.add('active');
    };

    // Load services from API with proper categorization
    const loadServices = async () => {
        try {
            // Use the correct endpoint for services
            const response = await fetch('http://127.0.0.1:8000/api/v1/companies/services', {
                method: 'GET',
                headers: getAuthHeader(),
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Service data received:', data);

            if (!data.success) {
                throw new Error('Invalid response format or no services found');
            }

            // Process the services data to organize by categories
            let allServices = [];
            const categories = data.data; // The categories are at the root level of data

            // Create hidden select for form submission
            let serviceSelect = document.getElementById('booking-service');

            if (!serviceSelect) {
                serviceSelect = document.createElement('select');
                serviceSelect.id = 'booking-service';
                serviceSelect.name = 'booking-service';
                serviceSelect.multiple = true;
                serviceSelect.style.display = 'none';
                document.getElementById('booking-form').appendChild(serviceSelect);
            } else {
                // Clear existing options
                serviceSelect.innerHTML = '';
            }

            // Build the visible service list with categories
            const customServiceSelect = document.getElementById('custom-service-select');
            if (!customServiceSelect) return [];

            // Clear existing content
            customServiceSelect.innerHTML = '';

            if (categories.length === 0) {
                customServiceSelect.innerHTML = '<div class="no-services">No services available. Please contact support.</div>';
                return [];
            }

            // Add all services to hidden select first
            categories.forEach(category => {
                if (Array.isArray(category.services)) {
                    category.services.forEach(service => {
                        // Add to all services array
                        allServices.push(service);

                        // Add to hidden select
                        const option = document.createElement('option');
                        option.value = service.id || '';
                        option.textContent = service.name || 'Unnamed Service';
                        option.dataset.price = service.discount_price || service.price || 0;
                        option.dataset.originalPrice = service.price || 0;
                        option.dataset.duration = service.duration || 60;
                        option.dataset.category = category.name || '';
                        serviceSelect.appendChild(option);
                    });
                }
            });

            // Build service list by category
            categories.forEach(category => {
                // Create category header
                const categoryEl = document.createElement('div');
                categoryEl.className = 'service-category';
                categoryEl.textContent = category.name;
                customServiceSelect.appendChild(categoryEl);

                // Check if category has services
                if (!Array.isArray(category.services) || category.services.length === 0) {
                    return; // Skip empty categories
                }

                // Add services for this category
                category.services.forEach(service => {
                    if (!service || !service.id) return;

                    // Create service item
                    const serviceItem = document.createElement('div');
                    serviceItem.className = 'service-item';
                    serviceItem.dataset.id = service.id;
                    serviceItem.dataset.name = service.name; // For search functionality

                    // Service header (checkbox, name, price)
                    const serviceHeader = document.createElement('div');
                    serviceHeader.className = 'service-item-header';

                    // Create checkbox container
                    const checkboxContainer = document.createElement('div');
                    checkboxContainer.className = 'service-checkbox';

                    // Create actual checkbox
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.id = `service-${service.id}`;
                    checkbox.value = service.id;
                    checkbox.addEventListener('change', () => {
                        // Update the hidden select
                        const option = Array.from(serviceSelect.options).find(opt => opt.value === service.id);
                        if (option) {
                            option.selected = checkbox.checked;
                            updateSelectedServicesSummary();
                        }
                    });

                    // Create label for checkbox
                    const label = document.createElement('label');
                    label.htmlFor = `service-${service.id}`;
                    label.className = 'service-name';
                    label.textContent = service.name || 'Unnamed Service';

                    // Add checkbox and label to container
                    checkboxContainer.appendChild(checkbox);
                    checkboxContainer.appendChild(label);

                    // Create price display
                    const priceEl = document.createElement('div');
                    priceEl.className = 'service-price';

                    // Handle regular vs discounted price
                    if (service.discount_price) {
                        const originalPrice = document.createElement('span');
                        originalPrice.className = 'service-original-price';
                        originalPrice.textContent = `$${parseFloat(service.price).toFixed(2)}`;

                        const discountPrice = document.createElement('span');
                        discountPrice.textContent = `$${parseFloat(service.discount_price).toFixed(2)}`;

                        priceEl.appendChild(originalPrice);
                        priceEl.appendChild(discountPrice);
                    } else {
                        priceEl.textContent = `$${parseFloat(service.price || 0).toFixed(2)}`;
                    }

                    // Add elements to header
                    serviceHeader.appendChild(checkboxContainer);
                    serviceHeader.appendChild(priceEl);
                    serviceItem.appendChild(serviceHeader);

                    // Add duration
                    const durationEl = document.createElement('div');
                    durationEl.className = 'service-duration';
                    durationEl.textContent = `${service.duration || 60} min`;
                    serviceItem.appendChild(durationEl);

                    // Add click handler for the whole service item
                    serviceItem.addEventListener('click', (e) => {
                        // Don't trigger if clicking directly on checkbox (it handles itself)
                        if (e.target !== checkbox) {
                            checkbox.checked = !checkbox.checked;

                            // Update the hidden select
                            const option = Array.from(serviceSelect.options).find(opt => opt.value === service.id);
                            if (option) {
                                option.selected = checkbox.checked;
                                updateSelectedServicesSummary();
                            }
                        }
                    });

                    customServiceSelect.appendChild(serviceItem);
                });
            });

            return allServices;
        } catch (error) {
            console.error('Error fetching services:', error);

            // Show error in the UI
            const customServiceSelect = document.getElementById('custom-service-select');
            if (customServiceSelect) {
                customServiceSelect.innerHTML = `<div class="error-message">Error loading services: ${error.message}</div>`;
            }

            return [];
        }
    };

    // Toggle selection of a service
    const toggleServiceSelection = (service, serviceItem) => {
        const isSelected = serviceItem.classList.toggle('selected');
        const hiddenSelect = document.getElementById('booking-service');

        // Find the matching option in the hidden select
        const option = Array.from(hiddenSelect.options).find(opt => opt.value === service.id);

        if (isSelected) {
            // Select the option
            option.selected = true;

            // Add to selected services array
            window.selectedServices.push(service);
        } else {
            // Deselect the option
            option.selected = false;

            // Remove from selected services array
            window.selectedServices = window.selectedServices.filter(s => s.id !== service.id);
        }

        // Update the selected services summary
        updateSelectedServicesSummary();
    };

    // Setup service search functionality
    const setupServiceSearch = () => {
        const searchInput = document.getElementById('service-search');
        const customServiceSelect = document.getElementById('custom-service-select');

        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();

            // Get all service items and categories
            const serviceItems = customServiceSelect.querySelectorAll('.service-item');
            const categories = customServiceSelect.querySelectorAll('.service-category');

            // Reset visibility
            categories.forEach(category => {
                category.style.display = '';
            });

            serviceItems.forEach(item => {
                item.style.display = '';
            });

            if (searchTerm) {
                // Track which categories have visible services
                const categoriesWithVisibleServices = new Set();

                // Hide services that don't match search
                serviceItems.forEach(item => {
                    const serviceName = item.dataset.name.toLowerCase();

                    if (serviceName.includes(searchTerm)) {
                        // Find the category this service belongs to
                        let categoryElement = item.previousElementSibling;
                        while (categoryElement && !categoryElement.classList.contains('service-category')) {
                            categoryElement = categoryElement.previousElementSibling;
                        }

                        if (categoryElement) {
                            categoriesWithVisibleServices.add(categoryElement);
                        }
                    } else {
                        item.style.display = 'none';
                    }
                });

                // Hide empty categories
                categories.forEach(category => {
                    if (!categoriesWithVisibleServices.has(category)) {
                        category.style.display = 'none';
                    }
                });
            }
        });
    };

    // Update the selected services summary
    const updateSelectedServicesSummary = () => {
        const serviceSelect = document.getElementById('booking-service');
        const summaryList = document.getElementById('selected-services-list');
        const emptyMessage = document.querySelector('.empty-selection-message');

        // Get selected options
        const selectedOptions = Array.from(serviceSelect.selectedOptions);

        // Clear existing summary
        while (summaryList.firstChild) {
            if (summaryList.firstChild.classList && summaryList.firstChild.classList.contains('empty-selection-message')) {
                break;
            }
            summaryList.removeChild(summaryList.firstChild);
        }

        let totalDuration = 0;
        let totalPrice = 0;

        // If no services selected, show empty message
        if (selectedOptions.length === 0) {
            emptyMessage.style.display = 'block';
            document.getElementById('total-duration').textContent = '0 min';
            document.getElementById('total-price').textContent = '$0.00';
            return;
        }

        // Hide empty message if we have selected services
        emptyMessage.style.display = 'none';

        // Add each selected service to the summary
        selectedOptions.forEach(option => {
            const serviceItem = document.createElement('div');
            serviceItem.className = 'selected-service-item';

            const duration = parseInt(option.dataset.duration || 0);
            const price = parseFloat(option.dataset.price || 0);

            totalDuration += duration;
            totalPrice += price;

            // Create service info container
            const serviceInfo = document.createElement('div');
            serviceInfo.className = 'selected-service-info';

            // Service name
            const serviceName = document.createElement('div');
            serviceName.className = 'selected-service-name';
            serviceName.textContent = option.text.split(' - ')[0]; // Get only the service name without price

            // Service price
            const servicePrice = document.createElement('div');
            servicePrice.className = 'selected-service-price';
            servicePrice.textContent = `Price: $${price.toFixed(2)}`;

            // Service duration
            const serviceDuration = document.createElement('div');
            serviceDuration.className = 'selected-service-duration';
            serviceDuration.textContent = `Duration: ${duration} min`;

            // Add all info elements
            serviceInfo.appendChild(serviceName);
            serviceInfo.appendChild(servicePrice);
            serviceInfo.appendChild(serviceDuration);

            // Create remove button
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-service-btn';
            removeBtn.innerHTML = '&times;';
            removeBtn.title = 'Remove service';
            removeBtn.setAttribute('type', 'button');
            removeBtn.onclick = function() {
                option.selected = false;
                updateSelectedServicesSummary();
                updateEndTimeBasedOnDuration(totalDuration);
            };

            // Add everything to the service item
            serviceItem.appendChild(serviceInfo);
            serviceItem.appendChild(removeBtn);

            // Add to the list
            summaryList.insertBefore(serviceItem, emptyMessage);
        });

        // Update totals
        document.getElementById('total-duration').textContent = `${totalDuration} min`;
        document.getElementById('total-price').textContent = `$${totalPrice.toFixed(2)}`;

        // Update end time based on total duration
        updateEndTimeBasedOnDuration(totalDuration);
    };

    // Logout functionality (duplicate, can be removed)
    document.getElementById('logout-btn').addEventListener('click', function(e) {
        e.preventDefault();
        localStorage.removeItem('accessToken');
        localStorage.removeItem('tokenType');
        localStorage.removeItem('tokenExpiresIn');
        window.location.href = '/users/login/';
    });

    // Initialize calendar with proper waiting for async operations
    (async function initCalendar() {
        console.log('Calendar initialization started');
        try {
            // Check if the calendar container exists
            const calendarGrid = document.querySelector('.calendar-grid');
            if (!calendarGrid) {
                console.error('Calendar grid element not found');
                return;
            }

            // Ensure we wait for the DOM to be fully loaded
            await new Promise(resolve => {
                if (document.readyState === 'complete') {
                    resolve();
                } else {
                    window.addEventListener('load', resolve);
                }
            });

            console.log('Rendering calendar for date:', currentDate);
            await renderCalendar(currentDate);
            console.log('Calendar rendering completed');
        } catch (error) {
            console.error('Error initializing calendar:', error);
        }
    })();

    // Previous week button
    document.getElementById('prev-week').addEventListener('click', async function() {
        currentDate.setDate(currentDate.getDate() - 7);
        await renderCalendar(currentDate);
    });

    // Next week button
    document.getElementById('next-week').addEventListener('click', async function() {
        currentDate.setDate(currentDate.getDate() + 7);
        await renderCalendar(currentDate);
    });

    // Function to fetch data from API with authorization
    const fetchData = async (url) => {
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: getAuthHeader(),
            });

            if (!response.ok) {
                // If unauthorized, redirect to login
                if (response.status === 401) {
                    localStorage.removeItem('accessToken');
                    window.location.href = '/users/login/';
                    return null;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            return null;
        }
    };

    // Fetch bookings from API with date range parameters
    const fetchBookings = async (startDate, endDate) => {
        try {
            // Format dates for API request
            const formattedStartDate = formatDate(startDate);
            const formattedEndDate = formatDate(endDate);

            console.log(`Fetching bookings from ${formattedStartDate} to ${formattedEndDate}`);

            // Build query parameters
            const queryParams = new URLSearchParams({
                start_date: formattedStartDate,
                end_date: formattedEndDate
            }).toString();

            const response = await fetch(`http://127.0.0.1:8000/api/v1/bookings?${queryParams}`, {
                method: 'GET',
                headers: getAuthHeader(),
                credentials: 'include'
            });

            if (!response.ok) {
                if (response.status === 401) {
                    // If unauthorized, redirect to login
                    localStorage.removeItem('accessToken');
                    window.location.href = '/users/login/';
                    return [];
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.success ? data.data : [];
        } catch (error) {
            console.error('Error fetching bookings:', error);
            return [];
        }
    };

    // Convert API bookings to calendar events
    const convertBookingsToEvents = (bookings) => {
        return bookings.map(booking => {
            const startAt = new Date(booking.start_at);
            const endAt = new Date(booking.end_at);

            // Determine color based on booking status
            let color = 'event-blue';
            if (booking.status === 'cancelled') {
                color = 'event-cancelled';
            } else if (booking.status === 'completed') {
                color = 'event-completed';
            }

            // Customer information
            const customer = booking.customer || {};
            const customerName = customer.first_name && customer.last_name
                ? `${customer.first_name} ${customer.last_name}`
                : 'Unknown Customer';
            const customerPhone = customer.phone || 'No phone';
            const customerEmail = customer.email || 'No email';

            return {
                id: booking.id,
                title: customerName,
                description: booking.notes || 'No notes',
                start: startAt,
                end: endAt,
                color: color,
                totalPrice: booking.total_price,
                status: booking.status,
                customer: customer
            };
        });
    };

    // Fetch staff members from API
    const loadStaffMembers = async () => {
        try {
            const response = await fetch('http://127.0.0.1:8000/api/v1/companies/users', {
                method: 'GET',
                headers: getAuthHeader(),
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const staffMembers = data.success ? data.data : [];

            // Populate the staff members dropdown
            const workerDropdown = document.getElementById('booking-worker');

            // Clear existing options except the first one
            while (workerDropdown.options.length > 1) {
                workerDropdown.options.remove(1);
            }

            // Add staff members to dropdown
            staffMembers.forEach(staffMember => {
                if (staffMember.user) {
                    const option = document.createElement('option');
                    option.value = staffMember.user.id;
                    option.textContent = `${staffMember.user.first_name} ${staffMember.user.last_name}`;
                    workerDropdown.appendChild(option);
                }
            });

            return staffMembers;
        } catch (error) {
            console.error('Error fetching staff members:', error);
            return [];
        }
    };

    // Fetch customers from API and populate the dropdown
    const loadCustomers = async () => {
        try {
            const response = await fetch('http://127.0.0.1:8000/api/v1/companies/customers', {
                method: 'GET',
                headers: getAuthHeader(),
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const customers = data.success ? data.data : [];

            // Populate the customer dropdown
            const customerDropdown = document.getElementById('booking-customer');

            // Keep the "New Customer" option and remove all others
            while (customerDropdown.options.length > 1) {
                customerDropdown.options.remove(1);
            }

            // Only add active customers to the dropdown
            customers.forEach(customer => {
                // Include all customers for now, even if they're disabled
                const option = document.createElement('option');
                option.value = customer.id;

                // Format the customer name and info
                const fullName = `${customer.first_name} ${customer.last_name}`;
                let displayText = fullName;

                // Add email or phone if available
                if (customer.email || customer.phone) {
                    let contactInfo = [];
                    if (customer.email) contactInfo.push(customer.email);
                    if (customer.phone) contactInfo.push(customer.phone);
                    displayText += ` (${contactInfo.join(', ')})`;
                }

                // Add a disabled indicator if the customer is disabled
                if (customer.status === 'disabled') {
                    option.disabled = true;
                    displayText += ' [Disabled]';
                }

                option.textContent = displayText;
                customerDropdown.appendChild(option);
            });

            return customers;
        } catch (error) {
            console.error('Error fetching customers:', error);
            return [];
        }
    };

    // Submit booking to API
    const submitBooking = async () => {
        const spinner = document.getElementById('booking-spinner');
        const messageBox = document.getElementById('booking-message');
        try {
            // Show spinner
            if (spinner) spinner.style.display = 'flex';
            if (messageBox) messageBox.style.display = 'none';

            // Get form values
            const form = document.getElementById('booking-form');
            const date = document.getElementById('booking-date').value;
            const startTime = document.getElementById('booking-start-time').value;
            const serviceSelect = document.getElementById('booking-service');
            const workerId = document.getElementById('booking-worker').value;
            const customerType = document.getElementById('booking-customer').value;
            const description = document.getElementById('booking-description').value;

            // Format the start time in ISO format
            const startAt = `${date}T${startTime}:00Z`;

            // Get selected services
            const selectedServices = Array.from(serviceSelect.selectedOptions);

            if (selectedServices.length === 0) {
                alert('Please select at least one service');
                goToStep(1); // Go back to service selection
                return;
            }

            if (!workerId) {
                alert('Please select a staff member');
                return;
            }

            // Create booking data object with the new structure
            let bookingData = {
                start_time: startAt,
                notes: description || '',
                services: []
            };

            // Add each selected service to the services array
            selectedServices.forEach(option => {
                bookingData.services.push({
                    category_service_id: option.value,
                    user_id: workerId,
                    notes: '' // Currently we don't have per-service notes
                });
            });

            // Handle customer data
            if (customerType === 'new') {
                // This is a new customer
                // Get customer fields, with fallback to default values if empty
                let firstName = document.getElementById('customer-first-name').value.trim();
                let lastName = document.getElementById('customer-last-name').value.trim();
                let email = document.getElementById('customer-email').value.trim();
                let phone = document.getElementById('customer-phone').value.trim();

                // Apply default values if fields are empty
                firstName = firstName || 'unknown';
                lastName = lastName || 'unknown';
                email = email || 'unknown@unknown.com';
                phone = phone || '0000000';

                // Add customer data to booking with the new structure
                bookingData.customer_info = {
                    first_name: firstName,
                    last_name: lastName,
                    email: email,
                    phone: phone
                };
            } else {
                // This is an existing customer - include their ID in the customer_info object
                bookingData.customer_info = {
                    id: customerType
                };
            }

            console.log('Creating booking with data:', bookingData);

            // Send the booking data to the API
            const response = await fetch('http://127.0.0.1:8000/api/v1/bookings/users/create_booking', {
                method: 'POST',
                headers: getAuthHeader(),
                body: JSON.stringify(bookingData),
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Failed to create booking: ${response.status}`);
            }

            // Hide spinner
            if (spinner) spinner.style.display = 'none';

            // Show success message
            if (messageBox) {
                messageBox.textContent = 'Booking created successfully!';
                messageBox.style.background = '#e6f9ec';
                messageBox.style.color = '#218838';
                messageBox.style.border = '1px solid #218838';
                messageBox.style.display = 'block';
            }

            // Close the form panel
            document.getElementById('booking-form-panel').classList.remove('active');

            // Refresh the calendar to show the new booking
            await renderCalendar(currentDate);

        } catch (error) {
            // Hide spinner
            if (spinner) spinner.style.display = 'none';

            // Show error message
            if (messageBox) {
                messageBox.textContent = `Failed to create booking: ${error.message}`;
                messageBox.style.background = '#fbeaea';
                messageBox.style.color = '#c82333';
                messageBox.style.border = '1px solid #c82333';
                messageBox.style.display = 'block';
            }
        }
    };

    // Setup the customer dropdown change handler
    const setupCustomerChangeHandler = () => {
        const customerDropdown = document.getElementById('booking-customer');
        const newCustomerFields = document.getElementById('new-customer-fields');

        customerDropdown.addEventListener('change', function() {
            // Show or hide the new customer fields based on selection
            if (this.value === 'new') {
                newCustomerFields.style.display = 'block';
            } else {
                newCustomerFields.style.display = 'none';
            }
        });

        // Initial setup based on default value
        if (customerDropdown.value !== 'new') {
            newCustomerFields.style.display = 'none';
        } else {
            newCustomerFields.style.display = 'block';
        }
    };
});
