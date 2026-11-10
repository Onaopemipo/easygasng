-- Per-user operation overrides; canonical roles, identities and historic approvals remain unchanged.
CREATE TABLE staff_privilege_versions(user_id text PRIMARY KEY REFERENCES users(id),version integer NOT NULL DEFAULT 0 CHECK(version>=0));
CREATE TABLE staff_privilege_overrides(user_id text NOT NULL REFERENCES users(id),privilege text NOT NULL,effect text NOT NULL CHECK(effect IN ('grant','deny')),changed_by text NOT NULL REFERENCES users(id),role_at_change text NOT NULL,branch_at_change text,invalidated_at timestamptz,changed_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,privilege));
CREATE INDEX staff_privilege_overrides_actor ON staff_privilege_overrides(changed_by);
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='easygas_server') THEN
 GRANT SELECT,INSERT,UPDATE ON staff_privilege_versions TO easygas_server;
 GRANT SELECT,INSERT,UPDATE,DELETE ON staff_privilege_overrides TO easygas_server;
END IF; END $$;
ALTER TABLE staff_privilege_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_privilege_overrides ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='easygas_server') THEN
 CREATE POLICY trusted_server ON staff_privilege_versions TO easygas_server USING(true) WITH CHECK(true);
 CREATE POLICY trusted_server ON staff_privilege_overrides TO easygas_server USING(true) WITH CHECK(true);
END IF; END $$;

-- Grants must never silently reactivate after a role or branch move and later reversal.
CREATE FUNCTION invalidate_staff_privilege_grants() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF OLD.role IS DISTINCT FROM NEW.role OR OLD.branch_id IS DISTINCT FROM NEW.branch_id THEN
  UPDATE staff_privilege_overrides SET invalidated_at=now() WHERE user_id=NEW.id AND effect='grant' AND invalidated_at IS NULL;
  INSERT INTO staff_privilege_versions(user_id,version) VALUES(NEW.id,1) ON CONFLICT(user_id) DO UPDATE SET version=staff_privilege_versions.version+1;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER staff_privilege_identity_change AFTER UPDATE OF role,branch_id ON users FOR EACH ROW EXECUTE FUNCTION invalidate_staff_privilege_grants();
