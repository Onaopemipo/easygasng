-- Compatibility repair for the known early development revision 043 only.
-- Original migration remains unchanged; accounts, balances and legacy redemptions are preserved.
-- Discounts extend the existing order total; zero-discount legacy orders keep their invariant.
ALTER TABLE orders ADD COLUMN reward_discount_kobo bigint NOT NULL DEFAULT 0 CHECK(reward_discount_kobo>=0 AND reward_discount_kobo<=subtotal_kobo);
ALTER TABLE orders DROP CONSTRAINT orders_check;
ALTER TABLE orders ADD CONSTRAINT orders_total_with_rewards CHECK(total_kobo=subtotal_kobo+delivery_kobo-reward_discount_kobo);
CREATE TABLE reward_order_discounts (
 order_id text PRIMARY KEY REFERENCES orders(id),
 entry_id text NOT NULL UNIQUE REFERENCES reward_entries(id),
 policy_version_id text NOT NULL REFERENCES setting_versions(id),
 points integer NOT NULL CHECK(points>0),
 discount_kobo bigint NOT NULL CHECK(discount_kobo>0),
 eligible_kobo bigint NOT NULL CHECK(eligible_kobo>=discount_kobo),
 snapshot jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER reward_discounts_immutable BEFORE UPDATE OR DELETE ON reward_order_discounts FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();
ALTER TABLE reward_jobs ADD COLUMN snapshot jsonb NOT NULL DEFAULT '{}';
ALTER TABLE reward_order_discounts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='easygas_server') THEN
 GRANT SELECT,INSERT ON reward_order_discounts TO easygas_server;
END IF; END $$;
CREATE FUNCTION preserve_reward_job_source() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (NEW.order_id,NEW.policy_version_id,NEW.snapshot,NEW.created_at) IS DISTINCT FROM (OLD.order_id,OLD.policy_version_id,OLD.snapshot,OLD.created_at) THEN
  RAISE EXCEPTION 'Reward source snapshot is immutable';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER reward_job_source_immutable BEFORE UPDATE ON reward_jobs FOR EACH ROW EXECUTE FUNCTION preserve_reward_job_source();
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='easygas_server') THEN
 REVOKE UPDATE ON reward_jobs FROM easygas_server;
 GRANT UPDATE(status,attempts,last_error,completed_at) ON reward_jobs TO easygas_server;
END IF; END $$;
INSERT INTO setting_definitions(key,label,category,description,owner_role,risk,value_type,propose_roles,approve_roles,view_roles,required_roles,additional_verification) VALUES
('loyalty.adjustment','Audited points adjustment','Loyalty','One immutable customer adjustment per approved request. Reason and evidence required. No wallet transfer.','owner',4,'rewards_adjustment','["owner","finance"]','["owner","finance"]','["owner","finance"]','["owner","finance"]',true) ON CONFLICT(key) DO NOTHING;
INSERT INTO settings(key,scope,value) SELECT 'loyalty.adjustment',id,'{"customerId":"","points":0,"reason":"","evidence":""}'::jsonb FROM branches ON CONFLICT(key,scope) DO NOTHING;
CREATE TABLE reward_referral_codes (
 customer_id text PRIMARY KEY REFERENCES users(id),
 code text NOT NULL UNIQUE CHECK(length(code)=32),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE reward_referrals (
 attribution_id text NOT NULL UNIQUE,
 customer_id text PRIMARY KEY REFERENCES users(id),
 referrer_id text NOT NULL REFERENCES users(id),
 code text NOT NULL REFERENCES reward_referral_codes(code),
 source_order_id text UNIQUE REFERENCES orders(id),
 awarded_entry_id text UNIQUE REFERENCES reward_entries(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(customer_id<>referrer_id)
);
CREATE TRIGGER reward_codes_immutable BEFORE UPDATE OR DELETE ON reward_referral_codes FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();
CREATE FUNCTION preserve_reward_referral() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (NEW.attribution_id,NEW.customer_id,NEW.referrer_id,NEW.code,NEW.created_at) IS DISTINCT FROM (OLD.attribution_id,OLD.customer_id,OLD.referrer_id,OLD.code,OLD.created_at) OR OLD.awarded_entry_id IS NOT NULL THEN
  RAISE EXCEPTION 'Referral attribution and committed award are immutable';
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER reward_referral_immutable BEFORE UPDATE ON reward_referrals FOR EACH ROW EXECUTE FUNCTION preserve_reward_referral();
ALTER TABLE reward_referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_referrals ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='easygas_server') THEN
 GRANT SELECT,INSERT ON reward_referral_codes,reward_referrals TO easygas_server;
 GRANT UPDATE(source_order_id,awarded_entry_id) ON reward_referrals TO easygas_server;
END IF; END $$;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON reward_order_discounts,reward_referral_codes,reward_referrals FROM anon; END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON reward_order_discounts,reward_referral_codes,reward_referrals FROM authenticated; END IF;
END $$;
CREATE FUNCTION preserve_order_reward_discount() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF OLD.reward_discount_kobo>0 AND NEW.reward_discount_kobo<>OLD.reward_discount_kobo THEN
  RAISE EXCEPTION 'Posted order reward discount is immutable';
 END IF;
 IF NEW.reward_discount_kobo>0 AND NOT EXISTS(SELECT 1 FROM reward_order_discounts d WHERE d.order_id=NEW.id AND d.discount_kobo=NEW.reward_discount_kobo) THEN
  RAISE EXCEPTION 'Order discount must match immutable point evidence';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER order_reward_discount_evidence BEFORE UPDATE OF reward_discount_kobo,total_kobo ON orders FOR EACH ROW EXECUTE FUNCTION preserve_order_reward_discount();
