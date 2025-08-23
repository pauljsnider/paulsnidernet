/**
 * Junior Current Website
 * Spring 2025 Season Archive
 * Final Record: 3-1-4 (3 Wins, 1 Tie, 4 Losses)
 */

// Spring 2025 Game data archive
const spring2025Games = [
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

// Export for potential future use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { spring2025Games };
}