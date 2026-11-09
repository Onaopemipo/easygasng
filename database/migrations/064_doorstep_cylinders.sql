-- Per-cylinder evidence extends the existing supplementary obligation; no duplicate order/ledger.
CREATE TABLE doorstep_cylinder_lines (
 id text PRIMARY KEY, amendment_id text NOT NULL REFERENCES doorstep_execution(amendment_id),
 position integer NOT NULL CHECK(position BETWEEN 1 AND 10), cylinder_id text NOT NULL REFERENCES cylinders(id),
 grams bigint NOT NULL CHECK(grams>0), capacity_grams bigint NOT NULL CHECK(capacity_grams>=grams),
 amount_kobo bigint NOT NULL CHECK(amount_kobo>0), allowable_grams bigint NOT NULL CHECK(allowable_grams>=grams AND allowable_grams<=capacity_grams),
 inspected_by text NOT NULL REFERENCES users(id), evidence text NOT NULL,
 state text NOT NULL DEFAULT 'reserved' CHECK(state IN ('reserved','dispensed','cancelled')),
 meter_reading_grams bigint CHECK(meter_reading_grams>=0), recorded_by text REFERENCES users(id), recorded_at timestamptz,
 UNIQUE(amendment_id,position), UNIQUE(amendment_id,cylinder_id),
 CHECK((state='dispensed')=(meter_reading_grams IS NOT NULL AND recorded_by IS NOT NULL AND recorded_at IS NOT NULL))
);
CREATE UNIQUE INDEX doorstep_cylinder_pending ON doorstep_cylinder_lines(cylinder_id) WHERE state='reserved';
CREATE FUNCTION preserve_doorstep_cylinder_line() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' OR OLD.state<>'reserved' OR
 (NEW.id,NEW.amendment_id,NEW.position,NEW.cylinder_id,NEW.grams,NEW.capacity_grams,NEW.amount_kobo,NEW.allowable_grams,NEW.inspected_by,NEW.evidence)
 IS DISTINCT FROM (OLD.id,OLD.amendment_id,OLD.position,OLD.cylinder_id,OLD.grams,OLD.capacity_grams,OLD.amount_kobo,OLD.allowable_grams,OLD.inspected_by,OLD.evidence)
 THEN RAISE EXCEPTION 'Cylinder obligation and fulfilled evidence are immutable'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER doorstep_cylinder_guard BEFORE UPDATE OR DELETE ON doorstep_cylinder_lines FOR EACH ROW EXECUTE FUNCTION preserve_doorstep_cylinder_line();
ALTER TABLE doorstep_cylinder_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE doorstep_cylinder_lines FORCE ROW LEVEL SECURITY;
REVOKE ALL ON doorstep_cylinder_lines FROM PUBLIC;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='easygas_server') THEN
 GRANT SELECT,INSERT,UPDATE ON doorstep_cylinder_lines TO easygas_server;
 CREATE POLICY server_only ON doorstep_cylinder_lines TO easygas_server USING(true) WITH CHECK(true);
END IF; END $$;
