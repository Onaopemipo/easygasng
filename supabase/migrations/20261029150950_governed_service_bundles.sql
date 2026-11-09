-- Governed linked bundles, applied after professional services.
BEGIN;
SET LOCAL search_path TO easygas_private,pg_catalog;
CREATE TABLE service_bundles(id text PRIMARY KEY,branch_id text NOT NULL REFERENCES branches(id),name text NOT NULL,config jsonb NOT NULL DEFAULT '{"active":false,"products":[],"serviceId":"","serviceDiscountPercent":0,"description":"Draft bundle requires business configuration."}',version integer NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE commerce_checkouts ADD COLUMN bundle_snapshot jsonb;

INSERT INTO schema_migrations(version) VALUES ('020');
ALTER TABLE easygas_private.service_bundles ENABLE ROW LEVEL SECURITY;
CREATE POLICY trusted_server ON easygas_private.service_bundles TO easygas_server USING(true) WITH CHECK(true);
GRANT SELECT,INSERT,UPDATE ON easygas_private.service_bundles TO easygas_server;

INSERT INTO schema_migrations(version) VALUES ('021');
COMMIT;
