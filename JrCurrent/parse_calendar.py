#!/usr/bin/env python3
"""
Parse TeamSnap ICS calendar data and update schedule.js for full 2025 season
"""

import re
from datetime import datetime
import subprocess

def fetch_calendar_data():
    """Fetch the ICS calendar data from TeamSnap"""
    try:
        result = subprocess.run([
            'curl', '-s', 
            'http://ical-cdn.teamsnap.com/team_schedule/filter/games/01e5fcd1-600c-4114-9b03-c2fe47354f90.ics'
        ], capture_output=True, text=True, check=True)
        return result.stdout
    except subprocess.CalledProcessError as e:
        print(f"Error fetching calendar data: {e}")
        return None

def parse_ics_events(ics_content):
    """Parse ICS content and extract game events"""
    events = []
    
    # Split into individual VEVENT blocks
    event_blocks = re.findall(r'BEGIN:VEVENT.*?END:VEVENT', ics_content, re.DOTALL)
    
    for block in event_blocks:
        event = {}
        
        # Extract SUMMARY (opponent)
        summary_match = re.search(r'SUMMARY:(.*?)(?:\n|$)', block)
        if summary_match:
            summary = summary_match.group(1).strip()
            # Extract opponent from summary like "4th Grade Girls Soccer vs Blue Starfish"
            vs_match = re.search(r'vs\s+(.+)', summary)
            at_match = re.search(r'at\s+(.+)', summary)
            if vs_match:
                event['opponent'] = vs_match.group(1).strip()
                event['home_game'] = True
            elif at_match:
                event['opponent'] = at_match.group(1).strip()
                event['home_game'] = False
            else:
                # Fallback to full summary if no vs/at pattern
                event['opponent'] = summary.replace('4th Grade Girls Soccer', '').strip()
                event['home_game'] = True
        
        # Extract DTSTART (date and time)
        dtstart_match = re.search(r'DTSTART;TZID=America/Chicago:(\d{8}T\d{6})', block)
        if dtstart_match:
            dt_str = dtstart_match.group(1)
            dt = datetime.strptime(dt_str, '%Y%m%dT%H%M%S')
            event['datetime'] = dt
            event['date'] = dt.strftime('%Y-%m-%d')
            event['display_date'] = dt.strftime('%b %-d')
            event['time'] = dt.strftime('%-I:%M %p')
        
        # Extract LOCATION
        location_match = re.search(r'LOCATION:(.*?)(?:\n|$)', block)
        description_match = re.search(r'DESCRIPTION:(.*?)(?:\n\w)', block, re.DOTALL)
        
        location = ""
        if location_match:
            location = location_match.group(1).strip()
        
        # Try to get better field info from description
        field_info = ""
        if description_match:
            desc = description_match.group(1)
            field_match = re.search(r'Location:\s*([^\n]+)', desc)
            if field_match:
                field_info = field_match.group(1).strip()
        
        # Clean up location - prioritize field info from description
        if field_info:
            if 'Scheels OP Soccer Complex' in field_info:
                field_num_match = re.search(r'Field\s*(\d+\s*[NS]?)', field_info)
                if field_num_match:
                    event['location'] = f"Scheels Complex #{field_num_match.group(1).strip()}"
                else:
                    event['location'] = "Scheels Complex"
            elif 'Compass Minerals' in field_info:
                field_num_match = re.search(r'Field\s*(\d+\s*[NS]?)', field_info)
                if field_num_match:
                    event['location'] = f"Compass Minerals Field #{field_num_match.group(1).strip()}"
                else:
                    event['location'] = "Compass Minerals"
            else:
                # Clean up any extra text/newlines in field_info
                cleaned_field = field_info.split('\n')[0].strip()
                event['location'] = cleaned_field
        elif location:
            # Fallback to basic location cleanup
            if 'Scheels' in location or '13700 Switzer' in location:
                event['location'] = "Scheels Complex"
            elif 'Compass' in location or '1500 N 90th' in location:
                event['location'] = "Compass Minerals"
            elif 'Olathe' in location:
                event['location'] = "Olathe Complex"
            else:
                event['location'] = location.split('\n')[0]  # Take first line only
        else:
            event['location'] = "TBD"
        
        if 'opponent' in event and 'datetime' in event:
            events.append(event)
    
    # Sort events by datetime
    events.sort(key=lambda x: x['datetime'])
    
    # Filter for all 2025 games (including past Spring games)
    year_2025_events = []
    for event in events:
        if event['datetime'].year == 2025:
            # Determine if game is in the past
            now = datetime.now()
            event['isPast'] = event['datetime'] < now
            year_2025_events.append(event)
    
    return year_2025_events

