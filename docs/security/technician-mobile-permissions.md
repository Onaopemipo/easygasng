# Technician access controls

All reads call current actor/session validation. `technician.jobs` allows only technician and active current branch, deriving technician and branch from the actor. Strict query input rejects identity overrides. Literal LIKE escaping prevents wildcard/injection search broadening. Paged DTO excludes financial ledgers, material costs, staff administration and other customers' jobs. Detail selector retains existing booking scope/hydration. Restricted technician sessions explicitly allow this read, without finance/approval/stock administration access. API read budget120/user/minute applies to jobs/snapshot.

Mutations remain existing version/lock/idempotency/audit transactions. Native availability retains the same operation key across uncertain retries. Existing server approval and verified-payment guard is unchanged. Job pickers cannot replace upload/report server authorisation. Existing private media consent, MIME/size/hash/EXIF/retention checks remain. No credentials, raw tokens or customer proof are placed in these documents.

Profile edit remains own name only; qualifications, role, branch, verification and identity are not self-editable. Current encrypted native drafts are account/job scoped. Logout revokes the session and clears token/memory; warning avoids silent evidence deletion. Comprehensive encrypted offline evidence retention, lost-ack recovery and post-revocation reconciliation have not been certified. Existing legacy unrestricted technician-session cutover remains a separate P0 gate.

No schema, security policy weakening, provider activation, production database import or deployment performed.
