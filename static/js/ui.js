// UI related functionality
const UI = (() => {
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
        
        // Position popup near the click location
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
        
        // Close popup when clicking outside
        const closePopupHandler = (e) => {
            if (!popup.contains(e.target) && e.target.closest('.slot') === null) {
                popup.style.display = 'none';
                document.removeEventListener('click', closePopupHandler);
            }
        };
        
        // Use setTimeout to prevent immediate closing
        setTimeout(() => {
            document.addEventListener('click', closePopupHandler);
        }, 10);
    };

    // Show event popup with details - checks if this is a regular booking or a time off event
    const showEventPopup = (event, x, y) => {
        // Check if this is a time off event
        if (event.isTimeOff) {
            showTimeOffPopup(event, x, y);
            return;
        }

        const popup = document.getElementById('event-popup');

        // Store the current event data for editing
        popup.dataset.eventId = event.id || '';
        popup.dataset.bookingData = JSON.stringify(event);

        // Format the date and time display
        const startDate = event.start.toLocaleDateString();
        const endDate = event.end.toLocaleDateString();
        const startTime = Utils.formatTime(event.start.getHours(), event.start.getMinutes());
        const endTime = Utils.formatTime(event.end.getHours(), event.end.getMinutes());

        // Create a better formatted date-time display
        let timeDisplay;
        if (startDate === endDate) {
            // Same day event - just show the date once with time range
            timeDisplay = `${startDate}, ${startTime} - ${endTime}`;
        } else {
            // Multi-day event - show full range
            timeDisplay = `From ${startDate} ${startTime} to ${endDate} ${endTime}`;
        }

        // Set popup content
        document.querySelector('#event-popup-time-value').textContent = timeDisplay;

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

        // Show or hide confirm button based on booking status
        const confirmButton = document.getElementById('event-popup-confirm');
        if (confirmButton) {
            // Only show the confirm button for bookings with "scheduled" status
            if (event.status === 'scheduled') {
                confirmButton.style.display = 'block';

                // Remove any existing event listeners to avoid duplicates
                const newConfirmButton = confirmButton.cloneNode(true);
                confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);

                // Add click handler to confirm button
                newConfirmButton.addEventListener('click', () => {
                    // Show confirmation popup for confirming the booking
                    showConfirmationPopup(
                        `Are you sure you want to mark this booking as confirmed?`,
                        () => {
                            // Call the API to update the booking status to confirmed
                            BookingService.confirmBooking(event.id);
                            popup.style.display = 'none'; // Hide popup after confirming
                        }
                    );
                });
            } else {
                confirmButton.style.display = 'none';
            }
        }

        // Position popup near the click but ensure it stays in viewport
        positionPopup(popup, x, y);

        // Show popup
        popup.style.display = 'block';

        // Add click handler to edit button
        const editButton = document.getElementById('event-popup-edit');
        if (editButton) {
            // Remove any existing event listeners to avoid duplicates
            const newEditButton = editButton.cloneNode(true);
            editButton.parentNode.replaceChild(newEditButton, editButton);

            newEditButton.addEventListener('click', () => {
                BookingService.handleEditBooking(event.id);
                popup.style.display = 'none'; // Hide popup after clicking edit
            });
        }

        // Add click handler to delete button
        const deleteButton = document.getElementById('event-popup-delete');
        if (deleteButton) {
            // Remove any existing event listeners to avoid duplicates
            const newDeleteButton = deleteButton.cloneNode(true);
            deleteButton.parentNode.replaceChild(newDeleteButton, deleteButton);

            newDeleteButton.addEventListener('click', () => {
                // Show the custom confirmation popup instead of the browser confirm
                showConfirmationPopup(
                    `Are you sure you want to delete this booking for ${event.customer?.first_name || 'unknown'} ${event.customer?.last_name || 'customer'}?`,
                    () => {
                        // Confirmed action - delete the booking
                        BookingService.deleteBooking(event.id);
                        popup.style.display = 'none'; // Hide popup after confirming delete
                    }
                );
            });
        }

        // Add click handler to close button
        const closeButton = popup.querySelector('.event-popup-close');
        if (closeButton) {
            // Remove any existing event listeners to avoid duplicates
            const newCloseButton = closeButton.cloneNode(true);
            closeButton.parentNode.replaceChild(newCloseButton, closeButton);

            newCloseButton.addEventListener('click', () => {
                popup.style.display = 'none';
            });
        }

        // Close popup when clicking outside
        document.addEventListener('click', function closePopupHandler(e) {
            if (!popup.contains(e.target) && e.target.closest('.event') === null) {
                popup.style.display = 'none';
                document.removeEventListener('click', closePopupHandler);
            }
        });
    };

    // Show time off popup with details
    const showTimeOffPopup = (event, x, y) => {
        const popup = document.getElementById('time-off-popup');

        // Format the date and time display
        const startDate = event.start.toLocaleDateString();
        const endDate = event.end.toLocaleDateString();
        const startTime = Utils.formatTime(event.start.getHours(), event.start.getMinutes());
        const endTime = Utils.formatTime(event.end.getHours(), event.end.getMinutes());

        // Create a better formatted date-time display
        let timeDisplay;
        if (startDate === endDate) {
            // Same day event - just show the date once with time range
            timeDisplay = `${startDate}, ${startTime} - ${endTime}`;
        } else {
            // Multi-day event - show full range
            timeDisplay = `From ${startDate} ${startTime} to ${endDate} ${endTime}`;
        }

        // Set popup content
        document.querySelector('#time-off-popup-time-value').textContent = timeDisplay;

        // Set staff information if available
        if (event.user) {
            // Set staff name
            document.querySelector('#time-off-popup-staff-name').textContent =
                `${event.user.first_name || ''} ${event.user.last_name || ''}`.trim() || 'Unknown';

            // Set staff email
            document.querySelector('#time-off-popup-staff-email').textContent =
                event.user.email || 'No email provided';

            // Set staff phone
            document.querySelector('#time-off-popup-staff-phone').textContent =
                event.user.phone || 'No phone provided';
        } else {
            // If no staff info is available
            document.querySelector('#time-off-popup-staff-name').textContent = 'Unknown staff member';
            document.querySelector('#time-off-popup-staff-email').textContent = '';
            document.querySelector('#time-off-popup-staff-phone').textContent = '';
        }

        // Set reason
        document.querySelector('#time-off-popup-reason-value').textContent =
            event.description || 'No reason provided';

        // Position popup near the click but ensure it stays in viewport
        positionPopup(popup, x, y);

        // Show popup
        popup.style.display = 'block';

        // Add click handler to close button
        const closeButton = popup.querySelector('.event-popup-close');
        if (closeButton) {
            // Remove any existing event listeners to avoid duplicates
            const newCloseButton = closeButton.cloneNode(true);
            closeButton.parentNode.replaceChild(newCloseButton, closeButton);

            newCloseButton.addEventListener('click', () => {
                popup.style.display = 'none';
            });
        }

        // Close popup when clicking outside
        document.addEventListener('click', function closePopupHandler(e) {
            if (!popup.contains(e.target) && e.target.closest('.event') === null) {
                popup.style.display = 'none';
                document.removeEventListener('click', closePopupHandler);
            }
        });
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
        showMessage
    };
})();

// Export the UI module
window.UI = UI;
