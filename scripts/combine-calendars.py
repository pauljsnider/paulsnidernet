#!/usr/bin/env python3
"""
Combine all Snider family calendars into a single .ics file.
Fetches remote calendars and merges with local calendars.
"""

import requests
from icalendar import Calendar, Event
from datetime import datetime
import pytz
import sys
from pathlib import Path

# Calendar sources - must match events.html CALENDARS array
CALENDARS = [
    {
        'name': 'Will Soccer',
        'url': 'https://api.team-manager.gc.com/ics-calendar-documents/user/d12bc6ff-2ff0-4fcd-890f-50c83aa3b6fb.ics?teamId=974a8276-ee4f-4273-bd12-925e6874f9b5&token=8829469505c4b469f837fad611d516938f445935509c3151f35613a20c9a0dd7'
    },
    {
        'name': 'Will Baseball',
        'url': 'https://api.team-manager.gc.com/ics-calendar-documents/user/d12bc6ff-2ff0-4fcd-890f-50c83aa3b6fb.ics?teamId=628804f9-1e56-439b-b8f6-af42fb098e41&token=3f19b930ec1be351e60daf351471939c971ad0ed8e3afeef0df61df083464de3'
    },
    {
        'name': 'TeamSnap Events (Madison + Max)',
        'url': 'http://ical-cdn.teamsnap.com/user_schedule/b5988130-ea96-0139-1e25-4201ac1c001c.ics'
    },
    # School calendars - disabled for now, can re-enable later if needed
    # {
    #     'name': 'Blue Valley School Calendar',
    #     'url': 'https://www.bluevalleyk12.org/fs/calendar-manager/events.ics?calendar_ids[]=39&calendar_ids[]=1'
    # },
    # {
    #     'name': 'Overland Trail Calendar',
    #     'url': 'https://ote.bluevalleyk12.org/fs/calendar-manager/events.ics?calendar_ids[]=23'
    # },
    # {
    #     'name': 'St. Michael School Calendar',
    #     'url': 'https://stmichaelcp.org/icalendar.ics'
    # },
    {
        'name': 'SignUpGenius Volunteer',
        'url': 'https://www.signupgenius.com/index.cfm?go=t.calendar&record=c9bf580e60d87994333380af4072e82b'
    },
    {
        'name': 'Will Indoor Soccer',
        'url': 'https://calendar.playmetrics.com/calendars/c237/t434992/p0/tA6AECF4E/f/calendar.ics'
    },
    {
        'name': 'Madison Futsal',
        'url': 'https://pauljsnider.github.io/paulsnidernet/family/madison-futsal-2025-26.ics'
    }
]

OUTPUT_FILE = Path(__file__).parent.parent / 'family' / 'family-calendar-combined.ics'


def fetch_calendar(url, name):
    """Fetch a calendar from a URL with error handling."""
    print(f"Fetching {name}...")

    try:
        # Convert webcal:// to https://
        if url.startswith('webcal://'):
            url = url.replace('webcal://', 'https://')

        response = requests.get(url, timeout=30)
        response.raise_for_status()

        # Parse the calendar
        cal = Calendar.from_ical(response.content)

        # Count events
        event_count = sum(1 for component in cal.walk() if component.name == "VEVENT")
        print(f"  ✓ Loaded {event_count} events from {name}")

        return cal

    except requests.RequestException as e:
        print(f"  ✗ Failed to fetch {name}: {e}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"  ✗ Failed to parse {name}: {e}", file=sys.stderr)
        return None


def combine_calendars(calendars):
    """Combine multiple calendars into one."""
    # Create a new calendar
    combined = Calendar()
    combined.add('prodid', '-//Snider Family//Combined Calendar//EN')
    combined.add('version', '2.0')
    combined.add('x-wr-calname', 'Snider Family Calendar - Combined')
    combined.add('x-wr-timezone', 'America/Chicago')
    combined.add('x-wr-caldesc', 'Combined calendar with all Snider family events')

    total_events = 0
    event_uids = set()  # Track UIDs to avoid duplicates

    for cal_data in calendars:
        if cal_data is None:
            continue

        # Extract events from this calendar
        for component in cal_data.walk():
            if component.name == "VEVENT":
                # Check for duplicate UIDs
                uid = component.get('uid')
                if uid and uid in event_uids:
                    continue

                if uid:
                    event_uids.add(uid)

                # Add the event to combined calendar
                combined.add_component(component)
                total_events += 1

    print(f"\n✓ Combined {total_events} total events from {len([c for c in calendars if c])} calendars")
    return combined


def main():
    """Main function to fetch and combine all calendars."""
    print("=" * 60)
    print("Snider Family Calendar Combiner")
    print("=" * 60)
    print()

    # Fetch all calendars
    calendars = []
    for cal_info in CALENDARS:
        cal = fetch_calendar(cal_info['url'], cal_info['name'])
        calendars.append(cal)

    print()

    # Combine calendars
    combined = combine_calendars(calendars)

    # Write to output file
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    with open(OUTPUT_FILE, 'wb') as f:
        f.write(combined.to_ical())

    print(f"✓ Combined calendar written to {OUTPUT_FILE}")
    print()
    print("=" * 60)


if __name__ == '__main__':
    main()
