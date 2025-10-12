// Authentication and user related functions
const Auth = (() => {
    // Authentication header creator for API requests
    const getAuthHeader = () => {
        const accessToken = localStorage.getItem('accessToken');
        return {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        };
    };

    // Fetch current user information
    const fetchCurrentUser = async () => {
        try {
            const response = await fetch('http://127.0.0.1:8000/api/v1/users/me', {
                method: 'GET',
                headers: {
                    ...getAuthHeader(),
                    'Accept': 'application/json'
                },
                mode: 'cors' // Explicitly set CORS mode
            });

            if (!response.ok) {
                if (response.status === 401) {
                    // If unauthorized, redirect to login
                    localStorage.removeItem('accessToken');
                    window.location.href = '/users/login/';
                    return null;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.data; // Return the user data from the response
        } catch (error) {
            console.error('Error fetching user data:', error);
            return null;
        }
    };

    // Update the UI with user information
    const updateUserInfo = (userData) => {
        if (!userData) return;

        // Update the welcome message with user's name
        const userNameElement = document.querySelector('.user-name');
        if (userNameElement) {
            userNameElement.textContent = `Welcome, ${userData.first_name} ${userData.last_name}!`;
        }
    };

    // Logout functionality
    const setupLogout = () => {
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                localStorage.removeItem('accessToken');
                localStorage.removeItem('tokenType');
                localStorage.removeItem('tokenExpiresIn');
                window.location.href = '/users/login/';
            });
        }
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
            // On authenticated pages like dashboard, fetch user data
            const accessToken = localStorage.getItem('accessToken');
            if (accessToken) {
                const userData = await fetchCurrentUser();
                updateUserInfo(userData);
                setupLogout();
            } else {
                // No token, redirect to login
                window.location.href = '/users/login/';
            }
        }
    };

    // Setup login form if it exists
    const setupLoginForm = () => {
        const loginForm = document.getElementById('login-form');
        if (!loginForm) return;

        // Login form setup logic here if needed
    };

    // Function to fetch data from API with authorization
    const fetchData = async (url) => {
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: getAuthHeader(),
            });

            if (!response.ok) {
                // If unauthorized, redirect to login
                if (response.status === 401) {
                    localStorage.removeItem('accessToken');
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

                // Submit form data to API
                const response = await fetch('http://127.0.0.1:8000/api/v1/users/auth/signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': csrfToken
                    },
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

                // Registration successful, store token if returned
                if (data.data && data.data.access_token) {
                    localStorage.setItem('accessToken', data.data.access_token);
                    localStorage.setItem('tokenType', data.data.token_type || 'Bearer');
                    if (data.data.expires_in) {
                        localStorage.setItem('tokenExpiresIn', data.data.expires_in);
                    }
                }

                // Redirect to dashboard or show success message
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

    return {
        init,
        getAuthHeader,
        fetchCurrentUser,
        fetchData
    };
})();

// Export the Auth module
window.Auth = Auth;

// Initialize Auth on DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    Auth.init();
});
