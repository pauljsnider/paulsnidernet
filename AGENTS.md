# paulsnidernet contributor guide

## Product and deployment

- This is Paul Snider's public, static personal site. `main` deploys through
  GitHub Pages to `https://paulsnider.net`.
- Treat each page as public: never add private calendar descriptions,
  attendee/contact data, credentials, authentication tokens, or Google Photos
  source URLs to the published site or a generated JSON file.
- Keep the site usable without a build step. Changes to `family/` should be
  ordinary static HTML, CSS, JavaScript, images, ICS, or JSON assets.
- Before handoff, run the targeted tests, inspect `git diff --check`, push only
  the intended files, and validate the production URL after Pages has deployed.

## Kitchen display: non-negotiable compatibility target

- `family/kitchen.html` runs continuously in landscape on an iPad mini 2
  (1024 × 768) using its old Safari browser. The device may be on iOS 12, and
  the page is intentionally compatible with Safari as old as iOS 9.
- This is a glance display, not an app: large text, no dense controls, calm
  dark palette, high contrast, and one clear purpose per rotating screen.
- The display rotates automatically; a tap changes screens and pauses rotation
  for 60 seconds. Preserve that behavior unless the owner specifically asks to
  change it.
- New screens must fit inside the 1024 × 768 landscape frame without scrolling
  or clipping. Validate at that exact viewport as well as a narrow/portrait
  fallback.
- The calendar must roll forward at midnight. Keep the day-change check and
  the periodic feed refreshes intact.

## Old Safari implementation rules

- Use ES5 JavaScript only: `var`, function declarations, `XMLHttpRequest`, and
  traditional loops. Do **not** introduce `let`, `const`, arrow functions,
  `async`/`await`, `Promise`, `fetch`, modules, optional chaining, template
  literals, or runtime transpilation.
- Do not depend on web fonts, icon libraries, JavaScript frameworks, third-party
  browser APIs, or CORS proxies in the kitchen display. The page needs to start
  from its own static assets on a spotty kitchen Wi-Fi connection.
- Use flexbox with `-webkit-` fallbacks; do not use CSS Grid. Avoid CSS features
  that require a modern rendering engine.
- Keep localStorage as an optional offline cache. A failed network request must
  continue showing a cached feed or a plain, honest empty state.
- Use `textContent` for remote titles and fields. Do not insert upstream HTML
  into the page.

## Kitchen feeds and automations

- `scripts/combine-calendars.py` produces `family/kitchen-events.json` from
  source ICS feeds every six hours. It expands recurrences server-side and
  intentionally omits descriptions/attendee data from the kitchen JSON.
- `scripts/publish-kitchen-photos.py` chooses five still images daily from the
  configured shared Google Photos album. It must never publish videos, source
  URLs, or EXIF metadata; only the downloaded local JPEGs and safe IDs belong
  in `family/kitchen-photos.json`.
- `scripts/publish-kitchen-weather.py` refreshes Leawood weather hourly from
  Open-Meteo into `family/kitchen-weather.json`.
- `scripts/publish-kitchen-brief.py` runs in that same hourly workflow and
  writes `family/kitchen-brief.json`. Its allowlist is deliberate: Kansas City
  Public Library for a clearly kid/family local pick, KCUR Arts & Life for one
  non-political local culture story, MIT News' AI feed for two science items,
  FRED daily market-close series, and Yahoo Finance's public chart response for
  Fortive (`FTV`). Keep the positive family filter and blocked
  political/crime/adult/negative-topic filters. If a source fails, leave only
  that card empty—never substitute arbitrary news or AI-generated summaries.
- The OTE screen is fed by the public Overland Trail Elementary calendar source
  already listed on `family/events.html`; keep it labeled as `Overland Trail
  Elementary` so the kitchen can identify those events reliably.
- The automated feeds may update their committed JSON independently. Do not
  overwrite an automated feed with a stale local copy while making UI changes.

## Shared calendar compatibility

- For the end-to-end missing-event audit, safe-output review, and deploy
  evidence workflow, load the repository skill at
  `.agents/skills/calendar-feed-compatibility/SKILL.md`.
