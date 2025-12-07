// Utilities for date formatting and manipulation
const Utils = (() => {
    // Format date as YYYY-MM-DD
    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Format date for display
    const formatDisplayDate = (date, options) => {
        // const options = { weekday: 'short', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    };

    // Format time for display
    const formatTime = (hours, minutes) => {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    };

    // Show UI message (success or error)
    const showMessage = (message, type = 'success', timeout = 5000) => {
        const messageBox = document.getElementById('booking-message');
        if (!messageBox) return;

        // Set message content and style
        messageBox.textContent = message;
        
        if (type === 'success') {
            messageBox.style.background = '#e6f9ec';
            messageBox.style.color = '#218838';
            messageBox.style.border = '1px solid #218838';
        } else {
            messageBox.style.background = '#fbeaea';
            messageBox.style.color = '#c82333';
            messageBox.style.border = '1px solid #c82333';
        }
        
        // Display message
        messageBox.style.display = 'block';

        // Auto-hide message after specified timeout
        setTimeout(() => {
            if (messageBox.textContent === message) {
                messageBox.style.display = 'none';
            }
        }, timeout);
    };

    // Toggle spinner visibility
    const toggleSpinner = (show) => {
        const spinner = document.getElementById('booking-spinner');
        if (spinner) {
            spinner.style.display = show ? 'flex' : 'none';
        }
    };

    /**
     * Convert a local datetime string or Date object to UTC ISO format
     * @param {string|Date} localDateTime - Local datetime in format 'YYYY-MM-DD HH:mm' or Date object
     * @returns {string} UTC datetime in ISO format (YYYY-MM-DDTHH:mm:ssZ)
     */
    const convertToUTC = (localDateTime) => {
        if (!localDateTime) return null;

        let date;

        // If it's a string, parse it
        if (typeof localDateTime === 'string') {
            // Handle format: "YYYY-MM-DD HH:mm" or "YYYY-MM-DDTHH:mm"
            const cleanStr = localDateTime.replace(' ', 'T');
            date = new Date(cleanStr);
        } else if (localDateTime instanceof Date) {
            date = new Date(localDateTime);
        } else {
            return null;
        }

        // Check if date is valid
        if (isNaN(date.getTime())) {
            console.warn('Invalid date provided to convertToUTC:', localDateTime);
            return null;
        }

        // Convert to UTC ISO string
        return date.toISOString();
    };

    /**
     * Convert UTC datetime string to local timezone aware datetime string
     * @param {string} utcDateTime - UTC datetime in ISO format
     * @returns {string} Local datetime in format 'YYYY-MM-DD HH:mm'
     */
    const convertFromUTC = (utcDateTime) => {
        if (!utcDateTime) return null;

        const date = new Date(utcDateTime);

        // Check if date is valid
        if (isNaN(date.getTime())) {
            console.warn('Invalid UTC datetime provided to convertFromUTC:', utcDateTime);
            return null;
        }

        // Convert to local timezone
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}`;
    };

    /**
     * Get browser's timezone offset in minutes
     * @returns {number} Timezone offset in minutes (negative for west of UTC)
     */
    const getTimezoneOffset = () => {
        return new Date().getTimezoneOffset();
    };

    /**
     * Get browser's timezone name (e.g., 'America/New_York')
     * @returns {string} Timezone name
     */
    const getTimezone = () => {
        try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone;
        } catch (e) {
            return 'UTC';
        }
    };

    /**
     * Recursively convert all time-related parameters in an object to UTC format
     * Looks for common time field names and converts them
     * @param {Object} data - Data object to convert
     * @returns {Object} New object with UTC-converted time parameters
     */
    const convertTimeParamsToUTC = (data) => {
        if (!data || typeof data !== 'object') {
            return data;
        }

        // List of common time field names that should be converted to UTC
        const timeFieldPatterns = [
            /^(start|begin|from).*time$/i,
            /^(end|to).*time$/i,
            /^(start|begin|from).*date.*time$/i,
            /^(end|to).*date.*time$/i,
            /^(scheduled|appointment|booking).*time$/i,
            /^(start|begin|from)_date_time$/i,
            /^(end|to)_date_time$/i,
            /^start_at$/i,
            /^end_at$/i,
            /^started_at$/i,
            /^ended_at$/i,
            /^created_at$/i,
            /^updated_at$/i,
            /^datetime$/i,
            /^date_time$/i
        ];

        const isTimeField = (fieldName) => {
            return timeFieldPatterns.some(pattern => pattern.test(fieldName));
        };

        // Create a deep copy to avoid mutating the original data
        const convertedData = JSON.parse(JSON.stringify(data));

        // Recursively process the object
        const processObject = (obj) => {
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    const value = obj[key];

                    if (value === null || value === undefined) {
                        continue;
                    }

                    // If it's an array, process each element
                    if (Array.isArray(value)) {
                        obj[key] = value.map(item => {
                            if (typeof item === 'object' && item !== null) {
                                return processObject(item);
                            }
                            return item;
                        });
                    }
                    // If it's a nested object, recurse
                    else if (typeof value === 'object') {
                        obj[key] = processObject(value);
                    }
                    // If it's a time field with string value, convert to UTC
                    else if (isTimeField(key) && typeof value === 'string') {
                        const converted = convertToUTC(value);
                        if (converted) {
                            obj[key] = converted;
                        }
                    }
                }
            }
            return obj;
        };

        return processObject(convertedData);
    };

    /**
     * Recursively convert all UTC time parameters in response data to local timezone
     * @param {Object} data - Response data object to convert
     * @returns {Object} New object with timezone-aware time parameters
     */
    const convertTimeResponseToLocal = (data) => {
        if (!data || typeof data !== 'object') {
            return data;
        }

        const timeFieldPatterns = [
            /^(start|begin|from).*time$/i,
            /^(end|to).*time$/i,
            /^(start|begin|from).*date.*time$/i,
            /^(end|to).*date.*time$/i,
            /^(scheduled|appointment|booking).*time$/i,
            /^(start|begin|from)_date_time$/i,
            /^(end|to)_date_time$/i,
            /^start_at$/i,
            /^end_at$/i,
            /^started_at$/i,
            /^ended_at$/i,
            /^created_at$/i,
            /^updated_at$/i,
            /^datetime$/i,
            /^date_time$/i
        ];

        const isTimeField = (fieldName) => {
            return timeFieldPatterns.some(pattern => pattern.test(fieldName));
        };

        // ISO 8601 regex pattern
        const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

        // Create a deep copy to avoid mutating the original data
        const convertedData = JSON.parse(JSON.stringify(data));

        // Recursively process the object
        const processObject = (obj) => {
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    const value = obj[key];

                    if (value === null || value === undefined) {
                        continue;
                    }

                    // If it's an array, process each element
                    if (Array.isArray(value)) {
                        obj[key] = value.map(item => {
                            if (typeof item === 'object' && item !== null) {
                                return processObject(item);
                            }
                            return item;
                        });
                    }
                    // If it's a nested object, recurse
                    else if (typeof value === 'object') {
                        obj[key] = processObject(value);
                    }
                    // If it's a time field with ISO string value, convert from UTC
                    else if (isTimeField(key) && typeof value === 'string' && isoDateRegex.test(value)) {
                        const converted = convertFromUTC(value);
                        if (converted) {
                            obj[key] = converted;
                        }
                    }
                }
            }
            return obj;
        };

        return processObject(convertedData);
    };

    return {
        formatDate,
        formatDisplayDate,
        formatTime,
        showMessage,
        toggleSpinner,
        convertToUTC,
        convertFromUTC,
        getTimezoneOffset,
        getTimezone,
        convertTimeParamsToUTC,
        convertTimeResponseToLocal
    };
})();

// Export the Utils module
window.Utils = Utils;
