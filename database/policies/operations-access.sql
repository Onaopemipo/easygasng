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
