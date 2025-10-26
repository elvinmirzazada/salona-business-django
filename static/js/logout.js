// Logout functionality - Updated for Django proxy
document.addEventListener('DOMContentLoaded', function() {
    // Enhanced logout function that calls the Django proxy
    const performLogout = async () => {
        try {
            // Call the Django logout proxy endpoint
            const response = await fetch('/users/logout/', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                credentials: 'include'
            });

            const data = await response.json();
            console.log('Logout response:', data);
        } catch (error) {
            console.error('Logout API call failed:', error);
            // Continue with logout even if API fails
        } finally {
            // Redirect to login page
            window.location.href = '/users/login/';
        }
    };

    // Helper function to get CSRF token
    function getCookie(name) {
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

    // Handle logout from sidebar navigation
    window.handleLogout = function(event) {
        event.preventDefault();
        if (confirm('Are you sure you want to logout?')) {
            performLogout();
        }
    };

    // Expose performLogout globally for other scripts to use
    window.performLogout = performLogout;
});
