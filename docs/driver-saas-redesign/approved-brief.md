# EasyGas Energy Solutions — Complete Driver Experience Codex Implementation
## Approved premium SaaS web dashboard + native iOS/Android Driver Home, Orders, History and Profile

**Repository:** `https://github.com/Onaopemipo/easygasng`  
**Execution contract:** Audit → map existing behaviour → implement → regression test → document → release decision.  
**Primary visual authority:** `references/Approved_Driver_Web_Dashboard.png` for desktop layout; `references/Approved_Driver_Mobile_*.png` for native mobile design language.  
**Existing screen evidence:** `references/Existing_Driver_Web_Dashboard.png`.  
**IMPORTANT:** The approved mockups contain illustrative numbers, identities, statuses, locations, maps and features. They are NOT a backend contract or permission grant.

## 1. Mission and absolute constraints

Act as a senior full-stack product engineer, mobile engineer, UX architect, security engineer and QA lead. **Implement the approved modern, compact EasyGas Driver experience end-to-end** across existing desktop web driver workspace, responsive mobile web and native iOS/Android Driver app. This is an implementation task, not a redesign proposal. Audit the real repository first and preserve all existing functional behaviour and business controls. Do not silently delete, duplicate or change any working routes, role permissions, data contracts, mobile navigation, delivery workflow, order events, financial records, cylinder serials, stock movements, proof-of-delivery evidence, GPS consent or audit history.

Driver scope is strictly delivery-focused. **Only Home, Orders, History, Profile** are primary driver destinations. The mockup's Earnings, duplicated Deliveries/My Orders, free-form vehicle management, generic finance, product catalogue, service booking, stock control, staff administration, and other unrelated shortcuts are OUT OF SCOPE. Do not introduce new role names or additional privileged routes.

Do not deploy or enable live payments, automatic dispatch, tracking, routing providers or operational feature flags. Do not create fake orders, real customer identities, map coordinates, prices, routes, ETA, trip history, counts, badges, comparisons or successful delivery states. Real UI must use authoritative backend responses. Missing data means “Unavailable”, not zero, except when the server confirms zero. Preserve sandbox warnings.

## 2. Phase 0 — Mandatory repository audit before editing

1. Read `AGENTS.md`, repository instructions, current architecture and traceability guidelines, existing P0 NO-GO register, relevant mobile/driver/dispatch documents, and current release gates. Record branch/commit, dirty worktree and installed versions. Protect unrelated edits; create a feature branch if permitted.
2. Locate the exact existing `/admin/deliveries` driver-role route, the signed-in driver web shell, navigation and workspace components. Search for text from the current screenshot: “EasyGas Driver”, “Unavailable for new assignments”, “Connection and location”, “Assigned deliveries”, “At a glance”, “Home”, “Orders”, “History”, “Profile”. Determine whether driver role currently uses a single Deliveries sidebar route with internal tabs; **do not replace its route with unverified new routes**.
3. Locate the actual native Driver Home, Orders, History, Profile components and navigation in `apps/mobile`, including existing `App.tsx`, driver workspace, location capture, trip tracking, offline sync, evidence capture and profile/preferences. Verify paths rather than guessing.
4. Trace real backend action names, payload schemas, state transitions, branch/driver scoping, driver availability, foreground heartbeat, backend connectivity, location consent, GPS permission, current trip, assignment acknowledgement, pickup, out-for-delivery, arrival, proof-backed delivery, failures, returns, reassignment and dispatch exceptions. Trace customer contact and navigation permissions.
5. Inspect `apps/web/lib/dispatch-centre.ts`, `apps/web/lib/dispatch-routing.ts`, existing driver workflow, location-privacy and offline GPS documents, as available in current HEAD. Recheck all rules; earlier repository evidence indicated **automatic assignment disabled**, and online/contact distinct from availability/GPS. The repository is the final authority.
6. Inventory UI fields and metrics actually supported. The visual's daily 12/3/7/2 metrics, trend arrows, sample orders, driver photo, live route map, earnings and “Scan Order QR Code” are illustrative. Record unsupported capabilities as **Needs verification** and omit their actions.
7. Map all current driver permissions and data access. Distinguish a driver’s own assigned order from all branch orders; verify whether History includes completed, failed, cancelled, declined or expired assignments and which of those the driver is allowed to see.
8. Audit theme tokens, logo/assets, existing loading/error components, native safe-area/navigation, auth/session and accessibility. Use original EasyGas assets and approved branding, not generic stock photos.
9. Run baseline typecheck, tests and build commands found in package manifests. Record actual pass/fail/blocked results; do not invent outcomes.
10. Write `docs/driver-saas-redesign/00-baseline-audit.md` and `01-api-permission-map.md`, plus `docs/traceability/driver-saas-redesign-rtm.json` and `.md`, before marking anything complete.

