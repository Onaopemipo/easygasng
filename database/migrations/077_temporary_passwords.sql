ALTER TABLE users ADD COLUMN temporary_password_expires_at timestamptz;
ALTER TABLE staff_invitations ADD COLUMN temporary_password_hash text;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='easygas_server') THEN
    GRANT UPDATE(temporary_password_hash) ON staff_invitations TO easygas_server;
  END IF;
END $$;
