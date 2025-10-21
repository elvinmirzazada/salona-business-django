// API Configuration
const API_CONFIG = {
    BASE_URL: window.location.protocol === 'https:' 
        ? `https://${window.location.host}` 
        : `http://${window.location.host}`,
    
    // For development, you can override this
    DEV_BASE_URL: 'http://127.0.0.1:8000'
};

// Use development URL if we're on localhost, otherwise use current domain
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? API_CONFIG.DEV_BASE_URL 
    : API_CONFIG.BASE_URL;

// Export for use in other files
window.API_BASE_URL = API_BASE_URL;
