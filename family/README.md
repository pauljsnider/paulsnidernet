# Snider Family Calendar System

A unified family calendar system that aggregates events from multiple sources into a single, easy-to-use interface.

## Quick Links

- **Family Calendar Interface**: [https://paulsnider.net/family/events.html](https://paulsnider.net/family/events.html)
- **Combined Calendar Feed**: [https://paulsnider.net/family/family-calendar-combined.ics](https://paulsnider.net/family/family-calendar-combined.ics)

## Overview

Managing three kids' schedules across multiple sports platforms, school calendars, and volunteer commitments was becoming unmanageable. This system consolidates everything into one view that the whole family (including grandparents) can access.

## Features

### 📅 Multi-Source Integration
- **TeamSnap** - OAuth integration for Madison and Max's soccer events
- **GameChanger** - Calendar feeds for Will's soccer and baseball
- **PlayMetrics** - Will's indoor soccer schedule
- **Sprocket Sports** - Max's soccer schedule
- **Email calendar invitations** - Sanitized family events imported from `.ics` attachments
- **SignUpGenius** - Volunteer opportunity calendar
- **Local .ics files** - Madison's Futsal and other manually-created calendars

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

## Combined Calendar Feed

The system automatically combines all calendar sources into a single .ics feed that updates every 6 hours:

```
https://paulsnider.net/family/family-calendar-combined.ics
```

### Current Synced Sources (7 calendars):
- Family Email Events (sanitized calendar invitations)
- Will Soccer (GameChanger calendar subscription)
- Will Soccer - Vipers FC U8B (GameChanger calendar subscription)
- Will Baseball (GameChanger calendar subscriptions)
- Will Indoor Soccer (PlayMetrics)
- TeamSnap Events (Madison + Max + Will)
- Max Soccer - Major Derek (Sprocket Sports)

### How It Works
- GitHub Action runs every 6 hours automatically
- Fetches all remote calendars
- Loads checked-in family email events
- Merges events and removes duplicates
- Commits updated combined calendar to repository
- GitHub Pages serves the latest version

The website uses standards-compliant iCalendar parsing for one-time, recurring,
all-day, multi-day, excluded, rescheduled, and cancelled event occurrences.

## Files

- `events.html` - Main interactive calendar interface
- `madison-futsal-2025-26.ics` - Madison's Futsal schedule (local)
- `family-calendar-combined.ics` - Auto-generated combined feed (updated every 6 hours)
- `README.md` - This documentation

## Technical Architecture

### Frontend
- Vanilla JavaScript with responsive CSS
- No frameworks or build process required
- Mobile-friendly responsive design

### Data Integration
- **TeamSnap API** - OAuth 2.0 authentication for reliable access
- **GameChanger/PlayMetrics** - Direct iCal feed consumption
- **iCal Parsing** - Custom JavaScript parser for calendar feeds
- **CORS Proxy** - Uses multiple proxies for cross-origin requests

### Automation
- **GitHub Actions** - Runs Python script every 6 hours to combine calendars
- **Python Script** - `scripts/combine-calendars.py` fetches and merges all sources

### Hosting
- GitHub Pages static hosting at paulsnider.net
- No server-side processing required
- Automatic deployment on commit

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
