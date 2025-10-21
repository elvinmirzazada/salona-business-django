// Service manager - handles service loading, display and selection
const ServiceManager = (() => {
    // Function to load services for booking forms
    const loadServices = async () => {
        try {
            // Use the correct endpoint for services
            const response = await fetch(`${API_BASE_URL}/api/v1/companies/services`, {
                method: 'GET',
                headers: Auth.getAuthHeader(),
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Service data received:', data);

            if (!data.success) {
                throw new Error('Invalid response format or no services found');
            }

            // Process the services data to organize by categories
            let allServices = [];
            const categories = data.data; // The categories are at the root level of data

            // Create hidden select for form submission
            let serviceSelect = document.getElementById('booking-service');

            if (!serviceSelect) {
                serviceSelect = document.createElement('select');
                serviceSelect.id = 'booking-service';
                serviceSelect.name = 'booking-service';
                serviceSelect.multiple = true;
                serviceSelect.style.display = 'none';
                document.getElementById('booking-form').appendChild(serviceSelect);
            } else {
                // Clear existing options
                serviceSelect.innerHTML = '';
            }

            // Build the visible service list with categories
            const customServiceSelect = document.getElementById('custom-service-select');
            if (!customServiceSelect) return [];

            // Clear existing content
            customServiceSelect.innerHTML = '';

            if (categories.length === 0) {
                customServiceSelect.innerHTML = '<div class="no-services">No services available. Please contact support.</div>';
                return [];
            }

            // Add all services to hidden select first
            categories.forEach(category => {
                if (Array.isArray(category.services)) {
                    category.services.forEach(service => {
                        // Add to all services array
                        allServices.push(service);

                        // Add to hidden select
                        const option = document.createElement('option');
                        option.value = service.id || '';
                        option.textContent = service.name || 'Unnamed Service';
                        option.dataset.price = service.discount_price || service.price || 0;
                        option.dataset.originalPrice = service.price || 0;
                        option.dataset.duration = service.duration || 60;
                        option.dataset.category = category.name || '';
                        serviceSelect.appendChild(option);
                    });
                }
            });

            // Build service list by category
            categories.forEach(category => {
                // Create category header
                const categoryEl = document.createElement('div');
                categoryEl.className = 'service-category';
                categoryEl.textContent = category.name;
                customServiceSelect.appendChild(categoryEl);

                // Check if category has services
                if (!Array.isArray(category.services) || category.services.length === 0) {
                    return; // Skip empty categories
                }

                // Add services for this category
                category.services.forEach(service => {
                    if (!service || !service.id) return;

                    // Create service item
                    const serviceItem = document.createElement('div');
                    serviceItem.className = 'service-item';
                    serviceItem.dataset.id = service.id;
                    serviceItem.dataset.name = service.name; // For search functionality

                    // Service header (checkbox, name, price)
                    const serviceHeader = document.createElement('div');
                    serviceHeader.className = 'service-item-header';

                    // Create checkbox container
                    const checkboxContainer = document.createElement('div');
                    checkboxContainer.className = 'service-checkbox';

                    // Create actual checkbox
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.id = `service-${service.id}`;
                    checkbox.value = service.id;
                    checkbox.addEventListener('change', () => {
                        // Update the hidden select
                        const option = Array.from(serviceSelect.options).find(opt => opt.value === service.id);
                        if (option) {
                            option.selected = checkbox.checked;
                            updateSelectedServicesSummary();
                        }
                    });

                    // Create label for checkbox
                    const label = document.createElement('label');
                    label.htmlFor = `service-${service.id}`;
                    label.className = 'service-name';
                    label.textContent = service.name || 'Unnamed Service';

                    // Add checkbox and label to container
                    checkboxContainer.appendChild(checkbox);
                    checkboxContainer.appendChild(label);

                    // Create price display
                    const priceEl = document.createElement('div');
                    priceEl.className = 'service-price';

                    // Handle regular vs discounted price
                    if (service.discount_price) {
                        const originalPrice = document.createElement('span');
                        originalPrice.className = 'service-original-price';
                        originalPrice.textContent = `$${parseFloat(service.price).toFixed(2)}`;

                        const discountPrice = document.createElement('span');
                        discountPrice.textContent = `$${parseFloat(service.discount_price).toFixed(2)}`;

                        priceEl.appendChild(originalPrice);
                        priceEl.appendChild(discountPrice);
                    } else {
                        priceEl.textContent = `$${parseFloat(service.price || 0).toFixed(2)}`;
                    }

                    // Add elements to header
                    serviceHeader.appendChild(checkboxContainer);
                    serviceHeader.appendChild(priceEl);
                    serviceItem.appendChild(serviceHeader);

                    // Add duration
                    const durationEl = document.createElement('div');
                    durationEl.className = 'service-duration';
                    durationEl.textContent = `${service.duration || 60} min`;
                    serviceItem.appendChild(durationEl);

                    // Add click handler for the whole service item
                    serviceItem.addEventListener('click', (e) => {
                        // Don't trigger if clicking directly on checkbox (it handles itself)
                        if (e.target !== checkbox) {
                            checkbox.checked = !checkbox.checked;

                            // Update the hidden select
                            const option = Array.from(serviceSelect.options).find(opt => opt.value === service.id);
                            if (option) {
                                option.selected = checkbox.checked;
                                updateSelectedServicesSummary();
                            }
                        }
                    });

                    customServiceSelect.appendChild(serviceItem);
                });
            });

            // Setup service search functionality
            setupServiceSearch();

            return allServices;
        } catch (error) {
            console.error('Error fetching services:', error);

            // Show error in the UI
            const customServiceSelect = document.getElementById('custom-service-select');
            if (customServiceSelect) {
                customServiceSelect.innerHTML = `<div class="error-message">Error loading services: ${error.message}</div>`;
            }

            return [];
        }
    };
    
    // Update selected services summary in the booking form
    const updateSelectedServicesSummary = () => {
        const serviceSelect = document.getElementById('booking-service');
        const selectedServicesList = document.getElementById('selected-services-list');
        const emptyMessage = selectedServicesList.querySelector('.empty-selection-message');
        
        // Get selected options
        const selectedOptions = Array.from(serviceSelect.selectedOptions);
        
        // Calculate totals
        let totalDuration = 0;
        let totalPrice = 0;
        
        // Clear existing selected services list, keeping only the empty message
        Array.from(selectedServicesList.children).forEach(child => {
            if (!child.classList.contains('empty-selection-message')) {
                child.remove();
            }
        });
        
        // Show/hide empty message based on selections
        if (selectedOptions.length === 0) {
            if (emptyMessage) emptyMessage.style.display = 'block';
        } else {
            if (emptyMessage) emptyMessage.style.display = 'none';
            
            // Add each selected service to the summary
            selectedOptions.forEach(option => {
                const serviceId = option.value;
                const serviceName = option.textContent;
                const servicePrice = parseFloat(option.dataset.price || 0);
                const serviceDuration = parseInt(option.dataset.duration || 0);
                const originalPrice = option.dataset.originalPrice ? parseFloat(option.dataset.originalPrice) : null;
                
                // Add to totals
                totalDuration += serviceDuration;
                totalPrice += servicePrice;
                
                // Create service item element
                const serviceItem = document.createElement('div');
                serviceItem.className = 'selected-service-item';
                serviceItem.dataset.id = serviceId;
                
                // Create info container
                const serviceInfo = document.createElement('div');
                serviceInfo.className = 'selected-service-info';
                
                // Create service name element
                const nameEl = document.createElement('div');
                nameEl.className = 'selected-service-name';
                nameEl.textContent = serviceName;
                
                // Create duration element
                const durationEl = document.createElement('span');
                durationEl.className = 'selected-service-duration';
                durationEl.textContent = `${serviceDuration} min`;
                
                // Create price element
                const priceEl = document.createElement('span');
                priceEl.className = 'selected-service-price';
                
                // Handle original vs discount price display
                if (originalPrice && originalPrice > servicePrice) {
                    priceEl.innerHTML = `<span class="service-original-price">$${originalPrice.toFixed(2)}</span> $${servicePrice.toFixed(2)}`;
                } else {
                    priceEl.textContent = `$${servicePrice.toFixed(2)}`;
                }
                
                // Add elements to info container
                serviceInfo.appendChild(nameEl);
                serviceInfo.appendChild(durationEl);
                serviceInfo.appendChild(priceEl);
                
                // Create remove button
                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-service-btn';
                removeBtn.innerHTML = '&times;'; // × symbol
                removeBtn.title = 'Remove service';
                removeBtn.addEventListener('click', () => {
                    // Uncheck the checkbox
                    const checkbox = document.getElementById(`service-${serviceId}`);
                    if (checkbox) checkbox.checked = false;
                    
                    // Unselect the option
                    option.selected = false;
                    
                    // Remove from summary
                    serviceItem.remove();
                    
                    // Update totals
                    updateSelectedServicesSummary();
                });
                
                // Add info and remove button to item
                serviceItem.appendChild(serviceInfo);
                serviceItem.appendChild(removeBtn);
                
                // Add to selected services list
                selectedServicesList.appendChild(serviceItem);
            });
        }
        
        // Update totals display
        document.getElementById('total-duration').textContent = `${totalDuration} min`;
        document.getElementById('total-price').textContent = `$${totalPrice.toFixed(2)}`;
    };
    
    // Setup service search functionality
    const setupServiceSearch = () => {
        const searchInput = document.getElementById('service-search');
        if (!searchInput) return;
        
        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value.toLowerCase();
            
            // Get all service items
            const serviceItems = document.querySelectorAll('.service-item');
            let anyVisible = false;
            
            // Loop through all service items
            serviceItems.forEach(item => {
                const serviceName = item.dataset.name?.toLowerCase() || '';
                
                // Check if service name contains the search term
                if (searchTerm === '' || serviceName.includes(searchTerm)) {
                    // Show this service
                    item.style.display = 'block';
                    anyVisible = true;
                } else {
                    // Hide this service
                    item.style.display = 'none';
                }
            });
            
            // Handle category visibility
            const categories = document.querySelectorAll('.service-category');
            categories.forEach(category => {
                // Check if next element is a service item that's visible
                let nextEl = category.nextElementSibling;
                let hasVisibleService = false;
                
                while (nextEl && !nextEl.classList.contains('service-category')) {
                    if (nextEl.classList.contains('service-item') && nextEl.style.display !== 'none') {
                        hasVisibleService = true;
                        break;
                    }
                    nextEl = nextEl.nextElementSibling;
                }
                
                // Show/hide category based on whether it has visible services
                category.style.display = hasVisibleService ? 'block' : 'none';
            });
            
            // Show a "no results" message if needed
            const customServiceSelect = document.getElementById('custom-service-select');
            let noResultsMessage = document.querySelector('.no-search-results');
            
            if (!anyVisible) {
                if (!noResultsMessage) {
                    noResultsMessage = document.createElement('div');
                    noResultsMessage.className = 'no-search-results';
                    noResultsMessage.textContent = `No services match "${searchTerm}"`;
                    noResultsMessage.style.padding = '15px';
                    noResultsMessage.style.textAlign = 'center';
                    noResultsMessage.style.color = 'var(--text-light)';
                    noResultsMessage.style.fontStyle = 'italic';
                    
                    // Add after the search input but before the services list
                    if (customServiceSelect) {
                        customServiceSelect.prepend(noResultsMessage);
                    }
                } else {
                    // Update existing message
                    noResultsMessage.textContent = `No services match "${searchTerm}"`;
                    noResultsMessage.style.display = 'block';
                }
            } else if (noResultsMessage) {
                // Hide the message if we have visible services
                noResultsMessage.style.display = 'none';
            }
        });
        
        // Clear search when clicking the "x" button in search field
        searchInput.addEventListener('search', () => {
            if (searchInput.value === '') {
                // Reset the search
                searchInput.dispatchEvent(new Event('input'));
            }
        });
    };

    // Function to load staff members for service popups
    const loadStaffMembers = async (staffContainer) => {
        try {
            // Use the correct endpoint for company users
            const response = await fetch(`${API_BASE_URL}/api/v1/companies/users`, {
                method: 'GET',
                headers: Auth.getAuthHeader(),
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Staff data received:', data);

            if (!data.success) {
                throw new Error('Invalid response format or no staff members found');
            }

            // Clear existing content
            staffContainer.innerHTML = '';

            // Check if we have staff members
            if (!Array.isArray(data.data) || data.data.length === 0) {
                staffContainer.innerHTML = '<div class="no-staff">No staff members available.</div>';
                return;
            }

            // Create staff selection elements
            data.data.forEach(staffMember => {
                if (!staffMember.user) return;

                const user = staffMember.user;
                const staffEl = document.createElement('div');
                staffEl.className = 'staff-select-item';

                // Create checkbox for staff selection
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = `staff-${staffMember.id}`;
                checkbox.value = staffMember.id;
                checkbox.name = 'staff_members';
                checkbox.dataset.userId = user.id;

                // Create label with staff name
                const label = document.createElement('label');
                label.htmlFor = `staff-${staffMember.id}`;
                label.className = 'staff-name';
                label.textContent = `${user.first_name} ${user.last_name}`;

                // Add elements to staff item
                staffEl.appendChild(checkbox);
                staffEl.appendChild(label);

                // Add staff item to container
                staffContainer.appendChild(staffEl);
            });
        } catch (error) {
            console.error('Error loading staff members:', error);
            staffContainer.innerHTML = '<div class="error">Error loading staff members. Please try again.</div>';
        }
    };

    return {
        loadServices,
        loadStaffMembers,
        updateSelectedServicesSummary,
        setupServiceSearch
    };
})();

// Export the ServiceManager module
window.ServiceManager = ServiceManager;