## 3. Design system and responsive layout

**Web:** Preserve existing left navigation shell, account menu, search, theme control and site breadcrumbs. Build a compact driver-only workspace in the available main area with responsive gutters (24–32px desktop, 16–20px mobile) and content max-width about 1360–1440px **inside** the existing sidebar. Avoid oversized banner height and empty cards. Prefer a ~70/30 desktop split: primary assignments, delivery overview and history on left; availability, connectivity, active trip and contextual help on right. Stack logically on tablet/mobile. No horizontal scrolling for the entire page. Full-width background accents are acceptable while content remains constrained.

**Native:** Keep the approved four tabs Home, Orders, History, Profile, the EasyGas dark forest green / lime / off-white palette, subtle gradients, premium typography, small icons, 12–18px rounded cards and restrained shadows. Reuse existing navigation, screen transitions, theme provider and approved assets. Do not make the large decorative photograph occupy most of the viewport: reduce the Home availability card height by approximately 35% from the earlier concept; show operational content above the fold. Use platform-native controls, safe areas, Android hardware back, iOS navigation, dynamic type, VoiceOver/TalkBack, minimum 44pt/48dp hit areas and reduced motion.

**Appearance:** Existing Light, Dark and System settings must apply consistently. No duplicate theme preference store or flash of incorrect theme.

**Density:** Prefer a concise greeting, four or fewer verified KPIs, one next-action card, a compact delivery list and separate connectivity indicators. Do not create nonfunctional shortcut tiles merely to fill the layout.

## 4. DRV-W01 — Web Home

Use `Approved_Driver_Web_Dashboard.png` as composition reference but **correct the mockup**:

- Retain the current single authorised driver workspace route and its Home / Orders / History / Profile subnavigation. Do not add Earnings or duplicate Deliveries and My Orders navigation.
- Compact greeting using actual signed-in display name, correct local day/date when relevant; no fabricated name, photo, notification badge or “yesterday” comparison.
- Availability card: actual server-confirmed driver_available state with a toggle/action using existing API. A driver can be available without GPS permission or recent contact. Do not label “online” merely because availability is true.
- Operational status strip: backend last confirmed contact (fresh/stale/unknown), device GPS permission (native only or genuinely reported), location sharing consent (trip-specific), active trip state and last confirmed location time if allowed. Never conflate these signals.
- Summary KPIs: new assignments, in-progress and completed today only where backed by correctly scoped authoritative data. Additional pending metric only if defined by backend. Counts from partial pages must not be represented as totals.
- Next Delivery: show actual next eligible assigned delivery with order reference, permitted destination, items, delivery window, workflow status and context-specific action. If none, show an inviting empty state. Do not show a fake map. Only render a real map/route if authorised coordinates, configured map provider, routing consent and verified route data exist. Otherwise show destination text and existing safe navigation action.
- Current Trip: server-confirmed trip and state timeline, not a fabricated in-progress card. Show “No active trip” when confirmed. GPS/ETA must be clearly stale/unavailable when appropriate.
- Today's Deliveries: compact scoped list/table with status and open-detail action. If only a subset is loaded, label it accurately and link to existing Orders view.
- Quick Actions: only supported, contextual delivery actions (e.g. view assignments, report an issue within an assigned delivery, contact dispatch/support if supported). No unrestricted Scan Order QR Code unless an existing verified scan workflow exists; no earnings, vehicle controls or product admin.
- Loading, empty, permission denied, stale/offline, API failure and retry states are required.

## 5. DRV-W02 / DRV-M02 — Orders

