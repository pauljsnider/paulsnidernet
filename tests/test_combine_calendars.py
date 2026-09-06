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
    def test_loads_sanitized_email_events(self):
        calendar = load_local_calendar(EMAIL_EVENTS_PATH, 'Family Email Events')
        events = list(calendar.walk('VEVENT'))

        hockey_events = [
            event
            for event in events
            if str(event['SUMMARY']).endswith('Learn to Play Hockey')
        ]
        self.assertEqual(2, len(hockey_events))
        for event in hockey_events:
            self.assertEqual('2026-08-01T08:00:00-05:00', event['DTSTART'].dt.isoformat())
            self.assertEqual('2026-08-01T08:40:00-05:00', event['DTEND'].dt.isoformat())
            self.assertEqual([8], event['RRULE']['COUNT'])
            self.assertEqual(['SA'], [str(day) for day in event['RRULE']['BYDAY']])
            self.assertEqual(
                '19900 Johnson Dr., Shawnee, KS 66218',
                str(event['LOCATION']),
            )

        descriptions = [
            str(event['DESCRIPTION'])
            for event in hockey_events
            if event.get('DESCRIPTION')
        ]
        self.assertEqual(
            ['No cost; all equipment is provided.'] * 2,
            descriptions,
        )

        source = EMAIL_EVENTS_PATH.read_text()
        for private_field in ('ATTENDEE', 'ORGANIZER', 'Passcode:', 'https://'):
            self.assertNotIn(private_field, source)

    def test_madison_gymnastics_only_recurs_monday_and_thursday(self):
        calendar = load_local_calendar(EMAIL_EVENTS_PATH, 'Family Email Events')
        gymnastics_events = [
            event
            for event in calendar.walk('VEVENT')
            if str(event['SUMMARY']) == 'Madison: Gymnastics'
        ]

        self.assertEqual(2, len(gymnastics_events))
        self.assertEqual(
            {'MO', 'TH'},
            {
                str(day)
                for event in gymnastics_events
                for day in event['RRULE']['BYDAY']
            },
        )
        self.assertNotIn(
            'family-email-1727ab39e92ea72f49d6d052@paulsnider.net',
            {str(event['UID']) for event in gymnastics_events},
        )

    def test_back_to_school_night_combines_all_three_kids(self):
        calendar = load_local_calendar(EMAIL_EVENTS_PATH, 'Family Email Events')
        matching_events = [
            event
            for event in calendar.walk('VEVENT')
            if str(event['UID']) == 'back-to-school-night-20260820@paulsnider.net'
        ]

        self.assertEqual(1, len(matching_events))
        event = matching_events[0]
        self.assertEqual(
            'Back-to-School Night - Madison, Will, Max',
            str(event['SUMMARY']),
        )
        self.assertEqual(
            '2026-08-20T17:00:00-05:00',
            event['DTSTART'].dt.isoformat(),
        )
        self.assertEqual(
            '2026-08-20T18:30:00-05:00',
            event['DTEND'].dt.isoformat(),
        )
        description = str(event['DESCRIPTION'])
        for detail in (
            'Madison (5th grade)',
            'Pod C (Room C10)',
            '5:00-5:40 PM or 5:50-6:30 PM',
            'Will (2nd grade) - 5:00-6:30 PM',
            'Max (kindergarten) - 5:00-6:30 PM',
            'PTO table in the library',
            "valid driver's license or passport",
        ):
            self.assertIn(detail, description)

    def test_grandparents_pickup_recurs_monday_and_thursday_for_all_kids(self):
        calendar = load_local_calendar(EMAIL_EVENTS_PATH, 'Family Email Events')
        pickup_events = [
            event
            for event in calendar.walk('VEVENT')
            if str(event['SUMMARY'])
            == 'Grandma + Grandpa Pickup - Madison, Will, Max'
        ]

        self.assertEqual(2, len(pickup_events))
        events_by_day = {
            str(event['RRULE']['BYDAY'][0]): event
            for event in pickup_events
        }
        self.assertEqual({'MO', 'TH'}, set(events_by_day))

        monday = events_by_day['MO']
        self.assertEqual(
            '2026-08-31T17:00:00-05:00',
            monday['DTSTART'].dt.isoformat(),
        )
        self.assertEqual(
            '2026-08-31T18:00:00-05:00',
            monday['DTEND'].dt.isoformat(),
        )
        self.assertEqual(
            'Bring the kids home around 5 PM.',
            str(monday['DESCRIPTION']),
        )

        thursday = events_by_day['TH']
        self.assertEqual(
            '2026-09-03T17:00:00-05:00',
            thursday['DTSTART'].dt.isoformat(),
        )
        self.assertEqual(
            '2026-09-03T18:00:00-05:00',
            thursday['DTEND'].dt.isoformat(),
        )
        self.assertEqual('Feed the kids dinner.', str(thursday['DESCRIPTION']))

    def test_max_junior_basketball_runs_five_saturdays(self):
        calendar = load_local_calendar(EMAIL_EVENTS_PATH, 'Family Email Events')
        matching_events = [
            event
            for event in calendar.walk('VEVENT')
            if str(event['UID'])
            == 'max-junior-basketball-fall-2026@paulsnider.net'
        ]

        self.assertEqual(1, len(matching_events))
        event = matching_events[0]
        self.assertEqual(
            'Max: Junior Basketball (Ages 4-5)',
            str(event['SUMMARY']),
        )
        self.assertEqual(
            '2026-11-07T09:30:00-06:00',
            event['DTSTART'].dt.isoformat(),
        )
        self.assertEqual(
            '2026-11-07T10:25:00-06:00',
            event['DTEND'].dt.isoformat(),
        )
        self.assertEqual([5], event['RRULE']['COUNT'])
        self.assertEqual(['SA'], [str(day) for day in event['RRULE']['BYDAY']])
        self.assertEqual('TBA', str(event['LOCATION']))
        self.assertEqual(
            'Ages 4-5. Registration cost: $69.33.',
            str(event['DESCRIPTION']),
        )

    def test_try_hockey_for_free_is_shared_by_will_and_max(self):
        calendar = load_local_calendar(EMAIL_EVENTS_PATH, 'Family Email Events')
        matching_events = [
            event
            for event in calendar.walk('VEVENT')
            if str(event['UID'])
            == 'try-hockey-free-20261003@paulsnider.net'
        ]

        self.assertEqual(1, len(matching_events))
        event = matching_events[0]
        self.assertEqual(
            'Try Hockey for Free - Will, Max',
            str(event['SUMMARY']),
        )
        self.assertEqual(
            '2026-10-03T15:00:00-05:00',
            event['DTSTART'].dt.isoformat(),
        )
        self.assertEqual(
            '2026-10-03T16:00:00-05:00',
            event['DTEND'].dt.isoformat(),
        )
        self.assertNotIn('RRULE', event)
        description = str(event['DESCRIPTION'])
        for detail in (
            'Ages 4+',
            'Cost: FREE',
            'registration required',
            'bike helmet works fine',
            'warm winter pants and jacket',
            'winter gloves',
            'Skates and hockey sticks are provided',
            'free arcade card',
            'one hour of non-redemption games',
            'pick it up at check-in',
            '60-minute timer starts when first swiped',
        ):
            self.assertIn(detail, description)

    def test_ote_fall_events_are_all_day_and_shared_by_all_kids(self):
        calendar = load_local_calendar(EMAIL_EVENTS_PATH, 'Family Email Events')
        events_by_uid = {
            str(event['UID']): event
            for event in calendar.walk('VEVENT')
        }

        picture_day = events_by_uid['ote-picture-day-20260918@paulsnider.net']
        self.assertEqual(
            'Picture Day - Madison, Will, Max',
            str(picture_day['SUMMARY']),
        )
        self.assertEqual('2026-09-18', picture_day['DTSTART'].dt.isoformat())
        self.assertEqual('2026-09-19', picture_day['DTEND'].dt.isoformat())
        self.assertEqual('DATE', picture_day['DTSTART'].params['VALUE'])
        self.assertEqual('DATE', picture_day['DTEND'].params['VALUE'])

        carnival = events_by_uid[
            'ote-cougars-in-the-cosmos-carnival-20261002@paulsnider.net'
        ]
        self.assertEqual(
            'Cougars in the Cosmos: Overland Trail Elementary Carnival - '
            'Madison, Will, Max',
            str(carnival['SUMMARY']),
        )
        self.assertEqual('2026-10-02', carnival['DTSTART'].dt.isoformat())
        self.assertEqual('2026-10-03', carnival['DTEND'].dt.isoformat())
        self.assertEqual('DATE', carnival['DTSTART'].params['VALUE'])
        self.assertEqual('DATE', carnival['DTEND'].params['VALUE'])
        self.assertEqual(
            'Overland Trail Elementary School (6225 W 133rd St, '
            'Overland Park, KS)',
            str(carnival['LOCATION']),
        )
        self.assertEqual('CONFIRMED', str(carnival['STATUS']))
        description = str(carnival['DESCRIPTION'])
        self.assertIn(
            'The exact hours have not yet been announced in the 2026 school '
            'newsletters',
            description,
        )
        self.assertIn('previous years, doors opened at 5:00 PM', description)

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

    def test_marks_date_only_events_for_strict_ical_parsers(self):
        calendar = Calendar.from_ical(
            b'BEGIN:VCALENDAR\r\n'
            b'VERSION:2.0\r\n'
            b'BEGIN:VEVENT\r\n'
            b'UID:all-day-event\r\n'
            b'SUMMARY:Tournament\r\n'
            b'DTSTART:20261016\r\n'
            b'DTEND:20261019\r\n'
            b'END:VEVENT\r\n'
            b'END:VCALENDAR\r\n'
        )

        combined = combine_calendars([calendar], ['Will Baseball'])
        event = list(combined.walk('VEVENT'))[0]

        self.assertEqual('DATE', event['DTSTART'].params['VALUE'])
        self.assertEqual('DATE', event['DTEND'].params['VALUE'])
        serialized = combined.to_ical()
        self.assertIn(b'DTSTART;VALUE=DATE:20261016', serialized)
        self.assertIn(b'DTEND;VALUE=DATE:20261019', serialized)

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
