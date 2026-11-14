-- Store the proposed access separately from credentials and bind it to its independent review.
ALTER TABLE staff_invitations ADD COLUMN requested_access jsonb;
ALTER TABLE staff_invitations ADD COLUMN access_request_id text UNIQUE REFERENCES change_requests(id);
ALTER TABLE staff_invitations ADD CONSTRAINT staff_invitation_access_requires_acceptance
  CHECK (access_request_id IS NULL OR (requested_access IS NOT NULL AND accepted_at IS NOT NULL));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='easygas_server') THEN
    GRANT UPDATE(access_request_id) ON staff_invitations TO easygas_server;
  END IF;
END $$;
