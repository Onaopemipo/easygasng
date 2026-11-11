# Support architecture and contracts

Existing support_requests and support_messages remain the source of truth.
Legacy support.list returns an array. Optional view=inbox returns rows, scoped
totals and canManage. It never includes private notes in customer reads.
Optional customerRef on support.create uses an active existing customer ID;
staff must have support management permission. Linked orders must belong to the
selected customer and be in the staff actor's permitted branch. Legacy intake
omits customerRef and uses the actor. Existing ticket identifiers are retained.

`support.list?view=paged` returns `rows`, `total`, `page`, `pages`, and separate scoped totals. Filters include literal subject, customer name or ID search, status, last-activity days and a staff-only overdue filter. `support.detail?id=…&page=latest` loads the newest message page and authorized attachment metadata. Numerical message pages are stable for unchanged data, ordered by timestamp and ID. Polling pauses when the web tab or mobile app is in the background. Failed requests report stale data; authorization failures clear the affected view.

`POST /api/media` accepts `requestId`, `image`, `alt` and optional `internal=true`. `GET /api/media/{id}` authorizes the current session and ticket every time. Content stays in the private PostgreSQL schema. Uploads are separate from text sends so failed uploads can be retried without resending a reply. `operationId` makes repeated replies idempotent. Manage requests submit an expected version. The legacy API continues accepting its original payloads.

A verified owner or branch manager configures working days, local hours and targets. The application snapshots the policy when a request is created or a manager explicitly enrolls a legacy request. The first public staff reply ends the response clock; resolution or closure ends the resolution clock. Reopening resumes the existing resolution target. An overdue notice is inserted once per ticket, target and deadline, then delivered to active branch managers, owners and the assignee through in-app notifications.
