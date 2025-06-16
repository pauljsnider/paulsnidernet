import ICAL from 'https://unpkg.com/ical.js/dist/ical.min.js';

const calendarUrls = [
    'webcal://api.team-manager.gc.com/ics-calendar-documents/user/d12bc6ff-2ff0-4fcd-890f-50c83aa3b6fb.ics?teamId=14fc4b07-0a50-40ca-8638-d98fabadf2ac&token=ce63ea78e93257104d01ccec49168d26232b1f54a28e3200d60efa26e494af9f',
    'webcal://api.team-manager.gc.com/ics-calendar-documents/user/d12bc6ff-2ff0-4fcd-890f-50c83aa3b6fb.ics?teamId=92ab5698-7edf-4952-8491-cf0a761efc2f&token=637cf510e4f91ac422f17bb63a89d0262c2b3eae6dc5f21e5a2e411975cf0085'
];

window.calendarEvents = [];
window.processingErrors = [];

// Function to append error messages to the container
function reportErrorToUI(message) {
    window.processingErrors.push(message);
    // Render immediately to show errors as they happen, will be cleared/updated by renderCalendarEvents
    if (window.renderCalendarEvents) {
        window.renderCalendarEvents();
    }
}

// Function to fetch ICS data
async function fetchICS(url) {
    const usableUrl = url.replace('webcal://', 'https://');
    console.log(`Fetching ICS from ${usableUrl}`);
    try {
        const response = await fetch(usableUrl);
        if (!response.ok) {
            const errorMsg = `Error loading calendar: ${url}. Status: ${response.status} ${response.statusText}`;
            console.error(errorMsg);
            reportErrorToUI(errorMsg);
            return null;
        }
        console.log(`Successfully fetched ${url}`);
        return await response.text();
    } catch (error) {
        const errorMsg = `Network error fetching ICS from ${url}: ${error.message}`;
        console.error(errorMsg, error);
        reportErrorToUI(errorMsg);
        return null;
    }
}

// Function to parse ICS data
function parseICS(icsData, url) {
    if (!icsData) return null;
    console.log(`Parsing ICS data for ${url}`);
    try {
        const parsed = ICAL.parse(icsData);
        console.log(`Successfully parsed ICS for ${url}`);
        return parsed;
    } catch (error) {
        const errorMsg = `Error parsing calendar data for ${url}: ${error.message}`;
        console.error(errorMsg, error);
        reportErrorToUI(errorMsg);
        return null;
    }
}

// Function to extract relevant event details
function extractEventDetails(event) {
    return {
        summary: event.summary,
        startDate: event.startDate.toString(),
        endDate: event.endDate.toString(),
        description: event.description || '',
        location: event.location || ''
    };
}

// Main function to process calendars
async function processCalendars() {
    console.log("Starting to process calendars...");
    window.calendarEvents = []; // Reset events
    window.processingErrors = []; // Reset errors

    const now = ICAL.Time.now();
    const nextYear = new ICAL.Time(now);
    nextYear.year += 1;

    for (const url of calendarUrls) {
        try {
            const icsData = await fetchICS(url);
            if (icsData) {
                const jcalData = parseICS(icsData, url);
                if (jcalData) {
                    const component = new ICAL.Component(jcalData);
                    const vevents = component.getAllSubcomponents('vevent');
                    console.log(`Found ${vevents.length} vevents in ${url}`);

                    vevents.forEach(vevent => {
                        const event = new ICAL.Event(vevent);

                        if (event.isRecurring()) {
                            const iterator = event.iterator(now);
                            let nextOcc;
                            let count = 0;
                            while ((nextOcc = iterator.next()) && nextOcc.compare(nextYear) <= 0 && count < 1000) { // Limit occurrences
                                const occurrence = event.getOccurrenceDetails(nextOcc);
                                window.calendarEvents.push({
                                    summary: occurrence.summary || event.summary, // Fallback to main event summary
                                    startDate: occurrence.startDate.toString(),
                                    endDate: occurrence.endDate.toString(),
                                    description: occurrence.description || event.description || '',
                                    location: occurrence.location || event.location || ''
                                });
                                count++;
                            }
                        } else {
                            if (event.endDate.compare(now) >= 0) {
                                 window.calendarEvents.push(extractEventDetails(event));
                            }
                        }
                    });
                }
            }
        } catch (error) {
            const errorMsg = `Unexpected error processing calendar ${url}: ${error.message}`;
            console.error(errorMsg, error);
            reportErrorToUI(errorMsg);
        }
    }

    // Sort events by start date
    window.calendarEvents.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    console.log("Processed and sorted events:", window.calendarEvents.length, "events found.");
    console.log("Processing errors:", window.processingErrors);

    // Trigger rendering
    if (window.renderCalendarEvents) {
        window.renderCalendarEvents();
    } else {
        console.error("renderCalendarEvents function not found when processCalendars completed.");
    }
}

