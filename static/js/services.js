// /**
//  * Services and Categories Management
//  *
//  * NOTE: This file has been deprecated and unified into service-manager.js
//  * All functionality is now handled by the ServiceManager class in service-manager.js
//  *
//  * This file is kept for reference only and should not be loaded in the HTML template.
//  */
//
// // DEPRECATED - All functionality moved to service-manager.js
// // Do not use this file anymore
//
// /*
// class CategoryManager {
//     constructor() {
//         this.services = [];
//         this.categories = [];
//         this.currentCategory = null;
//         this.currentService = null;
//     }
//
//     /**
//      * Initialize the service manager
//      */
//     async init() {
//         try {
//             this.showLoading();
//             await this.loadCategories();
//             await this.loadServices();
//             this.setupEventListeners();
//             this.render();
//             this.hideLoading();
//         } catch (error) {
//             console.error('Failed to initialize service manager:', error);
//             this.hideLoading();
//             this.showError('Failed to load services and categories');
//         }
//     }
//
//     /**
//      * Show loading state
//      */
//     showLoading() {
//         const servicesLoading = document.getElementById('services-loading');
//         const categoriesLoading = document.getElementById('categories-loading');
//
//         if (servicesLoading) servicesLoading.style.display = 'flex';
//         if (categoriesLoading) categoriesLoading.style.display = 'flex';
//     }
//
//     /**
//      * Hide loading state
//      */
//     hideLoading() {
//         const servicesLoading = document.getElementById('services-loading');
//         const categoriesLoading = document.getElementById('categories-loading');
//
//         if (servicesLoading) servicesLoading.style.display = 'none';
//         if (categoriesLoading) categoriesLoading.style.display = 'none';
//     }
//
//     /**
//      * Load all categories
//      */
//     async loadCategories() {
//         try {
//             const response = await window.api.getCategories();
//             this.categories = response?.data || [];
//             return this.categories;
//         } catch (error) {
//             console.error('Failed to load categories:', error);
//             throw error;
//         }
//     }
//
//     /**
//      * Load all services
//      */
//     async loadServices() {
//         try {
//             const response = await window.api.getCompanyServices();
//             this.services = response?.data || [];
//             return this.services;
//         } catch (error) {
//             console.error('Failed to load services:', error);
//             throw error;
//         }
//     }
//
//     /**
//      * Create a new category
//      */
//     async createCategory(categoryData) {
//         try {
//             const response = await window.api.createCategory(categoryData);
//             if (response?.data) {
//                 this.categories.push(response.data);
//                 this.render();
//                 this.showSuccess('Category created successfully');
//                 return response.data;
//             }
//         } catch (error) {
//             console.error('Failed to create category:', error);
//             this.showError('Failed to create category');
//             throw error;
//         }
//     }
//
//     /**
//      * Update an existing category
//      */
//     async updateCategory(categoryId, categoryData) {
//         try {
//             const response = await window.api.updateCategory(categoryId, categoryData);
//             if (response?.data) {
//                 const index = this.categories.findIndex(c => c.id === categoryId);
//                 if (index !== -1) {
//                     this.categories[index] = response.data;
//                 }
//                 this.render();
//                 this.showSuccess('Category updated successfully');
//                 return response.data;
//             }
//         } catch (error) {
//             console.error('Failed to update category:', error);
//             this.showError('Failed to update category');
//             throw error;
//         }
//     }
//
//     /**
//      * Delete a category
//      */
//     async deleteCategory(categoryId) {
//         if (!confirm('Are you sure you want to delete this category? This may affect associated services.')) {
//             return;
//         }
//
//         try {
//             await window.api.deleteCategory(categoryId);
//             this.categories = this.categories.filter(c => c.id !== categoryId);
//             this.render();
//             this.showSuccess('Category deleted successfully');
//         } catch (error) {
//             console.error('Failed to delete category:', error);
//             this.showError('Failed to delete category');
//             throw error;
//         }
//     }
//
//     /**
//      * Create a new service
//      */
//     async createService(serviceData) {
//         try {
//             const response = await window.api.createService(serviceData);
//             if (response?.data) {
//                 this.services.push(response.data);
//                 this.render();
//                 this.showSuccess('Service created successfully');
//                 return response.data;
//             }
//         } catch (error) {
//             console.error('Failed to create service:', error);
//             this.showError('Failed to create service');
//             throw error;
//         }
//     }
//
//     /**
//      * Update an existing service
//      */
//     async updateService(serviceId, serviceData) {
//         try {
//             const response = await window.api.updateService(serviceId, serviceData);
//             if (response?.data) {
//                 const index = this.services.findIndex(s => s.id === serviceId);
//                 if (index !== -1) {
//                     this.services[index] = response.data;
//                 }
//                 this.render();
//                 this.showSuccess('Service updated successfully');
//                 return response.data;
//             }
//         } catch (error) {
//             console.error('Failed to update service:', error);
//             this.showError('Failed to update service');
//             throw error;
//         }
//     }
//
//     /**
//      * Delete a service
//      */
//     async deleteService(serviceId) {
//         if (!confirm('Are you sure you want to delete this service?')) {
//             return;
//         }
//
//         try {
//             await window.api.deleteService(serviceId);
//             this.services = this.services.filter(s => s.id !== serviceId);
//             this.render();
//             this.showSuccess('Service deleted successfully');
//         } catch (error) {
//             console.error('Failed to delete service:', error);
//             this.showError('Failed to delete service');
//             throw error;
//         }
//     }
//
//     /**
//      * Get services by category
//      */
//     getServicesByCategory(categoryId) {
//         return this.services.filter(service => service.category_id === categoryId);
//     }
//
//     /**
//      * Setup event listeners for UI interactions
//      */
//     setupEventListeners() {
//         // Category form submission
//         const categoryForm = document.getElementById('category-form');
//         if (categoryForm) {
//             categoryForm.addEventListener('submit', async (e) => {
//                 e.preventDefault();
//                 await this.handleCategorySubmit(e.target);
//             });
//         }
//
//         // Service form submission
//         const serviceForm = document.getElementById('service-form');
//         if (serviceForm) {
//             serviceForm.addEventListener('submit', async (e) => {
//                 e.preventDefault();
//                 await this.handleServiceSubmit(e.target);
//             });
//         }
//
//         // Add category button
//         const addCategoryBtn = document.getElementById('add-category-btn');
//         if (addCategoryBtn) {
//             addCategoryBtn.addEventListener('click', () => this.showCategoryModal());
//         }
//
//         // Add service button
//         const addServiceBtn = document.getElementById('add-service-btn');
//         if (addServiceBtn) {
//             addServiceBtn.addEventListener('click', () => this.showServiceModal());
//         }
//     }
//
//     /**
//      * Handle category form submission
//      */
//     async handleCategorySubmit(form) {
//         const formData = new FormData(form);
//         const categoryData = {
//             name: formData.get('name'),
//             description: formData.get('description'),
//             icon: formData.get('icon'),
//             color: formData.get('color')
//         };
//
//         const categoryId = formData.get('category_id');
//         if (categoryId) {
//             await this.updateCategory(categoryId, categoryData);
//         } else {
//             await this.createCategory(categoryData);
//         }
//
//         this.hideCategoryModal();
//         form.reset();
//     }
//
//     /**
//      * Handle service form submission
//      */
//     async handleServiceSubmit(form) {
//         const formData = new FormData(form);
//         const serviceData = {
//             name: formData.get('name'),
//             description: formData.get('description'),
//             category_id: formData.get('category_id'),
//             duration: parseInt(formData.get('duration')),
//             price: parseFloat(formData.get('price')),
//             is_active: formData.get('is_active') === 'on'
//         };
//
//         const serviceId = formData.get('service_id');
//         if (serviceId) {
//             await this.updateService(serviceId, serviceData);
//         } else {
//             await this.createService(serviceData);
//         }
//
//         this.hideServiceModal();
//         form.reset();
//     }
//
//     /**
//      * Show category modal for create/edit
//      */
//     showCategoryModal(category = null) {
//         this.currentCategory = category;
//         const modal = document.getElementById('category-modal');
//         if (modal) {
//             if (category) {
//                 // Populate form with category data
//                 document.getElementById('category-name').value = category.name;
//                 document.getElementById('category-description').value = category.description || '';
//                 document.getElementById('category-icon').value = category.icon || '';
//                 document.getElementById('category-color').value = category.color || '#000000';
//                 document.getElementById('category-id').value = category.id;
//             }
//             modal.classList.add('active');
//         }
//     }
//
//     /**
//      * Hide category modal
//      */
//     hideCategoryModal() {
//         const modal = document.getElementById('category-modal');
//         if (modal) {
//             modal.classList.remove('active');
//             this.currentCategory = null;
//         }
//     }
//
//     /**
//      * Show service modal for create/edit
//      */
//     showServiceModal(service = null) {
//         this.currentService = service;
//         const modal = document.getElementById('service-modal');
//         if (modal) {
//             if (service) {
//                 // Populate form with service data
//                 document.getElementById('service-name').value = service.name;
//                 document.getElementById('service-description').value = service.description || '';
//                 document.getElementById('service-category').value = service.category_id;
//                 document.getElementById('service-duration').value = service.duration;
//                 document.getElementById('service-price').value = service.price;
//                 document.getElementById('service-active').checked = service.is_active;
//                 document.getElementById('service-id').value = service.id;
//             }
//             modal.classList.add('active');
//         }
//     }
//
//     /**
//      * Hide service modal
//      */
//     hideServiceModal() {
//         const modal = document.getElementById('service-modal');
//         if (modal) {
//             modal.classList.remove('active');
//             this.currentService = null;
//         }
//     }
//
//     /**
//      * Render the services and categories UI
//      */
//     render() {
//         this.renderCategories();
//         this.renderServices();
//     }
//
//     /**
//      * Render categories list
//      */
//     renderCategories() {
//         const container = document.getElementById('categories-container');
//         if (!container) return;
//
//         container.innerHTML = this.categories.map(category => `
//             <div class="category-card" data-category-id="${category.id}">
//                 <div class="category-header">
//                     <div class="category-icon" style="background-color: ${category.color || '#ccc'}">
//                         ${category.icon || '📁'}
//                     </div>
//                     <h3>${category.name}</h3>
//                 </div>
//                 <p class="category-description">${category.description || ''}</p>
//                 <div class="category-actions">
//                     <button class="btn-edit" onclick="categoryManager.showCategoryModal(${JSON.stringify(category).replace(/"/g, '&quot;')})">
//                         Edit
//                     </button>
//                     <button class="btn-delete" onclick="categoryManager.deleteCategory(${category.id})">
//                         Delete
//                     </button>
//                 </div>
//                 <div class="category-services-count">
//                     ${this.getServicesByCategory(category.id).length} services
//                 </div>
//             </div>
//         `).join('');
//
//         // Show empty state if no categories
//         const emptyState = document.getElementById('categories-empty-state');
//         if (emptyState) {
//             emptyState.style.display = this.categories.length === 0 ? 'block' : 'none';
//         }
//     }
//
//     /**
//      * Render services list
//      */
//     renderServices() {
//         const container = document.getElementById('services-container');
//         if (!container) return;
//
//         const servicesByCategory = {};
//         this.categories.forEach(category => {
//             servicesByCategory[category.id] = this.getServicesByCategory(category.id);
//         });
//
//         container.innerHTML = this.categories.map(category => {
//             const services = servicesByCategory[category.id];
//             if (services.length === 0) return '';
//
//             return `
//                 <div class="service-category-group">
//                     <h3 class="category-title">${category.name}</h3>
//                     <div class="services-grid">
//                         ${services.map(service => `
//                             <div class="service-card" data-service-id="${service.id}">
//                                 <div class="service-header">
//                                     <h4>${service.name}</h4>
//                                     <span class="service-status ${service.is_active ? 'active' : 'inactive'}">
//                                         ${service.is_active ? 'Active' : 'Inactive'}
//                                     </span>
//                                 </div>
//                                 <p class="service-description">${service.description || ''}</p>
//                                 <div class="service-details">
//                                     <span class="service-duration">⏱️ ${service.duration} min</span>
//                                     <span class="service-price">💰 $${service.price}</span>
//                                 </div>
//                                 <div class="service-actions">
//                                     <button class="btn-edit" onclick="categoryManager.showServiceModal(${JSON.stringify(service).replace(/"/g, '&quot;')})">
//                                         Edit
//                                     </button>
//                                     <button class="btn-delete" onclick="categoryManager.deleteService(${service.id})">
//                                         Delete
//                                     </button>
//                                 </div>
//                             </div>
//                         `).join('')}
//                     </div>
//                 </div>
//             `;
//         }).join('');
//
//         // Show empty state if no services
//         const emptyState = document.getElementById('services-empty-state');
//         if (emptyState) {
//             emptyState.style.display = this.services.length === 0 ? 'block' : 'none';
//         }
//     }
//
//     /**
//      * Show success message
//      */
//     showSuccess(message) {
//         // Use your UI notification system
//         console.log('Success:', message);
//         if (window.showNotification) {
//             window.showNotification(message, 'success');
//         }
//     }
//
//     /**
//      * Show error message
//      */
//     showError(message) {
//         // Use your UI notification system
//         console.error('Error:', message);
//         if (window.showNotification) {
//             window.showNotification(message, 'error');
//         }
//     }
// }
//
// // Create global instance
// const categoryManager = new CategoryManager();
//
// // Initialize when DOM is ready
// if (document.readyState === 'loading') {
//     document.addEventListener('DOMContentLoaded', () => categoryManager.init());
// } else {
//     categoryManager.init();
// }
//
// // Export for use in other modules
// if (typeof module !== 'undefined' && module.exports) {
//     module.exports = categoryManager;
// }
// */
//
// // DEPRECATED: CategoryManager functionality is now in ServiceManager (service-manager.js)
// console.warn('services.js is deprecated. Use service-manager.js instead.');
