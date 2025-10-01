// Login functionality
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');

    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('error-message');

            // Clear any previous error messages
            errorDiv.style.display = 'none';
            errorDiv.textContent = '';

            // Make API call to login endpoint
            fetch('http://127.0.0.1:8000/api/v1/users/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                mode: 'cors', // Explicitly set CORS mode
                body: JSON.stringify({
                    email: email,
                    password: password
                })
                // Remove credentials: 'include' to avoid preflight complexity
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Store access token in localStorage for later use
                    localStorage.setItem('accessToken', data.data.access_token);
                    localStorage.setItem('tokenType', data.data.token_type);
                    localStorage.setItem('tokenExpiresIn', Date.now() + (data.data.expires_in * 1000));

                    // Redirect to dashboard or home page
                    window.location.href = '/dashboard/';
                } else {
                    // Display error message
                    errorDiv.textContent = data.message || 'Login failed. Please check your credentials.';
                    errorDiv.style.display = 'block';
                }
            })
            .catch(error => {
                errorDiv.textContent = 'An error occurred. Please try again later.';
                errorDiv.style.display = 'block';
                console.error('Login error:', error);
            });
        });
    }
});
