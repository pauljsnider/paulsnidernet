# Kitchen weekly school notes

The owner approved public first names, activities and finance-free school notes
for Madison, Will and Max on `paulsnider.net/family/kitchen.html`, including weekly
updates. Do not add other public fields or sources without matching authority.

## Production path

The live `OTE_parse_email` project retains its existing
`runWeeklySchoolDigestToDoc` Sunday trigger, recipient properties and digest
Doc/email behavior. Its only integration changes are a private original-sender
field for normalized ParentSquare items and an isolated post-digest call to
`runKitchenWeeklyPublication(items, now)`. Export failure cannot prevent the
existing digest. Never commit private live Code.js, mail, source URLs, recipients,
Script Properties or private previews to this repository.

Live adapter files:

- `KitchenExport.js`: deterministic safe candidate extraction and serialization.
- `KitchenWeekly.js`: copy of `family/kitchen-weekly.js`, the shared ES5 contract.
- `KitchenWeeklyPublisher.js`: versioned policy, idempotent weekly branch/PR queue.
- `KitchenCredentialPreflight.js`: explicit read-only credential test; not scheduled.

The two nonsecret activation properties are `KITCHEN_POLICY_VERSION=school-notes-v1`
and `KITCHEN_PUBLISH_ENABLED=true`. The credential is `KITCHEN_GITHUB_TOKEN`.
The legacy `publishReviewedKitchenWeekly` helper retains an exact-payload hash
and draft-PR gate, but is not the recurring production path. There is no weekly
manual content-approval step under the approved bounded policy.

`runKitchenWeeklyPublicationOnly()` collects and publishes school notes without
creating another Doc or sending email. Use it to verify/repair an export; do not
repeat the full digest merely to retry publication.

## Public contract and source dates

`family/kitchen-weekly.json` permits only version, timezone, generated_at,
expires_at, week_start, week_end and children keyed by the three first names.
Each child has at most six short notes (90 characters maximum), containing only
kind, text, optional date, expires_at, generic source and source_date. Kinds are
learning, bring, reminder, assignment and specials. No sender, message/document
ID, teacher name, private URL, account, payment detail or raw-mail field is allowed.

Use only attributed school messages with actual sender metadata from ParentSquare
or Blue Valley domains. `sourceFrom` is preserved privately from GmailMessage
metadata because ParentSquare normalization replaces the public-facing `from`
label with an author's display name. Never trust model-supplied provenance.

Keep the target school week's newsletters from its prior Thursday onward. Sunday
prepares the coming Monday; Monday–Saturday use the current school week. The
publication-only collector reads 14 days to find relevant sources, then the
school-week filter removes older mail. Original digest lookback is unchanged.

Extract complete short curriculum sentences/headings. Reject a whole source
passage containing financial/private content before shortening; do not strip a
finance heading from a raw digest or salvage an otherwise financial sentence.
Ambiguous material is omitted. Financial material can occur inside child sections.

Resolve weekday reminders only when the source section explicitly says this week
or next week, anchored to the source date in America/Chicago. Never roll an old
Friday reminder forward to populate a card. Omit ambiguous/out-of-week/past-day
reminders. Dated notes expire after their local day; learning notes expire at the
next Monday boundary. Invalid or expired feeds do not populate the display.

Calendar times come from the existing six-hour generator's explicit `children`
arrays, never a combined TeamSnap source label. Unknown membership stays empty.
The old-Safari UI uses ES5, textContent, optional cache, 15-minute feed reloads and
one-minute child rendering/expiry checks. A deployed JavaScript/schema update
requires one page reload on an already-open display; the validator URL and cache
key are versioned. Weekly JSON requests use a cache-busting timestamp.

## Unattended completion

Apps Script opens/reuses one `kitchen-weekly/YYYY-MM-DD` PR and records its content
identity/number. Identical pending submissions reuse the PR; merged submissions
return unchanged. A script lock prevents concurrent submissions. Apps Script
never merges or polls CI—the continuation is the sole merger.

