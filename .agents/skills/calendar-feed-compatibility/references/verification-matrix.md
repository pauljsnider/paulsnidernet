# Calendar verification matrix

## Data path

| Layer | Location | What to verify |
| --- | --- | --- |
| Source feeds | `family/*.ics` and URLs in `scripts/combine-calendars.py` | The event exists with the intended local wall time, recurrence, and source identity. Treat URLs and any query credentials as sensitive. |
| Combined subscription | `family/family-calendar-combined.ics` | It parses standalone; event TZIDs have exactly one matching VTIMEZONE; recurrence properties survive; no private fields leak. |
| Kitchen feed | `family/kitchen-events.json` | Only the intended public fields are present; dates and offsets match the combined feed; generated timestamps are current. |
| Website | `family/events.html` | The right source is enabled, the event is within the display horizon, ended timed events are filtered intentionally, and month cells show `+more` when needed. |
| Kitchen display | `family/kitchen.html` | ES5 compatibility, cache/offline fallback, midnight rollover, refresh loop, and 1024x768 fit remain intact. |
| Deployment | GitHub Pages and the public URLs | Pages serves the newest generated assets; cache-busting fetches show the repaired output; browser console is clean. |
| Calendar client | Google Calendar or Outlook subscription | The client uses the exact combined URL, has refreshed it, and displays the event in the expected account timezone. |

## Regression cases

For a timezone or recurrence change, cover all of these in tests or an
equivalent explicit audit:

- a summer and winter `America/Chicago` occurrence, including a date on each
  side of a DST transition;
- a recognized IANA zone with no provider `VTIMEZONE`, plus a source that
  already supplies its own definition;
- UTC and all-day events;
- `RRULE`, multiple `RDATE` values, `EXDATE`, and `RECURRENCE-ID`;
- a source fetch failure that loads a cached calendar;
- duplicate or unresolved timezone definitions;
- a feed containing review fields such as `ORGANIZER`, `ATTENDEE`, `URL`, or
  token-like query parameters.

The current focused command is:

```sh
../calendar-venv/bin/python -m unittest discover -s tests -v
git diff --check
```

The repository's combined feed currently has one generated
`America/Chicago` definition and should have no unresolved event TZIDs. The
source email and OTE ICS files may omit standalone timezone definitions; that
is acceptable only when they are treated as inputs to the normalizer and the
published combined feed remains valid.

## Display rules to check before reporting a missing event

- The website and kitchen page intentionally hide timed events after their
  end time.
- The website's month cells show the first three events and then `+more`.
- The kitchen page uses the generated JSON and can show a cached or honest
  empty state while offline.
- A correct website feed does not prove Google or Outlook has refreshed its
  subscription. Check the subscription URL and client refresh separately.

## Sensitive-output review

Before committing generated output, search only for field names and safe
counts. Do not paste the feed itself into a chat or log. Review for
`ATTENDEE`, `ORGANIZER`, private `DESCRIPTION`, `URL`, meeting links,
`mailto:`, and query keys such as `token`, `key`, `secret`, or `password`.
The combiner's source configuration currently contains feed credentials; do
not copy them into new files or output. A proper remediation requires rotating
the credentials and moving them into the workflow's secret/config path.

## Production evidence

Record:

1. the commit SHA tested;
2. the workflow run IDs and success states for calendar data and Pages;
3. cache-busted HTTP status/content type/last-modified for the ICS and JSON;
4. auditor results for live output;
5. a browser check of the event and console;
6. the exact Google/Outlook subscription URL and refresh state if the user
   reports a client problem.
