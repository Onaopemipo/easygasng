# Notifications and communication boundaries

The persisted in-app inbox is shared by web and native clients. Orders, support, approvals and service lifecycle events create notifications. Service quotes/decisions/report/acknowledgement use the same records. Service follow-up reminders respect the independently saved `service_reminders` preference and Lagos quiet hours, deduplicate by follow-up and stop for dismissed/rebooked records. They never automatically book or charge.

Existing refill plans/predictions and independently approved in-app campaigns recheck their applicable consent/quiet-hour conditions. Marketing opt-in is distinct from operational notifications. Account recovery, verification and invitation email messages queue in `message_outbox`; local preview is intentionally not marked externally sent.

Email, SMS, WhatsApp and push adapters, delivery receipts, bounce handling, provider retry/dead-letter controls, verified sender/domain setup and native push token/deep-link routing remain unconnected/incomplete. Outbox rows and in-app notices are not evidence of external delivery. No customer communication has been sent during this implementation.

Unexpected API and maintenance failures attempt a redacted operational incident after rollback. If incident persistence is unavailable, a diagnostic reference/category/error type is logged without request bodies or credentials. This is local observability, not a monitored production alert service. Before activation assign an operator and configure the approved channels and recovery paths.
