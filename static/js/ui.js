// UI related functionality
const UI = (() => {
    // Initialize resizable panel functionality
    const initResizablePanel = () => {
        const panel = document.getElementById('booking-form-panel');
        if (!panel) return;

        let isResizing = false;
        let startX = 0;
        let startWidth = 0;

        // Create a resize handle element for better UX
        const resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        resizeHandle.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 10px;
            height: 100%;
            cursor: ew-resize;
            z-index: 10;
        `;
        panel.appendChild(resizeHandle);

        const startResize = (e) => {
            isResizing = true;
            startX = e.clientX;
            startWidth = panel.offsetWidth;
            panel.classList.add('resizing');
            document.body.style.cursor = 'ew-resize';
            document.body.style.userSelect = 'none';
            e.preventDefault();
        };

        const resize = (e) => {
            if (!isResizing) return;

            // Calculate new width (moving left increases width, moving right decreases)
            const deltaX = startX - e.clientX;
            const newWidth = startWidth + deltaX;

            // Constrain width between min and max
            const minWidth = 320;
            const maxWidth = window.innerWidth * 0.9;
            const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));

            panel.style.width = `${constrainedWidth}px`;
        };

        const stopResize = () => {
            if (!isResizing) return;
            isResizing = false;
            panel.classList.remove('resizing');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        // Add event listeners
        resizeHandle.addEventListener('mousedown', startResize);
        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', stopResize);

        // Also support touch events for mobile
        resizeHandle.addEventListener('touchstart', (e) => {
            startResize({
                clientX: e.touches[0].clientX,
                preventDefault: () => e.preventDefault()
            });
        });

        document.addEventListener('touchmove', (e) => {
            if (isResizing) {
                resize({ clientX: e.touches[0].clientX });
            }
        });

        document.addEventListener('touchend', stopResize);
    };

    // Navigate to a specific step in the booking form
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

    // Show slot action popup for creating bookings or time off
    const showSlotActionPopup = (date, x, y) => {
        const popup = document.getElementById('slot-action-popup');
        if (!popup) return;
        
        // Close any existing popup first
        popup.style.display = 'none';

        // Set the date and time in the popup title
        const timeElement = document.getElementById('slot-action-time');
        if (timeElement) {
            const formattedDate = date.toLocaleDateString('en-US', { 
                weekday: 'short', 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
            const formattedTime = Utils.formatTime(date.getHours(), date.getMinutes());
            timeElement.textContent = `${formattedDate} at ${formattedTime}`;
        }
        
        // Store the date in the popup data for later use
        popup.dataset.date = date.toISOString();
        
        // Account for scroll offset when positioning
        const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;

        // Position popup near the click location, accounting for scroll
        const popupX = x + scrollX;
        const popupY = y + scrollY;

        // Make popup position fixed so it stays in viewport
        popup.style.position = 'fixed';
        popup.style.left = `${x}px`;
        popup.style.top = `${y}px`;
        
        // Show the popup
        popup.style.display = 'block';
        
        // Set up event handlers for the buttons
        const addBookingBtn = document.getElementById('add-booking-btn');
        if (addBookingBtn) {
            // Remove existing listener to avoid duplicates
            const newBtn = addBookingBtn.cloneNode(true);
            addBookingBtn.parentNode.replaceChild(newBtn, addBookingBtn);
            
            // Add new listener
            newBtn.addEventListener('click', () => {
                BookingService.createNewBooking(date);
                popup.style.display = 'none';
            });
        }
        
        const addTimeOffBtn = document.getElementById('add-timeoff-btn');
        if (addTimeOffBtn) {
            // Remove existing listener to avoid duplicates
            const newBtn = addTimeOffBtn.cloneNode(true);
            addTimeOffBtn.parentNode.replaceChild(newBtn, addTimeOffBtn);
            
            // Add new listener
            newBtn.addEventListener('click', () => {
                BookingService.createTimeOff(date);
                popup.style.display = 'none';
            });
        }
        
        // Remove any existing click handlers first
        document.removeEventListener('click', window.currentClosePopupHandler);

        // Close popup when clicking outside
        const closePopupHandler = (e) => {
            if (!popup.contains(e.target) &&
                !e.target.closest('.time-quarter-slot') &&
                !e.target.closest('.slot')) {
                popup.style.display = 'none';
                document.removeEventListener('click', closePopupHandler);
                window.currentClosePopupHandler = null;
            }
        };

        // Store reference to current handler for cleanup
        window.currentClosePopupHandler = closePopupHandler;

        // Use setTimeout to prevent immediate closing
        setTimeout(() => {
            document.addEventListener('click', closePopupHandler);
        }, 10);
    };

    /**
     * Format date and time for display
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {string} Formatted date-time string
     */
    const formatEventDateTime = (startDate, endDate) => {
        const startDateStr = startDate.toLocaleDateString();
        const endDateStr = endDate.toLocaleDateString();
        const startTime = Utils.formatTime(startDate.getHours(), startDate.getMinutes());
        const endTime = Utils.formatTime(endDate.getHours(), endDate.getMinutes());

        if (startDateStr === endDateStr) {
            // Same day event
            return `${startDateStr}, ${startTime} - ${endTime}`;
        } else {
            // Multi-day event
            return `From ${startDateStr} ${startTime} to ${endDateStr} ${endTime}`;
        }
    };

    /**
     * Populate customer information in the popup
     * @param {Object} customer - Customer data object
     */
    const populateCustomerInfo = (customer) => {
        const elements = {
            name: document.querySelector('#event-popup-customer-name'),
            email: document.querySelector('#event-popup-customer-email'),
            phone: document.querySelector('#event-popup-customer-phone')
        };

        if (customer) {
            const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
            elements.name.textContent = fullName || 'Unknown';
            elements.email.textContent = customer.email || 'No email provided';
            elements.phone.textContent = customer.phone || 'No phone provided';
        } else {
            elements.name.textContent = 'No customer information';
            elements.email.textContent = '';
            elements.phone.textContent = '';
        }
    };

    /**
     * Find staff member by ID from window.staff_data
     * @param {string} staffId - Staff user ID
     * @returns {Object|null} Staff member object or null
     */
    const findStaffById = (staffId) => {
        if (!window.staff_data || !Array.isArray(window.staff_data)) {
            return null;
        }

        const staffMember = window.staff_data.find(staff =>
            staff.user && staff.user.id === staffId
        );

        return staffMember ? staffMember.user : null;
    };

    /**
     * Populate booked services with assigned staff information
     * @param {Array} bookingServices - Array of booking service objects
     */
    const populateServicesInfo = (bookingServices) => {
        const servicesList = document.getElementById('event-popup-services-list');

        if (!servicesList) return;

        // Clear existing content
        servicesList.innerHTML = '';

        if (!bookingServices || bookingServices.length === 0) {
            servicesList.innerHTML = '<div class="no-services-message">No services booked</div>';
            return;
        }

        // Create service items
        bookingServices.forEach(service => {
            const serviceItem = document.createElement('div');
            serviceItem.className = 'service-item-detail';

            // Service name/ID (we'll need to fetch actual service names from API or context)
            const serviceName = document.createElement('div');
            serviceName.className = 'service-item-name';
            serviceName.innerHTML = `<i class="fas fa-cut"></i> Service: ` + service.category_service.name + `, (` + service.category_service.duration + ` mins)`;
            serviceItem.appendChild(serviceName);

            // Find staff member information
            const staffMember = findStaffById(service.user_id);

            // Staff member assigned to this service
            const staffInfo = document.createElement('div');
            staffInfo.className = 'service-item-staff';

            if (staffMember) {
                const staffFullName = `${staffMember.first_name || ''} ${staffMember.last_name || ''}`.trim();
                staffInfo.innerHTML = `<i class="fas fa-user-tie"></i> Assigned to: <strong>${staffFullName}</strong>`;
            } else {
                staffInfo.innerHTML = `<i class="fas fa-user-tie"></i> Staff: <em>Not assigned</em>`;
            }

            serviceItem.appendChild(staffInfo);
            servicesList.appendChild(serviceItem);
        });
    };

    /**
     * Setup action buttons for the booking popup
     * @param {Object} event - Event data
     * @param {HTMLElement} popup - Popup element
     */
    const setupBookingPopupActions = (event, popup) => {
        // Setup confirm button
        const confirmButton = document.getElementById('event-popup-confirm');
        if (confirmButton) {
            if (event.status === 'scheduled') {
                confirmButton.style.display = 'block';
                const newConfirmButton = confirmButton.cloneNode(true);
                confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);

                newConfirmButton.addEventListener('click', () => {
                    showConfirmationPopup(
                        'Are you sure you want to mark this booking as confirmed?',
                        async () => {
                            try {
                                // Show spinner
                                const spinner = document.getElementById('booking-spinner');
                                if (spinner) {
                                    spinner.style.display = 'flex';
                                }

                                const response = await api.confirmBooking(event.id);

                                // Check if response status is confirmed
                                if (response && response.success === true && response.data.status === 'confirmed') {
                                    // Find and update the booking event element in the calendar
                                    const bookingElement = document.querySelector(`[data-event-id="${event.id}"].event`);
                                    if (bookingElement) {
                                        // Remove the old status class and add the new one
                                        bookingElement.classList.remove('status-scheduled');
                                        bookingElement.classList.add('status-confirmed');

                                        // Update the status badge text
                                        const statusBadge = bookingElement.querySelector('.event-status-badge');
                                        if (statusBadge) {
                                            statusBadge.textContent = 'confirmed';
                                        }

                                        const completedButton = document.querySelector(`[data-event-id="${event.id}"].event-popup`).querySelector(`.event-popup-completed-btn`);
                                        completedButton.style.display = 'block';
                                    }

                                    // Update the event object status
                                    event.status = 'confirmed';
                                }

                                popup.style.display = 'none';
                            } catch (error) {
                                console.error('Error confirming booking:', error);
                                UI.showMessage('Failed to confirm booking', 'error');
                            } finally {
                                // Hide spinner
                                const spinner = document.getElementById('booking-spinner');
                                if (spinner) {
                                    spinner.style.display = 'none';
                                }
                            }
                        }
                    );
                });
            } else {
                confirmButton.style.display = 'none';
            }
        }

        // Setup completed button
        const completedButton = document.getElementById('event-popup-completed');
        if (completedButton) {
            if (event.status === 'confirmed') {
                completedButton.style.display = 'block';
            }
            const newCompletedButton = completedButton.cloneNode(true);
            completedButton.parentNode.replaceChild(newCompletedButton, completedButton);

            newCompletedButton.addEventListener('click', () => {
                showConfirmationPopup(
                    'Are you sure you want to mark this booking as completed?',
                    async () => {
                        try {
                            // Show spinner
                            const spinner = document.getElementById('booking-spinner');
                            if (spinner) {
                                spinner.style.display = 'flex';
                            }

                            const response = await api.completeBooking(event.id);

                            // Check if response status is completed
                            if (response && response.success === true && response.data.status === 'completed') {
                                // Find and update the booking event element in the calendar
                                const bookingElement = document.querySelector(`[data-event-id="${event.id}"].event`);
                                if (bookingElement) {
                                    // Remove the old status class and add the new one
                                    bookingElement.classList.remove('status-confirmed');
                                    bookingElement.classList.add('status-completed');

                                    // Update the status badge text
                                    const statusBadge = bookingElement.querySelector('.event-status-badge');
                                    if (statusBadge) {
                                        statusBadge.textContent = 'completed';
                                    }
                                }

                                // Update the event object status
                                event.status = 'completed';

                            }

                            popup.style.display = 'none';
                        } catch (error) {
                            console.error('Error completing booking:', error);
                            UI.showMessage('Failed to mark booking as completed', 'error');
                        } finally {
                            // Hide spinner
                            const spinner = document.getElementById('booking-spinner');
                            if (spinner) {
                                spinner.style.display = 'none';
                            }
                        }
                    }
                );
            });
        } else {
            completedButton.style.display = 'none';
        }


        // Setup edit button
        const editButton = document.getElementById('event-popup-edit');
        if (editButton) {
            const newEditButton = editButton.cloneNode(true);
            editButton.parentNode.replaceChild(newEditButton, editButton);

            newEditButton.addEventListener('click', () => {
                BookingService.handleEditBooking(event.id);
                popup.style.display = 'none';
            });
        }

        // Setup delete button
        const deleteButton = document.getElementById('event-popup-delete');
        if (deleteButton) {
            const newDeleteButton = deleteButton.cloneNode(true);
            deleteButton.parentNode.replaceChild(newDeleteButton, deleteButton);

            newDeleteButton.addEventListener('click', () => {
                const customerName = event.customer
                    ? `${event.customer.first_name || 'unknown'} ${event.customer.last_name || 'customer'}`
                    : 'unknown customer';

                showConfirmationPopup(
                    `Are you sure you want to delete this booking for ${customerName}?`,
                    async () => {
                            try {
                                // Show spinner
                                const spinner = document.getElementById('booking-spinner');
                                if (spinner) {
                                    spinner.style.display = 'flex';
                                }

                                const response = await api.deleteBooking(event.id);

                                // Check if response status is cancelled
                                if (response && response.success === true && response.data.status === 'cancelled') {
                                    // Find and remove the booking event element from the calendar
                                    const bookingElement = document.querySelector(`[data-event-id="${event.id}"].event`);
                                    if (bookingElement) {
                                        // Remove the element from the DOM
                                        bookingElement.remove();
                                    }

                                    // Update the event object status
                                    event.status = 'cancelled';

                                }

                                popup.style.display = 'none';
                            } catch (error) {
                                console.error('Error deleting booking:', error);
                                UI.showMessage('Failed to delete booking', 'error');
                            } finally {
                                // Hide spinner
                                const spinner = document.getElementById('booking-spinner');
                                if (spinner) {
                                    spinner.style.display = 'none';
                                }
                            }
                        }
                );
            });
        }

        // Setup close button
        const closeButton = popup.querySelector('.event-popup-close');
        if (closeButton) {
            const newCloseButton = closeButton.cloneNode(true);
            closeButton.parentNode.replaceChild(newCloseButton, closeButton);

            newCloseButton.addEventListener('click', () => {
                popup.style.display = 'none';
            });
        }
    };

    /**
     * Show booking details popup - Main refactored function
     * @param {Object} event - Event data object
     * @param {number} x - X coordinate for positioning
     * @param {number} y - Y coordinate for positioning
     */
    const showBookingDetails = (event, x, y) => {
        const popup = document.getElementById('event-popup');
        if (!popup) return;

        // Store event data
        popup.dataset.eventId = event.id || '';
        popup.dataset.bookingData = JSON.stringify(event);

        // Format and display time
        const timeDisplay = formatEventDateTime(event.start, event.end);
        document.querySelector('#event-popup-time-value').textContent = timeDisplay;

        // Display status
        const statusElement = document.querySelector('#event-popup-status-value');
        const statusText = event.status.charAt(0).toUpperCase() + event.status.slice(1);
        statusElement.textContent = statusText;
        statusElement.className = `status-${event.status}`;

        // Display price
        const priceText = event.totalPrice ? `$${event.totalPrice}` : 'Not specified';
        document.querySelector('#event-popup-price-value').textContent = priceText;

        // Populate customer information
        populateCustomerInfo(event.customer);

        // Display notes
        const notesText = event.description || 'No notes';
        document.querySelector('#event-popup-notes-value').textContent = notesText;

        // Populate and display booked services with assigned staff
        populateServicesInfo(event.bookingServices);

        // Setup action buttons
        setupBookingPopupActions(event, popup);

        // Position and show popup
        positionPopup(popup, x, y);
        popup.style.display = 'block';

        // Close popup when clicking outside
        setTimeout(() => {
            const closeHandler = (e) => {
                if (!popup.contains(e.target) && !e.target.closest('.event')) {
                    popup.style.display = 'none';
                    document.removeEventListener('click', closeHandler);
                }
            };
            document.addEventListener('click', closeHandler);
        }, 10);
    };

    // Show event popup with details - checks if this is a regular booking or a time off event
    const showEventPopup = (event, x, y) => {
        // Check if this is a time off event
        if (event.isTimeOff) {
            showTimeOffPopup(event, x, y);
            return;
        }

        // Show booking details
        showBookingDetails(event, x, y);
    };

    /**
     * Populate staff information in time off popup
     * @param {Object} user - Staff user data
     */
    const populateStaffInfo = (user) => {
        const elements = {
            name: document.querySelector('#time-off-popup-staff-name'),
            email: document.querySelector('#time-off-popup-staff-email'),
            phone: document.querySelector('#time-off-popup-staff-phone')
        };

        if (user) {
            const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
            elements.name.textContent = fullName || 'Unknown';
            elements.email.textContent = user.email || 'No email provided';
            elements.phone.textContent = user.phone || 'No phone provided';
        } else {
            elements.name.textContent = 'Unknown staff member';
            elements.email.textContent = '';
            elements.phone.textContent = '';
        }
    };

    // Show time off popup with details
    const showTimeOffPopup = (event, x, y) => {
        const popup = document.getElementById('time-off-popup');
        if (!popup) return;

        // Format and display time
        const timeDisplay = formatEventDateTime(event.start, event.end);
        document.querySelector('#time-off-popup-time-value').textContent = timeDisplay;

        // Populate staff information
        populateStaffInfo(event.user);

        // Display reason
        const reasonText = event.description || 'No reason provided';
        document.querySelector('#time-off-popup-reason-value').textContent = reasonText;

        // Position and show popup
        positionPopup(popup, x, y);
        popup.style.display = 'block';

        // Setup close button
        const closeButton = popup.querySelector('.event-popup-close');
        if (closeButton) {
            const newCloseButton = closeButton.cloneNode(true);
            closeButton.parentNode.replaceChild(newCloseButton, closeButton);

            newCloseButton.addEventListener('click', () => {
                popup.style.display = 'none';
            });
        }

        // Close popup when clicking outside
        setTimeout(() => {
            const closeHandler = (e) => {
                if (!popup.contains(e.target) && !e.target.closest('.event')) {
                    popup.style.display = 'none';
                    document.removeEventListener('click', closeHandler);
                }
            };
            document.addEventListener('click', closeHandler);
        }, 10);
    };

    // Position a popup so it's visible in the viewport
    const positionPopup = (popup, x, y) => {
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
    };

    // Setup booking form navigation
    const setupBookingFormNavigation = () => {
        // Setup close button for booking form
        const closeButton = document.querySelector('#booking-form-panel .close-panel-btn');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                document.getElementById('booking-form-panel').classList.remove('active');
            });
        }
    };

    // Show a custom confirmation popup
    const showConfirmationPopup = (message, onConfirm) => {
        const popup = document.getElementById('confirmation-popup');
        const messageElement = document.getElementById('confirmation-message');

        // Set the confirmation message
        messageElement.textContent = message;

        // Show the popup
        popup.style.display = 'block';

        // Setup confirm button
        const confirmButton = document.getElementById('confirmation-confirm-btn');
        const newConfirmButton = confirmButton.cloneNode(true);
        confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);

        newConfirmButton.addEventListener('click', () => {
            onConfirm();
            popup.style.display = 'none';
        });

        // Setup cancel button
        const cancelButton = document.getElementById('confirmation-cancel-btn');
        const newCancelButton = cancelButton.cloneNode(true);
        cancelButton.parentNode.replaceChild(newCancelButton, cancelButton);

        newCancelButton.addEventListener('click', () => {
            popup.style.display = 'none';
        });

        // Setup close button
        const closeButton = popup.querySelector('.confirmation-popup-close');
        const newCloseButton = closeButton.cloneNode(true);
        closeButton.parentNode.replaceChild(newCloseButton, closeButton);

        newCloseButton.addEventListener('click', () => {
            popup.style.display = 'none';
        });
    };

    // Show a message to the user
    const showMessage = (message, type, duration = 5000) => {
        const messageBox = document.getElementById('booking-message');
        if (!messageBox) return;

        // Set message content and style
        messageBox.textContent = message;
        messageBox.className = ''; // Clear existing classes
        messageBox.classList.add(type === 'error' ? 'error-message' : 'success-message');
        messageBox.style.display = 'block';

        // Auto-hide after duration
        setTimeout(() => {
            messageBox.style.display = 'none';
        }, duration);
    };

    return {
        goToStep,
        showEventPopup,
        showTimeOffPopup,
        showSlotActionPopup,
        showConfirmationPopup,
        setupBookingFormNavigation,
        showMessage,
        initResizablePanel
    };
})();

// Export the UI module
window.UI = UI;

// Initialize UI components
document.addEventListener('DOMContentLoaded', () => {
    UI.initResizablePanel();
});
