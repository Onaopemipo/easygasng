# Testimonial permissions and privacy

| Actor | Allowed |
|---|---|
| Guest | Sanitized published current versions and their separately consented current photos |
| Customer/commercial | Eligible own transactions; own drafts, edits, submissions, withdrawal and history |
| Owner | Global queue/analytics/export; original history; approve, publish, request changes, reject or hide |
| Other staff | No testimonial moderation grants in this release |

Marketing has no configured role in this repository, so no guessed marketing grant was added. Owner moderation uses the existing recent password verification requirement. Publication and approval are separate, explicit actions. A moderator cannot rewrite a customer's rating or text and cannot restore withdrawn consent.

Every private request resolves the current active session. Customer ownership checks do not trust client IDs. Row locks plus expected revisions reject stale mutations; a unique transaction reference prevents duplicate reviews. Creation is serialized per customer for daily limits. Text rejects HTML, links and contact-number patterns; known transaction street text is rejected. React escapes rendered text. Public responses use a strict field whitelist.

All workflow changes, immutable events, in-app notifications and audits share a database transaction. An injected notification write failure rolls back the mutation, and retry creates one authoritative event. No external notification delivery is claimed.

Migrations 034–037 add the publication envelope, immutable versions/events, media consent and restricted trusted-server policies. Anonymous/browser database roles have no table access. The restricted server has SELECT/INSERT and only workflow-column UPDATE on the mutable parent; immutable version/event UPDATE and DELETE are denied. No SECURITY DEFINER function or browser database credential was introduced. Local private-schema tests pass; real PostgreSQL multi-connection verification remains a separate release blocker.

Privacy exception to optimistic editing: an owned consent withdrawal intentionally succeeds despite an older UI revision, so concurrent moderation cannot prevent revocation. A repeated withdrawal returns the existing terminal result without a duplicate event. Moderator and content edits still require the exact current revision. `TM-WITHDRAW-STALE` verifies this locally; `TM-PG` prepares the real multi-connection race.

The existing identity-verified personal-data export now includes only owned testimonial versions and consent/events. Completed purchase/service entry links prioritize the owned transaction (including an older transaction) without trusting client ownership. First-name/initial preferences do not require an irrelevant custom-name field. The embedded account section shows 100 recent submissions; the full version/consent history is available through the existing verified data export. `TM-ENTRY` and `TM-EXPORT` cover ownership and identity checks.

JSON and multipart endpoints share the existing request-origin policy: same-port loopback aliases are accepted only in development; production requires its configured exact origin. `ORIGIN-01`, `ORIGIN-02` and the actual upload handler checks verify the rule.
