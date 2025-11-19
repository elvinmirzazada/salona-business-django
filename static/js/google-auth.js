/**
 * Google Authentication Handler
 * Handles Google OAuth login and signup flows
 */

class GoogleAuth {
    constructor() {
        this.authEndpoint = '/users/api/v1/users/auth/google/authorize';
    }

    /**
     * Initiate Google OAuth flow
     * Calls the authorization endpoint and redirects to Google
     */
    async authorize() {
        try {
            const response = await fetch(this.authEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRFToken': this.getCookie('csrftoken')
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.authorization_url) {
                // Store state for verification if needed
                if (data.state) {
                    // Store in sessionStorage for client-side access
                    sessionStorage.setItem('google_auth_state', data.state);
                    // Also store in cookie so Django can access it
                    this.setCookie('google_oauth_state', data.state, 10); // 10 minutes expiry
                }
                
                // Redirect to Google authorization URL
                window.location.href = data.authorization_url;
            } else {
                throw new Error('No authorization URL received');
            }

        } catch (error) {
            console.error('Google authorization failed:', error);
            this.showError('Failed to initiate Google login. Please try again.');
        }
    }

    /**
     * Get CSRF token from cookies
     */
    getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    /**
     * Set a cookie
     */
    setCookie(name, value, minutes) {
        const date = new Date();
        date.setTime(date.getTime() + (minutes * 60 * 1000));
        const expires = "expires=" + date.toUTCString();
        document.cookie = name + "=" + value + ";" + expires + ";path=/;SameSite=Lax";
    }

    /**
     * Show error message to user
     */
    showError(message) {
        // Check if there's an error display element
        const errorElement = document.getElementById('error-message') || 
                           document.querySelector('.alert-danger');
        
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                errorElement.style.display = 'none';
            }, 5000);
        } else {
            alert(message);
        }
    }

    /**
     * Setup Google button click handlers
     */
    setupGoogleButtons() {
        const googleButtons = document.querySelectorAll('.google-btn');
        
        googleButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.authorize();
            });
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const googleAuth = new GoogleAuth();
    googleAuth.setupGoogleButtons();
});

// Export for use in other modules
window.GoogleAuth = GoogleAuth;
