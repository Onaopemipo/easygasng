# Order tracking requirements traceability

Preflight: **CONDITIONAL_PASS** for local work. Commercial production: **NO-GO**. Full master-prompt certification remains incomplete.

Coverage: **20/31 applicable requirements verified locally**; counts {'BLOCKED': 4, 'NOT_APPLICABLE': 1, 'PARTIAL': 7, 'VERIFIED_COMPLETE': 20}. Only TRK-26 is excluded as genuinely not applicable. Blocked, partial and untested stay in denominators.

| ID | Requirement | Status | Remaining acceptance / scope |
|---|---|---|---|
| TRK-01 | Customer timeline uses real committed history | VERIFIED_COMPLETE | No gap in locally verified timeline scenario. |
| TRK-02 | Order ownership, ID deep links and order-linked support isolation | VERIFIED_COMPLETE | Public share links intentionally absent; scoped ID retrieval never replaces ownership. |
| TRK-03 | Separate status dimensions and validated transitions | VERIFIED_COMPLETE | Native enums preserved; collected cash is not verified payment. |
| TRK-04 | Invalid or stale transitions have zero unintended business effects | VERIFIED_COMPLETE | Independent PostgreSQL verification separately retained in TRK-17. |
| TRK-05 | Cross-branch dispatch fails closed | VERIFIED_COMPLETE | Local actor/branch checks verified; no production certification. |
| TRK-06 | Inactive branch fulfilment fails closed | VERIFIED_COMPLETE | No additional local implementation gap in tested scenario. |
| TRK-07 | Serial, inspection and custody eligibility before fulfilment | VERIFIED_COMPLETE | Executed integrity/shared-gas regressions verify local enforcement; qualified physical LPG acceptance remains a release gate. |
| TRK-08 | Held cylinder/goods reissue requires physical return or authorized custody | VERIFIED_COMPLETE | No automatic restock on cancellation; unsafe physical cases remain restricted. |
| TRK-09 | Failed reassignment and reschedule revalidate capacity | VERIFIED_COMPLETE | Positive/negative local paths tested; multi-connection contention remains TRK-17. |
| TRK-10 | Simultaneous independent assignments cannot overbook | BLOCKED | Run TRK-17 on explicitly enabled disposable local PostgreSQL; Docker daemon/socket absent. |
| TRK-11 | Pickup requires assigned driver, exact manifest, stock and custody | VERIFIED_COMPLETE | Native device acceptance remains separately untested. |
| TRK-12 | Delivery code expires, is bounded against guesses and cannot repeat business effect | VERIFIED_COMPLETE | Code rotates per attempt; successful retries return prior outcome; no supervisor override. |
| TRK-13 | Delivered requires pickup, complete handover, valid code and custody | VERIFIED_COMPLETE | Browser proof negative/positive used synthetic records only; qualified physical acceptance is not claimed. |
| TRK-14 | Failed attempts, rescheduling and exceptions preserve history/next action | VERIFIED_COMPLETE | No additional local gap in tested structured failure/reschedule scenario; qualified unsafe-return and alternate-proof policies remain separate open gates. |
| TRK-15 | Retried public mutations commit one logical business effect | VERIFIED_COMPLETE | Persistent UUID actor/payload/role/branch outcomes tested; no exactly-once external-message claim. PostgreSQL concurrency stays blocked. |
| TRK-16 | Ambiguous commit recovers existing authoritative outcome | VERIFIED_COMPLETE | Outcome recovery simulated by discarding successful response and querying key; actual connection-loss-at-COMMIT drill is not claimed. |
| TRK-17 | Multi-connection PostgreSQL contention and failure injection | BLOCKED | Disposable loopback PostgreSQL target unavailable. Test is explicitly skipped/NOT_TESTED, not substituted with PGlite. |
| TRK-18 | Durable outbox replay and actual worker restart | PARTIAL | Rollback/retry atomicity passes locally. OS-process crash/restart/release-worker exercise remains NOT_TESTED. |
| TRK-19 | Notification failure cannot reverse committed order | VERIFIED_COMPLETE | Separate worker transaction and rollback/retry tested. No external channels activated. |
| TRK-20 | Subscription authentication, branch/assignment isolation and revocation | VERIFIED_COMPLETE | Real dispatcher-backed stream closes after account revocation; production proxy/load acceptance remains open. |
| TRK-21 | Out-of-order snapshots, revoked records and stale state reconcile | VERIFIED_COMPLETE | Complete snapshot reconciliation used; durable delta replay not claimed. |
| TRK-22 | Native offline queue never presents pending proof as delivered | PARTIAL | Encrypted existing queue now retains operation identity/version/handover and compiles. Actual offline/reconnect/account/device lifecycle tests NOT_TESTED. |
| TRK-23 | GPS default off and stop-sharing lifecycle | BLOCKED | GPS/ETA explicitly unavailable with no collector. Lifecycle stop-sharing/activation cannot be certified without connected collector, approved privacy/provider/device gates. |
| TRK-24 | GPS stale/offline, retention and multi-stop privacy | BLOCKED | No GPS positions collected/exposed. Collector, retention policy, routing provider and real-device privacy acceptance remain unimplemented/unapproved. |
| TRK-25 | No fabricated driver position or ETA | VERIFIED_COMPLETE | Only actual delivery window and unavailable GPS/ETA returned; no provider or simulated movement. |
| TRK-26 | Public tracking-token expiry/revocation and enumeration | NOT_APPLICABLE | No public/shareable tracking token feature added. Existing authenticated ownership/ID checks remain covered by TRK-02/20. |
| TRK-27 | Physical returns and custody reconciliation | PARTIAL | Full manifest/eligible condition required and no consumed-stock restoration. Unsafe return/quarantine processing, qualified receipt and complete operational reconciliation still need review/implementation. |
| TRK-28 | Responsive desktop/tablet/mobile, theme and accessibility | PARTIAL | Customer/driver light/dark and 390px checked; one-pixel existing header overflow fixed but not browser-rechecked after permission decline. Admin/tablet/zoom/keyboard/screen-reader/native acceptance NOT_TESTED. |
| TRK-29 | Customer/admin/driver/support views agree on committed state | PARTIAL | Customer and driver arrival/proof synchronization verified in browser; linked support backend ownership tested. Admin/support full UI acceptance not completed after localhost origin permission denial. |
| TRK-30 | Real data, metrics and proof only | VERIFIED_COMPLETE | Metrics explicitly limited to latest 100 permitted orders and actual timestamp pairs; fixture proof is labelled test-only, never production certification. |
| TRK-31 | Rollback, restore and operational fallback exercises | PARTIAL | Encrypted isolated proof/outcome/outbox restore and emergency write stop pass. Actual PostgreSQL restore, operators, RPO/RTO, manual fallback and source rollback rehearsal remain open. |
| TRK-32 | Lint, typecheck, build and affected regression suites | PARTIAL | Executed regression/typecheck/build evidence recorded. No lint script exists; PostgreSQL and actual device tests remain explicitly unexecuted, in denominators. |

