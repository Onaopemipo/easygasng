# Navigation preflight — 30 October 2026

Decision: CONDITIONAL_PASS for local navigation work only. Existing release status remains NO-GO.

Git: unborn `main`, no commit/HEAD; no staged changes. Entire existing application is untracked (including all prior completed work). No clean checkout or destructive Git operation will be used. Navigation overlap inspected in `apps/web/components/admin.tsx` and `apps/web/app/globals.css`; their current product/staff screens and 15px typography must be preserved. No other worktree or agent is needed.

Baseline: existing 28 administration route definitions in a flat client array and a catch-all server page. Sidebar uses fixed desktop layout and a basic mobile toggle, without persisted group/collapse state or focus-managed drawer. Server APIs authenticate against current user/session rows and apply role/branch restrictions; no arbitrary permission identifiers exist. Roles are the effective capability model. Some existing menus overexpose links but API allowlists reject access. Driver and technician native navigation already use assignment-specific experiences and will not be rewritten.

Notifications are per-user; approval notification counts are not authoritative pending-decision counts. New counters will be read-only aggregates, enforce fresh authentication and branch/role scope, exclude completed items, avoid loading full business datasets, and clear on errors. No schema, ledger, pricing, inventory, financial or approval business logic changes are required.

Baseline validation: `EASYGAS_PREVIEW=true npm run build` passed (log `/tmp/easygas-navigation-baseline-build.txt`). Root scripts provide test/typecheck/build/format; no lint command/config is installed. Existing Next 16 bundled client/cookies/forbidden documentation inspected; use server authentication with existing cookie, not client hiding as authorization. Existing normal dev server on port 3003 will be preserved. QA will use isolated fixtures/port 3004.

Scope: navigation config/UI, read-only counters, route guards, identity refresh, focused tests and requested documentation. Local hosting, unconnected payments/notifications, delivery-only ordering, independent approvals and all P0 integrity/safety controls remain unchanged. No deployment or real user role change is authorised or required.
