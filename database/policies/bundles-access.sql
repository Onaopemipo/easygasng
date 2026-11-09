ALTER TABLE easygas_private.service_bundles ENABLE ROW LEVEL SECURITY;
CREATE POLICY trusted_server ON easygas_private.service_bundles TO easygas_server USING(true) WITH CHECK(true);
GRANT SELECT,INSERT,UPDATE ON easygas_private.service_bundles TO easygas_server;
