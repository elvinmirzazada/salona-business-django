// Customer management functionality
const CustomerManager = (() => {
    // Fetch customers from API and populate the dropdown
    const loadCustomers = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/companies/customers`, {
                method: 'GET',
                headers: Auth.getAuthHeader(),
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const customers = data.success ? data.data : [];

            // Populate the customer dropdown
            const customerDropdown = document.getElementById('booking-customer');

            // Keep the "New Customer" option and remove all others
            while (customerDropdown.options.length > 1) {
                customerDropdown.options.remove(1);
            }

            // Only add active customers to the dropdown
            customers.forEach(customer => {
                // Include all customers for now, even if they're disabled
                const option = document.createElement('option');
                option.value = customer.id;

                // Format the customer name and info
                const fullName = `${customer.first_name} ${customer.last_name}`;
                let displayText = fullName;

                // Add email or phone if available
                if (customer.email || customer.phone) {
                    let contactInfo = [];
                    if (customer.email) contactInfo.push(customer.email);
                    if (customer.phone) contactInfo.push(customer.phone);
                    displayText += ` (${contactInfo.join(', ')})`;
                }

                // Add a disabled indicator if the customer is disabled
                if (customer.status === 'disabled') {
                    option.disabled = true;
                    displayText += ' [Disabled]';
                }

                option.textContent = displayText;
                customerDropdown.appendChild(option);
            });

            // Set up customer selection change event
            setupCustomerChangeEvent();

            return customers;
        } catch (error) {
            console.error('Error fetching customers:', error);
            return [];
        }
    };

    // Setup customer selection change event
    const setupCustomerChangeEvent = () => {
        const customerDropdown = document.getElementById('booking-customer');
        const newCustomerFields = document.getElementById('new-customer-fields');
        
        if (customerDropdown && newCustomerFields) {
            customerDropdown.addEventListener('change', function() {
                if (this.value === 'new') {
                    newCustomerFields.style.display = 'block';
                } else {
                    newCustomerFields.style.display = 'none';
                }
            });
        }
    };

    return {
        loadCustomers,
        setupCustomerChangeEvent
    };
})();

// Export the CustomerManager module
window.CustomerManager = CustomerManager;
