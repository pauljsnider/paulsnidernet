#!/usr/bin/env python3
"""
Combine all Snider family calendars into a single .ics file.
Fetches remote calendars and merges with local calendars.
Enhanced with robust error handling, retry logic, and fallback mechanisms.
"""

import requests
from icalendar import Calendar, Event
from datetime import datetime
import pytz
import sys
import time
import logging
import os
from pathlib import Path

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('calendar_combiner.log')
    ]
)
logger = logging.getLogger(__name__)

# Test mode - use public calendars instead of private ones
# Default to production unless explicitly enabled via env.
TEST_MODE = os.getenv('CALENDAR_TEST_MODE', '').lower() in ('1', 'true', 'yes')

# Test calendars (public, reliable sources)
TEST_CALENDARS = [
    {
        'name': 'US Holidays',
        'url': 'https://www.calendarlabs.com/icalendar/holidays/United_States/US_Holidays.ics'  # Working URL
    },
    {
        'name': 'Test Calendar 2 - Simulated Timeout',
        'url': 'https://httpbin.org/delay/35'  # Will timeout (longer than our 30s timeout)
    },
    {
        'name': 'Broken URL Test',
        'url': 'https://example.com/broken-calendar.ics'  # Should fail gracefully
    },
    {
        'name': 'GitHub Pages Test',
        'url': 'https://pauljsnider.github.io/paulsnidernet/family/madison-futsal-2025-26.ics'
    }
]