| Gate | Status | Evidence / limitation |
|---|---|---|
| OT-G01 | PASS | Preflight recorded; local-only, unborn Git and unrelated changes preserved |
| OT-G02 | PASS | Canonical state contract, immutable versioned history and additive migration tested locally |
| OT-G03 | PASS | Owned snapshots/support, no public-token access; customer browser timeline verified |
| OT-G04 | BLOCKED | Local branch/capacity/stock checks pass; independent PostgreSQL assignment contention NOT_TESTED |
| OT-G05 | NOT_TESTED | Assigned driver web path verified, native compile passes; real device/offline lifecycle acceptance pending |
| OT-G06 | BLOCKED | Normal code/pickup/handover enforced locally; qualified physical safety and alternate-proof governance outstanding |
| OT-G07 | NOT_TESTED | Real authenticated stream revocation and browser updates pass; production proxy/load and durable delta-broker replay not certified |
| OT-G08 | NOT_TESTED | Atomic in-app outbox rollback/retry pass; actual worker process restart/deployed reliability unexecuted |
| OT-G09 | BLOCKED | Persistent outcome/stock/cash retry evidence passes locally; independent PostgreSQL failures/contention pending |
| OT-G10 | NOT_TESTED | Structured failure/help incidents and held-return restrictions implemented; qualified unsafe-return and comprehensive operational reconciliation acceptance pending |
| OT-G11 | BLOCKED | GPS/ETA disabled; no approved provider/privacy/retention/device activation and no connected collector |
| OT-G12 | NOT_TESTED | Customer/driver browser evidence exists; admin-origin access declined, mobile fix/tablet/keyboard/screen-reader acceptance incomplete |
| OT-G13 | BLOCKED | Web/native typecheck/build and affected suites pass; PostgreSQL/device/security/performance release gates and lint unavailable |
| OT-G14 | NOT_TESTED | Encrypted isolated restore/emergency stop pass; real manual fallback/owners/RPO/RTO and release rollback rehearsal unexecuted |

[JSON matrix](order-tracking-rtm.json) maps source, authoritative data, security, tests and evidence. [Implementation report](../reports/easygas-order-tracking-implementation.md). [Blocker/dependency register](../reports/order-tracking-blockers-and-tasks.md).

Change log 2026-11-02: all 32 requirement/test IDs retained; additive schema/persistent outcomes, customer/driver SSE snapshots, dispatch/proof/return controls, held cross-order cylinder protection, structured failure incidents/support, native pending identities and emergency write stop. Existing production NO-GO and unrelated matrices preserved. GPS/alternate proof/unsafe-return policy, PostgreSQL, native-device and remaining browser/operational gates retained as open.
