# Security and branch boundary

- Existing actor authentication and restricted driver/technician session policies run before dispatch reads/mutations. Owner may request global or branch scope. Manager/dispatcher are restricted to their current branch. Customer, driver, finance and technician cannot call the management aggregate/candidate endpoint.
- Cross-branch candidate requests fail on the canonical order branch. Current actor role/branch is re-read by existing auth on requests; no client permission claim is trusted.
- Read DTOs omit handover hashes, request hashes, customer phone and internal financial fields. No raw order object is returned by the new projection. Driver candidates contain only selection identity, branch, availability and eligibility reason.
- GPS is restricted to active operational purpose, active matching trip branch and location consent. No active stops or consent means no precise observation returned. Stale/future/poor-quality evidence is never declared live. External maps receive coordinates only when an authorised operator chooses the link.
- Assignment invokes the existing operation-result transaction/idempotency wrapper, final canonical guards and version checks. Every unavailable-driver path is protected centrally; recommendation eligibility is advisory only. No UI button overrides a backend blocker.
- Original private photos, reports, retention, encrypted queues, source binding, handover proof, independent approvals, immutable ledgers and postcommit outbox remain canonical.
- Heartbeat is authenticated bounded metadata, not operational release approval. Production field/tracking/bulk/doorstep writes remain behind their existing OFF controls. No new security-sensitive permission was granted.
- SQL uses bound parameters and validated filters; literal '%' is not a wildcard. API reads are GET-only, while heartbeat is POST and subject to existing origin/native authentication rules. No provider, credential, production data import or external message was activated.

Full native device, signed URL expiry, staging outage and independent privacy acceptance are retained in the84-scenario/26-gate register. Passing bounded API tests is not full operational clearance.
