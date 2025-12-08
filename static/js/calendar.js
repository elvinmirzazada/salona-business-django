// Calendar related functionality using FullCalendar library
const Calendar = (() => {
    let calendar = null;
    let currentDate = new Date();
    let selectedStaffIds = null;
    let viewMode = localStorage.getItem('calendarViewMode') || 'timeGridWeek';
    let staffColors = {}; // Store staff colors

    // Calendar display configuration
    const calendarConfig = {
        startHour: 7,  // 9:00 AM
        endHour: 21,   // 6:00 PM
        intervalMinutes: 30  // 30-minute intervals
    };

    // Predefined color palette for staff members
    const colorPalette = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
        '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788',
        '#E76F51', '#2A9D8F', '#E9C46A', '#F4A261', '#264653',
        '#8338EC', '#FF006E', '#FB5607', '#FFBE0B', '#3A86FF'
    ];

    // Get or create color for a staff member
    const getStaffColor = (staffId) => {
        // Check if we already have colors in localStorage
        if (!staffColors || Object.keys(staffColors).length === 0) {
            const storedColors = localStorage.getItem('staffColors');
            if (storedColors) {
                staffColors = JSON.parse(storedColors);
            }
        }

        // If staff already has a color, return it
        if (staffColors[staffId]) {
            return staffColors[staffId];
        }

        // Assign a new color from the palette
        const usedColors = Object.values(staffColors);
        const availableColors = colorPalette.filter(color => !usedColors.includes(color));

        // If all colors are used, use a random one from the palette
        const newColor = availableColors.length > 0
            ? availableColors[0]
            : colorPalette[Math.floor(Math.random() * colorPalette.length)];

        staffColors[staffId] = newColor;
        localStorage.setItem('staffColors', JSON.stringify(staffColors));

        return newColor;
    };

    // Get staff IDs from a booking event
    const getBookingStaffIds = (bookingEvent) => {
        const staffIds = [];

        // Check booking_services for assigned staff
        if (bookingEvent.bookingServices && Array.isArray(bookingEvent.bookingServices)) {
            bookingEvent.bookingServices.forEach(service => {
                if (service.assigned_staff && service.assigned_staff.id) {
                    staffIds.push(service.assigned_staff.id.toString());
                } else if (service.user_id) {
                    staffIds.push(service.user_id.toString());
                }
            });
        }

        return [...new Set(staffIds)]; // Remove duplicates
    };

    // Convert booking data to FullCalendar events
    const convertToFullCalendarEvents = (bookingEvents, timeOffEvents) => {
        const events = [];

        // Add booking events
        bookingEvents.forEach(event => {
            const staffIds = getBookingStaffIds(event);
            const staffColors = staffIds.map(id => getStaffColor(id));

            let backgroundColor = '#f8f9fa !important'; // light gray background to match page design
            let borderColor = '#00A884 !important'; // default to primary color (teal)
            let textColor = '#2c3e50 !important'; // dark blue-gray text for readability

            // Use first staff color for border if available
            if (staffColors.length > 0) {
                borderColor = staffColors[0];
            }

            // Override with status colors for cancelled/completed
            if (event.status === 'cancelled') {
                backgroundColor = '#fee !important'; // very light red background
                textColor = '#c0392b !important'; // darker red text
            } else if (event.status === 'completed') {
                backgroundColor = '#f0f9f4 !important'; // very light green background
                textColor = '#1e8449 !important'; // darker green text
            }

            events.push({
                id: `booking-${event.id}`,
                title: event.title,
                start: event.start,
                end: event.end,
                backgroundColor: backgroundColor,
                borderColor: borderColor,
                textColor: textColor,
                extendedProps: {
                    type: 'booking',
                    originalEvent: event,
                    staffColors: staffColors,
                    staffIds: staffIds
                }
            });
        });

        // Add time-off events
        timeOffEvents.forEach(event => {
            events.push({
                id: `timeoff-${event.id}`,
                title: event.title,
                start: event.start,
                end: event.end,
                backgroundColor: '#95a5a6',
                borderColor: '#7f8c8d',
                textColor: '#ffffff',
                extendedProps: {
                    type: 'timeoff',
                    originalEvent: event
                }
            });
        });

        return events;
    };

    // Fetch and render events
    const fetchAndRenderEvents = async (currentRange) => {
        if (!currentRange) return;
        try {
            Utils.toggleSpinner(true);
            const currentViewType = currentRange.viewType;
            const startDate = new Date(currentRange.start);
            const endDate = new Date(currentRange.end);

            // Determine availability type based on calendar view
            let availabilityType;

            if (currentViewType === 'dayGridMonth') {
                // Month view - use monthly availability
                availabilityType = 'monthly';
            } else if (currentViewType === 'timeGridWeek' || currentViewType === 'dayGridWeek' || currentViewType === 'listWeek') {
                // Week views - use weekly availability
                availabilityType = 'weekly';
            } else {
                // Day view or any other view - use daily availability
                availabilityType = 'daily';
            }

            // For time-offs in month view, use the first day of the month as start date
            let timeOffStartDate = startDate;
            if (currentViewType === 'dayGridMonth') {
                // Get the actual month being displayed (not the padded calendar dates)
                const viewDate = calendar.getDate();
                timeOffStartDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
            }

            console.log(`🔄 Fetching calendar data for ${currentViewType} view (${availabilityType})`);

            // Fetch bookings and time offs with appropriate date ranges
            const bookings = await BookingService.fetchBookings(startDate, endDate);
            const timeOffs = await BookingService.fetchTimeOffs(timeOffStartDate, availabilityType);

            // Apply staff filtering
            let bookingEvents, timeOffEvents;

            if (selectedStaffIds && selectedStaffIds.length > 0) {
                const filteredBookings = bookings.filter(booking => {
                    if (booking.user_ids && Array.isArray(booking.user_ids) && booking.user_ids.length > 0) {
                        return booking.user_ids.some(userId =>
                            selectedStaffIds.includes(userId.toString())
                        );
                    } else if (booking.booking_services && Array.isArray(booking.booking_services)) {
                        return booking.booking_services.some(service => {
                            if (service.assigned_staff && service.assigned_staff.id) {
                                return selectedStaffIds.includes(service.assigned_staff.id.toString());
                            }
                            if (service.user_id) {
                                return selectedStaffIds.includes(service.user_id.toString());
                            }
                            return false;
                        });
                    }
                    return false;
                });
                bookingEvents = BookingService.convertBookingsToEvents(filteredBookings);

                const filteredTimeOffs = timeOffs.filter(timeOff =>
                    timeOff.user && selectedStaffIds.includes(timeOff.user.id.toString())
                );
                timeOffEvents = BookingService.convertTimeOffsToEvents(filteredTimeOffs);
            } else {
                bookingEvents = BookingService.convertBookingsToEvents(bookings);
                timeOffEvents = BookingService.convertTimeOffsToEvents(timeOffs);
            }

            // Convert to FullCalendar format
            const fullCalendarEvents = convertToFullCalendarEvents(bookingEvents, timeOffEvents);
            fullCalendarEvents.forEach(event => calendar.addEvent(event));
        } catch (error) {
            console.error('Error fetching calendar events:', error);
        } finally {
            Utils.toggleSpinner(false);
        }
    };

    // Inject staff filter dropdown into the custom button
    const injectStaffFilterDropdown = () => {
        // Find the custom button in FullCalendar's toolbar
        const staffFilterButton = document.querySelector('.fc-staffFilter-button');

        if (!staffFilterButton) {
            console.warn('Staff filter button not found');
            return;
        }

        // Create a custom dropdown container
        const dropdownContainer = document.createElement('div');
        dropdownContainer.className = 'fc-staff-dropdown-container';

        // Create the select element
        const dropdown = document.createElement('select');
        dropdown.id = 'fc-staff-filter-dropdown';
        dropdown.className = 'fc-staff-dropdown';

        // Add "All Staff" option
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = 'All Staff';
        dropdown.appendChild(allOption);

        // Add staff options with color indicators
        if (window.staff_data && Array.isArray(window.staff_data)) {
            window.staff_data.forEach(staff => {
                const option = document.createElement('option');
                option.value = staff.user.id;
                const staffColor = getStaffColor(staff.user.id.toString());
                option.textContent = `${staff.user.first_name} ${staff.user.last_name}`;
                option.style.color = staffColor;
                option.style.fontWeight = '500';
                option.setAttribute('data-color', staffColor);
                dropdown.appendChild(option);
            });
        }

        dropdownContainer.appendChild(dropdown);

        // Replace button content with dropdown container
        staffFilterButton.innerHTML = '';
        staffFilterButton.appendChild(dropdownContainer);
        staffFilterButton.style.padding = '0';
        staffFilterButton.style.border = 'none';
        staffFilterButton.style.background = 'transparent';

        // Add event listener for dropdown change
        dropdown.addEventListener('change', async (e) => {
            const selectedValue = e.target.value;

            if (selectedValue === 'all') {
                selectedStaffIds = null;
            } else {
                selectedStaffIds = [selectedValue];
            }

            // Refresh calendar with new filter
            await refreshCalendar({ selectedStaffIds });
        });
    };

    // Inject date picker into the custom button
    const injectDatePicker = () => {
        // Find the custom button in FullCalendar's toolbar
        const datePickerButton = document.querySelector('.fc-datePicker-button');

        if (!datePickerButton) {
            console.warn('Date picker button not found');
            return;
        }

        // Create date input HTML
        const dateInput = document.createElement('input');
        dateInput.type = 'date';
        dateInput.id = 'fc-date-picker-input';
        dateInput.className = 'fc-date-picker';

        // Set initial value to current date
        const today = new Date();
        dateInput.value = today.toISOString().split('T')[0];

        // Replace button content with date input
        datePickerButton.innerHTML = '';
        datePickerButton.appendChild(dateInput);
        datePickerButton.style.padding = '0';
        datePickerButton.style.border = 'none';
        datePickerButton.style.background = 'transparent';

        // Add event listener for date change
        dateInput.addEventListener('change', (e) => {
            const selectedDate = new Date(e.target.value);
            if (calendar && !isNaN(selectedDate.getTime())) {
                calendar.gotoDate(selectedDate);
            }
        });

        // Update date input when calendar date changes
        if (calendar) {
            calendar.on('datesSet', (dateInfo) => {
                const currentCalendarDate = new Date(dateInfo.start);
                dateInput.value = currentCalendarDate.toISOString().split('T')[0];
            });
        }
    };

    // Initialize FullCalendar
    const init = async () => {
        console.log('Calendar initialization started with FullCalendar');

        try {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }

            // Wait for FullCalendar library to load
            let attempts = 0;
            while (typeof FullCalendar === 'undefined' && attempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }

            if (typeof FullCalendar === 'undefined') {
                console.error('FullCalendar library failed to load after waiting');
                return;
            }

            const calendarEl = document.getElementById('fullcalendar');
            if (!calendarEl) {
                console.error('FullCalendar element not found - element with id "fullcalendar" is missing from DOM');
                return;
            }

            console.log('FullCalendar element found, initializing calendar...');

            // Initialize FullCalendar
            calendar = new FullCalendar.Calendar(calendarEl, {
                // timeZone: 'local',
                themeSystem: 'Flatly',
                initialView: 'timeGridWeek',
                initialDate: currentDate,
                views: {
                    dayGridMonth: {
                      dayHeaderFormat: { weekday: 'short' } // month view
                    },
                    timeGridWeek: {
                      dayHeaderFormat: {weekday: 'short', day: '2-digit' }
                    }
                },
                customButtons: {
                    staffFilter: {
                        // text: 'Filter Staff',
                        click: function() {
                            // This will be handled by custom HTML injection
                        }
                    },
                    datePicker: {
                        text: 'Select Date',
                        click: function() {
                            // This will be handled by custom HTML injection
                        }
                    }
                },
                headerToolbar: {
                    start: 'dayGridMonth,timeGridWeek,timeGridDay listWeek',
                    center: 'title',
                    end: 'staffFilter datePicker today prev,next'
                },
                buttonText: {
                    today: 'Today',
                    month: 'Month',
                    week: 'Week',
                    day: 'Day',
                    listWeek: 'List of bookings'
                },
                slotMinTime: `${calendarConfig.startHour}:00:00`,
                slotMaxTime: `${calendarConfig.endHour + 1}:00:00`,
                slotDuration: `00:${calendarConfig.intervalMinutes}:00`,
                slotLabelInterval: '01:00',
                slotLabelFormat: {
                    hour: 'numeric',
                    minute: '2-digit',
                    meridiem: 'short'
                },
                allDaySlot: false,
                firstDay: 1, // Week starts on Monday
                navLinks: true,
                businessHours: {
                    daysOfWeek: [1, 2, 3, 4, 5], // Mon–Fri
                    startTime: `${calendarConfig.startHour}:00`,
                    endTime: `${calendarConfig.endHour}:00`,
                },
                nowIndicator: true,
                editable: true,
                selectable: true,
                selectMirror: true,
                height: 'auto',
                contentHeight: 'auto',
                expandRows: false,
                slotEventOverlap: true,
                titleFormat: { year: 'numeric', month: 'long', day: 'numeric' },

                // Event handlers
                // events: fetchAndRenderEvents,

                eventDrop: async function(info) {
                    console.log('Event dropped:', info.event);

                    const eventType = info.event.extendedProps.type;

                    // Only handle booking events, not time-off events
                    if (eventType !== 'booking') {
                        info.revert();
                        return;
                    }

                    const originalEvent = info.event.extendedProps.originalEvent;
                    const bookingId = originalEvent.id;

                    // Get the new dates
                    const newStart = info.event.start;
                    const newEnd = info.event.end;

                    // Format dates for display
                    const formatDateTime = (date) => {
                        return date.toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                    };

                    // Show confirmation dialog
                    const confirmed = confirm(
                        `Do you want to update this booking?\n\n` +
                        `Customer: ${originalEvent.customer_name || 'N/A'}\n` +
                        `Old time: ${formatDateTime(new Date(originalEvent.start))}\n` +
                        `New time: ${formatDateTime(newStart)}`
                    );

                    if (!confirmed) {
                        // Revert the event to its original position
                        info.revert();
                        return;
                    }

                    try {
                        Utils.toggleSpinner(true);

                        // Prepare booking data with new dates
                        const bookingData = {
                            start_time: newStart.toISOString(),
                            end_time: newEnd.toISOString()
                        };

                        // Call API to update booking
                        const response = await window.api.updateBooking(bookingId, bookingData);

                        if (response && response.success) {
                            // Update the event's extended properties with new data
                            const updatedBooking = response.data || response.booking;

                            if (updatedBooking) {
                                // Update the originalEvent data with new times
                                info.event.setExtendedProp('originalEvent', {
                                    ...originalEvent,
                                    start: newStart.toISOString(),
                                    end: newEnd.toISOString(),
                                    start_time: newStart.toISOString(),
                                    end_time: newEnd.toISOString(),
                                    ...updatedBooking
                                });
                            }

                            // Show success message
                            alert('Booking updated successfully!');

                        } else {
                            // Revert on failure
                            info.revert();
                            alert('Failed to update booking. Please try again.');
                        }
                    } catch (error) {
                        console.error('Error updating booking:', error);
                        // Revert the event to its original position
                        info.revert();
                        alert('An error occurred while updating the booking. Please try again.');
                    } finally {
                        Utils.toggleSpinner(false);
                    }
                },
                eventClick: function(info) {
                    const event = info.event.extendedProps.originalEvent;
                    const eventType = info.event.extendedProps.type;

                    if (eventType === 'booking') {
                        UI.showEventPopup(event, info.jsEvent.clientX, info.jsEvent.clientY);
                    } else if (eventType === 'timeoff') {
                        UI.showTimeOffPopup(event, info.jsEvent.clientX, info.jsEvent.clientY);
                    }
                },

                select: function(selectionInfo) {
                    const selectedDate = new Date(selectionInfo.start);
                    UI.showSlotActionPopup(selectedDate, null, null);
                },

                dateClick: function(info) {
                    const clickedDate = new Date(info.date);
                    UI.showSlotActionPopup(clickedDate, info.jsEvent.clientX, info.jsEvent.clientY);
                },

                datesSet: function(dateInfo) {
                    const viewType = dateInfo.view.type;
                    const start = dateInfo.startStr;
                    const end = dateInfo.endStr;

                    let currentRange = { viewType, start, end };

                    // Clear existing events before fetching new ones to prevent duplicates
                    calendar.removeAllEvents();

                    fetchAndRenderEvents(currentRange);

                },

                eventDidMount: function(info) {
                    const staffColors = info.event.extendedProps.staffColors;
                    const eventType = info.event.extendedProps.type;

                    // Only add colored border for booking events
                    if (eventType === 'booking' && staffColors && staffColors.length > 0) {
                        const eventEl = info.el;

                        // Add colored left border
                        eventEl.style.borderLeft = `4px solid ${staffColors[0]}`;
                    }
                }
            });

            calendar.render();
            console.log('FullCalendar rendering completed successfully');

            // Replace the custom button with a dropdown
            injectStaffFilterDropdown();
            injectDatePicker();

            // Setup calendar navigation
            setupNavigation();
        } catch (error) {
            console.error('Error initializing FullCalendar:', error);
        }
    };

    // Setup calendar navigation buttons
    const setupNavigation = () => {
        // Previous button
        document.getElementById('prev-week')?.addEventListener('click', function() {
            if (calendar) {
                calendar.prev();
            }
        });

        // Next button
        document.getElementById('next-week')?.addEventListener('click', function() {
            if (calendar) {
                calendar.next();
            }
        });
    };

    // Switch view mode
    const setViewMode = (mode) => {
        viewMode = mode;
        if (calendar) {
            const newView = mode || 'timeGridWeek';
            calendar.changeView(newView);
            localStorage.setItem('calendarViewMode', mode);
        }
    };

    // Refresh calendar
    const refreshCalendar = async (options = {}) => {
        if (options.selectedStaffIds !== undefined) {
            selectedStaffIds = options.selectedStaffIds;
        }
        if (calendar) {
            calendar.refetchEvents();
        }
    };

    return {
        init,
        getCurrentDate: () => currentDate,
        setViewMode,
        refreshCalendar
    };
})();

// Export the Calendar module
window.Calendar = Calendar;
