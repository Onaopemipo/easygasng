-- Existing orders and credit_requests remain the financial authorities.
ALTER TABLE credit_requests ADD COLUMN refund_lines jsonb;
ALTER TABLE credit_requests ADD COLUMN refund_fingerprint text;
ALTER TABLE credit_requests ADD COLUMN refund_operation_key text;
CREATE UNIQUE INDEX refund_operation_customer ON credit_requests(customer_id,refund_operation_key) WHERE refund_operation_key IS NOT NULL;
DROP INDEX full_refund_once_idx;
CREATE UNIQUE INDEX pending_refund_once ON credit_requests(order_id) WHERE kind='refund' AND status='pending';
CREATE TABLE reward_refund_allocations (
 credit_id text PRIMARY KEY REFERENCES credit_requests(id),order_id text NOT NULL REFERENCES orders(id),
 gross_kobo bigint NOT NULL CHECK(gross_kobo>=0),discount_kobo bigint NOT NULL CHECK(discount_kobo>=0),
 returned_points integer NOT NULL CHECK(returned_points>=0),reversed_points integer NOT NULL CHECK(reversed_points>=0),
 detail jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER reward_refund_allocations_immutable BEFORE UPDATE OR DELETE ON reward_refund_allocations FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();
CREATE TABLE reward_referral_reviews (
 attribution_id text PRIMARY KEY REFERENCES reward_referrals(attribution_id),
 state text NOT NULL CHECK(state IN ('held','cleared','blocked')),reason text NOT NULL,
 request_id text NOT NULL REFERENCES change_requests(id),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE reward_offer_claims (
 order_id text PRIMARY KEY REFERENCES orders(id),offer_id text NOT NULL,policy_version_id text NOT NULL REFERENCES setting_versions(id),
 discount_kobo bigint NOT NULL CHECK(discount_kobo>0),customer_id text NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reward_offer_budget ON reward_offer_claims(policy_version_id,offer_id);
CREATE TRIGGER reward_offer_claims_immutable BEFORE UPDATE OR DELETE ON reward_offer_claims FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();
ALTER TABLE reward_entry_details ADD COLUMN booking_id text REFERENCES service_bookings(id);
CREATE TABLE reward_service_jobs (
 booking_id text PRIMARY KEY REFERENCES service_bookings(id),policy_version_id text NOT NULL REFERENCES setting_versions(id),
 eligible_kobo bigint NOT NULL CHECK(eligible_kobo>0),status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','completed','review')),
 attempts integer NOT NULL DEFAULT 0,last_error text,created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO setting_definitions(key,label,category,description,owner_role,risk,value_type,propose_roles,approve_roles,view_roles,required_roles,additional_verification) VALUES
('loyalty.referral_review','Referral risk review','Loyalty','Hold, clear or block a referral with evidence and independent owner/finance approval. Shared addresses are not proof of fraud.','owner',4,'referral_review','["owner","finance"]','["owner","finance"]','["owner","finance"]','["owner","finance"]',true);
INSERT INTO settings(key,scope,value) SELECT 'loyalty.referral_review',id,'{"attributionId":"","state":"held","reason":""}'::jsonb FROM branches;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['reward_refund_allocations','reward_referral_reviews','reward_offer_claims','reward_service_jobs'] LOOP
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN EXECUTE format('REVOKE ALL ON %I FROM anon',t); END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN EXECUTE format('REVOKE ALL ON %I FROM authenticated',t); END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='easygas_server') THEN EXECUTE format('GRANT SELECT,INSERT ON %I TO easygas_server',t); END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='easygas_server') THEN
 GRANT UPDATE(state,reason,request_id,updated_at) ON reward_referral_reviews TO easygas_server;
 GRANT UPDATE(status,attempts,last_error) ON reward_service_jobs TO easygas_server;
 END IF;
END $$;

ALTER TABLE credit_requests DROP CONSTRAINT credit_requests_amount_kobo_check;
ALTER TABLE credit_requests ADD CONSTRAINT credit_amount_valid CHECK(amount_kobo>=0 AND (kind='refund' OR amount_kobo>0));
CREATE FUNCTION preserve_refund_request_source() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF OLD.refund_lines IS NOT NULL AND (NEW.refund_lines,NEW.refund_fingerprint,NEW.refund_operation_key,NEW.amount_kobo,NEW.order_id,NEW.customer_id) IS DISTINCT FROM (OLD.refund_lines,OLD.refund_fingerprint,OLD.refund_operation_key,OLD.amount_kobo,OLD.order_id,OLD.customer_id) THEN RAISE EXCEPTION 'Refund request allocation is immutable'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER refund_request_source_immutable BEFORE UPDATE ON credit_requests FOR EACH ROW EXECUTE FUNCTION preserve_refund_request_source();
CREATE FUNCTION preserve_service_reward_source() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (NEW.booking_id,NEW.policy_version_id,NEW.eligible_kobo,NEW.created_at) IS DISTINCT FROM (OLD.booking_id,OLD.policy_version_id,OLD.eligible_kobo,OLD.created_at) THEN RAISE EXCEPTION 'Service reward source is immutable'; END IF; RETURN NEW;
END $$;
CREATE TRIGGER service_reward_source_immutable BEFORE UPDATE ON reward_service_jobs FOR EACH ROW EXECUTE FUNCTION preserve_service_reward_source();
