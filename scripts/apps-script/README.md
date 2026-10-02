# Kitchen weekly export — approved policy, rollout pending

Use the verified live Apps Script project, not the older public digest snapshot.
Add KitchenExport.js and a copy of ../../family/kitchen-weekly.js named
KitchenWeekly.js. Do not replace the live Code.js, modify its digest/email trigger,
or commit live source, script properties, private email data or real preview JSON.

The existing collection point is collectDigestItems(LOOKBACK_DAYS), before
buildDoc and AI summarization. prepareKitchenWeeklyExport(items, now) returns a
safe candidate payload plus its approval hash. It does not send, publish, log or
save data. Its deterministic extraction intentionally prefers omission over
paraphrasing; it cannot promise to recover every newsletter topic. Review the
candidate against sources before approving. It excludes household and sports
marketing inputs, old thread messages, long/ambiguous lines, links and financial
content. Financial blocks can occur inside child sections: never export a raw
digest or HTML summary. Field validation and text filters are defense in depth;
the exact-content approval gate is the final control before public upload.

## Public contract

The only new document is family/kitchen-weekly.json, with version, timezone,
generated_at, expires_at, week_start, week_end, and children keyed by first name.
Each child has at most six notes: kind (learning/bring/reminder/assignment/specials), short text (90 characters maximum),
optional date, expiry, generic source label, and source_date. No mail/document
IDs, teacher names, accounts, payment details, URLs or raw text fields are allowed.
Keep private provenance outside the site repository. A dated note should expire
at the end of its local event date; all notes expire at the next week boundary.

Calendar times remain authoritative in kitchen-events.json. Generate its explicit
children arrays before deploying the UI. Source-specific mappings and exact
X-FAMILY-CHILDREN membership override the former aggregate-source heuristic.
Unknown membership stays empty. Add new team/source mappings through reviewed
changes; do not guess a child's team from a source containing all three names.

## Access and deployment gates

Publishing requires three Script Properties, installed only after user approval:
KITCHEN_GITHUB_TOKEN, KITCHEN_PUBLISH_ENABLED=true, and
KITCHEN_APPROVED_SHA256 matching the exact reviewed serialized payload.
Use a fine-grained, expiring GitHub token limited to this repository with Contents
and Pull requests read/write (plus required Metadata read). These permissions
cover the repository; GitHub does not provide file-only write scope. Never copy a
gh/clasp credential into Apps Script. Never print token values or API responses.

publishReviewedKitchenWeekly(payload) creates/updates an isolated branch and a
draft PR. That branch already makes its content public: get explicit approval for
the actual fields, content and repository BEFORE calling it, not only before
merge. It never writes main or merges. Existing branch protection, required
checks/reviews and Pages deployment remain in force. Retry is idempotent for an
unchanged payload while its PR remains open. No triggers are installed here.
This exact-payload gate is for setup, not a proposed permanent weekly chore.
After one explicit, bounded approval of the fields, source policy and public
destination, the intended operating mode is automatic weekly export with strict
validation, required CI checks and normal repository merge/deployment controls.
Unknown attribution, ambiguous or financial notes are omitted; old notes expire
on failed runs. The owner has now approved this bounded recurring publication policy. The new
KitchenWeeklyPublisher.js implements it separately from this legacy exact-payload
draft helper. It is not operational until deployed and verified. Do not bypass
branch protections or infer authority to publish additional fields.

kitchenCredentialPresence() reports boolean metadata only. Existing Apps Script
APIs/clasp do not expose Script Properties, so the absence of a token in exported
source does not prove there is no property. Inspect property names through the
verified Google editor or deploy and explicitly run only this read-only helper
once deployment access is approved. Never run the digest to test the bridge.

Tests: node tests/test_kitchen_weekly.js and the Python unittest suite. Use only
synthetic payloads when exercising API mocks. The real weekly preview stays in a
separate private local directory and private Library images, never in a PR.

## Credential rotation

Metadata verified October 2, 2026 UTC (no secret values accessed):

