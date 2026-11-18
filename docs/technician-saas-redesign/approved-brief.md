# EasyGas Energy Solutions — Technician SaaS Workspace
## COMPLETE CODEX IMPLEMENTATION PROMPT — Desktop Web, Mobile Web, Native iOS and Android

**Repository:** https://github.com/Onaopemipo/easygasng  
**Current route evidence:** `https://easygas-client-demo.vercel.app/admin/bookings` (verify actual route/role routing in checked-out HEAD).  
**Primary approved design:** `references/Approved_Technician_Web_Dashboard.png`  
**Original interface:** `references/Existing_Technician_Web_Screenshot.png`  
**Previously approved technician mobile UI:** `references/Prior_Approved_Technician_Mobile_Screen_Board.png`  
**Implementation rule:** Repository and verified domain contracts are the functional authority; design images are visual authority only.

## 1. MISSION

You are Codex acting as lead full-stack engineer, React/Next.js engineer, Expo/React Native engineer, product UX architect, security engineer, and QA lead. **Implement** the approved premium EasyGas Technician SaaS workspace end to end in the EXISTING repository. Audit first; then implement, test, document and report. Do not stop at wireframes, a plan, or generic advice. Work in a feature branch without overwriting unrelated changes.

Transform the existing sparse Technician Service Bookings interface into a compact, polished, responsive technician-focused workspace. Preserve all existing functionality, backend APIs, records, permissions, role routing, navigation contracts, qualification/safety/finance rules, evidence retention, booking lifecycle and platform-wide release gates. Avoid gratuitous architecture rewrites. No fabricated customer names, jobs, metrics, routes, timestamps, availability, photos, ETAs or success states.

## 2. FIRST: AUDIT THE REAL REPOSITORY (MANDATORY)

1. Read `AGENTS.md`, repository README, docs/traceability guidance, production-readiness/NO-GO documentation, existing technician/service booking specifications, test conventions and release requirements. Record HEAD SHA, branch, dirty worktree and baseline tests. Do not reset unrelated changes.
2. Locate actual web route `/admin/bookings`, technician-only workspace components, shared admin shell, `apps/web/components/professional-services.tsx`, `apps/web/lib/professional-services.ts`, `apps/web/lib/service.ts`, role/branch permission helpers, technician qualifications, service reports, quotations, booking statuses, evidence storage, incident flows, notifications, service guidelines and search. Verify every named path exists in HEAD; adapt to actual structure.
3. Locate native Expo technician role routing, screens, navigation, theme, API client, secure auth/session, background/offline evidence handling, image capture, job checklists and mobile tests. Inspect `apps/mobile/Services.tsx`, `apps/mobile/App.tsx`, `apps/mobile/theme.tsx` if still applicable. Do not create a duplicate technician app.
4. Document the authoritative APIs/actions and exact request/response schemas for: assigned bookings; job detail; technician acknowledgement/acceptance if present; en-route/arrival/start/finish; technician qualifications; safety checks; service checklist; incident; report; photo evidence; customer confirmation; history; profile; support; notifications. **Do not invent endpoint names or fields.**
5. Identify server-side eligibility checks for every transition: assigned technician identity, branch, active status, current qualifications, appointment time, quotation approval, invoice and verified payment where required, independent approvals, safety requirements, required evidence, report/acknowledgement and version/concurrency guards.
6. Record existing role navigation and menu links. Current design target is **Home, Jobs, History, Profile**. Preserve actual existing authorised service links within context rather than silently deleting them.
7. Determine which design concepts are unsupported: technician availability toggle, KPI totals, next appointment, progress percentages, photos, guidelines, quick actions, reporting/export, customer call, start service, calendar or map. Hide or show a truthful unavailable state when not verified.
8. Baseline relevant web/native tests, typechecks and builds, recording commands, environment, failures and skipped cases. Do not claim success without execution.
9. Create `docs/technician-saas-redesign/00-baseline-audit.md`, `01-routes-api-permissions.md`, and a traceability matrix `docs/traceability/technician-saas-redesign-rtm.json` and `.md` BEFORE coding.

## 3. DESIGN SYSTEM AND SHELL

- Retain original EasyGas logo, forest green, lime accents, warm off-white, clean typography, rounded 12–18px cards, subtle elevation, restrained icons, visible focus and high contrast. Reuse existing design tokens and assets; do not introduce a new global design system.
- Web: keep existing authenticated shell, header/search/notifications/account and role-aware sidebar. Make technician workspace fluid, centred within ~1360–1440px max main-content width, with 24–32px gutters. Do not apply public storefront width changes to admin globally.
- Desktop at >=1200px: approximately 70/30 main/right columns. Main: greeting, real operational indicators, next eligible appointment, today's jobs; right: verified availability/connection status, contextual actions, progress when calculable.
- Tablet: 2-column only when space permits; otherwise stack. Mobile web: one column, compact cards, no horizontal overflow at 320/375/390/430px. Native: use platform-native controls, safe areas, keyboard avoidance, and same information hierarchy, not web DOM porting.
- Light/Dark/System theme, existing user preference persistence, WCAG AA target, dynamic type, reduced motion, screen reader labels, iOS >=44pt and Android >=48dp tap targets.
- Header date and greeting must use actual locale/time zone appropriate to user and verified settings; no mockup date. Do not add decorative wave, photos or animated KPI counts if they reduce usability.

