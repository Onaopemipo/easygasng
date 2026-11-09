# Additive migration and recovery

Before adding migration070, an isolated pre070 database is migrated using the existing explicit migrator and backed up. The backup is restored into a separate isolated database and canonical stock/order/payment counts compared. This is a synthetic local recovery rehearsal, not a production backup or permission to migrate the hosted demo.

070 adds nullable users.driver_last_seen_at and a branch/contact index only. No backfill, opening stock, financial record, identity replacement or historical rewrite. Older binaries ignore the column. Roll back application code first; retain the nullable column and all existing records. Do not drop/restore over live business writes. Production migration requires a fresh verified backup and applicable independent launch gates; none are approved here.

Presence is server-observed foreground contact, not availability, GPS or guaranteed connectivity. Old/null timestamps remain unknown. Heartbeats update at most once per15 seconds, do not alter availability and do not create financial/business-operation results. No schema mutation occurs from the read endpoint.
