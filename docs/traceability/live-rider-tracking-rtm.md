# Live rider tracking traceability

Production NO-GO. Scope covers Steps 3–6. See the [audit](../live-rider-tracking/00-audit-and-gap-map.md), [test results](../live-rider-tracking/06-test-results.md) and [machine-readable matrix](live-rider-tracking-rtm.json).

## Requirements

| ID | Requirement | Gate | Status | Outstanding |
| --- | --- | --- | --- | --- |
| LRT-001 | Audit repository, baseline, providers and scope | LRT-G01 | PARTIAL | Verify installed native SDK and cloud-side configuration. |
| LRT-002 | Consented capture lifecycle and withdrawal | LRT-G02 | PARTIAL | Physical permission/lifecycle, and independent server capture lease. |
| LRT-003 | GPS input integrity, timestamp and replay | LRT-G03 | PARTIAL | Establish server-issued capture lease and field acceptance. |
| LRT-004 | Encrypted offline recovery | LRT-G04 | PARTIAL | Signed real-device loss, storage failure, replay and permission tests. |
| LRT-005 | Scoped fleet read and per-user denial | LRT-G05 | VERIFIED_COMPLETE | No outstanding scope for this read contract. |
| LRT-006 | Owned eligible customer projection | LRT-G06 | VERIFIED_COMPLETE | Separate lifecycle UI and fleet/device gates apply. |
| LRT-007 | Remove locations on scope loss and refresh failure | LRT-G08 | PARTIAL | Browser reconnect and native account-switch test. |
| LRT-008 | Dispatcher web map and accessible fallback | LRT-G09 | PARTIAL | Verify with approved key/map ID, quota and assistive interaction. |
| LRT-009 | Native SDK maps and role-specific tracking | LRT-G13 | PARTIAL | Verify signed iOS and Android binaries, SDK key restrictions and OS behavior. |
| LRT-010 | Customer web map and observation freshness | LRT-G10 | PARTIAL | Verify Google rendering and provider failure. |
| LRT-011 | Preserve OSRM governance and no fabricated ETA | LRT-G15 | VERIFIED_COMPLETE | Provider acceptance remains separately governed. |
| LRT-012 | Privacy, retention and rollback | LRT-G19 | PARTIAL | Independent privacy review, hosted rollback and volume acceptance. |
| LRT-013 | Production rollout and signed device acceptance | LRT-G24 | BLOCKED | Provider, signed device, accessibility, load and rollout evidence. |
| LRT-014 | Requirements traceability and regression evidence | LRT-G22 | PARTIAL | Provider, native and operational evidence remain open. |

## Scenarios

| ID | Scenario | Result | Evidence or gap |
| --- | --- | --- | --- |
| LRT-T001 | Consent and active trip record a valid GPS observation | PASS | LRT-T008 records committed GPS through trip.sync. |
| LRT-T002 | Unassigned or foreign driver cannot upload or view another trip | PARTIAL | Existing trip ownership coverage ran. Active delivery binding for the write path remains open. |
| LRT-T003 | Ended or withdrawn trip, logout and account switch stop capture | PARTIAL | Withdrawal and backend rejection passed. Signed native lifecycle remains open. |
| LRT-T004 | Forged, stale, inaccurate, impossible or invalid fixes rejected or quarantined | PARTIAL | LRT-T008 rejects implausible movement; LRT-T012 denies stale and invalid publication. Server capture lease remains open. |
| LRT-T005 | Encrypted offline replay persists once; delayed records remain historical | PARTIAL | GPS-OFF automated replay and freshness passed. Actual airplane-mode and terminated app still need device checks. |
| LRT-T006 | Operation key and sequence suppress duplicate writes | PASS | LRT-T008 and GPS-OFF tests count committed records. |
| LRT-T007 | Fleet visibility enforces branch and owner per-user denial | PASS | LRT-T007. |
| LRT-T008 | Only the owned eligible order returns its assigned rider location | PASS | LRT-T008. |
| LRT-T009 | Assignment, cancellation, completion, consent and revocation clear sharing | PARTIAL | LRT-T008 verifies withdrawal and revoked session. Remaining location-specific transitions need browser and device checks. |
| LRT-T010 | Snapshots and reconnect clear invalid locations | PARTIAL | LRT-T010 proves snapshot reconciliation and LRT-T008 covers SSE. Full reconnect and account-switch UI acceptance remain open. |
| LRT-T011 | Real marker, timestamp and accuracy; no marker without GPS | PARTIAL | Authoritative data and absent coordinates checked by API tests. Provider rendering remains blocked. |
| LRT-T012 | Observation age and delayed and offline labels | PARTIAL | LRT-T012 checks freshness; connected browser/native copy acceptance remains open. |
| LRT-T013 | Missing key, provider outage, quota and offline fallbacks | PARTIAL | Chromium confirmed no-key fallback. Provider errors and quota scenarios remain unverified. |
| LRT-T014 | Foreground, background, termination, reboot and revoked permission | BLOCKED | Requires signed physical-device acceptance. |
| LRT-T015 | Signed iOS and Android builds on real devices | BLOCKED | JS exports passed. Restricted SDK keys and signed device evidence unavailable. |
| LRT-T016 | Existing status and notification snapshot behavior | PASS | Existing tracking and notification regression scenarios executed. |
| LRT-T017 | Missing routing configuration and no fabricated ETA or fee | PASS | ROUTE tests and TRK-23 exercise governed absence. |
| LRT-T018 | Routing approvals and stale context safeguards | PASS | Existing ROUTE tests exercised unchanged estimator. |
| LRT-T019 | Dispatch capacity, inventory and cylinder custody regression | PASS | Existing regression suites exercised these flows. |
| LRT-T020 | Payments, wallet, POS, refunds and finance regression | PASS | Existing regression suites exercised these flows. |
| LRT-T021 | Privacy, retention and location access acceptance | PARTIAL | Access and revocation were tested. Operational privacy and retention acceptance remain open. |
| LRT-T022 | Responsive layouts, themes, keyboard and screen reader | PARTIAL | Chromium passed customer tracking at all six requested widths. Provider-connected themes and assistive testing remain open. |
| LRT-T023 | Realistic fleet and concurrent subscriber load | NOT_TESTED | SQL is batched and rendering is capped. No representative load was measured. |
| LRT-T024 | Real network loss, reconnect and GPS disabled or high latency | BLOCKED | Requires physical devices and a configured test provider. |
| LRT-T025 | Customer unavailable state has no fabricated route, marker or ETA | PASS | TRK-23 and LRT-T008 verify API semantics. |
| LRT-T026 | Production NO-GO retained | PASS | Default flags remain off, and no release or provider activation was performed. |

