/**
 * Junior Current Website
 * Roster Page Functionality
 */

// Player data array
const players = [
    {
        name: "Audrey",
        position: "Striker",
        secondaryPosition: "Forward",
        description: "Fierce, focused, and fearless in front of goal, Audrey brings a striker's mentality and sharp instincts.",
        positionCategory: "forward",
        photoUrl: "Images/roster/audry.jpg"
    },
    {
        name: "Payton",
        position: "Midfielder",
        secondaryPosition: "Winger",
        description: "A visionary playmaker, Payton sees passing lanes others miss and sets the tempo for the team.",
        positionCategory: "midfielder",
        photoUrl: "Images/roster/payton.jpg"
    },
    {
        name: "Teagan",
        position: "Center Back",
        secondaryPosition: "Goalkeeper",
        description: "Solid and steady, Teagan is the backbone of the defense and leads with quiet strength.",
        positionCategory: "defender",
        photoUrl: "Images/roster/tegan.jpg"
    },
    {
        name: "Neda",
        position: "Goalkeeper",
        secondaryPosition: "Center Back",
        description: "Calm under pressure, Neda brings focus and power to the goal box with confident decision-making.",
        positionCategory: "goalkeeper",
        photoUrl: "Images/roster/neda.jpg"
    },
    {
        name: "Saavya",
        position: "Midfield",
        secondaryPosition: "Utility Player",
        description: "A true team player, Saavya can step into any position with composure and grit.",
        positionCategory: "midfielder",
        photoUrl: "Images/roster/saavya.jpg"
    },
    {
        name: "Livy",
        position: "Defender",
        secondaryPosition: "Midfielder",
        description: "Steady and thoughtful, Livy supports her teammates with smart play and strong positioning.",
        positionCategory: "defender",
        photoUrl: "Images/roster/livi.jpg"
    },
    {
        name: "Madison",
        position: "Forward",
        secondaryPosition: "Midfielder",
        description: "Energetic and vocal, Madison pushes the team forward with her relentless pace and presence.",
        positionCategory: "forward",
        photoUrl: "Images/roster/madison.jpg"
    },
    {
        name: "Riley",
        position: "Midfield",
        secondaryPosition: "Striker",
        description: "Creative and confident, Riley brings flair and rhythm to the field with her footwork and movement.",
        positionCategory: "midfielder",
        photoUrl: "Images/roster/riley.jpg"
    },
    {
        name: "Adeline",
        position: "Outside Back",
        secondaryPosition: "Midfield",
        description: "High-energy and fearless, Adeline is known for her tenacity and love for the game.",
        positionCategory: "defender",
        photoUrl: "Images/roster/adaline.jpg"
    },
    {
        name: "Emmie",
        position: "Midfielder",
        secondaryPosition: "Forward",
        description: "Tireless and selfless, Emmie is everywhere—pressing, passing, and leading by example.",
        positionCategory: "midfielder",
        photoUrl: "Images/roster/emmie.jpg"
    },
    {
        name: "Sela",
        position: "Midfielder",
        secondaryPosition: "Goalkeeper",
        description: "Smart and intuitive, Sela has a game sense that allows her to shine in key moments.",
        positionCategory: "midfielder",
        photoUrl: "Images/roster/Sela.jpg"
    }
];

/**
 * Get position-specific icon class
 * @param {string} positionCategory - Player's position category
 * @returns {string} - Font Awesome icon class
 */
function getPositionIcon(positionCategory) {
    switch(positionCategory) {
        case 'forward':
            return 'fa-person-running';
        case 'midfielder':
            return 'fa-futbol';
        case 'defender':
            return 'fa-shield-halved';
        case 'goalkeeper':
            return 'fa-hands-catching';
        default:
            return 'fa-user';
    }
}

/**
 * Get position-specific color
 * @param {string} positionCategory - Player's position category
 * @returns {string} - CSS color variable
 */
function getPositionColor(positionCategory) {
    switch(positionCategory) {
        case 'forward':
            return 'var(--red)';
        case 'midfielder':
            return 'var(--light-teal)';
        case 'defender':
            return 'var(--navy-blue)';
        case 'goalkeeper':
            return 'var(--dark-teal)';
        default:
            return 'var(--navy-blue)';
    }
}

/**
 * Generate HTML for player cards
 * @param {string} positionFilter - Filter players by position category
 */
function generatePlayerCards(positionFilter = 'all') {
    const playerCardsContainer = document.querySelector('.player-cards');
    
    if (!playerCardsContainer) {
        console.error('Player cards container not found');
        return;
    }
    
    // Clear any existing content
    playerCardsContainer.innerHTML = '';
    
    // Filter players if needed
    const filteredPlayers = positionFilter === 'all' 
        ? players 
        : players.filter(player => player.positionCategory === positionFilter);
    
    // Generate player cards
    filteredPlayers.forEach(player => {
        const playerCard = document.createElement('div');
        playerCard.className = 'player-card';
        playerCard.setAttribute('data-position', player.positionCategory);
        
        // Get position-specific styling
        const iconClass = getPositionIcon(player.positionCategory);
        const positionColor = getPositionColor(player.positionCategory);
        
        // Determine whether to use photo or icon
        let imageContent;
        if (player.photoUrl) {
            imageContent = `<img src="${player.photoUrl}" alt="${player.name} - ${player.position}" class="player-photo">`;
        } else {
            imageContent = `<i class="fas ${iconClass} player-icon" style="color: ${positionColor};"></i>`;
        }
        
        playerCard.innerHTML = `
            <div class="player-image ${!player.photoUrl ? 'player-icon-container' : ''}" ${!player.photoUrl ? `style="background-color: ${positionColor}40;"` : ''}>
                ${imageContent}
            </div>
            <div class="player-info">
                <h3 class="player-name">${player.name}</h3>
                <p class="player-position">${player.position} / ${player.secondaryPosition}</p>
                <p class="player-description">${player.description}</p>
            </div>
        `;
        
        playerCardsContainer.appendChild(playerCard);
    });
}

/**
 * Initialize the roster page
 */
function initRosterPage() {
    // Generate initial player cards
    generatePlayerCards();
    
    // Set up position filters
    const filterButtons = document.querySelectorAll('.roster-filters .filter-btn');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Update active button
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Filter players
            const positionFilter = this.getAttribute('data-position');
            generatePlayerCards(positionFilter);
        });
    });
    
    // Add event listeners for player cards
    document.addEventListener('click', function(e) {
        const playerCard = e.target.closest('.player-card');
        if (playerCard) {
            // Could expand to show more player details in the future
            playerCard.classList.toggle('expanded');
        }
    });
}

// Initialize when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initRosterPage);