- Primary tabs/filters should be **Assigned, In Progress, History** or a supported equivalent; do not imply drivers can claim unassigned orders with an “Available” tab unless the backend explicitly permits it.
- Display only orders/attempts assigned to the authenticated driver and permitted by branch and current attempt ownership. Card/table includes real reference, order state, customer name/contact only where permitted, destination, product quantities, delivery window, current next action.
- Open order detail via existing navigation, preserve list filters and scroll position on return.
- Supported transitions must follow canonical workflow: assigned → acknowledged → pickup → out_for_delivery → arrived → proof-backed delivered, plus documented decline/failure/help/return paths. Do not skip states with a “Start Delivery” or “Mark Picked Up” shortcut.
- Driver acknowledgement requires current owned/versioned attempt and unexpired authorisation. Preserve existing availability, active branch, trip/vehicle, stock, payment, cylinder serial/inspection/custody, capacity, and physical handover guards.
- Navigation to destination uses verified address/pin and existing supported external maps or internal map provider; no invented route/ETA.
- Photo proof, exact-item/cylinder verification, delivery confirmation, offline drafts/queued evidence and server-confirmed completion remain intact. No false “Delivered” after a local-only offline save.
- Decline and failure reasons follow existing contract and audit. Preserve duplicate-tap/idempotency behaviour and concurrent reassignment protections.

## 6. DRV-W03 / DRV-M03 — History

- History contains **closed/historical assignments**, not active deliveries. Completed, failed, cancelled, declined or expired items appear only according to the verified backend history/permissions contract.
- Search by authorised order reference and filter by date range and final outcome where supported. Use bounded pagination/load more and honest totals. No fabricated 12 deliveries / 24 cylinders counts.
- Each history row/card displays actual order reference, final status, dated event, destination summary and quantity. Detail view provides existing immutable timeline, proof-of-delivery photos and authorised evidence links where available.
- Do not add “Rate Delivery” (driver rating is not a driver-facing function). Do not add export or performance analytics without verified authorised backend support. No earnings.
- Empty states, stale history, offline read-only cached state and permission revocation must be handled safely.

## 7. DRV-W04 / DRV-M04 — Profile

- Display verified driver identity, role, branch, contact information and account status using real backend data. Do not hardcode a driver ID, phone, email, vehicle or verification badge. Use approved profile photo only if available; otherwise use initials.
- Personal information edit only for fields the current account API authorises. Role, branch, driver verification, qualification and compliance are **read-only** unless a separately governed admin workflow exists.
- Vehicle information is **read-only current assigned vehicle/trip summary**, not a driver vehicle-management screen. Do not expose fleet stock, capacity editing or administrative approvals.
- Documents: show authorised document/compliance status only if the existing system provides it; do not invent upload/approval flows.
- Notifications: reuse existing preferences, but do not allow a toggle to suppress legally/operationally required alerts.
- Location: display actual OS permission, active-trip consent and GPS tracking state separately. Never imply a UI switch alone grants OS permissions or begins tracking. Offer OS settings navigation only when platform-supported.
- Offline sync: show queued delivery updates, last confirmed sync and retry using existing mechanism; do not expose a toggle that silently disables required evidence synchronisation.
- Appearance: Light/Dark/System through existing theme provider. Language only if localisation exists. Security, support, app info, password/session and logout reuse current routes/actions.
- Preserve secure session expiry, role/branch revalidation, privacy and sign-out clearing of protected data.

## 8. Desktop/mobile web and native screen parity

The web driver experience and native app should share **business semantics**, not duplicated business logic or identical DOM layout. Audit existing API client and state handling. Reuse the same authenticated actions and response contracts, no second order/driver/trip store. Native is mobile-first and web is workspace-first. Keep role-specific customer/technician/owner navigation untouched. Use consistent statuses, dates, validation, error messages, and authorised actions across platforms.

For desktop web, all four subviews must work within the existing driver `/admin/deliveries` shell unless current source establishes another canonical route. For mobile web, use stacked cards and a compact tab selector. For native, use existing four bottom tabs. Deep links should respect authentication and assignment ownership.

## 9. Data security, privacy and safety — non-negotiable

