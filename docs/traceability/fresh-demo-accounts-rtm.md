# Fresh hosted demo accounts

[Detailed mapping](fresh-demo-accounts-rtm.json) · [Audit](../demo-accounts/audit.md) · [Report](../demo-accounts/report.md)

DEMO-LOGIN01 and DEMO-LOGIN02 VERIFIED_COMPLETE for bounded credential provisioning/handover. Implementation2/2, verified2/2, critical2/2, gates2/2, hosted role sign-ins13/13. Customer/commercial admin-denial checks pass. Credentials are excluded from source/evidence; no passwords in this matrix. Existing production NO-GO and unrelated feature/operational gates remain.

## Five-role demo refresh, 15 November 2026

DEMO-LOGIN01 passed for all five current staff roles on the isolated Vercel demo at schema 079. The accounts use the default role privileges and a Lagos branch record. Owner access follows the existing business-wide role policy. The database transaction added five audited test users and preserved order, wallet and verified-payment counts. Credentials were handed over in a Git-ignored file with mode 0600.

DEMO-LOGIN02 passed shared authentication and the scoped API checks for all five roles. Chrome reached four of five workspaces. The technician web route rendered a 404 and its navigation request returned 403. Shared mobile authentication passed for all five roles, including assigned-job and delivery API checks. Both dedicated field-app login endpoints returned 500. Installed app testing was outside this credential refresh.

The [executed evidence](fresh-demo-staff-20261115-evidence.txt) records the complete results. Three of five validation gates passed. The two failed gates remain in scope. Production remains NO-GO.