## 4. FOUR WORKSPACES AND ENTRY POINTS

### TEC-WEB-001 / TEC-MOB-001 — Home / Overview

- Concise personalised greeting, verified role and today's date; no fake title or unverified profile photo.
- Up to four compact cards when actual authoritative counts exist: Assigned Jobs, In Progress, Completed Today, Upcoming. Clarify period, definition and assignment scope. Do not treat empty API response as verified zero if fetch failed. Hide unsupported counters.
- Highlight **Next Appointment** only if one exists and is assigned to the signed-in technician. Display verified service name, reference, scheduled time, location and customer contact only where permitted. Primary action must reflect server-authorised next step, e.g. View Job, Acknowledge, En Route, Start Work, Resume Work, Submit Report; never offer Start Service just because the card exists.
- If no jobs, show a polished, concise empty state: "No assigned appointments yet" and an existing Refresh or authorised services/help link; no synthetic records.
- Today's Jobs compact list/table with verified status badges and detail links. Preserve search, filter and pagination where supported. Keep long lists on Jobs screen.
- Right rail: technician availability ONLY if a verified backend state and mutation exist; otherwise show read-only connection, qualification or schedule status if supported. **Do not conflate connectivity, availability, qualification and permission.**
- Quick actions limited to verified workflows: View Jobs, Service Guidelines if an existing authorised resource exists, Report Incident only in job context or verified generic workflow, Contact Support if a real support route exists. Remove fake Scan Order, Use Materials, Earnings, independent Reports, vehicle and gas stock features.
- Progress card only if a reliable backend numerator/denominator and selected time period exist; no fake 33% or unsupported daily comparisons.

### TEC-WEB-002 / TEC-MOB-002 — Jobs

- Primary job list with All, Upcoming, In Progress, Awaiting Action and other filters ONLY when supported by actual booking states. Preserve existing service booking links and state machine.
- Each row/card: actual booking reference, service, customer/destination (authorised), schedule, status, next permitted action. Search and sort are branch/assignment scoped. Native list supports pull-to-refresh if existing app convention allows.
- Job detail opens a dedicated screen with timeline, appointment, service scope, approved quote, payment/safety eligibility, checklist, photo evidence, incident reporting, report, customer confirmation and server-confirmed completion. Display each only if existing backend supports it.
- Never allow changing service scope, price, materials, payment status or technician assignment from technician view unless specifically authorised by verified backend contract.
- Every mutation uses existing version, identity, idempotency and transaction safeguards. Preserve draft on recoverable errors and show clear 403/409/422 messages.

### TEC-WEB-003 / TEC-MOB-003 — History

- Show technician's own completed, cancelled, failed and otherwise terminal/closed jobs, with filters for period, status and service type when supported. **Do not put active jobs in History** merely because they have past event timestamps.
- Show actual completed time, final outcome, service report and photo evidence through authorised historical records. History is read-only unless existing workflow permits post-completion corrections through governance.
- No invented performance scoring, earnings, export, customer ratings or completion totals. No deletions or overwrites of historical evidence.

### TEC-WEB-004 / TEC-MOB-004 — Profile

- Authenticated technician identity, contact details, verified branch and role; qualification/verification state is backend-owned and read-only.
- View qualifications and expiry if authorised. Do not let technician self-approve certifications or edit compliance status.
- Settings: notifications, Light/Dark/System, supported app preferences, session/security, Help, About, Sign Out. Existing account settings and authentication flow remain intact.
- Do not introduce a vehicle-management or earnings page. Do not expose administrative settings.

## 5. CONTEXTUAL JOB WORKFLOW (REUSE EXISTING)

The existing service booking lifecycle, not the screenshot, defines transitions. Audit and map the current canonical statuses and eligibility. Expected conceptual flow may include pending confirmation, confirmed, assigned, en route, in progress, awaiting customer approval, awaiting acknowledgement and completed; **never add statuses solely from this prompt**.

