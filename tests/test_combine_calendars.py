import unittest
from datetime import datetime
import importlib.util
from pathlib import Path
import tempfile

import pytz
from icalendar import Calendar, Event

MODULE_PATH = Path(__file__).resolve().parents[1] / 'scripts' / 'combine-calendars.py'
SPEC = importlib.util.spec_from_file_location('combine_calendars', MODULE_PATH)
COMBINE_CALENDARS = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(COMBINE_CALENDARS)
combine_calendars = COMBINE_CALENDARS.combine_calendars
load_cached_source_calendar = COMBINE_CALENDARS.load_cached_source_calendar


def make_calendar(uid, summary='Practice'):
    calendar = Calendar()
    event = Event()
    central = pytz.timezone('America/Chicago')
    event.add('uid', uid)
    event.add('summary', summary)
    event.add('dtstart', central.localize(datetime(2026, 8, 18, 18, 0)))
    event.add('dtend', central.localize(datetime(2026, 8, 18, 19, 0)))
    calendar.add_component(event)
    return calendar


class CombineCalendarsTest(unittest.TestCase):
    def test_deduplicates_same_source_occurrence_with_replacement_uid(self):
        combined = combine_calendars(
            [make_calendar('old-uid'), make_calendar('new-uid')],
            ['Max Soccer - Major Derek', 'Max Soccer - Major Derek'],
        )

        events = list(combined.walk('VEVENT'))

        self.assertEqual(1, len(events))
        self.assertEqual('new-uid', str(events[0]['UID']))
        self.assertEqual('Max Soccer: Practice', str(events[0]['SUMMARY']))

    def test_keeps_matching_occurrences_from_different_sources(self):
        combined = combine_calendars(
            [make_calendar('max-uid'), make_calendar('will-uid')],
            ['Max Soccer - Major Derek', 'Will Soccer'],
        )

        self.assertEqual(2, len(list(combined.walk('VEVENT'))))

    def test_loads_only_requested_source_from_cached_combined_feed(self):
        cached = combine_calendars(
            [make_calendar('max-uid'), make_calendar('will-uid')],
            ['Max Soccer - Major Derek', 'Will Soccer'],
        )

        with tempfile.TemporaryDirectory() as directory:
            output_file = Path(directory) / 'combined.ics'
            output_file.write_bytes(cached.to_ical())

            fallback = load_cached_source_calendar(
                'Will Soccer',
                output_file=output_file,
            )

        events = list(fallback.walk('VEVENT'))
        self.assertEqual(1, len(events))
        self.assertEqual('will-uid', str(events[0]['UID']))


if __name__ == '__main__':
    unittest.main()
