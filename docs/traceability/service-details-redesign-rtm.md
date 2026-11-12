# Service Details requirements traceability

Production NO-GO. [Audit](../service-details-redesign/00-repository-audit.md) · [Verification](../service-details-redesign/04-test-results.md) · [JSON matrix](service-details-redesign-rtm.json)

## Requirements

| ID | Requirement | Gate | Status | Outstanding |
| --- | --- | --- | --- | --- |
| SDR-001 | Audit routes, source, baseline and risks | SDR-G01 | VERIFIED_COMPLETE | No outstanding audit action. |
| SDR-002 | Preserve customer shell, route and sign-in context | SDR-G02 | VERIFIED_COMPLETE | Native runtime navigation is tracked separately. |
| SDR-003 | Display only configured price, duration, details and policy | SDR-G05 | VERIFIED_COMPLETE | Dedicated browser cases for missing duration and approved media fallback remain. |
| SDR-004 | Qualified, coverage-aware appointment availability | SDR-G08 | VERIFIED_COMPLETE | No area-specific resource assignment beyond service coverage is configured. |
| SDR-005 | Responsive web layout and true unavailable states | SDR-G17 | PARTIAL | Full assistive technology and long-content stress cases remain. |
| SDR-006 | Native detail, contextual selectors and navigation | SDR-G19 | PARTIAL | Finish authenticated iOS/Android booking, Back and screen readers. |
| SDR-007 | Revalidate appointment and terms before review | SDR-G10 | VERIFIED_COMPLETE | Native interactive recovery remains under the platform gate. |
| SDR-008 | Preserve saved addresses, phone and contact draft | SDR-G10 | PARTIAL | Saved address selection and invalid phone interaction still need UI acceptance. |
| SDR-009 | Preserve bundles, staged appointments and follow-ups | SDR-G16 | PARTIAL | Run redesigned web/native bundle staging and follow-up journeys. |
| SDR-010 | Preserve quote, finance, report and booking state controls | SDR-G13 | VERIFIED_COMPLETE | No hosted integration change in scope. |
| SDR-011 | Theme, accessibility and device acceptance | SDR-G22 | PARTIAL | Native back navigation, VoiceOver/TalkBack and full assistive flow. |
| SDR-012 | Release evidence, traceability and rollback | SDR-G25 | PARTIAL | Native/assistive acceptance and existing production blockers. |

## Scenarios

