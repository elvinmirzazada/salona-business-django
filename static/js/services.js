// Services Page JavaScript

class ServicesManager {
    constructor() {
        this.currentServiceId = null;
        this.currentCategoryId = null;
        this.services = [];
        this.categories = [];
        this.staff = [];
        this.currentTab = 'services';
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadInitialData();
    }

    bindEvents() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Service modal events
        const serviceModal = document.getElementById('service-modal');
        const deleteModal = document.getElementById('delete-modal');
        const categoryModal = document.getElementById('category-modal');
        const deleteCategoryModal = document.getElementById('delete-category-modal');

        // Add service button
        document.getElementById('add-service-btn')?.addEventListener('click', () => this.openServiceModal());

        // Add category button
        document.getElementById('add-category-btn')?.addEventListener('click', () => this.openCategoryModal());

        // Service form submission
        document.getElementById('service-form')?.addEventListener('submit', (e) => this.handleServiceSubmit(e));

        // Category form submission
        document.getElementById('category-form')?.addEventListener('submit', (e) => this.handleCategorySubmit(e));

        // Modal close events
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', (e) => this.closeModal(e.target.closest('.modal')));
        });

        // Cancel buttons
        document.getElementById('cancel-service-btn')?.addEventListener('click', () => this.closeModal(serviceModal));
        document.getElementById('cancel-delete-btn')?.addEventListener('click', () => this.closeModal(deleteModal));
        document.getElementById('cancel-category-btn')?.addEventListener('click', () => this.closeModal(categoryModal));
        document.getElementById('cancel-delete-category-btn')?.addEventListener('click', () => this.closeModal(deleteCategoryModal));

        // Confirm delete buttons
        document.getElementById('confirm-delete-btn')?.addEventListener('click', () => this.confirmDeleteService());
        document.getElementById('confirm-delete-category-btn')?.addEventListener('click', () => this.confirmDeleteCategory());

        // Click outside modal to close
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target);
            }
        });
    }

    switchTab(tabName) {
        this.currentTab = tabName;

        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // Load appropriate data based on tab
        if (tabName === 'services') {
            this.renderServicesTable();
        } else if (tabName === 'categories') {
            this.renderCategoriesTable();
        }
    }

    async loadInitialData() {
        this.showLoading('services');
        try {
            await Promise.all([
                this.loadServices(),
                this.loadCategories(),
                this.loadStaff()
            ]);
            this.renderServicesTable();
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showError('Failed to load data. Please refresh the page.');
        } finally {
            this.hideLoading('services');
            this.hideLoading('categories');
        }
    }

    async loadServices() {
        try {
            const response = await api.getCompanyServices();
            this.services = response.data || [];
        } catch (error) {
            console.error('Error loading services:', error);
            this.services = [];
        }
    }

    async loadCategories() {
        try {
            const response = await api.request('/users/api/api/v1/services/companies/categories');
            this.categories = response.data || [];
        } catch (error) {
            console.error('Error loading categories:', error);
            this.categories = [];
        }
    }

    async loadStaff() {
        try {
            const response = await api.getStaff();
            this.staff = response.data || [];
        } catch (error) {
            console.error('Error loading staff:', error);
            this.staff = [];
        }
    }

    renderServicesTable() {
        const tableContainer = document.getElementById('services-table-container');
        const table = document.getElementById('services-table');
        const tbody = document.getElementById('services-table-body');
        const emptyState = document.getElementById('services-empty');

        if (!this.services.length) {
            table.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        // Clear existing rows
        tbody.innerHTML = '';

        // Add service rows
        this.services.forEach(service => {
            service.services.forEach(svc => {
                const row = this.createServiceRow(svc, service.name);
                tbody.appendChild(row);
            });
        });

        table.style.display = 'table';
        emptyState.style.display = 'none';
    }

    createServiceRow(service, category_name) {
        const tr = document.createElement('tr');
        const categoryName = category_name;
        const staffNames = this.getServiceStaffNames([]);
        const priceDisplay = this.formatPriceDisplay(service.price, service.discount_price);
        
        tr.innerHTML = `
            <td>
                <div class="service-name">${escapeHtml(service.name)}</div>
                ${service.additional_info ? `<div style="font-size: 12px; color: #6B7280; margin-top: 4px;">${escapeHtml(service.additional_info)}</div>` : ''}
            </td>
            <td>${escapeHtml(categoryName)}</td>
            <td class="service-duration">${service.duration} min</td>
            <td>${priceDisplay}</td>
            <td style="font-size: 14px; color: #6B7280;">${staffNames}</td>
        `;
        if (["admin", "owner"].includes(window.userData.role)) {
            tr.innerHTML += `
                <td class="service-actions">
                    <button class="btn-icon" onclick="servicesManager.editService(${service.id})" title="Edit service">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-danger" onclick="servicesManager.deleteService(${service.id})" title="Delete service">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;
        }
        return tr;
    }

    renderCategoriesTable() {
        const tableContainer = document.getElementById('categories-table-container');
        const table = document.getElementById('categories-table');
        const tbody = document.getElementById('categories-table-body');
        const emptyState = document.getElementById('categories-empty');

        if (!this.categories.length) {
            table.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        // Clear existing rows
        tbody.innerHTML = '';

        // Add category rows
        this.categories.forEach(category => {
            const row = this.createCategoryRow(category);
            tbody.appendChild(row);
        });

        table.style.display = 'table';
        emptyState.style.display = 'none';
    }

    createCategoryRow(category) {
        const tr = document.createElement('tr');
        const servicesCount = this.services.filter(s => s.name === category.name)[0].services.length;

        tr.innerHTML = `
            <td>
                <div class="service-name">${escapeHtml(category.name)}</div>
            </td>
            <td style="color: #6B7280;">${category.description ? escapeHtml(category.description) : '-'}</td>
            <td style="font-weight: 500;">${servicesCount} service${servicesCount !== 1 ? 's' : ''}</td>
        `;
        if (["admin", "owner"].includes(window.userData.role)) {
            tr.innerHTML += `
                <td class="service-actions">
                    <button class="btn-icon btn-danger" onclick="servicesManager.deleteCategory(${category.id})" title="Delete category">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;
        }
        return tr;
    }

    getCategoryName(categoryId) {
        const category = this.categories.find(c => c.id === categoryId);
        return category ? category.name : 'Unknown Category';
    }

    getServiceStaffNames(staffIds) {
        if (!staffIds.length) return 'All staff';
        const names = staffIds.map(id => {
            const staff = this.staff.find(s => s.user.id === id);
            return staff ? `${staff.user.first_name} ${staff.user.last_name}` : '';
        }).filter(name => name);
        return names.length ? names.join(', ') : 'All staff';
    }

    formatPriceDisplay(price, discountPrice) {
        if (discountPrice && discountPrice < price) {
            return `
                <span class="service-price has-discount">$${price}</span>
                <span class="service-discount-price">$${discountPrice}</span>
            `;
        }
        return `<span class="service-price">$${price}</span>`;
    }

    openServiceModal(serviceId = null) {
        this.currentServiceId = serviceId;
        const modal = document.getElementById('service-modal');
        const title = document.getElementById('service-modal-title');
        const form = document.getElementById('service-form');

        title.textContent = serviceId ? 'Edit Service' : 'Add Service';
        
        // Populate category dropdown
        this.populateCategoryDropdown();
        
        // Populate staff checkboxes
        this.populateStaffCheckboxes();

        if (serviceId) {
            this.populateServiceForm(serviceId);
        } else {
            form.reset();
            document.getElementById('service-id').value = '';
        }

        modal.style.display = 'block';
    }

    populateCategoryDropdown() {
        const select = document.getElementById('service-category');
        select.innerHTML = '<option value="">Select a category</option>';
        
        this.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            select.appendChild(option);
        });
    }

    populateStaffCheckboxes() {
        const container = document.getElementById('staff-selection');
        container.innerHTML = '';

        if (!this.staff.length) {
            container.innerHTML = '<p style="color: #6B7280; font-size: 14px;">No staff members found</p>';
            return;
        }

        this.staff.forEach(staff => {
            const div = document.createElement('div');
            div.className = 'checkbox-item';
            div.innerHTML = `
                <input type="checkbox" id="staff-${staff.user.id}" value="${staff.user.id}" name="staff">
                <label for="staff-${staff.user.id}">${escapeHtml(staff.user.first_name)} ${escapeHtml(staff.user.last_name)}</label>
            `;
            container.appendChild(div);
        });
    }

    populateServiceForm(serviceId) {
        const service = this.services.find(s => s.id === serviceId);
        if (!service) return;

        document.getElementById('service-id').value = service.id;
        document.getElementById('service-name').value = service.name;
        document.getElementById('service-category').value = service.category_id;
        document.getElementById('service-duration').value = service.duration;
        document.getElementById('service-price').value = service.price;
        document.getElementById('service-discount-price').value = service.discount_price || '';
        document.getElementById('service-description').value = service.description || '';

        // Set staff checkboxes
        const staffIds = service.staff_ids || [];
        document.querySelectorAll('#staff-selection input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = staffIds.includes(parseInt(checkbox.value));
        });
    }

    async handleServiceSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const staffIds = Array.from(document.querySelectorAll('#staff-selection input[type="checkbox"]:checked'))
            .map(cb => parseInt(cb.value));

        const serviceData = {
            name: formData.get('service-name'),
            category_id: parseInt(formData.get('service-category')),
            duration: parseInt(formData.get('service-duration')),
            price: parseFloat(formData.get('service-price')),
            discount_price: formData.get('service-discount-price') ? parseFloat(formData.get('service-discount-price')) : null,
            description: formData.get('service-description'),
            staff_ids: staffIds
        };

        try {
            let response;
            if (this.currentServiceId) {
                response = await api.updateService(this.currentServiceId, serviceData);
            } else {
                response = await api.createService(serviceData);
            }

            await this.loadServices();
            this.renderServicesTable();
            this.closeModal(document.getElementById('service-modal'));
            this.showSuccess(this.currentServiceId ? 'Service updated successfully' : 'Service created successfully');
        } catch (error) {
            console.error('Error saving service:', error);
            this.showError('Failed to save service. Please try again.');
        }
    }

    editService(serviceId) {
        this.openServiceModal(serviceId);
    }

    deleteService(serviceId) {
        this.currentServiceId = serviceId;
        document.getElementById('delete-modal').style.display = 'block';
    }

    async confirmDeleteService() {
        if (!this.currentServiceId) return;

        try {
            await api.deleteService(this.currentServiceId);
            await this.loadServices();
            this.renderServicesTable();
            this.closeModal(document.getElementById('delete-modal'));
            this.showSuccess('Service deleted successfully');
        } catch (error) {
            console.error('Error deleting service:', error);
            this.showError('Failed to delete service. Please try again.');
        }
    }

    openCategoryModal(categoryId = null) {
        this.currentCategoryId = categoryId;
        const modal = document.getElementById('category-modal');
        const form = document.getElementById('category-form');

        if (categoryId) {
            const category = this.categories.find(c => c.id === categoryId);
            if (category) {
                document.getElementById('category-name').value = category.name;
                document.getElementById('category-description').value = category.description || '';
            }
        } else {
            form.reset();
        }

        modal.style.display = 'block';
    }

    async handleCategorySubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const categoryData = {
            name: formData.get('category-name'),
            description: formData.get('category-description')
        };

        try {
            let response;
            if (this.currentCategoryId) {
                response = await api.request(`/users/api/api/v1/service-categories/${this.currentCategoryId}`, {
                    method: 'PUT',
                    body: JSON.stringify(categoryData)
                });
            } else {
                response = await api.request('/users/api/api/v1/service-categories', {
                    method: 'POST',
                    body: JSON.stringify(categoryData)
                });
            }

            await this.loadCategories();
            await this.loadServices(); // Reload services to update category relationships

            // Refresh the current tab view
            if (this.currentTab === 'categories') {
                this.renderCategoriesTable();
            } else {
                this.renderServicesTable();
            }

            this.closeModal(document.getElementById('category-modal'));
            this.showSuccess(this.currentCategoryId ? 'Category updated successfully' : 'Category created successfully');
        } catch (error) {
            console.error('Error saving category:', error);
            this.showError('Failed to save category. Please try again.');
        }
    }

    deleteCategory(categoryId) {
        this.currentCategoryId = categoryId;
        const category = this.categories.find(c => c.id === categoryId);
        if (category) {
            document.getElementById('delete-category-name').textContent = category.name;
        }
        document.getElementById('delete-category-modal').style.display = 'block';
    }

    async confirmDeleteCategory() {
        if (!this.currentCategoryId) return;

        try {
            await api.request(`/users/api/api/v1/service-categories/${this.currentCategoryId}`, {
                method: 'DELETE'
            });
            await this.loadCategories();
            await this.loadServices(); // Reload services to update category relationships

            // Refresh the current tab view
            if (this.currentTab === 'categories') {
                this.renderCategoriesTable();
            } else {
                this.renderServicesTable();
            }

            this.closeModal(document.getElementById('delete-category-modal'));
            this.showSuccess('Category deleted successfully');
        } catch (error) {
            console.error('Error deleting category:', error);
            this.showError('Failed to delete category. Please try again.');
        }
    }

    closeModal(modal) {
        if (modal) {
            modal.style.display = 'none';
        }
        this.currentServiceId = null;
        this.currentCategoryId = null;
    }

    showLoading(tab = 'services') {
        document.getElementById(`${tab}-loading`).style.display = 'block';
        document.getElementById(`${tab}-empty`).style.display = 'none';
        document.getElementById(`${tab}-table-container`).style.display = 'none';
    }

    hideLoading(tab = 'services') {
        document.getElementById(`${tab}-loading`).style.display = 'none';
        document.getElementById(`${tab}-table-container`).style.display = 'block';
    }

    showSuccess(message) {
        // You can implement a toast notification system here
        console.log('Success:', message);
        // For now, just show an alert
        alert(message);
    }

    showError(message) {
        // You can implement a toast notification system here
        console.error('Error:', message);
        // For now, just show an alert
        alert(message);
    }
}

// Utility function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize services manager when DOM is loaded
let servicesManager;
document.addEventListener('DOMContentLoaded', () => {
    servicesManager = new ServicesManager();
});
