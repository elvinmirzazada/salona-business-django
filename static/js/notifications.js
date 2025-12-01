// Notification Manager Module
const NotificationManager = {
    unreadCount: 0,
    notifications: [],

    // Initialize notification system
    async init() {
        this.loadUnreadCount();
        this.setupEventListeners();
        this.updateNotificationIcon();
    },

    // Convert API notification format to our internal format
    convertApiNotification(apiNotif) {
        return {
            id: apiNotif.id,
            title: this.getNotificationTitle(apiNotif.type),
            message: apiNotif.message,
            type: this.mapNotificationType(apiNotif.type),
            timestamp: apiNotif.created_at,
            read: apiNotif.status === 'read',
            data: apiNotif.data,
            apiData: apiNotif // Store original API data for reference
        };
    },

    // Map API notification type to our display type
    mapNotificationType(apiType) {
        const typeMapping = {
            'general': 'info',
            'booking': 'info',
            'booking_created': 'info',
            'payment': 'success',
            'reminder': 'warning',
            'alert': 'error',
            'system': 'info'
        };
        return typeMapping[apiType] || 'info';
    },

    // Get appropriate title for notification type
    getNotificationTitle(apiType) {
        const titleMapping = {
            'general': 'General Notification',
            'booking_created': 'Booking Created',
            'booking': 'Booking Update',
            'payment': 'Payment Notification',
            'reminder': 'Reminder',
            'alert': 'Alert',
            'system': 'System Notification'
        };
        return titleMapping[apiType] || 'Notification';
    },

    // Load unread count from localStorage
    loadUnreadCount() {
        const savedCount = localStorage.getItem('unreadNotificationCount');
        this.unreadCount = savedCount ? parseInt(savedCount, 10) : 0;
    },

    // Save unread count to localStorage
    saveUnreadCount() {
        localStorage.setItem('unreadNotificationCount', this.unreadCount.toString());
    },

    // Handle new notification received via WebSocket
    handleNewNotification(data) {
        // Check if this is API format or legacy format
        let notification;

        if (data.id && data.created_at) {
            // This is API format notification
            notification = this.convertApiNotification(data);
        } else {
            // This is legacy format - convert to our format
            notification = {
                id: this.generateNotificationId(),
                title: data.title || 'New Notification',
                message: data.message || data.info || 'You have a new notification',
                type: data.type || 'info',
                timestamp: new Date().toISOString(),
                read: false,
                data: data.data || null
            };
        }

        // Add to notifications array (at the beginning for newest first)
        this.notifications.unshift(notification);

        // Only increment unread count if the notification is unread
        if (!notification.read) {
            this.unreadCount++;
            this.saveUnreadCount();
        }

        // Update UI
        this.updateNotificationIcon();
        this.showNotificationToast(notification);

        console.log('New notification received:', notification);
    },

    // Mark notification as read via API
    async markNotificationAsRead(notificationId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/notifications/${notificationId}/read`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Update local notification status
            const notification = this.notifications.find(n => n.id === notificationId);
            if (notification && !notification.read) {
                notification.read = true;
                this.unreadCount = Math.max(0, this.unreadCount - 1);
                this.saveUnreadCount();
                this.updateNotificationIcon();
            }

            return true;
        } catch (error) {
            console.error('Error marking notification as read:', error);
            return false;
        }
    },

    // Mark all notifications as read via API
    async markAllAsRead() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/notifications/mark-all-read`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Update local notifications
            this.notifications.forEach(notif => {
                notif.read = true;
            });

            this.unreadCount = 0;
            this.saveUnreadCount();
            this.updateNotificationIcon();

            console.log('All notifications marked as read');
            return true;
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            // Fallback to local update
            this.notifications.forEach(notif => {
                notif.read = true;
            });
            this.unreadCount = 0;
            this.saveUnreadCount();
            this.updateNotificationIcon();
            return false;
        }
    },

    // Generate unique notification ID
    generateNotificationId() {
        return 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    // Update notification icon with unread count
    updateNotificationIcon() {
        const notificationIcon = document.getElementById('notification-icon');
        const notificationBadge = document.getElementById('notification-badge');

        console.log('Updating notification icon:', {
            unreadCount: this.unreadCount,
            iconFound: !!notificationIcon,
            badgeFound: !!notificationBadge
        });

        if (notificationIcon && notificationBadge) {
            if (this.unreadCount > 0) {
                notificationBadge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
                notificationBadge.style.display = 'inline-block';
                notificationIcon.classList.add('has-notifications');
                console.log('Notification badge updated with count:', this.unreadCount);
            } else {
                notificationBadge.style.display = 'none';
                notificationIcon.classList.remove('has-notifications');
                console.log('Notification badge hidden (no unread notifications)');
            }
        } else {
            console.warn('Notification elements not found:', {
                icon: notificationIcon,
                badge: notificationBadge
            });

            // Retry after a short delay if elements not found
            setTimeout(() => {
                console.log('Retrying notification icon update...');
                this.updateNotificationIcon();
            }, 1000);
        }
    },

    // Show toast notification for new notifications
    showNotificationToast(notification) {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `notification-toast notification-toast-${notification.type}`;
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas ${this.getNotificationIcon(notification.type)}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${notification.title}</div>
                <div class="toast-message">${notification.message}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Add to page
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }

        toastContainer.appendChild(toast);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);

        // Add slide-in animation
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
    },

    // Get icon for notification type
    getNotificationIcon(type) {
        const icons = {
            info: 'fa-info-circle',
            success: 'fa-check-circle',
            warning: 'fa-exclamation-triangle',
            error: 'fa-exclamation-circle'
        };
        return icons[type] || icons.info;
    },

    // Setup event listeners
    setupEventListeners() {
        // Notification icon click handler
        document.addEventListener('click', (e) => {
            if (e.target.closest('#notification-icon')) {
                this.handleNotificationIconClick();
            }
        });
    },

    // Handle notification icon click
    handleNotificationIconClick() {
        // Redirect to notifications page instead of marking all as read
        console.log('Notification icon clicked - redirecting to notifications page');

        // Redirect to notifications page
        window.location.href = '/users/notifications/';
    },

    // Get unread notifications count
    getUnreadCount() {
        return this.unreadCount;
    },

    // Get all notifications
    getAllNotifications() {
        return this.notifications;
    },

    // Clear all notifications
    clearAllNotifications() {
        this.notifications = [];
        this.unreadCount = 0;
        this.saveUnreadCount();
        this.updateNotificationIcon();
    }
};

// Auto-initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Small delay to ensure other components are loaded
    setTimeout(() => {
        NotificationManager.init();
    }, 500);
});

// Export for use in other modules
window.NotificationManager = NotificationManager;