| ID | Scenario | Result | Evidence or gap |
| --- | --- | --- | --- |
| SDR-T001 | Service catalogue load | PASS | Browser return and focused catalogue suite. |
| SDR-T002 | Direct service deep-link | PASS | Browser opened both authenticated service routes directly. |
| SDR-T003 | Existing routes preserved | PASS | Browser detail and bookings routes, catalogue regression. |
| SDR-T004 | Back navigation | PARTIAL | Browser All services returned to catalogue. Native runtime Back pending. |
| SDR-T005 | Service identity mapping | PASS | Browser matched the title to each service ID. |
| SDR-T006 | Actual service title | PASS | Both service titles verified in Chromium. |
| SDR-T007 | Actual description | PASS | Browser screenshots show configured descriptions. |
| SDR-T008 | Actual price | PASS | SDR-T005 and browser show source price. |
| SDR-T009 | Missing price | PASS | SDR-T005 distinguishes quotation and unavailable fixed price. |
| SDR-T010 | Genuine zero call-out | PASS | SDR-T005 preserves actual zero. |
| SDR-T011 | Missing call-out | PASS | SDR-T005 rejects missing and nonnumeric value. |
| SDR-T012 | Configured duration | PASS | Browser records and slot validation use the configured duration. |
| SDR-T013 | Missing duration | PARTIAL | Missing duration fallback exists; dedicated browser fixture pending. |
| SDR-T014 | Configured inclusions | PASS | SDR-T005 preserves configured lines. |
| SDR-T015 | Missing inclusions | PASS | Keyboard-opened accordion showed Details not configured. |
| SDR-T016 | Configured exclusions | PARTIAL | Source maps existing exclusions; dedicated visual case pending. |
| SDR-T017 | Preparation guidance | PARTIAL | Source maps preparation and safety notes; dedicated visual case pending. |
| SDR-T018 | No warranty configured | PASS | Browser screenshot shows unconfigured warranty. |
| SDR-T019 | Configured service coverage | PASS | Ikoyi sourced from service config, selected in browser. |
| SDR-T020 | Unsupported location | PASS | SDR-T022 rejects unconfigured zone. |
| SDR-T021 | Active location | PASS | SDR-T022 and browser use the configured area. |
| SDR-T022 | No qualified technician | PASS | SDR-T022 exercises a technician unavailable for booking. |
| SDR-T023 | Qualified technician with no slots | PASS | SDR-T022 mismatched duration; browser installation service shows empty slots. |
| SDR-T024 | Valid available slots | PASS | SDR-T022 and browser real selected dates. |
| SDR-T025 | Stale slot | PASS | SDR-T025 rejects stale selection; competing browser booking retains draft. |
| SDR-T026 | Concurrent slot booking | PASS | PostgreSQL concurrency and focused conflict checks. |
| SDR-T027 | Selected area changes | PARTIAL | Initial area selection and backend area denial exercised; switching between multiple eligible areas pending. |
| SDR-T028 | Saved address | NOT_TESTED | Source restores scoped available addresses; redesigned end-to-end saved address case pending. |
| SDR-T029 | Recipient phone | PARTIAL | Valid Nigerian mobile submitted in browser; client validation uses shared rules, native acceptance pending. |
| SDR-T030 | Guest authentication return | PASS | Browser sign-in link and SDR-T030 allowlist verified. |
| SDR-T031 | Signed-in booking | PASS | Browser confirmed booking and read one committed record. |
| SDR-T032 | Idempotent repeat submission | PASS | EO-01 and independent PostgreSQL concurrency. |
| SDR-T033 | Authoritative quotation | PASS | Focused pricing, quotation and lifecycle suites. |
| SDR-T034 | Changed price before confirmation | PASS | SDR-T025 and stale service version rejection. |
| SDR-T035 | Quote-required work | PASS | Existing quotation and authorised work suite. |
| SDR-T036 | Latest quote revision | PASS | Focused quotation revision regression. |
| SDR-T037 | Unverified payment is not treated as paid | PASS | Focused booking recovery and payment assertions. |
| SDR-T038 | Independent financial approval | PASS | Focused wallet and refund approval regression. |
| SDR-T039 | Reschedule cutoff | PASS | Existing service rescheduling and governed cutoff regression. |
| SDR-T040 | Cancellation cutoff | PASS | Existing service cancellation and cutoff regression. |
| SDR-T041 | Terminal states | PASS | Existing service lifecycle regression. |
| SDR-T042 | Customer acknowledgement | PASS | Focused report and customer acknowledgement. |
| SDR-T043 | Technician qualification | PASS | SDR-T022 and focused stale qualification rejection. |
| SDR-T044 | Photo and evidence continuity | PASS | Existing private evidence and technician reports regression. |
| SDR-T045 | Bundles | PARTIAL | Existing combined transaction tests pass; redesigned staging UI checks are pending. |
| SDR-T046 | Staged appointments | PARTIAL | Existing mixed checkout regression passed; redesign staging UI check pending. |
| SDR-T047 | Customer follow-ups | PARTIAL | Existing follow-up regression passed; redesigned link UI check pending. |
| SDR-T048 | Responsive web | PASS | No horizontal overflow at 320, 375, 390, 430, 768, 1024 and 1440 px after responsive layout settles. |
| SDR-T049 | iOS Back and VoiceOver | NOT_TESTED | Simulator binary built and launched; authenticated interaction and VoiceOver pending. |
| SDR-T050 | Android Back and TalkBack | NOT_TESTED | Android bundle exported; emulator/device acceptance pending. |
| SDR-T051 | Light, dark and system themes | PARTIAL | Browser light and system dark observed. Native and explicit mode switch tests pending. |
| SDR-T052 | Offline, stale and retry | PASS | Browser offline disables confirm; reconnect and stale slot recovery exercised. |
| SDR-T053 | Permission and branch isolation | PASS | SDR-T022 and existing service ownership and branch tests. |
| SDR-T054 | Payment, inventory, wallet, orders and POS regression | PASS | Full PostgreSQL-enabled suite passed. |
| SDR-T055 | Long descriptions and responsive wrapping | PARTIAL | Responsive tests used configured short descriptions; stress fixture pending. |
| SDR-T056 | Keyboard and reduced motion | PARTIAL | Keyboard accordion passed. Full keyboard journey and assistive motion checks pending. |
| SDR-T057 | Browser refresh and Lagos timezone | PASS | Browser refresh, slot selection and SDR-T025 Lagos day boundary. |
| SDR-T058 | Unavailable contact pathway | PASS | Contact link resolves to existing contact route in empty state. |
| SDR-T059 | Session expiration and route error boundaries | PARTIAL | Existing auth regression passed; interactive detail expiry and error boundary pending. |

