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
load_local_calendar = COMBINE_CALENDARS.load_local_calendar
EMAIL_EVENTS_PATH = Path(__file__).resolve().parents[1] / 'family' / 'family-email-events.ics'


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
    def test_loads_four_sanitized_recurring_email_series(self):
        calendar = load_local_calendar(EMAIL_EVENTS_PATH, 'Family Email Events')
        events = list(calendar.walk('VEVENT'))

        self.assertEqual(4, len(events))
        self.assertTrue(all(event.get('RRULE') for event in events))
        self.assertEqual(
            {'Will: Tutor', 'Madison: Tutor', 'Madison: Gymnastics'},
            {str(event['SUMMARY']) for event in events},
        )

        source = EMAIL_EVENTS_PATH.read_text()
        for private_field in ('ATTENDEE', 'DESCRIPTION', 'ORGANIZER', 'Passcode:', 'https://'):
            self.assertNotIn(private_field, source)

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

    def test_preserves_recurrence_exception_with_master_uid(self):
        calendar = make_calendar('recurring-uid')
        exception = Event()
        central = pytz.timezone('America/Chicago')
        exception.add('uid', 'recurring-uid')
        exception.add('recurrence-id', central.localize(datetime(2026, 8, 25, 18, 0)))
        exception.add('dtstart', central.localize(datetime(2026, 8, 25, 18, 0)))
        exception.add('dtend', central.localize(datetime(2026, 8, 25, 19, 0)))
        exception.add('status', 'CANCELLED')
        calendar.add_component(exception)

        combined = combine_calendars([calendar], ['Family Email Events'])
        events = list(combined.walk('VEVENT'))
        recurrence_ids = [
            getattr(event.get('RECURRENCE-ID'), 'dt', None)
            for event in events
        ]

        self.assertEqual(2, len(events))
        self.assertEqual(1, recurrence_ids.count(None))
        self.assertEqual(
            ['2026-08-25T18:00:00-05:00'],
            [value.isoformat() for value in recurrence_ids if value],
        )

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
