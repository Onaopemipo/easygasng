DO $$ DECLARE t text; BEGIN
FOREACH t IN ARRAY ARRAY['recurring_authorisations','schedule_occurrences','campaigns','campaign_recipients'] LOOP
EXECUTE format('ALTER TABLE easygas_private.%I ENABLE ROW LEVEL SECURITY',t);
EXECUTE format('CREATE POLICY trusted_server ON easygas_private.%I TO easygas_server USING (true) WITH CHECK (true)',t);
EXECUTE format('GRANT SELECT,INSERT ON easygas_private.%I TO easygas_server',t);
EXECUTE format('REVOKE UPDATE ON easygas_private.%I FROM easygas_server',t);
END LOOP;
END $$;
GRANT UPDATE(active,revoked_at) ON easygas_private.recurring_authorisations TO easygas_server;
GRANT UPDATE(status,approved_by) ON easygas_private.campaigns TO easygas_server;
GRANT UPDATE(status,sent_at) ON easygas_private.campaign_recipients TO easygas_server;
