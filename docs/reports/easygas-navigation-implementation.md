# EasyGas navigation implementation and local acceptance

Date: 30 October 2026. **Local navigation acceptance: PASS. Platform production release: NO-GO.**

## Repository baseline and safety

Started on unborn `main`, with no HEAD commit and no staged changes. The existing application, database scripts and prior work were untracked; this report is a scoped file inventory, not a Git commit diff. Preflight: `docs/navigation/preflight-20261030.md` (CONDITIONAL_PASS for local-only work). No reset, checkout, destructive Git operation, migration, deployment, online payment activation or real staff access change occurred. Normal localhost:3003 PID 29740 was preserved. Isolated browser fixtures ran on localhost:3004 and were stopped after verification. The temporary reduced-motion preference was restored to its original off state.

## Implementation

One central seven-group/28-route contract now drives route guards, sidebar modes, active matching and breadcrumbs. The expanded sidebar uses the existing HD logo; compact mode uses the existing official transparent flame. Six groups collapse while the Dashboard/Overview shortcut stays visible. All authorised icons remain directly reachable in compact mode with full accessible names and focus/hover tooltips. Preferences are per-user, validated and non-sensitive; a UI-only cookie restores width during SSR.

The drawer supports backdrop, Escape, close button, route dismissal, focus trapping/restoration, inert background and scroll locking. Mobile targets are 44px or larger, and labels retain the requested 15px minimum. The existing search remains a working order/assigned-work shortcut rather than a fake global search. Header/profile controls and authenticated branch context replace the old hardcoded branch label. Operations Centre and Launch Readiness are label changes only.

Roles mirror existing read-action allowlists and current setting visibility. Empty groups disappear. Direct administration routes now authenticate and authorise before rendering, independently of protected APIs. Driver and technician web navigation stays assignment-focused; their native navigation source is untouched. A small incident-view data-fetch correction avoids loading unrelated bookings/service workspace data for a technical administrator; no incident business rules changed. Unauthorised staff-directory fetches from legacy record pages were removed.

Eight read-only counters use actual scoped aggregates. Approval counts include valid bounded delegation and exclude self/recipient/expired/already-decided revisions, with current safety qualification checks. No full business datasets are fetched for navigation badges. One in-flight request, 30-second visible-tab refresh, focus/visibility and debounced post-commit refresh provide updates. Requests abort after eight seconds and on unmount. Failed refreshes remove confirmed badges rather than claiming zero. No new public feed or realtime subscription was introduced.

## Files and dependencies

Created:

- `packages/business-rules/src/admin-navigation.ts`
- `apps/web/lib/navigation.ts`
- `apps/web/components/admin-navigation.tsx`
- `tests/navigation.test.ts`
- Requested architecture, permission, counter, accessibility, route-matrix, testing and report documents; browser/contrast evidence and screenshots.

Modified:

- `apps/web/components/admin.tsx` — shell integration, header, identity refresh and guarded content.
- `apps/web/app/admin/[[...section]]/page.tsx` — canonical routes and server access checks.
- `apps/web/lib/service.ts`, `apps/web/app/api/[action]/route.ts` — authenticated read-only navigation actions.
- `apps/web/components/ui.tsx` — optional abort signal and successful-commit notification for refresh.
- `apps/web/components/professional-services.tsx` — incident-only read fetch correction.
- `apps/web/app/globals.css` — scoped navigation/responsive/accessibility styles.
- README documentation pointer.

No dependency, schema, ledger, pricing, financial/approval policy, hosting or native navigation change. Existing product/staff management screens and their controls are preserved. The source manifest records final SHA-256 hashes.

## Verification evidence

| Category                        | Passed                                                                      | Failed | Skipped / limit                                                        | Evidence                                                                    |
| ------------------------------- | --------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Focused navigation              | 10 tests                                                                    | 0      | 0                                                                      | `docs/testing/navigation-focused-results-20261030.txt`                      |
| Full business regression        | 143 tests                                                                   | 0      | 1 guarded independent PostgreSQL test; URL absent                      | `docs/testing/navigation-regression-results-20261030.txt`                   |
| Expanded routes                 | 28                                                                          | 0      | 0                                                                      | Browser evidence JSON                                                       |
| Compact routes                  | 28                                                                          | 0      | 0                                                                      | Browser evidence JSON                                                       |
| Mobile routes                   | 28                                                                          | 0      | 0                                                                      | Browser evidence JSON; 390px document width on every page                   |
| Role visibility                 | 7 browser roles; all existing staff read-action mappings automated          | 0      | Spoken VoiceOver output not exercised                                  | Browser evidence + focused tests                                            |
| Branch/session/counter security | Automated two-branch/current-actor tests; live approved access revocation   | 0      | External PostgreSQL remains separate                                   | Focused tests + live-access JSONL                                           |
| Private schema runtime          | New aggregate queries passed without new grants                             | 0      | PGlite PostgreSQL engine, not a separate PostgreSQL connection         | Focused test 10                                                             |
| Accessibility                   | Keyboard/group/drawer/AX semantics, actual reduced motion, sampled contrast | 0      | Physical devices/formal platform-wide WCAG certification not performed | Browser evidence + contrast JSON                                            |
| Web/native types                | Both commands passed                                                        | 0      | 0                                                                      | `navigation-web-types-20261030.txt`, `navigation-native-types-20261030.txt` |
| Production compile              | Passed                                                                      | 0      | No deployment                                                          | `navigation-build-20261030.txt`                                             |
| Formatting                      | Changed-source Prettier check passed                                        | 0      | Lint command NOT_APPLICABLE: none configured                           | `navigation-format-20261030.txt`                                            |