// Function to render events to the page (will be defined/appended in the next step, but declare for clarity)
window.renderCalendarEvents = function() {
    console.log('Rendering events and errors...'); // <-- ADDED
    const container = document.getElementById('calendar-container');
    if (!container) {
        console.error('Calendar container not found for rendering.');
        return;
    }

    container.innerHTML = ''; // Clear loading message or previous content

    // Display any processing errors
    if (window.processingErrors.length > 0) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'calendar-errors';
        errorDiv.innerHTML = '<h4>There were issues loading calendar data:</h4>';
        const errorUl = document.createElement('ul');
        window.processingErrors.forEach(errMsg => {
            const errorLi = document.createElement('li');
            errorLi.textContent = errMsg;
            errorUl.appendChild(errorLi);
        });
        errorDiv.appendChild(errorUl);
        container.appendChild(errorDiv);
    }

    const events = window.calendarEvents;

    if (!events || events.length === 0) {
        if (window.processingErrors.length === 0) { // Only show "no events" if there were no errors
            container.innerHTML += '<p>No upcoming events found in the calendars.</p>';
        }
        console.log('Finished rendering (no events or only errors).'); // <-- MODIFIED for clarity
        return;
    }

    const ul = document.createElement('ul');
    ul.className = 'calendar-event-list';

    events.forEach(event => {
        const li = document.createElement('li');
        li.className = 'calendar-event-item';

        const summary = document.createElement('h3');
        summary.textContent = event.summary || 'No Title'; // Fallback for summary
        li.appendChild(summary);

        const formatEventDate = (dateString) => {
            const date = new Date(dateString);
            return date.toLocaleString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });
        };

        const dateTime = document.createElement('p');
        dateTime.className = 'event-datetime';
        try {
            const startDate = formatEventDate(event.startDate);
            const endDate = formatEventDate(event.endDate);
            dateTime.innerHTML = `<strong>Starts:</strong> ${startDate}<br><strong>Ends:</strong> ${endDate}`;
        } catch (e) {
            console.error("Error formatting date for event:", event, e);
            dateTime.innerHTML = `<strong>Date Error:</strong> Could not format event dates.`;
        }
        li.appendChild(dateTime);

        if (event.location) {
            const location = document.createElement('p');
            location.className = 'event-location';
            location.innerHTML = `<strong>Location:</strong> ${event.location}`;
            li.appendChild(location);
        }

        if (event.description) {
            const descriptionContainer = document.createElement('div'); // Use a div for better control
            descriptionContainer.className = 'event-description';

            const fullDescription = event.description;
            const shortDescription = fullDescription.length > 150 ? fullDescription.substring(0, 150) + '...' : fullDescription;

            const descriptionText = document.createElement('span'); // Span for the text part
            descriptionText.innerHTML = `<strong>Description:</strong> ${shortDescription}`;
            descriptionContainer.appendChild(descriptionText);

            if (fullDescription.length > 150) {
                const toggleLink = document.createElement('a');
                toggleLink.href = '#';
                toggleLink.textContent = ' Read more';
                toggleLink.style.marginLeft = '5px'; // Add some space
                toggleLink.onclick = (e) => {
                    e.preventDefault();
                    if (toggleLink.textContent === ' Read more') {
                        descriptionText.innerHTML = `<strong>Description:</strong> ${fullDescription}`;
                        toggleLink.textContent = ' Read less';
                    } else {
                        descriptionText.innerHTML = `<strong>Description:</strong> ${shortDescription}`;
                        toggleLink.textContent = ' Read more';
                    }
                };
                descriptionContainer.appendChild(toggleLink);
            }
            li.appendChild(descriptionContainer);
        }

        ul.appendChild(li);
    });

    container.appendChild(ul);
    console.log('Finished rendering.'); // <-- ADDED
};


// Initial call to process calendars
document.addEventListener('DOMContentLoaded', () => {
    const initialLoadingMessage = document.querySelector('#calendar-container p');
    if (initialLoadingMessage && initialLoadingMessage.textContent.includes('Loading calendars...')) {
        // Potentially update loading message or keep it
    }
    processCalendars();
});
