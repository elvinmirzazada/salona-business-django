/**
 * Accept Invitation Handler
 * Handles the invitation acceptance flow for new and existing users
 */

class InvitationHandler {
    constructor() {
        this.token = null;
        this.translations = window.invitationTranslations || {};
    }

    /**
     * Initialize the handler
     */
    async init() {
        try {
            // Get token from URL parameters
            const params = new URLSearchParams(window.location.search);
            this.token = params.get('token');

            if (!this.token) {
                this.showError(
                    this.translations.invalidToken || 'Invalid Invitation',
                    this.translations.invalidTokenMsg || 'The invitation token is invalid or missing.'
                );
                return;
            }

            // Show loading state
            this.showLoading();

            // Check and validate invitation
            await this.checkAndValidateInvitation();

        } catch (error) {
            console.error('Failed to initialize invitation handler:', error);
            this.showError(
                this.translations.acceptanceError || 'Acceptance Error',
                this.translations.acceptanceErrorMsg || 'Failed to accept the invitation.'
            );
        }
    }

    /**
     * Check and validate invitation
     */
    async checkAndValidateInvitation() {
        try {
            const response = await window.api.checkInvitation(this.token);

            if (!response || !response.data) {
                this.showError(
                    this.translations.acceptanceError || 'Acceptance Error',
                    this.translations.acceptanceErrorMsg || 'Failed to accept the invitation.'
                );
                return;
            }

            const status = response.data.status;

            console.log('Invitation status:', status);

            switch (status) {
                case 'user_exists':
                    await this.handleUserExists();
                    break;
                case 'user_not_found':
                    this.handleUserNotFound(response.data.email);
                    break;
                case 'invitation_expired':
                    this.showError(
                        this.translations.invitationExpired || 'Invitation Expired',
                        this.translations.invitationExpiredMsg || 'This invitation has expired.'
                    );
                    break;
                case 'already_member':
                    this.showInfo(
                        this.translations.alreadyMember || 'Already a Member',
                        this.translations.alreadyMemberMsg || 'You are already a member of this company.'
                    );
                    // Redirect after 2 seconds
                    setTimeout(() => {
                        window.location.href = '/users/dashboard/';
                    }, 2000);
                    break;
                default:
                    this.showError(
                        this.translations.acceptanceError || 'Acceptance Error',
                        this.translations.acceptanceErrorMsg || 'Failed to accept the invitation.'
                    );
            }

        } catch (error) {
            console.error('Failed to check invitation:', error);
            this.showError(
                this.translations.acceptanceError || 'Acceptance Error',
                error.message || (this.translations.acceptanceErrorMsg || 'Failed to accept the invitation.')
            );
        }
    }

    /**
     * Handle user exists - accept invitation directly
     */
    async handleUserExists() {
        try {
            this.hideLoading();
            this.showLoading(); // Show loading with "Accepting invitation..." message

            const response = await window.api.acceptInvitation({
                token: this.token
            });

            if (response && response.success !== false) {
                this.hideLoading();
                this.showSuccess();

                // Redirect to dashboard after 2 seconds
                setTimeout(() => {
                    window.location.href = '/users/dashboard/';
                }, 2000);
            } else {
                throw new Error(response?.message || 'Failed to accept invitation');
            }

        } catch (error) {
            console.error('Failed to accept invitation:', error);
            this.showError(
                this.translations.acceptanceError || 'Acceptance Error',
                error.message || (this.translations.acceptanceErrorMsg || 'Failed to accept the invitation.')
            );
        }
    }

    /**
     * Handle user not found - redirect to signup with token
     */
    handleUserNotFound(email) {
        this.hideLoading();
        // Redirect to signup page with invitation token as query parameter
        window.location.href = `/users/signup/?invitation_token=${this.token}&email=${encodeURIComponent(email)}`;
    }

