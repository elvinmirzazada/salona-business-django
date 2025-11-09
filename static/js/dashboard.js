// Main dashboard initialization and coordination
document.addEventListener('DOMContentLoaded', function() {

    // Authentication check is now handled by Auth.init() which uses API calls
    // instead of localStorage checks

    // Initialize all modules
    const initDashboard = async () => {
        try {
            // No need to initialize Auth.init() here as it's already called globally
            // and we rely on server-side authentication

            // Initialize UI components
            UI.setupBookingFormNavigation();

            // Initialize live notifications WebSocket
            // setupLiveNotifications();

            // Check if user has company data from the user data passed from Django
            // The userData is already available from the template context
            const hasUserData = window.userData && typeof window.userData === 'object';

            if (!hasUserData) {
                // If user data is null, hide calendar elements and show company creation button
                toggleDashboardView(false);
            } else {
                // User has data, proceed with normal dashboard initialization
                toggleDashboardView(true);

                // Set up customer dropdown change event
                CustomerManager.setupCustomerChangeEvent();

                // Initialize booking form submission
                setupBookingFormSubmission();

                // Initialize time off functionality
                // TimeOffManager.initTimeOffForm();

                // Initialize the calendar
                await Calendar.init();

            }

            // Ensure NotificationManager updates icon after everything is loaded
            if (window.NotificationManager) {
                console.log('Manually triggering notification icon update after dashboard load');
                window.NotificationManager.updateNotificationIcon();
            }

            console.log('Dashboard initialization completed successfully');
        } catch (error) {
            console.error('Error initializing dashboard:', error);

            // Show error message to user
            showErrorMessage('There was a problem loading the dashboard. Please try refreshing the page.');
        }
    };

    // Show error message to user
    const showErrorMessage = (message) => {
        const bookingMessage = document.getElementById('booking-message');
        if (bookingMessage) {
            bookingMessage.textContent = message;
            bookingMessage.style.display = 'block';
            bookingMessage.style.backgroundColor = '#f8d7da';
            bookingMessage.style.color = '#721c24';
            bookingMessage.style.border = '1px solid #f5c6cb';
        }
    };


    // Toggle between calendar view and company creation view
    const toggleDashboardView = (hasCompany) => {
        // Elements to toggle
        const calendarControls = document.querySelector('.calendar-controls');
        const filterSection = document.querySelector('.filter-section');
        const calendarContainer = document.querySelector('.calendar-container');
        const createCompanyContainer = document.getElementById('create-company-container');

        if (hasCompany) {
            // Show calendar elements
            calendarControls.style.display = 'flex';
            filterSection.style.display = 'block';
            calendarContainer.style.display = 'block';
            // Hide company creation button
            if (createCompanyContainer) {
                createCompanyContainer.style.display = 'none';
            }
        } else {
            // Hide calendar elements
            calendarControls.style.display = 'none';
            filterSection.style.display = 'none';
            calendarContainer.style.display = 'none';
            // Show company creation button
            if (createCompanyContainer) {
                createCompanyContainer.style.display = 'block';
            } else {
                // Create company creation button if it doesn't exist
                createCompanyUI();
            }
        }
    };

    // Create company creation UI
    const createCompanyUI = () => {
        // Create container for company creation
        const mainContent = document.querySelector('.main-content');
        const companyContainer = document.createElement('div');
        companyContainer.id = 'create-company-container';
        companyContainer.className = 'company-creation-container';

        // Add content
        companyContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="fas fa-building"></i>
                </div>
                <h3>No Company Found</h3>
                <p>You need to create a company before you can use the calendar and booking features.</p>
                <button id="create-company-btn" class="btn-primary">
                    <i class="fas fa-plus"></i> Create Company
                </button>
            </div>
        `;

        // Insert after header
        const header = document.querySelector('.header');
        mainContent.insertBefore(companyContainer, header.nextSibling);

        // Add event listener to the button
        document.getElementById('create-company-btn').addEventListener('click', () => {
            // Redirect to settings page where they can create a company
            window.location.href = '/users/settings/';
        });
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

    // Setup live notifications WebSocket connection
    const setupLiveNotifications = () => {
        const wsPath = 'ws://localhost:8000/live-ws';
        let ws = new WebSocket(wsPath);
        let reconnectAttempts = 0;
        const maxReconnectAttempts = 5;
        const reconnectDelay = 3000; // 3 seconds

        ws.onopen = function(event) {
            console.log('Live notifications WebSocket connected');
            reconnectAttempts = 0; // Reset reconnection attempts on successful connection
        };

        ws.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                console.log('Live notification received:', data);

                // Use the NotificationManager to handle the notification
                if (window.NotificationManager) {
                    window.NotificationManager.handleNewNotification(data);
                } else {
                    // Fallback if NotificationManager is not loaded yet
                    console.log('NotificationManager not available, showing basic notification');
                    showBasicNotification(data);
                }
            } catch (error) {
                console.error('Error parsing notification data:', error);
            }
        };

        ws.onclose = function(event) {
            // Only attempt to reconnect if it wasn't a normal closure and we haven't exceeded max attempts
            if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
                reconnectAttempts++;
                console.warn(`Live notifications WebSocket closed (attempt ${reconnectAttempts}/${maxReconnectAttempts}). Reconnecting in ${reconnectDelay/1000}s...`);

                setTimeout(() => {
                    setupLiveNotifications();
                }, reconnectDelay);
            } else if (reconnectAttempts >= maxReconnectAttempts) {
                console.error('Max WebSocket reconnection attempts reached. Please refresh the page.');
            } else {
                console.log('WebSocket connection closed normally');
            }
        };

        ws.onerror = function(error) {
            console.error('Live notifications WebSocket error:', error);
        };

        // Store reference for potential cleanup
        window.notificationWebSocket = ws;
    };

    // Fallback notification display if NotificationManager is not available
    const showBasicNotification = (data) => {
        // Create a simple toast notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 15px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            max-width: 300px;
        `;

        notification.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 5px;">${data.title || 'Notification'}</div>
            <div style="font-size: 14px; color: #666;">${data.message || data.info || 'New notification received'}</div>
        `;

        document.body.appendChild(notification);

        // Remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    };

    // Initialize dashboard
    initDashboard();
});
