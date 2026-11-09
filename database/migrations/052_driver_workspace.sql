-- Additive capabilities on canonical identities/sessions; no parallel driver model.
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS driver_delivery_only boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS driver_available boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS driver_availability_updated_at timestamptz;
CREATE INDEX IF NOT EXISTS driver_owned_history ON orders(driver_id,created_at DESC) WHERE driver_id IS NOT NULL;
