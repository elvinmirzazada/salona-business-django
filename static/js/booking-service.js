// Booking service - handles all booking related operations
const BookingService = (() => {
    // Fetch bookings from API with date range parameters
    const fetchBookings = async (startDate, endDate, staffIds = null) => {
        try {
            // Format dates for API request
            const formattedStartDate = Utils.formatDate(startDate);
            const formattedEndDate = Utils.formatDate(endDate);

            console.log(`Fetching bookings from ${formattedStartDate} to ${formattedEndDate}`);

            // Build query parameters
            const queryParams = new URLSearchParams({
                start_date: formattedStartDate,
                end_date: formattedEndDate
            });

            // Add staff filter if provided
            if (staffIds && staffIds.length) {
                staffIds.forEach(id => queryParams.append('staff_id', id));
            }

            const response = await fetch(`http://127.0.0.1:8000/api/v1/bookings?${queryParams.toString()}`, {
                method: 'GET',
                headers: Auth.getAuthHeader(),
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

    // Fetch time offs from API with date range parameters
    const fetchTimeOffs = async (startDate, endDate) => {
        try {
            // Format dates for API request - get start date as 3 days before the first day in calendar
            const calendarStartDate = new Date(startDate);
            const timeOffStartDate = new Date(calendarStartDate);

            const formattedStartDate = Utils.formatDate(timeOffStartDate);
            const formattedEndDate = Utils.formatDate(endDate);

            console.log(`Fetching time offs from ${formattedStartDate} to ${formattedEndDate}`);

            // Build query parameters
            const queryParams = new URLSearchParams({
                start_date: formattedStartDate,
                availability_type: 'weekly'
            }).toString();

            const response = await fetch(`http://127.0.0.1:8000/api/v1/users/time-offs?${queryParams}`, {
                method: 'GET',
                headers: Auth.getAuthHeader(),
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
            const serviceSelect = document.getElementById('booking-service');
            const workerId = document.getElementById('booking-worker').value;
            const customerType = document.getElementById('booking-customer').value;
            const description = document.getElementById('booking-description').value;

            // Format the start and end times in ISO format
            const startAt = `${startDate}T${startTime}:00Z`;
            const endAt = `${endDate}T${endTime}:00Z`;

            // Get selected services
            const selectedServices = Array.from(serviceSelect.selectedOptions);

            if (selectedServices.length === 0) {
                alert('Please select at least one service');
                UI.goToStep(1); // Go back to service selection
                return;
            }

            if (!workerId) {
                alert('Please select a staff member');
                return;
            }

            // Create booking data object with the new structure
            let bookingData = {
                start_time: startAt,
                end_time: endAt,  // Include end time in the booking data
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
                headers: Auth.getAuthHeader(),
                body: JSON.stringify(bookingData),
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Failed to create booking: ${response.status}`);
            }

            // Show success message
            Utils.showMessage('Booking created successfully!', 'success');

            // Close the form panel
            document.getElementById('booking-form-panel').classList.remove('active');

            // Refresh the calendar to show the new booking
            await Calendar.renderCalendar(Calendar.getCurrentDate());

        } catch (error) {
            // Show error message
            Utils.showMessage(`Failed to create booking: ${error.message}`, 'error', 8000);
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
            const serviceSelect = document.getElementById('booking-service');
            const workerId = document.getElementById('booking-worker').value;
            const customerType = document.getElementById('booking-customer').value;
            const description = document.getElementById('booking-description').value;

            // Format the start and end times in ISO format
            const startAt = `${startDate}T${startTime}:00Z`;
            const endAt = `${endDate}T${endTime}:00Z`;

            // Get selected services
            const selectedServices = Array.from(serviceSelect.selectedOptions);

            if (selectedServices.length === 0) {
                alert('Please select at least one service');
                UI.goToStep(1); // Go back to service selection
                return;
            }

            if (!workerId) {
                alert('Please select a staff member');
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

            console.log('Updating booking with data:', bookingData);

            // Send the booking update data to the API
            const response = await fetch(`http://127.0.0.1:8000/api/v1/bookings/${bookingId}`, {
                method: 'PUT',
                headers: Auth.getAuthHeader(),
                body: JSON.stringify(bookingData),
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Failed to update booking: ${response.status}`);
            }

            // Show success message
            Utils.showMessage('Booking updated successfully!', 'success');

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
            
            // Fetch booking details from API
            const response = await fetch(`http://127.0.0.1:8000/api/v1/bookings/${bookingId}`, {
                method: 'GET',
                headers: Auth.getAuthHeader(),
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Failed to fetch booking details: ${response.status}` }));
                throw new Error(errorData.message || `Failed to fetch booking details: ${response.status}`);
            }

            const data = await response.json();
            const booking = data.data;
            
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
            // After services are loaded, select the ones from the booking
            if (bookingServices.length > 0) {
                const serviceSelect = document.getElementById('booking-service');
                
                // Clear any existing selections
                Array.from(serviceSelect.options).forEach(option => {
                    option.selected = false;
                });
                
                // Select the services from booking_services
                bookingServices.forEach(bookingService => {
                    const option = Array.from(serviceSelect.options).find(opt =>
                        opt.value === bookingService.category_service_id);

                    if (option) {
                        option.selected = true;
                        
                        // Also check the visible checkbox
                        const checkbox = document.getElementById(`service-${bookingService.category_service_id}`);
                        if (checkbox) checkbox.checked = true;
                    }
                });
                
                // Update selected services summary
                ServiceManager.updateSelectedServicesSummary();
            }
        });
        
        // Fetch and populate staff members, then select the current one using staffId from booking_services
        StaffManager.loadStaffMembers().then(() => {
            const workerDropdown = document.getElementById('booking-worker');
            
            if (staffId) {
                // Select the worker in the dropdown
                Array.from(workerDropdown.options).forEach(option => {
                    if (option.value === staffId) {
                        option.selected = true;
                    }
                });
            }
        });
        
        // Fetch and populate customers, then select the current one
        CustomerManager.loadCustomers().then(() => {
            const customerDropdown = document.getElementById('booking-customer');
            const newCustomerFields = document.getElementById('new-customer-fields');
            
            if (booking.customer && booking.customer.id) {
                // Select the customer in the dropdown
                Array.from(customerDropdown.options).forEach(option => {
                    if (option.value === booking.customer.id) {
                        option.selected = true;
                    }
                });
                
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
        
        // Calculate default end time (1 hour after start)
        const endDate = new Date(date);
        endDate.setHours(endDate.getHours() + 1);
        document.getElementById('booking-end-time').value = Utils.formatTime(endDate.getHours(), endDate.getMinutes());
        
        // Load services for the booking form
        ServiceManager.loadServices();

        // Load staff members
        StaffManager.loadStaffMembers();

        // Load customers
        CustomerManager.loadCustomers();

        // Show the form panel
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
    
    // Delete a booking
    const deleteBooking = async (bookingId) => {
        try {
            // Show spinner during deletion
            Utils.toggleSpinner(true);
            
            // Clear message
            const messageBox = document.getElementById('booking-message');
            if (messageBox) messageBox.style.display = 'none';

            // Use the DELETE API endpoint
            const response = await fetch(`http://127.0.0.1:8000/api/v1/bookings/${bookingId}`, {
                method: 'DELETE',
                headers: Auth.getAuthHeader(),
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Failed to delete booking: ${response.status}` }));
                throw new Error(errorData.message || `Failed to delete booking: ${response.status}`);
            }

            // Show success message
            Utils.showMessage('Booking deleted successfully!', 'success');

            // Refresh the calendar to show the updated bookings
            await Calendar.renderCalendar(Calendar.getCurrentDate());

        } catch (error) {
            // Show error message
            Utils.showMessage(error.message, 'error', 8000);
            console.error('Error deleting booking:', error);
        } finally {
            // Hide spinner
            Utils.toggleSpinner(false);
        }
    };
    
    // Create time off for staff member
    const createTimeOff = (date) => {
        const timeOffPanel = document.getElementById('time-off-panel');
        
        // Reset form
        document.getElementById('time-off-form').reset();
        
        // Format the date string
        const formattedDate = Utils.formatDate(date);

        // Set the selected date for both start and end date
        document.getElementById('time-off-start-date').value = formattedDate;
        document.getElementById('time-off-end-date').value = formattedDate;

        // Set the selected time
        document.getElementById('time-off-start-time').value = Utils.formatTime(date.getHours(), date.getMinutes());
        
        // Calculate default end time (1 hour after start)
        const endDate = new Date(date);
        endDate.setHours(endDate.getHours() + 1);
        document.getElementById('time-off-end-time').value = Utils.formatTime(endDate.getHours(), endDate.getMinutes());
        
        // Load staff members
        StaffManager.loadStaffMembers('time-off-staff');

        // Show the form panel
        timeOffPanel.classList.add('active');
    };

    // Submit time off to API
    const submitTimeOff = async (timeOffData) => {
        try {
            // Show spinner
            Utils.toggleSpinner(true);
            
            // Format the data according to API requirements
            const formattedData = {
                start_date: timeOffData.start_time,
                end_date: timeOffData.end_time,
                user_id: timeOffData.user_id,
                reason: timeOffData.reason
            };

            console.log('Creating time off with data:', formattedData);

            // Send the time off data to the correct API endpoint
            const response = await fetch('http://127.0.0.1:8000/api/v1/users/time-offs', {
                method: 'POST',
                headers: Auth.getAuthHeader(),
                body: JSON.stringify(formattedData),
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Failed to create time off: ${response.status}`);
            }

            // Show success message
            Utils.showMessage('Time off created successfully!', 'success');

            // Close the form panel
            document.getElementById('time-off-panel').classList.remove('active');

            // Refresh the calendar to show the new time off period
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

    // Confirm a booking (change status from scheduled to confirmed)
    const confirmBooking = async (bookingId) => {
        try {
            // Show spinner during confirmation
            Utils.toggleSpinner(true);

            // Clear message
            const messageBox = document.getElementById('booking-message');
            if (messageBox) messageBox.style.display = 'none';

            // Prepare the update data - only changing the status
            const updateData = {
                status: 'confirmed'
            };

            // Send the update to the API
            const response = await fetch(`http://127.0.0.1:8000/api/v1/bookings/${bookingId}/confirm`, {
                method: 'PUT',
                headers: Auth.getAuthHeader(),
                body: JSON.stringify(updateData),
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Failed to confirm booking: ${response.status}` }));
                throw new Error(errorData.message || `Failed to confirm booking: ${response.status}`);
            }

            // Show success message
            Utils.showMessage('Booking confirmed successfully!', 'success');

            // Refresh the calendar to show the updated booking
            await Calendar.renderCalendar(Calendar.getCurrentDate());

        } catch (error) {
            // Show error message
            Utils.showMessage(error.message, 'error', 8000);
            console.error('Error confirming booking:', error);
        } finally {
            // Hide spinner
            Utils.toggleSpinner(false);
        }
    };

    return {
        fetchBookings,
        convertBookingsToEvents,
        handleEditBooking,
        createNewBooking,
        createTimeOff,
        deleteBooking,
        submitBooking,
        updateBooking,
        submitTimeOff,
        fetchTimeOffs,
        convertTimeOffsToEvents,
        confirmBooking
    };
})();

// Export the BookingService module
window.BookingService = BookingService;
