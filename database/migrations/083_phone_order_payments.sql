-- Additive phone-order capability. No account, order, stock or financial data is invented.
CREATE TABLE phone_order_payment_links (
 id text PRIMARY KEY, order_id text NOT NULL REFERENCES orders(id),
 customer_id text NOT NULL REFERENCES users(id), created_by text NOT NULL REFERENCES users(id),
 token_hash text NOT NULL UNIQUE, sealed_token text NOT NULL,
 order_fingerprint text NOT NULL, profile_hash text, profile_completed_at timestamptz,
 expires_at timestamptz NOT NULL, revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX phone_order_payment_links_order ON phone_order_payment_links(order_id,created_at DESC);
ALTER TABLE phone_order_payment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_order_payment_links FORCE ROW LEVEL SECURITY;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='easygas_server') THEN
 GRANT SELECT,INSERT,UPDATE ON phone_order_payment_links TO easygas_server;
 -- Profile completion may update the pending order destination; no amount/ledger grant is added.
 GRANT UPDATE(address,payment_method) ON orders TO easygas_server;
 CREATE POLICY server_only ON phone_order_payment_links TO easygas_server USING(true) WITH CHECK(true);
END IF; END $$;
