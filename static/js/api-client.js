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
    }

    /**
     * Make a request with proper error handling
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
                window.location.href = '/users/login/';
                return null;
            }

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

        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
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
        return this.request('/users/api/v1/companies/users');
    }

    async createStaff(staffData) {
        return this.request('/users/api/v1/companies/members', {
            method: 'POST',
            body: JSON.stringify(staffData)
        });
    }

    async updateStaff(staffId, staffData) {
        return this.request(`/users/api/v1/companies/users/${staffId}`, {
            method: 'PUT',
            body: JSON.stringify(staffData)
        });
    }

    async deleteStaff(staffId) {
        return this.request(`/users/api/v1/companies/users/${staffId}`, {
            method: 'DELETE'
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
        return this.request(`/users/api/v1/notifications/${notificationId}/read`, {
            method: 'PUT'
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
        return this.request(`/users/api/v1/users/time-offs/${timeOffId}`, {
            method: 'PUT',
            body: JSON.stringify(timeOffData)
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
        return this.request('/users/api/v1/bookings/users/create_booking', {
            method: 'POST',
            body: JSON.stringify(bookingData)
        });
    }

    async updateBooking(bookingId, bookingData) {
        return this.request(`/users/api/v1/bookings/${bookingId}`, {
            method: 'PUT',
            body: JSON.stringify(bookingData)
        });
    }

    async deleteBooking(bookingId) {
        return this.request(`/users/api/v1/bookings/${bookingId}`, {
            method: 'DELETE'
        });
    }

    async confirmBooking(bookingId) {
        return this.request(`/users/api/v1/bookings/${bookingId}/confirm`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'confirmed' })
        });
    }

    async getCompanyServices(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = `/users/api/v1/companies/services${queryString ? '?' + queryString : ''}`;
        return this.request(url);
    }

    async createService(serviceData) {
        return this.request('/users/api/v1/services', {
            method: 'POST',
            body: JSON.stringify(serviceData)
        });
    }

    async updateService(serviceId, serviceData) {
        return this.request(`/users/api/v1/services/${serviceId}`, {
            method: 'PUT',
            body: JSON.stringify(serviceData)
        });
    }

    async deleteService(serviceId) {
        return this.request(`/users/api/v1/services/${serviceId}`, {
            method: 'DELETE'
        });
    }

    async getCategories(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = `/users/api/v1/services/companies/categories${queryString ? '?' + queryString : ''}`;
        return this.request(url);
    }

    async createCategory(categoryData) {
        return this.request('/users/api/v1/services/categories', {
            method: 'POST',
            body: JSON.stringify(categoryData)
        });
    }

    async updateCategory(categoryId, categoryData) {
        return this.request(`/users/api/v1/categories/${categoryId}`, {
            method: 'PUT',
            body: JSON.stringify(categoryData)
        });
    }

    async deleteCategory(categoryId) {
        return this.request(`/users/api/v1/categories/${categoryId}`, {
            method: 'DELETE'
        });
    }

    async getCustomers(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = `/users/api/v1/companies/customers${queryString ? '?' + queryString : ''}`;
        return this.request(url);
    }

    async updateUserProfile(userData) {
        return this.request('/users/api/v1/users/profile', {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    }

    async addTelegramBot(data) {
        return this.request('/customers/api/v1/integrations/telegram', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async getTelegramBot() {
        return this.request('/customers/api/v1/integrations/telegram');
    }

    // Helper methods for common operations
    async refreshData() {
        try {
            const [user, staff, notifications, timeOffs] = await Promise.all([
                this.getCurrentUser(),
                this.getStaff(),
                this.getUnreadNotificationsCount(),
                this.getTimeOffs({
                    start_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
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

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIClient;
}
