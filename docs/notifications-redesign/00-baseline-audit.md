# Notifications baseline

The admin bell uses the authenticated navigation snapshot, which returns a recipient-scoped count and 30 recent records. The tray shows only 12. Customer mobile uses the account preview. Owner, driver and technician have separate notification surfaces. Existing navigation polling and field session allowlists are part of the access contract.

The notification table has a recipient, title, body, timestamp, read timestamp and related record ID. The common producer has no typed event field. Approval and System filters need authoritative event metadata. Existing admin order links additionally check current navigation access and branch scope. Single mark-as-read is recipient-scoped and preserves its first read timestamp.

Reuse the existing action router and table for paginated browsing and read-only state changes. Baseline screenshots were not captured.

Reviewed working tree based on commit 54b1b15f4e3a926f33973c6c11ab068ce6738cad and moved it to codex/notifications-centre with its existing changes. Node 24.21.0, Next.js 16.4.3 and Expo ~58.0.22 were present. The previous isolated PostgreSQL regression had 674 passes. See the existing owner regression log for that baseline.

Contract sources are database/migrations/001_initial.sql, apps/web/lib/navigation.ts, apps/web/lib/accounts.ts, apps/web/lib/governance.ts and apps/web/app/api/[action]/route.ts. The existing recipient/date index supports the paged list. The original native previews remain available to older clients.
