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

        // Setup company information functionality
        setupCompanyForm();

        // Setup company creation functionality
        setupCreateCompanyForm();

        // Setup collapsible sections
        setupCollapsibleSections();

        // Check if user has a company before loading company data
        // Get company_id from the Django template context
        const hasCompany = window.userCompanyId && window.userCompanyId !== 'None' && window.userCompanyId !== '';

        console.log('User has company:', hasCompany, 'Company ID:', window.userCompanyId);

        // Only load company data if user belongs to a company
        if (hasCompany) {
            // Load company data immediately
            await loadCompanyDetails();

            // Load company emails and phones
            await loadCompanyEmails();
            await loadCompanyPhones();

            // Load services and categories data
            await Promise.all([]);
        } else {
            console.log('User does not have a company. Skipping company data loading.');
            // Optionally show the create company form by default
            const createCompanyForm = document.getElementById('create-company-form');
            if (createCompanyForm) {
                createCompanyForm.style.display = 'block';
            }
        }
    };

    // Setup company creation form submission
    const setupCreateCompanyForm = () => {
        const createCompanyForm = document.getElementById('create-company-form');
        const createCompanyBtn = document.getElementById('create-company-btn');
        if (!createCompanyForm || !createCompanyBtn) return;

        // Add event listener to the Create Company button
        createCompanyBtn.addEventListener('click', () => {
            // Toggle the visibility of the create company form
            if (createCompanyForm.style.display === 'none' || !createCompanyForm.style.display) {
                createCompanyForm.style.display = 'block';
                createCompanyBtn.innerHTML = '<i class="fas fa-times"></i> Cancel';
            } else {
                createCompanyForm.style.display = 'none';
                createCompanyBtn.innerHTML = '<i class="fas fa-plus"></i> Create Company';
            }
        });

        createCompanyForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Show loading spinner
            const loadingSpinner = document.getElementById('company-loading');
            const messageContainer = document.getElementById('company-message');

            loadingSpinner.style.display = 'flex';
            messageContainer.style.display = 'none';

            try {
                const formData = {
                    name: document.getElementById('company-name').value.trim(),
                    type: document.getElementById('company-type').value.trim(),
                    logo_url: document.getElementById('company-logo-url').value.trim(),
                    website: document.getElementById('company-website').value.trim(),
                    description: document.getElementById('company-description').value.trim(),
                    team_size: parseInt(document.getElementById('company-team-size').value) || 1
                };

                const result = await createCompany(formData);

                // Hide loading spinner
                loadingSpinner.style.display = 'none';

                if (result.success) {
                    // Show success message
                    messageContainer.style.display = 'block';
                    messageContainer.textContent = 'Company created successfully!';
                    messageContainer.style.backgroundColor = '#d4edda';
                    messageContainer.style.color = '#155724';
                    messageContainer.style.border = '1px solid #c3e6cb';

                    // Show toast notification
                    showToast('Company created successfully!', 'success');

                    // Redirect to dashboard after a delay
                    setTimeout(() => {
                        window.location.href = '/users/dashboard/';
                    }, 2000);
                } else {
                    // Show error message
                    messageContainer.style.display = 'block';
                    messageContainer.textContent = result.message || 'Failed to create company. Please try again.';
                    messageContainer.style.backgroundColor = '#f8d7da';
                    messageContainer.style.color = '#721c24';
                    messageContainer.style.border = '1px solid #f5c6cb';
                }
            } catch (error) {
                console.error('Error creating company:', error);

                // Hide loading spinner
                loadingSpinner.style.display = 'none';

                // Show error message
                messageContainer.style.display = 'block';
                messageContainer.textContent = 'An error occurred while creating the company. Please try again.';
                messageContainer.style.backgroundColor = '#f8d7da';
                messageContainer.style.color = '#721c24';
                messageContainer.style.border = '1px solid #f5c6cb';
            }
        });
    };

    // Create a new company
    const createCompany = async (companyData) => {
        try {
            // Get CSRF token for Django
            const csrfToken = getCookie('csrftoken');

            const response = await fetch('/users/settings/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                credentials: 'include',
                body: JSON.stringify(companyData)
            });

            const data = await response.json();

            if (!response.ok) {
                return {
                    success: false,
                    message: data.message || data.error || 'Failed to create company'
                };
            }

            return {
                success: data.success || true,
                message: data.message || 'Company created successfully',
                data: data.data
            };
        } catch (error) {
            console.error('API error:', error);
            return {
                success: false,
                message: 'Network error occurred'
            };
        }
    };

    // Helper function to get CSRF token
    const getCookie = (name) => {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    };

    // Setup collapsible sections functionality
    const setupCollapsibleSections = () => {
        // Find all collapsible headers
        const collapsibleHeaders = document.querySelectorAll('.collapsible-header');
        
        collapsibleHeaders.forEach(header => {
            // Find the toggle button and content for this header
            const toggleButton = header.querySelector('.collapse-toggle');
            const targetId = header.getAttribute('data-target');
            const content = document.getElementById(targetId);
            
            if (toggleButton && content) {
                // Add click event to the entire header
                header.addEventListener('click', (e) => {
                    // Don't toggle if clicking on other buttons (like Add Email/Phone)
                    if (e.target.closest('.btn-primary') && !e.target.closest('.collapse-toggle')) {
                        return;
                    }
                    
                    toggleSection(toggleButton, content);
                });
                
                // Specifically handle toggle button clicks
                toggleButton.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent double toggle from header click
                    toggleSection(toggleButton, content);
                });
            }
        });
    };

    // Toggle a collapsible section
    const toggleSection = (toggleButton, content) => {
        const isExpanded = toggleButton.getAttribute('aria-expanded') === 'true';
        
        if (isExpanded) {
            // Collapse the section
            toggleButton.setAttribute('aria-expanded', 'false');
            content.classList.add('collapsed');
            
            // Animate the chevron
            const icon = toggleButton.querySelector('i');
            if (icon) {
                icon.style.transform = 'rotate(180deg)';
            }
        } else {
            // Expand the section
            toggleButton.setAttribute('aria-expanded', 'true');
            content.classList.remove('collapsed');
            
            // Animate the chevron
            const icon = toggleButton.querySelector('i');
            if (icon) {
                icon.style.transform = 'rotate(0deg)';
            }
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
            let companyData = null;

            // First, try to use the company info passed from Django template
            if (window.companyInfo && Object.keys(window.companyInfo).length > 0) {
                console.log("Using company info from Django template:", window.companyInfo);
                companyData = window.companyInfo;
            } else {
                // Fallback to API call if no data from template
                console.log("Fetching company details from API...");

                const response = await fetch(`${window.API_BASE_URL}/api/v1/companies`, {
                    method: 'GET',
                    headers: Auth.getAuthHeader(),
                    credentials: 'include'
                });

                // if (!response.ok) {
                //     throw new Error(`Error: ${response.status}`);
                // }

                const result = await response.json();
                console.log("Company details from API:", result);
                companyData = result.data || {};
            }

            // Save company data to module variable
            window.Settings = window.Settings || {};
            window.Settings.companyData = companyData;

            // Update form fields with company details using the correct unique IDs
            const nameField = document.getElementById('details-company-name');
            if (nameField && companyData.name) {
                nameField.value = companyData.name;
                console.log("Updated company name field:", companyData.name);
            }

            const logoUrlField = document.getElementById('details-company-logo-url');
            if (logoUrlField && companyData.logo_url) {
                logoUrlField.value = companyData.logo_url;
                console.log("Updated logo URL field:", companyData.logo_url);
            }

            const websiteField = document.getElementById('details-company-website');
            if (websiteField && companyData.website) {
                websiteField.value = companyData.website;
                console.log("Updated website field:", companyData.website);
            }

            const descriptionField = document.getElementById('details-company-description');
            if (descriptionField && companyData.description) {
                descriptionField.value = companyData.description;
                console.log("Updated description field:", companyData.description);
            }

            const teamSizeField = document.getElementById('details-company-team-size');
            if (teamSizeField && companyData.team_size) {
                teamSizeField.value = companyData.team_size;
                console.log("Updated team size field:", companyData.team_size);
            }

            const typeField = document.getElementById('details-company-type');
            if (typeField && companyData.type) {
                typeField.value = companyData.type;
                console.log("Updated type field:", companyData.type);
            }

            console.log("Company details form populated successfully");

        } catch (error) {
            console.error('Error loading company details:', error);
            showToast('Failed to load company details. Please try again.', 'error');
        }
    };

    // Load company emails from the API
    const loadCompanyEmails = async () => {
        try {
            // Fetch company emails from the API
            const result = await api.request('/users/api/v1/companies/emails');
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

    // Load company phones from the API
    const loadCompanyPhones = async () => {
        try {
            // Fetch company phones from the API
            const result = await api.request(`/users/api/v1/companies/phones`);
            console.log("Company phones:", result);

            // Save the phones in the module state
            companyPhones = result.data || [];

            // Clear existing phone fields
            const phonesContainer = document.getElementById('phones-container');
            if (phonesContainer) {
                // Update the phone fields based on the returned data
                if (companyPhones.length > 0) {
                    // Clear the container completely if we have phones
                    phonesContainer.innerHTML = '';

                    // Add phone fields based on the API response
                    companyPhones.forEach((phone, index) => {
                        const phoneEntry = document.createElement('div');
                        phoneEntry.className = 'phone-entry';
                        phoneEntry.innerHTML = `
                            <div class="form-row">
                                <div class="form-group flex-grow-1">
                                    <label for="company-phone-${index}">Phone Number</label>
                                    <input type="tel" id="company-phone-${index}" name="company-phone-${index}" class="company-phone" value="${phone.number}" required data-phone-id="${phone.id}">
                                </div>
                                <div class="form-group phone-type-group">
                                    <label for="company-phone-type-${index}">Type</label>
                                    <select id="company-phone-type-${index}" name="company-phone-type-${index}" class="phone-type">
                                        <option value="primary" ${phone.type === 'primary' ? 'selected' : ''}>Primary</option>
                                        <option value="business" ${phone.type === 'business' ? 'selected' : ''}>Business</option>
                                        <option value="mobile" ${phone.type === 'mobile' ? 'selected' : ''}>Mobile</option>
                                        <option value="fax" ${phone.type === 'fax' ? 'selected' : ''}>Fax</option>
                                        <option value="other" ${phone.type === 'other' ? 'selected' : ''}>Other</option>
                                    </select>
                                </div>
                                <div class="form-group delete-btn-container">
                                    <label>&nbsp;</label>
                                    <button type="button" class="btn-danger delete-phone-btn" data-index="${index}" ${index === 0 && companyPhones.length === 1 ? 'disabled' : ''}>
                                        <i class="fas fa-trash-alt"></i>
                                    </button>
                                </div>
                            </div>
                        `;
                        phonesContainer.appendChild(phoneEntry);
                    });
                } else {
                    // If no phones, ensure there's at least one empty field
                    const firstPhoneInput = document.getElementById('company-phone-0');
                    if (firstPhoneInput) {
                        firstPhoneInput.value = '';
                    }
                }

                // Re-setup the delete handlers
                setupDeletePhoneButtons();
            }
        } catch (error) {
            console.error('Error loading company phones:', error);
            showToast('Failed to load company phones. Please try again.', 'error');
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

    // Add a new phone field
    const addPhoneField = () => {
        const phonesContainer = document.getElementById('phones-container');
        const index = document.querySelectorAll('.phone-entry').length;

        const phoneEntry = document.createElement('div');
        phoneEntry.className = 'phone-entry';
        phoneEntry.innerHTML = `
            <div class="form-row">
                <div class="form-group flex-grow-1">
                    <label for="company-phone-${index}">Phone Number</label>
                    <input type="tel" id="company-phone-${index}" name="company-phone-${index}" class="company-phone" required>
                </div>
                <div class="form-group phone-type-group">
                    <label for="company-phone-type-${index}">Type</label>
                    <select id="company-phone-type-${index}" name="company-phone-type-${index}" class="phone-type">
                        <option value="primary">Primary</option>
                        <option value="business">Business</option>
                        <option value="mobile">Mobile</option>
                        <option value="fax">Fax</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div class="form-group delete-btn-container">
                    <label>&nbsp;</label>
                    <button type="button" class="btn-danger delete-phone-btn" data-index="${index}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `;

        phonesContainer.appendChild(phoneEntry);

        // Setup delete handler for the new phone entry
        setupDeletePhoneButtons();
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

                await api.request('/users/api/v1/companies/emails', {
                    body: JSON.stringify(requestData),
                    method: 'POST'
                });
            }

            // Delete emails
            // for (const emailId of emailsToDelete) {
            //     const response = await fetch(`http://127.0.0.1:8000/api/v1/companies/emails/${emailId}`, {
            //         method: 'DELETE',
            //         headers: Auth.getAuthHeader(),
            //         credentials: 'include'
            //     });
            //
            //     if (!response.ok) {
            //         throw new Error(`Error deleting email: ${response.status}`);
            //     }
            // }

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
            // Validate required fields using the correct unique IDs
            const nameInput = document.getElementById('details-company-name');
            if (!nameInput.value.trim()) {
                showToast('Company name is required', 'error');
                nameInput.focus();
                return;
            }

            // Prepare company data with proper type conversion using the correct field IDs
            const detailsData = {
                name: nameInput.value.trim(),
                type: document.getElementById('details-company-type')?.value?.trim() || '',
                logo_url: document.getElementById('details-company-logo-url')?.value?.trim() || '',
                website: document.getElementById('details-company-website')?.value?.trim() || '',
                description: document.getElementById('details-company-description')?.value?.trim() || '',
                team_size: parseInt(document.getElementById('details-company-team-size')?.value) || 0
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
                    phone: input.value,
                });
            }
        });

        // Use the first phone as the primary phone
        const primaryPhone = phones.length > 0 ? phones[0].number : '';

        const phoneData = {
            company_phones: phones
        };

        try {

            // Disable submit button and show loading state
            const submitBtn = document.querySelector('#company-phones-form button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';

            // Send request to update company phones
            const result = await api.request('/users/api/v1/companies/phones', {
                method: 'POST',
                body: JSON.stringify(phoneData)
            });

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
