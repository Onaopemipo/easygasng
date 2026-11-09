-- Local preparation only; no remote project has been modified.
BEGIN;
SET LOCAL search_path TO easygas_private,pg_catalog;
ALTER TABLE sessions ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE sessions ADD COLUMN label text NOT NULL DEFAULT 'Signed-in session';
CREATE TABLE account_addresses(id text PRIMARY KEY,customer_id text NOT NULL REFERENCES users(id),label text NOT NULL,street text NOT NULL,zone text NOT NULL,phone text NOT NULL,archived boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX addresses_customer_idx ON account_addresses(customer_id,archived);
CREATE TABLE account_challenges(id text PRIMARY KEY,user_id text NOT NULL REFERENCES users(id),purpose text NOT NULL CHECK(purpose IN ('reset','verify')),token_hash text NOT NULL UNIQUE,expires_at timestamptz NOT NULL,consumed_at timestamptz,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX challenges_user_idx ON account_challenges(user_id,purpose,created_at DESC);
CREATE TABLE message_outbox(id text PRIMARY KEY,user_id text NOT NULL REFERENCES users(id),channel text NOT NULL CHECK(channel IN ('email','sms','push','whatsapp')),recipient text NOT NULL,subject text NOT NULL,body text NOT NULL,status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sent','failed','cancelled')),attempts integer NOT NULL DEFAULT 0,next_attempt_at timestamptz NOT NULL DEFAULT now(),dedupe_key text NOT NULL UNIQUE,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX outbox_pending_idx ON message_outbox(status,next_attempt_at);
CREATE TABLE communication_preferences(user_id text PRIMARY KEY REFERENCES users(id),marketing boolean NOT NULL DEFAULT false,refill_reminders boolean NOT NULL DEFAULT true,quiet_start integer NOT NULL DEFAULT 21 CHECK(quiet_start BETWEEN 0 AND 23),quiet_end integer NOT NULL DEFAULT 8 CHECK(quiet_end BETWEEN 0 AND 23),updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE privacy_requests(id text PRIMARY KEY,user_id text NOT NULL REFERENCES users(id),kind text NOT NULL CHECK(kind IN ('deletion','export')),status text NOT NULL DEFAULT 'pending',reason text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE support_requests ADD COLUMN branch_id text REFERENCES branches(id);
UPDATE support_requests SET branch_id='lagos' WHERE branch_id IS NULL;
ALTER TABLE support_requests ALTER COLUMN branch_id SET DEFAULT 'lagos';
ALTER TABLE support_requests ALTER COLUMN branch_id SET NOT NULL;
ALTER TABLE support_requests ADD COLUMN assignee_id text REFERENCES users(id);
ALTER TABLE support_requests ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
CREATE TABLE support_messages(id text PRIMARY KEY,request_id text NOT NULL REFERENCES support_requests(id),author_id text NOT NULL REFERENCES users(id),body text NOT NULL,internal boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX support_messages_request_idx ON support_messages(request_id,created_at);
CREATE INDEX support_branch_idx ON support_requests(branch_id,status,updated_at DESC);
CREATE TABLE suppliers(id text PRIMARY KEY,branch_id text NOT NULL REFERENCES branches(id),name text NOT NULL,contact text NOT NULL,active boolean NOT NULL DEFAULT true,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE purchase_orders(id text PRIMARY KEY,branch_id text NOT NULL REFERENCES branches(id),supplier_id text NOT NULL REFERENCES suppliers(id),product_id text NOT NULL REFERENCES products(id),quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 100000),unit_cost_kobo bigint NOT NULL CHECK(unit_cost_kobo>0),status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','approved','received','cancelled')),requested_by text NOT NULL REFERENCES users(id),approved_by text REFERENCES users(id),received_by text REFERENCES users(id),invoice_reference text,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX purchases_branch_idx ON purchase_orders(branch_id,created_at DESC);
CREATE TABLE cylinder_inspections(id text PRIMARY KEY,cylinder_id text NOT NULL REFERENCES cylinders(id),inspector_id text NOT NULL REFERENCES users(id),passed boolean NOT NULL,notes text NOT NULL,next_due date NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE consumption_profiles(id text PRIMARY KEY,customer_id text NOT NULL REFERENCES users(id),product_id text NOT NULL REFERENCES products(id),label text NOT NULL,household_size integer NOT NULL CHECK(household_size BETWEEN 1 AND 1000),cooking_days integer NOT NULL CHECK(cooking_days BETWEEN 1 AND 7),active boolean NOT NULL DEFAULT true,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX consumption_customer_idx ON consumption_profiles(customer_id,active);
CREATE TABLE refill_history(id text PRIMARY KEY,profile_id text NOT NULL REFERENCES consumption_profiles(id),order_id text NOT NULL REFERENCES orders(id),refilled_at timestamptz NOT NULL,kg numeric NOT NULL CHECK(kg>0),UNIQUE(profile_id,order_id));
CREATE TABLE consumption_feedback(id text PRIMARY KEY,profile_id text NOT NULL REFERENCES consumption_profiles(id),state text NOT NULL CHECK(state IN ('still_available','low','empty')),created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE job_runs(id text PRIMARY KEY,job text NOT NULL,status text NOT NULL,detail jsonb NOT NULL DEFAULT '{}',started_at timestamptz NOT NULL DEFAULT now(),finished_at timestamptz);
CREATE TABLE job_deliveries(key text PRIMARY KEY,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE stock_transfers(id text PRIMARY KEY,source_branch text NOT NULL REFERENCES branches(id),destination_branch text NOT NULL REFERENCES branches(id),product_id text NOT NULL REFERENCES products(id),quantity integer NOT NULL CHECK(quantity>0),requested_by text NOT NULL REFERENCES users(id),received_by text REFERENCES users(id),status text NOT NULL DEFAULT 'in_transit' CHECK(status IN ('in_transit','received')),created_at timestamptz NOT NULL DEFAULT now(),CHECK(source_branch<>destination_branch));
CREATE TABLE staff_invitations(id text PRIMARY KEY,email text NOT NULL,name text NOT NULL,branch_id text NOT NULL REFERENCES branches(id),invited_by text NOT NULL REFERENCES users(id),token_hash text NOT NULL UNIQUE,expires_at timestamptz NOT NULL,accepted_at timestamptz,created_at timestamptz NOT NULL DEFAULT now());
CREATE TRIGGER support_messages_immutable BEFORE UPDATE OR DELETE ON support_messages FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();
CREATE TRIGGER inspections_immutable BEFORE UPDATE OR DELETE ON cylinder_inspections FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();
CREATE TRIGGER refill_history_immutable BEFORE UPDATE OR DELETE ON refill_history FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();
CREATE TRIGGER feedback_immutable BEFORE UPDATE OR DELETE ON consumption_feedback FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();

CREATE TABLE credit_requests(id text PRIMARY KEY,branch_id text NOT NULL REFERENCES branches(id),customer_id text NOT NULL REFERENCES users(id),order_id text REFERENCES orders(id),amount_kobo bigint NOT NULL CHECK(amount_kobo>0),kind text NOT NULL CHECK(kind IN ('cash_funding','refund')),status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),requested_by text NOT NULL REFERENCES users(id),decided_by text REFERENCES users(id),reason text NOT NULL,receipt_reference text UNIQUE,created_at timestamptz NOT NULL DEFAULT now(),decided_at timestamptz);
CREATE INDEX credit_customer_idx ON credit_requests(customer_id,status);
CREATE UNIQUE INDEX full_refund_once_idx ON credit_requests(order_id) WHERE kind='refund' AND status IN ('pending','approved');
CREATE TABLE reward_redemptions(id text PRIMARY KEY,customer_id text NOT NULL REFERENCES users(id),points integer NOT NULL CHECK(points>0),credit_kobo bigint NOT NULL CHECK(credit_kobo>0),idempotency_key text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(customer_id,idempotency_key));
CREATE TRIGGER rewards_immutable BEFORE UPDATE OR DELETE ON reward_entries FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();
CREATE TRIGGER redemptions_immutable BEFORE UPDATE OR DELETE ON reward_redemptions FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();
CREATE TABLE pos_shifts(id text PRIMARY KEY,branch_id text NOT NULL REFERENCES branches(id),cashier_id text NOT NULL REFERENCES users(id),opening_kobo bigint NOT NULL CHECK(opening_kobo>=0),counted_kobo bigint CHECK(counted_kobo>=0),expected_kobo bigint CHECK(expected_kobo>=0),status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','submitted','verified')),verified_by text REFERENCES users(id),note text NOT NULL DEFAULT '',created_at timestamptz NOT NULL DEFAULT now(),closed_at timestamptz);
CREATE UNIQUE INDEX one_open_shift_idx ON pos_shifts(cashier_id) WHERE status='open';
CREATE TABLE pos_sales(id text PRIMARY KEY,shift_id text NOT NULL REFERENCES pos_shifts(id),reference text NOT NULL UNIQUE,idempotency_key text NOT NULL,request_hash text NOT NULL,total_kobo bigint NOT NULL CHECK(total_kobo>0),tendered_kobo bigint NOT NULL CHECK(tendered_kobo>=total_kobo),created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(shift_id,idempotency_key));
CREATE TABLE pos_items(sale_id text NOT NULL REFERENCES pos_sales(id),product_id text NOT NULL REFERENCES products(id),name text NOT NULL,quantity integer NOT NULL CHECK(quantity>0),unit_price_kobo bigint NOT NULL CHECK(unit_price_kobo>0),PRIMARY KEY(sale_id,product_id));
CREATE TRIGGER pos_sales_immutable BEFORE UPDATE OR DELETE ON pos_sales FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();
CREATE TRIGGER pos_items_immutable BEFORE UPDATE OR DELETE ON pos_items FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();
INSERT INTO setting_definitions(key,label,category,description,owner_role,risk,value_type,propose_roles,approve_roles,view_roles,required_roles,minimum,maximum) VALUES
('loyalty.enabled','Reward earning enabled','Loyalty','Earn configured points only on delivered independently verified purchases.','owner',3,'boolean','["owner","manager"]','["owner"]','["owner","manager","finance"]','[]',NULL,NULL),
('loyalty.spend_per_point','Spend per reward point (kobo)','Loyalty','Verified product spend required for each point. Delivery fees excluded.','owner',3,'money','["owner","manager"]','["owner"]','["owner","manager","finance"]','[]',100,100000000),
('loyalty.credit_per_point','Wallet credit per redeemed point (kobo)','Loyalty','Customer-authorised conversion of points into purchase credit.','owner',3,'money','["owner","finance"]','["owner"]','["owner","manager","finance"]','[]',1,10000),
('wallet.enabled','Purchase credit spending enabled','Wallet','Allow spending verified wallet credits. External top-ups remain disconnected.','owner',3,'boolean','["owner","finance"]','["owner"]','["owner","manager","finance"]','[]',NULL,NULL);
INSERT INTO settings(key,scope,value) SELECT d.key,b.id,CASE d.key WHEN 'loyalty.spend_per_point' THEN '10000'::jsonb WHEN 'loyalty.credit_per_point' THEN '100'::jsonb ELSE 'false'::jsonb END FROM setting_definitions d CROSS JOIN branches b WHERE d.key IN ('loyalty.enabled','loyalty.spend_per_point','loyalty.credit_per_point','wallet.enabled');

CREATE TABLE recurring_authorisations(id text PRIMARY KEY,schedule_id text NOT NULL UNIQUE REFERENCES refill_schedules(id),customer_id text NOT NULL REFERENCES users(id),address jsonb NOT NULL,delivery_window text NOT NULL,quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 20),maximum_total_kobo bigint NOT NULL CHECK(maximum_total_kobo>0),consent_text text NOT NULL,active boolean NOT NULL DEFAULT true,authorised_at timestamptz NOT NULL DEFAULT now(),revoked_at timestamptz);
CREATE TABLE schedule_occurrences(id text PRIMARY KEY,schedule_id text NOT NULL REFERENCES refill_schedules(id),due_date date NOT NULL,status text NOT NULL CHECK(status IN ('created','failed')),order_id text REFERENCES orders(id),failure text,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(schedule_id,due_date));
CREATE TABLE campaigns(id text PRIMARY KEY,branch_id text NOT NULL REFERENCES branches(id),title text NOT NULL,body text NOT NULL,segment text NOT NULL CHECK(segment IN ('all','inactive','repeat')),status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','approved','cancelled','completed')),requested_by text NOT NULL REFERENCES users(id),approved_by text REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE campaign_recipients(campaign_id text NOT NULL REFERENCES campaigns(id),user_id text NOT NULL REFERENCES users(id),status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sent','skipped')),sent_at timestamptz,PRIMARY KEY(campaign_id,user_id));
CREATE TRIGGER occurrences_immutable BEFORE UPDATE OR DELETE ON schedule_occurrences FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();
INSERT INTO setting_definitions(key,label,category,description,owner_role,risk,value_type,propose_roles,approve_roles,view_roles,required_roles,minimum,maximum) VALUES
('subscription.enabled','Authorised recurring COD orders','Subscriptions','Generate orders only with explicit customer consent and a customer-set price ceiling. No external debit.','owner',3,'boolean','["owner","manager"]','["owner"]','["owner","manager","finance"]','[]',NULL,NULL),
('delivery.capacity','Orders per delivery window','Delivery','Maximum active orders per date/window. Branch locking prevents overbooking.','manager',2,'integer','["owner","manager","dispatcher"]','["owner","manager"]','["owner","manager","dispatcher"]','[]',1,10000);
INSERT INTO settings(key,scope,value) SELECT d.key,b.id,CASE d.key WHEN 'delivery.capacity' THEN '50'::jsonb ELSE 'false'::jsonb END FROM setting_definitions d CROSS JOIN branches b WHERE d.key IN ('subscription.enabled','delivery.capacity');

CREATE TABLE approval_delegations(id text PRIMARY KEY,grantor_id text NOT NULL REFERENCES users(id),delegate_id text NOT NULL REFERENCES users(id),setting_key text NOT NULL REFERENCES setting_definitions(key),scope text NOT NULL REFERENCES branches(id),maximum_value numeric,status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','revoked','expired')),reason text NOT NULL,starts_at timestamptz NOT NULL,expires_at timestamptz NOT NULL,reviewed_by text REFERENCES users(id),review_reason text,created_at timestamptz NOT NULL DEFAULT now(),CHECK(grantor_id<>delegate_id),CHECK(expires_at>starts_at));
CREATE INDEX delegations_authority_idx ON approval_delegations(delegate_id,setting_key,scope,status,expires_at);
ALTER TABLE approval_decisions ADD COLUMN delegation_id text REFERENCES approval_delegations(id);

-- Execute after migrations 004 and 005 in the private schema.
DO $$ DECLARE t text; BEGIN
FOREACH t IN ARRAY ARRAY['account_addresses','account_challenges','message_outbox','communication_preferences','privacy_requests','support_messages','suppliers','purchase_orders','cylinder_inspections','consumption_profiles','refill_history','consumption_feedback','job_runs','job_deliveries','stock_transfers','staff_invitations','credit_requests','reward_redemptions','pos_shifts','pos_sales','pos_items'] LOOP
EXECUTE format('ALTER TABLE easygas_private.%I ENABLE ROW LEVEL SECURITY',t);
EXECUTE format('CREATE POLICY trusted_server ON easygas_private.%I TO easygas_server USING (true) WITH CHECK (true)',t);
EXECUTE format('GRANT SELECT,INSERT ON easygas_private.%I TO easygas_server',t);
EXECUTE format('REVOKE UPDATE ON easygas_private.%I FROM easygas_server',t);
END LOOP;
END $$;
GRANT UPDATE ON easygas_private.account_addresses,easygas_private.communication_preferences,easygas_private.consumption_profiles,easygas_private.job_runs TO easygas_server;
GRANT UPDATE(consumed_at) ON easygas_private.account_challenges TO easygas_server;
GRANT UPDATE(status,attempts,next_attempt_at) ON easygas_private.message_outbox TO easygas_server;
GRANT UPDATE(status) ON easygas_private.privacy_requests TO easygas_server;
GRANT UPDATE(active,contact) ON easygas_private.suppliers TO easygas_server;
GRANT UPDATE(status,approved_by,received_by,invoice_reference) ON easygas_private.purchase_orders TO easygas_server;
GRANT UPDATE(status,received_by) ON easygas_private.stock_transfers TO easygas_server;
GRANT UPDATE(accepted_at) ON easygas_private.staff_invitations TO easygas_server;
GRANT UPDATE(status,decided_by,decided_at) ON easygas_private.credit_requests TO easygas_server;
GRANT UPDATE(counted_kobo,expected_kobo,status,verified_by,note,closed_at) ON easygas_private.pos_shifts TO easygas_server;
GRANT INSERT ON easygas_private.products,easygas_private.setting_definitions TO easygas_server;
GRANT UPDATE(name,description,category,size_kg,asset,safety) ON easygas_private.products TO easygas_server;
-- Grants from the base schema must not allow edits to economic snapshots or append-only records.
REVOKE UPDATE ON easygas_private.support_messages,easygas_private.cylinder_inspections,easygas_private.refill_history,easygas_private.consumption_feedback,easygas_private.job_deliveries,easygas_private.reward_redemptions,easygas_private.pos_sales,easygas_private.pos_items FROM easygas_server;

DO $$ DECLARE t text; BEGIN
FOREACH t IN ARRAY ARRAY['recurring_authorisations','schedule_occurrences','campaigns','campaign_recipients'] LOOP
EXECUTE format('ALTER TABLE easygas_private.%I ENABLE ROW LEVEL SECURITY',t);
EXECUTE format('CREATE POLICY trusted_server ON easygas_private.%I TO easygas_server USING (true) WITH CHECK (true)',t);
EXECUTE format('GRANT SELECT,INSERT ON easygas_private.%I TO easygas_server',t);
EXECUTE format('REVOKE UPDATE ON easygas_private.%I FROM easygas_server',t);
END LOOP;
END $$;
GRANT UPDATE(active,revoked_at) ON easygas_private.recurring_authorisations TO easygas_server;
GRANT UPDATE(status,approved_by) ON easygas_private.campaigns TO easygas_server;
GRANT UPDATE(status,sent_at) ON easygas_private.campaign_recipients TO easygas_server;

ALTER TABLE easygas_private.approval_delegations ENABLE ROW LEVEL SECURITY;
CREATE POLICY trusted_server ON easygas_private.approval_delegations TO easygas_server USING (true) WITH CHECK (true);
GRANT SELECT,INSERT ON easygas_private.approval_delegations TO easygas_server;
REVOKE UPDATE ON easygas_private.approval_delegations FROM easygas_server;
GRANT UPDATE(status,reviewed_by,review_reason) ON easygas_private.approval_delegations TO easygas_server;

INSERT INTO schema_migrations(version) VALUES ('004'),('005'),('006'),('007'),('008'),('009'),('010');
COMMIT;
