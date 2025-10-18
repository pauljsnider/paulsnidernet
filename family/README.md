# Snider Family Calendar System

A unified family calendar system that aggregates events from multiple sources into a single, easy-to-use interface.

## Overview

Managing three kids' schedules across multiple sports platforms, school calendars, and volunteer commitments was becoming unmanageable. This system consolidates everything into one view that the whole family (including grandparents) can access.

## Features

### 📅 Multi-Source Integration
- **TeamSnap** - OAuth integration for Madison and Max's soccer events
- **GameChanger** - Web scraping for Will's baseball schedule
- **Blue Valley Schools** - Public iCal feed integration
- **SignUpGenius** - Volunteer opportunity calendar

### 🎯 Smart Filtering
- **By Child** - Filter events for Will, Madison, Max, or all
- **By Type** - Games, practices, school events, volunteer opportunities
- **By Time** - Today, this week, this month, or all upcoming events

### 📱 Multiple Views
- **List View** - Detailed chronological listing with full event information
- **Calendar Grid** - Traditional monthly calendar view
- **Export** - Generate filtered iCal files for personal calendar import

### 👴 Family Sharing
- Public web interface accessible to extended family
- No login required - perfect for grandparents to stay updated
- Real-time event updates across all sources

## Technical Architecture

### Frontend
- Vanilla JavaScript with responsive CSS
- No frameworks or build process required
- Mobile-friendly responsive design

### Data Integration
- **TeamSnap API** - OAuth 2.0 authentication for reliable access
- **GameChanger Scraping** - Playwright automation for locked-down platform
- **iCal Parsing** - Custom JavaScript parser for calendar feeds
- **CORS Proxy** - Uses cors-anywhere.herokuapp.com for cross-origin requests

### Hosting
- GitHub Pages static hosting
- No server-side processing required
- Automatic updates via GitHub Actions (for scraping components)

## File Structure

```
family/
├── events.html          # Main calendar interface
└── README.md           # This documentation
```

## Configuration

The calendar sources are configured in the `CALENDARS` array within `events.html`:

```javascript
const CALENDARS = [
    {
        id: 'calendar1',
        name: 'Will Soccer',
        url: 'webcal://example.com/calendar.ics',
        enabled: true
    },
    // ... additional calendars
];
```

## Usage

1. **View Events** - Open `events.html` in any web browser
2. **Filter Content** - Use checkboxes to enable/disable specific calendars
3. **Change Views** - Toggle between list and calendar grid views
4. **Export Data** - Generate iCal files for import into personal calendars
5. **Share** - Send the URL to family members for easy access

## API Integration Details

### TeamSnap OAuth
- Proper API integration with refresh token handling
- Reliable access to team schedules and events
- Automatic categorization by team and player

### GameChanger Scraping
- Playwright browser automation
- Scheduled runs to capture updated schedules
- Converts HTML data to iCal format for consistency

### School Calendar
- Direct iCal feed consumption
- Filters for relevant events (holidays, early dismissals, etc.)
- Automatic updates when district publishes changes

## Browser Compatibility

- Modern browsers with ES6+ support
- Mobile responsive design
- Tested on Chrome, Firefox, Safari, and Edge

## Privacy & Security

- No personal data stored on servers
- Calendar URLs are publicly accessible (by design for family sharing)
- OAuth tokens stored locally in browser
- No tracking or analytics beyond basic web server logs

## Future Enhancements

- [ ] Push notifications for upcoming events
- [ ] Integration with additional sports platforms
- [ ] Weather integration for outdoor events
- [ ] Automatic conflict detection across calendars
- [ ] Mobile app wrapper

## Contributing

This is a personal family project, but the code is open source. Feel free to fork and adapt for your own family's needs.

## License

MIT License - Feel free to use and modify for your own family calendar needs.
