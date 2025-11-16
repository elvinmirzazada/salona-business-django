/**
 * Membership Plans Manager
 * Handles fetching and displaying membership plans
 */

class MembershipPlansManager {
    constructor() {
        this.plansContainer = document.getElementById('plans-container');
        this.loadingContainer = document.getElementById('plans-loading');
        this.errorContainer = document.getElementById('plans-error');
        this.emptyContainer = document.getElementById('plans-empty');
        this.activePlanSection = document.getElementById('active-plan-section');
        this.activePlanDetails = document.getElementById('active-plan-details');
        this.translations = window.membershipTranslations || {};
    }

    /**
     * Initialize the membership plans page
     */
    async init() {
        try {
            // Check for active plan first
            if (window.activePlan) {
                this.renderActivePlan(window.activePlan);
            }

            await this.loadMembershipPlans();
        } catch (error) {
            console.error('Error initializing membership plans:', error);
            this.showError();
        }
    }

    /**
     * Render active plan section
     */
    renderActivePlan(activePlanData) {
        // Handle nested structure - the plan details are in membership_plan
        const plan = activePlanData.membership_plan;
        const subscription = activePlanData;

        const priceFormatted = this.formatPrice(plan.price);
        const durationText = this.formatDuration(plan.duration_days);
        const startDate = new Date(subscription.start_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const endDate = new Date(subscription.end_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        this.activePlanDetails.innerHTML = `
            <div class="active-plan-info">
                <div class="active-plan-item">
                    <label>${this.translations.planName || 'Plan Name'}</label>
                    <strong>${this.escapeHtml(plan.name)}</strong>
                </div>
                <div class="active-plan-item">
                    <label>${this.translations.planType || 'Plan Type'}</label>
                    <strong>${this.escapeHtml(plan.plan_type).toUpperCase()}</strong>
                </div>
                <div class="active-plan-item">
                    <label>${this.translations.price || 'Price'}</label>
                    <strong>$${priceFormatted} / ${durationText}</strong>
                </div>
                <div class="active-plan-item">
                    <label>${this.translations.status || 'Status'}</label>
                    <strong style="color: #ffffff;">${this.escapeHtml(subscription.status).toUpperCase()}</strong>
                </div>
                <div class="active-plan-item">
                    <label>${this.translations.startDate || 'Start Date'}</label>
                    <strong>${startDate}</strong>
                </div>
                <div class="active-plan-item">
                    <label>${this.translations.endDate || 'End Date'}</label>
                    <strong>${endDate}</strong>
                </div>
                <div class="active-plan-item">
                    <label>${this.translations.autoRenew || 'Auto Renew'}</label>
                    <strong style="color: ${subscription.auto_renew ? '#ffffff' : '#ef4444'};">
                        ${subscription.auto_renew ? (this.translations.yes || 'YES') : (this.translations.no || 'NO')}
                    </strong>
                </div>
            </div>
        `;

        this.activePlanSection.style.display = 'block';
    }

    /**
     * Fetch membership plans from API
     */
    async loadMembershipPlans() {
        try {
            this.showLoading();
            let plans = window.membershipPlans || [];

            if (plans.length === 0) {
                this.showEmpty();
            } else {
                this.renderPlans(plans);
            }

        } catch (error) {
            console.error('Error loading membership plans:', error);
            this.showError();
        }
    }

    /**
     * Render membership plans
     */
    renderPlans(plans) {
        this.plansContainer.innerHTML = '';

        // Sort plans by price
        const sortedPlans = plans.sort((a, b) => a.price - b.price);

        // Check if there's an active plan to disable its button
        // The active plan ID is in membership_plan_id field
        const activePlanId = window.activePlan ? window.activePlan.membership_plan_id : null;

        sortedPlans.forEach((plan, index) => {
            const isActive = activePlanId === plan.id;
            const planCard = this.createPlanCard(plan, index === 1, isActive); // Middle plan is featured
            this.plansContainer.appendChild(planCard);
        });

        this.showPlans();
    }

    /**
     * Create a plan card element
     */
    createPlanCard(plan, isFeatured = false, isActive = false) {
        const card = document.createElement('div');
        card.className = `plan-card ${isFeatured ? 'featured' : ''} ${isActive ? 'active' : ''}`;
        card.dataset.planId = plan.id;

        const planTypeClass = plan.plan_type.toLowerCase();
        const priceFormatted = this.formatPrice(plan.price);
        const durationText = this.formatDuration(plan.duration_days);

        const buttonText = isActive ?
            (this.translations.currentPlan || 'Current Plan') :
            (this.translations.choosePlan || 'Choose Plan');
        const buttonClass = isActive ? 'secondary' : (isFeatured ? 'primary' : 'secondary');
        const buttonDisabled = isActive ? 'disabled' : '';

        card.innerHTML = `
            <div class="plan-header">
                <h3 class="plan-name">${this.escapeHtml(plan.name)}</h3>
                <span class="plan-type ${planTypeClass}">${this.escapeHtml(plan.plan_type)}</span>
            </div>

            <div class="plan-price">
                <span class="price-amount">
                    <span class="price-currency">$</span>${priceFormatted}
                </span>
                <span class="price-period">${this.translations.per || 'per'} ${durationText}</span>
            </div>

            <p class="plan-description">${this.escapeHtml(plan.description)}</p>

            <ul class="plan-features">
                ${this.generateFeatures(plan)}
            </ul>

            <div class="plan-action">
                <button class="plan-button ${buttonClass}" 
                        ${buttonDisabled}
                        onclick="membershipPlansManager.subscribeToPlan('${plan.id}', '${this.escapeHtml(plan.url)}')">
                    <i class="fas ${isActive ? 'fa-check' : 'fa-crown'}"></i> ${buttonText}
                </button>
            </div>
        `;

        return card;
    }

    /**
     * Generate features list based on plan type
     */
    generateFeatures(plan) {
        const commonFeatures = [
            this.translations.accessToBookingSystem || 'Access to booking system',
            this.translations.customerManagement || 'Customer management',
            this.translations.basicAnalytics || 'Basic analytics',
        ];

        const premiumFeatures = [
            this.translations.advancedAnalytics || 'Advanced analytics',
            this.translations.prioritySupport || 'Priority support',
            this.translations.customBranding || 'Custom branding',
        ];

        const vipFeatures = [
            this.translations.unlimitedBookings || 'Unlimited bookings',
            this.translations.dedicatedSupport || 'Dedicated support',
            this.translations.apiAccess || 'API access',
            this.translations.whiteLabelSolution || 'White-label solution',
        ];

        let features = [...commonFeatures];

        if (plan.plan_type.toLowerCase() === 'premium') {
            features = [...features, ...premiumFeatures];
        } else if (plan.plan_type.toLowerCase() === 'vip') {
            features = [...features, ...premiumFeatures, ...vipFeatures];
        }

        return features.map(feature => `
            <li>
                <i class="fas fa-check-circle"></i>
                <span>${feature}</span>
            </li>
        `).join('');
    }

    /**
     * Subscribe to a membership plan
     */
    async subscribeToPlan(planId, paymentUrl) {
        try {
            // Show loading state on the button
            const button = event.target.closest('button');
            const originalButtonText = button.innerHTML;
            button.disabled = true;
            button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${this.translations.processing || 'Processing...'}`;

            // Get CSRF token from cookie
            const csrfToken = this.getCsrfToken();

            // Create checkout session via Django endpoint
            const response = await fetch('/users/membership-plans/', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRFToken': csrfToken
                },
                body: JSON.stringify({ plan_id: planId })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data && data.url) {
                // Redirect to the checkout URL
                window.open(data.url, '_blank');
            } else {
                throw new Error('No checkout URL received');
            }

        } catch (error) {
            console.error('Error creating checkout session:', error);

            // Restore button state
            const button = event.target.closest('button');
            button.disabled = false;
            button.innerHTML = `<i class="fas fa-crown"></i> ${this.translations.choosePlan || 'Choose Plan'}`;

            // Show error message
            alert(this.translations.errorCheckout || 'Failed to start checkout process. Please try again or contact support.');
        }
    }

    /**
     * Get CSRF token from cookie
     */
    getCsrfToken() {
        const name = 'csrftoken';
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
    }

    /**
     * Format price
     */
    formatPrice(price) {
        // Convert cents to dollars
        const dollars = price / 100;
        return dollars.toFixed(2);
    }

    /**
     * Format duration
     */
    formatDuration(days) {
        if (days === 30 || days === 31) {
            return this.translations.month || 'month';
        } else if (days === 365 || days === 366) {
            return this.translations.year || 'year';
        } else if (days === 7) {
            return this.translations.week || 'week';
        } else {
            return `${days} ${this.translations.days || 'days'}`;
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Show loading state
     */
    showLoading() {
        this.loadingContainer.style.display = 'flex';
        this.plansContainer.style.display = 'none';
        this.errorContainer.style.display = 'none';
        this.emptyContainer.style.display = 'none';
    }

    /**
     * Show plans
     */
    showPlans() {
        this.loadingContainer.style.display = 'none';
        this.plansContainer.style.display = 'grid';
        this.errorContainer.style.display = 'none';
        this.emptyContainer.style.display = 'none';
    }

    /**
     * Show error state
     */
    showError() {
        this.loadingContainer.style.display = 'none';
        this.plansContainer.style.display = 'none';
        this.errorContainer.style.display = 'block';
        this.emptyContainer.style.display = 'none';
    }

    /**
     * Show empty state
     */
    showEmpty() {
        this.loadingContainer.style.display = 'none';
        this.plansContainer.style.display = 'none';
        this.errorContainer.style.display = 'none';
        this.emptyContainer.style.display = 'block';
    }
}

// Initialize when DOM is ready
const membershipPlansManager = new MembershipPlansManager();
document.addEventListener('DOMContentLoaded', () => {
    membershipPlansManager.init();
});
