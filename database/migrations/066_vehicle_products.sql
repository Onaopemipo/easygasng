-- Canonical branch inventory remains inclusive of measured vehicle custody.
ALTER TABLE driver_vehicles ADD COLUMN physical_capacity_grams bigint CHECK(physical_capacity_grams>0);
CREATE TABLE vehicle_product_loads (
 id text PRIMARY KEY,trip_id text NOT NULL REFERENCES driver_trips(id),branch_id text NOT NULL REFERENCES branches(id),product_id text NOT NULL REFERENCES products(id),
 quantity integer NOT NULL CHECK(quantity>0),unit_weight_grams bigint NOT NULL CHECK(unit_weight_grams>0),
 available integer NOT NULL CHECK(available>=0),reserved integer NOT NULL DEFAULT 0 CHECK(reserved>=0),handed integer NOT NULL DEFAULT 0 CHECK(handed>=0),
 returned integer NOT NULL DEFAULT 0 CHECK(returned>=0),removed integer NOT NULL DEFAULT 0 CHECK(removed>=0),
 issued_by text NOT NULL REFERENCES users(id),acknowledged_by text REFERENCES users(id),received_by text REFERENCES users(id),
 state text NOT NULL DEFAULT 'issued' CHECK(state IN ('issued','active','returning','held','reconciled')),version integer NOT NULL DEFAULT 1,
 evidence text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(quantity=available+reserved+handed+returned+removed),CHECK(acknowledged_by IS NULL OR acknowledged_by<>issued_by),CHECK(received_by IS NULL OR received_by<>acknowledged_by)
);
CREATE TABLE vehicle_product_serials (
 id text PRIMARY KEY,load_id text NOT NULL REFERENCES vehicle_product_loads(id),cylinder_id text NOT NULL REFERENCES cylinders(id),
 state text NOT NULL DEFAULT 'loaded' CHECK(state IN ('loaded','reserved','handed','returned','quarantined')),amendment_id text REFERENCES doorstep_amendments(id),UNIQUE(load_id,cylinder_id)
);
CREATE UNIQUE INDEX vehicle_serial_custody ON vehicle_product_serials(cylinder_id) WHERE state IN ('loaded','reserved');
CREATE TABLE vehicle_product_events(id text PRIMARY KEY,load_id text NOT NULL REFERENCES vehicle_product_loads(id),order_id text REFERENCES orders(id),kind text NOT NULL,actor_id text NOT NULL REFERENCES users(id),detail jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TRIGGER vehicle_product_events_immutable BEFORE UPDATE OR DELETE ON vehicle_product_events FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();
CREATE TABLE doorstep_product_execution(
 amendment_id text PRIMARY KEY REFERENCES doorstep_amendments(id),order_id text NOT NULL REFERENCES orders(id),trip_id text NOT NULL REFERENCES driver_trips(id),note_id text NOT NULL UNIQUE REFERENCES invoice_notes(id),credit_note_id text UNIQUE REFERENCES invoice_notes(id),
 amount_kobo bigint NOT NULL CHECK(amount_kobo>0),state text NOT NULL DEFAULT 'reserved' CHECK(state IN ('reserved','handed','cancelled')),
 expires_at timestamptz NOT NULL,cash_reported_by text REFERENCES users(id),cash_reported_at timestamptz,cash_verified_by text REFERENCES users(id),cash_verified_at timestamptz,
 CHECK(cash_verified_by IS NULL OR (cash_reported_by IS NOT NULL AND cash_verified_by<>cash_reported_by))
);
CREATE UNIQUE INDEX doorstep_product_pending ON doorstep_product_execution(order_id) WHERE state='reserved';
CREATE TABLE doorstep_product_lines(id text PRIMARY KEY,amendment_id text NOT NULL REFERENCES doorstep_product_execution(amendment_id),load_id text NOT NULL REFERENCES vehicle_product_loads(id),product_id text NOT NULL REFERENCES products(id),quantity integer NOT NULL CHECK(quantity>0),unit_price_kobo bigint NOT NULL CHECK(unit_price_kobo>0),name text NOT NULL,serialized boolean NOT NULL,state text NOT NULL DEFAULT 'reserved' CHECK(state IN ('reserved','handed','cancelled')),UNIQUE(amendment_id,load_id));
DO $$ DECLARE t text;BEGIN FOREACH t IN ARRAY ARRAY['vehicle_product_loads','vehicle_product_serials','vehicle_product_events','doorstep_product_execution','doorstep_product_lines'] LOOP
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',t);EXECUTE format('REVOKE ALL ON %I FROM PUBLIC',t);
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='easygas_server') THEN EXECUTE format('GRANT SELECT,INSERT,UPDATE ON %I TO easygas_server',t);EXECUTE format('CREATE POLICY server_only ON %I TO easygas_server USING(true) WITH CHECK(true)',t);END IF;
 END LOOP;END $$;
