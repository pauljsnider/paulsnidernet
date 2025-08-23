/**
 * Junior Current Website
 * 2025 Season Schedule (Spring + Fall)
 */

// 2025 Season Game data array - Updated from TeamSnap calendar
const games = [
    {
        date: "Mar 1",
        opponent: "Blue Starfish",
        time: "12:00 PM",
        location: "Compass Minerals Field #4",
        result: "Win",
        score: "5-1",
        isExhibition: false,
        isPast: true
    },
    {
        date: "Mar 7",
        opponent: "Undercurrent",
        time: "6:00 PM",
        location: "Scheels Complex #12S",
        result: "Loss",
        score: "3-5",
        isExhibition: false,
        isPast: true
    },
    {
        date: "Mar 9",
        opponent: "Thundercats",
        time: "3:00 PM",
        location: "Scheels Complex #12S",
        result: "Win",
        score: "2-1",
        isExhibition: false,
        isPast: true
    },
    {
        date: "Mar 30",
        opponent: "Shooting Stars",
        time: "9:00 AM",
        location: "Olathe Complex #6N",
        result: "Win",
        score: "4-1",
        isExhibition: false,
        isPast: true
    },
    {
        date: "Apr 4",
        opponent: "Blue Starfish",
        time: "5:00 PM",
        location: "Olathe Complex #6S",
        result: "Loss",
        score: "2-3",
        isExhibition: false,
        isPast: true
    },
    {
        date: "Apr 27",
        opponent: "Undercurrent",
        time: "11:00 AM",
        location: "Scheels Complex #12N",
        result: "Loss",
        score: "0-1",
        isExhibition: false,
        isPast: true
    },
    {
        date: "May 3",
        opponent: "Shooting Stars",
        time: "9:00 AM",
        location: "Compass Minerals Field #4",
        result: "Loss",
        score: "0-1",
        isExhibition: false,
        isPast: true
    },
    {
        date: "May 17",
        opponent: "Thundercats",
        time: "9:00 AM",
        location: "Olathe Complex #6N",
        result: "Loss",
        score: "0-1",
        isExhibition: false,
        isPast: true
    },
    {
        date: "Aug 23",
        opponent: "Wolves",
        time: "2:00 PM",
        location: "Scheels Complex #8 S",
        result: null,
        score: null,
        isExhibition: false,
        isPast: false
    },
    {
        date: "Aug 24",
        opponent: "Blue Starfish",
        time: "2:15 PM",
        location: "Scheels Complex #8 N",
        result: null,
        score: null,
        isExhibition: false,
        isPast: false
    },
    {
        date: "Sep 7",
        opponent: "Hawks",
        time: "9:15 AM",
        location: "Scheels Complex #7 S",
        result: null,
        score: null,
        isExhibition: false,
        isPast: false
    },
    {
        date: "Sep 20",
        opponent: "Wolves",
        time: "7:15 PM",
        location: "Compass Minerals Field #1 S",
        result: null,
        score: null,
        isExhibition: false,
        isPast: false
    },
    {
        date: "Sep 26",
        opponent: "Storm Dooley",
        time: "7:30 PM",
        location: "Scheels Complex #8 S",
        result: null,
        score: null,
        isExhibition: false,
        isPast: false
    },
    {
        date: "Oct 12",
        opponent: "Hawks",
        time: "10:30 AM",
        location: "Scheels Complex #8 S",
        result: null,
        score: null,
        isExhibition: false,
        isPast: false
    },
    {
        date: "Oct 17",
        opponent: "Blue Starfish",
        time: "5:00 PM",
        location: "Scheels Complex #7 S",
        result: null,
        score: null,
        isExhibition: false,
        isPast: false
    },
    {
        date: "Oct 19",
        opponent: "Storm Dooley",
        time: "10:30 AM",
        location: "Scheels Complex #8 S",
        result: null,
        score: null,
        isExhibition: false,
        isPast: false
    }
];

/**
 * Helper function to format date from YYYY-MM-DD to "Mon DD" format
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {string} - Formatted date string
 */
function formatGameDate(dateString) {
    try {
        const date = new Date(dateString + 'T12:00:00'); // Add time to avoid timezone issues
        const options = { month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    } catch (error) {
        console.error('Error formatting date:', error);
        return dateString;
    }
}

/**
 * Helper function to format time from 24-hour to 12-hour format with Central Time
 * @param {string} timeString - Time in HH:MM format
 * @returns {string} - Formatted time string
 */
function formatGameTime(timeString) {
    try {
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    } catch (error) {
        console.error('Error formatting time:', error);
        return timeString;
    }
}

/**
 * Helper function to determine if a game date is in the past
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {boolean} - True if date is in the past
 */
function isDateInPast(dateString) {
    try {
        const gameDate = new Date(dateString + 'T23:59:59'); // End of game day
        const today = new Date();
        return gameDate < today;
    } catch (error) {
        console.error('Error checking date:', error);
        return false;
    }
}

/**
 * Get result class for styling
 * @param {string} result - Game result (Win, Loss, Tie)
 * @param {boolean} isExhibition - Whether the game is an exhibition match
 * @returns {string} - CSS class name
 */
function getResultClass(result, isExhibition) {
    if (isExhibition) return 'result-exhibition';
    
    switch(result) {
        case 'Win':
            return 'result-win';
        case 'Loss':
            return 'result-loss';
        case 'Tie':
            return 'result-tie';
        default:
            return '';
    }
}

/**
 * Generate HTML for schedule table
 * @param {string} filter - Filter games by status (all, past, upcoming)
 */
function generateSchedule(filter = 'all') {
    const scheduleContainer = document.querySelector('.schedule-table');
    
    if (!scheduleContainer) {
        console.error('Schedule container not found');
        return;
    }
    
    // Filter games if needed
    let filteredGames;
    switch(filter) {
        case 'past':
            filteredGames = games.filter(game => game.isPast);
            break;
        case 'upcoming':
            filteredGames = games.filter(game => !game.isPast);
            break;
        default:
            filteredGames = games;
    }
    
    // Create table structure
    let tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Opponent</th>
                    <th>Time</th>
                    <th>Location</th>
                    <th>Result</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    // Generate table rows
    filteredGames.forEach(game => {
        const resultClass = getResultClass(game.result, game.isExhibition);
        const resultText = game.result ? `${game.result} ${game.score}` : 'Upcoming';
        
        tableHTML += `
            <tr>
                <td>${game.date}</td>
                <td>${game.opponent}${game.isExhibition ? ' (Exhibition)' : ''}</td>
                <td>${game.time}</td>
                <td>${game.location}</td>
                <td><span class="game-result ${resultClass}">${resultText}</span></td>
            </tr>
        `;
    });
    
    tableHTML += `
            </tbody>
        </table>
    `;
    
    scheduleContainer.innerHTML = tableHTML;
}

/**
 * Initialize the schedule page
 */
function initSchedulePage() {
    // Generate initial schedule - start with upcoming games
    generateSchedule('upcoming');
    
    // Set up filter buttons
    const filterButtons = document.querySelectorAll('.schedule-filters .filter-btn');
    
    // Set the upcoming button as active by default
    filterButtons.forEach(btn => {
        if (btn.getAttribute('data-filter') === 'upcoming') {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Update active button
            // Update active button
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Filter schedule
            const filter = this.getAttribute('data-filter');
            generateSchedule(filter);
        });
    });
}

// Initialize when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initSchedulePage);