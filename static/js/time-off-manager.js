// Time Off Manager - Handles time off functionality
const TimeOffManager = (() => {
    // Initialize time off form
    const initTimeOffForm = () => {
        // Set up close button
        const closeBtn = document.getElementById('time-off-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                document.getElementById('time-off-panel').classList.remove('active');
            });
        }

        // Set up form submission
        const form = document.getElementById('time-off-form');
        if (form) {
            form.addEventListener('submit', handleTimeOffSubmit);
        }
    };

    // Handle time off form submission
    const handleTimeOffSubmit = (e) => {
        e.preventDefault();

        const startDate = document.getElementById('time-off-start-date').value;
        const endDate = document.getElementById('time-off-end-date').value;
        const startTime = document.getElementById('time-off-start-time').value;
        const endTime = document.getElementById('time-off-end-time').value;
        const staffId = document.getElementById('time-off-staff').value;
        const reason = document.getElementById('time-off-reason').value;

        // Validate inputs
        if (!startDate || !endDate || !startTime || !endTime || !staffId) {
            Utils.showMessage('Please fill in all required fields', 'error');
            return;
        }

        // Create time off data
        const timeOffData = {
            start_time: `${startDate}T${startTime}:00Z`,
            end_time: `${endDate}T${endTime}:00Z`,
            user_id: staffId,
            reason: reason || 'Time off'
        };

        // Submit to API
        BookingService.submitTimeOff(timeOffData);
    };

    // Clear time off form
    const clearTimeOffForm = () => {
        const form = document.getElementById('time-off-form');
        if (form) form.reset();
    };

    return {
        initTimeOffForm,
        handleTimeOffSubmit,
        clearTimeOffForm
    };
})();

// Export the TimeOffManager module
window.TimeOffManager = TimeOffManager;
