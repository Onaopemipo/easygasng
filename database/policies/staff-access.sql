-- Invitation renewal/revocation requires only these additional mutable columns.
-- Application ownership, branch and recent-verification checks remain mandatory.
GRANT UPDATE(token_hash,expires_at,invited_by) ON easygas_private.staff_invitations TO easygas_server;
