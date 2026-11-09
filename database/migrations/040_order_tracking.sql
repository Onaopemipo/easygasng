-- Additive local rollout. Historical events keep version 0; no invented timestamps/actors.
ALTER TABLE orders ADD COLUMN tracking_version integer NOT NULL DEFAULT 0;
ALTER TABLE order_events ADD COLUMN version integer;
ALTER TABLE order_events ADD COLUMN previous_status text;
ALTER TABLE order_events ADD COLUMN correlation_id text;
CREATE INDEX order_events_order_version ON order_events(order_id,version);
CREATE TABLE delivery_attempts (
 id text PRIMARY KEY, order_id text NOT NULL REFERENCES orders(id), driver_id text NOT NULL REFERENCES users(id),
 assignment_version integer NOT NULL, state text NOT NULL CHECK(state IN ('assigned','picked_up','arrived','failed','delivered','returned')),
 picked_up_at timestamptz, arrived_at timestamptz, completed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(order_id,assignment_version)
);
CREATE UNIQUE INDEX delivery_attempt_active ON delivery_attempts(order_id) WHERE state IN ('assigned','picked_up','arrived');
CREATE INDEX delivery_attempt_driver ON delivery_attempts(driver_id,state);
CREATE TABLE delivery_evidence (
 id text PRIMARY KEY, attempt_id text NOT NULL REFERENCES delivery_attempts(id), actor_id text NOT NULL REFERENCES users(id),
 kind text NOT NULL CHECK(kind IN ('pickup','arrived','failed','handover','return','rescheduled')),
 detail jsonb NOT NULL, operation_key text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX delivery_evidence_attempt ON delivery_evidence(attempt_id,created_at);
CREATE TRIGGER delivery_evidence_immutable BEFORE UPDATE OR DELETE ON delivery_evidence FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();
CREATE TABLE order_event_outbox (
 event_id text PRIMARY KEY REFERENCES order_events(id), order_id text NOT NULL REFERENCES orders(id),
 version integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), notified_at timestamptz
);
CREATE INDEX order_outbox_pending ON order_event_outbox(created_at) WHERE notified_at IS NULL;
CREATE FUNCTION record_order_tracking_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 SELECT status INTO NEW.previous_status FROM order_events WHERE order_id=NEW.order_id ORDER BY version DESC NULLS LAST,created_at DESC LIMIT 1;
 UPDATE orders SET tracking_version=tracking_version+1 WHERE id=NEW.order_id RETURNING tracking_version INTO NEW.version;
 NEW.correlation_id := COALESCE(NEW.correlation_id,NEW.id);
 RETURN NEW;
END $$;
CREATE TRIGGER order_event_version BEFORE INSERT ON order_events FOR EACH ROW EXECUTE FUNCTION record_order_tracking_event();
CREATE FUNCTION publish_order_tracking_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 INSERT INTO order_event_outbox(event_id,order_id,version) VALUES(NEW.id,NEW.order_id,NEW.version);
 RETURN NEW;
END $$;
CREATE TRIGGER order_event_outbox AFTER INSERT ON order_events FOR EACH ROW EXECUTE FUNCTION publish_order_tracking_event();
CREATE TRIGGER order_events_immutable BEFORE UPDATE OR DELETE ON order_events FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['delivery_attempts','delivery_evidence','order_event_outbox'] LOOP
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='easygas_server') THEN
 EXECUTE format('GRANT SELECT,INSERT,UPDATE ON %I TO easygas_server',t);
 EXECUTE format('CREATE POLICY trusted_server ON %I TO easygas_server USING(true) WITH CHECK(true)',t);
 END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='easygas_server') THEN
 GRANT UPDATE(tracking_version,delivery_date,delivery_window,delivery_code_hash,delivery_code_expires_at) ON orders TO easygas_server;
 END IF;
END $$;