- Qualification must be verified independently by the Safety Officer where existing rules require it; technician cannot self-verify.
- Additional work requires existing quotation and customer approval, then invoice and verified payment where required. Do not bypass independent approval or Paystack verification.
- Job checklists, photos and reports remain tied to the canonical job and current technician assignment. Photo evidence must be stored in the existing authorised storage with correct privacy and retention.
- Customer signature/acknowledgement is configurable only if backend supports it. Do not fake signature, completion, payment or evidence.
- Incident reports and safety escalation are contextual to the job; do not expose a generic incident-management console to technicians.
- Offline drafts may be queued only where the existing architecture supports secure retry; offline capture never means the server has completed the job. Show queued/sync/error and last-confirmed status clearly.
- Server-confirmed completion is the only basis for a Completed badge. Preserve immutable audit, event and report history.

## 6. RESPONSIVE WEB AND NATIVE INTEGRATION

Desktop web: reuse the actual technician `/admin/bookings` route and role shell. Add Home/Jobs/History/Profile workspace navigation only through verified existing routing patterns; avoid duplicating admin menus or creating disconnected routes. If the current route remains `/admin/bookings`, ensure deep links and browser refresh work. The legacy Professional Services link may remain in the existing role navigation only if authorised, but it must not become a technician admin feature.

Mobile web: responsive card layout, sticky job action only when eligible, filters as chips/sheet, bottom sheet for short interactions and dedicated screen for evidence-heavy review. Preserve header and logout.

Native iOS/Android: use existing Expo app and auth. Preserve approved four tabs Home, Jobs, History, Profile. Keep Reports within Job Details and remove unrelated quick actions. Respect back navigation, safe areas, text scaling, VoiceOver/TalkBack, dark/light/system and offline drafts. Do not create separate app/backend authentication.

Cross-platform: same backend records and state semantics; no duplicate job stores. Refresh on focus/resume and after mutations with race guards. Handle session expiry, revoked role, branch reassignment and stale data by clearing restricted caches.

## 7. REAL DATA AND EMPTY/ERROR STATES

Mandatory states: initial loading, empty assigned jobs, no next appointment, missing KPI, unavailable qualifications, permission denied, suspended/revoked role, stale data, offline, queued evidence, sync failed, 401/403/404/409/422/429, timeout, retry, validation errors, job changed during review, payment pending, quotation awaiting approval, insufficient safety evidence, submission pending, server-confirmed success.

Only show zero when backend confirms zero. Never hardcode illustrated "3 assigned", "1 in progress", example customer names, order IDs, dates or image. No fake map markers or ETA. If an existing image asset is approved, use it; otherwise a clean icon-based appointment card is preferable.

## 8. SECURITY AND FINANCIAL NON-REGRESSION

- All reads and writes require authenticated technician identity and server-enforced assignment/branch/record scope. Staff/owner/driver/customer role boundaries must remain.
- A technician must never be able to view unrelated customers or bookings by modifying an ID, query or deep link.
- Preserve server authorisation on every status transition, qualification checks, quotation approval, invoice/payment verification, safety policy, evidence, immutable service reports, incident history and audit logs.
- No changes to Paystack, wallets, POS, refunds, reconciliation, stock, cylinder serial custody, vehicle manifests, driver dispatch or business settings unless a proven compatibility issue is discovered; any such issue must be documented and not silently modified.
- No client-only permission gates, no hardcoded privileges, no synthetic data in production, no automatic deployments.
- Preserve existing production NO-GO P0 blockers and recovery procedures. Passing UI tests is not a production GO decision.

## 9. IMPLEMENTATION PHASES

**A — Audit and baseline:** routes, files, APIs, roles, UI states, current tests, source SHA, RTM.
**B — Shared presentation:** minimal reusable cards, tabs, status indicators, loading/error states, theme tokens; preserve business logic.
**C — Desktop web:** Home overview, Jobs, History, Profile, compact 70/30 layout, contextual actions.
**D — Mobile web:** responsive views, sheets, accessible interactions, no overflow.
**E — Native:** update existing Expo technician role screens, four tabs, evidence/assignment continuity.
**F — End-to-end integration:** verified real data, transitions, errors, offline sync, permissions, historical evidence.
**G — Verification:** unit/integration/E2E, security negative cases, responsive screenshots, iOS/Android checks, regression, RTM.
**H — Handoff:** change summary, exact test evidence, limitations, rollback, explicit GO/NO-GO.

Stop and mark BLOCKED if an action requires an unverified backend capability or would weaken finance, safety, custody or assignment controls. Implement supported UI, report unsupported gaps honestly.

## 10. MINIMUM TEST MATRIX — 90 SCENARIOS

Record actual command, result, environment and evidence for each. Do not claim a pass for a test not run.

