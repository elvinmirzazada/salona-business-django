// Login page functionality
document.addEventListener('DOMContentLoaded', function() {
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
                // Send login request
                const response = await fetch('http://127.0.0.1:8000/api/v1/users/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(loginData)
                });

                console.log('Login response status:', response.status);
                
                const data = await response.json();
                console.log('Login response data:', data);

                // Hide spinners after response received
                hideSpinners();

                if (!response.ok) {
                    // Handle error response
                    const errorMsg = data.message || 'Login failed. Please check your credentials.';
                    showError(errorMsg);
                    return;
                }

                // Check if we have the access token
                if (data.data && data.data.access_token) {
                    // Store token in localStorage
                    localStorage.setItem('accessToken', data.data.access_token);
                    
                    // Store additional token info if available
                    if (data.data.token_type) {
                        localStorage.setItem('tokenType', data.data.token_type);
                    }
                    if (data.data.expires_in) {
                        localStorage.setItem('tokenExpiresIn', data.data.expires_in);
                    }
                    
                    // Redirect to dashboard
                    window.location.href = '/users/dashboard/';
                } else {
                    showError('Login successful, but no token received. Please try again.');
                }
            } catch (error) {
                // Hide spinners in case of error
                hideSpinners();
                console.error('Login error:', error);
                showError('Network error. Please try again later.');
            }
        });
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
