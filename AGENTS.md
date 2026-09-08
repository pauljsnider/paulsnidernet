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

## Validation checklist

```sh
../calendar-venv/bin/python -m unittest discover -s tests -v
git diff --check
```

- For a visual check, serve the repo locally and use a 1024 × 768 browser
  viewport. Check each rotating kitchen screen, its controls, no console errors,
  and that the Daily Brief / OTE screen show honest fallback states without a
  network connection.
- After a production change, wait for both the data workflow (when applicable)
  and GitHub Pages, then verify `https://paulsnider.net/family/kitchen.html`
  with a cache-busting query string. Confirm the expected generated JSON is
  live before calling the task complete.
