# Fall 2025 Schedule Setup Instructions

## Overview
The website has been updated for Fall 2025. The Spring 2025 schedule data has been archived in `/archive/spring2025/`.

## Schedule Data Source
Calendar URL: http://ical-cdn.teamsnap.com/team_schedule/filter/games/01e5fcd1-600c-4114-9b03-c2fe47354f90.ics

## To Update the Schedule:

### Step 1: Get Calendar Data
1. Open the TeamSnap calendar URL in a browser
2. Save the .ics file or copy its content
3. The file contains game data in ICS/iCal format

### Step 2: Parse Game Data
Each game entry in the ICS file will look similar to:
```
BEGIN:VEVENT
DTSTART:20250907T140000Z
DTEND:20250907T150000Z
SUMMARY:Junior Current vs Opponent Name
LOCATION:Field Name, Address
DESCRIPTION:Game details
END:VEVENT
```

### Step 3: Update schedule.js
Replace the empty games array in `/js/schedule.js` with actual game data:

```javascript
const games = [
    {
        date: "Sep 7",           // Format: "Mon DD"
        opponent: "Opponent Name",
        time: "9:00 AM",         // Central Time
        location: "Field Name",
        result: null,            // null until game is played
        score: null,             // null until game is played
        isExhibition: false,     // true for friendly matches
        isPast: false           // false for upcoming games
    },
    // Add more games...
];
```

### Step 4: Update Game Results (After Games Are Played)
For completed games, update:
- `result`: "Win", "Loss", or "Tie"
- `score`: "X-Y" format
- `isPast`: true

## Time Zone Note
All games should be listed in Central Time as specified in the requirements.

## Website Updates Completed
✅ Updated all HTML files from Spring 2025 to Fall 2025
✅ Archived Spring 2025 schedule data
✅ Reset homepage stats for new season
✅ Prepared schedule.js for Fall 2025 data

## Next Steps
1. Populate the games array in schedule.js with actual calendar data
2. Test the schedule page functionality
3. Update game results as the season progresses