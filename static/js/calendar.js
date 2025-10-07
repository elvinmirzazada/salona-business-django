// Calendar related functionality
const Calendar = (() => {
    let currentDate = new Date();
    let selectedStaffIds = null;
    let cachedBookings = []; // Cache to store all fetched bookings
    let cachedTimeOffs = []; // Cache to store all fetched time offs

    // Calendar display configuration
    const calendarConfig = {
        startHour: 8,  // 8:00 AM
        endHour: 20,   // 8:00 PM
        intervalMinutes: 15  // 15-minute intervals
    };

    // Calculate start date (3 days before current date)
    const getStartDate = (date) => {
        const startDate = new Date(date);
        startDate.setDate(date.getDate() - 3);
        return startDate;
    };

    // Update the calendar header to show current week range
    const updateCalendarHeader = (startDate) => {
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);

        const startFormatted = startDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
        const endFormatted = endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

        document.getElementById('current-week').textContent = `${startFormatted} - ${endFormatted}`;
    };

    // Render calendar with days and time slots
    const renderCalendar = async (date, forceRefresh = false) => {
        const startDate = getStartDate(date);
        updateCalendarHeader(startDate);

        // Calculate the end date (start date + 6 days = full week)
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);

        const calendarGrid = document.querySelector('.calendar-grid');
        calendarGrid.innerHTML = '';

        // Show loading spinner
        Utils.toggleSpinner(true);

        try {
            let bookingEvents = [];
            let timeOffEvents = [];

            // If we don't have cached data or force refresh is true, fetch all data
            if (cachedBookings.length === 0 || forceRefresh) {
                // Fetch regular booking data from API with date range (without staff filter)
                const bookings = await BookingService.fetchBookings(startDate, endDate);
                cachedBookings = bookings; // Cache the bookings

                // Fetch time off data from API
                const timeOffs = await BookingService.fetchTimeOffs(startDate, endDate);
                cachedTimeOffs = timeOffs; // Cache the time offs
            }

            // Apply staff filtering client-side if needed
            if (selectedStaffIds && selectedStaffIds.length > 0) {
                // Filter bookings by staff ID
                const filteredBookings = cachedBookings.filter(booking => {
                    // Check if booking has user_ids field (array of staff IDs)
                    if (booking.user_ids && Array.isArray(booking.user_ids)) {
                        return booking.user_ids.some(userId =>
                            selectedStaffIds.includes(userId.toString())
                        );
                    }
                    // Fallback to booking_services check
                    else if (booking.booking_services) {
                        return booking.booking_services.some(service =>
                            selectedStaffIds.includes(service.user_id.toString())
                        );
                    }
                    return false;
                });
                bookingEvents = BookingService.convertBookingsToEvents(filteredBookings);

                // Filter time offs by staff ID
                const filteredTimeOffs = cachedTimeOffs.filter(timeOff =>
                    timeOff.user && selectedStaffIds.includes(timeOff.user.id.toString())
                );
                timeOffEvents = BookingService.convertTimeOffsToEvents(filteredTimeOffs);
            } else {
                // No filtering, use all cached data
                bookingEvents = BookingService.convertBookingsToEvents(cachedBookings);
                timeOffEvents = BookingService.convertTimeOffsToEvents(cachedTimeOffs);
            }

            // Combine both types of events
            const calendarEvents = [...bookingEvents, ...timeOffEvents];

            // Create time column first
            const timeColumn = document.createElement('div');
            timeColumn.className = 'time-column';

            // Add header to time column
            const timeHeader = document.createElement('div');
            timeHeader.className = 'time-header';
            timeHeader.innerHTML = '&nbsp;'; // Empty header for time column
            timeColumn.appendChild(timeHeader);

            // Generate time slots (limited to configured hours)
            for (let hour = calendarConfig.startHour; hour <= calendarConfig.endHour; hour++) {
                const timeSlot = document.createElement('div');
                timeSlot.className = 'time-slot';
                timeSlot.textContent = Utils.formatTime(hour, 0);
                // timeSlot.style.height = 'var(--time-slot-height)';
                timeColumn.appendChild(timeSlot);
            }

            calendarGrid.appendChild(timeColumn);

            // Create day columns
            const today = new Date(date);

            // Generate 7 day columns (3 before today, today, 3 after today)
            for (let i = 0; i < 7; i++) {
                const currentDateInLoop = new Date(startDate);
                currentDateInLoop.setDate(startDate.getDate() + i);
                const isToday = currentDateInLoop.toDateString() === (new Date()).toDateString();

                const dayColumn = document.createElement('div');
                dayColumn.className = `day-column ${isToday ? 'today' : ''}`;

                // Create day header
                const dayHeader = document.createElement('div');
                dayHeader.className = 'day-header';

                const dayName = document.createElement('div');
                dayName.className = 'day-name';
                dayName.textContent = Utils.formatDisplayDate(currentDateInLoop, { weekday: 'short'});


                const dayDate = document.createElement('div');
                dayDate.className = 'day-date';
                dayDate.textContent = Utils.formatDisplayDate(currentDateInLoop, { month: 'short', day: 'numeric'});

                if(isToday) {
                    const todayBadge = document.createElement('span')
                    todayBadge.className = 'today-badge';
                    todayBadge.textContent = 'Today';
                    dayDate.appendChild(todayBadge);
                }

                dayHeader.appendChild(dayName);
                dayHeader.appendChild(dayDate);
                dayColumn.appendChild(dayHeader);

                // Container for the slots
                const slotsContainer = document.createElement('div');
                slotsContainer.className = 'slots-container';

                // Generate hour slots for the configured range
                for (let hour = calendarConfig.startHour; hour <= calendarConfig.endHour; hour++) {
                    const hourContainer = document.createElement('div');
                    hourContainer.className = 'hour-container';
                    hourContainer.dataset.hour = hour;

                    // Create 4 slots for each hour (15-min intervals)
                    for (let quarter = 0; quarter < 4; quarter++) {
                        const slot = document.createElement('div');
                        slot.className = 'time-quarter-slot';
                        slot.dataset.hour = hour;
                        slot.dataset.minute = quarter * 15;
                        slot.dataset.time = Utils.formatTime(hour, quarter * 15);

                        // Add click event to show slot action popup
                        slot.addEventListener('click', function(e) {
                            // Store date information for the clicked slot
                            const slotDate = new Date(currentDateInLoop);
                            slotDate.setHours(hour, quarter * 15, 0, 0);

                            // Show slot action popup
                            UI.showSlotActionPopup(slotDate, e.clientX, e.clientY);
                        });

                        hourContainer.appendChild(slot);
                    }

                    slotsContainer.appendChild(hourContainer);
                }

                dayColumn.appendChild(slotsContainer);

                // Filter events for this day
                const dayEvents = calendarEvents.filter(event => {
                    return event.start.toDateString() === currentDateInLoop.toDateString();
                });

                // Add events to the day column
                dayEvents.forEach(event => {
                    const eventElement = createEventElement(event, currentDateInLoop);
                    if (eventElement) {
                        // Add the event to the slots container instead of the day column
                        slotsContainer.appendChild(eventElement);
                    }
                });

                calendarGrid.appendChild(dayColumn);
            }
        } catch (error) {
            console.error('Error rendering calendar:', error);
            // Display error message to user
            calendarGrid.innerHTML = '<div style="padding: 20px; text-align: center;">Error loading calendar data. Please try again later.</div>';
        } finally {
            // Hide loading spinner regardless of success or failure
            Utils.toggleSpinner(false);
        }
    };

    // Create event element and position it on the calendar
    const createEventElement = (event, day) => {
        if (event.start.toDateString() !== day.toDateString()) return null;

        const startHour = event.start.getHours();
        const startMinute = event.start.getMinutes();

        // Skip events outside the configured time range
        if (startHour < calendarConfig.startHour || startHour > calendarConfig.endHour) {
            return null;
        }

        const endHour = event.end.getHours();
        const endMinute = event.end.getMinutes();

        // Adjust position calculation based on the configured start hour
        const hourOffset = calendarConfig.startHour;
        // Height per 15min slot (matches CSS: 768px for 12 hours, 48 slots)
        const slotHeight = 16;

        // Calculate position relative to the start of the displayed calendar (8:00)
        const startPosition = ((startHour - hourOffset) * 60 + startMinute) / calendarConfig.intervalMinutes * slotHeight;
        let endPosition;

        if (endHour > calendarConfig.endHour) {
            // Cap events that extend beyond the visible range
            endPosition = (calendarConfig.endHour - hourOffset + 1) * 60 / calendarConfig.intervalMinutes * slotHeight;
        } else {
            endPosition = ((endHour - hourOffset) * 60 + endMinute) / calendarConfig.intervalMinutes * slotHeight;
        }

        const height = endPosition - startPosition;

        const eventElement = document.createElement('div');
        eventElement.className = `event ${event.color || ''}`;
        eventElement.style.top = `${startPosition}px`;
        eventElement.style.height = `${height}px`;
        // Position events relative to the slots container, not the day column
        eventElement.style.position = 'absolute';
        eventElement.style.left = '0';
        eventElement.style.right = '0';
        // Make event clickable
        eventElement.style.cursor = 'pointer';

        // Format the event content
        const eventTime = `${Utils.formatTime(startHour, startMinute)} - ${Utils.formatTime(Math.min(endHour, calendarConfig.endHour), endHour > calendarConfig.endHour ? 0 : endMinute)}`;

        const eventTitle = document.createElement('div');
        eventTitle.className = 'event-title';
        eventTitle.textContent = event.title;

        const eventTimeElement = document.createElement('div');
        eventTimeElement.className = 'event-time';
        eventTimeElement.textContent = eventTime;

        eventElement.appendChild(eventTitle);
        eventElement.appendChild(eventTimeElement);

        if (event.description) {
            const descriptions = event.description.split('\n');
            descriptions.forEach(desc => {
                if (desc.trim()) {
                    const descElement = document.createElement('div');
                    descElement.className = 'event-description';
                    descElement.textContent = desc;
                    eventElement.appendChild(descElement);
                }
            });
        }

        // Add click event to show the popup
        eventElement.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent click from reaching elements underneath
            UI.showEventPopup(event, e.clientX, e.clientY);
        });

        return eventElement;
    };

    // Initialize calendar with proper waiting for async operations
    const init = async () => {
        console.log('Calendar initialization started');
        try {
            // Check if the calendar container exists
            const calendarGrid = document.querySelector('.calendar-grid');
            if (!calendarGrid) {
                console.error('Calendar grid element not found');
                return;
            }

            // Clear any existing content in the calendar grid to prevent duplicates
            calendarGrid.innerHTML = '';

            // Ensure we wait for the DOM to be fully loaded
            await new Promise(resolve => {
                if (document.readyState === 'complete') {
                    resolve();
                } else {
                    window.addEventListener('load', resolve);
                }
            });

            console.log('Rendering calendar for date:', currentDate);
            await renderCalendar(currentDate);
            console.log('Calendar rendering completed');
            
            // Setup calendar navigation
            setupNavigation();
        } catch (error) {
            console.error('Error initializing calendar:', error);
        }
    };

    // Setup calendar navigation buttons
    const setupNavigation = () => {
        // Previous week button
        document.getElementById('prev-week')?.addEventListener('click', async function() {
            currentDate.setDate(currentDate.getDate() - 7);
            await renderCalendar(currentDate);
        });

        // Next week button
        document.getElementById('next-week')?.addEventListener('click', async function() {
            currentDate.setDate(currentDate.getDate() + 7);
            await renderCalendar(currentDate);
        });
    };

    return {
        init,
        renderCalendar,
        getConfig: () => calendarConfig,
        getCurrentDate: () => currentDate,
        refreshCalendar: async (options = {}) => {
            if (options.selectedStaffIds !== undefined) {
                selectedStaffIds = options.selectedStaffIds;
            }
            await renderCalendar(currentDate);
        }
    };
})();

// Export the Calendar module
window.Calendar = Calendar;
