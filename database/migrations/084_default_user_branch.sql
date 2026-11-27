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
