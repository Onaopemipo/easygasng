-- Link immutable event/proof records to the actual actor-scoped operation identity.
CREATE OR REPLACE FUNCTION record_order_tracking_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 SELECT status INTO NEW.previous_status FROM order_events WHERE order_id=NEW.order_id ORDER BY version DESC NULLS LAST,created_at DESC LIMIT 1;
 UPDATE orders SET tracking_version=tracking_version+1 WHERE id=NEW.order_id RETURNING tracking_version INTO NEW.version;
 NEW.correlation_id := COALESCE(NEW.correlation_id,NULLIF(current_setting('easygas.operation_key',true),''),NEW.id);
 RETURN NEW;
END $$;
ALTER TABLE delivery_evidence ALTER COLUMN operation_key SET DEFAULT NULLIF(current_setting('easygas.operation_key',true),'');
CREATE UNIQUE INDEX order_events_version_once ON order_events(order_id,version) WHERE version IS NOT NULL;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='easygas_server') THEN
 REVOKE UPDATE ON delivery_evidence FROM easygas_server;
 REVOKE UPDATE ON order_event_outbox FROM easygas_server;
 GRANT UPDATE(notified_at) ON order_event_outbox TO easygas_server;
END IF; END $$;
