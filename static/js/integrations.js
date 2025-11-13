// Tab switching functionality
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all tabs and contents
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        // Add active class to clicked tab and corresponding content
        button.classList.add('active');
        const tabId = button.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');

        // Load Telegram config when switching to that tab
        if (tabId === 'telegram-bot') {
            loadTelegramConfig();
        }
    });
});

// Copy booking URL functionality
document.getElementById('copy-booking-url').addEventListener('click', function() {
    const urlInput = document.getElementById('booking-url-input');
    urlInput.select();
    document.execCommand('copy');

    const button = this;
    const originalContent = button.innerHTML;
    button.innerHTML = '<i class="fas fa-check"></i><span>Copied!</span>';
    button.classList.add('copied');

    setTimeout(() => {
        button.innerHTML = originalContent;
        button.classList.remove('copied');
    }, 2000);
});

// Load existing Telegram configuration
async function loadTelegramConfig() {
    try {
        const response = await window.api.getTelegramBot();

        if (response.success) {
            const data = await response.data;

            if (data.bot_token) {
                // Populate form fields
                if (data.bot_token) {
                    document.getElementById('bot-token').value = data.bot_token;
                }
                if (data.chat_id) {
                    document.getElementById('chat-id').value = data.chat_id;
                }

                // Update status badge
                updateTelegramStatus(data.status === 'active' || false);
            }
        } else {
            console.log('No existing Telegram configuration found');
        }
    } catch (error) {
        console.error('Error loading Telegram config:', error);
    }
}

// Update Telegram connection status
function updateTelegramStatus(isConnected) {
    const statusBadge = document.querySelector('.status-badge');
    if (isConnected) {
        statusBadge.className = 'status-badge connected';
        statusBadge.innerHTML = '<i class="fas fa-circle"></i> Connected';
    } else {
        statusBadge.className = 'status-badge disconnected';
        statusBadge.innerHTML = '<i class="fas fa-circle"></i> Not Connected';
    }
}

// Telegram bot configuration form
document.getElementById('telegram-config-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const botToken = document.getElementById('bot-token').value.trim();
    const chatId = document.getElementById('chat-id').value.trim();

    // Validate bot token format
    if (!botToken) {
        alert('Please enter a valid bot token');
        return;
    }

    // Show loading state
    const submitButton = this.querySelector('.save-button');
    const originalButtonContent = submitButton.innerHTML;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    submitButton.disabled = true;

    try {
        const response = await window.api.addTelegramBot({
                bot_token: botToken,
                chat_id: chatId || null
            });

        const data = await response.data;

        if (response.success) {
            // Show success message
            showNotification('Telegram bot configuration saved successfully!', 'success');

            // Update status badge
            updateTelegramStatus(true);

            // Reset button
            submitButton.innerHTML = '<i class="fas fa-check"></i> Saved!';
            setTimeout(() => {
                submitButton.innerHTML = originalButtonContent;
                submitButton.disabled = false;
            }, 2000);
        } else {
            throw new Error(data.message || 'Failed to save configuration');
        }
    } catch (error) {
        console.error('Error saving Telegram config:', error);
        showNotification('Error: ' + error.message, 'error');

        // Reset button
        submitButton.innerHTML = originalButtonContent;
        submitButton.disabled = false;
    }
});

// Helper function to get CSRF token
function getCookie(name) {
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

// Helper function to show notifications
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === 'success' ? '#38B000' : type === 'error' ? '#dc3545' : '#4361EE'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-size: 14px;
        font-weight: 500;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Load Telegram config on initial page load
document.addEventListener('DOMContentLoaded', function() {
    loadTelegramConfig();
});