    /**
     * Setup signup form event handlers
     */
    setupSignupFormHandlers() {
        const form = document.getElementById('signup-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSignupSubmit();
            });
        }
    }

    /**
     * Handle signup form submission
     */
    async handleSignupSubmit() {
        try {
            const firstNameInput = document.getElementById('first_name');
            const lastNameInput = document.getElementById('last_name');
            const phoneInput = document.getElementById('phone');
            const passwordInput = document.getElementById('password');
            const passwordConfirmInput = document.getElementById('password_confirm');

            if (!firstNameInput || !lastNameInput || !passwordInput || !passwordConfirmInput) {
                this.showSignupError(this.translations.fillRequiredFields || 'Please fill in all required fields');
                return;
            }

            const firstName = firstNameInput.value.trim();
            const lastName = lastNameInput.value.trim();
            const phone = phoneInput.value.trim();
            const password = passwordInput.value;
            const passwordConfirm = passwordConfirmInput.value;

            // Validate required fields
            if (!firstName || !lastName || !password) {
                this.showSignupError(this.translations.fillRequiredFields || 'Please fill in all required fields');
                return;
            }

            // Validate password match
            if (password !== passwordConfirm) {
                this.showSignupError(this.translations.passwordMismatch || 'Passwords do not match');
                return;
            }

            // Disable submit button
            const submitBtn = document.querySelector('#signup-form button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = this.translations.acceptingInvitation || 'Accepting invitation...';
            }

            // Accept invitation with signup data
            const response = await window.api.acceptInvitationWithSignup({
                token: this.token,
                first_name: firstName,
                last_name: lastName,
                phone: phone || undefined,
                password: password
            });

            if (response && response.success !== false) {
                this.hideSignupForm();
                this.showSuccess();

                // Redirect to dashboard after 2 seconds
                setTimeout(() => {
                    window.location.href = '/users/dashboard/';
                }, 2000);
            } else {
                throw new Error(response?.message || 'Failed to accept invitation');
            }

        } catch (error) {
            console.error('Failed to submit signup:', error);
            this.showSignupError(error.message || (this.translations.signupError || 'Signup failed'));

            // Re-enable submit button
            const submitBtn = document.querySelector('#signup-form button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = this.translations.acceptingInvitation || 'Accepting invitation...';
            }
        }
    }

    /**
     * Show loading state
     */
    showLoading() {
        this.hideAll();
        const loadingState = document.getElementById('loading-state');
        if (loadingState) {
            loadingState.style.display = 'block';
        }
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        const loadingState = document.getElementById('loading-state');
        if (loadingState) {
            loadingState.style.display = 'none';
        }
    }

    /**
     * Show error state
     */
    showError(title, message) {
        this.hideAll();
        const errorState = document.getElementById('error-state');
        const errorTitle = document.getElementById('error-title');
        const errorMessage = document.getElementById('error-message');

        if (errorTitle) errorTitle.textContent = title;
        if (errorMessage) errorMessage.textContent = message;
        if (errorState) errorState.style.display = 'block';
    }

    /**
     * Show info state
     */
    showInfo(title, message) {
        this.hideAll();
        const infoState = document.getElementById('info-state');
        const infoTitle = document.getElementById('info-title');
        const infoMessage = document.getElementById('info-message');

        if (infoTitle) infoTitle.textContent = title;
        if (infoMessage) infoMessage.textContent = message;
        if (infoState) infoState.style.display = 'block';
    }

    /**
     * Show success state
     */
    showSuccess() {
        this.hideAll();
        const successState = document.getElementById('success-state');
        if (successState) {
            successState.style.display = 'block';
        }
    }

    /**
     * Show signup form
     */
    showSignupForm() {
        this.hideAll();
        const signupState = document.getElementById('signup-state');
        if (signupState) {
            signupState.style.display = 'block';
        }
    }

    /**
     * Hide signup form
     */
    hideSignupForm() {
        const signupState = document.getElementById('signup-state');
        if (signupState) {
            signupState.style.display = 'none';
        }
    }

    /**
     * Show signup error
     */
    showSignupError(message) {
        const alertContainer = document.getElementById('signup-alert-container');
        if (!alertContainer) return;

        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert alert-error';
        alertDiv.textContent = message;
        alertDiv.style.cssText = 'padding: 1rem; background-color: #fed7d7; color: #c53030; border-radius: 0.375rem; margin-bottom: 1rem;';

        alertContainer.innerHTML = '';
        alertContainer.appendChild(alertDiv);
    }

    /**
     * Hide all states
     */
    hideAll() {
        const states = [
            'loading-state',
            'error-state',
            'info-state',
            'success-state',
            'signup-state'
        ];

        states.forEach(stateId => {
            const element = document.getElementById(stateId);
            if (element) {
                element.style.display = 'none';
            }
        });
    }
}

// Create global instance and initialize when DOM is ready
const invitationHandler = new InvitationHandler();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => invitationHandler.init());
} else {
    invitationHandler.init();
}