- Driver assignment is not an unrestricted queue: only current assigned attempts can be acted on, with server checks for role, branch, version and assignment ownership.
- **Automatic assignment remains disabled** unless independently implemented/approved outside this UI scope.
- Availability, heartbeat/online, GPS permission, consent, current trip and location freshness are separate concepts. Stale GPS must never be presented as live.
- GPS collection must follow the existing consented active-trip policy and platform permission lifecycle. No tracking outside authorised active trips; no unreviewed persistent background surveillance.
- Do not expose other drivers' or customers' private location or contact details. Mask or omit sensitive fields unless current backend authorises them.
- Preserve Paystack, verified payments, approved COD, wallet ledger, refunds, inventory, cylinder custody, vehicle mass/capacity, returns, incidents, photos and audit records.
- A UI success state is never sufficient for payment verification, stock movement or delivery completion. Only server-confirmed transitions count.
- Preserve existing immutable evidence, exactly-once business operation guarantees, retry keys, timeouts, conflict handling, offline sync ordering and safe recovery.
- Do not modify backend/business rules to satisfy the visual. A narrowly scoped bug fix, if truly necessary, must be isolated, justified, regression-tested and separately documented; do not expand privileges.

## 10. UI states and interactions

Implement explicit states for: initial loading; no assignments; one/multiple assignments; unavailable driver; available driver; backend connected but stale heartbeat; offline; GPS not granted; consent off; active consented trip; no active trip; no route data; location stale; new assignment; awaiting acknowledgement; picked up; out for delivery; arrived; evidence pending; delivered server-confirmed; failed/declined; returned; history empty; denied access; role changed; 401/403/404/409/429; network timeout; pending action; duplicate tap; queued offline evidence; sync success/failure; light/dark/system; reduced motion; small screens; large text.

Journeys:
A. Driver signs in → Home → availability status → sees only actual assigned orders.
B. Assigned order → acknowledgement → authorised pickup → navigation → arrival → evidence → server-confirmed delivery → History.
C. No GPS permission → clear explanation and platform permission guidance; availability and backend contact remain separately represented.
D. Offline during delivery → safe local evidence draft/queue → reconnect → backend revalidation → status updates only after confirmation.
E. Declined/expired/reassigned order → old driver loses mutation authority; UI refreshes and clears restricted details.
F. Profile → view read-only vehicle/verification → theme and notification preferences → secure logout.
G. Web ↔ native consistency for active order status and history.

## 11. Minimum automated and manual test matrix (90 scenarios)

T01 web driver route; T02 sidebar preserved; T03 four driver subviews; T04 no Earnings; T05 no duplicate Deliveries/My Orders; T06 real signed-in name; T07 missing photo initials; T08 actual branch; T09 availability off; T10 availability on; T11 availability mutation server-confirmed; T12 availability 403; T13 heartbeat fresh; T14 heartbeat stale; T15 heartbeat unknown; T16 availability distinct from online; T17 GPS not granted; T18 location consent off; T19 consent active trip; T20 no active trip; T21 stale GPS label; T22 no fabricated map; T23 verified map if supported; T24 real new-assignment count; T25 real in-progress count; T26 real completed-today count; T27 no fabricated yesterday trends; T28 empty Home; T29 next assignment; T30 invalid next-action hidden; T31 assigned list; T32 in-progress list; T33 history list; T34 list filter persistence; T35 authorised order detail; T36 cross-driver read denied; T37 cross-branch read denied; T38 driver inactive denied; T39 assigned acknowledgement; T40 expired acknowledgement denied; T41 pickup guards; T42 stock guard; T43 cylinder serial guard; T44 vehicle capacity guard; T45 verified payment/COD guard; T46 out-for-delivery transition; T47 arrived transition; T48 proof capture; T49 proof upload; T50 offline evidence queue; T51 reconnect sync; T52 no false delivered offline; T53 delivery confirmed by server; T54 duplicate submit; T55 concurrent reassignment; T56 decline path; T57 failure reason; T58 returns; T59 incident/report issue contextual; T60 contact dispatch/support; T61 external navigation verified; T62 no fake ETA; T63 history excludes active; T64 history completed; T65 history failed; T66 history cancelled/declined per contract; T67 history filters; T68 history pagination; T69 evidence immutable; T70 no driver rating; T71 profile read; T72 personal edit scope; T73 vehicle read-only; T74 verification read-only; T75 document permissions; T76 OS permission status; T77 offline sync status; T78 theme light/dark/system; T79 session expiry; T80 role revocation; T81 web 320/390/768/1024/1440/1920; T82 iOS safe areas; T83 Android back; T84 VoiceOver/TalkBack; T85 reduced motion; T86 customer/technician/admin non-regression; T87 Paystack/refund non-regression; T88 cylinder custody/inventory non-regression; T89 native build and typecheck; T90 rollback and RTM validation.

