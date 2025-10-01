// Staff management functionality
const StaffManager = (() => {
    // Fetch staff members from API
    const loadStaffMembers = async () => {
        try {
            const response = await fetch('http://127.0.0.1:8000/api/v1/companies/users', {
                method: 'GET',
                headers: Auth.getAuthHeader(),
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const staffMembers = data.success ? data.data : [];

            // Populate the staff members dropdown
            const workerDropdown = document.getElementById('booking-worker');

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

            return staffMembers;
        } catch (error) {
            console.error('Error fetching staff members:', error);
            return [];
        }
    };

    return {
        loadStaffMembers
    };
})();

// Export the StaffManager module
window.StaffManager = StaffManager;
