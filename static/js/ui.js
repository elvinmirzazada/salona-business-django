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

    // Show event popup with details
    const showEventPopup = (event, x, y) => {
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
                        popup.style.display = 'none'; // Hide popup after clicking delete
                    }
                );
            });
        }

        // Add click handler to close button
        const closeButton = popup.querySelector('.event-popup-close');
        const closePopup = () => {
            popup.style.display = 'none';
            closeButton.removeEventListener('click', closePopup);
            document.removeEventListener('click', documentClickHandler);

            // Remove event handlers to prevent memory leaks
            if (editButton) {
                editButton.replaceWith(editButton.cloneNode(true));
            }
            if (deleteButton) {
                deleteButton.replaceWith(deleteButton.cloneNode(true));
            }
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

    // Show custom confirmation popup
    const showConfirmationPopup = (message, confirmCallback) => {
        const popup = document.getElementById('confirmation-popup');
        const messageElement = document.getElementById('confirmation-message');

        // Set the message
        messageElement.textContent = message;

        // Show the popup with flex display to center content
        popup.style.display = 'flex';
        document.body.classList.add('modal-open');

        // Set up the confirm button
        const confirmBtn = document.getElementById('confirmation-confirm-btn');
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

        newConfirmBtn.addEventListener('click', () => {
            // Execute the callback and close the popup
            confirmCallback();
            closeConfirmationPopup();
        });

        // Set up the cancel button
        const cancelBtn = document.getElementById('confirmation-cancel-btn');
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

        newCancelBtn.addEventListener('click', closeConfirmationPopup);

        // Set up the close button
        const closeBtn = popup.querySelector('.confirmation-popup-close');
        const newCloseBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);

        newCloseBtn.addEventListener('click', closeConfirmationPopup);

        // Close popup function
        function closeConfirmationPopup() {
            popup.style.display = 'none';
            document.body.classList.remove('modal-open');
        }

        // Close when clicking outside the popup content
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                closeConfirmationPopup();
            }
        });

        // Close on escape key
        document.addEventListener('keydown', escapeHandler);

        function escapeHandler(e) {
            if (e.key === 'Escape') {
                closeConfirmationPopup();
                document.removeEventListener('keydown', escapeHandler);
            }
        }
    };

    // Setup close button for the booking form panel
    const setupPanelCloseButton = () => {
        const closeBtn = document.querySelector('.booking-form-panel .close-panel-btn');
        const formPanel = document.getElementById('booking-form-panel');

        if (closeBtn && formPanel) {
            closeBtn.addEventListener('click', () => {
                formPanel.classList.remove('active');
                // Reset form to create mode for next time
                formPanel.dataset.mode = 'create';
                formPanel.querySelector('.booking-form-header h3').textContent = 'Add New Booking';
                document.getElementById('booking-submit-btn').textContent = 'Create Booking';
            });
        }
    };

    // Set up form step navigation
    const setupBookingFormNavigation = () => {
        // Step tabs click event
        document.querySelectorAll('.booking-step').forEach(tab => {
            tab.addEventListener('click', function() {
                const step = parseInt(this.dataset.step);
                goToStep(step);
            });
        });

        // Next step buttons
        document.querySelectorAll('.next-step-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const currentStep = parseInt(this.closest('.booking-step-content').dataset.step);
                goToStep(currentStep + 1);
            });
        });

        // Back step buttons
        document.querySelectorAll('.prev-step-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const currentStep = parseInt(this.closest('.booking-step-content').dataset.step);
                goToStep(currentStep - 1);
            });
        });

        // Set up the close button
        setupPanelCloseButton();

        // Add event listeners for the step navigation buttons
        const step1Next = document.getElementById('step-1-next');
        if (step1Next) {
            step1Next.addEventListener('click', () => goToStep(2));
        }

        const step2Back = document.getElementById('step-2-back');
        if (step2Back) {
            step2Back.addEventListener('click', () => goToStep(1));
        }
    };

    return {
        goToStep,
        showSlotActionPopup,
        showEventPopup,
        showConfirmationPopup,
        setupBookingFormNavigation,
        setupPanelCloseButton
    };
})();

// Export the UI module
window.UI = UI;
