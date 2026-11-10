# Fresh demo account handover

[Traceability](../traceability/fresh-demo-accounts-rtm.md)

Audited the old stored demo credentials: all12 manifest entries authenticated. No inference is made about the user's browser/session/input; those accounts remain unchanged. Created13 additional clearly synthetic users covering owner, manager, finance, inventory, dispatcher, sales, driver, technician, service manager, safety officer, technical administrator, customer and commercial. No identity merge, password reset, old role change, invented safety qualification or seed rerun.

Hosted13/13 login and exact returned user/role checks passed; customer/commercial accounts received403 on the admin dashboard. Existing orders2, wallet entries0 and verified-payment counts stayed unchanged; users increased13 to26. Each new identity has an account-created audit record. No real message, transaction, stock mutation or deployment.

Private credentials live in ignored0600 `.data/demo-test-logins-20261110.md` and a companion private JSON. Neither is included in Git or Vercel uploads. The Markdown guide includes the stable sign-in link and role-switching guidance. New driver/technician accounts retain normal availability, assignment and safety-qualification requirements. Passwords meet the deployed12-character validation while the approved8-character change remains local.

Previous production NO-GO, configuration/financial gates, retain-all/import hold, native/server deferrals and pending local feature changes remain unchanged. Accounts are retained; do not delete them or their future audit history as a cleanup shortcut.
