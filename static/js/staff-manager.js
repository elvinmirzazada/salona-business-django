/**
 * Staff Manager - Handles staff CRUD operations
 * Uses API client for all backend communication
 */

class StaffManager {
    constructor() {
        this.staff = [];
        this.currentEditingId = null;
        this.currentDeletingId = null;
    }

    /**
     * Initialize the staff manager
     */
    async init() {
        try {
            this.setupEventListeners();
            await this.loadStaff();
        } catch (error) {
            console.error('Failed to initialize staff manager:', error);
            this.hideLoading();
            this.showError('Failed to load staff data');
        }
    }

    /**
     * Load staff data from API
     */
    async loadStaff() {
        try {
            this.showLoading();

            const response = await window.api.getStaff();

            if (response && response.data) {
                this.staff = response.data;
            } else {
                this.staff = [];
            }

            this.renderStaffTable();
            this.hideLoading();

        } catch (error) {
            console.error('Failed to load staff:', error);
            this.hideLoading();
            this.showError('Failed to load staff data');
        }
    }

    /**
     * Show loading state
     */
    showLoading() {
        const loading = document.getElementById('staff-loading');
        const tableContainer = document.getElementById('staff-table-container');
        const emptyState = document.getElementById('staff-empty');

        if (loading) loading.style.display = 'flex';
        if (tableContainer) tableContainer.style.display = 'none';
        if (emptyState) emptyState.style.display = 'none';
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        const loading = document.getElementById('staff-loading');
        if (loading) loading.style.display = 'none';
    }

