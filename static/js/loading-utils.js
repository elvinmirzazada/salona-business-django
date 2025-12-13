/**
 * Global Loading Utility
 * Provides a reusable loading overlay for async operations across all pages
 */

const LoadingUtils = (() => {
    const overlayId = 'operation-loading-overlay';
    const textId = 'operation-loading-text';

    /**
     * Initialize the loading overlay if it doesn't exist
     * This ensures the overlay is available even if not in the HTML
     */
    const ensureOverlayExists = () => {
        let overlay = document.getElementById(overlayId);

        if (!overlay) {
            // Create the overlay dynamically
            overlay = document.createElement('div');
            overlay.id = overlayId;
            overlay.className = 'operation-loading-overlay';
            overlay.style.display = 'none';

            overlay.innerHTML = `
                <div class="operation-loading-content">
                    <div class="operation-spinner"></div>
                    <p id="${textId}" class="operation-loading-text">Processing...</p>
                </div>
            `;

            document.body.appendChild(overlay);
        }

        return overlay;
    };

    /**
     * Show the loading overlay with optional custom message
     * @param {string} message - The loading message to display (default: "Processing...")
     */
    const show = (message = 'Processing...') => {
        const overlay = ensureOverlayExists();
        const textElement = document.getElementById(textId);

        if (textElement) {
            textElement.textContent = message;
        }

        overlay.style.display = 'flex';

        // Prevent body scroll when loading is visible
        document.body.style.overflow = 'hidden';
    };

    /**
     * Hide the loading overlay
     */
    const hide = () => {
        const overlay = document.getElementById(overlayId);

        if (overlay) {
            overlay.style.display = 'none';
        }

        // Restore body scroll
        document.body.style.overflow = '';
    };

    /**
     * Wrap an async function with loading indicator
     * @param {Function} asyncFn - The async function to execute
     * @param {string} loadingMessage - The message to show while loading
     * @returns {Promise} - The result of the async function
     */
    const wrapAsync = async (asyncFn, loadingMessage = 'Processing...') => {
        try {
            show(loadingMessage);
            return await asyncFn();
        } finally {
            hide();
        }
    };

    // Expose public methods
    return {
        show,
        hide,
        wrapAsync,
        // Aliases for convenience
        showLoading: show,
        hideLoading: hide
    };
})();

// Export to global window object
if (typeof window !== 'undefined') {
    window.LoadingUtils = LoadingUtils;
    window.showLoading = LoadingUtils.show;
    window.hideLoading = LoadingUtils.hide;
}

