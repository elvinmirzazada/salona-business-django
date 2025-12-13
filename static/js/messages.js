// Global message utility - exposes showMessage and showError to the window
(function () {
    const containerId = 'global-message-container';
    const messageId = 'global-message';
    const messageTextId = 'global-message-text';
    const closeId = 'global-message-close';

    function getElements() {
        const container = document.getElementById(containerId);
        const message = document.getElementById(messageId);
        const text = document.getElementById(messageTextId);
        const close = document.getElementById(closeId);
        return { container, message, text, close };
    }

    function hide() {
        const { message } = getElements();
        if (!message) return;
        message.classList.remove('active');
        message.style.display = 'none';
    }

    function show(messageStr, type = 'success', timeout = 4000) {
        const { message, text, close } = getElements();
        if (!message || !text) {
            // If DOM isn't present, fallback to console/alert
            if (type === 'error') {
                console.error(messageStr);
                try { alert(messageStr); } catch (e) {}
            } else {
                console.log(messageStr);
                try { alert(messageStr); } catch (e) {}
            }
            return;
        }

        text.textContent = messageStr;

        message.classList.remove('success', 'error');
        message.classList.add(type === 'error' ? 'error' : 'success');
        message.style.display = 'flex';

        // Close button handler
        if (close) {
            close.onclick = () => hide();
        }

        // Auto hide after timeout
        if (timeout && timeout > 0) {
            clearTimeout(message._hideTimer);
            message._hideTimer = setTimeout(hide, timeout);
        }
    }

    // Expose globally
    window.showMessage = function (msg, timeout) { show(msg, 'success', timeout); };
    window.showError = function (msg, timeout) { show(msg, 'error', timeout); };

})();

