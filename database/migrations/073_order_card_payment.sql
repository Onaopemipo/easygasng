-- Direct card checkout reuses the sandbox payment orchestrator and verified ledger.
-- Existing invoice/service/wallet targets and financial records are unchanged.
ALTER TABLE payment_intents ADD COLUMN order_id text REFERENCES orders(id);
ALTER TABLE payment_intents DROP CONSTRAINT payment_intents_purpose_check;
ALTER TABLE payment_intents DROP CONSTRAINT payment_intents_check;
ALTER TABLE payment_intents ADD CONSTRAINT payment_intents_purpose_check CHECK(purpose IN ('invoice','service','wallet','order'));
ALTER TABLE payment_intents ADD CONSTRAINT payment_intents_check CHECK(
 (purpose='invoice' AND invoice_id IS NOT NULL AND booking_id IS NULL AND order_id IS NULL) OR
 (purpose='service' AND booking_id IS NOT NULL AND invoice_id IS NULL AND order_id IS NULL) OR
 (purpose='wallet' AND invoice_id IS NULL AND booking_id IS NULL AND order_id IS NULL) OR
 (purpose='order' AND order_id IS NOT NULL AND invoice_id IS NULL AND booking_id IS NULL));
CREATE INDEX payment_intents_order ON payment_intents(order_id) WHERE order_id IS NOT NULL;
