/**
 * Unified Service Manager - Handles services and categories with DataTables
 * Combines functionality from service-manager.js and services.js
 */

class ServiceManager {
    constructor() {
        this.services = [];
        this.categories = [];
        this.staff = [];
        this.currentService = null;
        this.currentCategory = null;
        this.deleteServiceId = null;
        this.deleteCategoryId = null;
        this.translations = window.serviceTranslations || {};
        this.servicesTable = null;
        this.categoriesTable = null;
    }

    /**
     * Initialize the service manager
     */
    async init() {
        try {
            // Setup tab switching FIRST, before loading data
            this.setupTabSwitching();
            this.setupEventListeners();
            
            // Initialize DataTables
            await this.initializeServicesDataTable();
            await this.initializeCategoriesDataTable();

            // Load staff data for the service modal
            await this.loadStaffData();
        } catch (error) {
            console.error('Failed to initialize service manager:', error);
        }
    }

    /**
     * Load staff data separately for modals
     */
    async loadStaffData() {
        try {
            let staffDataPromise;
            if (window.staff_data && Array.isArray(window.staff_data) && window.staff_data.length > 0) {
                console.log('Using cached staff data in ServiceManager');
                staffDataPromise = Promise.resolve({ data: window.staff_data });
            } else {
                staffDataPromise = window.api.getStaff().catch(() => ({ data: [] }));
            }

            const staffResponse = await staffDataPromise;
            this.staff = staffResponse?.data || [];

            if (this.staff.length > 0) {
                window.staff_data = this.staff;
            }
        } catch (error) {
            console.error('Failed to load staff data:', error);
            this.staff = [];
        }
    }

