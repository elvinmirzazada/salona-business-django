// Customer management functionality
const CustomerManager = (() => {
    // Cache for customers data
    let customersCache = null;

    // Fetch customers from API (pure data fetching - no rendering)
    const fetchCustomers = async (forceRefresh = false) => {
        try {
            // Return cached data if available and not forcing refresh
            if (customersCache && !forceRefresh) {
                return customersCache;
            }

            const response = await window.api.getCustomers();

            const customers = response.success ? response.data : [];

            // Update cache
            customersCache = customers;

            return customers;
        } catch (error) {
            console.error('Error fetching customers:', error);
            return [];
        }
    };

    // Render customers in the booking popup dropdown
    const renderBookingDropdown = async (dropdownId = 'booking-customer') => {
        try {
            const customers = await fetchCustomers();
            const customerDropdown = document.getElementById(dropdownId);

            if (!customerDropdown) {
                console.warn(`Dropdown with id "${dropdownId}" not found`);
                return;
            }

            // Keep the "New Customer" option and remove all others
            while (customerDropdown.options.length > 1) {
                customerDropdown.options.remove(1);
            }

            // Add customers to the dropdown
            customers.forEach(customer => {
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
                if (customer.status === 'disabled' || customer.status === false) {
                    option.disabled = true;
                    displayText += ' [Disabled]';
                }

                option.textContent = displayText;
                customerDropdown.appendChild(option);
            });

            // Set up customer selection change event
            setupCustomerChangeEvent(dropdownId);

            return customers;
        } catch (error) {
            console.error('Error rendering booking dropdown:', error);
            return [];
        }
    };

    // Render customers table in the customers page
    const renderCustomersTable = async (tbodyId = 'customers-tbody', options = {}) => {
        try {
            const customers = await fetchCustomers();
            const tbody = document.getElementById(tbodyId);

            if (!tbody) {
                console.warn(`Table body with id "${tbodyId}" not found`);
                return;
            }

            // Clear existing rows
            tbody.innerHTML = '';

            if (customers.length === 0) {
                // Handle empty state if callback provided
                if (options.onEmpty) {
                    options.onEmpty();
                }
                return customers;
            }

            // Handle data loaded callback
            if (options.onLoaded) {
                options.onLoaded(customers);
            }

            // Render each customer row
            customers.forEach(customer => {
                const row = document.createElement('tr');

                // Format customer data
                const fullName = `${customer.first_name} ${customer.last_name}`;
                const email = customer.email || '-';
                const phone = customer.phone || '-';
                const status = customer.status === 'disabled' || customer.status === false ? 'disabled' : 'active';
                const statusText = status === 'active' ? 'Active' : 'Disabled';

                row.innerHTML = `
                    <td>${fullName}</td>
                    <td>${email}</td>
                    <td>${phone}</td>
                    <td>
                        <span class="status-badge status-${status}">
                            ${statusText}
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn view-btn" data-customer-id="${customer.id}" title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </td>
                `;

                tbody.appendChild(row);
            });

            // Attach event listeners to action buttons if callback provided
            if (options.onActionClick) {
                tbody.querySelectorAll('.view-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const customerId = parseInt(e.currentTarget.dataset.customerId);
                        const customer = customers.find(c => c.id === customerId);
                        options.onActionClick(customer, 'view');
                    });
                });
            }

            return customers;
        } catch (error) {
            console.error('Error rendering customers table:', error);
            return [];
        }
    };

    // Setup customer selection change event for booking form
    const setupCustomerChangeEvent = (dropdownId = 'booking-customer') => {
        const customerDropdown = document.getElementById(dropdownId);
        const newCustomerFields = document.getElementById('new-customer-fields');
        
        if (customerDropdown && newCustomerFields) {
            // Remove existing listeners to prevent duplicates
            const newDropdown = customerDropdown.cloneNode(true);
            customerDropdown.parentNode.replaceChild(newDropdown, customerDropdown);

            // Add new listener
            newDropdown.addEventListener('change', function() {
                if (this.value === 'new') {
                    newCustomerFields.style.display = 'block';
                } else {
                    newCustomerFields.style.display = 'none';
                }
            });
        }
    };

    // Get a specific customer by ID
    const getCustomerById = async (customerId) => {
        const customers = await fetchCustomers();
        return customers.find(c => c.id === customerId) || null;
    };

    // Clear the cache (useful after creating/updating/deleting a customer)
    const clearCache = () => {
        customersCache = null;
    };

    // Legacy method for backward compatibility
    const loadCustomers = async () => {
        return await renderBookingDropdown();
    };

    return {
        fetchCustomers,
        renderBookingDropdown,
        renderCustomersTable,
        setupCustomerChangeEvent,
        getCustomerById,
        clearCache,
        loadCustomers // Keep for backward compatibility
    };
})();

// Export the CustomerManager module
window.CustomerManager = CustomerManager;
