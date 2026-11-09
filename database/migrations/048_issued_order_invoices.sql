-- Invoices snapshot existing order/ledger data; this migration does not create payments.
CREATE SEQUENCE customer_invoice_number_seq;
CREATE TABLE customer_invoices(
 id text PRIMARY KEY, invoice_number text NOT NULL UNIQUE DEFAULT ('EGI-'||lpad(nextval('customer_invoice_number_seq')::text,10,'0')),
 order_id text NOT NULL UNIQUE REFERENCES orders(id), customer_id text NOT NULL REFERENCES users(id), branch_id text NOT NULL REFERENCES branches(id),
 version integer NOT NULL DEFAULT 1 CHECK(version=1), currency text NOT NULL DEFAULT 'NGN' CHECK(currency='NGN'),
 total_kobo bigint NOT NULL CHECK(total_kobo>0), snapshot jsonb NOT NULL,
 issued_by text NOT NULL REFERENCES users(id), issued_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION preserve_customer_invoice() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Issued invoice is immutable; use an authorised linked adjustment'; END $$;
CREATE TRIGGER customer_invoice_immutable BEFORE UPDATE OR DELETE ON customer_invoices FOR EACH ROW EXECUTE FUNCTION preserve_customer_invoice();
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='easygas_server') THEN GRANT SELECT,INSERT ON customer_invoices TO easygas_server; GRANT USAGE ON SEQUENCE customer_invoice_number_seq TO easygas_server; END IF; END $$;
CREATE INDEX customer_invoices_customer_history ON customer_invoices(customer_id,issued_at DESC);
CREATE INDEX customer_invoices_branch_history ON customer_invoices(branch_id,issued_at DESC);
