-- Consolidate staff identities while preserving historical policy snapshots and decisions.
CREATE TEMP TABLE staff_role_mapping (previous_role text PRIMARY KEY, new_role text NOT NULL) ON COMMIT DROP;
INSERT INTO staff_role_mapping VALUES
  ('administrator','owner'), ('safety_officer','owner'),
  ('inventory','finance'), ('auditor','finance'),
  ('sales','manager'), ('sales_rep','manager'), ('dispatcher','manager'), ('service_manager','manager');

CREATE FUNCTION pg_temp.consolidate_role_list(roles jsonb) RETURNS jsonb LANGUAGE sql AS $$
  SELECT COALESCE(jsonb_agg(role ORDER BY position), '[]'::jsonb)
  FROM (
    SELECT COALESCE(m.new_role, r.role) AS role, min(r.position) AS position
    FROM jsonb_array_elements_text(roles) WITH ORDINALITY r(role, position)
    LEFT JOIN staff_role_mapping m ON m.previous_role=r.role
    GROUP BY COALESCE(m.new_role, r.role)
  ) mapped;
$$;

CREATE TEMP TABLE staff_role_changes ON COMMIT DROP AS
SELECT u.id, u.branch_id, u.role AS previous_role, m.new_role
FROM users u JOIN staff_role_mapping m ON m.previous_role=u.role;

CREATE TEMP TABLE updated_staff_policies ON COMMIT DROP AS
SELECT d.key, COALESCE(m.new_role,d.owner_role) AS owner_role,
  pg_temp.consolidate_role_list(d.propose_roles) AS propose_roles,
  pg_temp.consolidate_role_list(d.approve_roles) AS approve_roles,
  pg_temp.consolidate_role_list(d.view_roles) AS view_roles,
  pg_temp.consolidate_role_list(d.required_roles) AS required_roles
FROM setting_definitions d LEFT JOIN staff_role_mapping m ON m.previous_role=d.owner_role;

-- Require fresh decisions where an in-flight request was governed by changed
-- authority. Never reinterpret an existing request to assign a legacy role.
WITH affected AS (
  UPDATE change_requests r SET status='superseded',
    failure_reason='Staff roles changed. Submit a fresh request under the current approval policy.'
  FROM setting_definitions d JOIN updated_staff_policies p ON p.key=d.key
  WHERE r.key=d.key
    AND r.status IN ('draft','pending_approval','partially_approved','changes_requested','approved','scheduled','applying','failed')
    AND (
      d.propose_roles<>p.propose_roles OR d.approve_roles<>p.approve_roles OR d.required_roles<>p.required_roles
      OR EXISTS (SELECT 1 FROM staff_role_changes c WHERE c.id=r.requester_id)
      OR EXISTS (SELECT 1 FROM approval_decisions a JOIN staff_role_changes c ON c.id=a.approver_id
                 WHERE a.request_id=r.id AND a.revision=r.revision)
      OR (d.value_type='access' AND EXISTS (SELECT 1 FROM staff_role_mapping m WHERE m.previous_role=r.proposed_value->>'role'))
    )
  RETURNING r.id,r.key,r.scope
)
INSERT INTO audit_events(id,action,target,outcome,detail)
SELECT 'staff-role-request:'||id,'approval.superseded',id,'success',
       jsonb_build_object('key',key,'branch',scope,'reason','Staff role consolidation')
FROM affected;

-- Capture applicable grants before the normal role-change trigger invalidates
-- them. Restore only these grants for this explicitly approved consolidation.
CREATE TEMP TABLE carried_staff_grants ON COMMIT DROP AS
SELECT o.user_id,o.privilege,c.new_role
FROM staff_privilege_overrides o JOIN staff_role_changes c ON c.id=o.user_id
WHERE o.effect='grant' AND o.invalidated_at IS NULL
  AND o.role_at_change=c.previous_role AND o.branch_at_change IS NOT DISTINCT FROM c.branch_id;

UPDATE users u SET role=c.new_role FROM staff_role_changes c WHERE c.id=u.id;
UPDATE staff_privilege_overrides o SET role_at_change=g.new_role,invalidated_at=NULL
FROM carried_staff_grants g WHERE g.user_id=o.user_id AND g.privilege=o.privilege;

ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK(role IN ('owner','finance','manager','driver','technician','customer','commercial'));

UPDATE setting_definitions d SET owner_role=p.owner_role,propose_roles=p.propose_roles,
  approve_roles=p.approve_roles,view_roles=p.view_roles,required_roles=p.required_roles
FROM updated_staff_policies p WHERE p.key=d.key
  AND (d.owner_role,d.propose_roles,d.approve_roles,d.view_roles,d.required_roles)
      IS DISTINCT FROM (p.owner_role,p.propose_roles,p.approve_roles,p.view_roles,p.required_roles);

-- Delegations depend on the grantor, reviewer, delegate and original policy.
WITH affected AS (
  UPDATE approval_delegations a SET status='revoked',
    review_reason='Staff roles changed. Request a fresh delegation under the current policy.'
  WHERE a.status IN ('pending','approved')
    AND EXISTS (SELECT 1 FROM staff_role_changes c WHERE c.id IN (a.grantor_id,a.delegate_id,a.reviewed_by))
  RETURNING a.id,a.scope
)
INSERT INTO audit_events(id,action,target,outcome,detail)
SELECT 'staff-role-delegation:'||id,'delegation.revoked',id,'success',
       jsonb_build_object('branch',scope,'reason','Staff role consolidation')
FROM affected;

UPDATE operational_incidents i SET owner_role=m.new_role
FROM staff_role_mapping m WHERE i.owner_role=m.previous_role;

UPDATE sessions s SET revoked_at=now() FROM users u
WHERE s.user_id=u.id AND s.revoked_at IS NULL AND u.role IN ('owner','finance','manager');

INSERT INTO audit_events(id,action,target,outcome,detail)
SELECT 'staff-role-consolidation:'||id,'staff.role_consolidated',id,'success',
       jsonb_build_object('previousRole',previous_role,'newRole',new_role,'branch',branch_id)
FROM staff_role_changes;

DROP FUNCTION pg_temp.consolidate_role_list(jsonb);
