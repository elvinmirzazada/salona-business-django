/**
 * Staff Manager - Handles staff CRUD operations with DataTables
 * Uses API client for all backend communication
 */

class StaffManager {
    constructor() {
        this.staff = [];
        this.invitations = [];
        this.currentEditingId = null;
        this.currentDeletingId = null;
        this.staffTable = null;
        this.invitationsTable = null;
    }

    /**
     * Get translations with fallback defaults
     */
    get translations() {
        return window.staffTranslations || {
            active: 'Active',
            inactive: 'Inactive',
            edit: 'Edit',
            delete: 'Delete',
            resend: 'Resend',
            addStaffMember: 'Add Staff Member',
            editStaffMember: 'Edit Staff Member',
            updateStaffMember: 'Update Staff Member',
            inviteTeamMember: 'Invite team member',
            saving: 'Saving...',
            fillRequiredFields: 'Please fill in all required fields',
            staffUpdatedSuccess: 'Staff member updated successfully',
            staffUpdateFailed: 'Failed to update staff member',
            staffAddedSuccess: 'Staff member added successfully',
            staffAddFailed: 'Failed to create staff member',
            invitationSentSuccess: 'Invitation sent successfully',
            invitationFailed: 'Failed to send invitation',
            invitationResentSuccess: 'Invitation resent successfully',
            invitationResendFailed: 'Failed to resend invitation',
            staffDeletedSuccess: 'Staff member deleted successfully',
            staffDeleteFailed: 'Failed to delete staff member',
            staffNotFound: 'Staff member not found',
            failedToSave: 'Failed to save staff member',
            selectStaffMember: 'Select a staff member',
            pending: 'Pending',
            accepted: 'Accepted',
            declined: 'Declined',
            expired: 'Expired',
            confirmDeleteInvitation: 'Are you sure you want to delete this invitation?',
            invitationDeletedSuccess: 'Invitation deleted successfully',
            invitationDeleteFailed: 'Failed to delete invitation',
            staff: 'Staff',
            manager: 'Manager',
            admin: 'Admin',
            owner: 'Owner'
        };
    }

    /**
     * Initialize the staff manager
     */
    async init() {
        try {
            this.setupEventListeners();
            this.initializeStaffDataTable();
            this.initializeInvitationsDataTable();
        } catch (error) {
            console.error('Failed to initialize staff manager:', error);
            this.showError('Failed to load staff data');
        }
    }

    /**
     * Initialize DataTable for staff
     */
    initializeStaffDataTable() {
        const self = this;

        this.staffTable = $('#staff-table').DataTable({
            ajax: {
                url: '/users/api/v1/companies/users',
                type: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                dataSrc: function(json) {
                    // Handle the API response format
                    if (json && json.data) {
                        self.staff = json.data;
                        return json.data;
                    }
                    return [];
                },
                error: function(xhr, error, code) {
                    console.error('Failed to load staff data:', error);
                    self.showError('Failed to load staff data');
                }
            },
            columns: [
                {
                    data: null,
                    render: function(data, type, row) {
                        const firstName = row.user?.first_name || '';
                        const lastName = row.user?.last_name || '';
                        return `${firstName} ${lastName}`.trim() || '-';
                    }
                },
                {
                    data: null,
                    render: function(data, type, row) {
                        return row.user?.email || '-';
                    }
                },
                {
                    data: null,
                    render: function(data, type, row) {
                        return row.user?.phone || '-';
                    }
                },
                {
                    data: 'role',
                    render: function(data, type, row) {
                        return self.translateRole(data || 'staff');
                    }
                },
                {
                    data: 'status',
                    render: function(data, type, row) {
                        const statusClass = data === 'active' ? 'status-active' : 'status-inactive';
                        const statusText = data === 'active' ? self.translations.active : self.translations.inactive;
                        return `<span class="${statusClass}">${statusText}</span>`;
                    }
                },
                {
                    data: null,
                    orderable: false,
                    render: function(data, type, row) {
                        if (window.userData && (window.userData.role === 'owner' || window.userData.role === 'admin')) {
                            return `
                                <div class="actions-cell">
                                    <button class="action-btn edit-btn" onclick="staffManager.openEditModal('${row.user.id}')" title="${self.translations.edit}">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="action-btn delete-btn" onclick="staffManager.openDeleteModal('${row.user.id}')" title="${self.translations.delete}">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            `;
                        } else {
                            return `
                                <div class="actions-cell">
                                    <span class="view-only-icon" title="View only - Contact administrator for edit permissions" style="color: #9CA3AF; font-size: 14px;">
                                        <i class="fas fa-eye"></i>
                                    </span>
                                </div>
                            `;
                        }
                    }
                }
            ],
            responsive: true,
            pageLength: 10,
            lengthChange: true,
            searching: true,
            ordering: true,
            // info: true,
            autoWidth: true,
            scrollResize: true,
            scrollY: 'auto',
            language: {
                emptyTable: window.userData && (window.userData.role === 'owner' || window.userData.role === 'admin')
                    ? 'No staff members found. Click "Invite team member" to add your first staff member.'
                    : 'Insufficient privileges. Please contact your administrator.',
                loadingRecords: 'Loading staff data...',
                processing: 'Processing...',
                search: 'Search staff:',
                lengthMenu: 'Show _MENU_ entries',
                info: 'Showing _START_ to _END_ of _TOTAL_ staff members',
                infoEmpty: 'Showing 0 to 0 of 0 staff members',
                infoFiltered: '(filtered from _MAX_ total staff members)',
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
                // Hide loading state and empty state when table is drawn
                $('#staff-loading').hide();
                $('#staff-empty').hide();
                $('#staff-table-container').show();
            }
        });
    }