T01 web route authorised; T02 web direct deep link; T03 role-specific sidebar; T04 admin shell retained; T05 search retained; T06 notifications retained; T07 account/logout retained; T08 no duplicate menus; T09 real greeting; T10 actual timezone; T11 real assigned count; T12 real in-progress count; T13 real completed count; T14 upcoming count basis; T15 no fake zero; T16 no jobs empty; T17 no next job empty; T18 next job assigned-only; T19 next job details; T20 no invented photo; T21 unsupported availability hidden; T22 availability vs connectivity distinct; T23 status badges authoritative; T24 no fabricated progress; T25 real job list; T26 job search; T27 job filters; T28 job pagination; T29 job details; T30 customer scope; T31 branch scope; T32 cross-technician read denied; T33 cross-technician mutation denied; T34 assignment revoked; T35 qualification valid; T36 qualification expired; T37 independent qualification verification; T38 booking state transition; T39 invalid transition denied; T40 appointment time gate; T41 quote required; T42 customer quote approval; T43 unpaid invoice gate; T44 verified payment gate; T45 safety checklist; T46 checklist persistence; T47 evidence upload; T48 evidence retention; T49 offline draft; T50 queued upload; T51 sync retry; T52 offline false completion blocked; T53 incident contextual; T54 incident ownership; T55 service report; T56 customer acknowledgement; T57 server-confirmed completion; T58 duplicate completion idempotent; T59 concurrent job change; T60 history terminal-only; T61 history filters; T62 history immutable; T63 history evidence access; T64 profile identity; T65 read-only qualifications; T66 notification settings; T67 Light mode; T68 Dark mode; T69 System mode; T70 sign-out clears cache; T71 session expired; T72 role revoked mid-session; T73 web 320px; T74 web 375/390px; T75 tablet 768/1024px; T76 desktop 1280/1440/1920px; T77 keyboard focus; T78 reduced motion; T79 VoiceOver iOS; T80 TalkBack Android; T81 native iOS tabs; T82 native Android tabs; T83 native back navigation; T84 native safe areas; T85 no earnings or vehicle management; T86 service booking regression; T87 financial/Paystack regression; T88 inventory/cylinder custody regression; T89 driver/customer/admin regression; T90 RTM and rollback verified.

Add discovered cases. Tests requiring real devices or unavailable credentials must be marked NOT RUN with explanation, never PASS.

## 11. ACCEPTANCE GATES — 40

G01 audit; G02 baseline; G03 routes preserved; G04 four-tab navigation; G05 customer/driver isolation; G06 assigned-only data; G07 branch scoping; G08 real KPI basis; G09 no fabricated counts; G10 empty state; G11 desktop 70/30; G12 mobile web; G13 iOS; G14 Android; G15 theme; G16 accessibility; G17 availability correctly gated; G18 GPS/connection distinct; G19 next job eligible; G20 job details; G21 qualification guard; G22 quotation guard; G23 payment guard; G24 safety guard; G25 checklist; G26 photo evidence; G27 incident contextual; G28 report; G29 customer acknowledgement; G30 completion server-confirmed; G31 offline truthful; G32 history terminal-only; G33 profile restrictions; G34 session/revocation; G35 no unrelated features; G36 finance regression; G37 stock/custody regression; G38 automated tests; G39 RTM/rollback; G40 explicit GO/NO-GO.

No critical gate can be VERIFIED_COMPLETE without executed evidence. The existing platform-wide production NO-GO remains unless separately resolved.

## 12. REQUIRED DELIVERABLES

1. Actual code changes for web and native apps.
2. `docs/technician-saas-redesign/00-baseline-audit.md`.
3. `docs/technician-saas-redesign/01-routes-api-permissions.md`.
4. `docs/technician-saas-redesign/02-ui-implementation.md`.
5. `docs/technician-saas-redesign/03-security-finance-safety-regression.md`.
6. `docs/technician-saas-redesign/04-test-results.md`.
7. `docs/technician-saas-redesign/05-rollback-release.md`.
8. `docs/traceability/technician-saas-redesign-rtm.json` and `.md`.
9. Evidence screenshots: web desktop, tablet, mobile web, dark mode, empty/active/error states, native iOS and Android if actually captured.
10. Final report: changed files, actual API mapping, all features preserved, exact tests run/passed/failed/skipped, blockers, design deviations and GO/NO-GO.

## 13. ROLLBACK

Prefer reversible UI and navigation changes. No destructive migrations or deletion of historical service records, photos, audit events, finance or customer data. Record previous source revision, feature flags and precise rollback commands. If a new technician UI fails, revert its frontend integration without resetting backend state. Do not deploy automatically.

## FINAL EXECUTION DIRECTIVE

Audit the real EasyGas repository first. Implement the approved premium SaaS Technician dashboard and all four workspaces on desktop web, mobile web, iOS and Android. Keep the technician experience focused on assigned jobs, preserve every existing service workflow and server guard, use only real data, test and document all changes, and report release status accurately. Do not fabricate functionality from the design image.
