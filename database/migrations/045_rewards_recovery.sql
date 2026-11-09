-- Repair older local revision-044 iterations without changing existing records.
ALTER TABLE credit_requests DROP CONSTRAINT IF EXISTS credit_requests_amount_kobo_check;
ALTER TABLE credit_requests DROP CONSTRAINT IF EXISTS credit_amount_valid;
ALTER TABLE credit_requests ADD CONSTRAINT credit_amount_valid CHECK(amount_kobo>=0 AND (kind='refund' OR amount_kobo>0));
CREATE OR REPLACE FUNCTION preserve_refund_request_source() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF OLD.refund_lines IS NOT NULL AND (NEW.refund_lines,NEW.refund_fingerprint,NEW.refund_operation_key,NEW.amount_kobo,NEW.order_id,NEW.customer_id) IS DISTINCT FROM (OLD.refund_lines,OLD.refund_fingerprint,OLD.refund_operation_key,OLD.amount_kobo,OLD.order_id,OLD.customer_id) THEN RAISE EXCEPTION 'Refund request allocation is immutable'; END IF; RETURN NEW;
END $$;
CREATE OR REPLACE TRIGGER refund_request_source_immutable BEFORE UPDATE ON credit_requests FOR EACH ROW EXECUTE FUNCTION preserve_refund_request_source();
CREATE OR REPLACE FUNCTION preserve_service_reward_source() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (NEW.booking_id,NEW.policy_version_id,NEW.eligible_kobo,NEW.created_at) IS DISTINCT FROM (OLD.booking_id,OLD.policy_version_id,OLD.eligible_kobo,OLD.created_at) THEN RAISE EXCEPTION 'Service reward source is immutable'; END IF; RETURN NEW;
END $$;
CREATE OR REPLACE TRIGGER service_reward_source_immutable BEFORE UPDATE ON reward_service_jobs FOR EACH ROW EXECUTE FUNCTION preserve_service_reward_source();
CREATE TABLE reward_offer_notices(id text PRIMARY KEY,customer_id text NOT NULL REFERENCES users(id),offer_id text NOT NULL,policy_version_id text NOT NULL REFERENCES setting_versions(id),created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX reward_notice_frequency ON reward_offer_notices(customer_id,offer_id,created_at);
CREATE TRIGGER reward_offer_notices_immutable BEFORE UPDATE OR DELETE ON reward_offer_notices FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();
ALTER TABLE reward_offer_notices ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON reward_offer_notices FROM anon; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON reward_offer_notices FROM authenticated; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='easygas_server') THEN GRANT SELECT,INSERT ON reward_offer_notices TO easygas_server; END IF;
END $$;
