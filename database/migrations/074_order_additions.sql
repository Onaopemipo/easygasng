-- Supplementary requests share the original order, customer and single fulfilment.
CREATE TABLE order_additions (
 id text PRIMARY KEY, order_id text NOT NULL UNIQUE REFERENCES orders(id),
 actor_id text NOT NULL REFERENCES users(id), request_key text NOT NULL,
 request_hash text NOT NULL, reason text NOT NULL CHECK(length(reason)>=10),
 snapshot jsonb NOT NULL, amount_kobo bigint NOT NULL CHECK(amount_kobo>0),
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(actor_id,request_key)
);
CREATE FUNCTION preserve_order_addition() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Order addition records are immutable'; END $$;
CREATE TRIGGER order_addition_immutable BEFORE UPDATE OR DELETE ON order_additions FOR EACH ROW EXECUTE FUNCTION preserve_order_addition();
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='easygas_server') THEN GRANT SELECT,INSERT ON order_additions TO easygas_server; END IF; END $$;
ALTER TABLE order_additions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='easygas_server') THEN
 CREATE POLICY trusted_server ON order_additions TO easygas_server USING(true) WITH CHECK(true);
END IF; END $$;
