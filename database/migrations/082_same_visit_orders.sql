-- Fee waiver evidence for a separate order on an existing active customer visit.
CREATE TABLE order_visit_links (
 order_id text PRIMARY KEY REFERENCES orders(id),
 parent_order_id text NOT NULL REFERENCES orders(id),
 driver_id text NOT NULL REFERENCES users(id),
 trip_id text NOT NULL REFERENCES driver_trips(id),
 actor_id text NOT NULL REFERENCES users(id),
 reason text NOT NULL CHECK(length(trim(reason))>=10),
 request_key text NOT NULL,
 request_hash text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(actor_id,request_key), CHECK(order_id<>parent_order_id)
);
CREATE INDEX order_visit_parent ON order_visit_links(parent_order_id);
CREATE FUNCTION preserve_order_visit_link() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Same-visit fee evidence is immutable'; END $$;
CREATE TRIGGER order_visit_link_immutable BEFORE UPDATE OR DELETE ON order_visit_links FOR EACH ROW EXECUTE FUNCTION preserve_order_visit_link();
ALTER TABLE order_visit_links ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='easygas_server') THEN
 GRANT SELECT,INSERT ON order_visit_links TO easygas_server;
 CREATE POLICY trusted_server ON order_visit_links TO easygas_server USING(true) WITH CHECK(true);
END IF; END $$;
CREATE TABLE order_visit_products (
 order_id text NOT NULL REFERENCES orders(id), load_id text NOT NULL REFERENCES vehicle_product_loads(id),
 quantity integer NOT NULL CHECK(quantity>0), state text NOT NULL DEFAULT 'reserved' CHECK(state IN ('reserved','handed','returned','released')),
 PRIMARY KEY(order_id,load_id)
);
ALTER TABLE order_visit_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_visit_products FORCE ROW LEVEL SECURITY;
ALTER TABLE order_visit_links FORCE ROW LEVEL SECURITY;
REVOKE ALL ON order_visit_products,order_visit_links FROM PUBLIC;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='easygas_server') THEN
 GRANT SELECT,INSERT,UPDATE ON order_visit_products TO easygas_server;
 CREATE POLICY trusted_server ON order_visit_products TO easygas_server USING(true) WITH CHECK(true);
END IF; END $$;
CREATE FUNCTION preserve_order_visit_product() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='DELETE' OR OLD.state<>'reserved' OR (NEW.order_id,NEW.load_id,NEW.quantity) IS DISTINCT FROM (OLD.order_id,OLD.load_id,OLD.quantity) THEN RAISE EXCEPTION 'Same-visit product allocation history is immutable'; END IF;
 RETURN NEW;END $$;
CREATE TRIGGER order_visit_product_immutable BEFORE UPDATE OR DELETE ON order_visit_products FOR EACH ROW EXECUTE FUNCTION preserve_order_visit_product();
