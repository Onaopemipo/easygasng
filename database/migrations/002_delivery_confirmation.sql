-- Compatibility upgrade for the first local development database; safe on a fresh install.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_code_hash text NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_code_expires_at timestamptz NOT NULL DEFAULT now();
CREATE TABLE IF NOT EXISTS cash_collections (id text PRIMARY KEY, order_id text NOT NULL UNIQUE REFERENCES orders(id), collector_id text NOT NULL REFERENCES users(id), amount_kobo bigint NOT NULL CHECK(amount_kobo > 0), verified_by text REFERENCES users(id), verified_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS verified_payments (id text PRIMARY KEY, order_id text NOT NULL REFERENCES orders(id), reference text NOT NULL UNIQUE, amount_kobo bigint NOT NULL CHECK(amount_kobo > 0), method text NOT NULL, verified_by text NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now());
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='payments_immutable') THEN CREATE TRIGGER payments_immutable BEFORE UPDATE OR DELETE ON verified_payments FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation(); END IF; END $$;
