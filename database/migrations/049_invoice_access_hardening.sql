-- Additive hardening also upgrades any development installation that recorded 048 early.
CREATE INDEX IF NOT EXISTS customer_invoices_customer_history ON customer_invoices(customer_id,issued_at DESC);
CREATE INDEX IF NOT EXISTS customer_invoices_branch_history ON customer_invoices(branch_id,issued_at DESC);
CREATE INDEX IF NOT EXISTS account_addresses_normalised_phone_lookup ON account_addresses ((regexp_replace(phone,'[^0-9]','','g'))) WHERE archived=false;
ALTER TABLE customer_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_invoices FORCE ROW LEVEL SECURITY;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='easygas_server') THEN
 GRANT SELECT,INSERT ON customer_invoices TO easygas_server;
 GRANT USAGE ON SEQUENCE customer_invoice_number_seq TO easygas_server;
 CREATE POLICY customer_invoice_trusted_server ON customer_invoices TO easygas_server USING(true) WITH CHECK(true);
END IF; END $$;
