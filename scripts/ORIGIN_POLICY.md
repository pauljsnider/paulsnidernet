# Kitchen merge provenance

The completion worker now checks the same exact GitHub identity and original
source-history policy as PaulBot, before processing and immediately before merge.
Both original workflow actor and rerun actor are checked through GitHub. Numeric
identity, exact head, data-only file, schema/freshness and check provenance gates
remain required. The Python engine is copied from the canonical PaulBot config
security change; keep the two copies and synthetic policy tests in sync.

This is prepared code, not deployed enforcement. The repository currently has no
Slack credential/relay secret for this job. Unknown/outsider origin blocks and
records a pending alert, but Slack delivery is NOT established. No secret,
permission expansion, family notification, live data, or production setting was
added. Complete a verified existing Slack route before enabling this change.
Use synthetic tests only. Existing bot work requires original provenance; do not
allow a bot author to substitute for an outsider issue source.
