// Settings Module
const Settings = (() => {
    // Keep track of the current service being edited
    let currentServiceId = null;
    let currentEmailId = null; // Added to track which email is being deleted
    let currentPhoneId = null; // Added to track which phone is being deleted
    let companyData = null;
    let staffList = [];
    let categoryList = [];
    let companyEmails = []; // Added to store company emails
    let companyPhones = []; // Added to store company phones

    // Helper functions
    const formatCurrency = (amount) => {
        if (amount === null || amount === undefined) return '$0.00';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    // Toast notification function
    const showToast = (message, type = 'info') => {
        // Check if a toast container already exists, if not create one
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.style.position = 'fixed';
            toastContainer.style.top = '20px';
            toastContainer.style.right = '20px';
            toastContainer.style.zIndex = '9999';
            document.body.appendChild(toastContainer);
        }

        // Create the toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.backgroundColor = type === 'error' ? '#f44336' :
                                     type === 'success' ? '#4CAF50' :
                                     type === 'warning' ? '#ff9800' : '#2196F3';
        toast.style.color = 'white';
        toast.style.padding = '12px 24px';
        toast.style.marginBottom = '10px';
        toast.style.borderRadius = '4px';
        toast.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
        toast.style.minWidth = '250px';
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease-in-out';

        // Add the message
        toast.textContent = message;

        // Add the toast to the container
        toastContainer.appendChild(toast);

        // Fade in the toast
        setTimeout(() => {
            toast.style.opacity = '1';
        }, 10);

        // Remove the toast after 3 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                toastContainer.removeChild(toast);
                // Remove the container if it's empty
                if (toastContainer.children.length === 0) {
                    document.body.removeChild(toastContainer);
                }
            }, 300);
        }, 3000);
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

        // Load services and categories data
        await Promise.all([loadServices(), loadCategories()]);
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

        // Add category button click handler
        document.getElementById('add-category-btn').addEventListener('click', () => {
            document.getElementById('category-modal').style.display = 'block';
        });
        // Cancel button in category modal
        document.getElementById('cancel-category-btn').addEventListener('click', () => {
            document.getElementById('category-modal').style.display = 'none';
        });
        // Close modal by clicking X or outside
        document.querySelectorAll('#category-modal .close-modal').forEach(element => {
            element.addEventListener('click', () => {
                document.getElementById('category-modal').style.display = 'none';
            });
        });
        window.addEventListener('click', (e) => {
            const categoryModal = document.getElementById('category-modal');
            if (e.target === categoryModal) {
                categoryModal.style.display = 'none';
            }
        });
        // Handle category form submit
        document.getElementById('category-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveCategory();
        });

        // Category delete modal buttons
        document.getElementById('cancel-delete-category-btn').addEventListener('click', () => {
            document.getElementById('delete-category-modal').style.display = 'none';
        });
        
        document.getElementById('confirm-delete-category-btn').addEventListener('click', () => {
            const categoryId = document.getElementById('delete-category-modal').dataset.categoryId;
            if (categoryId) {
                deleteCategory(categoryId);
            }
        });
        
        // Close category delete modal when clicking on X or outside
        document.querySelectorAll('#delete-category-modal .close-modal').forEach(element => {
            element.addEventListener('click', () => {
                document.getElementById('delete-category-modal').style.display = 'none';
            });
        });
        
        window.addEventListener('click', (e) => {
            const deleteCategoryModal = document.getElementById('delete-category-modal');
            if (e.target === deleteCategoryModal) {
                deleteCategoryModal.style.display = 'none';
            }
        });
    };

    // Load all services from the API
    const loadServices = async () => {
        const categoriesContainer = document.getElementById('service-categories-container');
        const loadingElement = document.getElementById('service-loading');
        const emptyElement = document.getElementById('service-empty');
        console.log('sdfsdfsdf');
        try {
            categoriesContainer.innerHTML = '';
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
            console.log(result);
            const serviceCategories = result.data || [];
            let hasServices = false;

            loadingElement.style.display = 'none';

            serviceCategories.forEach(category => {
                if (!category.id) return; // Skip categories without ID

                hasServices = true;
                // Create category block
                const catBlock = document.createElement('div');
                catBlock.className = 'category-block';
                catBlock.dataset.categoryId = category.id;

                // Category header styled like screenshot
                const catHeader = document.createElement('div');
                catHeader.className = 'category-header';

                // Create a wrapper for the category name and icon
                const catNameWrapper = document.createElement('div');
                catNameWrapper.className = 'category-name-wrapper';
                catNameWrapper.innerHTML = `<i class="fas fa-folder"></i> <span>${category.name || 'Unnamed Category'}</span>`;

                // Create delete button
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'category-delete-btn';
                deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
                deleteBtn.title = 'Delete Category';
                deleteBtn.dataset.categoryId = category.id;
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent event bubbling
                    confirmDeleteCategory(category.id, category.name);
                });

                // Add elements to the header
                catHeader.appendChild(catNameWrapper);
                catHeader.appendChild(deleteBtn);
                catBlock.appendChild(catHeader);

                // Create and add service table
                const serviceTable = document.createElement('table');
                serviceTable.className = 'service-table';
                if (!category.services || !Array.isArray(category.services) || category.services.length === 0) {
                    // Show empty message if no services
                    const emptyRow = document.createElement('tr');
                    const emptyCell = document.createElement('td');
                    emptyCell.colSpan = 6;
                    emptyCell.textContent = 'No services in this category';
                    emptyCell.style.textAlign = 'center';
                    emptyCell.style.padding = '1rem';
                    emptyRow.appendChild(emptyCell);

                    const tbody = document.createElement('tbody');
                    tbody.appendChild(emptyRow);
                    serviceTable.appendChild(tbody);
                } else {
                    // Create regular table with services
                    const thead = document.createElement('thead');
                    thead.innerHTML = `
                        <tr>
                            <th>Name</th>
                            <th>Duration</th>
                            <th>Price</th>
                            <th>Discount Price</th>
                            <th>Staff</th>
                            <th>Actions</th>
                        </tr>`;
                    serviceTable.appendChild(thead);

                    const tbody = document.createElement('tbody');
                    category.services.forEach(service => {
                        service.category = category.name;
                        service.category_id = category.id;
                        const row = createServiceRow(service);
                        tbody.appendChild(row);
                    });
                    serviceTable.appendChild(tbody);
                }

                catBlock.appendChild(serviceTable);
                categoriesContainer.appendChild(catBlock);
            });

            if (!hasServices) {
                emptyElement.style.display = 'block';
                return;
            }
        } catch (error) {
            console.error('Error loading services:', error);
            loadingElement.style.display = 'none';
            showToast('Failed to load services. Please try again.', 'error');
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
        const categoryField = document.getElementById('service-category');

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
            categoryField.value = service.category_id || '';

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
    const updateStaffCheckboxes = async (service = null) => {
        const staffContainer = document.getElementById('staff-selection');

        // Clear existing content
        staffContainer.innerHTML = '';

        // Show loading indicator
        const loadingMsg = document.createElement('div');
        loadingMsg.textContent = 'Loading staff members...';
        loadingMsg.className = 'loading-message';
        staffContainer.appendChild(loadingMsg);

        try {
            // Use ServiceManager to load staff members
            await ServiceManager.loadStaffMembers(staffContainer);

            // If we're editing a service with existing staff assignments
            if (service && service.staff && Array.isArray(service.staff)) {
                // Check the checkboxes for staff members assigned to this service
                service.staff.forEach(staffMember => {
                    const checkbox = document.querySelector(`#staff-${staffMember.id}`);
                    if (checkbox) {
                        checkbox.checked = true;
                    }
                });
            }
        } catch (error) {
            console.error('Error loading staff members:', error);
            staffContainer.innerHTML = '<div class="error">Failed to load staff members. Please try again.</div>';
        }
    };

    // Fetch categories from the API
    const loadCategories = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) throw new Error('No access token found');

            const response = await fetch('http://127.0.0.1:8000/api/v1/services/companies/categories', {
                method: 'GET',
                headers: Auth.getAuthHeader(),
                credentials: 'include'
            });

            if (!response.ok) throw new Error(`Error: ${response.status}`);

            const result = await response.json();
            categoryList = result.data || [];

            // Populate category dropdown in the service modal if categories are loaded
            if (categoryList.length > 0) {
                populateCategoryDropdown();
            }

            return categoryList;
        } catch (error) {
            console.error('Error loading categories:', error);
            showToast('Failed to load categories. Please try again.', 'error');
            return [];
        }
    };

    // Populate category dropdown
    const populateCategoryDropdown = (selectedCategoryId = null) => {
        const categoryDropdown = document.getElementById('service-category');
        categoryDropdown.innerHTML = '<option value="">Select a category</option>';

        if (categoryList.length === 0) {
            categoryDropdown.innerHTML += '<option value="" disabled>No categories available</option>';
            return;
        }

        categoryList.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;

            if (selectedCategoryId && category.id === selectedCategoryId) {
                option.selected = true;
            }

            categoryDropdown.appendChild(option);
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
        const categoryId = document.getElementById('service-category').value;

        // Get selected staff IDs
        const selectedStaffIds = [];
        const staffCheckboxes = document.querySelectorAll('#staff-selection input[type="checkbox"]:checked');
        staffCheckboxes.forEach(checkbox => {
            selectedStaffIds.push(checkbox.value);
        });

        // Create service data object
        const serviceData = {
            name,
            duration: parseInt(duration),
            price: parseFloat(price),
            discount_price: discountPrice ? parseFloat(discountPrice) : null,
            additional_info: description,
            staff_ids: selectedStaffIds,
            category_id: categoryId
        };

        try {
            // Show loading state
            document.getElementById('save-service-btn').disabled = true;
            document.getElementById('save-service-btn').textContent = 'Saving...';

            let response;

            // If we have a service ID, update existing service using the correct endpoint (singular 'service')
            if (serviceId) {
                response = await fetch(`http://127.0.0.1:8000/api/v1/services/service/${serviceId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        ...Auth.getAuthHeader()
                    },
                    credentials: 'include',
                    body: JSON.stringify(serviceData)
                });
            } else {
                // Otherwise create a new service using the plural 'services' endpoint
                response = await fetch('http://127.0.0.1:8000/api/v1/services/services', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...Auth.getAuthHeader()
                    },
                    credentials: 'include',
                    body: JSON.stringify(serviceData)
                });
            }

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Error: ${response.status}`);
            }

            // Success - reload services and close modal
            closeServiceModal();
            await loadServices();

            // Show success message
            const action = serviceId ? 'updated' : 'created';
            showToast(`Service ${action} successfully!`, 'success');
        } catch (error) {
            console.error('Error saving service:', error);
            showToast(`Failed to save service: ${error.message}`, 'error');
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

            // Send delete request to the correct endpoint
            const response = await fetch(`http://127.0.0.1:8000/api/v1/services/service/${serviceId}`, {
                method: 'DELETE',
                headers: Auth.getAuthHeader(),
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Error: ${response.status}`);
            }

            // Success - reload services and close modal
            document.getElementById('delete-modal').style.display = 'none';
            await loadServices();

            // Show success message
            showToast('Service deleted successfully!', 'success');
        } catch (error) {
            console.error('Error deleting service:', error);
            showToast(`Failed to delete service: ${error.message}`, 'error');
        } finally {
            // Reset button state
            document.getElementById('confirm-delete-btn').disabled = false;
            document.getElementById('confirm-delete-btn').textContent = 'Delete';
        }
    };

    // Save a new category
    const saveCategory = async () => {
        const name = document.getElementById('category-name').value;
        const description = document.getElementById('category-description').value;
        const saveBtn = document.getElementById('save-category-btn');
        try {
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';
            const token = localStorage.getItem('accessToken');
            if (!token) throw new Error('No access token found');
            const response = await fetch('http://127.0.0.1:8000/api/v1/services/categories', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name, description })
            });
            if (!response.ok) throw new Error(`Error: ${response.status}`);
            document.getElementById('category-modal').style.display = 'none';
            document.getElementById('category-form').reset();
            await loadServices();
            showToast('Category added successfully!', 'success');
        } catch (error) {
            console.error('Error saving category:', error);
            showToast('Failed to add category. Please try again.', 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Category';
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

    // Setup company form functionality
    const setupCompanyForm = () => {
        // Company details form submit handler
        document.getElementById('company-details-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveCompanyDetails();
        });

        // Company emails form functionality
        const addEmailBtn = document.getElementById('add-email-btn');
        const emailsContainer = document.getElementById('emails-container');
        const emailsForm = document.getElementById('company-emails-form');

        if (addEmailBtn) {
            addEmailBtn.addEventListener('click', () => {
                addEmailField();
            });
        }

        if (emailsForm) {
            emailsForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await saveCompanyEmails();
            });
        }

        // Setup delete email button handlers
        setupEmailDeleteHandlers();

        // Company phones form functionality
        const phonesForm = document.getElementById('company-phones-form');
        phonesForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveCompanyPhones();
        });

        // Setup add phone button
        const addPhoneBtn = document.getElementById('add-phone-btn');
        if (addPhoneBtn) {
            addPhoneBtn.addEventListener('click', () => {
                addPhoneField();
            });
        }

        // Setup initial delete phone buttons
        setupDeletePhoneButtons();
    };

    // Load all company information from the API
    const loadCompanyInfo = async () => {
        try {
            // Get token from localStorage
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found');
            }

            // Show loading state
            document.querySelectorAll('.company-info-loading').forEach(el => {
                el.style.display = 'flex';
            });

            // Fetch company details
            await Promise.all([
                loadCompanyDetails(),
                loadCompanyEmails(), // Added to load company emails
                loadCompanyPhones(), // Added to load company phones
                // Add other company data loading functions here
            ]);

            // Hide loading state
            document.querySelectorAll('.company-info-loading').forEach(el => {
                el.style.display = 'none';
            });
        } catch (error) {
            console.error('Error loading company information:', error);
            showToast('Failed to load company information. Please try again.', 'error');
        }
    };

    // Load company details from the API
    const loadCompanyDetails = async () => {
        try {
            // Get token from localStorage
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found');
            }

            // Fetch company details from the API
            const response = await fetch('http://127.0.0.1:8000/api/v1/companies', {
                method: 'GET',
                headers: Auth.getAuthHeader(),
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }

            const result = await response.json();
            console.log("Company details:", result);

            // Save company data
            companyData = result.data || {};

            // Update form fields with company details
            const nameField = document.getElementById('company-name');
            if (nameField && companyData.name) {
                nameField.value = companyData.name;
            }

            const logoUrlField = document.getElementById('company-logo-url');
            if (logoUrlField && companyData.logo_url) {
                logoUrlField.value = companyData.logo_url;
            }

            const websiteField = document.getElementById('company-website');
            if (websiteField && companyData.website) {
                websiteField.value = companyData.website;
            }

            const descriptionField = document.getElementById('company-description');
            if (descriptionField && companyData.description) {
                descriptionField.value = companyData.description;
            }

            const teamSizeField = document.getElementById('company-team-size');
            if (teamSizeField && companyData.team_size) {
                teamSizeField.value = companyData.team_size;
            }

            const typeField = document.getElementById('company-type');
            if (typeField && companyData.type) {
                typeField.value = companyData.type;
            }

        } catch (error) {
            console.error('Error loading company details:', error);
            showToast('Failed to load company details. Please try again.', 'error');
        }
    };

    // Load company emails from the API
    const loadCompanyEmails = async () => {
        try {
            // Get token from localStorage
            const token = localStorage.getItem('accessToken');
            if (!token) {
                throw new Error('No access token found');
            }

            // Fetch company emails from the API
            const response = await fetch('http://127.0.0.1:8000/api/v1/companies/emails', {
                method: 'GET',
                headers: Auth.getAuthHeader(),
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }

            const result = await response.json();
            console.log("Company emails:", result);

            // Save the emails in the module state
            companyEmails = result.data || [];

            // Clear existing email fields except the first one
            const emailsContainer = document.getElementById('emails-container');
            if (emailsContainer) {
                while (emailsContainer.children.length > 1) {
                    emailsContainer.removeChild(emailsContainer.lastChild);
                }

                // Update the email fields based on the returned data
                if (companyEmails.length > 0) {
                    // Clear the container completely if we have emails
                    emailsContainer.innerHTML = '';

                    // Add email fields based on the API response
                    companyEmails.forEach((email, index) => {
                        const emailEntry = document.createElement('div');
                        emailEntry.className = 'email-entry';
                        emailEntry.innerHTML = `
                            <div class="form-row">
                                <div class="form-group flex-grow-1">
                                    <label for="company-email-${index}">Email</label>
                                    <input type="email" id="company-email-${index}" name="company-email-${index}" class="company-email" value="${email.email}" required data-email-id="${email.id}">
                                </div>
                                <div class="form-group email-type-group">
                                    <label for="company-email-type-${index}">Type</label>
                                    <select id="company-email-type-${index}" name="company-email-type-${index}" class="email-type">
                                        <option value="primary" ${email.status === 'primary' ? 'selected' : ''}>Primary</option>
                                        <option value="billing" ${email.status === 'billing' ? 'selected' : ''}>Billing</option>
                                        <option value="support" ${email.status === 'support' ? 'selected' : ''}>Support</option>
                                        <option value="other" ${email.status === 'other' ? 'selected' : ''}>Other</option>
                                    </select>
                                </div>
                                <div class="form-group delete-btn-container">
                                    <label>&nbsp;</label>
                                    <button type="button" class="btn-danger delete-email-btn" data-index="${index}" ${index === 0 && companyEmails.length === 1 ? 'disabled' : ''}>
                                        <i class="fas fa-trash-alt"></i>
                                    </button>
                                </div>
                            </div>
                        `;
                        emailsContainer.appendChild(emailEntry);
                    });
                } else {
                    // If no emails, ensure there's at least one empty field
                    const firstEmailInput = document.getElementById('company-email-0');
                    if (firstEmailInput) {
                        firstEmailInput.value = '';
                    }
                }

                // Re-setup the delete handlers
                setupEmailDeleteHandlers();
            }
        } catch (error) {
            console.error('Error loading company emails:', error);
            showToast('Failed to load company emails. Please try again.', 'error');
        }
    };

    // Add a new email field
    const addEmailField = () => {
        const emailsContainer = document.getElementById('emails-container');
        const index = document.querySelectorAll('.email-entry').length;

        const emailEntry = document.createElement('div');
        emailEntry.className = 'email-entry';
        emailEntry.innerHTML = `
            <div class="form-row">
                <div class="form-group flex-grow-1">
                    <label for="company-email-${index}">Email</label>
                    <input type="email" id="company-email-${index}" name="company-email-${index}" class="company-email" required>
                </div>
                <div class="form-group email-type-group">
                    <label for="company-email-type-${index}">Type</label>
                    <select id="company-email-type-${index}" name="company-email-type-${index}" class="email-type">
                        <option value="primary">Primary</option>
                        <option value="billing">Billing</option>
                        <option value="support">Support</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div class="form-group delete-btn-container">
                    <label>&nbsp;</label>
                    <button type="button" class="btn-danger delete-email-btn" data-index="${index}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `;

        emailsContainer.appendChild(emailEntry);

        // Setup delete handler for the new email entry
        setupEmailDeleteHandlers();

    };

    // Setup email delete button handlers
    const setupEmailDeleteHandlers = () => {
        document.querySelectorAll('.delete-email-btn').forEach(button => {
            button.addEventListener('click', function() {
                const index = this.dataset.index;
                const emailEntry = this.closest('.email-entry');
                const emailInput = emailEntry.querySelector('.company-email');

                if (emailInput && emailInput.dataset.emailId) {
                    // Store the email ID to be deleted
                    currentEmailId = emailInput.dataset.emailId;

                    // Show the confirmation modal
                    document.getElementById('delete-email-modal').style.display = 'block';
                } else {
                    // For emails that haven't been saved yet, just remove from the DOM
                    emailEntry.remove();
                    updateEmailDeleteButtons();
                }
            });
        });

        // Setup the email delete confirmation modal buttons
        setupEmailDeleteModal();
    };

    // Setup the email delete modal buttons
    const setupEmailDeleteModal = () => {
        const deleteModal = document.getElementById('delete-email-modal');

        // Cancel delete button
        document.getElementById('cancel-delete-email-btn').addEventListener('click', () => {
            deleteModal.style.display = 'none';
        });

        // Confirm delete button
        document.getElementById('confirm-delete-email-btn').addEventListener('click', () => {
            deleteEmail(currentEmailId);
        });

        // Close modal by clicking X
        deleteModal.querySelector('.close-modal').addEventListener('click', () => {
            deleteModal.style.display = 'none';
        });

        // Close modal by clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === deleteModal) {
                deleteModal.style.display = 'none';
            }
        });
    };

    // Delete an email using the API
    const deleteEmail = async (emailId) => {
        if (!emailId) return;

        try {
            // Show loading state
            const deleteBtn = document.getElementById('confirm-delete-email-btn');
            deleteBtn.disabled = true;
            deleteBtn.textContent = 'Deleting...';

            // Delete email from the API using the correct endpoint
            const response = await fetch(`http://127.0.0.1:8000/api/v1/companies/emails/${emailId}`, {
                method: 'DELETE',
                headers: Auth.getAuthHeader(),
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Error: ${response.status}`);
            }

            // Success - close modal and reload emails
            document.getElementById('delete-email-modal').style.display = 'none';
            await loadCompanyEmails();

            // Show success message
            showToast('Email deleted successfully!', 'success');
        } catch (error) {
            console.error('Error deleting email:', error);
            showToast(`Failed to delete email: ${error.message}`, 'error');
        } finally {
            // Reset button state
            const deleteBtn = document.getElementById('confirm-delete-email-btn');
            deleteBtn.disabled = false;
            deleteBtn.textContent = 'Delete';
        }
    };

    // Save company emails
    const saveCompanyEmails = async () => {
        try {
            // Collect email data from the form
            const emailEntries = document.querySelectorAll('.email-entry');
            const emailsToSave = [];
            const emailsToDelete = [];

            emailEntries.forEach(entry => {
                const emailInput = entry.querySelector('.company-email');
                const typeSelect = entry.querySelector('.email-type');

                if (emailInput && typeSelect) {
                    const emailId = emailInput.dataset.emailId;
                    const isDeleted = emailInput.dataset.deleted === 'true';

                    // If marked for deletion, add to delete list
                    if (isDeleted && emailId) {
                        emailsToDelete.push(emailId);
                    }
                    // Otherwise, if not marked for deletion and has a value, add to save list
                    else if (!isDeleted && emailInput.value.trim()) {
                        const emailData = {
                            email: emailInput.value.trim(),
                            status: typeSelect.value
                        };

                        // Include ID if it's an existing email
                        if (emailId) {
                            emailData.id = emailId;
                        }

                        emailsToSave.push(emailData);
                    }
                }
            });

            // Save emails - using the correct API format
            if (emailsToSave.length > 0) {
                // Format the request data according to the API requirements
                const requestData = {
                    emails: emailsToSave.map(email => ({
                        email: email.email,
                        status: email.status
                    }))
                };

                const response = await fetch('http://127.0.0.1:8000/api/v1/companies/emails', {
                    method: 'POST',
                    headers: {
                        ...Auth.getAuthHeader(),
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestData),
                    credentials: 'include'
                });

                if (!response.ok) {
                    throw new Error(`Error saving emails: ${response.status}`);
                }
            }

            // Delete emails
            for (const emailId of emailsToDelete) {
                const response = await fetch(`http://127.0.0.1:8000/api/v1/companies/emails/${emailId}`, {
                    method: 'DELETE',
                    headers: Auth.getAuthHeader(),
                    credentials: 'include'
                });

                if (!response.ok) {
                    throw new Error(`Error deleting email: ${response.status}`);
                }
            }

            // Reload company emails
            await loadCompanyEmails();

            showToast('Company emails saved successfully', 'success');
        } catch (error) {
            console.error('Error saving company emails:', error);
            showToast('Failed to save company emails. Please try again.', 'error');
        }
    };

    // Save company details
    const saveCompanyDetails = async () => {
        try {
            // Validate required fields
            const nameInput = document.getElementById('company-name');
            if (!nameInput.value.trim()) {
                showToast('Company name is required', 'error');
                nameInput.focus();
                return;
            }

            // Prepare company data with proper type conversion
            const detailsData = {
                name: nameInput.value.trim(),
                type: document.getElementById('company-type')?.value?.trim() || '',
                logo_url: document.getElementById('company-logo-url')?.value?.trim() || '',
                website: document.getElementById('company-website')?.value?.trim() || '',
                description: document.getElementById('company-description')?.value?.trim() || '',
                team_size: parseInt(document.getElementById('company-team-size')?.value) || 0
            };

            // Disable submit button and show loading state
            const submitBtn = document.querySelector('#company-details-form button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';

            // Send request to update company details using Auth helper for consistent headers
            const response = await fetch('http://127.0.0.1:8000/api/v1/companies', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...Auth.getAuthHeader()
                },
                credentials: 'include',
                body: JSON.stringify(detailsData)
            });

            // Handle different response statuses
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Server error: ${response.status}`);
            }

            // Process successful response
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.message || 'Failed to update company details');
            }

            // Update local data
            companyData = { ...companyData, ...result.data };

            // Show success message with custom animation
            showToast('Company details saved successfully!', 'success');

            // Add visual feedback to the form
            const formContainer = document.querySelector('#company-details-form');
            formContainer.classList.add('saved');
            setTimeout(() => formContainer.classList.remove('saved'), 1000);

        } catch (error) {
            console.error('Error saving company details:', error);
            showToast(`Failed to save company details: ${error.message}`, 'error');
        } finally {
            // Reset button state
            const submitBtn = document.querySelector('#company-details-form button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Details';
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
            showToast('Company phones saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving company phones:', error);
            showToast('Failed to save company phones. Please try again.', 'error');
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
            showToast('Company address saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving company address:', error);
            showToast('Failed to save company address. Please try again.', 'error');
        } finally {
            // Reset button state
            const submitBtn = document.querySelector('#company-address-form button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Address';
        }
    };

    // Show category delete confirmation dialog
    const confirmDeleteCategory = (categoryId, categoryName) => {
        const modal = document.getElementById('delete-category-modal');
        document.getElementById('delete-category-name').textContent = categoryName || 'this category';
        modal.dataset.categoryId = categoryId;
        modal.style.display = 'block';
    };
    
    // Delete a category
    const deleteCategory = async (categoryId) => {
        if (!categoryId) return;
        
        try {
            // Show loading state
            const deleteBtn = document.getElementById('confirm-delete-category-btn');
            deleteBtn.disabled = true;
            deleteBtn.textContent = 'Deleting...';
            
            const token = localStorage.getItem('accessToken');
            if (!token) throw new Error('No access token found');
            
            // Send delete request to the API
            const response = await fetch(`http://127.0.0.1:8000/api/v1/services/categories/${categoryId}`, {
                method: 'DELETE',
                headers: Auth.getAuthHeader(),
                credentials: 'include'
            });
            
            if (!response.ok) throw new Error(`Error: ${response.status}`);
            
            // Close modal and reload data
            document.getElementById('delete-category-modal').style.display = 'none';
            
            // Reload categories for dropdown and services list
            await Promise.all([loadCategories(), loadServices()]);
            
            // Show success message
            showToast('Category deleted successfully!', 'success');
        } catch (error) {
            console.error('Error deleting category:', error);
            showToast('Failed to delete category. Please try again.', 'error');
        } finally {
            // Reset button state
            const deleteBtn = document.getElementById('confirm-delete-category-btn');
            deleteBtn.disabled = false;
            deleteBtn.textContent = 'Delete Category';
        }
    };
    
    // Setup delete phone button handlers
    const setupDeletePhoneButtons = () => {
        document.querySelectorAll('.delete-phone-btn').forEach(button => {
            button.addEventListener('click', function() {
                const phoneEntry = this.closest('.phone-entry');
                const phoneInput = phoneEntry.querySelector('.company-phone');

                if (phoneInput && phoneInput.dataset.phoneId) {
                    // Store the phone ID to be deleted
                    currentPhoneId = phoneInput.dataset.phoneId;

                    // Show the confirmation modal
                    document.getElementById('delete-phone-modal').style.display = 'block';
                } else {
                    // For phones that haven't been saved yet, just remove from the DOM
                    phoneEntry.remove();
                    updateDeletePhoneButtons();
                }
            });
        });

        // Setup the phone delete confirmation modal buttons
        setupPhoneDeleteModal();
    };

    // Setup the phone delete modal buttons
    const setupPhoneDeleteModal = () => {
        const deleteModal = document.getElementById('delete-phone-modal');

        // Cancel delete button
        document.getElementById('cancel-delete-phone-btn').addEventListener('click', () => {
            deleteModal.style.display = 'none';
        });

        // Confirm delete button
        document.getElementById('confirm-delete-phone-btn').addEventListener('click', () => {
            deletePhone(currentPhoneId);
        });

        // Close modal by clicking X
        deleteModal.querySelector('.close-modal').addEventListener('click', () => {
            deleteModal.style.display = 'none';
        });

        // Close modal by clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === deleteModal) {
                deleteModal.style.display = 'none';
            }
        });
    };

    // Delete a phone using the API
    const deletePhone = async (phoneId) => {
        if (!phoneId) return;

        try {
            // Show loading state
            const deleteBtn = document.getElementById('confirm-delete-phone-btn');
            deleteBtn.disabled = true;
            deleteBtn.textContent = 'Deleting...';

            // Delete phone from the API using the correct endpoint
            const response = await fetch(`http://127.0.0.1:8000/api/v1/companies/phones/${phoneId}`, {
                method: 'DELETE',
                headers: Auth.getAuthHeader(),
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Error: ${response.status}`);
            }

            // Success - close modal and reload phones
            document.getElementById('delete-phone-modal').style.display = 'none';
            await loadCompanyPhones();

            // Show success message
            showToast('Phone number deleted successfully!', 'success');
        } catch (error) {
            console.error('Error deleting phone:', error);
            showToast(`Failed to delete phone: ${error.message}`, 'error');
        } finally {
            // Reset button state
            const deleteBtn = document.getElementById('confirm-delete-phone-btn');
            deleteBtn.disabled = false;
            deleteBtn.textContent = 'Delete';
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