## Gates

| ID | Gate | Status | Evidence or gap |
| --- | --- | --- | --- |
| SDR-G01 | Baseline audit | VERIFIED_COMPLETE | Source, screenshots, existing contracts and prior full regression recorded. |
| SDR-G02 | Existing routes | VERIFIED_COMPLETE | Catalogue return, direct detail and My Bookings browser flow. |
| SDR-G03 | Existing sidebar | VERIFIED_COMPLETE | Authenticated browser captures retain customer shell and sidebar. |
| SDR-G04 | Authoritative service data | VERIFIED_COMPLETE | Browser fixture uses stored details and slot API response. |
| SDR-G05 | Configured prices only | VERIFIED_COMPLETE | Shared formatting assertions and verified backend input. |
| SDR-G06 | Unavailable prices | VERIFIED_COMPLETE | SDR-T005 distinguishes missing fixed price and quotation basis. |
| SDR-G07 | Configured inclusions only | VERIFIED_COMPLETE | SDR-T005 and keyboard accordion empty state. |
| SDR-G08 | Qualified availability | VERIFIED_COMPLETE | SDR-T022 and existing independent qualification tests. |
| SDR-G09 | No false booking CTA | VERIFIED_COMPLETE | Chromium unavailable and preselection states verified. |
| SDR-G10 | Server revalidation | VERIFIED_COMPLETE | Competing booking and stale review exercised in Chromium and backend. |
| SDR-G11 | Idempotent booking | VERIFIED_COMPLETE | EO-01 and PostgreSQL concurrency. |
| SDR-G12 | Quotation integrity | VERIFIED_COMPLETE | Existing quote revisions and authorisation regressions. |
| SDR-G13 | Payment verification | VERIFIED_COMPLETE | Full payment and booking verification regression. |
| SDR-G14 | Safety and qualification | VERIFIED_COMPLETE | Existing assignment, photo, report and acknowledgement regression. |
| SDR-G15 | Cancellation and reschedule | VERIFIED_COMPLETE | Existing server conflict, cutoff and recovery tests. |
| SDR-G16 | Bundles and follow-ups | PARTIAL | Existing tests passed; redesigned staging and follow-up UI acceptance pending. |
| SDR-G17 | Desktop design | VERIFIED_COMPLETE | Desktop capture and responsive Chromium checks. |
| SDR-G18 | Mobile web design | VERIFIED_COMPLETE | Seven viewport checks and 390 px dark booking flow. |
| SDR-G19 | iOS native | PARTIAL | Fresh iPhone 17 Pro Simulator build installed and launched. Authenticated detail interaction remains pending. |
| SDR-G20 | Android native | PARTIAL | Android JavaScript bundle passes. Installed application and TalkBack remain pending. |
| SDR-G21 | Light, dark and system | PARTIAL | Chromium light and system dark passed. Native mode acceptance pending. |
| SDR-G22 | Accessibility | PARTIAL | Keyboard accordion and native accessibility properties. Screen-reader and full flow testing pending. |
| SDR-G23 | Role and branch scope | VERIFIED_COMPLETE | Public field projection, customer ownership and branch regressions. |
| SDR-G24 | Regression and RTM | VERIFIED_COMPLETE | 684 full regression, 30 focused and matrix validation. |
| SDR-G25 | Rollback and release | PARTIAL | Source rollback is documented; production stays NO-GO. No hosted rehearsal performed. |

All 12 requirements, 59 scenarios and 25 gates remain in scope. 6 requirements and 19 gates have complete local verification within their defined scope.
