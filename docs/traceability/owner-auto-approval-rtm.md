# Explicit Business Owner automatic approval

[Machine-readable requirements and evidence](owner-auto-approval-rtm.json) · [Audit and scope change](../owner-auto-approval/audit.md)

OWNER-AUTO01: new/draft/rollback submission uses existing activation. OWNER-AUTO02: explicit action for old own pending requests and truthful messaging. OWNER-AUTO03: current authority, scheduling, safety, expiry, versions and inventory atomicity retained. All remain in the denominator while verification/rollout is pending. Production NO-GO unchanged.

Final acceptance: OWNER-AUTO01/02/03 VERIFIED_COMPLETE for bounded web-demo scope;3/3gates. Source67d94cc READY, backend/PG/hosted access and actual pending-owner UI verified. Current pending records remain unchanged until explicitly applied; future owner submissions auto-approve. Full production NO-GO remains.

14 November follow-up — OWNER-AUTO07 extends the existing owner policy to delivery locations, the flat delivery fee and the gas quantity policy. The hosted demo had automatic approval enabled for gas price but excluded these owner-only settings; the four standard locations had no recorded boundary. New verified owner submissions activate immediately or on their effective date. Existing eligible own requests expose **Approve**; no requests are approved in bulk. Staff requests still require review, and a blank boundary still blocks orders and quotes. Payment, staff access and dispatch controls retain their existing gates.

Local acceptance: 25/25 targeted tests, web typecheck and build passed. [Evidence](../owner-auto-approval/evidence/owner-ordering-followup.txt). All four requirements and gates are tracked. The follow-up has not been deployed; actual coverage remains a business decision. No schema change is needed for this fix. To roll back independently of business records, revert this change and redeploy; previously activated settings go through the existing version restoration workflow. Production NO-GO remains.