`Kitchen validation` runs on PRs and main. `Complete weekly kitchen data` runs after
successful PR validation and executes only trusted default-branch code. It fetches
only the expected JSON as data; never checks out PR-head scripts/artifacts. It
checks owner/actor, same repository, branch, associated PR, exact head SHA,
one-file allowlist, schema/finance/freshness, the matching run's validation and all
reported checks/statuses. It rechecks the head immediately before a normal
exact-SHA squash merge. Branch protections and required reviews are not bypassed.

The continuation uses only an ephemeral workflow token: Contents/PR write,
Checks/Statuses read and Pages write. No new persistent credential scopes or
repository security settings are needed. It explicitly requests the existing
legacy main/root Pages build after merging. A successful merge is not sufficient:
verify the build and public bytes. On failure, report the failed workflow and let
last-good notes expire; do not substitute private preview data.

## Credential rotation

Metadata verified October 2, 2026 UTC, without reading secret values:

- `KITCHEN_GITHUB_TOKEN` exists in live Script Properties.
- GitHub fine-grained token: `Kitchen weekly publisher`, owner `pauljsnider`.
- Only selected repository: `pauljsnider/paulsnidernet`.
- Contents and Pull requests read/write; required Metadata read; no user permissions.
- GitHub expiration: **December 31, 2026**; no expiration time displayed.
- The coordinating task owns the existing December 28 morning Chicago rotation
  reminder. Update that reminder after rotation; do not create duplicates.

The live publication PRs prove the stored token authenticates and can write the
intended repository. Property presence alone would not prove that. Never inspect,
copy, print, screenshot or put the token into chat, source, logs, commands or feeds.
Never substitute an existing gh/clasp credential.

Before expiry, have the owner create an equivalent replacement with the same
repository, permissions and approved lifetime, then enter/save it directly in the
Script Property. Verify metadata and a harmless authenticated request before the
owner revokes the old token. If verification fails, keep publication disabled;
the owner may restore a still-valid old value from their own secure storage.
Record the verified new expiry and update the one existing reminder in the owner's
timezone. Do not invent an expiration time when GitHub provides only a date.

## Execution and verification evidence

The project uses a Default GCP project. The installed clasp default OAuth client
cannot execute it through the Apps Script execution API; that API route requires
a matching standard project/custom OAuth setup. Do not change grants or cloud
configuration just to test it. The existing authenticated owner editor is a
supported route. Select the exact function, verify it, and run once.

The original unlogged preflight completed in the editor; generic Completed did not
prove authentication. A separate proposed safe-result logging modification was
not approved and was not deployed. It is unnecessary now that actual publication
has proved access.

The full digest ran once October 1, 2026 at 21:12:45 Chicago, completed in 119.09s,
and created one verified private Doc and one configured summary email. Its first
data PR67 merged through the continuation. Live validation then found and fixed a
competing-merge race, lost ParentSquare sender provenance and an over-restrictive
rolling source-date/paragraph limit. Subsequent tests ran only the export path.

Final data PR71 merged automatically at `5cb5f5e2d1616653f78c2aba66b4a145cb41ac4f`;
continuation run36956021452 and Pages run36956036202 succeeded. Public JSON contained
4 Madison, 5 Will and 3 Max notes, generated October2 02:30:56Z. The Friday library
reminder expires October3 05:00Z; learning notes expire October5 05:00Z. Verify fresh
runtime data rather than treating this dated record as current indefinitely.

Tests: 45 Python regressions plus `node tests/test_kitchen_weekly.js`,
`node tests/test_kitchen_publisher.js`, and `node tests/test_kitchen_completion.js`.
Cases include source spoofing, whole-source finance rejection, prior/next-week
reminders, Chicago midnight/Sunday rollover, expired notes, duplicate pending and
merged submissions, unexpected actors/branches/files, stale checks and SHA races.

## Rollback

Disable `KITCHEN_PUBLISH_ENABLED`, revert application changes through a reviewed
Git commit, and restore saved original Apps Script Code.js/manifest if needed.
Verify the unchanged Sunday trigger and recipient settings. Do not delete the
credential or change recipients merely to stop public updates. Preserve private
source backups outside the public repository.
