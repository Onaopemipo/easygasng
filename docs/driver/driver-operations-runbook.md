# Driver operations and rollback
Production remains NO-GO. Do not enable production field/tracking mutations or deploy this phase before acceptance. Local shell: from apps/mobile/driver run EAS_BUILD_PROFILE=local-demo EXPO_PUBLIC_API_URL=http://127.0.0.1:3003 ../node_modules/.bin/expo start. Existing driver account credentials authenticate against the same backend. No mock orders or customer identities are seeded by the shell.

Rollback the client to the preserved source snapshot only after reconciling encrypted pending evidence. Additive migration 052 can remain; do not drop evidence or session records. Disable field operations to contain mutations, preserve private evidence, review assignment/version and operation receipts, and reconcile with dispatch before retry. Never bypass proof/OTP or convert a pending operation into a delivered order manually.

## Dependency register
| Work | Depends on | Status |
|---|---|---|
| Physical camera, offline crash and device QA | Installed dedicated shell and device | Pending engineering/QA |
| Extended filters/pagination and GPS | Existing private photo and assignment services | Pending engineering; can continue independently |
| Complete scoped completion concurrency/rollback tests | Isolated PostgreSQL | Pending engineering; not external blocker |
| Global legacy-session cutover | Explicit operational compatibility decision | P0 open: old cash/photo-less flow retained |
| COD completion | Authorised payment policy | Blocked in delivery-only app |
| Signed stores / production backend | Hosting, signing and all acceptance gates | NO-GO retained |
