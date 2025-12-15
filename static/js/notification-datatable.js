/**
 * Notifications DataTable Manager - Handles notification data display with DataTables
 * Uses API client for all backend communication
 */

class NotificationsDataTable {
    constructor() {
        this.notifications = [];
        this.notificationsTable = null;
        this.currentFilter = 'all';
        this.unreadCount = 0;
        this.totalCount = 0;
    }

    /**
     * Get translations with fallback defaults
     */
    get translations() {
        return window.notificationsTranslations || {
            failedToLoad: 'Failed to load notifications',
            noNotifications: 'No notifications found.',
            loadingRecords: 'Loading notifications...',
            processing: 'Processing...',
            search: 'Search notifications:',
            lengthMenu: 'Show _MENU_ entries',
            info: 'Showing _START_ to _END_ of _TOTAL_ notifications',
            infoEmpty: 'Showing 0 to 0 of 0 notifications',
            infoFiltered: '(filtered from _MAX_ total notifications)',
            paginate: {
                first: 'First',
                last: 'Last',
                next: 'Next',
                previous: 'Previous'
            }
        };
    }

    /**
     * Initialize the notifications DataTable
     */
    async init() {
        try {
            this.setupEventListeners();
            this.initializeNotificationsDataTable();
            this.setupConfirmationDialog();
        } catch (error) {
            console.error('Failed to initialize notifications manager:', error);
            this.showError(this.translations.failedToLoad);
        } finally {
            // Always hide page loader after initialization
            this.hidePageLoader();
        }
    }

