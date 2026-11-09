# EasyGas record retention — business instruction 8 November 2026

The business instructed: **“All records must be retained.”** This supersedes the previously proposed destructive erasure implementation. It does not authorise an Excel import, provider activation, publishing retained private evidence, expanded marketing consent or release approval.

## Implemented controls

- Customer deletion-review requests receive the truthful `retained` disposition. The request, reason and policy version `retain-all-20261108` are audited; records are not removed or anonymised. Repeated requests reuse the retained record. Previously pending requests receive that disposition when the customer requests review again.
- Identity-verified owned export remains available. Export fulfilment does not turn a retained deletion request into a completed deletion.
- The existing scheduled proof-purge entry point is now a non-destructive retention hold, including for expired photo bytes. Owners cannot use that entry point to remove bytes. Consent/access expiry, archive state, ownership and branch restrictions continue to govern viewing.
- Historical issued invoices, reports, ledgers, incidents, draft revisions and operation receipts remain protected by their existing append-only or immutable rules.

The policy is explicit source-controlled configuration, not a runtime flag that silently re-enables deletion. Any future change requires an approved implementation phase and traceability update. Revoked sessions and credentials still lose access; retention is not permission to use them. Temporary decrypted upload files and application lock files are not business records and still receive normal secure cleanup.

## Outstanding operational gates

No physical backups, server retention schedules or hosting configuration were changed: server work remains deferred. Production recovery must preserve this hold, restore the current application/policy before starting workers, and independently verify a restored expired photo's bytes remain unchanged. Existing proof bytes already removed by an older implementation are not recreated or invented. Policy/legal review and independent production acceptance are not inferred from this business instruction or local tests.

Evidence: `docs/production-completion/evidence/draft-revision-tests.txt` (PRIVACY-RETAIN01, OPS-T11), `draft-revision-browser.json` and `retain-all-browser.png` in the same directory.