- Script Property name `KITCHEN_GITHUB_TOKEN` is present in `OTE_parse_email`.
- GitHub token name: `Kitchen weekly publisher`; owner: `pauljsnider`.
- Expiration shown by GitHub: **December 31, 2026**; no expiration time shown.
- Permissions: Metadata read; code/Contents and Pull requests read/write;
  no user permissions. GitHub reports the token has never been used.
- Repository access is verified as **only `pauljsnider/paulsnidernet`**. The
  previous all-repositories mismatch is resolved. GitHub lists a replacement
  token under the same name; the former token detail page is no longer available.
- Authentication has not been tested. Property presence does not prove its value
  matches this GitHub token. Public child-data approval was subsequently granted for names, activities, and finance-free school notes on the public kitchen display with weekly updates.
- The coordinating task owns the existing rotation reminder
  and has been given the new expiration to reschedule its prior three-day lead
  to December 28, 2026 morning in `America/Chicago`. Confirm the update in that
  task; do not create a duplicate.

Replace this dated record after the next verified scope correction or rotation.

The credential lives only in the live `OTE_parse_email` project's Script Property
`KITCHEN_GITHUB_TOKEN`. Inspect property names, never the value. On GitHub, inspect
the fine-grained token list/details for its name, repository selection,
permissions, and expiration; avoid the one-time token reveal page. A property
name proves that the key exists, not that its value is valid or matches a token.

Required scope: resource owner `pauljsnider`, **only selected repository
`paulsnidernet`**, Contents read/write, Pull requests read/write, and required
Metadata read. No account permissions are needed. Do not use all repositories,
a classic PAT, or an existing `gh`/`clasp` credential as a shortcut.

Rotation procedure:

1. Read the current metadata and compare it to the scope above. If it differs,
   correct the scope through the owner's secure GitHub handoff before activation.
   Do not expand access or create a replacement merely to investigate.
2. Before expiry, have the owner create an equivalent replacement with the same
   bounded repository, permissions, and approved lifetime. The owner enters and
   saves it directly in the Script Property, never in chat or a command line.
3. Verify the property name and replacement metadata without reading the secret.
   When an approved, deployed read-only credential check is available, use only
   a harmless authenticated repository-metadata request that reports booleans or
   status and never returns a token, headers, or raw response. Until then, state
   that authentication remains untested. Never run the digest/email job or export
   to test credentials; do not deploy a helper without deployment authorization.
4. After successful verification, have the owner revoke the superseded token.
   If verification fails, keep publication disabled. The owner may restore a
   still-valid old credential from their own secure storage; otherwise replace
   it safely. Let old public notes expire rather than publish unverified data.
5. Record the replacement's verified expiration date and update the existing
   rotation reminder. Prefer advance notice seven days before expiration; use
   the owner's personal timezone and do not invent an expiration time when
   GitHub shows only a date. Keep reminders free of credentials and child data.
   One coordinating task owns scheduling; delegated workers must not duplicate it.

Credential setup and rotation are separate from the public-data authorization
gate. Neither authorizes deploying the adapter, enabling publication, changing
triggers, running a live export, or disclosing new child fields.

## Read-only credential preflight (saved; execution blocked)

`KitchenCredentialPreflight.js` contains only `kitchenCredentialPreflight()`.
It reads the stored credential internally, authenticates using GET `/user`, then
reads GET `/repos/pauljsnider/paulsnidernet`. Public repository reads alone cannot
prove authentication. The result contains only success, the expected repository
identity, and five allowlisted repository permission booleans. Errors return a
fixed failure result; tokens, request headers, raw responses and exception text
are never logged or returned. Repository permission booleans are GitHub's account
metadata, not proof of each fine-grained token scope; retain the verified token
settings as scope evidence.

The live manifest already declares external-request scope and owner-only
execution API access; `clasp deployments` confirmed an existing API executable
at version 12. A fresh isolated pull preserved live Code.js and appsscript.json.
The proposed change is adding only this helper to live HEAD, then invoking only
its exact function through the existing API route in development mode. No new
deployment, public endpoint, trigger, digest, email or export is needed. If
execution requires additional grants or configuration, stop instead of adding
them.

