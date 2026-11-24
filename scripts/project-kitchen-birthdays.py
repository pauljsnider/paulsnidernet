#!/usr/bin/env python3
"""Add minimal countdown occurrences from the dedicated approved birthday source.

Local files only. Does not import or modify the calendar combiner, source email
records, subscriptions, credentials, or any other generated feed.
"""
import json
from datetime import date, datetime, time, timedelta
from pathlib import Path
from icalendar import Calendar
from dateutil.rrule import rrulestr

ROOT = Path(__file__).resolve().parents[1]
COUNTDOWN_UIDS = frozenset({
    'family-birthday-paul@paulsnider.net',
    'family-birthday-max@paulsnider.net',
    'family-birthday-will@paulsnider.net',
    'family-birthday-madison@paulsnider.net',
    'family-birthday-robin@paulsnider.net',
})


def project(source_bytes, today):
    """Use real annual occurrences, never extrapolate an expired device cache."""
    if source_bytes.count(b'BEGIN:VCALENDAR') != 1 or source_bytes.count(b'END:VCALENDAR') != 1:
        raise ValueError('Birthday source must contain one calendar')
    calendar = Calendar.from_ical(source_bytes)
    if calendar.name != 'VCALENDAR':
        raise ValueError('Birthday source must be a calendar')
    rows, seen = [], set()
    start = datetime.combine(today, time.min)
    end = start + timedelta(days=367)
    for event in calendar.walk('VEVENT'):
        uid = str(event.get('UID', ''))
        if uid not in COUNTDOWN_UIDS:
            continue
        if uid in seen:
            raise ValueError('Duplicate countdown identity')
        seen.add(uid)
        allowed = {'UID', 'DTSTAMP', 'SUMMARY', 'DTSTART', 'DTEND', 'RRULE', 'CATEGORIES', 'TRANSP', 'STATUS', 'SEQUENCE'}
        if set(event) - allowed or event.subcomponents:
            raise ValueError('Unexpected countdown source fields')
        first = event.decoded('DTSTART', None)
        last = event.decoded('DTEND', None)
        rule = event.get('RRULE')
        label = str(event.get('SUMMARY', '')).strip()
        if (type(first) is not date or type(last) is not date
                or last - first != timedelta(days=1)
                or not rule or dict(rule) != {'FREQ': ['YEARLY']}
                or not label or len(label) > 60):
            raise ValueError('Invalid annual countdown record')
        if str(event.get('STATUS', '')).upper() == 'CANCELLED':
            continue
        occurrences = rrulestr(rule.to_ical().decode(), dtstart=datetime.combine(first, time.min))
        for occurrence in occurrences.between(start, end, inc=True):
            if occurrence < end:
                rows.append({'label': label, 'date': occurrence.date().isoformat()})
    return sorted(rows, key=lambda row: (row['date'], row['label']))


def update(source_path=ROOT / 'family/family-birthdays.ics',
           feed_path=ROOT / 'family/kitchen-events.json'):
    feed = json.loads(feed_path.read_text(encoding='utf-8'))
    if not isinstance(feed.get('events'), list) or feed.get('timezone') != 'America/Chicago':
        raise ValueError('Invalid kitchen feed')
    generated = datetime.fromisoformat(feed['generated_at'])
    if generated.utcoffset() is None:
        raise ValueError('Kitchen timestamp requires timezone')
    # The normal generator uses Chicago local time. Normalize explicitly for
    # UTC-stamped input too, without relying on the runner's system timezone.
    from zoneinfo import ZoneInfo
    today = generated.astimezone(ZoneInfo('America/Chicago')).date()
    feed['birthdays'] = project(source_path.read_bytes(), today)
    payload = json.dumps(feed, indent=2) + '\n'
    # Leave the prior output intact if validation or projection fails.
    temporary = feed_path.with_name(feed_path.name + '.birthdays.tmp')
    try:
        temporary.write_text(payload, encoding='utf-8')
        temporary.replace(feed_path)
    finally:
        if temporary.exists():
            temporary.unlink()


if __name__ == '__main__':
    update()
