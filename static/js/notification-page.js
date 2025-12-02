// Notifications Page Manager
const NotificationPage = {
    currentFilter: 'all',
    currentPage: 1,
    perPage: 20,
    totalPages: 1,
    isLoading: false,
    notifications: [],
    unreadCount: 0,
    totalNotifications: 0,

    // Initialize the notifications page
    async init() {
        this.translations = window.notificationsTranslations || {};
        this.setupEventListeners();
        await this.loadNotifications();
        this.hidePageLoader();
    },

    // Setup event listeners
    setupEventListeners() {
        // Filter tabs
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.handleFilterChange(e.target.dataset.filter);
            });
        });

        // Mark all read button
        const markAllReadBtn = document.getElementById('mark-all-read-btn');
        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', () => {
                this.handleMarkAllRead();
            });
        }

        // Refresh button
        const refreshBtn = document.getElementById('refresh-notifications-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadNotifications();
            });
        }

        // Pagination
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.loadNotifications();
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (this.currentPage < this.totalPages) {
                    this.currentPage++;
                    this.loadNotifications();
                }
            });
        }

        // Confirmation dialog
        this.setupConfirmationDialog();
    },

    // Setup confirmation dialog
    setupConfirmationDialog() {
        const dialog = document.getElementById('confirmation-dialog');
        const cancelBtn = document.getElementById('confirmation-cancel');
        const confirmBtn = document.getElementById('confirmation-confirm');

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.hideConfirmationDialog();
            });
        }

        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                if (this.pendingAction) {
                    this.pendingAction();
                    this.hideConfirmationDialog();
                }
            });
        }

        // Close on backdrop click
        if (dialog) {
            dialog.addEventListener('click', (e) => {
                if (e.target === dialog) {
                    this.hideConfirmationDialog();
                }
            });
        }
    },

    // Load notifications from API
    async loadNotifications() {
        if (this.isLoading) return;

        this.isLoading = true;
        this.showLoadingState();

        try {
            // Use API client instead of direct fetch with localStorage
            const response = await api.getNotifications({
                page: this.currentPage,
                per_page: this.perPage
            });

            if (response?.success && response.data) {
                this.processNotifications(response.data, response.pagination);
                this.renderNotifications();
                this.updateStats();
                this.updatePagination(response.pagination);
            } else {
                this.showEmptyState();
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
            this.showErrorState();
        } finally {
            this.isLoading = false;
            this.hideLoadingState();
        }
    },

    // Process notifications data
    processNotifications(notifications, pagination) {
        this.notifications = notifications.map(notif => ({
            id: notif.id,
            title: this.getNotificationTitle(notif.type),
            message: notif.message,
            type: notif.type,
            status: notif.status,
            timestamp: notif.created_at,
            read: notif.status === 'read',
            data: notif.data,
            company_id: notif.company_id
        }));

        if (pagination) {
            this.currentPage = pagination.page;
            this.totalPages = pagination.total_pages;
            this.totalNotifications = pagination.total;
        }

        // Fetch unread count from dedicated endpoint after processing notifications
        this.fetchUnreadCount();
    },

    // Fetch unread count from dedicated API endpoint
    async fetchUnreadCount() {
        try {
            // Use API client instead of direct fetch
            const response = await api.getUnreadNotificationsCount();

            if (response?.success && typeof response.data?.unread_count === 'number') {
                this.unreadCount = response.data.unread_count;
                this.updateStats();
                console.log(`Unread count updated: ${this.unreadCount}`);
            } else {
                // Fallback to counting locally if API response is unexpected
                this.unreadCount = this.notifications.filter(notif => notif.read === false).length;
            }
        } catch (error) {
            console.error('Error fetching unread count:', error);
            // Fallback to counting locally
            this.unreadCount = this.notifications.filter(notif => notif.read === false).length;
        }
    },

    // Get notification title based on type
    getNotificationTitle(type) {
        const t = this.translations;
        const titleMapping = {
            'general': t.generalNotification || 'General Notification',
            'booking': t.bookingUpdate || 'Booking Update',
            'booking_created': t.bookingCreated || 'Booking Created',
            'payment': t.paymentNotification || 'Payment Notification',
            'reminder': t.reminder || 'Reminder',
            'alert': t.alert || 'Alert',
            'system': t.systemNotification || 'System Notification'
        };
        return titleMapping[type] || (t.notification || 'Notification');
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

    // Render notifications list
    renderNotifications() {
        const container = document.getElementById('notifications-list');
        if (!container) return;

        const filteredNotifications = this.getFilteredNotifications();

        if (filteredNotifications.length === 0) {
            this.showEmptyState();
            return;
        }

        // Keep the table header and add notifications after it
        const tableHeader = container.querySelector('.notifications-table-header');
        const notificationsHTML = filteredNotifications.map(notification =>
            this.createNotificationHTML(notification)
        ).join('');

        // Clear existing notifications but keep header
        const existingNotifications = container.querySelectorAll('.notification-item');
        existingNotifications.forEach(item => item.remove());

        // Add new notifications after header
        if (tableHeader) {
            tableHeader.insertAdjacentHTML('afterend', notificationsHTML);
        } else {
            container.innerHTML = notificationsHTML;
        }

        // Setup action buttons
        this.setupNotificationActions();
        this.hideEmptyState();
    },

    // Get filtered notifications
    getFilteredNotifications() {
        if (!this.notifications) return [];

        switch (this.currentFilter) {
            case 'unread':
                return this.notifications.filter(n => !n.read);
            case 'general':
            case 'booking':
            case 'payment':
            case 'reminder':
            case 'alert':
            case 'system':
                return this.notifications.filter(n => n.type === this.currentFilter);
            default:
                return this.notifications;
        }
    },

    // Create HTML for a notification item
    createNotificationHTML(notification) {
        const t = this.translations;
        const timeAgo = this.formatTimeAgo(notification.timestamp);
        const isUnread = !notification.read;

        return `
            <div class="notification-item ${isUnread ? 'unread' : ''}" data-id="${notification.id}">
                <!-- Icon Cell -->
                <div class="notification-table-cell">
                    <div class="notification-item-icon ${this.getIconType(notification.type)}">
                        <i class="fas ${this.getNotificationIcon(notification.type)}"></i>
                    </div>
                </div>
                
                <!-- Content Cell -->
                <div class="notification-table-cell">
                    <div class="notification-item-content">
                        <h4 class="notification-item-title">${notification.title}</h4>
                        <p class="notification-item-message">${notification.message}</p>
                    </div>
                </div>
                
                <!-- Type Cell -->
                <div class="notification-table-cell notification-item-type-cell">
                    <span class="notification-item-type ${notification.type}">${notification.type}</span>
                </div>
                
                <!-- Time Cell -->
                <div class="notification-table-cell notification-item-time-cell">
                    <span class="notification-item-time">${timeAgo}</span>
                </div>
                
                <!-- Actions Cell -->
                <div class="notification-table-cell">
                    <div class="notification-item-actions">
                        ${isUnread ? `
                            <button class="notification-action-btn read" 
                                    data-action="read" 
                                    data-id="${notification.id}"
                                    title="${t.markAsRead || 'Mark as read'}">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : `
                            <div class="notification-status-indicator read">
                                <i class="fas fa-check-circle"></i>
                                ${t.read || 'Read'}
                            </div>
                        `}
                        <button class="notification-action-btn delete" 
                                data-action="delete" 
                                data-id="${notification.id}"
                                title="${t.deleteNotification || 'Delete notification'}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    // Get icon type for styling
    getIconType(type) {
        const typeMapping = {
            'general': 'info',
            'booking': 'info',
            'payment': 'success',
            'reminder': 'warning',
            'alert': 'error',
            'system': 'info'
        };
        return typeMapping[type] || 'info';
    },

    // Get icon class for notification type
    getNotificationIcon(type) {
        const icons = {
            'general': 'fa-info-circle',
            'booking': 'fa-calendar',
            'payment': 'fa-credit-card',
            'reminder': 'fa-exclamation-triangle',
            'alert': 'fa-exclamation-circle',
            'system': 'fa-cog'
        };
        return icons[type] || 'fa-bell';
    },

    // Setup notification action buttons
    setupNotificationActions() {
        document.querySelectorAll('.notification-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = e.target.closest('.notification-action-btn').dataset.action;
                const notificationId = e.target.closest('.notification-action-btn').dataset.id;

                if (action === 'read') {
                    this.markAsRead(notificationId);
                } else if (action === 'delete') {
                    this.confirmDelete(notificationId);
                }
            });
        });
    },

    // Handle filter change
    handleFilterChange(filter) {
        // Update active tab
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-filter="${filter}"]`).classList.add('active');

        this.currentFilter = filter;
        this.renderNotifications();
        this.updateStats();
    },

    // Mark notification as read
    async markAsRead(notificationId) {
        const t = this.translations;
        try {
            // Use API client instead of direct fetch with localStorage
            const response = await api.markNotificationAsRead(notificationId);

            if (response?.success) {
                // Update local notification
                const notification = this.notifications.find(n => n.id === notificationId);
                if (notification) {
                    notification.read = true;
                    notification.status = 'read';
                }

                // Refetch unread count from API to update sidebar badge correctly
                await this.fetchUnreadCount();

                this.renderNotifications();
                this.updateStats();
                this.showSuccessMessage(t.notificationMarkedAsRead || 'Notification marked as read');
            } else {
                throw new Error('Failed to mark notification as read');
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
            this.showErrorMessage(t.failedToMarkAsRead || 'Failed to mark notification as read');
        }
    },

    // Confirm delete notification
    confirmDelete(notificationId) {
        const t = this.translations;
        const notification = this.notifications.find(n => n.id === notificationId);

        this.showConfirmationDialog(
            t.deleteNotificationTitle || 'Delete Notification',
            t.deleteNotificationMessage || 'Are you sure you want to delete this notification? This action cannot be undone.',
            () => this.deleteNotification(notificationId)
        );
    },

    // Delete notification
    async deleteNotification(notificationId) {
        const t = this.translations;
        try {
            // Use API client instead of direct fetch with localStorage
            const response = await api.request(`/users/api/v1/notifications/${notificationId}`, {
                method: 'DELETE'
            });

            if (response?.success) {
                // Remove from local notifications
                this.notifications = this.notifications.filter(n => n.id !== notificationId);

                // Refetch unread count from API to update sidebar badge correctly
                await this.fetchUnreadCount();

                this.renderNotifications();
                this.updateStats();
                this.showSuccessMessage(t.notificationDeleted || 'Notification deleted successfully');
            } else {
                throw new Error('Failed to delete notification');
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
            this.showErrorMessage(t.failedToDelete || 'Failed to delete notification');
        }
    },

    // Handle mark all as read
    async handleMarkAllRead() {
        const t = this.translations;
        const unreadNotifications = this.notifications.filter(n => !n.read);

        if (unreadNotifications.length === 0) {
            this.showInfoMessage(t.noUnreadNotifications || 'No unread notifications to mark as read');
            return;
        }

        this.showConfirmationDialog(
            t.markAllAsReadTitle || 'Mark All as Read',
            `${t.markAllAsReadMessage || 'Are you sure you want to mark all unread notifications as read?'}`,
            () => this.markAllAsRead()
        );
    },

    // Mark all notifications as read
    async markAllAsRead() {
        const t = this.translations;
        try {
            // Use API client instead of direct fetch with localStorage
            const response = await api.request('/users/api/v1/notifications/mark-all/as-read', {
                method: 'PATCH'
            });

            if (response?.success) {
                // Update local notifications
                this.notifications.forEach(notification => {
                    notification.read = true;
                    notification.status = 'read';
                });

                this.renderNotifications();
                this.updateStats();
                this.showSuccessMessage(t.allMarkedAsRead || 'All notifications marked as read');
            } else {
                throw new Error('Failed to mark all notifications as read');
            }
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            this.showErrorMessage(t.failedToMarkAllAsRead || 'Failed to mark all notifications as read');
        }
    },

    // Update statistics
    updateStats() {
        const t = this.translations;
        const totalElement = document.getElementById('total-notifications');
        const unreadElement = document.getElementById('unread-notifications');
        const markAllReadBtn = document.getElementById('mark-all-read-btn');

        if (totalElement && this.notifications) {
            const total = this.notifications.length;
            totalElement.textContent = `${total} ${total !== 1 ? (t.notifications || 'notifications') : (t.notification || 'notification')}`;
        }

        if (unreadElement && this.notifications) {
            const unread = this.notifications.filter(n => !n.read).length;
            unreadElement.textContent = `${unread} ${t.unread || 'unread'}`;

            // Enable/disable mark all read button
            if (markAllReadBtn) {
                markAllReadBtn.disabled = unread === 0;
            }
        }

        // Update sidebar badge
        this.updateSidebarBadge();
    },

    // Update sidebar notification badge
    updateSidebarBadge() {
        const sidebarBadge = document.getElementById('notification-count');
        const headerBadge = document.getElementById('notification-badge');
        if (sidebarBadge) {
            // Use the total unread count from API, not just current page
            const unread = this.unreadCount || 0;
            if (unread > 0) {
                sidebarBadge.textContent = unread;
                sidebarBadge.style.display = 'flex';
            } else {
                sidebarBadge.textContent = '';
                sidebarBadge.style.display = 'none';
            }
        }
        if (headerBadge) {
            // Use the total unread count from API, not just current page
            const unread = this.unreadCount || 0;
            if (unread > 0) {
                headerBadge.textContent = unread;
                headerBadge.style.display = 'flex';
            } else {
                headerBadge.textContent = '';
                headerBadge.style.display = 'none';
            }
        }
    },

    // Update pagination
    updatePagination(pagination) {
        const t = this.translations;
        const container = document.getElementById('pagination-container');
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        const pageInfo = document.getElementById('page-info');

        if (!pagination || pagination.total_pages <= 1) {
            if (container) container.style.display = 'none';
            return;
        }

        if (container) container.style.display = 'flex';

        if (prevBtn) {
            prevBtn.disabled = pagination.page <= 1;
        }

        if (nextBtn) {
            nextBtn.disabled = pagination.page >= pagination.total_pages;
        }

        if (pageInfo) {
            pageInfo.textContent = `${t.page || 'Page'} ${pagination.page} ${t.of || 'of'} ${pagination.total_pages}`;
        }
    },

    // Show confirmation dialog
    showConfirmationDialog(title, message, onConfirm) {
        const dialog = document.getElementById('confirmation-dialog');
        const titleElement = document.getElementById('confirmation-title');
        const messageElement = document.getElementById('confirmation-message');

        if (titleElement) titleElement.textContent = title;
        if (messageElement) messageElement.textContent = message;

        this.pendingAction = onConfirm;

        if (dialog) {
            dialog.style.display = 'flex';
        }
    },

    // Hide confirmation dialog
    hideConfirmationDialog() {
        const dialog = document.getElementById('confirmation-dialog');
        if (dialog) {
            dialog.style.display = 'none';
        }
        this.pendingAction = null;
    },

    // Show/hide states
    showLoadingState() {
        const loadingState = document.getElementById('loading-state');
        if (loadingState) {
            loadingState.style.display = 'block';
        }
        this.hideEmptyState();
    },

    hideLoadingState() {
        const loadingState = document.getElementById('loading-state');
        if (loadingState) {
            loadingState.style.display = 'none';
        }
    },

    showEmptyState() {
        const emptyState = document.getElementById('empty-state');
        const notificationsList = document.getElementById('notifications-list');

        if (emptyState) emptyState.style.display = 'block';
        if (notificationsList) notificationsList.innerHTML = '';
    },

    hideEmptyState() {
        const emptyState = document.getElementById('empty-state');
        if (emptyState) emptyState.style.display = 'none';
    },

    showErrorState() {
        const t = this.translations;
        const container = document.getElementById('notifications-list');
        if (container) {
            container.innerHTML = `
                <div class="error-state" style="text-align: center; padding: 40px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #ef4444; margin-bottom: 16px;"></i>
                    <h3 style="color: #1f2937; margin-bottom: 8px;">${t.errorLoadingNotifications || 'Error loading notifications'}</h3>
                    <p style="color: #6b7280;">${t.pleaseTryRefreshing || 'Please try refreshing the page'}</p>
                </div>
            `;
        }
    },

    // Hide page loader - THIS IS THE KEY FIX
    hidePageLoader() {
        const pageLoader = document.getElementById('page-loader');
        if (pageLoader) {
            console.log('Hiding page loader...');
            pageLoader.classList.add('hidden');
            setTimeout(() => {
                pageLoader.style.display = 'none';
                console.log('Page loader hidden');
            }, 500);
        }
    },

    // Format time ago
    formatTimeAgo(timestamp) {
        const t = this.translations;
        const now = new Date();
        const time = new Date(timestamp);
        const diffInSeconds = Math.floor((now - time) / 1000);

        if (diffInSeconds < 60) return t.justNow || 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}${t.minutesAgo || 'm ago'}`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}${t.hoursAgo || 'h ago'}`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}${t.daysAgo || 'd ago'}`;

        return time.toLocaleDateString();
    },

    // Show messages
    showSuccessMessage(message) {
        this.showToast(message, 'success');
    },

    showErrorMessage(message) {
        this.showToast(message, 'error');
    },

    showInfoMessage(message) {
        this.showToast(message, 'info');
    },

    // Show toast notification
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `notification-toast notification-toast-${type} show`;
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }

        toastContainer.appendChild(toast);

        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    NotificationPage.init();
});