def generate_schedule_js(events):
    """Generate the JavaScript games array from parsed events"""
    js_games = []
    
    for event in events:
        # Properly escape strings for JavaScript
        def escape_js_string(s):
            return s.replace('\\', '\\\\').replace('"', '\\"').replace('\n', ' ').replace('\r', ' ').strip()
        
        game = {
            'date': f'"{escape_js_string(event["display_date"])}"',
            'opponent': f'"{escape_js_string(event["opponent"])}"',
            'time': f'"{escape_js_string(event["time"])}"',
            'location': f'"{escape_js_string(event["location"])}"',
            'result': 'null',
            'score': 'null',
            'isExhibition': 'false',
            'isPast': str(event['isPast']).lower()
        }
        
        game_str = "    {\n"
        for key, value in game.items():
            game_str += f"        {key}: {value},\n"
        game_str = game_str.rstrip(',\n') + '\n    }'
        
        js_games.append(game_str)
    
    return '[\n' + ',\n'.join(js_games) + '\n]'

def update_schedule_js(games_array):
    """Update the schedule.js file with the new games array"""
    schedule_js_path = '/Users/paulsnider/paulsnidernet/JrCurrent/js/schedule.js'
    
    try:
        with open(schedule_js_path, 'r') as f:
            content = f.read()
        
        # Replace the games array
        pattern = r'const games = \[.*?\];'
        replacement = f'const games = {games_array};'
        
        updated_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
        
        with open(schedule_js_path, 'w') as f:
            f.write(updated_content)
        
        print(f"✅ Updated {schedule_js_path} with {len(games_array.split(','))} games")
        return True
        
    except Exception as e:
        print(f"❌ Error updating schedule.js: {e}")
        return False

def main():
    print("🏆 Updating Junior Current 2025 Season Schedule...")
    
    # Fetch calendar data
    print("📅 Fetching calendar data...")
    ics_content = fetch_calendar_data()
    if not ics_content:
        print("❌ Failed to fetch calendar data")
        return
    
    # Parse events
    print("⚽ Parsing game events...")
    events = parse_ics_events(ics_content)
    print(f"Found {len(events)} games for 2025 season")
    
    # Generate JavaScript
    print("🔧 Generating schedule JavaScript...")
    games_array = generate_schedule_js(events)
    
    # Update schedule.js
    print("📝 Updating schedule.js file...")
    if update_schedule_js(games_array):
        print("✨ Schedule update complete!")
        
        # Print summary
        print(f"\n📊 2025 Season Schedule Summary:")
        print(f"  • Total games: {len(events)}")
        
        past_games = [e for e in events if e['isPast']]
        upcoming_games = [e for e in events if not e['isPast']]
        print(f"  • Past games: {len(past_games)}")
        print(f"  • Upcoming games: {len(upcoming_games)}")
        
        if upcoming_games:
            next_game = upcoming_games[0]
            print(f"  • Next game: {next_game['display_date']} vs {next_game['opponent']} at {next_game['time']}")
    
    else:
        print("❌ Failed to update schedule.js")

if __name__ == '__main__':
    main()