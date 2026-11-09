-- Extend the existing immutable invoice system; no new customer/payment ledger.
ALTER TABLE customer_invoices ALTER COLUMN order_id DROP NOT NULL;
ALTER TABLE customer_invoices ADD COLUMN booking_id text UNIQUE REFERENCES service_bookings(id);
ALTER TABLE customer_invoices ADD CONSTRAINT invoice_exactly_one_source CHECK ((order_id IS NOT NULL)::int + (booking_id IS NOT NULL)::int = 1);
CREATE INDEX customer_invoices_booking ON customer_invoices(booking_id) WHERE booking_id IS NOT NULL;

-- Bind secure requests to the approved quote/report identity, including equal-price scope changes.
ALTER TABLE invoice_payment_requests ADD COLUMN service_source_key text;

-- Preserve the existing independently reviewed full-service refund path.
-- Excess-only reconciliation is explicit and cannot silently reverse earned charges/rewards.
ALTER TABLE credit_requests ADD COLUMN service_refund_scope text NOT NULL DEFAULT 'service' CHECK(service_refund_scope IN ('service','excess'));
