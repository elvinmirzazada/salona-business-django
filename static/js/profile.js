// Profile Module
const Profile = (() => {

    // Load user profile data
    const loadUserProfile = async () => {
        // Populate profile form fields
        const firstNameInput = document.getElementById('profile-first-name');
        const lastNameInput = document.getElementById('profile-last-name');
        const emailInput = document.getElementById('profile-email');
        const phoneInput = document.getElementById('profile-phone');
        const positionInput = document.getElementById('profile-position');

        const userData = window.userData;
        if (!userData) return;

        if (firstNameInput) firstNameInput.value = userData.first_name || '';
        if (lastNameInput) lastNameInput.value = userData.last_name || '';
        if (emailInput) emailInput.value = userData.email || '';
        if (phoneInput) phoneInput.value = userData.phone || '';
        if (positionInput) positionInput.value = userData.position || '';

        // Load profile photo if exists
        if (userData.profile_photo_url) {
            displayProfilePhoto(userData.profile_photo_url);
        } else {
            // Ensure remove button is hidden if no photo
            const removePhotoBtn = document.getElementById('remove-photo-btn');
            if (removePhotoBtn) {
                removePhotoBtn.style.display = 'none';
            }
        }
    };

    // Setup profile form submission
    const setupProfileForm = () => {
        const profileForm = document.getElementById('profile-form');
        if (!profileForm) return;

        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = {
                first_name: document.getElementById('profile-first-name').value.trim(),
                last_name: document.getElementById('profile-last-name').value.trim(),
                email: document.getElementById('profile-email').value.trim(),
                phone: document.getElementById('profile-phone').value.trim(),
                languages: document.getElementById('profile-languages').value.trim(),
                position: document.getElementById('profile-position').value.trim()
            };

            UI.showLoader('Updating profile...');

            try {
                const result = await updateUserProfile(formData);

                if (result.success) {
                    // Reload user info from server to ensure data is in sync
                    const userInfoResult = await fetchCurrentUserInfo();

                    // Hide loader
                    UI.hideLoader();

                    UI.showToast(window.settingsTranslations?.profileUpdatedSuccess || 'Profile updated successfully!', 'success');

                    // Update the welcome message if it exists
                    const welcomeMessage = document.querySelector('.user-name');
                    if (welcomeMessage && window.userData) {
                        welcomeMessage.textContent = `Welcome, ${window.userData.first_name}!`;
                    }

                    // Optionally reload the form with fresh data
                    if (userInfoResult.success) {
                        loadUserProfile();
                    }
                } else {
                    // Hide loader
                    UI.hideLoader();
                    UI.showToast(result.message || window.settingsTranslations?.errorUpdatingProfile || 'Error updating profile', 'error');
                }
            } catch (error) {
                // Hide loader on error
                UI.hideLoader();
                console.error('Error updating profile:', error);
                UI.showToast(window.settingsTranslations?.errorUpdatingProfile || 'Error updating profile', 'error');
            }
        });
    };

    // Fetch current user info from API
    const fetchCurrentUserInfo = async () => {
        try {
            const response = await api.request('/users/api/v1/users/me', {
                method: 'GET'
            });

            if (response.success && response.data) {
                // Update window.userData with fresh data from server
                window.userData = { ...window.userData, ...response.data.user };
                window.userData.role_status = response.data.status;
                if (response.data.status !== 'active') {
                    window.userData.company_id = null;
                } else {
                    window.userData.role = response.data.role;
                    window.userData.company_id = response.data.company_id;
                }
                return {
                    success: true,
                    data: response.data
                };
            } else {
                return {
                    success: false,
                    message: response.message || 'Failed to fetch user info'
                };
            }
        } catch (error) {
            console.error('Error fetching user info:', error);
            return {
                success: false,
                message: error.message
            };
        }
    };

    // Update user profile via API
    const updateUserProfile = async (profileData) => {
        try {
            const response = await api.request('/users/api/v1/users/me', {
                method: 'PUT',
                body: JSON.stringify(profileData)
            });

            if (!response.success) {
                return {
                    success: false,
                    message: response.message || 'Failed to update profile'
                };
            }
            return response;
        } catch (error) {
            console.error('Error updating profile:', error);
            return {
                success: false,
                message: error.message
            };
        }
    };

    // Setup profile photo upload and removal
    const setupProfilePhoto = () => {
        const uploadPhotoBtn = document.getElementById('upload-photo-btn');
        const removePhotoBtn = document.getElementById('remove-photo-btn');
        const profilePhotoInput = document.getElementById('profile-photo-input');

        if (uploadPhotoBtn && profilePhotoInput) {
            uploadPhotoBtn.addEventListener('click', () => {
                profilePhotoInput.click();
            });

            profilePhotoInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                // Validate file size (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    UI.showToast('File size must be less than 5MB', 'error');
                    return;
                }

                // Validate file type
                if (!file.type.startsWith('image/')) {
                    UI.showToast('Please select an image file', 'error');
                    return;
                }

                // Show loader
                UI.showLoader('Uploading photo...');

                try {
                    const result = await uploadProfilePhoto(file);

                    // Hide loader
                    UI.hideLoader();

                    if (result.success) {
                        UI.showToast('Profile photo uploaded successfully!', 'success');

                        // Immediately update the photo
                        const photoUrl = result.data.profile_photo_url;
                        displayProfilePhoto(photoUrl);

                        // Update window.userData
                        if (window.userData) {
                            window.userData.profile_photo_url = photoUrl;
                        }

                        if (removePhotoBtn) {
                            removePhotoBtn.style.display = 'inline-block';
                        }
                    } else {
                        UI.showToast(result.message || 'Failed to upload photo', 'error');
                    }
                } catch (error) {
                    // Hide loader on error
                    UI.hideLoader();
                    console.error('Error uploading photo:', error);
                    UI.showToast('Error uploading photo', 'error');
                }
            });
        }

        if (removePhotoBtn) {
            removePhotoBtn.addEventListener('click', async () => {
                if (confirm('Are you sure you want to remove your profile photo?')) {
                    // Show loader
                    UI.showLoader('Removing photo...');

                    try {
                        const result = await removeProfilePhoto();

                        // Hide loader
                        UI.hideLoader();

                        if (result.success) {
                            UI.showToast('Profile photo removed successfully!', 'success');
                            hideProfilePhoto();
                            removePhotoBtn.style.display = 'none';
                        } else {
                            UI.showToast(result.message || 'Failed to remove photo', 'error');
                        }
                    } catch (error) {
                        // Hide loader on error
                        UI.hideLoader();
                        console.error('Error removing photo:', error);
                        UI.showToast('Error removing photo', 'error');
                    }
                }
            });
        }
    };

    // Upload profile photo via API
    const uploadProfilePhoto = async (file) => {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const apiUrl = `/users/api/v1/users/me/profile-photo`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            const responseText = await response.text();

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                return {
                    success: false,
                    message: 'Invalid response from server'
                };
            }

            if (!response.ok || !data.success) {
                return {
                    success: false,
                    message: data.message || (data.detail ? JSON.stringify(data.detail) : 'Failed to upload profile photo')
                };
            }

            return data;
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    };

    // Remove profile photo via API
    const removeProfilePhoto = async () => {
        try {
            const apiUrl = `/users/api/v1/users/me/profile-photo`;

            const data = await api.request(apiUrl, {
                method: 'DELETE'
            });

            if (data.success) {
                return { success: true };
            } else {
                return { success: false, message: data.message || 'Failed to remove photo' };
            }
        } catch (error) {
            console.error('Error removing photo:', error);
            return { success: false, message: 'Network error' };
        }
    };

    // Setup language multi-select functionality
    const setupLanguageMultiSelect = () => {
        const languageSearch = document.getElementById('language-search');
        const languageDropdown = document.getElementById('language-dropdown');
        const selectedLanguagesContainer = document.getElementById('selected-languages');
        const languagesInput = document.getElementById('profile-languages');

        if (!languageSearch || !languageDropdown || !selectedLanguagesContainer) return;

        // List of languages
        const languages = [
            'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Russian',
            'Chinese (Mandarin)', 'Japanese', 'Korean', 'Arabic', 'Hindi', 'Bengali',
            'Turkish', 'Dutch', 'Swedish', 'Polish', 'Danish', 'Norwegian', 'Finnish',
            'Greek', 'Czech', 'Hungarian', 'Romanian', 'Thai', 'Vietnamese', 'Indonesian',
            'Malay', 'Hebrew', 'Ukrainian', 'Persian (Farsi)', 'Urdu', 'Swahili',
            'Tamil', 'Telugu', 'Marathi', 'Gujarati', 'Kannada', 'Punjabi', 'Malayalam',
            'Serbian', 'Croatian', 'Slovak', 'Bulgarian', 'Catalan', 'Estonian', 'Latvian',
            'Lithuanian', 'Slovenian', 'Albanian', 'Macedonian', 'Icelandic', 'Georgian',
            'Armenian', 'Azerbaijani', 'Kazakh', 'Uzbek', 'Mongolian', 'Burmese', 'Khmer',
            'Lao', 'Tagalog (Filipino)', 'Amharic', 'Nepali', 'Sinhala', 'Pashto', 'Kurdish'
        ];
        languages.sort();

        // Initialize selectedLanguages from userData
        let selectedLanguages = [];
        const userData = window.userData;

        // Clear any existing chips first
        selectedLanguagesContainer.innerHTML = '';

        // Initialize selected languages from user data
        if (userData && userData.languages) {
            if (typeof userData.languages === 'string') {
                const user_languages = userData.languages.split(',').map(lang => lang.trim()).filter(lang => lang);
                selectedLanguages = [...user_languages];
            } else if (Array.isArray(userData.languages)) {
                selectedLanguages = [...userData.languages];
            }

            // Display the initial chips
            selectedLanguages.forEach(lang => {
                addLanguageChipToDOM(lang);
            });

            // Set the initial value in the hidden input
            if (languagesInput) {
                languagesInput.value = selectedLanguages.join(',');
            }
        }

        // Show dropdown on focus
        languageSearch.addEventListener('focus', () => {
            displayLanguages(languages);
            languageDropdown.style.display = 'block';
        });

        // Filter languages on input
        languageSearch.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filteredLanguages = languages.filter(lang =>
                lang.toLowerCase().includes(searchTerm) && !selectedLanguages.includes(lang)
            );
            displayLanguages(filteredLanguages);
            languageDropdown.style.display = 'block';
        });

        // Hide dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.language-select-wrapper')) {
                languageDropdown.style.display = 'none';
            }
        });

        // Display languages in dropdown
        function displayLanguages(langs) {
            languageDropdown.innerHTML = '';
            const availableLangs = langs.filter(lang => !selectedLanguages.includes(lang));

            availableLangs.forEach(lang => {
                const option = document.createElement('div');
                option.className = 'language-option';
                option.textContent = lang;
                option.addEventListener('click', (e) => {
                    e.stopPropagation();
                    selectLanguage(lang);
                });
                languageDropdown.appendChild(option);
            });

            if (availableLangs.length === 0) {
                languageDropdown.innerHTML = '<div class="no-results">No languages found</div>';
            }
        }

        // Select a language
        function selectLanguage(lang) {
            if (!selectedLanguages.includes(lang)) {
                selectedLanguages.push(lang);
                addLanguageChipToDOM(lang);
                updateLanguagesInput();
                languageSearch.value = '';
                displayLanguages(languages);
            }
        }

        // Add language chip to DOM
        function addLanguageChipToDOM(lang) {
            const chip = document.createElement('div');
            chip.className = 'language-chip';
            chip.setAttribute('data-language', lang);
            chip.innerHTML = `
                <span>${lang}</span>
                <button type="button" class="language-chip-remove" aria-label="Remove ${lang}">
                    <i class="fas fa-times"></i>
                </button>
            `;

            // Add click event to remove button
            const removeBtn = chip.querySelector('.language-chip-remove');
            removeBtn.addEventListener('click', () => removeLanguage(lang));

            selectedLanguagesContainer.appendChild(chip);
        }

        // Remove a language
        function removeLanguage(lang) {
            // Remove from array
            selectedLanguages = selectedLanguages.filter(l => l !== lang);

            // Remove chip from DOM
            const chip = selectedLanguagesContainer.querySelector(`[data-language="${lang}"]`);
            if (chip) {
                chip.remove();
            }

            // Update input and refresh dropdown
            updateLanguagesInput();

            // If dropdown is visible, refresh it
            if (languageDropdown.style.display === 'block') {
                const searchTerm = languageSearch.value.toLowerCase();
                const filteredLanguages = languages.filter(l =>
                    l.toLowerCase().includes(searchTerm)
                );
                displayLanguages(filteredLanguages);
            }
        }

        // Update hidden input with selected languages
        function updateLanguagesInput() {
            if (languagesInput) {
                languagesInput.value = selectedLanguages.join(',');
            }
        }
    };


    // Display profile photo helper
    const displayProfilePhoto = (photoUrl) => {
        const photoImg = document.getElementById('profile-photo-img');
        const photoPlaceholder = document.getElementById('profile-photo-placeholder');
        const removePhotoBtn = document.getElementById('remove-photo-btn');

        if (photoImg && photoPlaceholder) {
            photoImg.src = photoUrl;
            photoImg.style.display = 'block';
            photoPlaceholder.style.display = 'none';
        }

        if (removePhotoBtn) {
            removePhotoBtn.style.display = 'inline-block';
        }
    };

    // Hide profile photo helper
    const hideProfilePhoto = () => {
        const photoImg = document.getElementById('profile-photo-img');
        const photoPlaceholder = document.getElementById('profile-photo-placeholder');
        const removePhotoBtn = document.getElementById('remove-photo-btn');

        if (photoImg && photoPlaceholder) {
            photoImg.src = '';
            photoImg.style.display = 'none';
            photoPlaceholder.style.display = 'flex';
        }

        if (removePhotoBtn) {
            removePhotoBtn.style.display = 'none';
        }
    };

    // Initialize the profile page
    const init = () => {
        loadUserProfile();
        setupProfileForm();
        setupProfilePhoto();
        setupLanguageMultiSelect();
    };

    // Public API
    return {
        init,
        fetchCurrentUserInfo
    };
})();

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    Profile.init();
});

