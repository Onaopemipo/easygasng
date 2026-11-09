-- Branch mass remains canonical and inclusive of vehicle custody. No opening balances.
CREATE TABLE bulk_lpg_meters (
 id text PRIMARY KEY,vehicle_id text NOT NULL REFERENCES driver_vehicles(id),serial text NOT NULL UNIQUE,
 calibration_reference text NOT NULL,calibration_expires_at timestamptz NOT NULL,
 unit text NOT NULL DEFAULT 'grams' CHECK(unit='grams'),active boolean NOT NULL DEFAULT true,
 recorded_by text NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE bulk_lpg_loads (
 id text PRIMARY KEY,trip_id text NOT NULL UNIQUE REFERENCES driver_trips(id),meter_id text NOT NULL REFERENCES bulk_lpg_meters(id),
 branch_id text NOT NULL REFERENCES branches(id),loaded_grams bigint NOT NULL CHECK(loaded_grams>0),
 buffer_grams bigint NOT NULL CHECK(buffer_grams>=0 AND buffer_grams<=loaded_grams),
 dispensed_grams bigint NOT NULL DEFAULT 0 CHECK(dispensed_grams>=0 AND dispensed_grams<=loaded_grams),
 meter_reading_grams bigint NOT NULL CHECK(meter_reading_grams>=0),
 issued_by text NOT NULL REFERENCES users(id),acknowledged_by text REFERENCES users(id),received_by text REFERENCES users(id),
 state text NOT NULL DEFAULT 'issued' CHECK(state IN ('issued','active','returning','held','reconciled')),
 declared_return_grams bigint CHECK(declared_return_grams>=0),version integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),CHECK(acknowledged_by IS NULL OR acknowledged_by<>issued_by),
 CHECK(received_by IS NULL OR received_by<>acknowledged_by)
);
CREATE TABLE bulk_lpg_allocations (
 order_id text PRIMARY KEY REFERENCES orders(id),load_id text NOT NULL REFERENCES bulk_lpg_loads(id),
 grams bigint NOT NULL CHECK(grams>0),dispensed_grams bigint NOT NULL DEFAULT 0 CHECK(dispensed_grams>=0 AND dispensed_grams<=grams),
 state text NOT NULL DEFAULT 'allocated' CHECK(state IN ('allocated','dispensed','released','returned','fulfilled'))
);
CREATE INDEX bulk_lpg_allocations_load ON bulk_lpg_allocations(load_id);
CREATE TABLE bulk_lpg_events (
 id text PRIMARY KEY,load_id text NOT NULL REFERENCES bulk_lpg_loads(id),order_id text REFERENCES orders(id),
 kind text NOT NULL,actor_id text NOT NULL REFERENCES users(id),detail jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bulk_lpg_events_history ON bulk_lpg_events(load_id,created_at,id);
CREATE TRIGGER bulk_lpg_events_immutable BEFORE UPDATE OR DELETE ON bulk_lpg_events FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['bulk_lpg_meters','bulk_lpg_loads','bulk_lpg_allocations','bulk_lpg_events'] LOOP
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',t);
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='easygas_server') THEN
 EXECUTE format('GRANT SELECT,INSERT,UPDATE ON %I TO easygas_server',t);
 EXECUTE format('CREATE POLICY server_only ON %I TO easygas_server USING(true) WITH CHECK(true)',t);END IF;
 END LOOP; END $$;
