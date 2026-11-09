ALTER TABLE easygas_private.stocktakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE easygas_private.stocktake_counts ENABLE ROW LEVEL SECURITY;
CREATE POLICY trusted_server ON easygas_private.stocktakes TO easygas_server USING(true) WITH CHECK(true);
CREATE POLICY trusted_server ON easygas_private.stocktake_counts TO easygas_server USING(true) WITH CHECK(true);
GRANT SELECT,INSERT ON easygas_private.stocktakes,easygas_private.stocktake_counts TO easygas_server;
GRANT UPDATE(status,counts_hash) ON easygas_private.stocktakes TO easygas_server;
