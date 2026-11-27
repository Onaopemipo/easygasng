-- Reviewed operator application for existing easygas-client-demo-db only.
-- Changes six missing customer branches to Lagos and the column default. No grants or role changes.
BEGIN ISOLATION LEVEL REPEATABLE READ;
SET LOCAL search_path TO easygas_private,pg_catalog;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM schema_migrations WHERE version='084') THEN RAISE EXCEPTION '084 already applied; do not rerun this reviewed backfill'; END IF;
 IF (SELECT count(*) FROM users WHERE branch_id IS NULL)<>6 OR EXISTS(SELECT 1 FROM users WHERE branch_id IS NULL AND role<>'customer') THEN RAISE EXCEPTION 'Expected exactly six missing customer branches; stop and review changed data'; END IF;
 IF EXISTS(SELECT 1 FROM staff_privilege_overrides o JOIN users u ON u.id=o.user_id WHERE u.branch_id IS NULL) THEN RAISE EXCEPTION 'Missing-branch accounts have overrides; review access effects first'; END IF;
END $$;
CREATE TEMP TABLE lagos_before_users ON COMMIT DROP AS SELECT id,branch_id,to_jsonb(u)-'branch_id' AS identity FROM users u;
CREATE TEMP TABLE lagos_before_tables(table_name text PRIMARY KEY,fingerprint text) ON COMMIT DROP;
DO $$ DECLARE t record; h text; BEGIN
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname=current_schema() AND tablename NOT IN ('users','audit_events','schema_migrations','staff_privilege_versions') LOOP
  EXECUTE format('SELECT md5(coalesce(string_agg(v,chr(10) ORDER BY v),'''')) FROM (SELECT to_jsonb(x)::text v FROM %I x) q',t.tablename) INTO h;
  INSERT INTO lagos_before_tables VALUES(t.tablename,h);
 END LOOP;
END $$;

-- Default new accounts and fill existing missing assignments; explicit branches are retained.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM branches WHERE id='lagos' AND active=true) THEN
    RAISE EXCEPTION 'An active Lagos branch is required before applying the default user branch';
  END IF;
END $$;
ALTER TABLE users ALTER COLUMN branch_id SET DEFAULT 'lagos';
WITH assigned AS (
  UPDATE users SET branch_id='lagos' WHERE branch_id IS NULL
  RETURNING id,public_customer_id,role
)
INSERT INTO audit_events(id,actor_id,action,target,outcome,detail)
SELECT gen_random_uuid()::text,NULL,'users.branch.defaulted',id,'success',
  jsonb_build_object('branch','lagos','previousBranchId',NULL,'branchId','lagos',
    'userRole',role,'customerPublicId',public_customer_id,'databaseRole',current_user,
    'source','migration084','reason','Admin requested Lagos as the default user branch')
FROM assigned;

DO $$ DECLARE t record; h text; BEGIN
 IF EXISTS(SELECT 1 FROM users WHERE branch_id IS NULL) THEN RAISE EXCEPTION 'Missing branches remain'; END IF;
 IF EXISTS(SELECT 1 FROM lagos_before_users b FULL JOIN users u USING(id) WHERE b.id IS NULL OR u.id IS NULL OR b.identity IS DISTINCT FROM (to_jsonb(u)-'branch_id') OR (b.branch_id IS NOT NULL AND b.branch_id IS DISTINCT FROM u.branch_id) OR (b.branch_id IS NULL AND u.branch_id<>'lagos')) THEN RAISE EXCEPTION 'Identity or explicit branch preservation failed'; END IF;
 IF (SELECT count(*) FROM audit_events WHERE action='users.branch.defaulted' AND detail->>'source'='migration084')<>6 THEN RAISE EXCEPTION 'Expected six migration audit events'; END IF;
 FOR t IN SELECT * FROM lagos_before_tables LOOP
  EXECUTE format('SELECT md5(coalesce(string_agg(v,chr(10) ORDER BY v),'''')) FROM (SELECT to_jsonb(x)::text v FROM %I x) q',t.table_name) INTO h;
  IF h IS DISTINCT FROM t.fingerprint THEN RAISE EXCEPTION 'Unexpected mutation in %',t.table_name; END IF;
 END LOOP;
END $$;
INSERT INTO schema_migrations(version) VALUES('084');
COMMIT;
-- This row is returned only after the guarded transaction committed successfully.
SELECT current_user AS database_role,
 (SELECT max(version) FROM easygas_private.schema_migrations) AS schema_version,
 (SELECT count(*) FROM easygas_private.users WHERE branch_id IS NULL) AS missing_branch,
 (SELECT count(*) FROM easygas_private.audit_events WHERE action='users.branch.defaulted' AND detail->>'source'='migration084') AS backfilled_with_audit,
 (SELECT pg_get_expr(d.adbin,d.adrelid) FROM pg_attrdef d JOIN pg_attribute a ON a.attrelid=d.adrelid AND a.attnum=d.adnum WHERE d.adrelid='easygas_private.users'::regclass AND a.attname='branch_id') AS branch_default;
