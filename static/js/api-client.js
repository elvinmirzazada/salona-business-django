/**
 * API Client for Salona Business Django App
 * Handles both Django views and external API calls through the proxy
 */

class APIClient {
    constructor() {
        this.baseURL = '';
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };
        this.isRefreshing = false;
        this.refreshSubscribers = [];
    }

    /**
     * Add request to queue while token is being refreshed
     */
    subscribeTokenRefresh(callback) {
        this.refreshSubscribers.push(callback);
    }

    /**
     * Execute all queued requests after token refresh
     */
    onTokenRefreshed() {
        this.refreshSubscribers.forEach(callback => callback());
        this.refreshSubscribers = [];
    }

    /**
     * Attempt to refresh the access token
     */
    async refreshToken() {
        try {
            const response = await fetch('/users/api/v1/users/auth/refresh-token', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    return true;
                }
            }

            return false;
        } catch (error) {
            console.error('Token refresh failed:', error);
            return false;
        }
    }

    /**
     * Logout and clear all cookies
     */
    async performLogout() {
        try {
            // Call logout endpoint to clear cookies on server side
            await fetch('/users/logout/', {
                method: 'GET',
                credentials: 'include'
            });
        } catch (error) {
            console.error('Logout request failed:', error);
        }

        // Redirect to login page
        window.location.href = '/users/login/';
    }

    /**
     * Make a request with proper error handling and token refresh
     */
    async request(url, options = {}) {
        const config = {
            credentials: 'include', // Always include cookies
            headers: {
                ...this.defaultHeaders,
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            // Handle authentication errors
            if (response.status === 401) {
                // Try to get the response body to check for token expiration
                let shouldRefresh = false;
                try {
                    const errorData = await response.clone().json();
                    const detail = errorData.detail || '';

                    // Check if the error is due to expired access token
                    if (detail.includes('Access token has expired') ||
                        detail.toLowerCase().includes('access token has expired')) {
                        shouldRefresh = true;
                    }
                } catch (e) {
                    // If we can't parse the response, assume it's an auth error
                    shouldRefresh = true;
                }

                if (shouldRefresh) {
                    // If already refreshing, wait for it to complete
                    if (this.isRefreshing) {
                        return new Promise((resolve) => {
                            this.subscribeTokenRefresh(async () => {
                                // Retry the original request after token refresh
                                const retryResponse = await fetch(url, config);
                                resolve(this.handleResponse(retryResponse));
                            });
                        });
                    }

                    // Set refreshing flag
                    this.isRefreshing = true;

                    // Attempt to refresh the token
                    const refreshSuccess = await this.refreshToken();

                    if (refreshSuccess) {
                        // Token refreshed successfully, retry the original request
                        this.isRefreshing = false;
                        this.onTokenRefreshed();

                        const retryResponse = await fetch(url, config);
                        return this.handleResponse(retryResponse);
                    } else {
                        // Token refresh failed, logout
                        this.isRefreshing = false;
                        this.onTokenRefreshed();
                        await this.performLogout();
                        return null;
                    }
                } else {
                    // Not a token expiration error, just redirect to login
                    window.location.href = '/users/login/';
                    return null;
                }
            }

            return this.handleResponse(response);

        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    /**
     * Handle response parsing
     */
    async handleResponse(response) {
        // Handle other errors
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Try to parse JSON, fall back to text
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        } else {
            return await response.text();
        }
    }

    // Django View Endpoints
    async getDashboardData() {
        return this.request('/users/dashboard/');
    }

    async logout() {
        const response = await fetch('/users/logout/', {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.redirected) {
            window.location.href = response.url;
        }
    }

    // External API Endpoints (via proxy)
    async getCurrentUser() {
        return this.request('/users/api/v1/users/me');
    }

    async getStaff() {
        // Add cache-busting timestamp to prevent browser caching
        const url = `/users/api/v1/companies/users?_t=${Date.now()}`;
        return this.request(url, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
    }

    async createStaff(staffData) {
        return this.request('/users/api/v1/companies/members', {
            method: 'POST',
            body: JSON.stringify(staffData)
        });
    }

    async updateStaff(staffId, staffData) {
        return this.request(`/users/api/v1/companies/members/${staffId}`, {
            method: 'PUT',
            body: JSON.stringify(staffData)
        });
    }

    async deleteStaff(staffId) {
        return this.request(`/users/api/v1/companies/members/${staffId}`, {
            method: 'DELETE'
        });
    }

    async sendInvitation(invitationData) {
        return this.request('/users/api/v1/companies/invitations', {
            method: 'POST',
            body: JSON.stringify(invitationData)
        });
    }

    async getInvitations() {
        return this.request('/users/api/v1/companies/all/invitations');
    }

    async deleteInvitation(invitationId) {
        return this.request(`/users/api/v1/companies/invitations/${invitationId}`, {
            method: 'DELETE'
        });
    }

    async resendInvitation(invitationToken) {
        return this.request(`/users/api/v1/companies/invitations/${invitationToken}/resend`, {
            method: 'POST'
        });
    }

    async checkInvitation(invitationToken) {
        return this.request(`/users/api/v1/companies/invitations/${invitationToken}/check-and-join`, {
            method: 'POST'
        });
    }

    async acceptInvitation(invitationData) {
        return this.request('/users/api/v1/companies/invitations/accept', {
            method: 'POST',
            body: JSON.stringify(invitationData)
        });
    }

    async acceptInvitationWithSignup(invitationData) {
        return this.request('/users/api/v1/companies/invitations/accept', {
            method: 'POST',
            body: JSON.stringify(invitationData)
        });
    }

    async getNotifications(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = `/users/api/v1/notifications${queryString ? '?' + queryString : ''}`;
        return this.request(url);
    }

    async getUnreadNotificationsCount() {
        return this.request('/users/api/v1/notifications/unread-count');
    }

    async markNotificationAsRead(notificationId) {
        return this.request(`/users/api/v1/notifications/mark-as-read/${notificationId}`, {
            method: 'POST'
        });
    }

    async getTimeOffs(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = `/users/api/v1/users/time-offs${queryString ? '?' + queryString : ''}`;
        return this.request(url);
    }

    async createTimeOff(timeOffData) {
        return this.request('/users/api/v1/users/time-offs', {
            method: 'POST',
            body: JSON.stringify(timeOffData)
        });
    }

    async updateTimeOff(timeOffId, timeOffData) {
        // Ensure all time parameters are in UTC format
        const utcData = window.Utils ? window.Utils.convertTimeParamsToUTC(timeOffData) : timeOffData;
        return this.request(`/users/api/v1/users/time-offs/${timeOffId}`, {
            method: 'PUT',
            body: JSON.stringify(utcData)
        });
    }

    async deleteTimeOff(timeOffId) {
        return this.request(`/users/api/v1/users/time-offs/${timeOffId}`, {
            method: 'DELETE'
        });
    }

    async getBookings(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = `/users/api/v1/bookings${queryString ? '?' + queryString : ''}`;
        return this.request(url);
    }

    async getBookingById(bookingId) {
        return this.request(`/users/api/v1/bookings/${bookingId}`);
    }

    async createBooking(bookingData) {
        // Ensure all time parameters are in UTC format
        const utcData = window.Utils ? window.Utils.convertTimeParamsToUTC(bookingData) : bookingData;
        return this.request('/users/api/v1/bookings/users/create_booking', {
            method: 'POST',
            body: JSON.stringify(utcData)
        });
    }

    async updateBooking(bookingId, bookingData) {
        // Ensure all time parameters are in UTC format
        const utcData = window.Utils ? window.Utils.convertTimeParamsToUTC(bookingData) : bookingData;
        return this.request(`/users/api/v1/bookings/${bookingId}`, {
            method: 'PUT',
            body: JSON.stringify(utcData)
        });
    }

    async deleteBooking(bookingId) {
        return this.request(`/users/api/v1/bookings/${bookingId}`, {
            method: 'DELETE'
        });
    }

    async confirmBooking(bookingId) {
        return this.request(`/users/api/v1/bookings/${bookingId}/confirm`, {
            method: 'PUT'
        });
    }

    async completeBooking(bookingId) {
        return this.request(`/users/api/v1/bookings/${bookingId}/complete`, {
            method: 'PUT'
        });
    }

    async getCompanyServices(params = {}) {
        // Add cache-busting timestamp to prevent browser caching
        const cacheBuster = { _t: Date.now(), ...params };
        const queryString = new URLSearchParams(cacheBuster).toString();
        const url = `/users/api/v1/companies/services${queryString ? '?' + queryString : ''}`;
        return this.request(url, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
    }

    async createService(serviceData) {
        return this.request('/users/api/v1/services', {
            method: 'POST',
            body: JSON.stringify(serviceData)
        });
    }

    async updateService(serviceId, serviceData) {
        return this.request(`/users/api/v1/services/service/${serviceId}`, {
            method: 'PUT',
            body: JSON.stringify(serviceData)
        });
    }

    async deleteService(serviceId) {
        return this.request(`/users/api/v1/services/service/${serviceId}`, {
            method: 'DELETE'
        });
    }

    async getCategories(params = {}) {
        // Add cache-busting timestamp to prevent browser caching
        const cacheBuster = { _t: Date.now(), ...params };
        const queryString = new URLSearchParams(cacheBuster).toString();
        const url = `/users/api/v1/services/companies/categories${queryString ? '?' + queryString : ''}`;
        return this.request(url, {
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
    }

    async createCategory(categoryData) {
        return this.request('/users/api/v1/services/categories', {
            method: 'POST',
            body: JSON.stringify(categoryData)
        });
    }

    async updateCategory(categoryId, categoryData) {
        return this.request(`/users/api/v1/services/categories/${categoryId}`, {
            method: 'PUT',
            body: JSON.stringify(categoryData)
        });
    }

    async deleteCategory(categoryId) {
        return this.request(`/users/api/v1/services/categories/${categoryId}`, {
            method: 'DELETE'
        });
    }

    async getCustomers(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = `/users/api/v1/companies/customers${queryString ? '?' + queryString : ''}`;
        return this.request(url);
    }

    async getCustomerById(customerId) {
        return this.request(`/users/api/v1/customers/${customerId}`);
    }

    async createCustomer(customerData) {
        return this.request('/users/api/v1/customers', {
            method: 'POST',
            body: JSON.stringify(customerData)
        });
    }

    async updateCustomer(customerId, customerData) {
        return this.request(`/users/api/v1/customers/${customerId}`, {
            method: 'PUT',
            body: JSON.stringify(customerData)
        });
    }

    async deleteCustomer(customerId) {
        return this.request(`/users/api/v1/customers/${customerId}`, {
            method: 'DELETE'
        });
    }

    // Helper methods for common operations
    async refreshData() {
        try {
            // Calculate start date (3 days ago) properly
            const threeDaysAgo = new Date();
            threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
            const startDate = threeDaysAgo.toISOString().split('T')[0]; // Format: YYYY-MM-DD
            
            const [user, staff, notifications, timeOffs] = await Promise.all([
                this.getCurrentUser(),
                this.getStaff(),
                this.getUnreadNotificationsCount(),
                this.getTimeOffs({
                    start_date: startDate,
                    availability_type: 'weekly'
                })
            ]);

            return {
                user: user?.data,
                staff: staff?.data || [],
                unreadNotifications: notifications?.data?.unread_count || 0,
                timeOffs: timeOffs?.data || []
            };
        } catch (error) {
            console.error('Failed to refresh data:', error);
            return null;
        }
    }
}

// Create global instance
window.api = new APIClient();
console.log('API Client initialized and available as window.api');

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIClient;
}
