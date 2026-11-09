ALTER TABLE easygas_private.cylinder_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY trusted_server ON easygas_private.cylinder_allocations TO easygas_server USING(true) WITH CHECK(true);
GRANT SELECT,INSERT ON easygas_private.cylinder_allocations TO easygas_server;
GRANT UPDATE(state) ON easygas_private.cylinder_allocations TO easygas_server;
GRANT UPDATE(delivered_at) ON easygas_private.orders TO easygas_server;
