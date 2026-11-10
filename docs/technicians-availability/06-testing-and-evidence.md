# Executed tests and evidence — 10 November 2026

Audit baseline:628 tests,607 pass,21 environment-dependent skips,0 fail. Web/mobile TypeScript and web production build passed before edits. No lint script exists. Baseline files: tests.txt,types.txt,mobile-types.txt,build.txt.

Final full regression:634 tests,612 pass,22 environment-dependent skips,0 failures (final-regression.txt). Skips include external/native/local-PostgreSQL-dependent acceptance; not treated as passes. Focused21/21 tests pass (scoped-tests.txt), including existing professional-service, technician work and four-screen regressions. Current-source web production build and both TypeScript projects pass. Traceability validation2/2 passes. A source-string assertion was updated after permission-filtered links became data-driven; the failed intermediate run is not used as passing evidence.

Independent PostgreSQL: postgres.txt passes with two concurrent connections attempting overlapping availability; exactly one slot commits. It also inserts a legacy overlapping slot in the disposable test schema, races customer/commercial reservations and asserts exactly one booking commits. Self/field management denial is tested. Disposable schema is dropped in finally; production/demo records are never fixtures.

API coverage: actual NextRequest GET/POST handlers test401,403,400,405,429 and successful scoped directory response. Domain tests exercise inactive/zero filtering, global-owner vs branch-limited staff, ID/qualification search, expiry/revocation/evidence visibility, selected Lagos-date count, adjacent/overlap/unavailable scheduling, self-verification, booked-slot block rejection and operation replay. Shared fixture availability is explicit; old overlapping-reservation test retains its original safety assertion with directly seeded legacy slots.

## Actual visual interaction

Existing isolated demo records viewed through a temporary loopback preview of current source (no deployment).2 actual technicians,2active,0on assignment,0available today; no mock design counts or qualifications created. Existing unqualified demo account remains unverified. Demo banner shown. Existing grouped sidebar, service links, directory, genuine empty search, independent reviewer selector, modal/Escape/branded unsaved confirmation and focus return checked. No invitation/qualification/booking/business mutation submitted during visual checks; ordinary sign-in/session/audit is expected.

Screenshots: desktop.png (1536px,2:1 directory/rail),tablet.png (768px,stacked rail),mobile-web.png (390px,cards and2x2KPIs),mobile-dark.png,unsaved-dialog.png. Measured settled mobile document width375 <=viewport390; tablet753<=768; desktop1521<=1536. Native viewport changes are actual browser overrides, not a device simulation. A transient existing navigation-count refresh warning cleared on the next confirmed response; remote preview reads take several seconds and production-volume/latency acceptance remains open. An HMR-only effect-dependency warning cleared with a full reload; final settled preview has no alert.

Native source/typecheck only; no signed build or iOS/Android physical/assistive run claimed. Full weekly schedules, richer qualification evidence/history, notification and recovery/offline/device acceptance remain engineering/test gaps in08-open-risks-and-launch-gates.md. Production NO-GO preserved.