The full run includes nine navigation tests; the final private-runtime timing test was added and run in the ten-test focused suite. Totals overlap and are not additive. The initial focused run found a whitespace-sensitive source assertion, which was corrected to accept formatted source and rerun successfully; no application failure was hidden. Browser QA also corrected initial drawer-focus timing and widened small-screen controls. The original preference and normal server were preserved.

Every module heading loaded without an error notice in owner route QA, and each mode had exactly one correct active item. Unknown/restricted routes returned not-found; expired/revoked sessions returned login. Native driver/technician role logic was preserved and type-checked. A synthetic manager request and two independent owner/finance reviewers changed only the isolated QA owner's access, automatically revoking its old browser session. Reauthentication showed inventory-only role access; the original owner role was restored through the same approved workflow.

A controlled outage of the owned QA server changed the sidebar from its real badge to no badges plus unavailable status, retaining all 28 links and the correct active item. Recovery restored the actual count in a fresh QA tab after Next development HMR interrupted the old tab. This is not a production reconnect/load benchmark.

Normal browser transition durations were 240ms sidebar, 200ms/180ms groups, 120ms hover. Actual OS reduced motion changed sidebar/group/workspace transitions to 0s and restoring the preference restored normal durations. Sampled navigation contrast minimum: 4.82:1. Automation acknowledgement observations: group 290ms, collapse 265ms, route-to-heading 379ms, drawer 349ms (includes bridge/observation overhead, not animation frame timing). Restricted PGlite aggregate query median 5.00ms, max 5.59ms over ten synthetic-fixture samples; production volume/hardware performance is not claimed.

## NAV acceptance gates

| Gate                         | Status | Local evidence                                                                                                               |
| ---------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------- |
| NAV-01 Repository safety     | PASS   | Baseline recorded, prior untracked application preserved, no destructive operations/schema changes                           |
| NAV-02 Navigation structure  | PASS   | Seven ordered groups, 28 unique unchanged routes and correct labels/order/icons                                              |
| NAV-03 Expanded sidebar      | PASS   | HD branding, active state, grouped links, profile/sign-out; 28 expanded routes                                               |
| NAV-04 Compact sidebar       | PASS   | 74px mode, labelled icons/tooltips, all 28 routes, persisted preference/layout                                               |
| NAV-05 Collapsible groups    | PASS   | Six keyboard-operable controls plus always-visible Overview; active discovery and refresh persistence                        |
| NAV-06 Responsive navigation | PASS   | All mobile routes, 360/390/1024/1280/1560px observations, drawer focus/backdrop/selection/close, no navigation overflow      |
| NAV-07 Permissions           | PASS   | Current role/branch allowlists, server route guards, independent API protection and live revocation/reduced sign-in          |
| NAV-08 Action counters       | PASS   | Eight real scoped definitions, decision eligibility, failure clearing/recovery, no fake values or unauthorised subscriptions |
| NAV-09 Accessibility         | PASS   | Keyboard/AX semantics/focus, 44px mobile targets, contrast sample and actual reduced-motion preference verified              |
| NAV-10 Performance           | PASS   | Bounded aggregate fetches, no full datasets, one in-flight refresh, timeout/cleanup, measured local observations             |
| NAV-11 Regression            | PASS   | Business regression logs, focused restricted-runtime tests, type checks, formatting and production compile                   |

## Remaining limits and production status

No known local navigation implementation blocker remains. Formal spoken-output assistive-technology checks, physical devices and production-sized database/browser load remain NOT_TESTED and should accompany a separate production audit. The independent PostgreSQL integration guard is skipped because no test URL is configured. No standalone lint command exists; no lint pass is invented.

**NO-GO remains the EasyGas public commercial release decision.** This work does not resolve existing payment, physical-stock/cylinder safety, operational, privacy, backup/restore or infrastructure release gates. No deployment was performed. Further navigation code is not required by the verified local scope; production certification remains a separate authorised task.
