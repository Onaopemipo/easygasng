-- Restore only the existing server capability for the additive compatibility column.
GRANT UPDATE(is_default) ON easygas_private.account_addresses TO easygas_server;
