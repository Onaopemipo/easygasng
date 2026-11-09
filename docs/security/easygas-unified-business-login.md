# Unified business sign-in

One existing `/login` form authenticates the existing users table. The server derives the stored active identity and role, not a browser-supplied Admin/Staff choice. No new credential/account system and no role picker or arbitrary switch were introduced. The current model is one effective role per canonical user; multi-role switching is not applicable and was not fabricated.

The existing protected admin layout, catchall page, navigation.access, action allowlists and active-branch guards remain. Session lookup occurs per request; suspension/revocation/expiry is covered by existing regression tests. Owner, administrator and staff use the same login. The actual role matrix is `../traceability/easygas-admin-route-permission-matrix.md`; owner is not synonymous with administrator. Menus do not grant API access.

Driver and technician permission guards run before the new dashboard/search facade, preserving dedicated assignment sessions and field navigation. Customer/commercial identities cannot access these facades. Dashboard financial data is owner/finance only even when another role may read operational orders. Branch spoofing, forged role fields and inaccessible search records are rejected. New endpoints are GET reads; existing mutation CSRF/origin/idempotency/independent approval controls remain unchanged.

Notifications are user-owned; unread totals include all unread rows, while display is bounded30. Order links are emitted only if the module and current branch authorize that record; field roles get no broad-order shortcut. Mark-read uses the existing mutation. Other notification kinds keep their existing body/read experience; dedicated destination mapping is not complete.

Executed negatives: ADM-AUTH03, ADM-SEARCH12, ADM-FILTER03, ADM-AUTH01 and ADM-NOTIFY12 in admin-dashboard.test.ts; existing RM/platform/inventory-finance/HTTP tests cover revocation, session expiry, cross-branch and independent approval. No live messages, credentials, permission grants or production roles were changed.