Local mocks passed for successful authentication, HTTP failure, and sanitized
exceptions. The owner explicitly approved adding and running this helper once,
plus the full workflow validation. The subsequent approval review permitted the
save to live HEAD. Read-back verification confirms Code.js and appsscript.json
are byte-identical to the original source and the helper matches its reviewed
local file. No existing deployment, trigger or recipient setting was changed.

The single CLI invocation of `kitchenCredentialPreflight` returned: "Unable to run
script function. Please make sure you have permission to run the script function."
No result was returned; authentication remains unverified. Do not retry via an
alternative execution path or create grants to evade the restriction. The full
digest was not run; no test Doc, email, or public weekly JSON was produced. The
owner must ensure the replacement token was saved directly in the Script
Property until a permitted execution route can verify it. Public-data consent is
now recorded, but the publishing adapter and recurring path remain undeployed.

Regression validation after the helper save: all 45 Python tests and the JavaScript
schema/expiry/finance/attribution/publishing-gate tests pass. These local checks
and byte comparisons are not evidence that the live digest, email, or public
publication path executed successfully.

## Approved recurring integration — prepared, not live

Install `KitchenWeeklyPublisher.js` alongside `KitchenExport.js` and the shared
`KitchenWeekly.js`. Set `KITCHEN_POLICY_VERSION=school-notes-v1` and
`KITCHEN_PUBLISH_ENABLED=true` only as part of the authorized rollout. The former
exact-payload hash is not required by this recurring entrypoint; the legacy draft
function retains its old gate. No weekly manual approval is introduced.

The private prepared Code.js adds one isolated call to
`runKitchenWeeklyPublication(items, now)` after the existing digest's Doc/email
steps. It uses the already collected messages and catches export failures so the
existing digest path is preserved. No source emails, recipient values, private
Code.js, or private previews belong in this public repository. Existing Sunday
trigger and recipient properties remain untouched.

The publisher requires the exact versioned policy, validates the bounded schema,
accepts only recent attributed school messages from actual ParentSquare or
Blue Valley sender domains, and rejects financial/ambiguous lines. It uses one
weekly branch and open PR; a lock prevents concurrent updates and a successful
publication fingerprint avoids duplicates. Only family/kitchen-weekly.json may
change in the data PR.

`Kitchen validation` runs on every PR and main push. Apps Script queues the
weekly data PR and stores its identity/number; it never merges or polls CI. The
trusted default-branch `Complete weekly kitchen data` workflow is the sole merger.
It never checks out or executes PR code. It independently validates JSON, repository,
actor, branch, associated PR, only-one-file boundary, freshness, and run-specific
checks. It rechecks the head immediately before normal exact-SHA merge, then
requests the existing legacy Pages build. Its ephemeral workflow token has only
Contents/PR write, Checks/Statuses read, and Pages write. No persistent token scope,
security setting or Apps Script trigger is added. Failure leaves last-good data
until expiry and reports a failed workflow. A repeated identical submission reuses
its open PR or reports unchanged after merge.

`runKitchenWeeklyPublicationOnly()` retries/verifies just this publication path.
It collects current messages but never creates a Doc or sends email. Do not rerun
the full digest to repair a downstream export. The first live validation exposed
a competing-merge race; sole ownership by the continuation removes that race.

Before production: review and merge the UI/schema/CI PR, refresh generated calendar
children arrays through its existing workflow, deploy the private one-hook Apps
Script source plus adapter files, enable the policy properties, then run the
existing full digest once from the supported owner editor. Verify its execution,
new Doc and configured email outcome, safe data PR checks/merge, and public JSON
and all three screens. No part is operational based solely on mock tests.

Rollback: disable KITCHEN_PUBLISH_ENABLED, revert the application PR through a
reviewed Git commit, restore the saved original Apps Script Code.js and manifest
if needed, and verify the unchanged Sunday trigger. Do not delete the token or
change recipients merely to stop public updates.
