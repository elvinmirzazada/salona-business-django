/**
 * Unified Service Manager - Handles services and categories with table-based UI
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
    }

    /**
     * Initialize the service manager
     */
    async init() {
        try {
            // Setup tab switching FIRST, before loading data
            this.setupTabSwitching();
            this.setupEventListeners();
            
            await this.loadData();
        } catch (error) {
            console.error('Failed to initialize service manager:', error);
            this.hideLoading('services');
            this.hideLoading('categories');
        }
    }

    /**
     * Load all data
     */
    async loadData() {
        try {
            // Show loading for both tabs
            this.showLoading('services');
            this.showLoading('categories');

            // Check if we have cached staff data from the initial page load
            let staffDataPromise;
            if (window.staff_data && Array.isArray(window.staff_data) && window.staff_data.length > 0) {
                console.log('Using cached staff data in ServiceManager');
                staffDataPromise = Promise.resolve({ data: window.staff_data });
            } else {
                // Only fetch from API if we don't have cached data
                staffDataPromise = window.api.getStaff().catch(err => ({ data: [] }));
            }

            // Load data in parallel - categories and services separately
            const [categorizedResponse, categoriesResponse, staffResponse] = await Promise.all([
                window.api.getCompanyServices().catch(err => ({ data: [] })),
                window.api.getCategories().catch(err => ({ data: [] })),
                staffDataPromise
            ]);

            // Process categories from dedicated endpoint
            this.categories = categoriesResponse?.data || [];

            // Process categorized response for services
            const serviceCategories = categorizedResponse?.data || [];

            // Flatten services from the services endpoint
            this.services = [];
            serviceCategories.forEach(category => {
                if (category.services && Array.isArray(category.services)) {
                    category.services.forEach(service => {
                        this.services.push({
                            ...service,
                            category_id: category.id
                        });
                    });
                }
            });

            this.staff = staffResponse?.data || [];

            // Update the global cache
            if (this.staff.length > 0) {
                window.staff_data = this.staff;
            }

            // Render both tabs
            this.renderServices();
            this.renderCategories();

            // Hide loading
            this.hideLoading('services');
            this.hideLoading('categories');

        } catch (error) {
            console.error('Failed to load data:', error);
            this.hideLoading('services');
            this.hideLoading('categories');
            throw error;
        }
    }

    /**
     * Show loading state
     */
    showLoading(type) {
        const loading = document.getElementById(`${type}-loading`);
        const table = document.getElementById(`${type}-table`);
        const empty = document.getElementById(`${type}-empty`);

        if (loading) loading.style.display = 'flex';
        if (table) table.style.display = 'none';
        if (empty) empty.style.display = 'none';
    }

    /**
     * Hide loading state
     */
    hideLoading(type) {
        const loading = document.getElementById(`${type}-loading`);
        if (loading) loading.style.display = 'none';
    }

    /**
     * Render services table
     */
    renderServices() {
        const tableBody = document.getElementById('services-table-body');
        const table = document.getElementById('services-table');
        const empty = document.getElementById('services-empty');

        if (!tableBody) return;

        // Check if we have services
        if (this.services.length === 0) {
            if (table) table.style.display = 'none';
            if (empty) empty.style.display = 'block';
            return;
        }

        // Show table, hide empty state
        if (table) table.style.display = 'table';
        if (empty) empty.style.display = 'none';

        // Render service rows
        tableBody.innerHTML = this.services.map(service => {
            const category = this.categories.find(c => c.id === service.category_id);
            const categoryName = category ? category.name : (this.translations.uncategorized || 'Uncategorized');

            // Get staff assigned to this service from service_staff array
            const serviceStaff = service.service_staff || [];
            const staffNames = serviceStaff.map(staffObj => {
                // Extract user from service_staff object
                const user = staffObj.user;
                if (user && user.first_name && user.last_name) {
                    return `${user.first_name} ${user.last_name}`;
                }
                return '';
            }).filter(name => name).join(', ') || (this.translations.noStaffAssigned || 'No staff assigned');

            return `
                <tr data-service-id="${service.id}">
                    <td class="service-name">${service.name}</td>
                    <td>${categoryName}</td>
                    <td>${service.duration} ${this.translations.min || 'min'}</td>
                    <td>$${parseFloat(service.price).toFixed(2)}</td>
                    <td class="staff-cell">${staffNames}</td>
                    <td class="actions-cell">
                        ${window.userData && (window.userData.role === 'owner' || window.userData.role === 'admin') ? `
                            <button class="btn-icon btn-edit" onclick="serviceManager.editService('${service.id}')" title="${this.translations.edit || 'Edit'}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon btn-delete" onclick="serviceManager.confirmDeleteService('${service.id}')" title="${this.translations.delete || 'Delete'}">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Render categories table
     */
    renderCategories() {
        const tableBody = document.getElementById('categories-table-body');
        const table = document.getElementById('categories-table');
        const empty = document.getElementById('categories-empty');

        if (!tableBody) return;

        // Check if we have categories
        if (this.categories.length === 0) {
            if (table) table.style.display = 'none';
            if (empty) empty.style.display = 'block';
            return;
        }

        // Show table, hide empty state
        if (table) table.style.display = 'table';
        if (empty) empty.style.display = 'none';

        // Render category rows
        tableBody.innerHTML = this.categories.map(category => {
            const serviceCount = this.services.filter(s => s.category_id === category.id).length;

            return `
                <tr data-category-id="${category.id}">
                    <td class="category-name">${category.name}</td>
                    <td class="category-description">${category.description || '-'}</td>
                    <td class="text-center">${serviceCount}</td>
                    <td class="actions-cell">
                        ${window.userData && (window.userData.role === 'owner' || window.userData.role === 'admin') ? `
                            <button class="btn-icon btn-edit" onclick="serviceManager.editCategory('${category.id}')" title="${this.translations.edit || 'Edit'}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon btn-delete" onclick="serviceManager.confirmDeleteCategory('${category.id}')" title="${this.translations.delete || 'Delete'}">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        }).join('');
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
                document.getElementById('service-description').value = this.currentService.description || '';
                document.getElementById('service-category').value = this.currentService.category_id;
                document.getElementById('service-duration').value = this.currentService.duration;
                document.getElementById('service-price').value = this.currentService.price;

                const discountPriceInput = document.getElementById('service-discount-price');
                if (discountPriceInput && this.currentService.discount_price) {
                    discountPriceInput.value = this.currentService.discount_price;
                }

                // Check assigned staff
                const staffIds = this.currentService.staff_ids || [];
                staffIds.forEach(staffId => {
                    const checkbox = staffSelection?.querySelector(`input[value="${staffId}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            }
        } else {
            // Create mode
            this.currentService = null;
            if (modalTitle) modalTitle.textContent = this.translations.addService || 'Add Service';
            if (form) form.reset();
            document.getElementById('service-id').value = '';
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

        // Get selected staff
        const staffCheckboxes = document.querySelectorAll('#staff-selection input[type="checkbox"]:checked');
        const staffIds = Array.from(staffCheckboxes).map(cb => cb.value);

        // Build service data according to API specification
        const serviceData = {
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

        try {
            if (serviceId) {
                // Update existing service
                await window.api.updateService(parseInt(serviceId), serviceData);
                const index = this.services.findIndex(s => s.id === parseInt(serviceId));
                if (index !== -1) {
                    this.services[index] = { ...this.services[index], ...serviceData, id: parseInt(serviceId) };
                }
                this.showSuccess('Service updated successfully');
            } else {
                // Create new service
                const response = await window.api.createService(serviceData);
                if (response?.data) {
                    this.services.push(response.data);
                }
                this.showSuccess('Service created successfully');
            }

            this.hideServiceModal();
            this.renderServices();
        } catch (error) {
            console.error('Failed to save service:', error);
            this.showError('Failed to save service');
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
            await window.api.deleteService(this.deleteServiceId);
            this.services = this.services.filter(s => s.id !== this.deleteServiceId);
            this.showSuccess('Service deleted successfully');
            this.hideDeleteModal();
            this.renderServices();
        } catch (error) {
            console.error('Failed to delete service:', error);
            this.showError('Failed to delete service');
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
            if (this.currentCategory) {
                // Update existing category
                await window.api.updateCategory(this.currentCategory.id, categoryData);
                const index = this.categories.findIndex(c => c.id === this.currentCategory.id);
                if (index !== -1) {
                    this.categories[index] = { ...this.categories[index], ...categoryData };
                }
                this.showSuccess('Category updated successfully');
            } else {
                // Create new category
                const response = await window.api.createCategory(categoryData);
                if (response?.data) {
                    this.categories.push(response.data);
                }
                this.showSuccess('Category created successfully');
            }

            this.hideCategoryModal();
            this.renderCategories();
            this.renderServices(); // Re-render services to update category names
        } catch (error) {
            console.error('Failed to save category:', error);
            this.showError('Failed to save category');
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
            await window.api.deleteCategory(this.deleteCategoryId);
            this.categories = this.categories.filter(c => c.id !== this.deleteCategoryId);
            this.showSuccess('Category deleted successfully');
            this.hideDeleteCategoryModal();
            this.renderCategories();
            this.renderServices(); // Re-render services to update category names
        } catch (error) {
            console.error('Failed to delete category:', error);
            this.showError('Failed to delete category');
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
            const response = await window.api.getCompanyServices();

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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.serviceManager.init());
} else {
    window.serviceManager.init();
}