    /**
     * Initialize DataTable for invitations
     */
    initializeInvitationsDataTable() {
        const self = this;

        this.invitationsTable = $('#invitations-table').DataTable({
            ajax: {
                url: '/users/api/v1/companies/all/invitations',
                type: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                dataSrc: function(json) {
                    if (json && json.data) {
                        self.invitations = json.data;
                        return json.data;
                    }
                    return [];
                },
                error: function(xhr, error, code) {
                    console.error('Failed to load invitations data:', error);
                    self.showError('Failed to load invitations data');
                }
            },
            columns: [
                {
                    data: 'email',
                    render: function(data, type, row) {
                        return data || '-';
                    }
                },
                {
                    data: 'role',
                    render: function(data, type, row) {
                        return self.translateRole(data || 'staff');
                    }
                },
                {
                    data: 'created_at',
                    render: function(data, type, row) {
                        if (data) {
                            return new Date(data).toLocaleDateString();
                        }
                        return '-';
                    }
                },
                {
                    data: 'status',
                    render: function(data, type, row) {
                        const statusClass = `invitation-status-${data}`;
                        return `<span class="${statusClass}">${self.translateInvitationStatus(data)}</span>`;
                    }
                },
                {
                    data: null,
                    orderable: false,
                    render: function(data, type, row) {
                        if (window.userData && (window.userData.role === 'owner' || window.userData.role === 'admin')) {
                            let actions = '';
                            if (row.status === 'pending') {
                                actions += `
                                    <button class="action-btn resend-btn" onclick="staffManager.resendInvitation('${row.id}')" title="${self.translations.resend}">
                                        <i class="fas fa-paper-plane"></i>
                                    </button>
                                `;
                            }
                            actions += `
                                <button class="action-btn delete-btn" onclick="staffManager.deleteInvitation('${row.id}')" title="${self.translations.delete}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            `;
                            return `<div class="actions-cell">${actions}</div>`;
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
            info: true,
            autoWidth: false,
            scrollResize: true,
            scrollY: 'auto',
            language: {
                emptyTable: 'No pending invitations. All team members have been accepted or invitations have expired.',
                loadingRecords: 'Loading invitations...',
                processing: 'Processing...',
                search: 'Search invitations:',
                lengthMenu: 'Show _MENU_ entries',
                info: 'Showing _START_ to _END_ of _TOTAL_ invitations',
                infoEmpty: 'Showing 0 to 0 of 0 invitations',
                infoFiltered: '(filtered from _MAX_ total invitations)',
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
                const api = this.api();
                if (api.rows().count() === 0) {
                    $('#invitations-empty').show();
                    $('#invitations-table-container').hide();
                } else {
                    $('#invitations-empty').hide();
                    $('#invitations-table-container').show();
                }
            }
        });
    }

    /**
     * Refresh staff table
     */
    refreshStaffTable() {
        if (this.staffTable) {
            this.staffTable.ajax.reload();
        }
    }

    /**
     * Refresh invitations table
     */
    refreshInvitationsTable() {
        if (this.invitationsTable) {
            this.invitationsTable.ajax.reload();
        }
    }

    /**
     * Load staff data from API (legacy method for compatibility)
     */
    async loadStaff() {
        this.refreshStaffTable();
    }

    /**
     * Load invitations data from API (legacy method for compatibility)
     */
    async loadInvitations() {
        this.refreshInvitationsTable();
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
    // renderStaffTable() {
    //     const tbody = document.getElementById('staff-tbody');
    //     const tableContainer = document.getElementById('staff-table-container');
    //     const emptyState = document.getElementById('staff-empty');
    //
    //     if (!tbody) return;
    //
    //     // Check if we have staff
    //     if (!this.staff || this.staff.length === 0) {
    //         if (tableContainer) tableContainer.style.display = 'none';
    //         if (emptyState) emptyState.style.display = 'block';
    //         return;
    //     }
    //
    //     // Show table, hide empty state
    //     if (tableContainer) tableContainer.style.display = 'block';
    //     if (emptyState) emptyState.style.display = 'none';
    //
    //     // Render staff rows
    //     tbody.innerHTML = this.staff.map(staff => {
    //         const statusClass = staff.status === 'active' ? 'status-active' : 'status-inactive';
    //         const statusText = staff.status === 'active' ? this.translations.active : this.translations.inactive;
    //
    //         return `
    //             <tr data-staff-id="${staff.user.id}">
    //                 <td>${staff.user.first_name || ''} ${staff.user.last_name || ''}</td>
    //                 <td>${staff.user.email || '-'}</td>
    //                 <td>${staff.user.phone || '-'}</td>
    //                 <td>${this.translateRole(staff.role || 'staff')}</td>
    //                 <td>
    //                     <span class="${statusClass}">
    //                         ${statusText}
    //                     </span>
    //                 </td>
    //                 <td class="actions-cell">
    //                     ${window.userData && (window.userData.role === 'owner' || window.userData.role === 'admin') ? `
    //                         <button class="action-btn edit-btn" onclick="staffManager.openEditModal('${staff.user.id}')" title="${this.translations.edit}">
    //                             <i class="fas fa-edit"></i>
    //                         </button>
    //                         <button class="action-btn delete-btn" onclick="staffManager.openDeleteModal('${staff.user.id}')" title="${this.translations.delete}">
    //                             <i class="fas fa-trash"></i>
    //                         </button>
    //                     ` : `
    //                         <span class="view-only-icon" title="View only - Contact administrator for edit permissions" style="color: #9CA3AF; font-size: 14px;">
    //                             <i class="fas fa-eye"></i>
    //                         </span>
    //                     `}
    //                 </td>
    //             </tr>
    //         `;
    //     }).join('');
    // }

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

        // Setup availability day toggles
        this.setupAvailabilityListeners();
    }

    /**
     * Setup availability listeners for day toggles
     */
    setupAvailabilityListeners() {
        const dayToggles = document.querySelectorAll('.day-toggle');
        dayToggles.forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const day = e.target.id.split('-')[1];
                const startTime = document.querySelector(`.start-time[data-day="${day}"]`);
                const endTime = document.querySelector(`.end-time[data-day="${day}"]`);

                if (e.target.checked) {
                    if (startTime) startTime.disabled = false;
                    if (endTime) endTime.disabled = false;
                } else {
                    if (startTime) startTime.disabled = true;
                    if (endTime) endTime.disabled = true;
                }
            });
        });
    }

