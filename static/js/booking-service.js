// Booking service - handles all booking related operations
const BookingService = (() => {
    // Cache for booking data with 1-minute expiration
    const bookingCache = {
        data: null,
        timestamp: null,
        cacheKey: null,
        expirationTime: 60000 // 1 minute in milliseconds
    };

    // Generate cache key based on date range and staff filter
    const generateCacheKey = (startDate, endDate, staffIds = null) => {
        const formattedStart = Utils.formatDate(startDate);
        const formattedEnd = Utils.formatDate(endDate);
        const staffKey = staffIds ? staffIds.sort().join(',') : 'all';
        return `${formattedStart}_${formattedEnd}_${staffKey}`;
    };

    // Check if cache is valid
    const isCacheValid = (cacheKey) => {
        if (!bookingCache.data || !bookingCache.timestamp || bookingCache.cacheKey !== cacheKey) {
            return false;
        }
        const now = Date.now();
        const elapsed = now - bookingCache.timestamp;
        return elapsed < bookingCache.expirationTime;
    };

    // Clear cache (useful for when bookings are created/updated)
    const clearCache = () => {
        bookingCache.data = null;
        bookingCache.timestamp = null;
        bookingCache.cacheKey = null;
        console.log('📦 Booking cache cleared');
    };

    // Fetch bookings from API with date range parameters
    const fetchBookings = async (startDate, endDate, staffIds = null) => {
        try {
            // Format dates for API request
            const formattedStartDate = Utils.formatDate(startDate);
            const formattedEndDate = Utils.formatDate(endDate);

            console.log(`🔄 Fetching bookings from API from ${formattedStartDate} to ${formattedEndDate} (cache miss)`);

            // Build query parameters
            const params = {
                start_date: formattedStartDate,
                end_date: formattedEndDate
            };

            // Add staff filter if provided
            if (staffIds && staffIds.length) {
                staffIds.forEach(id => {
                    if (!params.staff_id) params.staff_id = [];
                    params.staff_id.push(id);
                });
            }

            const response = await api.getBookings(params);
            const bookings = response?.success ? response.data : [];

            return bookings;
        } catch (error) {
            console.error('Error fetching bookings:', error);
            return [];
        }
    };

    // Convert API bookings to calendar events
    const convertBookingsToEvents = (bookings) => {
        return bookings.map(booking => {
            // Parse UTC dates and convert to local timezone
            // The dates come as "2025-12-10T16:00:00" format (UTC) but without 'Z' suffix
            // We need to explicitly treat them as UTC and convert to local time

            // Create UTC dates by appending 'Z' to force UTC interpretation
            const utcStartString = booking.start_at.includes('Z') ? booking.start_at : booking.start_at + 'Z';
            const utcEndString = booking.end_at.includes('Z') ? booking.end_at : booking.end_at + 'Z';

            // Parse as UTC dates
            const utcStartDate = new Date(utcStartString);
            const utcEndDate = new Date(utcEndString);

            // Convert UTC to local timezone by creating new dates with local time values
            // This accounts for the user's timezone offset
            const localStartAt = new Date(utcStartDate.getTime());
            const localEndAt = new Date(utcEndDate.getTime());

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
                start: localStartAt,
                end: localEndAt,
                color: color,
                totalPrice: booking.total_price,
                status: booking.status,
                customer: customer,
                bookingServices: booking.booking_services || [] // Preserve booking services
            };
        });
    };

    // Get time offs from Django context instead of fetching from API
    const getTimeOffs = () => {
        // Use the time-offs data passed from Django template
        return window.userTimeOffs || [];
    };

    // Fetch time offs from API with date range parameters
    const fetchTimeOffs = async (startDate, availabilityType = 'weekly') => {
        try {
            // Format dates for API request
            const formattedStartDate = Utils.formatDate(startDate);

            console.log(`Fetching time offs from ${formattedStartDate} as ${availabilityType}`);

            // Build query parameters
            const params = {
                start_date: formattedStartDate,
                availability_type: availabilityType
            };

            const response = await api.getTimeOffs(params);

            // Update the global window.userTimeOffs with fresh data
            if (response?.success) {
                window.userTimeOffs = response.data;
                return response.data;
            }
            return [];
        } catch (error) {
            console.error('Error fetching time offs:', error);
            return [];
        }
    };

    // Convert API time-offs to calendar events
    const convertTimeOffsToEvents = (timeOffs) => {
        return timeOffs.map(timeOff => {
            const startDate = new Date(timeOff.start_date);
            const endDate = new Date(timeOff.end_date);

            // Create staff name from user info
            const staffName = timeOff.user ?
                `${timeOff.user.first_name} ${timeOff.user.last_name}` : 'Staff';

            return {
                id: timeOff.id,
                title: `${staffName} - Time Off`,
                description: timeOff.reason || 'Time off',
                start: startDate,
                end: endDate,
                color: 'event-gray', // Gray color for time off
                isTimeOff: true,
                user: timeOff.user
            };
        });
    };

    // Submit new booking to API
    const submitBooking = async () => {
        try {
            // Show spinner
            Utils.toggleSpinner(true);
            
            // Clear message
            const messageBox = document.getElementById('booking-message');
            if (messageBox) messageBox.style.display = 'none';

            // Get form values
            const startDate = document.getElementById('booking-start-date').value;
            const endDate = document.getElementById('booking-end-date').value;
            const startTime = document.getElementById('booking-start-time').value;
            const endTime = document.getElementById('booking-end-time').value;
            const workerId = document.getElementById('booking-worker').value;
            const customerType = document.getElementById('booking-customer').value;
            const description = document.getElementById('booking-description').value;

            // Format the start and end times in ISO format
            const startAt = `${startDate}T${startTime}:00Z`;
            const endAt = `${endDate}T${endTime}:00Z`;

            // Get selected services from checkboxes instead of select dropdown
            const selectedServiceCheckboxes = document.querySelectorAll('input[name="booking-service"]:checked');

            if (selectedServiceCheckboxes.length === 0) {
                alert('Please select at least one service');
                UI.goToStep(1); // Go back to service selection
                Utils.toggleSpinner(false);
                return;
            }

            if (!workerId) {
                alert('Please select a staff member');
                Utils.toggleSpinner(false);
                return;
            }

            // Create booking data object with the correct API structure
            let bookingData = {
                start_time: startAt,
                end_time: endAt,
                notes: description || '',
                services: []
            };

            // Add each selected service to the services array
            selectedServiceCheckboxes.forEach(checkbox => {
                bookingData.services.push({
                    category_service_id: checkbox.value,
                    user_id: workerId,
                    notes: ''
                });
            });

            // Handle customer data
            if (customerType === 'new') {
                // This is a new customer
                let firstName = document.getElementById('customer-first-name').value.trim();
                let lastName = document.getElementById('customer-last-name').value.trim();
                let email = document.getElementById('customer-email').value.trim();
                let phone = document.getElementById('customer-phone').value.trim();

                // Apply default values if fields are empty
                firstName = firstName || 'unknown';
                lastName = lastName || 'unknown';
                email = email || 'unknown@unknown.com';
                phone = phone || '0000000';

                // Add customer data to booking
                bookingData.customer_info = {
                    first_name: firstName,
                    last_name: lastName,
                    email: email,
                    phone: phone
                };
            } else {
                // This is an existing customer - include their ID
                bookingData.customer_info = {
                    id: customerType
                };
            }

            console.log('Creating booking with data:', bookingData);

            // Use API client to create booking
            const response = await api.createBooking(bookingData);

            if (!response?.success) {
                throw new Error(response?.message || 'Failed to create booking');
            }

            // Show success message
            UI.showMessage('Booking created successfully', 'success');

            // Clear the booking cache to ensure fresh data on next fetch
            clearCache();

            // Close the form panel
            document.getElementById('booking-form-panel').classList.remove('active');

            // Refresh the calendar to show the new booking
            await Calendar.renderCalendar(Calendar.getCurrentDate());

        } catch (error) {
            // Show error message
            UI.showMessage(`Failed to create booking: ${error.message}`, 'error', 8000);
            console.error('Error creating booking:', error);
        } finally {
            // Hide spinner
            Utils.toggleSpinner(false);
        }
    };

    // Update an existing booking
    const updateBooking = async (bookingId) => {
        const formPanel = document.getElementById('booking-form-panel');
        
        try {
            // Show spinner
            Utils.toggleSpinner(true);
            
            // Clear message
            const messageBox = document.getElementById('booking-message');
            if (messageBox) messageBox.style.display = 'none';

            // Get form values - similar to create booking
            const startDate = document.getElementById('booking-start-date').value;
            const endDate = document.getElementById('booking-end-date').value;
            const startTime = document.getElementById('booking-start-time').value;
            const endTime = document.getElementById('booking-end-time').value;
            const workerId = document.getElementById('booking-worker').value;
            const customerType = document.getElementById('booking-customer').value;
            const description = document.getElementById('booking-description').value;

            // Format the start and end times in ISO format
            const startAt = `${startDate}T${startTime}:00Z`;
            const endAt = `${endDate}T${endTime}:00Z`;

            // Get selected services from checkboxes instead of select dropdown
            const selectedServiceCheckboxes = document.querySelectorAll('input[name="booking-service"]:checked');

            if (selectedServiceCheckboxes.length === 0) {
                alert('Please select at least one service');
                UI.goToStep(1); // Go back to service selection
                Utils.toggleSpinner(false);
                return;
            }

            if (!workerId) {
                alert('Please select a staff member');
                Utils.toggleSpinner(false);
                return;
            }

            // Create booking update data object
            let bookingData = {
                start_time: startAt,
                end_time: endAt,  // Include end time in the booking data
                notes: description || '',
                services: []
            };

            // Add each selected service to the services array
            selectedServiceCheckboxes.forEach(checkbox => {
                bookingData.services.push({
                    category_service_id: checkbox.value,
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

            console.log('Updating booking with data:', bookingData);

            // Use API client instead of direct fetch
            const response = await api.updateBooking(bookingId, bookingData);

            if (!response?.success) {
                throw new Error(response?.message || 'Failed to update booking');
            }

            // Show success message
            Utils.showMessage('Booking updated successfully!', 'success');

            // Clear the booking cache to ensure fresh data on next fetch
            clearCache();

            // Close the form panel and reset it to create mode
            formPanel.classList.remove('active');
            formPanel.dataset.mode = 'create';
            formPanel.querySelector('.booking-form-header h3').textContent = 'Add New Booking';
            document.getElementById('booking-submit-btn').textContent = 'Create Booking';

            // Reset form event handler for create mode
            const form = document.getElementById('booking-form');
            form.onsubmit = function(e) {
                e.preventDefault();
                submitBooking();
            };

            // Refresh the calendar to show the updated booking
            await Calendar.renderCalendar(Calendar.getCurrentDate());

        } catch (error) {
            // Show error message
            Utils.showMessage(`Failed to update booking: ${error.message}`, 'error', 8000);
            console.error('Error updating booking:', error);
        } finally {
            // Hide spinner
            Utils.toggleSpinner(false);
        }
    };
    
    // Handle Edit Booking - Fetch booking details and show edit form
    const handleEditBooking = async (bookingId) => {
        const formPanel = document.getElementById('booking-form-panel');
        const formHeader = formPanel.querySelector('.booking-form-header h3');
        
        try {
            // Show spinner while fetching booking details
            Utils.toggleSpinner(true);
            
            // Clear message
            const messageBox = document.getElementById('booking-message');
            if (messageBox) messageBox.style.display = 'none';
            
            // Use API client instead of direct fetch
            const response = await api.getBookingById(bookingId);

            if (!response?.success) {
                throw new Error(response?.message || 'Failed to fetch booking details');
            }

            const booking = response.data;

            console.log('Fetched booking details:', booking);
            
            // Switch form to edit mode
            formHeader.textContent = 'Edit Booking';
            formPanel.dataset.mode = 'edit';
            formPanel.dataset.bookingId = bookingId;
            
            // Reset form to first step
            UI.goToStep(1);
            
            // Fill form with booking details
            populateBookingForm(booking);
            
            // Show the booking form panel
            formPanel.classList.add('active');
            
            // Remove any existing event listeners to prevent duplicates
            const form = document.getElementById('booking-form');
            const newForm = form.cloneNode(true);
            form.parentNode.replaceChild(newForm, form);

            // Re-attach the step navigation button event listeners
            const step1NextBtn = document.getElementById('step-1-next');
            if (step1NextBtn) {
                step1NextBtn.addEventListener('click', () => UI.goToStep(2));
            }

            const step2BackBtn = document.getElementById('step-2-back');
            if (step2BackBtn) {
                step2BackBtn.addEventListener('click', () => UI.goToStep(1));
            }

            // Setup form submission handler for edit mode - use one-time event handler
            newForm.addEventListener('submit', function submitHandler(e) {
                e.preventDefault();
                e.stopPropagation(); // Stop event bubbling

                // Remove this event listener after first use to prevent multiple calls
                newForm.removeEventListener('submit', submitHandler);

                // Call update with the bookingId
                updateBooking(bookingId);

                // Return false to prevent default and bubbling
                return false;
            });

            // Update the submit button text
            const submitBtn = document.getElementById('booking-submit-btn');
            if (submitBtn) {
                submitBtn.textContent = 'Update Booking';
            }
            
        } catch (error) {
            // Show error message
            Utils.showMessage(error.message, 'error', 8000);
            console.error('Error fetching booking details:', error);
        } finally {
            // Hide spinner
            Utils.toggleSpinner(false);
        }
    };
    
    // Populate booking form with data from API
    const populateBookingForm = (booking) => {
        // Extract start date and time from booking
        const startAt = new Date(booking.start_at);
        const endAt = new Date(booking.end_at);
        
        // Format dates and times for form inputs
        const formattedStartDate = Utils.formatDate(startAt);
        const formattedEndDate = Utils.formatDate(endAt);
        const startTime = Utils.formatTime(startAt.getHours(), startAt.getMinutes());
        const endTime = Utils.formatTime(endAt.getHours(), endAt.getMinutes());
        
        // Set date and time values
        document.getElementById('booking-start-date').value = formattedStartDate;
        document.getElementById('booking-end-date').value = formattedEndDate;
        document.getElementById('booking-start-time').value = startTime;
        document.getElementById('booking-end-time').value = endTime;
        
        // Set description/notes
        document.getElementById('booking-description').value = booking.notes || '';
        
        // Use booking_services from the API response if available
        const bookingServices = booking.booking_services || [];

        // Get staff ID from booking services (all services should have the same user_id)
        let staffId = '';
        if (bookingServices.length > 0) {
            staffId = bookingServices[0].user_id;
        }

        // Set up services - first load all available services
        ServiceManager.loadServices().then(() => {
            // After services are loaded, check the selected services from the booking
            if (bookingServices.length > 0) {
                bookingServices.forEach(bookingService => {
                    // Check the checkbox for this service
                    const checkbox = document.getElementById(`service-${bookingService.category_service_id}`);
                    if (checkbox) {
                        checkbox.checked = true;
                    }
                });
                
                // Update selected services summary
                ServiceManager.updateSelectedServicesSummary();
            }
        });
        
        // Fetch and populate staff members, then select the current one using staffId from booking_services
        StaffManager.loadStaffMembers().then(() => {
            const workerDropdown = document.getElementById('booking-worker');
            
            if (staffId && workerDropdown) {
                // Select the worker in the dropdown
                workerDropdown.value = staffId;
            }
        });
        
        // Fetch and populate customers, then select the current one
        CustomerManager.loadCustomers().then(() => {
            const customerDropdown = document.getElementById('booking-customer');
            const newCustomerFields = document.getElementById('new-customer-fields');
            
            if (!customerDropdown || !newCustomerFields) return;

            if (booking.customer && booking.customer.id) {
                // Select the customer in the dropdown
                customerDropdown.value = booking.customer.id;

                // Hide the new customer fields
                newCustomerFields.style.display = 'none';
            } else {
                // If no customer or no customer ID, set to "new customer"
                customerDropdown.value = 'new';
                
                // Show the new customer fields
                newCustomerFields.style.display = 'block';
                
                // Fill customer information if available
                if (booking.customer) {
                    document.getElementById('customer-first-name').value = booking.customer.first_name || '';
                    document.getElementById('customer-last-name').value = booking.customer.last_name || '';
                    document.getElementById('customer-email').value = booking.customer.email || '';
                    document.getElementById('customer-phone').value = booking.customer.phone || '';
                }
            }
        });
    };
    
    // Create new booking from calendar slot
    const createNewBooking = (date) => {
        const formPanel = document.getElementById('booking-form-panel');
        const formHeader = formPanel.querySelector('.booking-form-header h3');
        
        // Switch to create mode
        formHeader.textContent = 'Add New Booking';
        formPanel.dataset.mode = 'create';
        delete formPanel.dataset.bookingId;
        
        // Reset form to first step
        UI.goToStep(1);

        // Reset the form
        document.getElementById('booking-form').reset();
        
        // Format the date string
        const formattedDate = Utils.formatDate(date);

        // Set the selected date for both start and end date
        document.getElementById('booking-start-date').value = formattedDate;
        document.getElementById('booking-end-date').value = formattedDate;

        // Set the selected time
        document.getElementById('booking-start-time').value = Utils.formatTime(date.getHours(), date.getMinutes());
        
        // Set end time equal to start time initially (0 duration)
        document.getElementById('booking-end-time').value = Utils.formatTime(date.getHours(), date.getMinutes());

        // Show the form panel
        formPanel.classList.add('active');
        
        // Remove any existing event listeners to prevent duplicates
        const form = document.getElementById('booking-form');
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);

        // Load data AFTER cloning to populate the new form
        // Load services for the booking form
        ServiceManager.loadServices();

        // Load staff members
        StaffManager.loadStaffMembers();

        // Load customers into booking dropdown
        CustomerManager.renderBookingDropdown();

        // Add event listeners to start date and time to recalculate end time
        setupStartTimeChangeListeners();

        // Re-attach the step navigation button event listeners
        const step1NextBtn = document.getElementById('step-1-next');
        if (step1NextBtn) {
            step1NextBtn.addEventListener('click', () => UI.goToStep(2));
        }

        const step2BackBtn = document.getElementById('step-2-back');
        if (step2BackBtn) {
            step2BackBtn.addEventListener('click', () => UI.goToStep(1));
        }

        // Set form submission handler for create mode with one-time event handler
        newForm.addEventListener('submit', function submitHandler(e) {
            e.preventDefault();
            e.stopPropagation(); // Stop event bubbling

            // Remove this event listener after first use to prevent multiple calls
            newForm.removeEventListener('submit', submitHandler);

            // Call submit function
            submitBooking();

            // Return false to prevent default and bubbling
            return false;
        });

        // Update the submit button text
        const submitBtn = document.getElementById('booking-submit-btn');
        if (submitBtn) {
            submitBtn.textContent = 'Create Booking';
        }
    };
    
    // Setup event listeners for start date/time changes to recalculate end time
    const setupStartTimeChangeListeners = () => {
        const startDateInput = document.getElementById('booking-start-date');
        const startTimeInput = document.getElementById('booking-start-time');

        if (startDateInput) {
            startDateInput.addEventListener('change', () => {
                // Recalculate end time based on current service selection
                ServiceManager.updateSelectedServicesSummary();
            });
        }

        if (startTimeInput) {
            startTimeInput.addEventListener('change', () => {
                // Recalculate end time based on current service selection
                ServiceManager.updateSelectedServicesSummary();
            });
        }
    };

    // Delete a booking
    const deleteBooking = async (bookingId) => {
        if (!confirm('Are you sure you want to delete this booking?')) {
            return;
        }

        try {
            // Show spinner
            Utils.toggleSpinner(true);

            // Use API client instead of direct fetch
            const response = await api.deleteBooking(bookingId);

            if (!response?.success) {
                throw new Error(response?.message || 'Failed to delete booking');
            }

            // Show success message
            Utils.showMessage('Booking deleted successfully!', 'success');

            // Clear the booking cache to ensure fresh data on next fetch
            clearCache();

            // Refresh the calendar to remove the deleted booking
            await Calendar.renderCalendar(Calendar.getCurrentDate());

        } catch (error) {
            // Show error message
            Utils.showMessage(`Failed to delete booking: ${error.message}`, 'error', 8000);
            console.error('Error deleting booking:', error);
        } finally {
            // Hide spinner
            Utils.toggleSpinner(false);
        }
    };

    // Create time off - Opens the time off panel with pre-filled date/time
    const createTimeOff = (date) => {
        const panel = document.getElementById('time-off-panel');
        if (!panel) return;

        // Format date and time for input fields
        const dateStr = Utils.formatDate(date);
        const timeStr = Utils.formatTime(date.getHours(), date.getMinutes(), true); // 24-hour format

        // Pre-fill the start date and time
        const startDateInput = document.getElementById('time-off-start-date');
        const startTimeInput = document.getElementById('time-off-start-time');
        const endDateInput = document.getElementById('time-off-end-date');
        const endTimeInput = document.getElementById('time-off-end-time');

        if (startDateInput) startDateInput.value = dateStr;
        if (startTimeInput) startTimeInput.value = timeStr;
        if (endDateInput) endDateInput.value = dateStr;
        
        // Set end time to 1 hour after start time by default
        const endDate = new Date(date);
        endDate.setHours(date.getHours() + 1);
        if (endTimeInput) endTimeInput.value = Utils.formatTime(endDate.getHours(), endDate.getMinutes(), true);

        // Load staff members into dropdown
        StaffManager.loadStaffMembersForTimeOff();

        // Show the panel
        panel.classList.add('active');
    };

    // Submit time off to API
    const submitTimeOff = async (timeOffData) => {
        try {
            // Show spinner
            Utils.toggleSpinner(true);

            console.log('Creating time off with data:', timeOffData);

            // Use API client to create time off
            const response = await api.createTimeOff(timeOffData);

            if (!response?.success) {
                throw new Error(response?.message || 'Failed to create time off');
            }

            // Show success message
            Utils.showMessage('Time off scheduled successfully!', 'success');

            // Close the time off panel
            document.getElementById('time-off-panel').classList.remove('active');

            // Clear the form
            TimeOffManager.clearTimeOffForm();

            // Refresh the calendar to show the new time off
            await Calendar.renderCalendar(Calendar.getCurrentDate());

        } catch (error) {
            // Show error message
            Utils.showMessage(`Failed to create time off: ${error.message}`, 'error', 8000);
            console.error('Error creating time off:', error);
        } finally {
            // Hide spinner
            Utils.toggleSpinner(false);
        }
    };

    // Delete a time off
    const deleteTimeOff = async (timeOffId) => {
        try {
            // Show spinner
            Utils.toggleSpinner(true);

            console.log('Deleting time off with ID:', timeOffId);

            // Use API client to delete time off
            const response = await api.deleteTimeOff(timeOffId);

            if (!response?.success) {
                throw new Error(response?.message || 'Failed to delete time off');
            }

            // Show success message
            Utils.showMessage('Time off deleted successfully!', 'success');

            // Remove the time off event element from the calendar DOM
            const timeOffElement = document.querySelector(`.event[data-event-id="${timeOffId}"]`);
            if (timeOffElement) {
                timeOffElement.remove();
            }

        } catch (error) {
            // Show error message
            Utils.showMessage(`Failed to delete time off: ${error.message}`, 'error', 8000);
            console.error('Error deleting time off:', error);
        } finally {
            // Hide spinner
            Utils.toggleSpinner(false);
        }
    };

    return {
        fetchBookings,
        convertBookingsToEvents,
        getTimeOffs,
        fetchTimeOffs,
        convertTimeOffsToEvents,
        submitBooking,
        updateBooking,
        handleEditBooking,
        createNewBooking,
        deleteBooking,
        createTimeOff,
        submitTimeOff,
        deleteTimeOff,
        clearCache // Expose clearCache method for external calls
    };
})();
