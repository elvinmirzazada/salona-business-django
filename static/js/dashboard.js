// Main dashboard initialization and coordination
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated before proceeding
    const accessToken = localStorage.getItem('accessToken');

    if (!accessToken) {
        // Redirect to login if not authenticated
        window.location.href = '/users/login/';
        return;
    }

    // Initialize all modules
    const initDashboard = async () => {
        try {
            // Initialize authentication
            await Auth.init();

            // Initialize UI components
            UI.setupBookingFormNavigation();

            // Set up customer dropdown change event
            CustomerManager.setupCustomerChangeEvent();

            // Initialize booking form submission
            setupBookingFormSubmission();

            // Initialize the calendar
            await Calendar.init();

            console.log('Dashboard initialization completed successfully');
        } catch (error) {
            console.error('Error initializing dashboard:', error);
        }
    };

    // Setup booking form submission
    const setupBookingFormSubmission = () => {
        const bookingForm = document.getElementById('booking-form');
        if (bookingForm) {
            bookingForm.addEventListener('submit', function(e) {
                e.preventDefault();
                const formPanel = document.getElementById('booking-form-panel');

                // Check if we're in edit mode or create mode
                if (formPanel.dataset.mode === 'edit') {
                    const bookingId = formPanel.dataset.bookingId;
                    BookingService.updateBooking(bookingId);
                } else {
                    BookingService.submitBooking();
                }
            });
        }
    };

    // Initialize dashboard
    initDashboard();
});
