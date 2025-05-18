/**
 * Junior Current Website
 * Schedule Page Functionality
 */

// Game data array
const games = [
    {
        date: "Mar 9",
        opponent: "Dolphins",
        time: "2:00 PM",
        location: "Olathe 6N",
        result: "Win",
        score: "5-1",
        isExhibition: false,
        isPast: true
    },
    {
        date: "Mar 16",
        opponent: "Thunder Cats",
        time: "10:00 AM",
        location: "Olathe 6S",
        result: "Win",
        score: "2-1",
        isExhibition: false,
        isPast: true
    },
    {
        date: "Mar 23",
        opponent: "Lightning Bolts",
        time: "3:00 PM",
        location: "Blue Valley Rec",
        result: "Tie",
        score: "2-2",
        isExhibition: false,
        isPast: true
    },
    {
        date: "Mar 30",
        opponent: "Unknown Opponent",
        time: "12:00 PM",
        location: "OP Soccer Park",
        result: "Win",
        score: "4-1",
        isExhibition: false,
        isPast: true
    },
    {
        date: "Apr 6",
        opponent: "Shooting Stars",
        time: "12:00 PM",
        location: "Olathe Complex",
        result: "Loss",
        score: "2-3",
        isExhibition: false,
        isPast: true
    },
    {
        date: "Apr 13",
        opponent: "Under Current",
        time: "11:00 AM",
        location: "Overland Turf",
        result: "Loss",
        score: "3-5",
        isExhibition: false,
        isPast: true
    },
    {
        date: "Apr 20",
        opponent: "Shooting Stars",
        time: "3:00 PM",
        location: "OP Fieldhouse",
        result: "Loss",
        score: "0-1",
        isExhibition: false,
        isPast: true
    },
    {
        date: "May 4",
        opponent: "Thunder Cats",
        time: "9:00 AM",
        location: "Olathe 6N",
        result: "Loss",
        score: "0-1",
        isExhibition: false,
        isPast: true
    },
    {
        date: "May 11",
        opponent: "Dads",
        time: "9:00 AM",
        location: "Coach Paul's Field",
        result: "Win",
        score: "10-9",
        isExhibition: true,
        isPast: true
    },
    {
        date: "May 25",
        opponent: "Summer Cup Qualifier",
        time: "10:00 AM",
        location: "Overland Park Complex",
        result: null,
        score: null,
        isExhibition: false,
        isPast: false
    },
    {
        date: "Jun 8",
        opponent: "Regional All-Stars",
        time: "1:00 PM",
        location: "Blue Valley Sportsplex",
        result: null,
        score: null,
        isExhibition: false,
        isPast: false
    }
];

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
    // Generate initial schedule
    generateSchedule();
    
    // Set up filter buttons
    const filterButtons = document.querySelectorAll('.schedule-filters .filter-btn');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
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