    /**
     * Collect availability data from form
     */
    collectAvailabilityData() {
        const availabilities = [];

        for (let day = 0; day < 7; day++) {
            const dayToggle = document.getElementById(`day-${day}-enabled`);
            const startTimeInput = document.querySelector(`.start-time[data-day="${day}"]`);
            const endTimeInput = document.querySelector(`.end-time[data-day="${day}"]`);

            if (dayToggle && startTimeInput && endTimeInput) {
                const isAvailable = dayToggle.checked;

                availabilities.push({
                    day_of_week: day,
                    start_time: startTimeInput.value || '09:00',
                    end_time: endTimeInput.value || '17:00',
                    is_available: isAvailable
                });
            }
        }

        return availabilities;
    }

    /**
     * Populate availability data in form
     */
    populateAvailabilityData(availabilities) {
        // Reset all days first
        this.resetAvailabilityFields();

        if (!availabilities || availabilities.length === 0) {
            return;
        }

        availabilities.forEach(avail => {
            const day = avail.day_of_week;
            const dayToggle = document.getElementById(`day-${day}-enabled`);
            const startTimeInput = document.querySelector(`.start-time[data-day="${day}"]`);
            const endTimeInput = document.querySelector(`.end-time[data-day="${day}"]`);

            if (dayToggle && startTimeInput && endTimeInput) {
                dayToggle.checked = avail.is_available;
                startTimeInput.value = avail.start_time;
                endTimeInput.value = avail.end_time;
                startTimeInput.disabled = !avail.is_available;
                endTimeInput.disabled = !avail.is_available;
            }
        });
    }

