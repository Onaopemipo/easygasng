# Bounded security review

Scope and current roles are enforced server-side. Staff cannot create or search
provisional users from intake; a supplied reference resolves an existing active
customer in permitted scope. Linked order ownership is rechecked. Queries bind
values; only fixed role predicates are selected. Messages render as text;
customer reads filter private notes in SQL. Existing CSRF, audit and notification
mechanisms remain. No new file, provider, financial or stock path. Legacy
support writes do not gain new idempotency or SLA protections in this pass.

## Continuation

Uploads validate the session, origin, active request, ownership or current branch permissions, MIME allowlist, decoded format, byte and pixel limits, and count under the ticket lock. Still images are re-encoded as WebP without metadata. The authenticated media route returns private no-store content with nosniff and sandbox headers. A staff-only image never appears in a customer response and direct customer access returns 404. New tables have RLS and explicit trusted server access. Evidence and replay records are append-only. There is no separate malware scanner or PDF/executable upload path. Reply, policy, enrollment, attachment and escalation mutations are audited.
