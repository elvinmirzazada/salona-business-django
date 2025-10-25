// Login page functionality - Updated for HTTP-only cookies
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already authenticated via API call instead of localStorage
    // checkAuthStatus();

    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');
    const loginSpinner = document.getElementById('login-spinner');
    const loginFormSpinner = document.getElementById('login-form-spinner');

    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            // Clear previous error messages
            errorMessage.style.display = 'none';
            errorMessage.textContent = '';

            // Show both spinners
            loginFormSpinner.style.display = 'block';

            // Add loading class to button
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            submitBtn.classList.add('btn-loading');

            // Get form values
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            // Validate input
            if (!email || !password) {
                showError('Please enter both email and password.');
                hideSpinners();
                return;
            }

            // Prepare login data
            const loginData = {
                email: email,
                password: password
            };

            try {
                // Send login request with credentials to include cookies
                const response = await fetch(`${API_BASE_URL}/api/v1/users/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    credentials: 'include', // Important: Include cookies in request
                    body: JSON.stringify(loginData)
                });
                
                const data = await response.json();
                hideSpinners();

                if (!response.ok) {
                    // Handle error response
                    const errorMsg = data.message || 'Login failed. Please check your credentials.';
                    showError(errorMsg);
                    return;
                }

                // No need to store tokens in localStorage - they're in HTTP-only cookies
                // Just redirect to dashboard
                console.log(data);
                window.location.href = '/users/dashboard/';

            } catch (error) {
                // Hide spinners in case of error
                hideSpinners();
                showError('Network error. Please try again later.');
            }
        });
    }

    // Check if user is already authenticated by calling a protected endpoint
    async function checkAuthStatus() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/users/me`, {
                method: 'GET',
                credentials: 'include' // Include HTTP-only cookies
            });

            if (response.ok) {
                // User is authenticated, redirect to dashboard
                window.location.href = '/users/dashboard/';
            }
        } catch (error) {
            // User not authenticated, stay on login page
            console.log('User not authenticated');
        }
    }

    // Helper function to show error messages
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }

    // Helper function to hide all spinners and remove loading class
    function hideSpinners() {
        loginFormSpinner.style.display = 'none';
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        submitBtn.classList.remove('btn-loading');
    }
});