    /**
     * Hide page loader
     */
    hidePageLoader() {
        const pageLoader = document.getElementById('page-loader');
        if (pageLoader) {
            console.log('Hiding page loader...');
            pageLoader.classList.add('hidden');
            setTimeout(() => {
                pageLoader.style.display = 'none';
                console.log('Page loader hidden');
            }, 300);
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Filter tabs
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.handleFilterChange(e.target.closest('.filter-tab').dataset.filter);
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
                this.refreshNotifications();
            });
        }
    }

    /**
     * Setup confirmation dialog
     */
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
    }

    /**
     * Initialize DataTable for notifications
     */
    initializeNotificationsDataTable() {
        const self = this;

        // Show loading state initially
        $('#notifications-loading').show();
        $('#notifications-table-container').hide();
        $('#notifications-empty').hide();

        this.notificationsTable = $('#notifications-table').DataTable({
            ajax: {
                url: '/users/api/v1/notifications',
                type: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                dataSrc: function(json) {
                    // Handle the API response format
                    $('#notifications-loading').hide();

                    if (json && json.data) {
                        self.notifications = json.data;
                        self.totalCount = json.data.length;

                        // Calculate unread count
                        self.unreadCount = json.data.filter(n => n.status !== 'read').length;
                        self.updateStats();

                        // Show table or empty state based on data
                        if (json.data.length > 0) {
                            $('#notifications-table-container').show();
                            $('#notifications-empty').hide();
                        } else {
                            $('#notifications-table-container').hide();
                            $('#notifications-empty').show();
                        }

                        return json.data;
                    }

                    // No data case
                    $('#notifications-table-container').hide();
                    $('#notifications-empty').show();
                    return [];
                },
                error: function(xhr, error, code) {
                    console.error('Failed to load notifications data:', error);
                    self.showError(self.translations.failedToLoad);
                    $('#notifications-loading').hide();
                    $('#notifications-table-container').hide();
                    $('#notifications-empty').show();
                    // Ensure page loader is hidden on error
                    self.hidePageLoader();
                }
            },
            columns: [
                {
                    // Type column with icon
                    data: 'type',
                    width: '80px',
                    render: function(data, type, row) {
                        const icon = self.getNotificationIcon(row.type);
                        const iconClass = self.getNotificationIconClass(row.type);
                        return `<div class="notification-type-icon ${iconClass}">
                                    <i class="${icon}"></i>
                                </div>`;
                    }
                },
                {
                    // Message column - clickable
                    data: 'message',
                    render: function(data, type, row) {
                        const isUnread = row.status !== 'read';
                        const unreadBadge = isUnread ?
                            '<span class="unread-badge"><i class="fas fa-circle"></i></span>' : '';
                        const title = self.getNotificationTitle(row.type);
                        const rowData = JSON.stringify(row).replace(/"/g, '&quot;');
                        return `<div class="notification-message-cell ${isUnread ? 'unread' : ''} clickable" 
                                     onclick='notificationsManager.handleNotificationClick(${rowData})' 
                                     style="cursor: pointer;">
                                    ${unreadBadge}
                                    <div class="notification-title">${title}</div>
                                    <div class="notification-text">${data || '-'}</div>
                                </div>`;
                    }
                },
                {
                    // Category column
                    data: 'type',
                    width: '120px',
                    render: function(data, type, row) {
                        return self.getCategoryBadge(row.type);
                    }
                },
                {
                    // Time column
                    data: 'created_at',
                    width: '150px',
                    render: function(data, type, row) {
                        if (data) {
                            return self.formatTimeAgo(data);
                        }
                        return '-';
                    }
                },
                {
                    // Actions column
                    data: null,
                    width: '120px',
                    orderable: false,
                    render: function(data, type, row) {
                        const isUnread = row.status !== 'read';
                        const markReadBtn = isUnread ?
                            `<button class="action-btn mark-read-btn" onclick="notificationsManager.markAsRead('${row.id}')" title="${self.translations.markAsRead}">
                                <i class="fas fa-check"></i>
                            </button>` : '';

                        return `<div class="notification-actions">
                                    ${markReadBtn}
                                    <button class="action-btn delete-btn" onclick="notificationsManager.deleteNotification('${row.id}')" title="${self.translations.deleteNotification}">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>`;
                    }
                }
            ],
            responsive: true,
            pageLength: 15,
            lengthChange: true,
            lengthMenu: [[10, 15, 25, 50, -1], [10, 15, 25, 50, "All"]],
            searching: true,
            ordering: true,
            order: [[3, 'desc']], // Sort by time column (newest first)
            autoWidth: false,
            scrollResize: true,
            scrollY: 'auto',
            language: {
                emptyTable: self.translations.noNotifications,
                loadingRecords: self.translations.loadingRecords,
                processing: self.translations.processing,
                search: self.translations.search,
                lengthMenu: self.translations.lengthMenu,
                info: self.translations.info,
                infoEmpty: self.translations.infoEmpty,
                infoFiltered: self.translations.infoFiltered,
                paginate: self.translations.paginate
            },
            dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
                 '<"row"<"col-sm-12"tr>>' +
                 '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
            initComplete: function(settings, json) {
                // Hide page loader when DataTable is fully initialized
                self.hidePageLoader();
                console.log('DataTable initialized successfully');
            },
            drawCallback: function(settings) {
                // Hide loading state when table is drawn
                $('#notifications-loading').hide();

                // Show/hide empty state based on data
                const api = this.api();
                const data = api.rows({page: 'current'}).data();

                if (data.length === 0 && api.page.info().recordsTotal === 0) {
                    $('#notifications-table-container').hide();
                    $('#notifications-empty').show();
                } else {
                    $('#notifications-table-container').show();
                    $('#notifications-empty').hide();
                }
            }
        });
    }

    /**
     * Get notification icon based on type
     */
    getNotificationIcon(type) {
        const iconMapping = {
            'general': 'fas fa-info-circle',
            'booking': 'fas fa-calendar-check',
            'booking_created': 'fas fa-calendar-plus',
            'payment': 'fas fa-credit-card',
            'reminder': 'fas fa-bell',
            'alert': 'fas fa-exclamation-triangle',
            'system': 'fas fa-cog'
        };
        return iconMapping[type] || 'fas fa-bell';
    }

    /**
     * Get notification icon class for styling
     */
    getNotificationIconClass(type) {
        const classMapping = {
            'general': 'icon-info',
            'booking': 'icon-booking',
            'booking_created': 'icon-booking',
            'payment': 'icon-payment',
            'reminder': 'icon-warning',
            'alert': 'icon-error',
            'system': 'icon-system'
        };
        return classMapping[type] || 'icon-info';
    }

    /**
     * Get notification title based on type
     */
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
    }

    /**
     * Get category badge HTML
     */
    getCategoryBadge(type) {
        const t = this.translations;
        const categoryMapping = {
            'general': { text: t.general || 'General', class: 'badge-info' },
            'booking': { text: t.booking || 'Booking', class: 'badge-booking' },
            'booking_created': { text: t.booking || 'Booking', class: 'badge-booking' },
            'payment': { text: t.payment || 'Payment', class: 'badge-payment' },
            'reminder': { text: 'Reminder', class: 'badge-warning' },
            'alert': { text: 'Alert', class: 'badge-error' },
            'system': { text: 'System', class: 'badge-system' }
        };
        const category = categoryMapping[type] || { text: t.general || 'General', class: 'badge-info' };
        return `<span class="category-badge ${category.class}">${category.text}</span>`;
    }

    /**
     * Format time ago
     */
    formatTimeAgo(dateString) {
        // Parse the date string - backend sends UTC timestamps without 'Z'
        // We need to append 'Z' to treat them as UTC
        let utcDateString = dateString;
        if (!dateString.endsWith('Z') && !dateString.includes('+')) {
            utcDateString = dateString + 'Z';
        }

        const date = new Date(utcDateString);
        const now = new Date();

        // Calculate difference in seconds
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 0) {
            // If negative, the timestamp is in the future (shouldn't happen)
            return 'Just now';
        }

        if (diffInSeconds < 60) {
            return 'Just now';
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes}m ago`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours}h ago`;
        } else if (diffInSeconds < 604800) {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days}d ago`;
        } else {
            // For older dates, show in local timezone format
            return date.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }

    /**
     * Handle filter change
     */
    handleFilterChange(filter) {
        this.currentFilter = filter;

        // Update active tab
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        const activeTab = document.querySelector(`.filter-tab[data-filter="${filter}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }

        // Apply filter to DataTable
        if (this.notificationsTable) {
            // Clear all searches first
            this.notificationsTable.search('').columns().search('');

            // Apply custom filter
            if (filter === 'all') {
                // No filtering, show all
                $.fn.dataTable.ext.search = [];
                this.notificationsTable.draw();
            } else if (filter === 'unread') {
                // Filter by unread status
                $.fn.dataTable.ext.search = [];
                $.fn.dataTable.ext.search.push(
                    function(settings, data, dataIndex) {
                        const row = settings.aoData[dataIndex]._aData;
                        return row.status !== 'read';
                    }
                );
                this.notificationsTable.draw();
            } else {
                // Filter by category (general, booking, payment)
                $.fn.dataTable.ext.search = [];
                $.fn.dataTable.ext.search.push(
                    function(settings, data, dataIndex) {
                        const row = settings.aoData[dataIndex]._aData;
                        // Map notification types to categories
                        const categoryMap = {
                            'general': ['general', 'system', 'alert'],
                            'booking': ['booking', 'booking_created', 'reminder'],
                            'payment': ['payment']
                        };

                        const types = categoryMap[filter] || [];
                        return types.includes(row.type);
                    }
                );
                this.notificationsTable.draw();
            }
        }
    }

    /**
     * Refresh notifications
     */
    refreshNotifications() {
        if (this.notificationsTable) {
            this.notificationsTable.ajax.reload(null, false); // false = stay on current page
        }
    }

    /**
     * Update stats display
     */
    updateStats() {
        const totalElement = document.getElementById('total-notifications');
        const unreadElement = document.getElementById('unread-notifications');

        if (totalElement) {
            totalElement.textContent = this.totalCount;
        }
        if (unreadElement) {
            unreadElement.textContent = this.unreadCount;
        }

        // Update mark all read button state
        const markAllReadBtn = document.getElementById('mark-all-read-btn');
        if (markAllReadBtn) {
            markAllReadBtn.disabled = this.unreadCount === 0;
        }
    }

    /**
     * Handle notification click - mark as read and show booking details
     */
    async handleNotificationClick(notification) {
        try {
            // Mark as read if unread
            if (notification.status !== 'read') {
                await this.markAsRead(notification.id, false); // false = don't show success message
            }

            // Parse notification data
            let notificationData = {};
            if (notification.data) {
                try {
                    notificationData = typeof notification.data === 'string'
                        ? JSON.parse(notification.data)
                        : notification.data;
                } catch (e) {
                    console.error('Error parsing notification data:', e);
                }
            }

            // If notification has booking_id, show booking details
            if (notificationData.booking_id) {
                await this.showBookingDetails(notificationData.booking_id, notificationData.company_id);
            } else {
                console.log('No booking_id found in notification data');
            }
        } catch (error) {
            console.error('Error handling notification click:', error);
            this.showError('Failed to process notification');
        }
    }

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId, showMessage = true) {
        try {
            const response = await api.markNotificationAsRead(notificationId);
            if (response && response.success) {
                if (showMessage) {
                    this.showSuccess(this.translations.notificationMarkedAsRead);
                }
                this.refreshNotifications();
            } else {
                if (showMessage) {
                    this.showError(this.translations.failedToMarkAsRead);
                }
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
            if (showMessage) {
                this.showError(this.translations.failedToMarkAsRead);
            }
        }
    }

    /**
     * Show booking details in a modal
     */
    async showBookingDetails(bookingId, companyId) {
        try {
            // Show loading state
            this.showBookingModal('Loading booking details...', true);

            // Fetch booking details
            const response = await api.getBookingById(bookingId);

            if (!response || !response.success || !response.data) {
                throw new Error('Failed to load booking details');
            }

            const booking = response.data;

            // Build modal content
            const modalContent = this.buildBookingModalContent(booking);
            this.showBookingModal(modalContent, false, booking);

        } catch (error) {
            console.error('Error loading booking details:', error);
            this.showError('Failed to load booking details');
            this.hideBookingModal();
        }
    }

    /**
     * Build booking modal content HTML
     */
    buildBookingModalContent(booking) {
        const t = this.translations;
        const statusClass = this.getBookingStatusClass(booking.status);
        const statusText = this.getBookingStatusText(booking.status);

        // Format date and time from start_at and end_at
        let bookingDate = 'N/A';
        let startTime = 'N/A';
        let endTime = 'N/A';

        if (booking.start_at) {
            const startDate = new Date(booking.start_at);
            bookingDate = startDate.toLocaleDateString(undefined, {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
            startTime = startDate.toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        }

        if (booking.end_at) {
            const endDate = new Date(booking.end_at);
            endTime = endDate.toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        }

        // Staff information - collect unique staff from booking_services
        let staffList = new Set();
        let staffEmails = new Set();
        if (booking.booking_services && booking.booking_services.length > 0) {
            booking.booking_services.forEach(bookingService => {
                if (bookingService.assigned_staff) {
                    const staff = bookingService.assigned_staff;
                    const staffName = `${staff.first_name || ''} ${staff.last_name || ''}`.trim();
                    if (staffName) {
                        staffList.add(staffName);
                    }
                    if (staff.email) {
                        staffEmails.add(staff.email);
                    }
                }
            });
        }

        const staffName = staffList.size > 0 ? Array.from(staffList).join(', ') : 'N/A';
        const staffEmail = staffEmails.size > 0 ? Array.from(staffEmails).join(', ') : '';

        // Services list from booking_services
        let servicesHtml = '<p>No services</p>';
        let totalPrice = booking.total_price || 0;

        if (booking.booking_services && booking.booking_services.length > 0) {
            servicesHtml = '<ul class="services-list">';
            booking.booking_services.forEach(bookingService => {
                const service = bookingService.category_service;
                if (service) {
                    const serviceName = service.name || 'Unknown Service';
                    const duration = service.duration || 0;
                    const price = (service.price || 0) / 100;
                    const discountPrice = (service.discount_price || 0)/ 100;

                    let priceDisplay = `$${price}`;
                    if (discountPrice && discountPrice < price) {
                        priceDisplay = `<span style="text-decoration: line-through; color: #9CA3AF;">$${price}</span> $${discountPrice}`;
                    }

                    servicesHtml += `
                        <li>
                            <span class="service-name">${serviceName}</span>
                            <span class="service-details">${duration}min - ${priceDisplay}</span>
                        </li>
                    `;
                }
            });
            servicesHtml += '</ul>';

            if (totalPrice > 0) {
                servicesHtml += `<p style="text-align: right; margin-top: 12px; font-weight: 600; font-size: 16px; color: #1F2937;">Total: $${parseFloat(totalPrice / 100).toFixed(2)}</p>`;
            }
        }

        // Customer information
        const customer = booking.customer;
        const customerName = customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : 'N/A';
        const customerEmail = customer?.email || '';
        const customerPhone = customer?.phone || '';

        // Action buttons based on booking status
        let actionButtons = '';
        if (booking.status === 'pending' || booking.status === 'scheduled') {
            actionButtons = `
                <button class="modal-btn btn-confirm" onclick="notificationsManager.confirmBooking('${booking.id}')">
                    <i class="fas fa-check"></i> Confirm Booking
                </button>
                <button class="modal-btn btn-cancel" onclick="notificationsManager.cancelBooking('${booking.id}')">
                    <i class="fas fa-times"></i> Cancel Booking
                </button>
            `;
        } else if (booking.status === 'confirmed') {
            actionButtons = `
                <button class="modal-btn btn-cancel" onclick="notificationsManager.cancelBooking('${booking.id}')">
                    <i class="fas fa-times"></i> Cancel Booking
                </button>
            `;
        }

        return `
            <div class="booking-details-header">
                <h3><i class="fas fa-calendar-alt"></i> Booking Details</h3>
                <span class="booking-status ${statusClass}">${statusText}</span>
            </div>
            
            <div class="booking-details-body">
                <div class="detail-section">
                    <h4><i class="fas fa-clock"></i> Date & Time</h4>
                    <p><strong>Date:</strong> ${bookingDate}</p>
                    <p><strong>Time:</strong> ${startTime} - ${endTime}</p>
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-user-tie"></i> Staff Member</h4>
                    <p><strong>Name:</strong> ${staffName}</p>
                    ${staffEmail ? `<p><strong>Email:</strong> ${staffEmail}</p>` : ''}
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-concierge-bell"></i> Services</h4>
                    ${servicesHtml}
                </div>
                
                <div class="detail-section">
                    <h4><i class="fas fa-user"></i> Customer</h4>
                    <p><strong>Name:</strong> ${customerName}</p>
                    ${customerEmail ? `<p><strong>Email:</strong> ${customerEmail}</p>` : ''}
                    ${customerPhone ? `<p><strong>Phone:</strong> ${customerPhone}</p>` : ''}
                </div>
                
                ${booking.notes ? `
                    <div class="detail-section">
                        <h4><i class="fas fa-sticky-note"></i> Notes</h4>
                        <p>${booking.notes}</p>
                    </div>
                ` : ''}
            </div>
            
            <div class="booking-details-footer">
                ${actionButtons}
                <button class="modal-btn btn-secondary" onclick="notificationsManager.hideBookingModal()">
                    Close
                </button>
            </div>
        `;
    }

    /**
     * Get booking status class for styling
     */
    getBookingStatusClass(status) {
        const statusMap = {
            'pending': 'status-pending',
            'scheduled': 'status-pending',
            'confirmed': 'status-confirmed',
            'completed': 'status-completed',
            'cancelled': 'status-cancelled'
        };
        return statusMap[status] || 'status-default';
    }

    /**
     * Get booking status text
     */
    getBookingStatusText(status) {
        const statusMap = {
            'pending': 'Pending',
            'scheduled': 'Scheduled',
            'confirmed': 'Confirmed',
            'completed': 'Completed',
            'cancelled': 'Cancelled'
        };
        return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
    }

    /**
     * Show booking modal
     */
    showBookingModal(content, isLoading = false, bookingData = null) {
        // Create modal if it doesn't exist
        let modal = document.getElementById('booking-details-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'booking-details-modal';
            modal.className = 'booking-modal';
            document.body.appendChild(modal);

            // Close on backdrop click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideBookingModal();
                }
            });
        }

        this.currentBooking = bookingData;

        if (isLoading) {
            modal.innerHTML = `
                <div class="booking-modal-content loading">
                    <div class="spinner"></div>
                    <p>${content}</p>
                </div>
            `;
        } else {
            modal.innerHTML = `
                <div class="booking-modal-content">
                    ${content}
                </div>
            `;
        }

        modal.style.display = 'flex';
    }

    /**
     * Hide booking modal
     */
    hideBookingModal() {
        const modal = document.getElementById('booking-details-modal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.currentBooking = null;
    }

    /**
     * Confirm booking
     */
    async confirmBooking(bookingId) {
        try {
            // Show loading state in modal
            this.showBookingActionLoading('Confirming booking...');

            const response = await api.confirmBooking(bookingId);
            if (response && response.success) {
                this.showSuccess('Booking confirmed successfully');
                this.hideBookingModal();
                this.refreshNotifications();
            } else {
                this.showError('Failed to confirm booking');
                this.hideBookingActionLoading();
            }
        } catch (error) {
            console.error('Error confirming booking:', error);
            this.showError('Failed to confirm booking');
            this.hideBookingActionLoading();
        }
    }

    /**
     * Cancel booking
     */
    async cancelBooking(bookingId) {
        try {
            // Show loading state in modal
            this.showBookingActionLoading('Cancelling booking...');

            const response = await api.deleteBooking(bookingId);
            if (response && response.success) {
                this.showSuccess('Booking cancelled successfully');
                this.hideBookingModal();
                this.refreshNotifications();
            } else {
                this.showError('Failed to cancel booking');
                this.hideBookingActionLoading();
            }
        } catch (error) {
            console.error('Error cancelling booking:', error);
            this.showError('Failed to cancel booking');
            this.hideBookingActionLoading();
        }
    }

    /**
     * Show booking action loading overlay
     */
    showBookingActionLoading(message = 'Processing...') {
        const modal = document.getElementById('booking-details-modal');
        if (modal) {
            // Add loading overlay to modal
            let overlay = modal.querySelector('.booking-action-loading-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'booking-action-loading-overlay';
                overlay.innerHTML = `
                    <div class="booking-action-loading-content">
                        <div class="spinner"></div>
                        <p>${message}</p>
                    </div>
                `;
                modal.appendChild(overlay);
            } else {
                overlay.querySelector('p').textContent = message;
                overlay.style.display = 'flex';
            }
        }
    }

    /**
     * Hide booking action loading overlay
     */
    hideBookingActionLoading() {
        const modal = document.getElementById('booking-details-modal');
        if (modal) {
            const overlay = modal.querySelector('.booking-action-loading-overlay');
            if (overlay) {
                overlay.style.display = 'none';
            }
        }
    }

    /**
     * Delete notification
     */
    async deleteNotification(notificationId) {
        this.showConfirmationDialog(
            this.translations.deleteNotificationTitle,
            this.translations.deleteNotificationMessage,
            async () => {
                try {
                    const response = await api.deleteNotification(notificationId);
                    if (response && response.success) {
                        this.showSuccess(this.translations.notificationDeleted);
                        this.refreshNotifications();
                    } else {
                        this.showError(this.translations.failedToDelete);
                    }
                } catch (error) {
                    console.error('Error deleting notification:', error);
                    this.showError(this.translations.failedToDelete);
                }
            }
        );
    }

    /**
     * Handle mark all as read
     */
    async handleMarkAllRead() {
        if (this.unreadCount === 0) {
            this.showError(this.translations.noUnreadNotifications);
            return;
        }

        this.showConfirmationDialog(
            this.translations.markAllAsReadTitle,
            this.translations.markAllAsReadMessage,
            async () => {
                try {
                    const response = await api.markAllNotificationsAsRead();
                    if (response && response.success) {
                        this.showSuccess(this.translations.allMarkedAsRead);
                        this.refreshNotifications();
                    } else {
                        this.showError(this.translations.failedToMarkAllAsRead);
                    }
                } catch (error) {
                    console.error('Error marking all notifications as read:', error);
                    this.showError(this.translations.failedToMarkAllAsRead);
                }
            }
        );
    }

    /**
     * Show confirmation dialog
     */
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
    }

    /**
     * Hide confirmation dialog
     */
    hideConfirmationDialog() {
        const dialog = document.getElementById('confirmation-dialog');
        if (dialog) {
            dialog.style.display = 'none';
        }
        this.pendingAction = null;
    }

    /**
     * Show error message
     */
    showError(message) {
        this.showAlert(message, 'error');
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        this.showAlert(message, 'success');
    }

    /**
     * Show alert message
     */
    showAlert(message, type = 'info') {
        const alertContainer = document.getElementById('alert-container');
        if (alertContainer) {
            const alert = document.createElement('div');
            alert.className = `alert alert-${type}`;
            alert.innerHTML = `
                <span>${message}</span>
                <button class="alert-close" onclick="this.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            `;
            alertContainer.appendChild(alert);

            // Auto-remove after 5 seconds
            setTimeout(() => {
                if (alert.parentElement) {
                    alert.remove();
                }
            }, 5000);
        }
    }
}

// Initialize notifications manager when DOM is ready
let notificationsManager;
document.addEventListener('DOMContentLoaded', function() {
    if (typeof NotificationsDataTable !== 'undefined') {
        notificationsManager = new NotificationsDataTable();
        notificationsManager.init();
    }
});

