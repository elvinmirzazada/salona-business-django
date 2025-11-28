// API Configuration - Updated to use Django proxy for HTTP-only cookie support
const API_CONFIG = {
    // Use Django proxy for all API calls to handle HTTP-only cookies properly
    BASE_URL: window.location.origin + '/users/api',

    // External API URL for direct calls (used in booking page and other public pages)
    EXTERNAL_API_URL: window.location.protocol === 'https:'
        ? 'https://api.salona.app'
        : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
            ? 'http://localhost:8000'
            : window.location.origin,

    // WebSocket URL
    WS_URL: window.location.protocol === 'https:'
        ? 'wss://' + window.location.host
        : 'ws://' + window.location.host
};

// Use Django proxy for authenticated API calls
const API_BASE_URL = API_CONFIG.BASE_URL;

// Use external API for public/unauthenticated calls
const EXTERNAL_API_URL = API_CONFIG.EXTERNAL_API_URL;

// WebSocket URL
const WS_BASE_URL = API_CONFIG.WS_URL;

// Export for use in other files
window.API_BASE_URL = API_BASE_URL;
window.EXTERNAL_API_URL = EXTERNAL_API_URL;
window.WS_BASE_URL = WS_BASE_URL;
