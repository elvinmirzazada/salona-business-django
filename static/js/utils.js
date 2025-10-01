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
    const formatDisplayDate = (date) => {
        const options = { weekday: 'short', month: 'short', day: 'numeric' };
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

    return {
        formatDate,
        formatDisplayDate,
        formatTime,
        showMessage,
        toggleSpinner
    };
})();

// Export the Utils module
window.Utils = Utils;
