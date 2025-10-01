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
        const userData = await fetchCurrentUser();
        updateUserInfo(userData);
        setupLogout();
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

    return {
        init,
        getAuthHeader,
        fetchCurrentUser,
        fetchData
    };
})();

// Export the Auth module
window.Auth = Auth;
