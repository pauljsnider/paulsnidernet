---
name: calendar-feed-compatibility
description: Audit and repair this repository's family calendar pipeline when events are missing, shifted, duplicated, stale, or absent from a calendar client.
---

# Calendar Feed Compatibility

Use this skill for changes to `scripts/combine-calendars.py`, the family ICS
feeds, the calendar or kitchen pages, the calendar workflow, or a report that
an event is missing or at the wrong time. Read the repository root
`AGENTS.md` first; it contains the product and old-Safari constraints this
skill supplements.

## Contract

- Treat the source feed, combined ICS, generated kitchen JSON, browser page,
  and subscribed calendar client as separate layers. Prove which layer loses
  the event before editing code.
- The public combined ICS must parse as a standalone calendar. Every non-UTC
  `TZID` used by an event must have one matching `VTIMEZONE`; preserve source
  definitions where present and generate recognized IANA definitions when a
  provider omits them. Do not silently convert a wall-clock event to UTC.
- Keep recurrence semantics intact. Check `RRULE`, `RDATE`, `EXDATE`, and
  `RECURRENCE-ID`; ical.js 2.2.1 only consumes the first value when an
  `RDATE` is encoded as one comma-separated property, so split those values
  before publishing.
- Never publish attendee data, private descriptions, credentials, access
  tokens, opaque source URLs, or meeting links. Treat `ATTENDEE`, `ORGANIZER`,
  `URL`, `CONFERENCE`, and token-like values as review findings. Do not print
  feed URLs or their query strings in logs. Existing plaintext feed
  credentials are a security finding that needs a separate secret-rotation
  and workflow migration plan.
- `family/kitchen.html` is an ES5, old-Safari display. Preserve its cache,
  midnight rollover, refresh loop, no-scroll 1024x768 layout, and honest
  offline fallback. Use `textContent` for remote values.
- Do not hand-edit generated ICS or JSON output as the fix. Change the source
  or combiner, run the generator, and inspect the generated diff.

## Workflow

1. **Capture the observation.** Record the exact event title, date, expected
   local time and zone, source/app, view (day/week/month), and whether the
   event is merely past or absent. Preserve a screenshot or client export
   when available. Do not infer a timezone from a browser display alone.

2. **Trace the data path.** Inspect the source ICS, the generated combined
   ICS, `family/kitchen-events.json`, and the consuming page. Run the local
   auditor on the combined feed:

   ```sh
   PYTHON=../calendar-venv/bin/python
   "$PYTHON" .agents/skills/calendar-feed-compatibility/scripts/audit_ics.py \
     family/family-calendar-combined.ics --require-timezones
   ```

   For a production check, use the same script against the public combined
   URL with `--label live-combined`; the script deliberately labels remote
   inputs without echoing the URL. Compare the live headers, event, timezone,
   and recurrence results with the newest `main` output. Check the subscribed
   URL in the actual Google or Outlook account instead of assuming that the
   website and subscription share a cache.

3. **Classify the failure.** Use the first failing layer: source omission;
   fetch/cache fallback; merge or recurrence expansion; timezone definition;
   browser filtering or display horizon; generated JSON; deployment/cache; or
   client refresh/subscription behavior. Check the known display rules in
   `references/verification-matrix.md` before calling an ended event missing.

4. **Make the smallest fix.** Preserve event identity and local wall-clock
   intent across DST. Keep source-specific behavior isolated. If a provider
   feed is malformed, repair the normalized output rather than weakening the
   browser parser. Do not add a modern JavaScript feature to the kitchen page.

5. **Validate every consumer.** Run the focused tests, the ICS auditor, and
   `git diff --check`. For timezone or recurrence changes, exercise a winter
   date, a summer date, a DST boundary, a custom zone, UTC, all-day events,
   and multi-value recurrence dates. For UI changes, inspect the live page at
   1024x768 and a narrow/portrait viewport with no console errors. Remove only
   test artifacts created by the audit (for example `calendar_combiner.log`
   and Python bytecode) before handoff.

6. **Deploy and re-check.** Push only intended files, wait for the calendar
   data workflow and GitHub Pages when they apply, then fetch the exact
   production ICS and JSON URLs with a cache-busting query. Re-run the
   auditor and open the site in a browser. Report feed validity, UI behavior,
   and Google/Outlook subscription state as separate evidence; a valid feed
   alone does not prove a client has refreshed it.

Use `references/verification-matrix.md` for the repository topology, test
cases, and post-deploy evidence checklist.
