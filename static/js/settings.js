// Settings Module
const Settings = (() => {
    // Keep track of the current service being edited
    let currentServiceId = null;
    let companyData = null;
    let staffList = [];

    // Helper functions
    const formatCurrency = (amount) => {
        if (amount === null || amount === undefined) return '$0.00';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    // Initialize the settings page functionality
    const init = async () => {
        console.log('Initializing settings page');

        // Setup tabs
        setupTabs();

        // Setup service-related functionality
        setupServiceActions();

        // Setup company information functionality
        setupCompanyForm();

        // Load services data
        await loadServices();
    };

    // Setup tab navigation
    const setupTabs = () => {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabPanes = document.querySelectorAll('.tab-pane');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.dataset.tab;
                console.log('Tab clicked:', targetTab);

                // Update active tab button
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                // Update active tab content
                tabPanes.forEach(pane => {
                    pane.classList.remove('active');
                    if (pane.id === `${targetTab}-tab`) {
                        pane.classList.add('active');
                    }
                });

                // Load tab-specific data
                if (targetTab === 'company') {
                    console.log('Loading company info...');
                    loadCompanyInfo();
                } else if (targetTab === 'services' && document.getElementById('service-list').children.length === 0) {
                    // Reload services if the tab is selected and no services are loaded yet
                    console.log('Loading services...');
                    loadServices();
                }
            });
        });
    };

    // ========== SERVICES TAB FUNCTIONALITY ==========

    // Setup actions for the services tab
    const setupServiceActions = () => {
        // Add service button click handler
        document.getElementById('add-service-btn').addEventListener('click', () => {
            showServiceModal();
        });

        // Service form submit handler
        document.getElementById('service-form').addEventListener('submit', (e) => {
            e.preventDefault();
            saveService();
        });

        // Cancel button in service modal
        document.getElementById('cancel-service-btn').addEventListener('click', () => {
            closeServiceModal();
        });

        // Close modal by clicking X or outside
        document.querySelectorAll('.close-modal').forEach(element => {
            element.addEventListener('click', () => {
                document.getElementById('service-modal').style.display = 'none';
                document.getElementById('delete-modal').style.display = 'none';
            });
        });

        // Cancel delete button
        document.getElementById('cancel-delete-btn').addEventListener('click', () => {
            document.getElementById('delete-modal').style.display = 'none';
        });

        // Confirm delete button
        document.getElementById('confirm-delete-btn').addEventListener('click', () => {
            deleteService(currentServiceId);
        });

        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            const serviceModal = document.getElementById('service-modal');
            const deleteModal = document.getElementById('delete-modal');

            if (e.target === serviceModal) {
                serviceModal.style.display = 'none';
            }
            if (e.target === deleteModal) {
                deleteModal.style.display = 'none';
            }
        });
    };

    // Load all services from the API
    const loadServices = async () => {
        const serviceList = document.getElementById('service-list');
        const loadingElement = document.getElementById('service-loading');
        const emptyElement = document.getElementById('service-empty');

        try {
            serviceList.innerHTML = '';
            loadingElement.style.display = 'flex';
            emptyElement.style.display = 'none';

            // Get token from localStorage
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found');
            }

            // Fetch services from the API - JWT token contains company info
            const response = await fetch('http://127.0.0.1:8000/api/v1/companies/services', {
                method: 'GET',
                headers: Auth.getAuthHeader(),
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }

            const result = await response.json();

            // Handle the new response structure
            const serviceCategories = result.data || [];
            let allServices = [];

            // Extract all services from all categories
            serviceCategories.forEach(category => {
                if (category.services && Array.isArray(category.services)) {
                    // Add category information to each service
                    const servicesWithCategory = category.services.map(service => ({
                        ...service,
                        category: category.name
                    }));
                    allServices = [...allServices, ...servicesWithCategory];
                }
            });

            // Hide loading and show empty state if needed
            loadingElement.style.display = 'none';

            if (allServices.length === 0) {
                emptyElement.style.display = 'block';
                return;
            }

            // Render services
            allServices.forEach(service => {
                const row = createServiceRow(service);
                serviceList.appendChild(row);
            });
        } catch (error) {
            console.error('Error loading services:', error);
            loadingElement.style.display = 'none';
            UI.showToast('Failed to load services. Please try again.', 'error');
        }
    };

    // Create a table row for a service
    const createServiceRow = (service) => {
        const row = document.createElement('tr');

        // Service name
        const nameCell = document.createElement('td');
        nameCell.textContent = service.name;
        row.appendChild(nameCell);

        // Duration
        const durationCell = document.createElement('td');
        durationCell.textContent = `${service.duration} min`;
        row.appendChild(durationCell);

        // Price
        const priceCell = document.createElement('td');
        priceCell.textContent = formatCurrency(service.price);
        row.appendChild(priceCell);

        // Discount Price
        const discountPriceCell = document.createElement('td');
        discountPriceCell.textContent = service.discount_price ? formatCurrency(service.discount_price) : '—';
        row.appendChild(discountPriceCell);

        // Staff
        const staffCell = document.createElement('td');
        if (service.staff && service.staff.length > 0) {
            const staffNames = service.staff.map(staff => staff.name).join(', ');
            staffCell.textContent = staffNames;
        } else {
            staffCell.textContent = 'Not assigned';
        }
        row.appendChild(staffCell);

        // Actions
        const actionsCell = document.createElement('td');
        actionsCell.className = 'service-actions';

        // Edit button
        const editBtn = document.createElement('button');
        editBtn.className = 'action-btn edit';
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.addEventListener('click', () => {
            showServiceModal(service);
        });
        actionsCell.appendChild(editBtn);

        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'action-btn delete';
        deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        deleteBtn.addEventListener('click', () => {
            currentServiceId = service.id;
            document.getElementById('delete-modal').style.display = 'block';
        });
        actionsCell.appendChild(deleteBtn);

        row.appendChild(actionsCell);

        return row;
    };

    // Show the service modal for add/edit
    const showServiceModal = (service = null) => {
        const modal = document.getElementById('service-modal');
        const modalTitle = document.getElementById('service-modal-title');
        const form = document.getElementById('service-form');
        const serviceIdField = document.getElementById('service-id');
        const nameField = document.getElementById('service-name');
        const durationField = document.getElementById('service-duration');
        const priceField = document.getElementById('service-price');
        const discountPriceField = document.getElementById('service-discount-price');
        const descriptionField = document.getElementById('service-description');

        // Reset form
        form.reset();

        // Update form for edit or add
        if (service) {
            modalTitle.textContent = 'Edit Service';
            serviceIdField.value = service.id;
            nameField.value = service.name;
            durationField.value = service.duration;
            priceField.value = service.price;
            discountPriceField.value = service.discount_price || '';
            descriptionField.value = service.description || '';

            // Set current service ID for tracking
            currentServiceId = service.id;
        } else {
            modalTitle.textContent = 'Add Service';
            serviceIdField.value = '';
            currentServiceId = null;
        }

        // Populate staff checkboxes
        updateStaffCheckboxes(service);

        // Show modal
        modal.style.display = 'block';
    };

    // Close the service modal
    const closeServiceModal = () => {
        document.getElementById('service-modal').style.display = 'none';
    };

    // Update staff checkboxes in the service modal
    const updateStaffCheckboxes = (service = null) => {
        const staffContainer = document.getElementById('staff-selection');
        staffContainer.innerHTML = '';

        if (staffList.length === 0) {
            const message = document.createElement('p');
            message.textContent = 'No staff members available';
            staffContainer.appendChild(message);
            return;
        }

        // Create a checkbox for each staff member
        staffList.forEach(staff => {
            const checkboxItem = document.createElement('div');
            checkboxItem.className = 'checkbox-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `staff-${staff.id}`;
            checkbox.name = `staff-${staff.id}`;
            checkbox.value = staff.id;

            // Check if this staff is assigned to the service
            if (service && service.staff) {
                const isAssigned = service.staff.some(s => s.id === staff.id);
                checkbox.checked = isAssigned;
            }

            const label = document.createElement('label');
            label.htmlFor = `staff-${staff.id}`;
            label.textContent = staff.name;

            checkboxItem.appendChild(checkbox);
            checkboxItem.appendChild(label);
            staffContainer.appendChild(checkboxItem);
        });
    };

    // Save a service (create or update)
    const saveService = async () => {
        const serviceId = document.getElementById('service-id').value;
        const name = document.getElementById('service-name').value;
        const duration = document.getElementById('service-duration').value;
        const price = document.getElementById('service-price').value;
        const discountPrice = document.getElementById('service-discount-price').value;
        const description = document.getElementById('service-description').value;

        // Get selected staff IDs
        const selectedStaffIds = [];
        staffList.forEach(staff => {
            const checkbox = document.getElementById(`staff-${staff.id}`);
            if (checkbox && checkbox.checked) {
                selectedStaffIds.push(staff.id);
            }
        });

        // Create service data object
        const serviceData = {
            name,
            duration: parseInt(duration),
            price: parseFloat(price),
            discount_price: discountPrice ? parseFloat(discountPrice) : null,
            description,
            staff_ids: selectedStaffIds
        };

        try {
            // Show loading state
            document.getElementById('save-service-btn').disabled = true;
            document.getElementById('save-service-btn').textContent = 'Saving...';

            // Get token from localStorage
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found');
            }

            let response;

            // If we have a service ID, update existing service
            if (serviceId) {
                response = await fetch(`/api/services/${serviceId}/`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(serviceData)
                });
            } else {
                // Otherwise create a new service
                response = await fetch(`/api/services/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(serviceData)
                });
            }

            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }

            // Success - reload services and close modal
            closeServiceModal();
            await loadServices();

            // Show success message
            const action = serviceId ? 'updated' : 'created';
            UI.showToast(`Service ${action} successfully!`, 'success');
        } catch (error) {
            console.error('Error saving service:', error);
            UI.showToast('Failed to save service. Please try again.', 'error');
        } finally {
            // Reset button state
            document.getElementById('save-service-btn').disabled = false;
            document.getElementById('save-service-btn').textContent = 'Save Service';
        }
    };

    // Delete a service
    const deleteService = async (serviceId) => {
        if (!serviceId) return;

        try {
            // Show loading state
            document.getElementById('confirm-delete-btn').disabled = true;
            document.getElementById('confirm-delete-btn').textContent = 'Deleting...';

            // Get token from localStorage
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found');
            }

            // Send delete request
            const response = await fetch(`/api/services/${serviceId}/`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }

            // Success - reload services and close modal
            document.getElementById('delete-modal').style.display = 'none';
            await loadServices();

            // Show success message
            UI.showToast('Service deleted successfully!', 'success');
        } catch (error) {
            console.error('Error deleting service:', error);
            UI.showToast('Failed to delete service. Please try again.', 'error');
        } finally {
            // Reset button state
            document.getElementById('confirm-delete-btn').disabled = false;
            document.getElementById('confirm-delete-btn').textContent = 'Delete';
        }
    };

    // Load the staff list
    const loadStaffList = async () => {
        try {
            // Get token from localStorage
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found');
            }

            // Fetch staff from API - JWT token contains company info
            const response = await fetch('/api/staff/', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }

            staffList = await response.json();
        } catch (error) {
            console.error('Error loading staff:', error);
            staffList = [];
        }
    };

    // ========== COMPANY INFORMATION TAB FUNCTIONALITY ==========

    // Setup company information form
    const setupCompanyForm = () => {
        // Setup company details form
        const detailsForm = document.getElementById('company-details-form');
        detailsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveCompanyDetails();
        });

        // Setup company emails form
        const emailsForm = document.getElementById('company-emails-form');
        emailsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveCompanyEmails();
        });

        // Setup company phones form
        const phonesForm = document.getElementById('company-phones-form');
        phonesForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveCompanyPhones();
        });

        // Setup company address form
        const addressForm = document.getElementById('company-address-form');
        addressForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveCompanyAddress();
        });

        // Setup add email button
        const addEmailBtn = document.getElementById('add-email-btn');
        if (addEmailBtn) {
            addEmailBtn.addEventListener('click', () => {
                addEmailField();
            });
        }

        // Setup add phone button
        const addPhoneBtn = document.getElementById('add-phone-btn');
        if (addPhoneBtn) {
            addPhoneBtn.addEventListener('click', () => {
                addPhoneField();
            });
        }

        // Setup initial delete email buttons
        setupDeleteEmailButtons();

        // Setup initial delete phone buttons
        setupDeletePhoneButtons();
    };

    // Set up event listeners for delete email buttons
    const setupDeleteEmailButtons = () => {
        document.querySelectorAll('.delete-email-btn').forEach(button => {
            button.addEventListener('click', () => {
                const index = button.dataset.index;
                const emailEntry = document.querySelector(`.email-entry[data-index="${index}"]`);
                if (emailEntry) {
                    emailEntry.remove();

                    // If only one email is left, disable its delete button
                    const remainingEntries = document.querySelectorAll('.email-entry');
                    if (remainingEntries.length === 1) {
                        document.querySelector('.delete-email-btn').disabled = true;
                    }
                }
            });
        });
    };

    // Add a new email field
    let emailCounter = 1; // Start at 1 since we already have email-0 in the HTML
    const addEmailField = () => {
        const emailsContainer = document.getElementById('emails-container');
        const emailEntry = document.createElement('div');
        emailEntry.className = 'email-entry';
        emailEntry.dataset.index = emailCounter;

        emailEntry.innerHTML = `
            <div class="form-row">
                <div class="form-group flex-grow-1">
                    <label for="company-email-${emailCounter}">Email</label>
                    <input type="email" id="company-email-${emailCounter}" name="company-email-${emailCounter}" class="company-email" required>
                </div>
                <div class="form-group email-type-group">
                    <label for="company-email-type-${emailCounter}">Type</label>
                    <select id="company-email-type-${emailCounter}" name="company-email-type-${emailCounter}" class="email-type">
                        <option value="primary">Primary</option>
                        <option value="billing">Billing</option>
                        <option value="support">Support</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div class="form-group delete-btn-container">
                    <label>&nbsp;</label>
                    <button type="button" class="btn-danger delete-email-btn" data-index="${emailCounter}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `;

        emailsContainer.appendChild(emailEntry);
        emailCounter++;

        // Enable all delete buttons since we now have more than one email
        document.querySelectorAll('.delete-email-btn').forEach(btn => {
            btn.disabled = false;
        });

        // Set up event listener for the new delete button
        setupDeleteEmailButtons();
    };

    // Set up event listeners for delete phone buttons
    const setupDeletePhoneButtons = () => {
        document.querySelectorAll('.delete-phone-btn').forEach(button => {
            button.addEventListener('click', () => {
                const index = button.dataset.index;
                const phoneEntry = document.querySelector(`.phone-entry[data-index="${index}"]`);
                if (phoneEntry) {
                    phoneEntry.remove();

                    // If only one phone is left, disable its delete button
                    const remainingEntries = document.querySelectorAll('.phone-entry');
                    if (remainingEntries.length === 1) {
                        document.querySelector('.delete-phone-btn').disabled = true;
                    }
                }
            });
        });
    };

    // Add a new phone field
    let phoneCounter = 1; // Start at 1 since we already have phone-0 in the HTML
    const addPhoneField = () => {
        const phonesContainer = document.getElementById('phones-container');
        const phoneEntry = document.createElement('div');
        phoneEntry.className = 'phone-entry';
        phoneEntry.dataset.index = phoneCounter;

        phoneEntry.innerHTML = `
            <div class="form-row">
                <div class="form-group flex-grow-1">
                    <label for="company-phone-${phoneCounter}">Phone</label>
                    <input type="tel" id="company-phone-${phoneCounter}" name="company-phone-${phoneCounter}" class="company-phone" required>
                </div>
                <div class="form-group phone-type-group">
                    <label for="company-phone-type-${phoneCounter}">Type</label>
                    <select id="company-phone-type-${phoneCounter}" name="company-phone-type-${phoneCounter}" class="phone-type">
                        <option value="primary">Primary</option>
                        <option value="fax">Fax</option>
                        <option value="support">Support</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div class="form-group delete-btn-container">
                    <label>&nbsp;</label>
                    <button type="button" class="btn-danger delete-phone-btn" data-index="${phoneCounter}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `;

        phonesContainer.appendChild(phoneEntry);
        phoneCounter++;

        // Enable all delete buttons since we now have more than one phone
        document.querySelectorAll('.delete-phone-btn').forEach(btn => {
            btn.disabled = false;
        });

        // Set up event listener for the new delete button
        setupDeletePhoneButtons();
    };

    // Load company information
    const loadCompanyInfo = async () => {
        console.log('loadCompanyInfo called');
        try {
            // Get token from localStorage
            const token = localStorage.getItem('accessToken');
            console.log('Token exists:', !!token);
            if (!token) {
                throw new Error('No access token found');
            }

            console.log('About to fetch company info from API');
            // Fetch company info from API using the correct endpoint
            const response = await fetch('http://127.0.0.1:8000/api/v1/companies', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });
            console.log('API response status:', response.status);

            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }

            const result = await response.json();
            console.log('Company data received:', result);
            companyData = result.data || {};

            console.log('Updating form fields with company data');

            // Populate details form
            populateCompanyDetails(companyData);

            // Populate emails form
            populateCompanyEmails(companyData);

            // Populate phones form
            populateCompanyPhones(companyData);

            // Populate address form
            populateCompanyAddress(companyData);

        } catch (error) {
            console.error('Error loading company information:', error);
            UI.showToast('Failed to load company information. Please try again.', 'error');
        }
    };

    // Populate company details form
    const populateCompanyDetails = (data) => {
        document.getElementById('company-name').value = data.name || '';
        document.getElementById('company-website').value = data.website || '';

        // Set logo URL if the field exists
        if (document.getElementById('company-logo-url')) {
            document.getElementById('company-logo-url').value = data.logo_url || '';
        }

        // Set description if the field exists
        if (document.getElementById('company-description')) {
            document.getElementById('company-description').value = data.description || '';
        }

        // Set team size if the field exists
        if (document.getElementById('company-team-size')) {
            // Use nullish coalescing to handle 0 as a valid value
            document.getElementById('company-team-size').value = data.team_size ?? '';
            console.log('Setting team size:', data.team_size);
        }

        // Set type if the field exists
        if (document.getElementById('company-type')) {
            document.getElementById('company-type').value = data.type || '';
        }
    };

    // Populate company emails form
    const populateCompanyEmails = (data) => {
        // Clear existing emails except the first one
        const emailsContainer = document.getElementById('emails-container');
        const firstEmailEntry = emailsContainer.querySelector('.email-entry');
        emailsContainer.innerHTML = '';
        emailsContainer.appendChild(firstEmailEntry);

        // Reset email counter
        emailCounter = 1;

        // Set the first email if available
        if (data.email) {
            document.getElementById('company-email-0').value = data.email;
            document.getElementById('company-email-type-0').value = 'primary';
        }

        // If there are additional emails in an emails array, add them
        if (data.emails && Array.isArray(data.emails) && data.emails.length > 0) {
            data.emails.forEach((email, index) => {
                // Skip the first one if we already set it from data.email
                if (index === 0 && data.email) return;

                addEmailField();
                const newIndex = emailCounter - 1;
                document.getElementById(`company-email-${newIndex}`).value = email.address;

                if (email.type && document.getElementById(`company-email-type-${newIndex}`)) {
                    document.getElementById(`company-email-type-${newIndex}`).value = email.type;
                }
            });
        }
    };

    // Populate company phones form
    const populateCompanyPhones = (data) => {
        // Clear existing phones except the first one
        const phonesContainer = document.getElementById('phones-container');
        const firstPhoneEntry = phonesContainer.querySelector('.phone-entry');
        phonesContainer.innerHTML = '';
        phonesContainer.appendChild(firstPhoneEntry);

        // Reset phone counter
        phoneCounter = 1;

        // Set the first phone if available
        if (data.phone) {
            document.getElementById('company-phone-0').value = data.phone;
            document.getElementById('company-phone-type-0').value = 'primary';
        }

        // If there are additional phones in a phones array, add them
        if (data.phones && Array.isArray(data.phones) && data.phones.length > 0) {
            data.phones.forEach((phone, index) => {
                // Skip the first one if we already set it from data.phone
                if (index === 0 && data.phone) return;

                addPhoneField();
                const newIndex = phoneCounter - 1;
                document.getElementById(`company-phone-${newIndex}`).value = phone.number;

                if (phone.type && document.getElementById(`company-phone-type-${newIndex}`)) {
                    document.getElementById(`company-phone-type-${newIndex}`).value = phone.type;
                }
            });
        }
    };

    // Populate company address form
    const populateCompanyAddress = (data) => {
        document.getElementById('company-address').value = data.address || '';
        document.getElementById('company-city').value = data.city || '';
        document.getElementById('company-state').value = data.state || '';
        document.getElementById('company-zip').value = data.zip || '';
        document.getElementById('company-phone').value = data.phone || '';
    };

    // Save company details
    const saveCompanyDetails = async () => {
        const detailsData = {
            name: document.getElementById('company-name').value,
            logo_url: document.getElementById('company-logo-url').value,
            website: document.getElementById('company-website').value,
            description: document.getElementById('company-description')?.value || '',
            team_size: document.getElementById('company-team-size')?.value || 0,
            type: document.getElementById('company-type')?.value || ''
        };

        try {
            // Disable submit button and show loading state
            const submitBtn = document.querySelector('#company-details-form button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';

            // Get token from localStorage
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found');
            }

            // Send request to update company details
            const response = await fetch('http://127.0.0.1:8000/api/v1/companies', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(detailsData)
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }

            // Update local data
            const result = await response.json();
            companyData = { ...companyData, ...result.data };

            // Show success message
            UI.showToast('Company details saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving company details:', error);
            UI.showToast('Failed to save company details. Please try again.', 'error');
        } finally {
            // Reset button state
            const submitBtn = document.querySelector('#company-details-form button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Details';
        }
    };

    // Save company emails
    const saveCompanyEmails = async () => {
        // Gather all email inputs
        const emailInputs = document.querySelectorAll('.company-email');
        const emailTypeInputs = document.querySelectorAll('.email-type');

        // Create emails array
        const emails = [];
        emailInputs.forEach((input, index) => {
            if (input.value) {
                emails.push({
                    address: input.value,
                    type: emailTypeInputs[index]?.value || 'other'
                });
            }
        });

        // Use the first email as the primary email
        const primaryEmail = emails.length > 0 ? emails[0].address : '';

        const emailData = {
            email: primaryEmail,
            emails: emails
        };

        try {
            // Disable submit button and show loading state
            const submitBtn = document.querySelector('#company-emails-form button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';

            // Get token from localStorage
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found');
            }

            // Send request to update company emails
            const response = await fetch('http://127.0.0.1:8000/api/v1/companies/emails', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(emailData)
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }

            // Update local data
            const result = await response.json();
            companyData = { ...companyData, ...result.data };

            // Show success message
            UI.showToast('Company emails saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving company emails:', error);
            UI.showToast('Failed to save company emails. Please try again.', 'error');
        } finally {
            // Reset button state
            const submitBtn = document.querySelector('#company-emails-form button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Emails';
        }
    };

    // Save company phones
    const saveCompanyPhones = async () => {
        // Gather all phone inputs
        const phoneInputs = document.querySelectorAll('.company-phone');
        const phoneTypeInputs = document.querySelectorAll('.phone-type');

        // Create phones array
        const phones = [];
        phoneInputs.forEach((input, index) => {
            if (input.value) {
                phones.push({
                    number: input.value,
                    type: phoneTypeInputs[index]?.value || 'other'
                });
            }
        });

        // Use the first phone as the primary phone
        const primaryPhone = phones.length > 0 ? phones[0].number : '';

        const phoneData = {
            phone: primaryPhone,
            phones: phones
        };

        try {
            // Disable submit button and show loading state
            const submitBtn = document.querySelector('#company-phones-form button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';

            // Get token from localStorage
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found');
            }

            // Send request to update company phones
            const response = await fetch('http://127.0.0.1:8000/api/v1/companies/phones', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(phoneData)
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }

            // Update local data
            const result = await response.json();
            companyData = { ...companyData, ...result.data };

            // Show success message
            UI.showToast('Company phones saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving company phones:', error);
            UI.showToast('Failed to save company phones. Please try again.', 'error');
        } finally {
            // Reset button state
            const submitBtn = document.querySelector('#company-phones-form button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Phones';
        }
    };

    // Save company address
    const saveCompanyAddress = async () => {
        const addressData = {
            address: document.getElementById('company-address').value,
            city: document.getElementById('company-city').value,
            state: document.getElementById('company-state').value,
            zip: document.getElementById('company-zip').value,
            phone: document.getElementById('company-phone').value
        };

        try {
            // Disable submit button and show loading state
            const submitBtn = document.querySelector('#company-address-form button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';

            // Get token from localStorage
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found');
            }

            // Send request to update company address
            const response = await fetch('http://127.0.0.1:8000/api/v1/companies/address', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(addressData)
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }

            // Update local data
            const result = await response.json();
            companyData = { ...companyData, ...result.data };

            // Show success message
            UI.showToast('Company address saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving company address:', error);
            UI.showToast('Failed to save company address. Please try again.', 'error');
        } finally {
            // Reset button state
            const submitBtn = document.querySelector('#company-address-form button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Address';
        }
    };

    // Public API
    return {
        init
    };
})();

// Initialize the Settings module when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    Settings.init();
});
