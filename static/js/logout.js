// Logout functionality - Updated for HTTP-only cookies
document.addEventListener('DOMContentLoaded', function() {
    // Enhanced logout function that calls the API
    const performLogout = async () => {
        try {
            // Call the logout API endpoint with HTTP-only cookies
            const response = await fetch(`${API_BASE_URL}/api/v1/users/auth/logout`, {
                method: 'PUT',
                credentials: 'include', // Include HTTP-only cookies
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            console.log('Logout response:', data);
        } catch (error) {
            console.error('Logout API call failed:', error);
            // Continue with logout even if API fails
        } finally {
            // Backend will clear HTTP-only cookies automatically
            // Just redirect to login page
            window.location.href = '/users/login/';
        }
    };

    // Set up logout button click handler
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            performLogout();
        });
    }

    // Set up any logout links in navigation
    const logoutLinks = document.querySelectorAll('a[href*="logout"]');
    logoutLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            performLogout();
        });
    });
});