    /**
     * Reset availability fields to default
     */
    resetAvailabilityFields() {
        // Default working hours: Monday-Friday 9-5, Saturday-Sunday off
        const defaults = [
            { day: 0, enabled: true, start: '09:00', end: '17:00' },  // Monday
            { day: 1, enabled: true, start: '09:00', end: '17:00' },  // Tuesday
            { day: 2, enabled: true, start: '09:00', end: '17:00' },  // Wednesday
            { day: 3, enabled: true, start: '09:00', end: '17:00' },  // Thursday
            { day: 4, enabled: true, start: '09:00', end: '17:00' },  // Friday
            { day: 5, enabled: false, start: '10:00', end: '14:00' }, // Saturday
            { day: 6, enabled: false, start: '10:00', end: '14:00' }  // Sunday
        ];

        defaults.forEach(def => {
            const dayToggle = document.getElementById(`day-${def.day}-enabled`);
            const startTimeInput = document.querySelector(`.start-time[data-day="${def.day}"]`);
            const endTimeInput = document.querySelector(`.end-time[data-day="${def.day}"]`);

            if (dayToggle && startTimeInput && endTimeInput) {
                dayToggle.checked = def.enabled;
                startTimeInput.value = def.start;
                endTimeInput.value = def.end;
                startTimeInput.disabled = !def.enabled;
                endTimeInput.disabled = !def.enabled;
            }
        });
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

        // Reset availability to defaults
        this.resetAvailabilityFields();

        this.currentEditingId = null;
        modal.style.display = 'block';
    }

    /**
     * Open edit staff modal
     */
    openEditModal(staffId) {
        const staff = this.staff.find(s => s.user.id === staffId);
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

        // Populate availability data
        if (staff.user.availabilities && staff.user.availabilities.length > 0) {
            this.populateAvailabilityData(staff.user.availabilities);
        } else {
            this.resetAvailabilityFields();
        }

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
            
            // Collect availability data
            const availabilities = this.collectAvailabilityData();

            // Only handle invitations (no updates)
            if (this.currentEditingId) {
                // Update existing staff role and availability
                const updateData = {
                    role: formData.role,
                    availabilities: availabilities
                };
                const response = await window.api.updateStaff(this.currentEditingId, updateData);

                if (response && response.success !== false) {
                    this.showSuccess(this.translations.staffUpdatedSuccess || 'Staff member updated successfully');

                    // Refresh the DataTable to show updated data
                    this.refreshStaffTable();
                } else {
                    throw new Error(response?.message || (this.translations.staffUpdateFailed || 'Failed to update staff member'));
                }
            } else {
                // Send invitation to new member with availability
                formData.availabilities = availabilities;
                const response = await window.api.sendInvitation(formData);

                if (response && response.success !== false) {
                    this.showSuccess(this.translations.invitationSentSuccess || 'Invitation sent successfully');

                    // Refresh both tables to show updated data
                    this.refreshStaffTable();
                    this.refreshInvitationsTable();
                } else {
                    throw new Error(response?.message || (this.translations.invitationFailed || 'Failed to send invitation'));
                }
            }

            this.closeModal();

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
        const staff = this.staff.find(s => s.user.id === staffId);
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

                // Refresh the DataTable to show updated data
                this.refreshStaffTable();
                this.closeDeleteModal();
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

                // Refresh the invitations DataTable
                this.refreshInvitationsTable();
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

                // Refresh the invitations DataTable
                this.refreshInvitationsTable();
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
            // Check if we have cached staff data from the initial page load
            let staffData;
            if (window.staff_data && Array.isArray(window.staff_data) && window.staff_data.length > 0) {
                staffData = window.staff_data;
                console.log('Using cached staff data for booking form');
            } else {
                // Only fetch from API if we don't have cached data
                const response = await window.api.getStaff();

                if (!response || !response.data) {
                    console.warn('No staff data received');
                    return;
                }

                staffData = response.data;
                // Update the global cache
                window.staff_data = staffData;
            }

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
