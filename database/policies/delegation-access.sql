ALTER TABLE easygas_private.approval_delegations ENABLE ROW LEVEL SECURITY;
CREATE POLICY trusted_server ON easygas_private.approval_delegations TO easygas_server USING (true) WITH CHECK (true);
GRANT SELECT,INSERT ON easygas_private.approval_delegations TO easygas_server;
REVOKE UPDATE ON easygas_private.approval_delegations FROM easygas_server;
GRANT UPDATE(status,reviewed_by,review_reason) ON easygas_private.approval_delegations TO easygas_server;
