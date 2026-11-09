-- Excess collection is a governed purchase-credit refund, never a second payment or sale refund.
ALTER TABLE credit_requests ADD COLUMN invoice_excess boolean NOT NULL DEFAULT false;
ALTER TABLE credit_requests ADD COLUMN invoice_excess_snapshot jsonb;
ALTER TABLE credit_requests ADD CONSTRAINT invoice_excess_source CHECK(NOT invoice_excess OR (order_id IS NOT NULL AND booking_id IS NULL AND kind='refund' AND invoice_excess_snapshot IS NOT NULL));
