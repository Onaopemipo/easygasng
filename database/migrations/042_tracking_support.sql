ALTER TABLE support_requests ADD COLUMN order_id text REFERENCES orders(id);
CREATE INDEX support_requests_order ON support_requests(order_id) WHERE order_id IS NOT NULL;
