#!/usr/bin/env python3
"""Audit an ICS feed without printing its contents or a remote URL."""

import argparse
import re
import sys
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from icalendar import Calendar


INTRINSIC_ZONES = {"UTC", "GMT"}
REVIEW_FIELDS = {
    "ATTENDEE",
    "ORGANIZER",
    "URL",
    "CONFERENCE",
    "DESCRIPTION",
}
SECRET_WORDS = re.compile(r"(?:token|secret|password|passcode|api[_-]?key)", re.I)


def read_source(source):
    parsed = urlparse(source)
    if parsed.scheme in ("http", "https"):
        request = Request(source, headers={"User-Agent": "paulsnidernet-ics-audit/1"})
        with urlopen(request, timeout=30) as response:
            return response.read(), "remote URL"
    path = Path(source)
    return path.read_bytes(), str(path)


def parameter_tzids(component):
    values = []
    for _name, property_value in component.property_items():
        params = getattr(property_value, "params", {})
        tzid = params.get("TZID")
        if tzid:
            values.append(str(tzid))
    return values


def audit(calendar, require_timezones):
    events = list(calendar.walk("VEVENT"))
    zones = [str(component.get("TZID")) for component in calendar.walk("VTIMEZONE")]
    zone_counts = Counter(zones)
    used_tzids = []
    review_fields = Counter()
    suspicious_values = 0
    recurrence_fields = Counter()

    # icalendar's VCALENDAR.property_items() includes flattened child
    # properties, so inspect VEVENTs directly or review counts are doubled.
    for component in events:
        used_tzids.extend(parameter_tzids(component))
        for name, property_value in component.property_items():
            if name in REVIEW_FIELDS:
                review_fields[name] += 1
            if name in ("RRULE", "RDATE", "EXDATE", "RECURRENCE-ID"):
                recurrence_fields[name] += 1
            value = str(property_value)
            if SECRET_WORDS.search(name) or SECRET_WORDS.search(value):
                suspicious_values += 1

    used = sorted(set(used_tzids))
    missing = sorted(
        zone for zone in used if zone not in INTRINSIC_ZONES and not zone_counts[zone]
    )
    duplicates = sorted(zone for zone, count in zone_counts.items() if count != 1)
    failed = bool(missing or duplicates) if require_timezones else False
    return {
        "events": len(events),
        "timezones": sorted(zone_counts),
        "used_tzids": used,
        "missing": missing,
        "duplicates": duplicates,
        "review_fields": review_fields,
        "suspicious_values": suspicious_values,
        "recurrence_fields": recurrence_fields,
        "failed": failed,
    }


def format_list(values):
    return ", ".join(values) if values else "none"


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", help="local .ics path or an HTTP(S) URL")
    parser.add_argument("--label", help="safe label for the report")
    parser.add_argument(
        "--require-timezones",
        action="store_true",
        help="fail when a non-UTC TZID is missing or a VTIMEZONE is duplicated",
    )
    args = parser.parse_args(argv)

    try:
        payload, default_label = read_source(args.source)
        calendar = Calendar.from_ical(payload)
        result = audit(calendar, args.require_timezones)
    except Exception as error:  # pragma: no cover - CLI error path
        print("status: FAIL")
        print("error: {}".format(type(error).__name__))
        return 1

    label = args.label or default_label
    print("source: {}".format(label))
    print("events: {}".format(result["events"]))
    print("vtimezones: {}".format(format_list(result["timezones"])))
    print("used_tzids: {}".format(format_list(result["used_tzids"])))
    print("missing_vtimezones: {}".format(format_list(result["missing"])))
    print("duplicate_vtimezones: {}".format(format_list(result["duplicates"])))
    print(
        "recurrence_fields: {}".format(
            format_list(
                [
                    "{}={}".format(name, count)
                    for name, count in sorted(result["recurrence_fields"].items())
                ]
            )
        )
    )
    print(
        "review_fields: {}".format(
            format_list(
                [
                    "{}={}".format(name, count)
                    for name, count in sorted(result["review_fields"].items())
                ]
            )
        )
    )
    print("suspicious_value_count: {}".format(result["suspicious_values"]))
    print("status: {}".format("FAIL" if result["failed"] else "PASS"))
    return 1 if result["failed"] else 0


if __name__ == "__main__":
    sys.exit(main())