    /**
     * Render staff table
     */
    renderStaffTable() {
        const tbody = document.getElementById('staff-tbody');
        const tableContainer = document.getElementById('staff-table-container');
        const emptyState = document.getElementById('staff-empty');

        if (!tbody) return;

        // Check if we have staff
        if (!this.staff || this.staff.length === 0) {
            if (tableContainer) tableContainer.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        // Show table, hide empty state
        if (tableContainer) tableContainer.style.display = 'block';
        if (emptyState) emptyState.style.display = 'none';

        // Render staff rows
        tbody.innerHTML = this.staff.map(staff => {
            const statusClass = staff.status ? 'status-active' : 'status-inactive';
            const statusText = staff.status ? 'Active' : 'Inactive';

            return `
                <tr data-staff-id="${staff.user.id}">
                    <td>${staff.user.first_name || ''} ${staff.user.last_name || ''}</td>
                    <td>${staff.user.email || '-'}</td>
                    <td>${staff.user.phone || '-'}</td>
                    <td>${this.capitalizeRole(staff.role || 'staff')}</td>
                    <td>
                        <span class="${statusClass}">
                            ${statusText}
                        </span>
                    </td>
                    <td class="actions-cell">
                        ${window.userData && (window.userData.role === 'owner' || window.userData.role === 'admin') ? `
                            <button class="action-btn edit-btn" onclick="staffManager.openEditModal('${staff.user.id}')" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete-btn" onclick="staffManager.openDeleteModal('${staff.user.id}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Capitalize role name
     */
    capitalizeRole(role) {
        return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Modal event listeners
        const staffForm = document.getElementById('staff-form');
        if (staffForm) {
            staffForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveStaff();
            });
        }

        // Close modal when clicking outside
        const staffModal = document.getElementById('staff-modal');
        const deleteModal = document.getElementById('delete-modal');

        if (staffModal) {
            staffModal.addEventListener('click', (e) => {
                if (e.target === staffModal) {
                    this.closeModal();
                }
            });
        }

        if (deleteModal) {
            deleteModal.addEventListener('click', (e) => {
                if (e.target === deleteModal) {
                    this.closeDeleteModal();
                }
            });
        }
    }

    /**
     * Open add staff modal
     */
    openAddModal() {
        const modal = document.getElementById('staff-modal');
        const modalTitle = document.getElementById('modal-title');
        const submitBtn = document.getElementById('submit-btn');
        const form = document.getElementById('staff-form');

        if (!modal) return;

        // Reset form
        if (form) form.reset();
        if (modalTitle) modalTitle.textContent = 'Add Staff Member';
        if (submitBtn) submitBtn.textContent = 'Add Staff Member';

        // Set default values
        const isActiveCheckbox = document.getElementById('is_active');
        if (isActiveCheckbox) isActiveCheckbox.checked = true;

        this.currentEditingId = null;
        modal.style.display = 'block';
    }

    /**
     * Open edit staff modal
     */
    openEditModal(staffId) {
        const staff = this.staff.find(s => s.id === staffId);
        if (!staff) {
            this.showError('Staff member not found');
            return;
        }

        const modal = document.getElementById('staff-modal');
        const modalTitle = document.getElementById('modal-title');
        const submitBtn = document.getElementById('submit-btn');

        if (!modal) return;

        // Populate form
        document.getElementById('first_name').value = staff.first_name || '';
        document.getElementById('last_name').value = staff.last_name || '';
        document.getElementById('email').value = staff.email || '';
        document.getElementById('phone').value = staff.phone || '';
        document.getElementById('role').value = staff.role || 'staff';
        document.getElementById('is_active').checked = staff.status !== false;

        if (modalTitle) modalTitle.textContent = 'Edit Staff Member';
        if (submitBtn) submitBtn.textContent = 'Update Staff Member';

        this.currentEditingId = staffId;
        modal.style.display = 'block';
    }

    /**
     * Close staff modal
     */
    closeModal() {
        const modal = document.getElementById('staff-modal');
        if (modal) {
            modal.style.display = 'none';
            this.currentEditingId = null;
        }
    }

    /**
     * Save staff (create or update)
     */
    async saveStaff() {
        try {
            const submitBtn = document.getElementById('submit-btn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Saving...';
            }

            const formData = {
                first_name: document.getElementById('first_name').value.trim(),
                last_name: document.getElementById('last_name').value.trim(),
                email: document.getElementById('email').value.trim(),
                phone: document.getElementById('phone').value.trim(),
                role: document.getElementById('role').value,
                is_active: document.getElementById('is_active').checked
            };

            // Validate required fields
            if (!formData.first_name || !formData.last_name || !formData.email) {
                this.showError('Please fill in all required fields');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = this.currentEditingId ? 'Update Staff Member' : 'Add Staff Member';
                }
                return;
            }

            let response;
            if (this.currentEditingId) {
                // Update existing staff
                response = await window.api.updateStaff(this.currentEditingId, formData);

                if (response && response.success !== false) {
                    this.showSuccess('Staff member updated successfully');

                    // Update local data
                    const index = this.staff.findIndex(s => s.id === this.currentEditingId);
                    if (index !== -1) {
                        this.staff[index] = { ...this.staff[index], ...formData };
                    }
                } else {
                    throw new Error(response?.message || 'Failed to update staff member');
                }
            } else {
                // Create new staff
                response = await window.api.createStaff(formData);

                if (response && response.data) {
                    this.showSuccess('Staff member added successfully');

                    // Add to local data
                    this.staff.push(response.data);
                } else if (response && response.success !== false) {
                    this.showSuccess('Staff member added successfully');
                    // Reload to get fresh data
                    await this.loadStaff();
                } else {
                    throw new Error(response?.message || 'Failed to create staff member');
                }
            }

            this.closeModal();
            this.renderStaffTable();

        } catch (error) {
            console.error('Failed to save staff:', error);
            this.showError(error.message || 'Failed to save staff member');
        } finally {
            const submitBtn = document.getElementById('submit-btn');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = this.currentEditingId ? 'Update Staff Member' : 'Add Staff Member';
            }
        }
    }

    /**
     * Open delete confirmation modal
     */
    openDeleteModal(staffId) {
        const staff = this.staff.find(s => s.id === staffId);
        if (!staff) {
            this.showError('Staff member not found');
            return;
        }

        this.currentDeletingId = staffId;
        const modal = document.getElementById('delete-modal');
        if (modal) modal.style.display = 'block';
    }

    /**
     * Close delete modal
     */
    closeDeleteModal() {
        const modal = document.getElementById('delete-modal');
        if (modal) {
            modal.style.display = 'none';
            this.currentDeletingId = null;
        }
    }

    /**
     * Confirm and delete staff
     */
    async confirmDelete() {
        if (!this.currentDeletingId) return;

        try {
            const response = await window.api.deleteStaff(this.currentDeletingId);

            if (response && response.success !== false) {
                this.showSuccess('Staff member deleted successfully');

                // Remove from local data
                this.staff = this.staff.filter(s => s.id !== this.currentDeletingId);

                this.closeDeleteModal();
                this.renderStaffTable();
            } else {
                throw new Error(response?.message || 'Failed to delete staff member');
            }

        } catch (error) {
            console.error('Failed to delete staff:', error);
            this.showError(error.message || 'Failed to delete staff member');
        }
    }

    /**
     * Static method to load staff members for booking form (global utility)
     */
    static async loadStaffMembers() {
        try {
            const response = await window.api.getStaff();

            if (!response || !response.data) {
                console.warn('No staff data received');
                return;
            }

            const staffData = response.data;
            const staffSelect = document.getElementById('booking-worker');

            if (!staffSelect) {
                console.warn('Staff select element not found');
                return;
            }

            // Clear existing options
            staffSelect.innerHTML = '<option value="">Select a staff member</option>';

            // Populate dropdown with staff members
            staffData.forEach(staffMember => {
                const option = document.createElement('option');
                option.value = staffMember.user.id;
                option.textContent = `${staffMember.user.first_name} ${staffMember.user.last_name}`;
                staffSelect.appendChild(option);
            });

            console.log('Staff members loaded successfully for booking form');
        } catch (error) {
            console.error('Failed to load staff for booking:', error);
        }
    }

    /**
     * Show success notification
     */
    showSuccess(message) {
        console.log('Success:', message);
        this.showAlert(message, 'success');
    }

    /**
     * Show error notification
     */
    showError(message) {
        console.error('Error:', message);
        this.showAlert(message, 'error');
    }

    /**
     * Show alert message
     */
    showAlert(message, type = 'success') {
        const alertContainer = document.getElementById('alert-container');
        if (!alertContainer) {
            // Fallback to window notification if available
            if (window.showNotification) {
                window.showNotification(message, type);
            } else {
                alert(message);
            }
            return;
        }

        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.textContent = message;

        alertContainer.innerHTML = '';
        alertContainer.appendChild(alertDiv);

        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }
}

// Create global instance
window.staffManager = new StaffManager();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.staffManager.init());
} else {
    window.staffManager.init();
}

// Global functions for onclick handlers
function openAddModal() {
    window.staffManager.openAddModal();
}

function closeModal() {
    window.staffManager.closeModal();
}

function closeDeleteModal() {
    window.staffManager.closeDeleteModal();
}

function confirmDelete() {
    window.staffManager.confirmDelete();
}
