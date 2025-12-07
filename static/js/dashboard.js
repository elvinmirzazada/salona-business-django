// Main dashboard initialization and coordination
document.addEventListener('DOMContentLoaded', function() {

    // Mobile sidebar toggle functionality
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    if (mobileMenuToggle && sidebar && sidebarOverlay) {
        // Toggle sidebar on mobile menu button click
        mobileMenuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
            sidebarOverlay.classList.toggle('active');

            // Reposition toggle button when sidebar is active
            if (sidebar.classList.contains('active')) {
                mobileMenuToggle.style.left = '295px'; // 280px sidebar + 15px spacing
            } else {
                mobileMenuToggle.style.left = '15px';
            }
        });

        // Close sidebar when clicking overlay
        sidebarOverlay.addEventListener('click', function() {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
            mobileMenuToggle.style.left = '15px'; // Reset position
        });

        // Close sidebar when clicking any nav item on mobile
        const navItems = sidebar.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', function() {
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('active');
                    sidebarOverlay.classList.remove('active');
                    mobileMenuToggle.style.left = '15px'; // Reset position
                }
            });
        });
    }

    // Force daily view on mobile devices
    function handleViewModeForMobile() {
        if (window.innerWidth <= 768) {
            const weeklyBtn = document.getElementById('view-weekly');
            const dailyBtn = document.getElementById('view-daily');

            if (dailyBtn && !dailyBtn.classList.contains('active')) {
                dailyBtn.click();
            }
        }
    }

    // Call on load and resize
    handleViewModeForMobile();
    window.addEventListener('resize', handleViewModeForMobile);

    // Initialize all modules
    const initDashboard = async () => {
        try {
            // Initialize UI components
            UI.setupBookingFormNavigation();

            // Check if user has company data from the user data passed from Django
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
                TimeOffManager.initTimeOffForm();

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
        const calendarContainer = document.querySelector('.calendar-container');
        const createCompanyContainer = document.getElementById('create-company-container');

        if (hasCompany) {
            // Show calendar elements
            calendarContainer.style.display = 'block';
            // Hide company creation button
            if (createCompanyContainer) {
                createCompanyContainer.style.display = 'none';
            }
        } else {
            // Hide calendar elements
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

    // Initialize dashboard
    initDashboard();
});
