// API Configuration - Updated to use Django proxy for HTTP-only cookie support
const API_CONFIG = {
    // Use Django proxy for all API calls to handle HTTP-only cookies properly
    BASE_URL: window.location.origin + '/users/api',

    // Keep external URL for reference but don't use it directly
    EXTERNAL_API_URL: window.location.protocol === 'https:'
        ? 'https://api.salona.app'
        : 'http://localhost:8000'
};

// Use Django proxy for all API calls
const API_BASE_URL = API_CONFIG.BASE_URL;

// Export for use in other files
window.API_BASE_URL = API_BASE_URL;
