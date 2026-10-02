# Kitchen weekly export — review-ready, disabled

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
on failed runs. That standing publication policy is not approved or enabled by
this implementation. Before enabling it, replace the per-payload gate with the
approved policy gate and configure the reviewed automation/merge path. Do not
silently bypass branch protections or infer authority to publish new fields.

kitchenCredentialPresence() reports boolean metadata only. Existing Apps Script
APIs/clasp do not expose Script Properties, so the absence of a token in exported
source does not prove there is no property. Inspect property names through the
verified Google editor or deploy and explicitly run only this read-only helper
once deployment access is approved. Never run the digest to test the bridge.

Tests: node tests/test_kitchen_weekly.js and the Python unittest suite. Use only
synthetic payloads when exercising API mocks. The real weekly preview stays in a
separate private local directory and private Library images, never in a PR.
