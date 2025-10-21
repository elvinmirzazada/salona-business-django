// Staff management functionality
const StaffManager = (() => {
    let allStaffMembers = [];
    let selectedStaffId = null;

    // Fetch staff members from API and populate the specified dropdown
    const loadStaffMembers = async (selectId = 'booking-worker') => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/companies/users`, {
                method: 'GET',
                headers: Auth.getAuthHeader(),
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const staffMembers = data.success ? data.data : [];

            // Store staff members in the module
            allStaffMembers = staffMembers;

            // Populate the specified staff members dropdown
            const workerDropdown = document.getElementById(selectId);

            if (!workerDropdown) {
                console.error(`Select element with ID "${selectId}" not found`);
                return staffMembers;
            }

            // Clear existing options except the first one
            while (workerDropdown.options.length > 1) {
                workerDropdown.options.remove(1);
            }

            // Add staff members to dropdown
            staffMembers.forEach(staffMember => {
                if (staffMember.user) {
                    const option = document.createElement('option');
                    option.value = staffMember.user.id;
                    option.textContent = `${staffMember.user.first_name} ${staffMember.user.last_name}`;
                    workerDropdown.appendChild(option);
                }
            });

            // Also populate the staff filter dropdown if it exists
            populateStaffFilterDropdown();

            return staffMembers;
        } catch (error) {
            console.error('Error fetching staff members:', error);
            return [];
        }
    };

    // Populate the staff filter dropdown with staff members
    const populateStaffFilterDropdown = () => {
        const staffFilterDropdown = document.getElementById('staff-filter');
        if (!staffFilterDropdown) return;

        // Clear existing options except "All Staff"
        while (staffFilterDropdown.options.length > 1) {
            staffFilterDropdown.options.remove(1);
        }

        // Add staff members to the filter dropdown
        allStaffMembers.forEach(staffMember => {
            if (staffMember.user) {
                const { first_name, last_name, id } = staffMember.user;
                const option = document.createElement('option');
                option.value = id;
                option.textContent = `${first_name} ${last_name}`;
                staffFilterDropdown.appendChild(option);
            }
        });

        // Add event listener for change event
        staffFilterDropdown.addEventListener('change', handleStaffFilterChange);
    };

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
        loadStaffMembers,
        populateStaffFilterDropdown,
        setupStaffFilter,
        getSelectedStaffId
    };
})();

// Export the StaffManager module
window.StaffManager = StaffManager;
