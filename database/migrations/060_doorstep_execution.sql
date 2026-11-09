-- Supplementary gas stays attached to the original order, invoice and vehicle.
CREATE TABLE doorstep_execution (
 amendment_id text PRIMARY KEY REFERENCES doorstep_amendments(id),
 order_id text NOT NULL REFERENCES orders(id),load_id text NOT NULL REFERENCES bulk_lpg_loads(id),
 note_id text NOT NULL UNIQUE REFERENCES invoice_notes(id),credit_note_id text UNIQUE REFERENCES invoice_notes(id),
 grams bigint NOT NULL CHECK(grams>0),amount_kobo bigint NOT NULL CHECK(amount_kobo>0),
 cylinder_id text NOT NULL REFERENCES cylinders(id),allowable_grams bigint NOT NULL CHECK(allowable_grams>=grams),
 inspected_by text NOT NULL REFERENCES users(id),inspection_evidence text NOT NULL,
 expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 state text NOT NULL DEFAULT 'reserved' CHECK(state IN ('reserved','dispensed','cancelled')),
 cash_reported_by text REFERENCES users(id),cash_reported_at timestamptz,
 cash_verified_by text REFERENCES users(id),cash_verified_at timestamptz,
 CHECK(cash_verified_by IS NULL OR (cash_reported_by IS NOT NULL AND cash_verified_by<>cash_reported_by))
);
CREATE UNIQUE INDEX doorstep_one_reserved_order ON doorstep_execution(order_id) WHERE state='reserved';
CREATE UNIQUE INDEX doorstep_one_reserved_cylinder ON doorstep_execution(cylinder_id) WHERE state='reserved';
CREATE INDEX doorstep_load_pending ON doorstep_execution(load_id,state);
CREATE FUNCTION preserve_doorstep_execution() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' OR OLD.state<>'reserved' THEN RAISE EXCEPTION 'Doorstep execution history is immutable'; END IF;
 IF (NEW.amendment_id,NEW.order_id,NEW.load_id,NEW.note_id,NEW.grams,NEW.amount_kobo,NEW.cylinder_id,NEW.allowable_grams,NEW.inspected_by,NEW.inspection_evidence,NEW.expires_at,NEW.created_at)
 IS DISTINCT FROM (OLD.amendment_id,OLD.order_id,OLD.load_id,OLD.note_id,OLD.grams,OLD.amount_kobo,OLD.cylinder_id,OLD.allowable_grams,OLD.inspected_by,OLD.inspection_evidence,OLD.expires_at,OLD.created_at)
 OR (OLD.cash_reported_by IS NOT NULL AND (NEW.cash_reported_by,NEW.cash_reported_at) IS DISTINCT FROM (OLD.cash_reported_by,OLD.cash_reported_at))
 OR (OLD.cash_verified_by IS NOT NULL AND (NEW.cash_verified_by,NEW.cash_verified_at) IS DISTINCT FROM (OLD.cash_verified_by,OLD.cash_verified_at))
 OR (OLD.credit_note_id IS NOT NULL AND NEW.credit_note_id IS DISTINCT FROM OLD.credit_note_id)
 THEN RAISE EXCEPTION 'Doorstep obligation and collection evidence is immutable'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER doorstep_execution_guard BEFORE UPDATE OR DELETE ON doorstep_execution FOR EACH ROW EXECUTE FUNCTION preserve_doorstep_execution();
ALTER TABLE doorstep_execution ENABLE ROW LEVEL SECURITY;
ALTER TABLE doorstep_execution FORCE ROW LEVEL SECURITY;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='easygas_server') THEN
 GRANT SELECT,INSERT,UPDATE ON doorstep_execution TO easygas_server;
 CREATE POLICY server_only ON doorstep_execution TO easygas_server USING(true) WITH CHECK(true);
END IF; END $$;