## Gates

| ID | Gate | Status | Evidence or gap |
| --- | --- | --- | --- |
| LRT-G01 | Baseline audit | PARTIAL | Repository, configuration and prior regression inspected; external provider restrictions are unverified. |
| LRT-G02 | Consent and lifecycle | PARTIAL | Server withdrawal is tested; device lifecycle acceptance remains open. |
| LRT-G03 | GPS integrity | PARTIAL | Validated input, replay, implausible jumps and publication tested; independent server lease remains open. |
| LRT-G04 | Offline queue | PARTIAL | Automated encrypted replay evidence; physical reconnect acceptance pending. |
| LRT-G05 | Backend branch and role scope | VERIFIED_COMPLETE | LRT-T007 passes. |
| LRT-G06 | Customer order ownership | VERIFIED_COMPLETE | LRT-T008 passes. |
| LRT-G07 | Assignment changes | PARTIAL | Publication tests cover consent and session loss; assignment-specific browser and device acceptance remains open. |
| LRT-G08 | Stream and session revalidation | PARTIAL | Server and reconciliation tested; live reconnect UI acceptance remains open. |
| LRT-G09 | Dispatcher map | PARTIAL | Source and fallbacks exist; configured provider check pending. |
| LRT-G10 | Customer map | PARTIAL | Source and sharing contract exist; configured provider check pending. |
| LRT-G11 | Truthful stale and offline states | PARTIAL | Freshness tested; device loss and offline rendering pending. |
| LRT-G12 | Web key restrictions | BLOCKED | Hosted referrer restriction, API activation and quota not verified. |
| LRT-G13 | iOS native map and permissions | BLOCKED | Signed device and restricted key configuration unavailable. |
| LRT-G14 | Android native map and permissions | BLOCKED | Signed device and restricted key configuration unavailable. |
| LRT-G15 | Routing governance | VERIFIED_COMPLETE | Existing governed OSRM tests passed. |
| LRT-G16 | No fabricated ETA | VERIFIED_COMPLETE | TRK-23 and LRT-T008 passed. |
| LRT-G17 | Financial regression | VERIFIED_COMPLETE | Existing financial suites passed with disposable PostgreSQL. |
| LRT-G18 | Custody and dispatch regression | VERIFIED_COMPLETE | Existing custody and dispatch suites passed with disposable PostgreSQL. |
| LRT-G19 | Privacy and retention | PARTIAL | Access, audit and consent covered; external processing and retention review pending. |
| LRT-G20 | Accessibility | PARTIAL | Tracking panel fits all six requested widths. Keyboard and screen-reader acceptance remains open. |
| LRT-G21 | Realistic load | NOT_TESTED | Synthetic performance load pending. |
| LRT-G22 | Traceability | VERIFIED_COMPLETE | Repository RTM validation executed. |
| LRT-G23 | Rollback | PARTIAL | Default-off path tested; hosted rollback rehearsal pending. |
| LRT-G24 | Production release | BLOCKED | Platform NO-GO remains in effect. |

All 14 requirements, 26 scenarios and 24 gates stay in the denominator. Three requirements have complete verification for their defined contracts. All other requirements retain follow-up or release blockers.
