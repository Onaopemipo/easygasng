-- Trusted server connections still use application ownership/role checks.
-- A grant alone cannot pass RLS: explicitly permit only the existing NOLOGIN runtime role.
DO $$ DECLARE t text; BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='easygas_server') THEN CREATE ROLE easygas_server NOLOGIN; END IF;
 FOREACH t IN ARRAY ARRAY['reward_entry_details','reward_jobs','reward_order_discounts','reward_referral_codes','reward_referrals','reward_refund_allocations','reward_referral_reviews','reward_offer_claims','reward_service_jobs','reward_offer_notices'] LOOP
 IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE schemaname=current_schema() AND tablename=t AND policyname='trusted_server') THEN
 EXECUTE format('CREATE POLICY trusted_server ON %I TO easygas_server USING(true) WITH CHECK(true)',t);
 END IF;
 END LOOP;
END $$;
