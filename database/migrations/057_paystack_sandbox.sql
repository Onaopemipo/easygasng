-- Additive, default-disabled sandbox infrastructure. No backfill or financial posting.
CREATE TABLE payment_intents(
 id text PRIMARY KEY,customer_id text NOT NULL REFERENCES users(id),branch_id text NOT NULL REFERENCES branches(id),
 purpose text NOT NULL CHECK(purpose IN ('invoice','service','wallet')),invoice_id text REFERENCES customer_invoices(id),booking_id text REFERENCES service_bookings(id),
 request_key text NOT NULL,request_hash text NOT NULL,obligation_version text NOT NULL,quote jsonb NOT NULL,email_snapshot text NOT NULL,
 status text NOT NULL DEFAULT 'quoted' CHECK(status IN ('quoted','pending','paid','failed','expired','under_review')),
 expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(customer_id,request_key),CHECK((purpose='invoice' AND invoice_id IS NOT NULL AND booking_id IS NULL) OR (purpose='service' AND booking_id IS NOT NULL AND invoice_id IS NULL) OR (purpose='wallet' AND invoice_id IS NULL AND booking_id IS NULL))
);
CREATE INDEX payment_intents_customer ON payment_intents(customer_id,created_at DESC);
CREATE INDEX payment_intents_invoice ON payment_intents(invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX payment_intents_booking ON payment_intents(booking_id) WHERE booking_id IS NOT NULL;
CREATE TABLE payment_attempts(
 id text PRIMARY KEY,intent_id text NOT NULL UNIQUE REFERENCES payment_intents(id),provider text NOT NULL DEFAULT 'paystack' CHECK(provider='paystack'),environment text NOT NULL CHECK(environment='test'),reference text NOT NULL UNIQUE,
 state text NOT NULL DEFAULT 'prepared' CHECK(state IN ('prepared','initializing','awaiting_customer','pending','verified_paid','failed','abandoned','under_review')),
 checkout_url text,initialization_started_at timestamptz,last_checked_at timestamptz,reconcile_after timestamptz NOT NULL DEFAULT now(),retry_count integer NOT NULL DEFAULT 0,provider_id text UNIQUE,actual_fee_kobo bigint CHECK(actual_fee_kobo>=0),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payment_attempts_reconcile ON payment_attempts(reconcile_after,id) WHERE state IN ('initializing','awaiting_customer','pending');
CREATE TABLE payment_provider_events(
 id text PRIMARY KEY,digest text NOT NULL UNIQUE,event_key text NOT NULL UNIQUE,event_type text NOT NULL,reference text NOT NULL,attempt_id text REFERENCES payment_attempts(id),
 signature_mode text NOT NULL CHECK(signature_mode IN ('timestamped','legacy')),state text NOT NULL DEFAULT 'received' CHECK(state IN ('received','processed','under_review')),received_at timestamptz NOT NULL DEFAULT now(),processed_at timestamptz
);
CREATE INDEX payment_provider_events_pending ON payment_provider_events(received_at,id) WHERE state='received';
CREATE TABLE payment_postings(
 id text PRIMARY KEY,intent_id text NOT NULL UNIQUE REFERENCES payment_intents(id),attempt_id text NOT NULL UNIQUE REFERENCES payment_attempts(id),provider_reference text NOT NULL UNIQUE,
 base_kobo bigint NOT NULL CHECK(base_kobo>0),customer_fee_kobo bigint NOT NULL CHECK(customer_fee_kobo>=0),gross_kobo bigint NOT NULL CHECK(gross_kobo=base_kobo+customer_fee_kobo),actual_fee_kobo bigint CHECK(actual_fee_kobo>=0),
 verified_payment_id text UNIQUE REFERENCES verified_payments(id),wallet_entry_id text UNIQUE REFERENCES wallet_entries(id),created_at timestamptz NOT NULL DEFAULT now(),CHECK((verified_payment_id IS NOT NULL)::int+(wallet_entry_id IS NOT NULL)::int=1)
);
CREATE TRIGGER payment_postings_immutable BEFORE UPDATE OR DELETE ON payment_postings FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();
CREATE TABLE payment_exceptions(id text PRIMARY KEY,attempt_id text REFERENCES payment_attempts(id),category text NOT NULL,detail text NOT NULL,status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','acknowledged','resolved')),created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(attempt_id,category));
CREATE FUNCTION preserve_payment_quote() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.id<>OLD.id OR NEW.created_at<>OLD.created_at OR NEW.customer_id<>OLD.customer_id OR NEW.branch_id<>OLD.branch_id OR NEW.purpose<>OLD.purpose OR NEW.invoice_id IS DISTINCT FROM OLD.invoice_id OR NEW.booking_id IS DISTINCT FROM OLD.booking_id OR NEW.request_key<>OLD.request_key OR NEW.request_hash<>OLD.request_hash OR NEW.obligation_version<>OLD.obligation_version OR NEW.quote<>OLD.quote OR NEW.email_snapshot<>OLD.email_snapshot OR NEW.expires_at<>OLD.expires_at THEN RAISE EXCEPTION 'Payment obligation and fee quote are immutable'; END IF;RETURN NEW;END $$;
CREATE TRIGGER payment_quote_immutable BEFORE UPDATE ON payment_intents FOR EACH ROW EXECUTE FUNCTION preserve_payment_quote();
CREATE TRIGGER payment_intent_no_delete BEFORE DELETE ON payment_intents FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();
INSERT INTO setting_definitions(key,label,category,description,owner_role,risk,value_type,propose_roles,approve_roles,view_roles,required_roles,additional_verification)
VALUES('payment.gateway','Payment Gateway & Fees','Wallet & Payments','Sandbox only. Independently approved fee versions and funding controls; secrets remain server-side. Live activation is unsupported.','finance',4,'payment_gateway','["owner","finance"]','["owner","finance"]','["owner","finance"]','["owner","finance"]',true);
INSERT INTO settings(key,scope,value) SELECT 'payment.gateway',id,'{"enabled":false,"environment":"test","channels":[],"fee":null,"providerAutomaticFees":"unknown","passThroughApproved":false,"merchantApprovalReference":"","quoteLifetimeSeconds":600,"walletFunding":false,"walletMinimumKobo":10000,"walletMaximumKobo":10000000,"partialInvoices":false}'::jsonb FROM branches;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['payment_intents','payment_attempts','payment_provider_events','payment_postings','payment_exceptions'] LOOP
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',t);
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='easygas_server') THEN EXECUTE format('GRANT SELECT,INSERT,UPDATE ON %I TO easygas_server',t);EXECUTE format('CREATE POLICY server_only ON %I TO easygas_server USING(true) WITH CHECK(true)',t);END IF;
 END LOOP; END $$;

CREATE FUNCTION preserve_payment_attempt_identity() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id<>OLD.id OR NEW.intent_id<>OLD.intent_id OR NEW.provider<>OLD.provider OR NEW.environment<>OLD.environment OR NEW.reference<>OLD.reference OR NEW.created_at<>OLD.created_at THEN RAISE EXCEPTION 'Payment attempt identity is immutable';END IF;RETURN NEW;END $$;
CREATE TRIGGER payment_attempt_identity BEFORE UPDATE ON payment_attempts FOR EACH ROW EXECUTE FUNCTION preserve_payment_attempt_identity();
CREATE TRIGGER payment_attempt_no_delete BEFORE DELETE ON payment_attempts FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();
