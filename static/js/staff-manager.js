// Staff management functionality
const StaffManager = (() => {
    let allStaffMembers = [];
    let selectedStaffId = null;

    // Handle staff filter dropdown change
    const handleStaffFilterChange = (event) => {
        const selectedValue = event.target.value;

        if (selectedValue === 'all') {
            selectedStaffId = null;
        } else {
            selectedStaffId = selectedValue;
        }

        // Refresh calendar with selected staff filter
        if (window.Calendar && typeof window.Calendar.refreshCalendar === 'function') {
            window.Calendar.refreshCalendar({
                selectedStaffIds: selectedStaffId ? [selectedStaffId] : null
            });
        }
    };

    // Setup filter dropdown when page loads
    const setupStaffFilter = () => {
        const staffFilterDropdown = document.getElementById('staff-filter');
        if (!staffFilterDropdown) return;

        staffFilterDropdown.addEventListener('change', handleStaffFilterChange);
    };

    // Get the selected staff ID
    const getSelectedStaffId = () => {
        return selectedStaffId;
    };

    return {
        setupStaffFilter,
        getSelectedStaffId
    };
})();

// Export the StaffManager module
window.StaffManager = StaffManager;
