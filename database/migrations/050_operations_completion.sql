-- Additive operations workflows. No imported history, provider activation or balance edits.
CREATE TABLE phone_activations (
 id text PRIMARY KEY, token_hash text NOT NULL UNIQUE, order_id text NOT NULL REFERENCES orders(id), customer_id text NOT NULL REFERENCES users(id),
 phone text NOT NULL, expires_at timestamptz NOT NULL, revoked_at timestamptz, consumed_at timestamptz,
 otp_hash text, otp_expires_at timestamptz, otp_attempts integer NOT NULL DEFAULT 0, sent_at timestamptz,
 verified_at timestamptz, created_by text NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX phone_activation_customer ON phone_activations(customer_id,created_at DESC);
CREATE TABLE invoice_notes (
 id text PRIMARY KEY, invoice_id text NOT NULL REFERENCES customer_invoices(id), sequence integer NOT NULL,
 kind text NOT NULL CHECK(kind IN ('credit','debit','void')), amount_kobo bigint NOT NULL CHECK(amount_kobo>0),
 reason text NOT NULL, requested_by text NOT NULL REFERENCES users(id), approved_by text REFERENCES users(id),
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','approved','rejected')),
 created_at timestamptz NOT NULL DEFAULT now(), decided_at timestamptz, UNIQUE(invoice_id,sequence),
 CHECK(approved_by IS NULL OR approved_by<>requested_by)
);
CREATE TABLE invoice_note_events(id text PRIMARY KEY,note_id text NOT NULL REFERENCES invoice_notes(id),actor_id text NOT NULL REFERENCES users(id),detail jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TRIGGER invoice_note_events_immutable BEFORE UPDATE OR DELETE ON invoice_note_events FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();
CREATE TABLE invoice_payment_requests (
 id text PRIMARY KEY, invoice_id text NOT NULL REFERENCES customer_invoices(id), invoice_version integer NOT NULL, token_hash text NOT NULL UNIQUE,
 amount_kobo bigint NOT NULL CHECK(amount_kobo>0),currency text NOT NULL DEFAULT 'NGN' CHECK(currency='NGN'),
 expires_at timestamptz NOT NULL, revoked_at timestamptz, created_by text NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX invoice_request_invoice ON invoice_payment_requests(invoice_id,created_at DESC);
CREATE TABLE driver_vehicles(id text PRIMARY KEY,branch_id text NOT NULL REFERENCES branches(id),label text NOT NULL,capacity_grams bigint NOT NULL CHECK(capacity_grams>0),lpg_suitable boolean NOT NULL DEFAULT false,active boolean NOT NULL DEFAULT true,estimated_litres_per_100km numeric CHECK(estimated_litres_per_100km>0));
CREATE TABLE driver_trips(id text PRIMARY KEY,driver_id text NOT NULL REFERENCES users(id),vehicle_id text NOT NULL REFERENCES driver_vehicles(id),branch_id text NOT NULL REFERENCES branches(id),start_odometer numeric NOT NULL CHECK(start_odometer>=0),end_odometer numeric CHECK(end_odometer>=start_odometer),location_consent boolean NOT NULL,started_at timestamptz NOT NULL DEFAULT now(),ended_at timestamptz,version integer NOT NULL DEFAULT 1);
CREATE UNIQUE INDEX driver_active_trip ON driver_trips(driver_id) WHERE ended_at IS NULL;
CREATE UNIQUE INDEX vehicle_active_trip ON driver_trips(vehicle_id) WHERE ended_at IS NULL;
CREATE TABLE trip_events(id text PRIMARY KEY,trip_id text NOT NULL REFERENCES driver_trips(id),sequence integer NOT NULL CHECK(sequence>0),kind text NOT NULL CHECK(kind IN ('gps','fuel','status')),recorded_at timestamptz NOT NULL,payload jsonb NOT NULL,actor_id text NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(trip_id,sequence));
CREATE TRIGGER trip_events_immutable BEFORE UPDATE OR DELETE ON trip_events FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();
CREATE INDEX trip_event_history ON trip_events(trip_id,sequence);
CREATE TABLE dispatch_responses(id text PRIMARY KEY,attempt_id text NOT NULL UNIQUE REFERENCES delivery_attempts(id),driver_id text NOT NULL REFERENCES users(id),decision text NOT NULL CHECK(decision IN ('acknowledged','rejected')),reason text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TRIGGER dispatch_responses_immutable BEFORE UPDATE OR DELETE ON dispatch_responses FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();
CREATE TABLE doorstep_amendments(id text PRIMARY KEY,order_id text NOT NULL REFERENCES orders(id),attempt_id text NOT NULL REFERENCES delivery_attempts(id),driver_id text NOT NULL REFERENCES users(id),order_version integer NOT NULL,proposal jsonb NOT NULL,price_snapshot jsonb NOT NULL,customer_consent_at timestamptz,state text NOT NULL DEFAULT 'proposed' CHECK(state IN ('proposed','consented','rejected','cancelled')),created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX doorstep_order_history ON doorstep_amendments(order_id,created_at DESC);
CREATE TABLE delivery_photos(id text PRIMARY KEY,order_id text NOT NULL REFERENCES orders(id),attempt_id text NOT NULL REFERENCES delivery_attempts(id),actor_id text NOT NULL REFERENCES users(id),captured_at timestamptz NOT NULL DEFAULT now(),data bytea NOT NULL,sha256 text NOT NULL,alt text NOT NULL,consent boolean NOT NULL CHECK(consent),created_at timestamptz NOT NULL DEFAULT now(),retain_until timestamptz NOT NULL,UNIQUE(order_id,sha256));
CREATE INDEX delivery_photo_history ON delivery_photos(order_id,created_at DESC);
CREATE TRIGGER delivery_photos_immutable BEFORE UPDATE OR DELETE ON delivery_photos FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();
CREATE TABLE crm_followups(id text PRIMARY KEY,customer_id text NOT NULL REFERENCES users(id),branch_id text NOT NULL REFERENCES branches(id),owner_id text NOT NULL REFERENCES users(id),next_action text NOT NULL,due_at timestamptz NOT NULL,outcome text,created_by text NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX crm_followup_due ON crm_followups(branch_id,due_at);
CREATE TABLE channel_consents(user_id text NOT NULL REFERENCES users(id),channel text NOT NULL CHECK(channel IN ('sms','whatsapp')),purpose text NOT NULL CHECK(purpose IN ('transactional','marketing','otp','refill')),enabled boolean NOT NULL DEFAULT false,version integer NOT NULL DEFAULT 1,evidence text NOT NULL,updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,channel,purpose));
ALTER TABLE message_outbox ADD COLUMN purpose text NOT NULL DEFAULT 'transactional' CHECK(purpose IN ('transactional','marketing','otp','refill'));
ALTER TABLE message_outbox ADD COLUMN provider_message_id text;
ALTER TABLE message_outbox ADD COLUMN delivery_status text;
ALTER TABLE message_outbox ADD COLUMN template_name text;
ALTER TABLE message_outbox ADD COLUMN lease_until timestamptz;
ALTER TABLE message_outbox ADD COLUMN consent_version integer;
ALTER TABLE message_outbox ADD COLUMN expires_at timestamptz;
CREATE UNIQUE INDEX channel_provider_message_id ON message_outbox(channel,provider_message_id) WHERE provider_message_id IS NOT NULL;
CREATE TABLE channel_receipts(id text PRIMARY KEY,channel text NOT NULL,provider_event_id text NOT NULL,provider_message_id text NOT NULL,status text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(channel,provider_event_id));
CREATE TRIGGER channel_receipts_immutable BEFORE UPDATE OR DELETE ON channel_receipts FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['phone_activations','invoice_notes','invoice_note_events','invoice_payment_requests','driver_vehicles','driver_trips','trip_events','dispatch_responses','doorstep_amendments','delivery_photos','crm_followups','channel_consents','channel_receipts'] LOOP
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',t);
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='easygas_server') THEN
 EXECUTE format('GRANT SELECT,INSERT,UPDATE ON %I TO easygas_server',t);
 EXECUTE format('CREATE POLICY trusted_server ON %I TO easygas_server USING(true) WITH CHECK(true)',t);
 END IF; END LOOP;
END $$;

ALTER TABLE delivery_attempts ADD COLUMN requires_ack boolean NOT NULL DEFAULT false;
CREATE FUNCTION invoice_note_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' OR OLD.state<>'pending' THEN RAISE EXCEPTION 'Invoice note decisions are immutable'; END IF;
 IF (NEW.id,NEW.invoice_id,NEW.sequence,NEW.kind,NEW.amount_kobo,NEW.reason,NEW.requested_by,NEW.created_at) IS DISTINCT FROM (OLD.id,OLD.invoice_id,OLD.sequence,OLD.kind,OLD.amount_kobo,OLD.reason,OLD.requested_by,OLD.created_at) OR NEW.state NOT IN ('approved','rejected') OR NEW.approved_by IS NULL OR NEW.decided_at IS NULL THEN RAISE EXCEPTION 'Only an independent final note decision is permitted'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER invoice_notes_guard BEFORE UPDATE OR DELETE ON invoice_notes FOR EACH ROW EXECUTE FUNCTION invoice_note_guard();
CREATE FUNCTION doorstep_proposal_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' OR OLD.state<>'proposed' OR NEW.state NOT IN ('consented','rejected','cancelled') OR (NEW.id,NEW.order_id,NEW.attempt_id,NEW.driver_id,NEW.order_version,NEW.proposal,NEW.price_snapshot,NEW.created_at) IS DISTINCT FROM (OLD.id,OLD.order_id,OLD.attempt_id,OLD.driver_id,OLD.order_version,OLD.proposal,OLD.price_snapshot,OLD.created_at) THEN RAISE EXCEPTION 'Doorstep proposal history is immutable'; END IF;
 RETURN NEW; END $$;
CREATE TRIGGER doorstep_proposal_history BEFORE UPDATE OR DELETE ON doorstep_amendments FOR EACH ROW EXECUTE FUNCTION doorstep_proposal_guard();
INSERT INTO setting_definitions(key,label,category,description,owner_role,risk,value_type,propose_roles,approve_roles,view_roles,required_roles,additional_verification)
VALUES('crm.retention','Retention and win-back policy','Marketing','Thresholds and conservative monthly message budget; default disabled','owner',3,'crm_retention','["owner","manager"]','["owner","finance"]','["owner","manager","sales","finance"]','["finance"]',true);
INSERT INTO settings(key,scope,value) SELECT 'crm.retention',id,'{"enabled":false,"atRiskDays":45,"dormantDays":90,"monthlyBudgetKobo":0,"costCeilingPerMessageKobo":0}'::jsonb FROM branches;
