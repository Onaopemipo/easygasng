-- Reviewed existing-demo migration085. Atomic; all canonical data must remain identical.
BEGIN;
SET LOCAL search_path TO easygas_private,pg_catalog;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM schema_migrations WHERE version='084') THEN RAISE EXCEPTION 'Expected reviewed schema084'; END IF;
 IF EXISTS(SELECT 1 FROM schema_migrations WHERE version='085') THEN RAISE EXCEPTION 'Migration085 already recorded; use read-only verification'; END IF;
END $$;
CREATE TEMP TABLE asa_before(table_name text PRIMARY KEY, row_count bigint, fingerprint text) ON COMMIT DROP;
DO $$ DECLARE t record; n bigint; h text; BEGIN
 FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='easygas_private' AND c.relkind='r' AND c.relname<>'schema_migrations' LOOP
  EXECUTE format($q$SELECT count(*),md5(coalesce(string_agg(md5(to_jsonb(r)::text),'' ORDER BY md5(to_jsonb(r)::text)),'')) FROM easygas_private.%I r$q$,t.relname) INTO n,h;
  INSERT INTO asa_before VALUES(t.relname,n,h);
 END LOOP;
END $$;
-- User-approved scope change: Admin is a final business approver, including own requests.
-- No history rewritten. Existing immutable-note and evidence guards remain installed.
DO $$
DECLARE c record;
BEGIN
 FOR c IN SELECT conrelid::regclass AS tab, conname FROM pg_constraint
 WHERE contype='c' AND conrelid IN ('invoice_notes'::regclass,'product_compatibility'::regclass,'recommendation_rules'::regclass)
 AND (pg_get_constraintdef(oid) LIKE '%approved_by <> requested_by%'
   OR pg_get_constraintdef(oid) LIKE '%proposed_by <> reviewed_by%'
   OR pg_get_constraintdef(oid) LIKE '%created_by <> reviewed_by%')
 LOOP EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I',c.tab,c.conname); END LOOP;
END $$;
CREATE OR REPLACE FUNCTION admin_final_review_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE maker text; reviewer text;
BEGIN
 IF TG_TABLE_NAME='invoice_notes' THEN maker:=NEW.requested_by; reviewer:=NEW.approved_by;
 ELSIF TG_TABLE_NAME='product_compatibility' THEN maker:=NEW.proposed_by; reviewer:=NEW.reviewed_by;
 ELSE maker:=NEW.created_by; reviewer:=NEW.reviewed_by; END IF;
 IF reviewer=maker AND NOT EXISTS(SELECT 1 FROM users WHERE id=reviewer AND active=true AND role='owner') THEN
  RAISE EXCEPTION 'Only an active Admin can approve their own request';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER invoice_notes_admin_review BEFORE INSERT OR UPDATE ON invoice_notes FOR EACH ROW EXECUTE FUNCTION admin_final_review_guard();
CREATE TRIGGER product_compatibility_admin_review BEFORE INSERT OR UPDATE ON product_compatibility FOR EACH ROW EXECUTE FUNCTION admin_final_review_guard();
CREATE TRIGGER recommendation_rules_admin_review BEFORE INSERT OR UPDATE ON recommendation_rules FOR EACH ROW EXECUTE FUNCTION admin_final_review_guard();

INSERT INTO schema_migrations(version) VALUES ('085');
DO $$ DECLARE t record; n bigint; h text; BEGIN
 FOR t IN SELECT * FROM asa_before LOOP
  EXECUTE format($q$SELECT count(*),md5(coalesce(string_agg(md5(to_jsonb(r)::text),'' ORDER BY md5(to_jsonb(r)::text)),'')) FROM easygas_private.%I r$q$,t.table_name) INTO n,h;
  IF n<>t.row_count OR h IS DISTINCT FROM t.fingerprint THEN RAISE EXCEPTION 'Canonical data changed in %; rolling back',t.table_name; END IF;
 END LOOP;
END $$;
SELECT 'PASS: all canonical table rows and fingerprints preserved; Admin-only review guards installed' AS result,count(*) AS tables_checked FROM asa_before;
COMMIT;
