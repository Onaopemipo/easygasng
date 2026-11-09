ALTER TABLE service_materials ADD COLUMN missing integer NOT NULL DEFAULT 0 CHECK(missing>=0);
CREATE TABLE service_material_recovery_history(id text PRIMARY KEY,material_id text NOT NULL UNIQUE REFERENCES service_materials(id),booking_id text NOT NULL REFERENCES service_bookings(id),approval_key text NOT NULL,detail jsonb NOT NULL,recorded_by text NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now());
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON service_material_recovery_history FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();
ALTER TABLE service_material_recovery_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_material_recovery_history FORCE ROW LEVEL SECURITY;
REVOKE ALL ON service_material_recovery_history FROM PUBLIC;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='easygas_server') THEN GRANT SELECT,INSERT ON service_material_recovery_history TO easygas_server;CREATE POLICY server_only ON service_material_recovery_history TO easygas_server USING(true) WITH CHECK(true);END IF;END $$;