- `https://paulsnider.net/family/family-calendar-combined.ics` is a subscribed
  calendar used by Outlook and Google Calendar as well as `family/events.html`.
  Compatibility with one reader does not establish compatibility with another.
- Every referenced `TZID` must have exactly one matching `VTIMEZONE` in the
  combined ICS. `X-WR-TIMEZONE` alone does not define a time zone. Preserve
  provider definitions, including custom identifiers, through combining and
  cached-source recovery; generate missing definitions for recognized IANA
  zones. Unknown zones without definitions must fail before publishing.
- Keep recurring events in their intended local zone. Do not replace a weekly
  Chicago wall time with a fixed UTC time that shifts after daylight saving.
  Preserve event UIDs, recurrence rules, exceptions, cancellations, and all-day
  dates when repairing time-zone metadata.
- The site's ical.js 2.2.1 reader consumes only the first value of a VTIMEZONE
  `RDATE` property. Generated transition dates must be separate `RDATE`
  properties, not a comma-separated list. Revalidate this behavior before
  changing the output format or parser version.
- Calendar changes must test both fall and spring DST transitions using the
  embedded definition with an independent parser, not just the host's time-zone
  database. Also test the actual browser calendar reader. Include custom source
  zones, cached feeds, recurrence-date references, and UTC/all-day events in
  regression coverage (`tests/test_combine_calendars.py`).
- Compare generated events with a fresh main/live snapshot: account for added,
  removed, or changed records and verify kitchen event times. Resolve automated
  feed conflicts from the newest main data, then apply the intended repair;
  never replace it with an older branch snapshot.

## Investigating missing calendar events

- Establish the exact date, calendar application/account, displayed time zone,
  and view. Treat the user's screenshot as evidence of their actual view; do
  not dismiss it because a different browser or calendar shows the event.
- Trace the event through the source ICS, live combined ICS, kitchen JSON when
  relevant, and the affected calendar's UI. Inspect recurring masters and
  exceptions rather than looking only for a standalone occurrence on that date.
- Inspect subscription settings in the browser when the connector omits the
  source URL. Confirm the exact URL and subscription versus one-time import;
  neither a matching calendar name nor a Google result proves Outlook's state.
- Check filters, browser/feed caching, local time-zone conversion (including a
  possible date shift), and the displayed event end time. The website currently
  filters ended timed events before rendering even its calendar day popup, while
  all-day entries can remain. Its month cells also show only three entries;
  inspect the expanded day before attributing a missing event to that limit.
- Label unverified explanations as hypotheses. A missing time-zone definition
  is a feed defect, but repairing it does not by itself prove why an individual
  Outlook event was missing. Report feed, site, and Outlook verification
  separately; claim an Outlook fix only after checking the affected client.

## Validation checklist

```sh
../calendar-venv/bin/python -m unittest discover -s tests -v
git diff --check
```

- If `../calendar-venv/bin/python` is absent, use an isolated virtualenv with
  the dependencies required by the scripts/tests; do not silently skip tests.
- ICS uses CRLF line endings. If a full diff flags only their carriage returns,
  validate with `git -c core.whitespace=cr-at-eol diff origin/main --check`;
  preserve standards-compliant ICS line endings.
- For a visual check, serve the repo locally and use a 1024 × 768 browser
  viewport. Check each rotating kitchen screen, its controls, no console errors,
  and that the Daily Brief / OTE screen show honest fallback states without a
  network connection.
- After a production change, wait for both the data workflow (when applicable)
  and GitHub Pages, then verify `https://paulsnider.net/family/kitchen.html`
  with a cache-busting query string. Confirm the expected generated JSON is
  live before calling the task complete.
- For shared-calendar deployments, wait for the calendar workflow and the Pages
  deployment of its generated commit. Check both the exact subscription URL and
  a cache-busted download for matching time-zone definitions and expected events.
  Hard-refresh the live calendar browser and check its feed timestamp to avoid
  validating a cached copy. A pushed PR or successful build alone is not a
  deployed fix; record the merged commit and completed deployment separately.
