-- Revision history supplements the existing booking/invoice, never a collectible ledger.
CREATE TABLE service_invoice_drafts (
 id text PRIMARY KEY,
 booking_id text NOT NULL REFERENCES service_bookings(id),
 revision integer NOT NULL CHECK(revision>0),
 source_key text NOT NULL,
 source_total_kobo bigint NOT NULL CHECK(source_total_kobo>0),
 due_date date NOT NULL,
 customer_note text NOT NULL CHECK(length(customer_note)<=2000),
 reason text NOT NULL,
 created_by text NOT NULL REFERENCES users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(booking_id,revision)
);
CREATE TRIGGER service_invoice_draft_immutable BEFORE UPDATE OR DELETE ON service_invoice_drafts FOR EACH ROW EXECUTE FUNCTION preserve_customer_invoice();
ALTER TABLE service_invoice_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_invoice_drafts FORCE ROW LEVEL SECURITY;
REVOKE ALL ON service_invoice_drafts FROM PUBLIC;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='easygas_server') THEN
 GRANT SELECT,INSERT ON service_invoice_drafts TO easygas_server;
 CREATE POLICY service_invoice_draft_trusted_server ON service_invoice_drafts TO easygas_server USING(true) WITH CHECK(true);
END IF; END $$;
