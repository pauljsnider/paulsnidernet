import ICAL from 'https://unpkg.com/ical.js/dist/ical.min.js';

const calendarUrls = [
    'webcal://api.team-manager.gc.com/ics-calendar-documents/user/d12bc6ff-2ff0-4fcd-890f-50c83aa3b6fb.ics?teamId=14fc4b07-0a50-40ca-8638-d98fabadf2ac&token=ce63ea78e93257104d01ccec49168d26232b1f54a28e3200d60efa26e494af9f',
    'webcal://api.team-manager.gc.com/ics-calendar-documents/user/d12bc6ff-2ff0-4fcd-890f-50c83aa3b6fb.ics?teamId=92ab5698-7edf-4952-8491-cf0a761efc2f&token=637cf510e4f91ac422f17bb63a89d0262c2b3eae6dc5f21e5a2e411975cf0085'
];

// Function to fetch ICS data, handling webcal:// protocol by replacing it
async function fetchICS(url) {
    const usableUrl = url.replace('webcal://', 'https://');
    try {
        const response = await fetch(usableUrl);
        if (!response.ok) {
            console.error(`Error fetching ICS from ${usableUrl}: ${response.statusText}`);
            return null;
        }
        return await response.text();
    } catch (error) {
        console.error(`Network error fetching ICS from ${usableUrl}:`, error);
        return null;
    }
}

// Function to parse ICS data
function parseICS(icsData) {
    if (!icsData) return null;
    try {
        return ICAL.parse(icsData);
    } catch (error) {
        console.error("Error parsing ICS data:", error);
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
    let allEvents = [];
    const now = ICAL.Time.now();
    const nextYear = new ICAL.Time(now);
    nextYear.year += 1;

    for (const url of calendarUrls) {
        console.log(`Fetching calendar: ${url}`);
        const icsData = await fetchICS(url);
        if (icsData) {
            const jcalData = parseICS(icsData);
            if (jcalData) {
                const component = new ICAL.Component(jcalData);
                const vevents = component.getAllSubcomponents('vevent');

                vevents.forEach(vevent => {
                    const event = new ICAL.Event(vevent);

                    if (event.isRecurring()) {
                        const iterator = event.iterator(now); // Start from now
                        let next;
                        while ((next = iterator.next()) && next.compare(nextYear) <= 0) {
                            const occurrence = event.getOccurrenceDetails(next);
                            allEvents.push({
                                summary: occurrence.summary,
                                startDate: occurrence.startDate.toString(),
                                endDate: occurrence.endDate.toString(),
                                description: occurrence.description || event.description || '',
                                location: occurrence.location || event.location || ''
                            });
                        }
                    } else {
                        // Handle non-recurring events (or single instances if not caught by isRecurring)
                        // Ensure the event is within a reasonable timeframe, e.g., not ended
                        if (event.endDate.compare(now) >= 0) {
                             allEvents.push(extractEventDetails(event));
                        }
                    }
                });
            }
        }
    }

    // Sort events by start date
    allEvents.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    // For now, just log to console. Rendering will be in the next step.
    console.log("Processed and sorted events:", allEvents);

    // Store for access by rendering function (will be defined in next step)
    window.calendarEvents = allEvents;

    // Trigger rendering (function will be defined in next step)
    if (window.renderCalendarEvents) {
        window.renderCalendarEvents();
    }
}

// Start processing when the script loads
processCalendars();

// Function to render events to the page
window.renderCalendarEvents = function() {
    const container = document.getElementById('calendar-container');
    if (!container) {
        console.error('Calendar container not found');
        return;
    }

    container.innerHTML = ''; // Clear loading message or previous content

    const events = window.calendarEvents;

    if (!events || events.length === 0) {
        container.innerHTML = '<p>No events found or calendars are empty.</p>';
        return;
    }

    const ul = document.createElement('ul');
    ul.className = 'calendar-event-list';

    events.forEach(event => {
        const li = document.createElement('li');
        li.className = 'calendar-event-item';

        const summary = document.createElement('h3');
        summary.textContent = event.summary;
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
        const startDate = formatEventDate(event.startDate);
        const endDate = formatEventDate(event.endDate);
        dateTime.innerHTML = `<strong>Starts:</strong> ${startDate}<br><strong>Ends:</strong> ${endDate}`;
        li.appendChild(dateTime);

        if (event.location) {
            const location = document.createElement('p');
            location.className = 'event-location';
            location.innerHTML = `<strong>Location:</strong> ${event.location}`;
            li.appendChild(location);
        }

        if (event.description) {
            const description = document.createElement('p');
            description.className = 'event-description';
            // Truncate long descriptions and add a toggle
            const fullDescription = event.description;
            const shortDescription = fullDescription.length > 150 ? fullDescription.substring(0, 150) + '...' : fullDescription;
            description.innerHTML = `<strong>Description:</strong> ${shortDescription}`;

            if (fullDescription.length > 150) {
                const toggleLink = document.createElement('a');
                toggleLink.href = '#';
                toggleLink.textContent = ' Read more';
                toggleLink.onclick = (e) => {
                    e.preventDefault();
                    if (toggleLink.textContent === ' Read more') {
                        description.innerHTML = `<strong>Description:</strong> ${fullDescription}`;
                        toggleLink.textContent = ' Read less';
                    } else {
                        description.innerHTML = `<strong>Description:</strong> ${shortDescription}`;
                        toggleLink.textContent = ' Read more';
                    }
                    li.appendChild(toggleLink); // Re-append to keep it at the end of description
                };
                description.appendChild(toggleLink);
            }
            li.appendChild(description);
        }

        ul.appendChild(li);
    });

    container.appendChild(ul);
};

// If events were processed before this script part was loaded (e.g. script defer/async issues)
// and processCalendars already ran, call render function now.
if (window.calendarEvents && document.readyState === 'complete') {
    window.renderCalendarEvents();
} else if (window.calendarEvents) {
    // If events are ready but document isn't, wait for DOMContentLoaded
    document.addEventListener('DOMContentLoaded', window.renderCalendarEvents);
}
// If processCalendars hasn't finished, it will call renderCalendarEvents itself.