    /**
     * Initialize DataTable for services
     */
    initializeServicesDataTable() {
        const self = this;

        this.servicesTable = $('#services-table').DataTable({
            ajax: {
                url: '/users/api/v1/companies/services?_t=' + Date.now(),
                type: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                },
                dataSrc: function(json) {
                    if (json && json.data) {
                        // Extract categories from response
                        self.categories = json.data.map(category => ({
                            id: category.id,
                            name: category.name,
                            description: category.description,
                            color: category.color,
                            icon: category.icon
                        }));

                        // Flatten services from categorized response
                        self.services = [];
                        json.data.forEach(category => {
                            if (category.services && Array.isArray(category.services)) {
                                category.services.forEach(service => {
                                    self.services.push({
                                        ...service,
                                        category_id: category.id,
                                        category_name: category.name
                                    });
                                });
                            }
                        });
                        return self.services;
                    }
                    return [];
                },
                error: function(xhr, error, code) {
                    console.error('Failed to load services data:', error);
                    window.showError('Failed to load services data');
                }
            },
            columns: [
                {
                    data: 'name',
                    title: 'Service Name',
                    render: function(data) {
                        return `<span class="service-name">${data}</span>`;
                    }
                },
                {
                    data: 'category_name',
                    title: 'Category',
                    render: function(data) {
                        return `<span class="category-badge">${data || self.translations.uncategorized || 'Uncategorized'}</span>`;
                    }
                },
                {
                    data: 'duration',
                    title: 'Duration',
                    render: function(data) {
                        return `<span class="duration-badge">${data} ${self.translations.min || 'min'}</span>`;
                    }
                },
                {
                    data: null,
                    title: 'Price',
                    render: function(data, type, row) {
                        const hasDiscount = row.discount_price && parseFloat(row.discount_price) > 0 && parseFloat(row.discount_price) < parseFloat(row.price);
                        const priceDisplay = hasDiscount
                            ? `<span class="price-original">$${parseFloat(row.price).toFixed(2)}</span><span class="price-discounted">$${parseFloat(row.discount_price).toFixed(2)}</span>`
                            : `$${parseFloat(row.price).toFixed(2)}`;
                        return `<span class="price-badge">${priceDisplay}</span>`;
                    }
                },
                {
                    data: 'service_staff',
                    title: 'Staff',
                    render: function(data) {
                        const serviceStaff = data || [];
                        const staffNames = serviceStaff.map(staffObj => {
                            const user = staffObj.user;
                            if (user && user.first_name && user.last_name) {
                                return `${user.first_name} ${user.last_name}`;
                            }
                            return '';
                        }).filter(name => name).join(', ') || (self.translations.noStaffAssigned || 'No staff assigned');
                        return `<span class="staff-cell">${staffNames}</span>`;
                    }
                },
                {
                    data: null,
                    orderable: false,
                    title: 'Actions',
                    render: function(data, type, row) {
                        if (window.userData && (window.userData.role === 'owner' || window.userData.role === 'admin')) {
                            return `
                                <div class="actions-cell">
                                    <button class="btn-icon btn-edit" onclick="serviceManager.editService('${row.id}')" title="${self.translations.edit || 'Edit'}">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn-icon btn-delete" onclick="serviceManager.confirmDeleteService('${row.id}')" title="${self.translations.delete || 'Delete'}">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            `;
                        }
                        return '';
                    }
                }
            ],
            responsive: true,
            pageLength: 10,
            lengthChange: true,
            searching: true,
            ordering: true,
            autoWidth: false,
            language: {
                emptyTable: window.userData && (window.userData.role === 'owner' || window.userData.role === 'admin')
                    ? 'No services found. Click "Add New Service" to create your first service.'
                    : 'Insufficient privileges. Please contact your administrator.',
                loadingRecords: 'Loading services...',
                processing: 'Processing...',
                search: 'Search services:',
                lengthMenu: 'Show _MENU_ entries',
                info: 'Showing _START_ to _END_ of _TOTAL_ services',
                infoEmpty: 'Showing 0 to 0 of 0 services',
                infoFiltered: '(filtered from _MAX_ total services)',
                paginate: {
                    first: 'First',
                    last: 'Last',
                    next: 'Next',
                    previous: 'Previous'
                }
            },
            dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
                 '<"row"<"col-sm-12"tr>>' +
                 '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
            drawCallback: function(settings) {
                $('#services-loading').hide();
                $('#services-empty').hide();
                $('#services-table-container').show();
            }
        });
    }

    /**
     * Initialize DataTable for categories
     */
    initializeCategoriesDataTable() {
        const self = this;

        this.categoriesTable = $('#categories-table').DataTable({
            ajax: {
                url: '/users/api/v1/services/companies/categories?_t=' + Date.now(),
                type: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                },
                dataSrc: function(json) {
                    if (json && json.data) {
                        self.categories = json.data;
                        return json.data;
                    }
                    return [];
                },
                error: function(xhr, error, code) {
                    console.error('Failed to load categories data:', error);
                    window.showError('Failed to load categories data');
                }
            },
            columns: [
                {
                    data: 'name',
                    title: 'Category Name',
                    render: function(data) {
                        return `<span class="category-name">${data}</span>`;
                    }
                },
                {
                    data: 'description',
                    title: 'Description',
                    render: function(data) {
                        return data || '-';
                    }
                },
                {
                    data: null,
                    title: 'Services Count',
                    render: function(data, type, row) {
                        const serviceCount = self.services.filter(s => s.category_id === row.id).length;
                        return `<div class="text-center"><span class="count-badge">${serviceCount}</span></div>`;
                    }
                },
                {
                    data: null,
                    orderable: false,
                    title: 'Actions',
                    render: function(data, type, row) {
                        if (window.userData && (window.userData.role === 'owner' || window.userData.role === 'admin')) {
                            return `
                                <div class="actions-cell">
                                    <button class="btn-icon btn-edit" onclick="serviceManager.editCategory('${row.id}')" title="${self.translations.edit || 'Edit'}">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn-icon btn-delete" onclick="serviceManager.confirmDeleteCategory('${row.id}')" title="${self.translations.delete || 'Delete'}">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            `;
                        }
                        return '';
                    }
                }
            ],
            responsive: true,
            pageLength: 10,
            lengthChange: true,
            searching: true,
            ordering: true,
            autoWidth: false,
            language: {
                emptyTable: window.userData && (window.userData.role === 'owner' || window.userData.role === 'admin')
                    ? 'No categories found. Click "Add New Category" to create your first category.'
                    : 'Insufficient privileges. Please contact your administrator.',
                loadingRecords: 'Loading categories...',
                processing: 'Processing...',
                search: 'Search categories:',
                lengthMenu: 'Show _MENU_ entries',
                info: 'Showing _START_ to _END_ of _TOTAL_ categories',
                infoEmpty: 'Showing 0 to 0 of 0 categories',
                infoFiltered: '(filtered from _MAX_ total categories)',
                paginate: {
                    first: 'First',
                    last: 'Last',
                    next: 'Next',
                    previous: 'Previous'
                }
            },
            dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
                 '<"row"<"col-sm-12"tr>>' +
                 '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
            drawCallback: function(settings) {
                $('#categories-loading').hide();
                $('#categories-empty').hide();
                $('#categories-table-container').show();
            }
        });
    }

    /**
     * Reload DataTables data
     */
    async reloadData() {
        if (this.servicesTable) {
            this.servicesTable.ajax.reload(null, false);
        }
        if (this.categoriesTable) {
            this.categoriesTable.ajax.reload(null, false);
        }
        await this.loadStaffData();
    }

    /**
     * Setup tab switching
     */
    setupTabSwitching() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });
    }

    /**
     * Switch between tabs
     */
    switchTab(tabName) {
        // Update button states
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab content
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === `${tabName}-tab`);
        });
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Service modal handlers
        this.setupServiceModal();

        // Category modal handlers
        this.setupCategoryModal();

        // Delete modal handlers
        this.setupDeleteModals();
    }

    /**
     * Setup service modal
     */
    setupServiceModal() {
        const modal = document.getElementById('service-modal');
        const form = document.getElementById('service-form');
        const addBtn = document.getElementById('add-service-btn');
        const cancelBtn = document.getElementById('cancel-service-btn');
        const closeBtn = modal?.querySelector('.close-modal');
        const createCategoryBtn = document.getElementById('create-category-from-service-btn');

        // Image upload elements
        const imageInput = document.getElementById('service-image');
        const uploadBtn = document.getElementById('upload-image-btn');
        const removeBtn = document.getElementById('remove-image-btn');
        const imagePreview = document.getElementById('image-preview');

        if (addBtn) {
            addBtn.addEventListener('click', () => this.showServiceModal());
        }

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveService();
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.hideServiceModal());
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideServiceModal());
        }

        // Handle "Create New Category" button click
        if (createCategoryBtn) {
            createCategoryBtn.addEventListener('click', () => {
                // Close service modal
                this.hideServiceModal();
                // Switch to categories tab
                this.switchTab('categories');
                // Open category modal after a short delay to ensure tab switch completes
                setTimeout(() => {
                    this.showCategoryModal();
                }, 100);
            });
        }

        // Image upload handlers
        if (uploadBtn && imageInput) {
            uploadBtn.addEventListener('click', () => {
                imageInput.click();
            });
        }

        if (imagePreview && imageInput) {
            imagePreview.addEventListener('click', () => {
                imageInput.click();
            });
        }

        if (imageInput) {
            imageInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.handleImagePreview(file);
                    if (removeBtn) removeBtn.style.display = 'inline-flex';
                }
            });
        }

        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                this.clearImagePreview();
                if (imageInput) imageInput.value = '';
                removeBtn.style.display = 'none';
            });
        }

        // Close modal when clicking outside
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideServiceModal();
                }
            });
        }
    }

    /**
     * Setup category modal
     */
    setupCategoryModal() {
        const modal = document.getElementById('category-modal');
        const form = document.getElementById('category-form');
        const addBtn = document.getElementById('add-category-btn');
        const cancelBtn = document.getElementById('cancel-category-btn');
        const closeBtn = modal?.querySelector('.close-modal');

        if (addBtn) {
            addBtn.addEventListener('click', () => this.showCategoryModal());
        }

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveCategory();
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.hideCategoryModal());
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideCategoryModal());
        }

        // Close modal when clicking outside
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideCategoryModal();
                }
            });
        }
    }

    /**
     * Setup delete modals
     */
    setupDeleteModals() {
        // Service delete modal
        const deleteModal = document.getElementById('delete-modal');
        const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
        const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
        const closeBtn = deleteModal?.querySelector('.close-modal');

        if (confirmDeleteBtn) {
            confirmDeleteBtn.addEventListener('click', () => this.deleteService());
        }

        if (cancelDeleteBtn) {
            cancelDeleteBtn.addEventListener('click', () => this.hideDeleteModal());
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hideDeleteModal());
        }

        // Category delete modal
        const deleteCategoryModal = document.getElementById('delete-category-modal');
        const confirmDeleteCategoryBtn = document.getElementById('confirm-delete-category-btn');
        const cancelDeleteCategoryBtn = document.getElementById('cancel-delete-category-btn');
        const closeCategoryBtn = deleteCategoryModal?.querySelector('.close-modal');

        if (confirmDeleteCategoryBtn) {
            confirmDeleteCategoryBtn.addEventListener('click', () => this.deleteCategory());
        }

        if (cancelDeleteCategoryBtn) {
            cancelDeleteCategoryBtn.addEventListener('click', () => this.hideDeleteCategoryModal());
        }

        if (closeCategoryBtn) {
            closeCategoryBtn.addEventListener('click', () => this.hideDeleteCategoryModal());
        }

        // Close modals when clicking outside
        if (deleteModal) {
            deleteModal.addEventListener('click', (e) => {
                if (e.target === deleteModal) {
                    this.hideDeleteModal();
                }
            });
        }

        if (deleteCategoryModal) {
            deleteCategoryModal.addEventListener('click', (e) => {
                if (e.target === deleteCategoryModal) {
                    this.hideDeleteCategoryModal();
                }
            });
        }
    }

    /**
     * Show service modal
     */
    showServiceModal(serviceId = null) {
        const modal = document.getElementById('service-modal');
        const modalTitle = document.getElementById('service-modal-title');
        const form = document.getElementById('service-form');

        if (!modal) return;

        // Populate category dropdown
        const categorySelect = document.getElementById('service-category');
        if (categorySelect) {
            categorySelect.innerHTML = '<option value="">Select a category</option>' +
                this.categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
        }

        // Populate staff checkboxes with improved design
        const staffSelection = document.getElementById('staff-selection');
        if (staffSelection) {
            if (this.staff.length === 0) {
                staffSelection.innerHTML = `
                    <div class="no-staff-message">
                        <i class="fas fa-info-circle"></i>
                        <p>${this.translations.noStaffAvailable || 'No staff members available. Please add staff members first.'}</p>
                    </div>
                `;
            } else {
                staffSelection.innerHTML = this.staff.map(staff => {
                    // Handle nested user object structure
                    const firstName = staff.user?.first_name || staff.first_name || '';
                    const lastName = staff.user?.last_name || staff.last_name || '';
                    const fullName = `${firstName} ${lastName}`.trim() || 'Unknown Staff';
                    const email = staff.user?.email || staff.email || '';
                    const role = staff.role || 'staff';

                    return `
                        <label class="staff-checkbox-item">
                            <input type="checkbox" name="staff" value="${staff.user_id}" class="staff-checkbox-input">
                            <div class="staff-checkbox-content">
                                <div class="staff-avatar">
                                    <i class="fas fa-user"></i>
                                </div>
                                <div class="staff-info">
                                    <div class="staff-name">${fullName}</div>
                                    ${email ? `<div class="staff-email">${email}</div>` : ''}
                                </div>
                                <div class="staff-role-badge ${role}">
                                    ${role}
                                </div>
                                <div class="checkbox-indicator">
                                    <i class="fas fa-check"></i>
                                </div>
                            </div>
                        </label>
                    `;
                }).join('');
            }
        }

        if (serviceId) {
            // Edit mode
            this.currentService = this.services.find(s => s.id === serviceId);
            if (modalTitle) modalTitle.textContent = this.translations.editService || 'Edit Service';

            if (this.currentService && form) {
                document.getElementById('service-id').value = this.currentService.id;
                document.getElementById('service-name').value = this.currentService.name;
                document.getElementById('service-description').value = this.currentService.additional_info || '';
                document.getElementById('service-category').value = this.currentService.category_id;
                document.getElementById('service-duration').value = this.currentService.duration;
                document.getElementById('service-price').value = this.currentService.price;

                const discountPriceInput = document.getElementById('service-discount-price');
                if (discountPriceInput && this.currentService.discount_price) {
                    discountPriceInput.value = this.currentService.discount_price;
                }

                // Check assigned staff - extract user IDs from service_staff array
                let staffIds = [];
                if (this.currentService.service_staff && Array.isArray(this.currentService.service_staff)) {
                    // Extract user IDs from service_staff objects
                    staffIds = this.currentService.service_staff.map(staffObj => staffObj.user?.id || staffObj.user_id).filter(id => id);
                } else if (this.currentService.staff_ids) {
                    // Fallback to staff_ids if available
                    staffIds = this.currentService.staff_ids;
                }

                // Check the checkboxes for assigned staff
                staffIds.forEach(staffId => {
                    const checkbox = staffSelection?.querySelector(`input[value="${staffId}"]`);
                    if (checkbox) {
                        checkbox.checked = true;
                    }
                });

                // Show existing image if available
                if (this.currentService.image_url) {
                    const imagePreview = document.getElementById('image-preview');
                    const removeBtn = document.getElementById('remove-image-btn');
                    if (imagePreview) {
                        imagePreview.innerHTML = `<img src="${this.currentService.image_url}" alt="Service image" />`;
                    }
                    if (removeBtn) {
                        removeBtn.style.display = 'inline-flex';
                    }
                } else {
                    this.clearImagePreview();
                }
            }
        } else {
            // Create mode
            this.currentService = null;
            if (modalTitle) modalTitle.textContent = this.translations.addService || 'Add Service';
            if (form) form.reset();
            document.getElementById('service-id').value = '';
            this.clearImagePreview();
        }

        modal.classList.add('active');
    }

    /**
     * Hide service modal
     */
    hideServiceModal() {
        const modal = document.getElementById('service-modal');
        if (modal) {
            modal.classList.remove('active');
            this.currentService = null;
            this.clearImagePreview();
        }
    }

    /**
     * Handle image preview
     */
    handleImagePreview(file) {
        const imagePreview = document.getElementById('image-preview');
        if (!imagePreview) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.innerHTML = `<img src="${e.target.result}" alt="Service preview" />`;
            imagePreview.classList.add('has-image');
        };
        reader.readAsDataURL(file);
    }

    /**
     * Clear image preview
     */
    clearImagePreview() {
        const imagePreview = document.getElementById('image-preview');
        const removeBtn = document.getElementById('remove-image-btn');

        if (imagePreview) {
            imagePreview.innerHTML = `
                <i class="fas fa-image"></i>
                <span>Click to upload image</span>
            `;
            imagePreview.classList.remove('has-image');
        }

        if (removeBtn) {
            removeBtn.style.display = 'none';
        }
    }

    /**
     * Save service
     */
    async saveService() {
        const serviceId = document.getElementById('service-id').value;
        const name = document.getElementById('service-name').value;
        const description = document.getElementById('service-description').value;
        const categoryId = document.getElementById('service-category').value;
        const duration = parseInt(document.getElementById('service-duration').value);
        const price = parseFloat(document.getElementById('service-price').value);

        const discountPriceInput = document.getElementById('service-discount-price');
        const discountPrice = discountPriceInput?.value ? parseFloat(discountPriceInput.value) : 0;

        // Get selected staff - convert to integers
        const staffCheckboxes = document.querySelectorAll('#staff-selection input[type="checkbox"]:checked');
        const staffIds = Array.from(staffCheckboxes).map(cb => cb.value);

        const serviceImage = document.getElementById('service-image');

        // Check if we have an image file to upload
        const hasImageFile = serviceImage && serviceImage.files && serviceImage.files.length > 0;

        // Build service data object (for Pydantic model)
        const serviceDataObj = {
            name: name,
            duration: duration,
            price: price,
            discount_price: discountPrice,
            additional_info: description || "",
            status: 'active',
            buffer_before: 0,
            buffer_after: 0,
            category_id: categoryId,
            staff_ids: staffIds
        };

        let serviceData;

        if (hasImageFile) {
            // Use FormData when we have an image file
            // FastAPI expects 'service_in' as a form field containing JSON
            serviceData = new FormData();

            // Send service data as JSON string in 'service_in' field
            // FastAPI will parse this into CategoryServiceCreate Pydantic model
            const jsonString = JSON.stringify(serviceDataObj);
            serviceData.append('service_in', jsonString);

            // Add the image file with the key 'image'
            serviceData.append('image', serviceImage.files[0]);

        } else {
            // Use JSON when no image file
            serviceData = serviceDataObj;
        }

        try {
            // Show loading overlay
            window.showLoading(serviceId ? 'Updating service...' : 'Creating service...');

            if (serviceId) {
                // Update existing service
                await window.api.updateService(serviceId, serviceData);
                window.showMessage(this.translations.serviceUpdated || 'Service updated successfully');
            } else {
                // Create new service
                await window.api.createService(serviceData);
                window.showMessage(this.translations.serviceCreated || 'Service created successfully');
            }

            // Close modal first for better UX
            this.hideServiceModal();

            window.hideLoading();
            // Clear local cache to force fresh data
            this.services = [];

            // Reload fresh data from API to get the latest services
            await this.reloadData();
        } catch (error) {
            console.error('Failed to save service:', error);
            window.showError('Failed to save service');
        } finally {
            // Always hide loading overlay
            window.hideLoading();
        }
    }

    /**
     * Edit service
     */
    editService(serviceId) {
        this.showServiceModal(serviceId);
    }

    /**
     * Confirm delete service
     */
    confirmDeleteService(serviceId) {
        this.deleteServiceId = serviceId;
        const modal = document.getElementById('delete-modal');
        if (modal) modal.classList.add('active');
    }

    /**
     * Delete service
     */
    async deleteService() {
        if (!this.deleteServiceId) return;

        try {
            // Show loading overlay
            window.showLoading('Deleting service...');

            await window.api.deleteService(this.deleteServiceId);

            if (window.showMessage) window.showMessage(this.translations.serviceDeleted || 'Service deleted successfully');

            // Close modal first
            this.hideDeleteModal();

            window.hideLoading();
            this.services = [];
            // Reload fresh data from API to get the latest services
            await this.reloadData();
        } catch (error) {
            console.error('Failed to delete service:', error);
            window.showError('Failed to delete service');
        } finally {
            // Always hide loading overlay
            window.hideLoading();
        }
    }

    /**
     * Hide delete modal
     */
    hideDeleteModal() {
        const modal = document.getElementById('delete-modal');
        if (modal) modal.classList.remove('active');
        this.deleteServiceId = null;
    }

    /**
     * Show category modal
     */
    showCategoryModal(categoryId = null) {
        const modal = document.getElementById('category-modal');
        const modalTitle = modal?.querySelector('.modal-header h2');
        const form = document.getElementById('category-form');

        if (!modal) return;

        if (categoryId) {
            // Edit mode
            this.currentCategory = this.categories.find(c => c.id === categoryId);
            if (modalTitle) modalTitle.textContent = 'Edit Category';

            if (this.currentCategory && form) {
                document.getElementById('category-name').value = this.currentCategory.name;
                document.getElementById('category-description').value = this.currentCategory.description || '';
            }
        } else {
            // Create mode
            this.currentCategory = null;
            if (modalTitle) modalTitle.textContent = 'Add Category';
            if (form) form.reset();
        }

        modal.classList.add('active');
    }

    /**
     * Hide category modal
     */
    hideCategoryModal() {
        const modal = document.getElementById('category-modal');
        if (modal) {
            modal.classList.remove('active');
            this.currentCategory = null;
        }
    }

    /**
     * Save category
     */
    async saveCategory() {
        const name = document.getElementById('category-name').value;
        const description = document.getElementById('category-description').value;

        const categoryData = {
            name,
            description
        };

        try {
            // Show loading overlay
            window.showLoading(this.currentCategory ? 'Updating category...' : 'Creating category...');

            if (this.currentCategory) {
                // Update existing category
                await window.api.updateCategory(this.currentCategory.id, categoryData);
                if (window.showMessage) window.showMessage(this.translations.categoryUpdated || 'Category updated successfully');
            } else {
                // Create new category
                await window.api.createCategory(categoryData);
                if (window.showMessage) window.showMessage(this.translations.categoryCreated || 'Category created successfully');
            }

            // Close modal first for better UX
            this.hideCategoryModal();

            window.hideLoading();
            // Clear local cache to force fresh data
            this.services = [];

            // Reload fresh data from API to get the latest categories
            await this.reloadData();
        } catch (error) {
            console.error('Failed to save category:', error);
            if (window.showError) window.showError(this.translations.errorCreatingCategory || 'Failed to save category');
        } finally {
            // Always hide loading overlay
            window.hideLoading();
        }
    }

    /**
     * Edit category
     */
    editCategory(categoryId) {
        this.showCategoryModal(categoryId);
    }

    /**
     * Confirm delete category
     */
    confirmDeleteCategory(categoryId) {
        this.deleteCategoryId = categoryId;
        const category = this.categories.find(c => c.id === categoryId);
        const modal = document.getElementById('delete-category-modal');
        const nameSpan = document.getElementById('delete-category-name');

        if (nameSpan && category) {
            nameSpan.textContent = category.name;
        }

        if (modal) modal.classList.add('active');
    }

    /**
     * Delete category
     */
    async deleteCategory() {
        if (!this.deleteCategoryId) return;

        try {
            // Show loading overlay
            window.showLoading('Deleting category...');

            await window.api.deleteCategory(this.deleteCategoryId);

            if (window.showMessage) window.showMessage(this.translations.categoryDeleted || 'Category deleted successfully');

            window.hideLoading();
            // Close modal first
            this.hideDeleteCategoryModal();
            this.categories = []
            // Reload fresh data from API to get the latest categories and services
            await this.reloadData();
        } catch (error) {
            console.error('Failed to delete category:', error);
            window.showError('Failed to delete category');
        } finally {
            // Always hide loading overlay
            window.hideLoading();
        }
    }

    /**
     * Hide delete category modal
     */
    hideDeleteCategoryModal() {
        const modal = document.getElementById('delete-category-modal');
        if (modal) modal.classList.remove('active');
        this.deleteCategoryId = null;
    }

    /**
     * Get services by category
     */
    getServicesByCategory(categoryId) {
        return this.services.filter(service => service.category_id === categoryId);
    }

    /**
     * Static method to load services for booking form (global utility)
     */
    static async loadServices() {
        try {
            UI.showLoader('Loading services...');
            const response = await window.api.getCompanyServices();
            UI.hideLoader();
            if (!response || !response.data) {
                console.warn('No services data received');
                return;
            }

            const categories = response.data;
            const serviceContainer = document.getElementById('custom-service-select');

            if (!serviceContainer) {
                console.warn('Service container element not found');
                return;
            }

            // Clear existing content
            serviceContainer.innerHTML = '';

            // Check if we have any services
            if (!categories || categories.length === 0) {
                serviceContainer.innerHTML = '<div class="empty-message">No services available</div>';
                return;
            }

            // Store all services for search functionality
            window.allBookingServices = [];

            // Populate services grouped by category
            categories.forEach(category => {
                if (category.services && category.services.length > 0) {
                    // Create category section
                    const categoryDiv = document.createElement('div');
                    categoryDiv.className = 'service-category';
                    categoryDiv.dataset.categoryName = category.name.toLowerCase();

                    const categoryHeader = document.createElement('div');
                    categoryHeader.className = 'service-category-header';
                    categoryHeader.innerHTML = `
                        <i class="fas fa-folder-open"></i>
                        <span>${category.name}</span>
                        <span class="service-count">(${category.services.length})</span>
                    `;
                    categoryDiv.appendChild(categoryHeader);

                    // Create services list for this category
                    const servicesList = document.createElement('div');
                    servicesList.className = 'service-category-items';

                    category.services.forEach(service => {
                        // Store service for search
                        window.allBookingServices.push({
                            ...service,
                            categoryName: category.name,
                            categoryId: category.id
                        });

                        const serviceItem = document.createElement('div');
                        serviceItem.className = 'service-item';
                        serviceItem.dataset.serviceName = service.name.toLowerCase();
                        serviceItem.dataset.serviceId = service.id;

                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.id = `service-${service.id}`;
                        checkbox.name = 'booking-service';
                        checkbox.value = service.id;
                        checkbox.dataset.duration = service.duration;
                        checkbox.dataset.price = service.price;
                        checkbox.dataset.name = service.name;
                        checkbox.dataset.categoryName = category.name;

                        // Add change event listener to update summary
                        checkbox.addEventListener('change', () => {
                            ServiceManager.updateSelectedServicesSummary();
                        });

                        const label = document.createElement('label');
                        label.htmlFor = `service-${service.id}`;
                        label.className = 'service-label';

                        const serviceInfo = document.createElement('div');
                        serviceInfo.className = 'service-info';

                        const serviceName = document.createElement('div');
                        serviceName.className = 'service-name';
                        serviceName.textContent = service.name;

                        const serviceDetails = document.createElement('div');
                        serviceDetails.className = 'service-details';
                        serviceDetails.innerHTML = `
                            <span class="service-price"><i class="fas fa-dollar-sign"></i> ${parseFloat(service.price).toFixed(2)}</span>
                            <span class="service-duration"><i class="fas fa-clock"></i> ${service.duration} min</span>
                        `;

                        serviceInfo.appendChild(serviceName);
                        serviceInfo.appendChild(serviceDetails);

                        label.appendChild(serviceInfo);

                        serviceItem.appendChild(checkbox);
                        serviceItem.appendChild(label);
                        servicesList.appendChild(serviceItem);
                    });

                    categoryDiv.appendChild(servicesList);
                    serviceContainer.appendChild(categoryDiv);
                }
            });

            console.log('Services loaded successfully for booking form');

            // Setup search functionality
            ServiceManager.setupServiceSearch();

            // Initialize the summary update
            ServiceManager.updateSelectedServicesSummary();
        } catch (error) {
            console.error('Failed to load services for booking:', error);
        }
    }

    /**
     * Static method to setup service search functionality
     */
    static setupServiceSearch() {
        const searchInput = document.getElementById('service-search');
        if (!searchInput) return;

        // Remove any existing event listeners
        const newSearchInput = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(newSearchInput, searchInput);

        newSearchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();
            const serviceCategories = document.querySelectorAll('.service-category');

            if (!searchTerm) {
                // Show all categories and services
                serviceCategories.forEach(category => {
                    category.style.display = 'block';
                    const items = category.querySelectorAll('.service-item');
                    items.forEach(item => item.style.display = 'flex');
                });
                return;
            }

            // Filter services and categories
            serviceCategories.forEach(category => {
                const categoryName = category.dataset.categoryName || '';
                const categoryMatches = categoryName.includes(searchTerm);
                const serviceItems = category.querySelectorAll('.service-item');
                let visibleServicesCount = 0;

                serviceItems.forEach(item => {
                    const serviceName = item.dataset.serviceName || '';

                    if (categoryMatches || serviceName.includes(searchTerm)) {
                        item.style.display = 'flex';
                        visibleServicesCount++;
                    } else {
                        item.style.display = 'none';
                    }
                });

                // Hide category if no visible services
                category.style.display = visibleServicesCount > 0 ? 'block' : 'none';
            });
        });

        console.log('Service search functionality setup complete');
    }

    /**
     * Static method to update selected services summary
     */
    static updateSelectedServicesSummary() {
        const checkboxes = document.querySelectorAll('input[name="booking-service"]:checked');
        const summaryList = document.getElementById('selected-services-list');
        const totalDurationEl = document.getElementById('total-duration');
        const totalPriceEl = document.getElementById('total-price');

        if (!summaryList) return;

        // Clear current summary
        summaryList.innerHTML = '';

        if (checkboxes.length === 0) {
            summaryList.innerHTML = '<div class="empty-selection-message"><i class="fas fa-info-circle"></i> No services selected</div>';
            if (totalDurationEl) totalDurationEl.textContent = '0 min';
            if (totalPriceEl) totalPriceEl.textContent = '$0.00';

            // Reset end time to match start time when no services selected
            ServiceManager.updateEndTime(0);
            return;
        }

        let totalDuration = 0;
        let totalPrice = 0;

        checkboxes.forEach(checkbox => {
            const duration = parseInt(checkbox.dataset.duration) || 0;
            const price = parseFloat(checkbox.dataset.price) || 0;
            const name = checkbox.dataset.name || 'Unknown Service';
            const categoryName = checkbox.dataset.categoryName || 'Uncategorized';

            totalDuration += duration;
            totalPrice += price;

            // Create summary item
            const summaryItem = document.createElement('div');
            summaryItem.className = 'selected-service-item';
            summaryItem.innerHTML = `
                <div class="selected-service-info">
                    <div class="selected-service-name">
                        <i class="fas fa-check-circle"></i>
                        ${name}
                    </div>
                    <div class="selected-service-category">${categoryName}</div>
                </div>
                <div class="selected-service-details">
                    <span class="selected-service-price">$${price.toFixed(2)}</span>
                    <span class="selected-service-duration">${duration} min</span>
                </div>
            `;
            summaryList.appendChild(summaryItem);
        });

        // Update totals
        if (totalDurationEl) totalDurationEl.textContent = `${totalDuration} min`;
        if (totalPriceEl) totalPriceEl.textContent = `$${totalPrice.toFixed(2)}`;

        // Update end time based on total duration
        ServiceManager.updateEndTime(totalDuration);
    }

    /**
     * Update the end time based on start time and total duration
     * @param {number} durationMinutes - Total duration in minutes
     */
    static updateEndTime(durationMinutes) {
        const startDateInput = document.getElementById('booking-start-date');
        const startTimeInput = document.getElementById('booking-start-time');
        const endDateInput = document.getElementById('booking-end-date');
        const endTimeInput = document.getElementById('booking-end-time');

        if (!startDateInput || !startTimeInput || !endDateInput || !endTimeInput) return;

        const startDate = startDateInput.value;
        const startTime = startTimeInput.value;

        if (!startDate || !startTime) return;

        // Create a date object from start date and time
        const startDateTime = new Date(`${startDate}T${startTime}`);

        // Add the duration in minutes
        const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60000);

        // Format end date and time
        const endDate = endDateTime.toISOString().split('T')[0];
        const endTime = endDateTime.toTimeString().split(' ')[0].substring(0, 5);

        // Update end date and time inputs
        endDateInput.value = endDate;
        endTimeInput.value = endTime;
    }

    /**
     * Show success notification
     */
    showSuccess(message) {
        console.log('Success:', message);
        if (window.showNotification) {
            window.showNotification(message, 'success');
        } else {
            alert(message);
        }
    }

    /**
     * Show error notification
     */
    showError(message) {
        console.error('Error:', message);
        if (window.showNotification) {
            window.showNotification(message, 'error');
        } else {
            alert(message);
        }
    }
}

// Create global instance
window.serviceManager = new ServiceManager();

// Initialize when DOM is ready and jQuery/DataTables are loaded
$(document).ready(function() {
    // Ensure DataTables is available
    if (typeof $.fn.DataTable === 'undefined') {
        console.error('DataTables is not loaded!');
        return;
    }

    // Initialize the service manager
    window.serviceManager.init();
});