# Production calendars (private sources)
PRODUCTION_CALENDARS = [
    {
        'name': 'Will Soccer',
        'urls': [
            'https://api.team-manager.gc.com/ics-calendar-documents/user/d12bc6ff-2ff0-4fcd-890f-50c83aa3b6fb.ics?teamId=974a8276-ee4f-4273-bd12-925e6874f9b5&token=8829469505c4b469f837fad611d516938f445935509c3151f35613a20c9a0dd7',
            'https://api.team-manager.gc.com/ics-calendar-documents/user/d12bc6ff-2ff0-4fcd-890f-50c83aa3b6fb.ics?teamId=0cf68eb5-b320-471e-a29b-a0f68f64e73e&token=ecfa94300ded39b32f4a2738a3d321449f3fb22ff19102c3ff0578701a4d5876'
        ]
    },
    {
        'name': 'Will Baseball',
        'url': 'https://api.team-manager.gc.com/ics-calendar-documents/user/d12bc6ff-2ff0-4fcd-890f-50c83aa3b6fb.ics?teamId=628804f9-1e56-439b-b8f6-af42fb098e41&token=3f19b930ec1be351e60daf351471939c971ad0ed8e3afeef0df61df083464de3'
    },
    {
        'name': 'TeamSnap Events (Madison + Max + Will)',
        'url': 'http://ical-cdn.teamsnap.com/user_schedule/b5988130-ea96-0139-1e25-4201ac1c001c.ics'
    },
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

# Choose calendars based on mode
CALENDARS = TEST_CALENDARS if TEST_MODE else PRODUCTION_CALENDARS

OUTPUT_FILE = Path(__file__).parent.parent / 'family' / 'family-calendar-combined.ics'

# Request configuration
REQUEST_CONFIG = {
    'timeout': 30,
    'retries': 3,
    'retry_delay': 2,  # seconds
    'headers': {
        'User-Agent': 'Mozilla/5.0 (compatible; CalendarCombiner/1.0)',
        'Accept': 'text/calendar,text/plain,*/*'
    }
}

def fetch_calendar(url, name):
    """Fetch a calendar from a URL with robust error handling and retries."""
    logger.info(f"Fetching {name} from {url}")
    
    last_error = None
    
    # Convert webcal:// to https://
    if url.startswith('webcal://'):
        url = url.replace('webcal://', 'https://')
        logger.info(f"Converted webcal:// to https://")

    for attempt in range(REQUEST_CONFIG['retries']):
        try:
            logger.debug(f"Attempt {attempt + 1} for {name}")
            
            response = requests.get(
                url, 
                timeout=REQUEST_CONFIG['timeout'],
                headers=REQUEST_CONFIG['headers']
            )
            
            # Check HTTP status
            response.raise_for_status()
            logger.info(f"HTTP {response.status_code} for {name}")
            
            # Validate content type
            content_type = response.headers.get('content-type', '').lower()
            if 'text/calendar' not in content_type and 'text/plain' not in content_type:
                logger.warning(f"Unexpected content type for {name}: {content_type}")
            
            # Try to parse calendar
            try:
                cal = Calendar.from_ical(response.text)
                
                # Count events
                event_count = sum(1 for component in cal.walk() if component.name == "VEVENT")
                logger.info(f"✓ {name}: {event_count} events loaded successfully")
                return cal
                
            except Exception as parse_error:
                logger.error(f"Failed to parse {name}: {parse_error}")
                
                # If parsing fails, try to find the actual ICS content
                content_text = response.text
                if 'BEGIN:VCALENDAR' in content_text:
                    # Extract actual ICS content (handles wrapped responses like r.jina.ai)
                    start_marker = content_text.find('BEGIN:VCALENDAR')
                    cleaned_content = content_text[start_marker:]
                    
                    try:
                        cal = Calendar.from_ical(cleaned_content)
                        event_count = sum(1 for component in cal.walk() if component.name == "VEVENT")
                        logger.info(f"✓ {name}: {event_count} events (after content normalization)")
                        return cal
                    except Exception as retry_parse_error:
                        logger.error(f"Still failed to parse normalized {name}: {retry_parse_error}")
                
                raise parse_error

        except requests.exceptions.Timeout:
            last_error = f"Timeout for {name} (attempt {attempt + 1})"
            logger.warning(last_error)
            
        except requests.exceptions.ConnectionError as e:
            last_error = f"Connection error for {name}: {str(e)}"
            logger.warning(last_error)
            
        except requests.exceptions.HTTPError as e:
            if e.response:
                status_code = e.response.status_code
                reason = e.response.reason
                last_error = f"HTTP error for {name}: {status_code} {reason}"
                logger.warning(last_error)
                
                # Don't retry 4xx errors (except 429 rate limiting)
                if 400 <= status_code < 500 and status_code != 429:
                    break
            else:
                last_error = f"HTTP error for {name}: No response object"
                logger.warning(last_error)
                
        except Exception as e:
            last_error = f"Unexpected error for {name}: {str(e)}"
            logger.error(last_error)
        
        # Wait before retry (except on last attempt)
        if attempt < REQUEST_CONFIG['retries'] - 1:
            time.sleep(REQUEST_CONFIG['retry_delay'])
    
    # All attempts failed
    logger.error(f"✗ Failed to fetch {name}: {last_error}")
    return None

def expand_calendar_sources(calendars):
    """Expand calendars with multiple source URLs into individual fetch units."""
    expanded = []

    for calendar in calendars:
        urls = calendar.get('urls') or [calendar.get('url')]
        urls = [url for url in urls if url]

        for index, url in enumerate(urls, start=1):
            source_name = calendar['name']
            if len(urls) > 1:
                source_name = f"{calendar['name']} (source {index})"
            expanded.append({
                'name': source_name,
                'url': url
            })

    return expanded

def combine_calendars(calendars):
    """Combine multiple calendars into one with detailed statistics."""
    logger.info("Combining calendars...")
    
    # Create a new calendar
    combined = Calendar()
    combined.add('prodid', '-//Snider Family//Combined Calendar//EN')
    combined.add('version', '2.0')
    combined.add('x-wr-calname', 'Snider Family Calendar - Combined')
    combined.add('x-wr-timezone', 'America/Chicago')
    combined.add('x-wr-caldesc', 'Combined calendar with all Snider family events')
    
    # Add metadata about the combine operation
    combined.add('x-combine-timestamp', datetime.now(pytz.UTC).isoformat())
    combined.add('x-combine-mode', 'test' if TEST_MODE else 'production')

    total_events = 0
    event_components = []
    event_by_uid = {}
    ordered_uids = []
    duplicate_count = 0
    calendars_processed = 0

    for i, cal_data in enumerate(calendars):
        if cal_data is None:
            logger.warning(f"Skipping calendar {i+1} (failed to load)")
            continue

        calendars_processed += 1
        calendar_events = 0

        # Extract events from this calendar
        for component in cal_data.walk():
            if component.name == "VEVENT":
                uid = component.get('uid')
                if uid:
                    uid_str = str(uid)
                    if uid_str in event_by_uid:
                        duplicate_count += 1
                        # Later sources override earlier ones so fresher GameChanger
                        # subscriptions can correct stale event details.
                        event_by_uid[uid_str] = component
                        continue

                    event_by_uid[uid_str] = component
                    ordered_uids.append(uid_str)
                else:
                    event_components.append(component)

                total_events += 1
                calendar_events += 1

        logger.info(f"Calendar {i+1}: {calendar_events} events added")

    for uid in ordered_uids:
        event_components.append(event_by_uid[uid])

    for component in event_components:
        combined.add_component(component)

    logger.info(f"✓ Combined {total_events} total events from {calendars_processed} calendars")
    if duplicate_count > 0:
        logger.info(f"  - Removed {duplicate_count} duplicate events")
    
    return combined

def main():
    """Main function to fetch and combine all calendars."""
    print("=" * 80)
    print("Snider Family Calendar Combiner (Enhanced Version)")
    print("=" * 80)
    print(f"Mode: {'TEST' if TEST_MODE else 'PRODUCTION'}")
    expanded_calendars = expand_calendar_sources(CALENDARS)
    print(f"Calendars to process: {len(expanded_calendars)}")
    print()

    success_count = 0
    failure_count = 0
    
    # Fetch all calendars
    calendars = []
    for i, cal_info in enumerate(expanded_calendars):
        print(f"\n[{i+1}/{len(expanded_calendars)}] Processing: {cal_info['name']}")
        cal = fetch_calendar(cal_info['url'], cal_info['name'])
        calendars.append(cal)
        
        if cal is not None:
            success_count += 1
        else:
            failure_count += 1

    print("\n" + "=" * 50)
    print(f"SUMMARY: {success_count} successful, {failure_count} failed")
    print("=" * 50 + "\n")

    # Combine calendars (even if some failed)
    combined = combine_calendars(calendars)

    # Write to output file
    try:
        OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

        with open(OUTPUT_FILE, 'wb') as f:
            f.write(combined.to_ical())

        file_size = OUTPUT_FILE.stat().st_size
        logger.info(f"✓ Combined calendar written to {OUTPUT_FILE} ({file_size:,} bytes)")
        
        if TEST_MODE:
            print(f"\n📁 Test file created: {OUTPUT_FILE}")
            print("   - Check the file to verify the combining logic works")
            print("   - Set CALENDAR_TEST_MODE=0 to use production calendars")
        
    except Exception as e:
        logger.error(f"Failed to write output file: {e}")
        return 1

    print("\n" + "=" * 80)
    
    # Return non-zero exit code if all calendars failed
    return 1 if success_count == 0 else 0

if __name__ == '__main__':
    exit_code = main()
    sys.exit(exit_code)
