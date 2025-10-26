// Authentication and user related functions
const Auth = (() => {
    // Authentication header creator for API requests - Updated for HTTP-only cookies
    const getAuthHeader = () => {
        // No longer need to get token from localStorage since it's in HTTP-only cookie
        return {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
    };


    // Logout functionality - Updated for HTTP-only cookies
    const setupLogout = () => {
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                performLogout();
            });
        }
    };

    // Enhanced logout function
    const performLogout = async () => {
        try {
            const response = await fetch('/users/logout/', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                credentials: 'include'
            });

            console.log('Logout API response:', response.status);
        } catch (error) {
            console.error('Logout API call failed:', error);
        } finally {
            // Always redirect to login regardless of API response
            window.location.href = '/users/login/';
        }
    };

    // Helper function to get CSRF token
    const getCookie = (name) => {
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
    };

    // Initialize user data
    const init = async () => {
        // Check current page to determine what to initialize
        const currentPath = window.location.pathname;

        // Set up different functionality based on the current page
        if (currentPath.includes('/login/') || currentPath.includes('/signup/')) {
            // On login or signup pages, no need to fetch user data
            // Just set up the forms as needed
            setupLoginForm();
            setupSignupForm();
        } else {
            // On authenticated pages like dashboard, we rely on server-side authentication
            // The Django view already checked authentication and redirected if needed
            // No additional client-side authentication check required here
            console.log('Dashboard page loaded, authentication handled by Django');
        }
    };

    // Setup login form if it exists
    const setupLoginForm = () => {
        const loginForm = document.getElementById('login-form');
        if (!loginForm) return;

        // Login form setup logic here if needed
    };

    // Function to fetch data from API with authorization - Updated for HTTP-only cookies
    const fetchData = async (url) => {
        try {
            const response = await fetch(url, {
                method: 'GET',
                credentials: 'include', // Include HTTP-only cookies
            });

            if (!response.ok) {
                // If unauthorized, redirect to login
                if (response.status === 401) {
                    window.location.href = '/users/login/';
                    return null;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            return null;
        }
    };

    // Setup signup form submission
    const setupSignupForm = () => {
        const signupForm = document.getElementById('signup-form');
        if (!signupForm) return;

        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Clear previous error messages
            const errorMessageElement = document.getElementById('error-message');
            errorMessageElement.style.display = 'none';
            errorMessageElement.textContent = '';

            // Show spinner
            const signupSpinner = document.getElementById('signup-spinner');
            if (signupSpinner) {
                signupSpinner.style.display = 'block';
            }

            // Add loading class to button instead of disabling it
            const submitBtn = signupForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.classList.add('btn-loading');
            }

            // Get form values
            const firstName = document.getElementById('first-name').value.trim();
            const lastName = document.getElementById('last-name').value.trim();
            const email = document.getElementById('email').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            // Function to hide spinner and remove loading class
            const hideSpinner = () => {
                if (signupSpinner) {
                    signupSpinner.style.display = 'none';
                }
                if (submitBtn) {
                    submitBtn.classList.remove('btn-loading');
                }
            };

            // Validate form
            if (!firstName || !lastName || !email || !phone || !password) {
                showError('Please fill in all required fields.');
                hideSpinner();
                return;
            }

            // Validate email format
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(email)) {
                showError('Please enter a valid email address.');
                hideSpinner();
                return;
            }

            // Validate passwords match
            if (password !== confirmPassword) {
                showError('Passwords do not match.');
                hideSpinner();
                return;
            }

            try {
                // Get CSRF token from the form
                const csrfToken = signupForm.querySelector('input[name="csrfmiddlewaretoken"]').value;

                // Submit form data to API with credentials for HTTP-only cookies
                const response = await fetch(`${API_BASE_URL}/api/v1/users/auth/signup`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': csrfToken
                    },
                    credentials: 'include', // Include HTTP-only cookies
                    body: JSON.stringify({
                        first_name: firstName,
                        last_name: lastName,
                        email: email,
                        phone: phone,
                        password: password
                    })
                });

                const data = await response.json();

                // Hide spinner after getting response
                hideSpinner();

                if (!response.ok) {
                    // Handle API errors
                    let errorMessage = 'Registration failed. Please try again.';
                    if (data && data.message) {
                        errorMessage = data.message;
                    } else if (data && data.error) {
                        errorMessage = data.error;
                    }
                    showError(errorMessage);
                    return;
                }

                // Registration successful - tokens are now in HTTP-only cookies
                // No need to store in localStorage
                // Redirect to dashboard
                window.location.href = '/users/dashboard/';

            } catch (error) {
                // Hide spinner in case of error
                hideSpinner();
                console.error('Registration failed:', error);
                showError('An error occurred during registration. Please try again.');
            }
        });
    };

    // Helper to show error messages
    const showError = (message) => {
        const errorMessageElement = document.getElementById('error-message');
        if (errorMessageElement) {
            errorMessageElement.textContent = message;
            errorMessageElement.style.display = 'block';
        }
    };

    // Expose public methods
    return {
        init,
        getAuthHeader,  // <-- Expose getAuthHeader method
        fetchData
    };
})();

// Export the Auth module
window.Auth = Auth;

// Initialize Auth on DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    Auth.init();
});
