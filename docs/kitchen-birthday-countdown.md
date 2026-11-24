# Kitchen birthday countdown

This follow-on uses the birthday source introduced by calendar PR #125.
It leaves the annual events and their calendar publication unchanged.

The existing workflow runs the unchanged combiner, then the new local-file-only
projector. The projector reads family/family-birthdays.ics and the generated
kitchen-events.json. It adds only label/date occurrences for the explicitly
allowlisted five series. Other birthday entries remain calendar-only. No new
credentials, source subscriptions, network calls, ages, birth years, locations,
descriptions or personal evidence are added. The normal six-week events list
and source-health fields are preserved.

The display uses actual occurrences within 367 days, calendar-day subtraction
across DST, Today!/Tomorrow labels and a compact footer on the existing screens.
The device's local date/time setting matches the rest of the board. Empty data
stays blank. Expired cached input asks for a refresh after seven days rather than
inventing the next recurrence. Denied storage and a missing optional script do
not stop the original board. There is no device entry form or new storage key.

After a separately approved release, reload the existing board. No setup data
needs to be entered on the device. Actual iPad mini 2 / iOS 9 validation remains
required; desktop WebKit is not a substitute for that device check.
