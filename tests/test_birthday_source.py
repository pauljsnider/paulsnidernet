import importlib.util
import os
from pathlib import Path
import tempfile
import textwrap
import unittest
from datetime import date, timedelta
from icalendar import Calendar, Event

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('birthday_combiner', ROOT / 'scripts/combine-calendars.py')
COMBINER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(COMBINER)


def source(uid):
    calendar = Calendar()
    calendar.add('version', '2.0')
    event = Event()
    event.add('uid', uid)
    event.add('summary', uid)
    event.add('dtstart', date(2027, 1, 1))
    event.add('dtend', date(2027, 1, 2))
    event.add('rrule', {'freq': 'yearly'})
    calendar.add_component(event)
    return calendar


class BirthdaySourceTest(unittest.TestCase):
    def test_actual_workflow_merge_preserves_other_events_and_deduplicates(self):
        workflow = (ROOT / '.github/workflows/combine-calendars.yml').read_text()
        code = textwrap.dedent(workflow.split("python - <<'PY'", 1)[1].split('\n          PY', 1)[0])
        with tempfile.TemporaryDirectory() as folder:
            family = Path(folder) / 'family'
            family.mkdir()
            for path, uid in [('family-email-events.ics', 'synthetic-original'),
                              ('ote-important-events.ics', 'synthetic-school'),
                              ('family-birthdays.ics', 'synthetic-birthday')]:
                (family / path).write_bytes(source(uid).to_ical())
            original = source('synthetic-original').walk('VEVENT')[0].to_ical()
            previous = Path.cwd()
            try:
                os.chdir(folder)
                for _ in range(2):
                    exec(compile(code, '<workflow merge>', 'exec'), {})
                    merged = Calendar.from_ical((family / 'family-email-events.ics').read_bytes())
                    preserved = next(e for e in merged.walk('VEVENT') if str(e['UID']) == 'synthetic-original')
                    self.assertEqual(original, preserved.to_ical())
                    combined = COMBINER.combine_calendars([merged], ['Family Email Events'])
                    events = combined.walk('VEVENT')
                    self.assertEqual(3, len(events))
                    self.assertEqual(3, len({str(e['UID']) for e in events}))
            finally:
                os.chdir(previous)

    def test_birthday_source_is_minimal_and_unique(self):
        raw = (ROOT / 'family/family-birthdays.ics').read_bytes()
        self.assertEqual(1, raw.count(b'BEGIN:VCALENDAR'))
        self.assertEqual(1, raw.count(b'END:VCALENDAR'))
        events = Calendar.from_ical(raw).walk('VEVENT')
        self.assertEqual(11, len(events))
        self.assertEqual(11, len({str(e['UID']) for e in events}))
        allowed = {'UID', 'DTSTAMP', 'SUMMARY', 'DTSTART', 'DTEND', 'RRULE', 'CATEGORIES', 'TRANSP'}
        for event in events:
            self.assertTrue(set(event).issubset(allowed))
            self.assertEqual(type(event['DTSTART'].dt), date)
            self.assertGreaterEqual(event['DTSTART'].dt.year, 2026)
            self.assertEqual(timedelta(days=1), event['DTEND'].dt - event['DTSTART'].dt)
            self.assertEqual({'FREQ': ['YEARLY']}, dict(event['RRULE']))
            self.assertFalse(any(c.isdigit() for c in str(event['SUMMARY'])))


if __name__ == '__main__':
    unittest.main()