For every test record exact command, environment, actual result, evidence and PASS/FAIL/BLOCKED/NOT RUN. Add repo-specific tests discovered during audit. Do not report physical-device testing as passed unless actually executed on devices or a documented emulator.

## 12. Acceptance gates (40)

G01 baseline audit; G02 route preserved; G03 sidebar/header; G04 only four driver destinations; G05 desktop approved visual; G06 responsive mobile web; G07 iOS Home; G08 iOS Orders; G09 iOS History; G10 iOS Profile; G11 Android four screens; G12 real metrics; G13 no fabricated records; G14 availability correct; G15 heartbeat separate; G16 GPS permission separate; G17 consent privacy; G18 stale location; G19 assigned ownership; G20 branch scope; G21 valid acknowledgement; G22 pickup readiness; G23 cylinder custody; G24 vehicle capacity; G25 finance checks; G26 proof-backed delivery; G27 offline sync safety; G28 History closed-only; G29 authorised evidence; G30 Profile read-only governed fields; G31 theme; G32 accessibility; G33 auth/session expiry; G34 cross-role negative tests; G35 regression suite; G36 build/typecheck; G37 evidence/screenshots; G38 RTM; G39 rollback; G40 explicit release GO/NO-GO.

Critical gate failure or missing proof means NO-GO. Existing EasyGas platform-wide P0 blockers remain in force even if driver UI gates pass.

## 13. Execution order

Phase 0 — Audit, baseline, exact route/API map, role/branch rules, RTM.
Phase 1 — Shared driver UI tokens, data selectors and minimal reusable components; preserve existing APIs.
Phase 2 — Desktop web Home + Orders + History + Profile, responsive layout and existing shell integration.
Phase 3 — Native iOS/Android four-tab implementation and design alignment.
Phase 4 — Authorised actions, GPS/consent/heartbeat/offline state integration, navigation and evidence continuity.
Phase 5 — Empty/stale/error states, accessibility, light/dark/system, performance and screenshots.
Phase 6 — Negative security tests, financial/inventory/driver regressions, builds, RTM and rollback.
Phase 7 — Final source review and explicit release assessment. Do not deploy automatically.

## 14. Required deliverables

1. Actual source changes on a feature branch; no unrelated code modifications.
2. `docs/driver-saas-redesign/00-baseline-audit.md`.
3. `docs/driver-saas-redesign/01-api-permission-map.md`.
4. `docs/driver-saas-redesign/02-design-implementation.md`.
5. `docs/driver-saas-redesign/03-security-and-safety-regression.md`.
6. `docs/driver-saas-redesign/04-test-results.md`.
7. `docs/driver-saas-redesign/05-rollback-and-release.md`.
8. `docs/traceability/driver-saas-redesign-rtm.json` and `.md`.
9. Evidence/screenshots for desktop Home/Orders/History/Profile, mobile web and iOS/Android where actually captured; light/dark, loading/empty/error, GPS permission, offline, proof and role denial.
10. Final report: commit/branch, exact changed files, reused API actions, any verified gaps, design deviations, test commands and results, security findings, rollback steps, unresolved blockers and explicit GO/NO-GO.

Traceability statuses: VERIFIED_COMPLETE, IMPLEMENTED_UNVERIFIED, PARTIAL, UI_ONLY, BACKEND_ONLY, DEFECTIVE, NOT_IMPLEMENTED, BLOCKED, NOT_APPLICABLE. No unexecuted test earns VERIFIED_COMPLETE.

## 15. Rollback and release policy

Prefer additive and reversible frontend changes. Preserve all historical orders, delivery attempts, location evidence, proof photos, custody movements, financial records, user permissions, settings and audit logs. Do not create destructive migrations or replace canonical order/driver data models. Roll back UI deployments by reverting the feature branch/commit while retaining immutable business evidence. Disable new optional presentation features safely if their backing data is missing. Record exact rollback and post-rollback validation steps.

**FINAL DIRECTIVE:** Audit the actual EasyGas repository FIRST, then implement the approved premium, compact driver SaaS experience for web and native mobile, retaining Home / Orders / History / Profile only. Use authoritative server data, keep availability, backend connectivity and GPS separate, show only assigned deliveries, honour every existing safety and financial guard, and deliver tested code plus verifiable evidence. Never present mockup metrics, fake routes, earnings or unsupported controls as production functionality.
