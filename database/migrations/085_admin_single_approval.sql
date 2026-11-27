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
