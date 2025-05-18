/**
 * Junior Current Website
 * Awards Page Functionality
 */

// Award data array
const awards = [
    {
        title: "Golden Boot",
        recipient: "Audrey",
        description: "Awarded to the team's top goal scorer for exceptional finishing ability and offensive impact."
    },
    {
        title: "Assist Queen",
        recipient: "Payton",
        description: "Recognizes the player who created the most scoring opportunities through precise passing and vision."
    },
    {
        title: "Defensive Rock",
        recipient: "Teagan",
        description: "Honors the defender whose consistent performance formed the foundation of the team's defensive structure."
    },
    {
        title: "Goalkeeper of the Year",
        recipient: "Neda",
        description: "Celebrates exceptional shot-stopping ability, command of the penalty area, and leadership from the back."
    },
    {
        title: "Most Versatile Player",
        recipient: "Saavya",
        description: "Recognizes the player who excelled in multiple positions, demonstrating tactical flexibility and diverse skills."
    },
    {
        title: "Most Improved Player",
        recipient: "Livy",
        description: "Honors the player who showed the greatest development in skills, game understanding, and overall performance."
    },
    {
        title: "Clutch Player of the Year",
        recipient: "Madison",
        description: "Awarded to the player who consistently performed at her best in critical moments and high-pressure situations."
    },
    {
        title: "Comeback Player of the Year",
        recipient: "Riley",
        description: "Celebrates resilience and determination in overcoming challenges to return to top form."
    },
    {
        title: "Sparkplug Award",
        recipient: "Adeline",
        description: "Recognizes the player whose energy, enthusiasm, and effort consistently lifted the team's performance."
    },
    {
        title: "Iron Woman",
        recipient: "Emmie",
        description: "Honors exceptional durability, consistency, and reliability throughout the season."
    },
    {
        title: "Game Changer",
        recipient: "Sela",
        description: "Awarded to the player whose contributions regularly altered the course of matches in the team's favor."
    }
];

/**
 * Generate HTML for award cards
 */
function generateAwardCards() {
    const awardCardsContainer = document.querySelector('.award-cards');
    
    if (!awardCardsContainer) {
        console.error('Award cards container not found');
        return;
    }
    
    // Generate award cards
    awards.forEach(award => {
        const awardCard = document.createElement('div');
        awardCard.className = 'award-card';
        
        awardCard.innerHTML = `
            <div class="award-title">${award.title}</div>
            <div class="award-recipient">${award.recipient}</div>
            <div class="award-description">${award.description}</div>
        `;
        
        awardCardsContainer.appendChild(awardCard);
    });
}

// Initialize when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', generateAwardCards);