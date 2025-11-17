/**
 * Staff Manager - Handles staff CRUD operations
 * Uses API client for all backend communication
 */

class StaffManager {
    constructor() {
        this.staff = [];
        this.invitations = [];
        this.currentEditingId = null;
        this.currentDeletingId = null;
        this.translations = window.staffTranslations || {};
    }

    /**
     * Initialize the staff manager
     */
    async init() {
        try {
            this.setupEventListeners();
            await this.loadStaff();
            await this.loadInvitations();
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
     * Load invitations data from API
     */
    async loadInvitations() {
        try {
            const response = await window.api.getInvitations();

            if (response && response.data) {
                this.invitations = response.data;
            } else {
                this.invitations = [];
            }

            this.renderInvitationsTable();

        } catch (error) {
            console.error('Failed to load invitations:', error);
            this.showError('Failed to load invitations data');
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
            const statusText = staff.status ? this.translations.active : this.translations.inactive;

            return `
                <tr data-staff-id="${staff.user.id}">
                    <td>${staff.user.first_name || ''} ${staff.user.last_name || ''}</td>
                    <td>${staff.user.email || '-'}</td>
                    <td>${staff.user.phone || '-'}</td>
                    <td>${this.translateRole(staff.role || 'staff')}</td>
                    <td>
                        <span class="${statusClass}">
                            ${statusText}
                        </span>
                    </td>
                    <td class="actions-cell">
                        ${window.userData && (window.userData.role === 'owner' || window.userData.role === 'admin') ? `
                            <button class="action-btn edit-btn" onclick="staffManager.openEditModal('${staff.user.id}')" title="${this.translations.edit}">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete-btn" onclick="staffManager.openDeleteModal('${staff.user.id}')" title="${this.translations.delete}">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Render invitations table
     */
    renderInvitationsTable() {
        const tbody = document.getElementById('invitations-tbody');
        const tableContainer = document.getElementById('invitations-table-container');
        const emptyState = document.getElementById('invitations-empty');

        if (!tbody) return;

        // Check if we have invitations
        if (!this.invitations || this.invitations.length === 0) {
            if (tableContainer) tableContainer.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        // Show table, hide empty state
        if (tableContainer) tableContainer.style.display = 'block';
        if (emptyState) emptyState.style.display = 'none';

        // Render invitation rows
        tbody.innerHTML = this.invitations.map(invitation => {
            const statusClass = `status-${invitation.status || 'pending'}`;
            const statusText = this.translateInvitationStatus(invitation.status || 'pending');
            const createdDate = new Date(invitation.created_at).toLocaleDateString();

            return `
                <tr data-invitation-id="${invitation.id}">
                    <td>${invitation.email || '-'}</td>
                    <td>${this.translateRole(invitation.role || 'staff')}</td>
                    <td>${createdDate}</td>
                    <td>
                        <span class="${statusClass}">
                            ${statusText}
                        </span>
                    </td>
                    <td class="actions-cell">
                        ${window.userData && (window.userData.role === 'owner' || window.userData.role === 'admin') ? `
                            <button class="action-btn resend-btn" onclick="staffManager.resendInvitation('${invitation.token}')" title="${this.translations.resend || 'Resend'}" style="color: #3182ce;">
                                <i class="fas fa-redo"></i>
                            </button>
                            <button class="action-btn delete-btn" onclick="staffManager.deleteInvitation('${invitation.id}')" title="${this.translations.delete}">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * Translate role name
     */
    translateRole(role) {
        const roleLower = role.toLowerCase();
        return this.translations[roleLower] || this.capitalizeRole(role);
    }

    /**
     * Capitalize role name
     */
    capitalizeRole(role) {
        return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
    }

    /**
     * Translate invitation status
     */
    translateInvitationStatus(status) {
        const statusMap = {
            'pending': this.translations.pending || 'Pending',
            'accepted': this.translations.accepted || 'Accepted',
            'declined': this.translations.declined || 'Declined',
            'expired': this.translations.expired || 'Expired'
        };
        return statusMap[status.toLowerCase()] || this.capitalizeRole(status);
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
        if (modalTitle) modalTitle.textContent = this.translations.inviteTeamMember || 'Invite team member';
        if (submitBtn) submitBtn.textContent = this.translations.inviteTeamMember || 'Invite team member';

        // Set default role to 'staff'
        const roleSelect = document.getElementById('role');
        if (roleSelect) roleSelect.value = 'staff';

        this.currentEditingId = null;
        modal.style.display = 'block';
    }

    /**
     * Open edit staff modal
     */
    openEditModal(staffId) {
        const staff = this.staff.find(s => s.id === staffId);
        if (!staff) {
            this.showError(this.translations.staffNotFound || 'Staff member not found');
            return;
        }

        const modal = document.getElementById('staff-modal');
        const modalTitle = document.getElementById('modal-title');
        const submitBtn = document.getElementById('submit-btn');

        if (!modal) return;

        // Populate form
        document.getElementById('email').value = staff.user.email || '';
        document.getElementById('role').value = staff.role || 'staff';

        if (modalTitle) modalTitle.textContent = this.translations.editStaffMember || 'Edit Staff Member';
        if (submitBtn) submitBtn.textContent = this.translations.updateStaffMember || 'Update Staff Member';

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
     * Save staff invitation
     */
    async saveStaff() {
        try {
            const submitBtn = document.getElementById('submit-btn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = this.translations.saving || 'Saving...';
            }

            // Get form elements with null checks
            const emailInput = document.getElementById('email');
            const roleSelect = document.getElementById('role');

            if (!emailInput || !roleSelect) {
                this.showError('Form elements not found. Please refresh the page and try again.');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = this.translations.inviteTeamMember || 'Invite team member';
                }
                return;
            }

            const formData = {
                email: emailInput.value.trim(),
                role: roleSelect.value
            };

            // Validate required fields
            if (!formData.email) {
                this.showError(this.translations.fillRequiredFields || 'Please fill in all required fields');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = this.translations.inviteTeamMember || 'Invite team member';
                }
                return;
            }

            // Only handle invitations (no updates)
            if (this.currentEditingId) {
                // Update existing staff role
                const updateData = {
                    role: formData.role
                };
                const response = await window.api.updateStaff(this.currentEditingId, updateData);

                if (response && response.success !== false) {
                    this.showSuccess(this.translations.staffUpdatedSuccess || 'Staff member updated successfully');

                    // Update local data
                    const index = this.staff.findIndex(s => s.id === this.currentEditingId);
                    if (index !== -1) {
                        this.staff[index].role = formData.role;
                    }
                } else {
                    throw new Error(response?.message || (this.translations.staffUpdateFailed || 'Failed to update staff member'));
                }
            } else {
                // Send invitation to new member
                const response = await window.api.sendInvitation(formData);

                if (response && response.success !== false) {
                    this.showSuccess(this.translations.invitationSentSuccess || 'Invitation sent successfully');

                    // Add to local data if returned
                    if (response.data) {
                        // Optionally add to pending invitations list
                        console.log('Invitation created:', response.data);
                    }

                    // Reload staff to refresh list
                    await this.loadStaff();
                } else {
                    throw new Error(response?.message || (this.translations.invitationFailed || 'Failed to send invitation'));
                }
            }

            this.closeModal();
            this.renderStaffTable();

        } catch (error) {
            console.error('Failed to save staff:', error);
            this.showError(error.message || (this.translations.failedToSave || 'Failed to save staff member'));
        } finally {
            const submitBtn = document.getElementById('submit-btn');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = this.currentEditingId ?
                    (this.translations.updateStaffMember || 'Update Staff Member') :
                    (this.translations.inviteTeamMember || 'Invite team member');
            }
        }
    }

    /**
     * Open delete confirmation modal
     */
    openDeleteModal(staffId) {
        const staff = this.staff.find(s => s.id === staffId);
        if (!staff) {
            this.showError(this.translations.staffNotFound || 'Staff member not found');
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
                this.showSuccess(this.translations.staffDeletedSuccess || 'Staff member deleted successfully');

                // Remove from local data
                this.staff = this.staff.filter(s => s.id !== this.currentDeletingId);

                this.closeDeleteModal();
                this.renderStaffTable();
            } else {
                throw new Error(response?.message || (this.translations.staffDeleteFailed || 'Failed to delete staff member'));
            }

        } catch (error) {
            console.error('Failed to delete staff:', error);
            this.showError(error.message || (this.translations.staffDeleteFailed || 'Failed to delete staff member'));
        }
    }

    /**
     * Delete invitation
     */
    async deleteInvitation(invitationId) {
        if (!confirm(this.translations.confirmDeleteInvitation || 'Are you sure you want to delete this invitation?')) {
            return;
        }

        try {
            const response = await window.api.deleteInvitation(invitationId);

            if (response && response.success !== false) {
                this.showSuccess(this.translations.invitationDeletedSuccess || 'Invitation deleted successfully');

                // Remove from local data
                this.invitations = this.invitations.filter(inv => inv.id !== invitationId);

                this.renderInvitationsTable();
            } else {
                throw new Error(response?.message || (this.translations.invitationDeleteFailed || 'Failed to delete invitation'));
            }

        } catch (error) {
            console.error('Failed to delete invitation:', error);
            this.showError(error.message || (this.translations.invitationDeleteFailed || 'Failed to delete invitation'));
        }
    }

    /**
     * Resend invitation
     */
    async resendInvitation(invitationToken) {
        try {
            const response = await window.api.resendInvitation(invitationToken);

            if (response && response.success !== false) {
                this.showSuccess(this.translations.invitationResentSuccess || 'Invitation resent successfully');
            } else {
                throw new Error(response?.message || (this.translations.invitationResendFailed || 'Failed to resend invitation'));
            }

        } catch (error) {
            console.error('Failed to resend invitation:', error);
            this.showError(error.message || (this.translations.invitationResendFailed || 'Failed to resend invitation'));
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

            const translations = window.staffTranslations || {};

            // Clear existing options
            staffSelect.innerHTML = `<option value="">${translations.selectStaffMember || 'Select a staff member'}</option>`;

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
