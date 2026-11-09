-- Presence is distinct from declared availability and captured GPS.
-- Nullable metadata, no business-record rewrite/backfill.
ALTER TABLE users ADD COLUMN IF NOT EXISTS driver_last_seen_at timestamptz;
CREATE INDEX IF NOT EXISTS driver_contact_by_branch ON users(branch_id,driver_last_seen_at) WHERE role='driver' AND active=true;
