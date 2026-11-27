-- Additive daily scale model. No existing trips, readings or ledger entries are rewritten.
CREATE TABLE daily_delivery_runs (
 id text PRIMARY KEY, trip_id text NOT NULL UNIQUE REFERENCES driver_trips(id),
 branch_id text NOT NULL REFERENCES branches(id), driver_id text NOT NULL REFERENCES users(id), vehicle_id text NOT NULL REFERENCES driver_vehicles(id),
 opening_grams bigint NOT NULL CHECK(opening_grams>0), added_grams bigint NOT NULL DEFAULT 0 CHECK(added_grams>=0),
 supplied_grams bigint NOT NULL DEFAULT 0 CHECK(supplied_grams>=0), committed_grams bigint NOT NULL DEFAULT 0 CHECK(committed_grams>=0),
 state text NOT NULL DEFAULT 'active' CHECK(state IN ('active','closed')), version integer NOT NULL DEFAULT 1,
 scale_reference text NOT NULL DEFAULT '', opened_by text NOT NULL REFERENCES users(id), opened_at timestamptz NOT NULL DEFAULT now(),
 closing_grams bigint CHECK(closing_grams>=0), variance_grams bigint, closed_by text REFERENCES users(id), closed_at timestamptz,
 CHECK(supplied_grams+committed_grams<=opening_grams+added_grams), CHECK(version>0),
 CHECK((state='active' AND variance_grams IS NULL) OR (state='closed' AND committed_grams=0 AND variance_grams=closing_grams-(opening_grams+added_grams-supplied_grams))),
 CHECK((state='active' AND closed_at IS NULL AND closing_grams IS NULL AND closed_by IS NULL) OR (state='closed' AND closed_at IS NOT NULL AND closing_grams IS NOT NULL AND closed_by IS NOT NULL))
);
CREATE UNIQUE INDEX daily_one_active_branch ON daily_delivery_runs(branch_id) WHERE state='active';
CREATE TABLE daily_delivery_allocations (
 id text PRIMARY KEY, run_id text NOT NULL REFERENCES daily_delivery_runs(id), order_id text NOT NULL REFERENCES orders(id),
 grams bigint NOT NULL CHECK(grams>0), supplied_grams bigint NOT NULL DEFAULT 0,
 state text NOT NULL DEFAULT 'allocated' CHECK(state IN ('allocated','supplied','fulfilled','released')),
 created_at timestamptz NOT NULL DEFAULT now(), CHECK(supplied_grams IN (0,grams)), CHECK((state IN ('allocated','released') AND supplied_grams=0) OR (state IN ('supplied','fulfilled') AND supplied_grams=grams))
);
CREATE UNIQUE INDEX daily_one_order_allocation ON daily_delivery_allocations(order_id) WHERE state<>'released';
CREATE TABLE daily_delivery_refills (
 id text PRIMARY KEY, allocation_id text NOT NULL UNIQUE REFERENCES daily_delivery_allocations(id),
 order_id text NOT NULL REFERENCES orders(id), attempt_id text NOT NULL REFERENCES delivery_attempts(id),
 run_id text NOT NULL REFERENCES daily_delivery_runs(id), actor_id text NOT NULL REFERENCES users(id),
 readings jsonb NOT NULL, supplied_grams bigint NOT NULL CHECK(supplied_grams>0), recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE daily_delivery_weights (
 id text PRIMARY KEY, run_id text NOT NULL REFERENCES daily_delivery_runs(id), kind text NOT NULL CHECK(kind IN ('opening','addition','closing')),
 grams bigint NOT NULL CHECK(grams>=0), actor_id text NOT NULL REFERENCES users(id), reason text NOT NULL DEFAULT '', recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER daily_refills_immutable BEFORE UPDATE OR DELETE ON daily_delivery_refills FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();
CREATE TRIGGER daily_weights_immutable BEFORE UPDATE OR DELETE ON daily_delivery_weights FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();
CREATE FUNCTION preserve_daily_run() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' OR OLD.state='closed' OR NEW.added_grams<OLD.added_grams OR NEW.supplied_grams<OLD.supplied_grams OR NEW.version<=OLD.version OR (NEW.id,NEW.trip_id,NEW.branch_id,NEW.driver_id,NEW.vehicle_id,NEW.opening_grams,NEW.scale_reference,NEW.opened_by,NEW.opened_at) IS DISTINCT FROM (OLD.id,OLD.trip_id,OLD.branch_id,OLD.driver_id,OLD.vehicle_id,OLD.opening_grams,OLD.scale_reference,OLD.opened_by,OLD.opened_at) THEN RAISE EXCEPTION 'Daily opening and closed reconciliation are immutable'; END IF; RETURN NEW; END $$;
CREATE TRIGGER daily_run_guard BEFORE UPDATE OR DELETE ON daily_delivery_runs FOR EACH ROW EXECUTE FUNCTION preserve_daily_run();
CREATE FUNCTION preserve_daily_allocation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' OR OLD.state IN ('released','fulfilled') OR (NEW.id,NEW.run_id,NEW.order_id,NEW.grams,NEW.created_at) IS DISTINCT FROM (OLD.id,OLD.run_id,OLD.order_id,OLD.grams,OLD.created_at) OR NEW.supplied_grams<OLD.supplied_grams THEN RAISE EXCEPTION 'Daily allocation history is immutable'; END IF; RETURN NEW; END $$;
CREATE TRIGGER daily_allocation_guard BEFORE UPDATE OR DELETE ON daily_delivery_allocations FOR EACH ROW EXECUTE FUNCTION preserve_daily_allocation();
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['daily_delivery_runs','daily_delivery_allocations','daily_delivery_refills','daily_delivery_weights'] LOOP
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t); EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',t);
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='easygas_server') THEN EXECUTE format('CREATE POLICY server_only ON %I TO easygas_server USING(true) WITH CHECK(true)',t);EXECUTE format('GRANT SELECT,INSERT ON %I TO easygas_server',t); END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN EXECUTE format('REVOKE ALL ON %I FROM anon',t); END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE format('REVOKE ALL ON %I FROM authenticated',t); END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='easygas_server') THEN
 GRANT UPDATE(added_grams,supplied_grams,committed_grams,state,version,closing_grams,variance_grams,closed_by,closed_at) ON daily_delivery_runs TO easygas_server;
 GRANT UPDATE(supplied_grams,state) ON daily_delivery_allocations TO easygas_server;
 END IF; END $$;
