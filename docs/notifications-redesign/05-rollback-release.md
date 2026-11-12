# Rollback and release decision

Feature acceptance remains open. Platform production remains NO-GO. No deployment was made.

Revert the notification UI, action handlers and associated session allowlist entries together. Existing clients continue to use the original notification previews and single-read endpoint. No schema migration is required. Retain notification history and read timestamps.
