// Company Settings Module
const CompanySettings = (() => {
    // Keep track of current email/phone being deleted
    let currentEmailId = null;
    let currentPhoneId = null;
    let companyEmails = [];
    let companyPhones = [];

    // Toast notification function
    const showToast = (message, type = 'info') => {
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

        toast.textContent = message;
        toastContainer.appendChild(toast);

        setTimeout(() => toast.style.opacity = '1', 10);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => {
                toastContainer.removeChild(toast);
                if (toastContainer.children.length === 0) {
                    document.body.removeChild(toastContainer);
                }
            }, 300);
        }, 3000);
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

    // Initialize tab switching
    const setupTabs = () => {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabPanels = document.querySelectorAll('.tab-panel');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.getAttribute('data-tab');

                // Remove active class from all buttons and panels
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabPanels.forEach(panel => panel.classList.remove('active'));

                // Add active class to clicked button and corresponding panel
                button.classList.add('active');
                const targetPanel = document.getElementById(targetTab);
                if (targetPanel) {
                    targetPanel.classList.add('active');
                }
            });
        });
    };

    // Initialize the company settings page
    const init = async () => {
        console.log('Initializing company settings page');

        // Setup tabs
        setupTabs();

        // Setup company creation functionality
        setupCreateCompanyForm();

        // Setup collapsible sections (if any remain)
        setupCollapsibleSections();

        // Setup company forms
        setupCompanyForm();

        // Check if user has a company
        const hasCompany = window.userCompanyId && window.userCompanyId !== 'None' && window.userCompanyId !== '';

        console.log('User has company:', hasCompany, 'Company ID:', window.userCompanyId);

        if (hasCompany) {
            // Load company data
            await loadCompanyDetails();
            await loadCompanyEmails();
            await loadCompanyPhones();
            await loadCompanyAddress();
        } else {
            console.log('User does not have a company. Showing create company form.');
            const createCompanyForm = document.getElementById('create-company-form');
            if (createCompanyForm) {
                createCompanyForm.style.display = 'block';
            }
        }
    };

    // Setup company creation form
    const setupCreateCompanyForm = () => {
        const createCompanyForm = document.getElementById('create-company-form');
        if (!createCompanyForm) return;

        // Show the form immediately if it exists
        createCompanyForm.style.display = 'block';

        createCompanyForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Prevent page refresh

            try {
                const formData = {
                    name: document.getElementById('company-name').value.trim(),
                    type: document.getElementById('company-type').value.trim(),
                    logo_url: document.getElementById('company-logo-url').value.trim(),
                    website: document.getElementById('company-website').value.trim(),
                    description: document.getElementById('company-description').value.trim(),
                    team_size: parseInt(document.getElementById('company-team-size').value) || 1
                };

                // Show loading state
                const submitBtn = createCompanyForm.querySelector('button[type="submit"]');
                const originalBtnText = submitBtn.innerHTML;
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';

                const result = await createCompany(formData);

                // Restore button state
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;

                if (result.success) {
                    UI.showToast(window.settingsTranslations?.companyCreatedSuccess || 'Company created successfully!', 'success');

                    setTimeout(() => {
                        window.location.href = '/users/dashboard/';
                    }, 2000);
                } else {
                    UI.showToast(result.message || window.settingsTranslations?.errorSavingCompany || 'Failed to create company');
                }
            } catch (error) {
                console.error('Error creating company:', error);
                UI.showToast(window.settingsTranslations?.errorSavingCompany || 'An error occurred', 'error');

                // Restore button state
                const submitBtn = createCompanyForm.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = 'Save Company';
                }
            }
        });
    };

    // Create a new company
    const createCompany = async (companyData) => {
        try {
            const response = await api.request('/users/api/v1/companies', {
                method: 'POST',
                body: JSON.stringify(companyData)
            });

            if (!response.success) {
                return {
                    success: false,
                    message: response.message ||'Failed to create company'
                };
            }

            return {
                success: response.success || true,
                message: response.message || 'Company created successfully'
            };
        } catch (error) {
            console.error('API error:', error);
            return {
                success: false,
                message: 'Network error occurred'
            };
        }
    };

    // Setup collapsible sections
    const setupCollapsibleSections = () => {
        const collapsibleHeaders = document.querySelectorAll('.collapsible-header');

        collapsibleHeaders.forEach(header => {
            const toggleButton = header.querySelector('.collapse-toggle');
            const targetId = header.getAttribute('data-target');
            const content = document.getElementById(targetId);

            if (toggleButton && content) {
                header.addEventListener('click', (e) => {
                    if (e.target.closest('.btn-primary') && !e.target.closest('.collapse-toggle')) {
                        return;
                    }
                    toggleSection(toggleButton, content);
                });

                toggleButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleSection(toggleButton, content);
                });
            }
        });
    };

    // Toggle section visibility
    const toggleSection = (button, content) => {
        const isExpanded = button.getAttribute('aria-expanded') === 'true';

        button.setAttribute('aria-expanded', !isExpanded);
        content.classList.toggle('collapsed');

        const icon = button.querySelector('i');
        if (icon) {
            if (isExpanded) {
                icon.classList.remove('fa-chevron-down');
                icon.classList.add('fa-chevron-up');
            } else {
                icon.classList.remove('fa-chevron-up');
                icon.classList.add('fa-chevron-down');
            }
        }
    };

    // Setup company forms
    const setupCompanyForm = () => {
        const companyDetailsForm = document.getElementById('company-details-form');
        if (companyDetailsForm) {
            companyDetailsForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await saveCompanyDetails();
            });
        }

        const addEmailBtn = document.getElementById('add-email-btn');
        if (addEmailBtn) {
            addEmailBtn.addEventListener('click', addEmailField);
        }

        const companyEmailsForm = document.getElementById('company-emails-form');
        if (companyEmailsForm) {
            companyEmailsForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await saveCompanyEmails();
            });
        }

        setupEmailDeleteModal();

        const addPhoneBtn = document.getElementById('add-phone-btn');
        if (addPhoneBtn) {
            addPhoneBtn.addEventListener('click', addPhoneField);
        }

        const companyPhonesForm = document.getElementById('company-phones-form');
        if (companyPhonesForm) {
            companyPhonesForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await saveCompanyPhones();
            });
        }

        setupPhoneDeleteModal();

        const companyAddressForm = document.getElementById('company-address-form');
        if (companyAddressForm) {
            companyAddressForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await saveCompanyAddress();
            });
        }
    };

    // Load company details
    const loadCompanyDetails = async () => {
        const companyInfo = window.companyInfo;
        if (!companyInfo) return;

        const fields = {
            'details-company-name': companyInfo.name,
            'details-company-logo-url': companyInfo.logo_url,
            'details-company-website': companyInfo.website,
            'details-company-description': companyInfo.description,
            'details-company-team-size': companyInfo.team_size,
            'details-company-type': companyInfo.type
        };

        Object.entries(fields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element && value) {
                element.value = value;
            }
        });
    };

    // Save company details
    const saveCompanyDetails = async () => {
        // Validate required fields using the correct unique IDs
        const nameInput = document.getElementById('details-company-name');
        if (!nameInput.value.trim()) {
            showToast('Company name is required', 'error');
            nameInput.focus();
            return;
        }
        const formData = {
            name: document.getElementById('details-company-name').value.trim(),
            logo_url: document.getElementById('details-company-logo-url').value.trim(),
            website: document.getElementById('details-company-website').value.trim(),
            description: document.getElementById('details-company-description').value.trim(),
            team_size: parseInt(document.getElementById('details-company-team-size').value) || 1,
            type: document.getElementById('details-company-type').value.trim()
        };
        UI.showLoader();

        try {
            // Send request to update company details using api-client
            const result = await api.request('/users/api/v1/companies', {
                method: 'PUT',
                body: JSON.stringify(formData)
            });
            UI.hideLoader();
            if (result.success) {
                UI.showToast(window.settingsTranslations?.companyUpdatedSuccess || 'Company details updated successfully!', 'success');
                window.companyInfo = { ...window.companyInfo, ...formData };
            } else {
                UI.showToast(result.message || window.settingsTranslations?.errorUpdatingCompany || 'Failed to update company details', 'error');
            }
        } catch (error) {
            UI.hideLoader();
            console.error('Error updating company details:', error);
            UI.showToast(window.settingsTranslations?.errorUpdatingCompany || 'Error updating company details', 'error');
        }
    };

    // Load company emails
    const loadCompanyEmails = async () => {
        const emails = window.companyEmails;
        if (!emails || !Array.isArray(emails) || emails.length === 0) {
            console.log('No company emails found');
            return;
        }

        companyEmails = emails;
        const emailsContainer = document.getElementById('emails-container');
        if (!emailsContainer) return;

        emailsContainer.innerHTML = '';

        emails.forEach((emailData, index) => {
            const emailEntry = createEmailEntry(index, emailData);
            emailsContainer.appendChild(emailEntry);
        });

        setupEmailDeleteHandlers();
    };

    // Create email entry HTML
    const createEmailEntry = (index, emailData = null) => {
        const entry = document.createElement('div');
        entry.className = 'email-entry';
        entry.setAttribute('data-email-id', emailData?.id || '');

        entry.innerHTML = `
            <div class="form-row">
                <div class="form-group flex-grow-1">
                    <label for="company-email-${index}">Email</label>
                    <input type="email" id="company-email-${index}" 
                           name="company-email-${index}" 
                           class="company-email" 
                           value="${emailData?.email || ''}" 
                           required>
                </div>
                <div class="form-group email-type-group">
                    <label for="company-email-type-${index}">Type</label>
                    <select id="company-email-type-${index}" 
                            name="company-email-type-${index}" 
                            class="email-type">
                        <option value="primary" ${emailData?.type === 'primary' ? 'selected' : ''}>Primary</option>
                        <option value="billing" ${emailData?.type === 'billing' ? 'selected' : ''}>Billing</option>
                        <option value="support" ${emailData?.type === 'support' ? 'selected' : ''}>Support</option>
                        <option value="other" ${emailData?.type === 'other' ? 'selected' : ''}>Other</option>
                    </select>
                </div>
                <div class="form-group delete-btn-container">
                    <label>&nbsp;</label>
                    <button type="button" class="btn-danger delete-email-btn" 
                            data-index="${index}" 
                            data-email-id="${emailData?.id || ''}"
                            ${!emailData?.id ? 'disabled' : ''}>
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `;

        return entry;
    };

    // Add email field
    const addEmailField = () => {
        const emailsContainer = document.getElementById('emails-container');
        if (!emailsContainer) return;

        const currentCount = emailsContainer.querySelectorAll('.email-entry').length;
        const newEntry = createEmailEntry(currentCount);
        emailsContainer.appendChild(newEntry);

        // Enable delete button for newly added field
        const deleteBtn = newEntry.querySelector('.delete-email-btn');
        if (deleteBtn && currentCount > 0) {
            deleteBtn.disabled = false;
        }
    };

    // Setup email delete handlers
    const setupEmailDeleteHandlers = () => {
        const deleteButtons = document.querySelectorAll('.delete-email-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const emailId = button.getAttribute('data-email-id');
                const index = button.getAttribute('data-index');

                if (emailId) {
                    currentEmailId = emailId;
                    const modal = document.getElementById('delete-email-modal');
                    if (modal) modal.style.display = 'flex';
                } else {
                    // Just remove the entry if it's not saved
                    const entry = button.closest('.email-entry');
                    if (entry) entry.remove();
                }
            });
        });
    };

    // Setup email delete modal
    const setupEmailDeleteModal = () => {
        const modal = document.getElementById('delete-email-modal');
        if (!modal) return;

        const closeBtn = modal.querySelector('.close-modal');
        const cancelBtn = document.getElementById('cancel-delete-email-btn');
        const confirmBtn = document.getElementById('confirm-delete-email-btn');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
                currentEmailId = null;
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                modal.style.display = 'none';
                currentEmailId = null;
            });
        }

        if (confirmBtn) {
            confirmBtn.addEventListener('click', async () => {
                if (currentEmailId) {
                    await deleteEmail(currentEmailId);
                    modal.style.display = 'none';
                }
            });
        }

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
                currentEmailId = null;
            }
        });
    };

    // Delete email
    const deleteEmail = async (emailId) => {
        if (!emailId) return;
        try {
            UI.showLoader();
            const response = await api.request(`/users/api/v1/companies/emails/${emailId}`, {
                method: 'DELETE'
            });
            UI.hideLoader();
            if (response.success) {
                // Update window.companyEmails by removing the deleted email
                if (window.companyEmails && Array.isArray(window.companyEmails)) {
                    window.companyEmails = window.companyEmails.filter(email => email.id !== emailId);
                }

                UI.showToast('Email deleted successfully!', 'success');
                await loadCompanyEmails();
            } else {
                UI.showToast(response.message || 'Failed to delete email', 'error');
            }
        } catch (error) {
            UI.hideLoader();
            console.error('Error deleting email:', error);
            UI.showToast('Error deleting email', 'error');
        }
    };

    // Save company emails
    const saveCompanyEmails = async () => {
        const emailEntries = document.querySelectorAll('.email-entry');
        const emails = [];
        UI.showLoader();

        emailEntries.forEach((entry, index) => {
            const emailInput = entry.querySelector(`#company-email-${index}`);
            const typeSelect = entry.querySelector(`#company-email-type-${index}`);
            const emailId = entry.getAttribute('data-email-id');

            if (emailInput && emailInput.value.trim()) {
                emails.push({
                    email: emailInput.value.trim(),
                    status: typeSelect ? typeSelect.value : 'other',
                });
            }
        });

        // Get company ID from window object
        const companyId = window.userCompanyId || window.companyInfo?.id;

        if (!companyId) {
            UI.hideLoader();
            UI.showToast('Company ID not found', 'error');
            return;
        }

        try {
            const requestBody = {
                emails: emails,
                company_id: companyId
            };

            const result = await api.request('/users/api/v1/companies/emails', {
                body: JSON.stringify(requestBody),
                method: 'POST'
            });

            UI.hideLoader();

            if (result.success) {
                // Update window.companyEmails with the saved data
                window.companyEmails = emails;

                UI.showToast(window.settingsTranslations?.emailsSavedSuccess || 'Company emails saved successfully!', 'success');
                await loadCompanyEmails();
            } else {
                UI.showToast(result.message || window.settingsTranslations?.errorSavingEmails || 'Failed to save emails', 'error');
            }
        } catch (error) {
            UI.hideLoader();
            console.error('Error saving emails:', error);
            UI.showToast(window.settingsTranslations?.errorSavingEmails || 'Error saving emails', 'error');
        }
    };

    // Load company phones
    const loadCompanyPhones = async () => {
        const phones = window.companyPhones;
        if (!phones || !Array.isArray(phones) || phones.length === 0) {
            console.log('No company phones found');
            return;
        }

        companyPhones = phones;
        const phonesContainer = document.getElementById('phones-container');
        if (!phonesContainer) return;

        phonesContainer.innerHTML = '';

        phones.forEach((phoneData, index) => {
            const phoneEntry = createPhoneEntry(index, phoneData);
            phonesContainer.appendChild(phoneEntry);
        });

        setupDeletePhoneButtons();
    };

    // Create phone entry HTML
    const createPhoneEntry = (index, phoneData = null) => {
        const entry = document.createElement('div');
        entry.className = 'phone-entry';
        entry.setAttribute('data-phone-id', phoneData?.id || '');

        entry.innerHTML = `
            <div class="form-row">
                <div class="form-group flex-grow-1">
                    <label for="company-phone-${index}">Phone Number</label>
                    <input type="tel" id="company-phone-${index}" 
                           name="company-phone-${index}" 
                           class="company-phone" 
                           value="${phoneData?.phone || ''}" 
                           required>
                </div>
                <div class="form-group phone-type-group">
                    <label for="company-phone-type-${index}">Type</label>
                    <select id="company-phone-type-${index}" 
                            name="company-phone-type-${index}" 
                            class="phone-type">
                        <option value="primary" ${phoneData?.type === 'primary' ? 'selected' : ''}>Primary</option>
                        <option value="business" ${phoneData?.type === 'business' ? 'selected' : ''}>Business</option>
                        <option value="mobile" ${phoneData?.type === 'mobile' ? 'selected' : ''}>Mobile</option>
                        <option value="fax" ${phoneData?.type === 'fax' ? 'selected' : ''}>Fax</option>
                        <option value="other" ${phoneData?.type === 'other' ? 'selected' : ''}>Other</option>
                    </select>
                </div>
                <div class="form-group delete-btn-container">
                    <label>&nbsp;</label>
                    <button type="button" class="btn-danger delete-phone-btn" 
                            data-index="${index}" 
                            data-phone-id="${phoneData?.id || ''}"
                            ${!phoneData?.id ? 'disabled' : ''}>
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `;

        return entry;
    };

    // Add phone field
    const addPhoneField = () => {
        const phonesContainer = document.getElementById('phones-container');
        if (!phonesContainer) return;

        const currentCount = phonesContainer.querySelectorAll('.phone-entry').length;
        const newEntry = createPhoneEntry(currentCount);
        phonesContainer.appendChild(newEntry);

        const deleteBtn = newEntry.querySelector('.delete-phone-btn');
        if (deleteBtn && currentCount > 0) {
            deleteBtn.disabled = false;
        }

        setupDeletePhoneButtons();
    };

    // Setup phone delete buttons
    const setupDeletePhoneButtons = () => {
        const deleteButtons = document.querySelectorAll('.delete-phone-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const phoneId = button.getAttribute('data-phone-id');

                if (phoneId) {
                    currentPhoneId = phoneId;
                    const modal = document.getElementById('delete-phone-modal');
                    if (modal) modal.style.display = 'flex';
                } else {
                    const entry = button.closest('.phone-entry');
                    if (entry) entry.remove();
                }
            });
        });
    };

    // Setup phone delete modal
    const setupPhoneDeleteModal = () => {
        const modal = document.getElementById('delete-phone-modal');
        if (!modal) return;

        const closeBtn = modal.querySelector('.close-modal');
        const cancelBtn = document.getElementById('cancel-delete-phone-btn');
        const confirmBtn = document.getElementById('confirm-delete-phone-btn');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
                currentPhoneId = null;
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                modal.style.display = 'none';
                currentPhoneId = null;
            });
        }

        if (confirmBtn) {
            confirmBtn.addEventListener('click', async () => {
                if (currentPhoneId) {
                    await deletePhone(currentPhoneId);
                    modal.style.display = 'none';
                }
            });
        }

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
                currentPhoneId = null;
            }
        });
    };

    // Delete phone
    const deletePhone = async (phoneId) => {
        if (!phoneId) return;
        try {
            UI.showLoader();
            const response = await api.request(`/users/api/v1/companies/phones/${phoneId}`, {
                method: 'DELETE'
            });
            UI.hideLoader();
            if (response.success) {
                // Update window.companyPhones by removing the deleted phone
                if (window.companyPhones && Array.isArray(window.companyPhones)) {
                    window.companyPhones = window.companyPhones.filter(phone => phone.id !== phoneId);
                }

                UI.showToast('Phone deleted successfully!', 'success');
                await loadCompanyPhones();
            } else {
                UI.showToast(response.message || 'Failed to delete phone', 'error');
            }
        } catch (error) {
            UI.hideLoader();
            console.error('Error deleting phone:', error);
            UI.showToast('Error deleting phone', 'error');
        }
    };

    // Save company phones
    const saveCompanyPhones = async () => {
        const phoneEntries = document.querySelectorAll('.phone-entry');
        const phones = [];
        UI.showLoader();

        phoneEntries.forEach((entry, index) => {
            const phoneInput = entry.querySelector(`#company-phone-${index}`);
            const typeSelect = entry.querySelector(`#company-phone-type-${index}`);

            if (phoneInput && phoneInput.value.trim()) {
                phones.push({
                    phone: phoneInput.value.trim(),
                    is_primary: typeSelect.value === 'primary',
                });
            }
        });

        // Get company ID from window object
        const companyId = window.userCompanyId || window.companyInfo?.id;

        if (!companyId) {
            UI.hideLoader();
            UI.showToast('Company ID not found', 'error');
            return;
        }

        try {
            const requestBody = {
                company_phones: phones,
                company_id: companyId
            };

            const result = await api.request('/users/api/v1/companies/phones', {
                body: JSON.stringify(requestBody),
                method: 'POST'
            });

            UI.hideLoader();

            if (result.success) {
                // Update window.companyPhones with the saved data
                window.companyPhones = phones;

                UI.showToast(window.settingsTranslations?.phonesSavedSuccess || 'Company phones saved successfully!', 'success');
                await loadCompanyPhones();
            } else {
                UI.showToast(result.message || window.settingsTranslations?.errorSavingPhones || 'Failed to save phones', 'error');
            }
        } catch (error) {
            UI.hideLoader();
            console.error('Error saving phones:', error);
            UI.showToast(window.settingsTranslations?.errorSavingPhones || 'Error saving phones', 'error');
        }
    };

    // Load company address
    const loadCompanyAddress = async () => {
        const address = window.companyAddress;
        if (!address || typeof address !== 'object') {
            console.log('No company address found');
            return;
        }

        const fields = {
            'company-address': address.address,
            'company-city': address.city,
            'company-country': address.country,
            'company-zip': address.zip
        };

        Object.entries(fields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element && value) {
                element.value = value;
            }
        });
    };

    // Save company address
    const saveCompanyAddress = async () => {
        UI.showLoader();
        const formData = {
            address: document.getElementById('company-address').value.trim(),
            city: document.getElementById('company-city').value.trim(),
            country: document.getElementById('company-country').value.trim(),
            zip: document.getElementById('company-zip').value.trim(),
            is_primary: true
        };

        try {
            const result = await api.request(`/users/api/v1/companies/address`, {
                method: 'POST',
                body: JSON.stringify(formData)
            });
            UI.hideLoader();
            if (result.success) {
                // Update window.companyAddress with the saved data
                window.companyAddress = formData;

                UI.showToast(window.settingsTranslations?.addressSavedSuccess || 'Company address saved successfully!', 'success');

            } else {
                UI.showToast(result.message || window.settingsTranslations?.errorSavingAddress || 'Failed to save address', 'error');
            }
        } catch (error) {
            UI.hideLoader();
            console.error('Error saving address:', error);
            UI.showToast(window.settingsTranslations?.errorSavingAddress || 'Error saving address', 'error');
        }
    };

    // Public API
    return {
        init
    };
})();

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    CompanySettings.init();
});

