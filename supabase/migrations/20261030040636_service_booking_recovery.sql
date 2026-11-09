BEGIN;
SET LOCAL search_path=easygas_private,pg_catalog;
-- Additive recovery records. No retention expiry: a committed identity remains authoritative.
CREATE TABLE business_operation_results (
 operation_key text PRIMARY KEY,
 actor_id text NOT NULL REFERENCES users(id),
 action text NOT NULL,
 actor_role text NOT NULL,
 actor_branch text,
 request_hash text NOT NULL,
 result jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),
 committed_at timestamptz,
 CHECK ((result IS NULL AND committed_at IS NULL) OR (result IS NOT NULL AND committed_at IS NOT NULL))
);
CREATE INDEX business_operation_actor ON business_operation_results(actor_id,created_at DESC);
CREATE FUNCTION protect_operation_result() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' OR OLD.committed_at IS NOT NULL OR NEW.operation_key<>OLD.operation_key OR NEW.actor_id<>OLD.actor_id OR NEW.action<>OLD.action OR NEW.request_hash<>OLD.request_hash THEN
 RAISE EXCEPTION 'Committed operation evidence is immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_operation_result BEFORE UPDATE OR DELETE ON business_operation_results FOR EACH ROW EXECUTE FUNCTION protect_operation_result();
ALTER TABLE business_operation_results ENABLE ROW LEVEL SECURITY;
-- Server/private SQL access only; no client Data API grants or policies.
CREATE UNIQUE INDEX service_active_slot_once ON service_bookings(slot_id) WHERE status NOT IN ('completed','cancelled','failed');
ALTER TABLE service_quotes ADD COLUMN valid_until timestamptz;

DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='easygas_server') THEN
 GRANT SELECT,INSERT,UPDATE ON business_operation_results TO easygas_server;
 CREATE POLICY trusted_server ON business_operation_results TO easygas_server USING(true) WITH CHECK(true);
END IF; END $$;

INSERT INTO schema_migrations(version) VALUES ('033');
COMMIT;
