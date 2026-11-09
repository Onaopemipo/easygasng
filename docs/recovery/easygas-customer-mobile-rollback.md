# Customer UI rollback and recovery

Pre-change source archive: .data/customer-ui-preflight.tgz; branch main has no commit/clean reference. Preserve newer user changes; inspect file-by-file before restoring compatible source. Do not wholesale extract over unrelated edits. Archive includes source only, no credentials/database. Existing onboarding/config SHA manifest is verified unchanged.

This phase adds only authenticated reads to the existing customer dashboard; no migration or historical data rewrite. UI failures can be mitigated by returning to the compatible local build and disabling affected entry controls. Never roll back a database snapshot over later valid finance/inventory/order events. Re-fetch authoritative state after reconnect; existing stable operation keys and domain transactions remain authoritative for writes.

The first new resource loader sent POST to read-only routes. Simulator exposed failures; fixed to GET queries and added CUI-HTTP. Backend 405 restrictions were preserved. Source/typechecks, real HTTP reads and corrected native build passed. No financial side effect occurred.

Injected-failure rollback and multi-connection domain recovery tests passed in the isolated PostgreSQL regression; no claim of production disaster recovery certification. Off-site backup/production hosting and provider activation remain separate NO-GO gates.
