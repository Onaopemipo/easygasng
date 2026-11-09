# Testimonial moderation workflow

DRAFT → PENDING_REVIEW → APPROVED → PUBLISHED. Approval alone is never public.

Pending reviews can instead become CHANGES_REQUESTED or REJECTED. A customer can edit a nonterminal submission back to a new DRAFT, including a published one; material edits clear approval. Approved/published records can be HIDDEN. A hidden record can be republished only with the reviewed current version and valid consent/eligibility. Customers can WITHDRAW from every nonterminal state; moderators cannot undo withdrawal. REJECTED and WITHDRAWN are terminal.

1. Customer chooses an eligible completed purchase/service, rating, original feedback and public-name preference.
2. Customer saves a draft, optionally uploads a separately consented photo when enabled, then submits for review.
3. Owner verifies identity through the existing account menu, reads the original/current version, consent and events, and records a reason/category in the in-app moderation dialog.
4. Owner approves, then separately publishes. Negative ratings are not suppressed automatically and a rating alone is not a rejection reason.
5. Public read/photo requests resolve only the reviewed current version. A customer edit or withdrawal removes that public version immediately from subsequent server reads.
6. Changes are recorded transactionally and in-app notifications follow the configured policy. External email/SMS delivery remains unconnected.

Concurrency uses a locked parent and expected revision. The local stale-review test proves a newer customer version cannot be approved with an older revision. Do not interpret serialized PGlite evidence as a real multi-connection PostgreSQL race test.

Privacy exception to optimistic editing: an owned consent withdrawal intentionally succeeds despite an older UI revision, so concurrent moderation cannot prevent revocation. A repeated withdrawal returns the existing terminal result without a duplicate event. Moderator and content edits still require the exact current revision. `TM-WITHDRAW-STALE` verifies this locally; `TM-PG` prepares the real multi-connection race.
