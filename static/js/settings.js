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

        // Setup tab switching
        setupTabSwitching();

        // Setup profile form
        setupProfileForm();

        // Setup profile photo upload
        setupProfilePhoto();

        // Setup language multi-select
        setupLanguageMultiSelect();

        // Setup company information functionality
        setupCompanyForm();

        // Setup company creation functionality
        setupCreateCompanyForm();

        // Setup collapsible sections
        setupCollapsibleSections();

        // Load user profile data
        loadUserProfile();

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

    // Setup tab switching functionality
    const setupTabSwitching = () => {
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tabName = e.currentTarget.dataset.tab;
                switchTab(tabName);
            });
        });
    };

    // Switch between tabs
    const switchTab = (tabName) => {
        // Update button states
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab content
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === `${tabName}-tab`);
        });
    };

    // Load user profile data
    const loadUserProfile = () => {
        const userData = window.userData;
        if (!userData) return;

        // Populate profile form fields
        const firstNameInput = document.getElementById('profile-first-name');
        const lastNameInput = document.getElementById('profile-last-name');
        const emailInput = document.getElementById('profile-email');
        const phoneInput = document.getElementById('profile-phone');
        const positionInput = document.getElementById('profile-position');

        if (firstNameInput) firstNameInput.value = userData.first_name || '';
        if (lastNameInput) lastNameInput.value = userData.last_name || '';
        if (emailInput) emailInput.value = userData.email || '';
        if (phoneInput) phoneInput.value = userData.phone || '';
        if (positionInput) positionInput.value = userData.position || '';
    };

    // Setup profile form submission
    const setupProfileForm = () => {
        const profileForm = document.getElementById('profile-form');
        if (!profileForm) return;

        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = {
                first_name: document.getElementById('profile-first-name').value.trim(),
                last_name: document.getElementById('profile-last-name').value.trim(),
                email: document.getElementById('profile-email').value.trim(),
                phone: document.getElementById('profile-phone').value.trim(),
                languages: document.getElementById('profile-languages').value.trim(),
                position: document.getElementById('profile-position').value.trim()
            };

            try {
                const result = await updateUserProfile(formData);

                if (result.success) {
                    showToast('Profile updated successfully!', 'success');

                    // Update the window.userData object
                    window.userData = { ...window.userData, ...formData };

                    // Update the welcome message if it exists
                    const welcomeMessage = document.querySelector('.user-name');
                    if (welcomeMessage) {
                        welcomeMessage.textContent = `Welcome, ${formData.first_name}!`;
                    }
                } else {
                    showToast(result.message || 'Error updating profile', 'error');
                }
            } catch (error) {
                console.error('Error updating profile:', error);
                showToast('Error updating profile', 'error');
            }
        });
    };

    // Update user profile
    const updateUserProfile = async (profileData) => {
        try {
            const apiUrl = `/users/api/v1/users/me`;

            const response = await api.request(apiUrl, {
                method: 'PUT',
                body: JSON.stringify(profileData)
            });

            if (!response.success) {
                return {
                    success: false,
                    message: response.message || 'Failed to update profile'
                };
            }

            return response;
        } catch (error) {
            console.error('Error updating profile:', error);
            return {
                success: false,
                message: error.message
            };
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

        // Setup form validation for company details
        setupFormValidation('company-details-form');

        // Company emails form functionality
        const addEmailBtn = document.getElementById('add-email-btn');
        const emailsContainer = document.getElementById('emails-container');
        const emailsForm = document.getElementById('company-emails-form');

        if (addEmailBtn) {
            addEmailBtn.addEventListener('click', () => {
                // Open the collapsible section if it's closed
                const emailsContent = document.getElementById('company-emails-content');
                const emailsToggle = document.querySelector('[data-target="company-emails-content"] .collapse-toggle');
                if (emailsContent && emailsContent.classList.contains('collapsed')) {
                    toggleSection(emailsToggle, emailsContent);
                }
                addEmailField();
            });
        }

        if (emailsForm) {
            emailsForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await saveCompanyEmails();
            });

            // Setup form validation for emails
            setupFormValidation('company-emails-form');
        }

        // Setup delete email modal handlers ONCE
        setupEmailDeleteModal();

        // Setup delete email button handlers
        setupEmailDeleteHandlers();

        // Company phones form functionality
        const phonesForm = document.getElementById('company-phones-form');
        phonesForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveCompanyPhones();
        });

        // Setup form validation for phones
        // setupFormValidation('company-phones-form');

        // Setup add phone button
        const addPhoneBtn = document.getElementById('add-phone-btn');
        if (addPhoneBtn) {
            addPhoneBtn.addEventListener('click', () => {
                // Open the collapsible section if it's closed
                const phonesContent = document.getElementById('company-phones-content');
                const phonesToggle = document.querySelector('[data-target="company-phones-content"] .collapse-toggle');
                if (phonesContent && phonesContent.classList.contains('collapsed')) {
                    toggleSection(phonesToggle, phonesContent);
                }
                addPhoneField();
            });
        }

        // Setup delete phone modal handlers ONCE
        setupPhoneDeleteModal();

        // Setup initial delete phone buttons
        setupDeletePhoneButtons();

        // Setup form validation for address
        setupFormValidation('company-address-form');
    };

    // Setup form validation to enable/disable save buttons based on data
    const setupFormValidation = (formId) => {
        const form = document.getElementById(formId);
        if (!form) return;

        const submitButton = form.querySelector('button[type="submit"]');
        if (!submitButton) return;

        // Store original form values to detect changes
        const originalValues = {};
        const formInputs = form.querySelectorAll('input, textarea, select');

        formInputs.forEach(input => {
            originalValues[input.id || input.name] = input.value;
        });

        // Function to check if form has data and has changed
        const validateForm = () => {
            let hasData = false;
            let hasChanges = false;

            const inputs = form.querySelectorAll('input, textarea, select');

            inputs.forEach(input => {
                // Skip if it's a delete button or hidden input
                if (input.type === 'button' || input.type === 'hidden') return;

                // Check if input has value
                if (input.value && input.value.trim() !== '') {
                    hasData = true;
                }

                // Check if value has changed from original
                const originalValue = originalValues[input.id || input.name] || '';
                if (input.value !== originalValue) {
                    hasChanges = true;
                }
            });

            // Add/remove inactive class based on data and changes
            const shouldBeInactive = !hasData || !hasChanges;
            if (shouldBeInactive) {
                submitButton.classList.add('btn-inactive');
                submitButton.disabled = true;
            } else {
                submitButton.classList.remove('btn-inactive');
                submitButton.disabled = false;
            }
        };

        // Add event listeners to all form inputs
        formInputs.forEach(input => {
            input.addEventListener('input', validateForm);
            input.addEventListener('change', validateForm);
        });

        // Run initial validation
        validateForm();

        // Update original values after successful save
        form.addEventListener('formSaved', () => {
            const inputs = form.querySelectorAll('input, textarea, select');
            inputs.forEach(input => {
                originalValues[input.id || input.name] = input.value;
            });
            validateForm();
        });
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
            const result = await api.request('/users/api/v1/companies/all/emails');
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
            const result = await api.request(`/users/api/v1/companies/all/phones`);
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
                                    <input type="tel" id="company-phone-${index}" name="company-phone-${index}" class="company-phone" value="${phone.phone}" required data-phone-id="${phone.id}">
                                </div>
                                <div class="form-group phone-type-group">
                                    <label for="company-phone-type-${index}">Type</label>
                                    <select id="company-phone-type-${index}" name="company-phone-type-${index}" class="phone-type">
                                        <option value="primary" ${phone.is_primary === true ? 'selected' : ''}>Primary</option>
                                        <option value="other" ${phone.is_primary === false ? 'selected' : ''}>Other</option>
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

        // Re-setup form validation for the emails form
        setupFormValidation('company-emails-form');
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

        // Re-setup form validation for the phones form
        // setupFormValidation('company-phones-form');
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
    };

    // Setup the email delete modal buttons (called once during initialization)
    const setupEmailDeleteModal = () => {
        const deleteModal = document.getElementById('delete-email-modal');
        if (!deleteModal) return;

        // Cancel delete button
        const cancelBtn = document.getElementById('cancel-delete-email-btn');
        const confirmBtn = document.getElementById('confirm-delete-email-btn');
        const closeBtn = deleteModal.querySelector('.close-modal');

        // Remove existing listeners by cloning and replacing (prevents duplicates)
        if (cancelBtn) {
            const newCancelBtn = cancelBtn.cloneNode(true);
            cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
            newCancelBtn.addEventListener('click', () => {
                deleteModal.style.display = 'none';
            });
        }

        if (confirmBtn) {
            const newConfirmBtn = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
            newConfirmBtn.addEventListener('click', () => {
                deleteEmail(currentEmailId);
            });
        }

        if (closeBtn) {
            const newCloseBtn = closeBtn.cloneNode(true);
            closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
            newCloseBtn.addEventListener('click', () => {
                deleteModal.style.display = 'none';
            });
        }

        // Close modal by clicking outside (use once to avoid duplicates)
        deleteModal.addEventListener('click', (e) => {
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

            // Delete email from the API using the correct endpoint - ADD AWAIT
            const response = await api.request(`/users/api/v1/companies/emails/${emailId}`, {
                method: 'DELETE'
            });

            if (!response.success) {
                throw new Error(response.message || 'Failed to delete email');
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

                const result = await api.request('/users/api/v1/companies/emails', {
                    body: JSON.stringify(requestData),
                    method: 'POST'
                });

                // Check if the save was successful
                if (!result.success) {
                    throw new Error(result.message || 'Failed to save company emails');
                }
            }

            // Reload company emails
            await loadCompanyEmails();

            showToast('Company emails saved successfully', 'success');
        } catch (error) {
            console.error('Error saving company emails:', error);
            showToast(`Failed to save company emails: ${error.message}`, 'error');
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
            submitBtn.classList.add('btn-inactive');
            submitBtn.textContent = 'Saving...';

            // Send request to update company details using api-client
            const result = await api.request('/users/api/v1/companies', {
                method: 'PUT',
                body: JSON.stringify(detailsData)
            });

            if (!result.success) {
                throw new Error(result.message || 'Failed to update company details');
            }

            // Update local data
            companyData = { ...companyData, ...result.data };

            // Trigger the formSaved event to update validation state
            const form = document.getElementById('company-details-form');
            form.dispatchEvent(new Event('formSaved'));

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
            submitBtn.classList.remove('btn-inactive');
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
                const phoneType = phoneTypeInputs[index]?.value || 'other';
                phones.push({
                    phone: input.value,
                    is_primary: phoneType === 'primary'
                });
            }
        });

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
            // Check if the save was successful
            if (!result.success) {
                throw new Error(result.message || 'Failed to save company emails');
            }
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
                }
            });
        });
    };

    // Setup the phone delete modal buttons (called once during initialization)
    const setupPhoneDeleteModal = () => {
        const deleteModal = document.getElementById('delete-phone-modal');
        if (!deleteModal) return;

        // Cancel delete button
        const cancelBtn = document.getElementById('cancel-delete-phone-btn');
        const confirmBtn = document.getElementById('confirm-delete-phone-btn');
        const closeBtn = deleteModal.querySelector('.close-modal');

        // Remove existing listeners by cloning and replacing (prevents duplicates)
        if (cancelBtn) {
            const newCancelBtn = cancelBtn.cloneNode(true);
            cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
            newCancelBtn.addEventListener('click', () => {
                deleteModal.style.display = 'none';
            });
        }

        if (confirmBtn) {
            const newConfirmBtn = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
            newConfirmBtn.addEventListener('click', () => {
                deletePhone(currentPhoneId);
            });
        }

        if (closeBtn) {
            const newCloseBtn = closeBtn.cloneNode(true);
            closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
            newCloseBtn.addEventListener('click', () => {
                deleteModal.style.display = 'none';
            });
        }

        // Close modal by clicking outside (use once to avoid duplicates)
        deleteModal.addEventListener('click', (e) => {
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

            // Delete phone from the API using the correct endpoint - ADD AWAIT
            const response = await api.request(`/users/api/v1/companies/phones/${phoneId}`, {
                method: 'DELETE'
            });

            if (!response.success) {
                throw new Error(response.message || 'Failed to delete phone');
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


    // Profile Photo Functionality
    const setupProfilePhoto = () => {
        const uploadBtn = document.getElementById('upload-photo-btn');
        const removeBtn = document.getElementById('remove-photo-btn');
        const fileInput = document.getElementById('profile-photo-input');
        const photoImg = document.getElementById('profile-photo-img');
        const photoPlaceholder = document.getElementById('profile-photo-placeholder');

        if (!uploadBtn || !fileInput || !photoImg || !photoPlaceholder) return;

        // Load existing profile photo if available
        if (window.userData && window.userData.profile_photo_url) {
            displayProfilePhoto(window.userData.profile_photo_url);
        }

        // Upload button click - trigger file input
        uploadBtn.addEventListener('click', () => {
            fileInput.click();
        });

        // File input change - upload photo
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Validate file type
            if (!file.type.startsWith('image/')) {
                showToast('Please select a valid image file', 'error');
                return;
            }

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                showToast('Image size must be less than 5MB', 'error');
                return;
            }

            // Show loading state
            uploadBtn.disabled = true;
            uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';

            try {
                const result = await uploadProfilePhoto(file);

                if (result.success) {
                    showToast('Profile photo updated successfully!', 'success');
                    displayProfilePhoto(result.data.profile_photo_url || result.profile_photo_url);

                    // Update window.userData
                    if (window.userData) {
                        window.userData.profile_photo_url = result.data.profile_photo_url || result.profile_photo_url;
                    }
                } else {
                    showToast(result.message || 'Failed to upload photo', 'error');
                }
            } catch (error) {
                console.error('Error uploading photo:', error);
                showToast('Error uploading photo', 'error');
            } finally {
                // Reset button state
                uploadBtn.disabled = false;
                uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Upload Photo';
                fileInput.value = '';
            }
        });

        // Remove button click
        if (removeBtn) {
            removeBtn.addEventListener('click', async () => {
                if (!confirm('Are you sure you want to remove your profile photo?')) {
                    return;
                }

                removeBtn.disabled = true;
                removeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Removing...';

                try {
                    const result = await removeProfilePhoto();

                    if (result.success) {
                        showToast('Profile photo removed successfully!', 'success');
                        hideProfilePhoto();

                        // Update window.userData
                        if (window.userData) {
                            window.userData.profile_photo_url = null;
                        }
                    } else {
                        showToast(result.message || 'Failed to remove photo', 'error');
                    }
                } catch (error) {
                    console.error('Error removing photo:', error);
                    showToast('Error removing photo', 'error');
                } finally {
                    removeBtn.disabled = false;
                    removeBtn.innerHTML = '<i class="fas fa-trash"></i> Remove';
                }
            });
        }

        function displayProfilePhoto(photoUrl) {
            if (photoImg && photoPlaceholder && removeBtn) {
                photoImg.src = photoUrl;
                photoImg.style.display = 'block';
                photoPlaceholder.style.display = 'none';
                removeBtn.style.display = 'inline-flex';
            }
        }

        function hideProfilePhoto() {
            if (photoImg && photoPlaceholder && removeBtn) {
                photoImg.src = '';
                photoImg.style.display = 'none';
                photoPlaceholder.style.display = 'flex';
                removeBtn.style.display = 'none';
            }
        }
    };

    // Upload profile photo to API
    const uploadProfilePhoto = async (file) => {
        try {
            const formData = new FormData();
            formData.append('file', file);

            console.log('Uploading file:', file.name, file.type, file.size);
            console.log('FormData entries:', Array.from(formData.entries()));

            const apiUrl = `/users/api/v1/users/me/profile-photo`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers.get('content-type'));

            const responseText = await response.text();
            console.log('Response text:', responseText);

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error('Failed to parse response as JSON:', e);
                return {
                    success: false,
                    message: 'Invalid response from server'
                };
            }

            console.log('Response data:', data);

            if (!response.ok || !data.success) {
                return {
                    success: false,
                    message: data.message || (data.detail ? JSON.stringify(data.detail) : 'Failed to upload profile photo')
                };
            }

            return data;
        } catch (error) {
            console.error('Error uploading profile photo:', error);
            return {
                success: false,
                message: error.message
            };
        }
    };

    // Remove profile photo from API
    const removeProfilePhoto = async () => {
        try {
            const apiUrl = `/users/api/v1/users/me/profile-photo`;

            const response = await api.request(apiUrl, {
                method: 'DELETE'
            });

            if (!response.success) {
                return {
                    success: false,
                    message: response.message || 'Failed to remove profile photo'
                };
            }

            return response;
        } catch (error) {
            console.error('Error removing profile photo:', error);
            return {
                success: false,
                message: error.message
            };
        }
    };


    // Language Multi-Select Functionality
    const languageList = [
        'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Russian',
        'Chinese (Mandarin)', 'Japanese', 'Korean', 'Arabic', 'Hindi', 'Bengali',
        'Turkish', 'Dutch', 'Swedish', 'Polish', 'Danish', 'Norwegian', 'Finnish',
        'Greek', 'Czech', 'Hungarian', 'Romanian', 'Thai', 'Vietnamese', 'Indonesian',
        'Malay', 'Hebrew', 'Ukrainian', 'Persian (Farsi)', 'Urdu', 'Swahili',
        'Tamil', 'Telugu', 'Marathi', 'Gujarati', 'Kannada', 'Punjabi', 'Malayalam',
        'Serbian', 'Croatian', 'Slovak', 'Bulgarian', 'Catalan', 'Estonian', 'Latvian',
        'Lithuanian', 'Slovenian', 'Albanian', 'Macedonian', 'Icelandic', 'Georgian',
        'Armenian', 'Azerbaijani', 'Kazakh', 'Uzbek', 'Mongolian', 'Burmese', 'Khmer',
        'Lao', 'Tagalog (Filipino)', 'Amharic', 'Nepali', 'Sinhala', 'Pashto', 'Kurdish'
    ];

    let selectedLanguages = [];

    const setupLanguageMultiSelect = () => {
        const searchInput = document.getElementById('language-search');
        const dropdown = document.getElementById('language-dropdown');
        const selectedContainer = document.getElementById('selected-languages');
        const hiddenInput = document.getElementById('profile-languages');

        if (!searchInput || !dropdown || !selectedContainer || !hiddenInput) return;

        // Initialize selected languages from user data
        if (window.userData && window.userData.languages) {
            const languages = window.userData.languages.split(',').map(lang => lang.trim()).filter(lang => lang);
            selectedLanguages = [...languages];
            renderSelectedLanguages();
            updateHiddenInput();
        }

        // Populate dropdown with all languages
        populateLanguageDropdown();

        // Search input focus - show dropdown
        searchInput.addEventListener('focus', () => {
            dropdown.style.display = 'block';
            populateLanguageDropdown(searchInput.value);
        });

        // Search input - filter languages
        searchInput.addEventListener('input', (e) => {
            populateLanguageDropdown(e.target.value);
        });

        // Click outside to close dropdown
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
                searchInput.value = '';
            }
        });

        function populateLanguageDropdown(searchTerm = '') {
            dropdown.innerHTML = '';
            const term = searchTerm.toLowerCase();

            const filteredLanguages = languageList.filter(lang =>
                lang.toLowerCase().includes(term)
            );

            if (filteredLanguages.length === 0) {
                dropdown.innerHTML = '<div class="language-option" style="color: #999;">No languages found</div>';
                return;
            }

            filteredLanguages.forEach(language => {
                const option = document.createElement('div');
                option.className = 'language-option';
                option.textContent = language;

                if (selectedLanguages.includes(language)) {
                    option.classList.add('selected');
                }

                option.addEventListener('click', () => {
                    toggleLanguage(language);
                    searchInput.value = '';
                    populateLanguageDropdown();
                });

                dropdown.appendChild(option);
            });
        }

        function toggleLanguage(language) {
            const index = selectedLanguages.indexOf(language);
            if (index > -1) {
                selectedLanguages.splice(index, 1);
            } else {
                selectedLanguages.push(language);
            }
            renderSelectedLanguages();
            updateHiddenInput();
        }

        function renderSelectedLanguages() {
            selectedContainer.innerHTML = '';

            selectedLanguages.forEach(language => {
                const chip = document.createElement('div');
                chip.className = 'language-chip';

                const languageText = document.createElement('span');
                languageText.textContent = language;

                const removeBtn = document.createElement('span');
                removeBtn.className = 'language-chip-remove';
                removeBtn.innerHTML = '<i class="fas fa-times"></i>';
                removeBtn.addEventListener('click', () => {
                    toggleLanguage(language);
                    populateLanguageDropdown(searchInput.value);
                });

                chip.appendChild(languageText);
                chip.appendChild(removeBtn);
                selectedContainer.appendChild(chip);
            });
        }

        function updateHiddenInput() {
            hiddenInput.value = selectedLanguages.join(', ');
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
