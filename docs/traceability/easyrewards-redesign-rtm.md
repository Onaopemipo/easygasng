# EasyRewards redesign traceability

Baseline `54b1b15`. Production decision **NO-GO**.

- 30 requirements · 12 PARTIAL, 18 VERIFIED_COMPLETE
- 65 scenarios · 10 PARTIAL, 55 PASS
- 30 gates · 1 BLOCKED, 8 PARTIAL, 21 PASS

The [machine-readable matrix](easyrewards-redesign-rtm.json) includes source files, records, controls and executed evidence. See [test results](../easyrewards-redesign/04-test-results.md) and [rollback](../easyrewards-redesign/05-rollback-and-release.md).

| ID | Requirement | Acceptance | Status | Outstanding work |
| --- | --- | --- | --- | --- |
| ER-001 | Show actual available points and pending awards | G05 | VERIFIED_COMPLETE | None for this requirement. |
| ER-002 | Show approved policy and effective programme flags | G08 | VERIFIED_COMPLETE | None for this requirement. |
| ER-003 | Show eligible offers and retain checkout handoff | G12 | PARTIAL | Complete the native offer checkout. The web offer applied the approved discount and posted one deduction. |
| ER-004 | Use governed referral code, sharing and attribution | G11 | PARTIAL | Verify enabled referral sheet and repeated taps on native. The web sheet and repeated click passed. |
| ER-005 | Present signed and limited points history and owned references | G13 | PARTIAL | Exercise booking navigation from a rendered row and native order navigation. Web order navigation passed. |
| ER-006 | Provide factual programme and support help | G23 | VERIFIED_COMPLETE | None for this requirement. |
| ER-007 | Deliver native EasyRewards parity | G19 | PARTIAL | Complete platform accessibility, enabled actions and offline/reconnect acceptance. |
| ER-008 | Reuse appearance settings and theme tokens | G21 | PARTIAL | Complete the full native appearance preference and contrast matrix. Explicit iOS dark and Android dark rendered correctly. |
| ER-009 | Keep the customer shell and canonical navigation | G25 | PARTIAL | Complete booking navigation and individual header interaction checks. Web order navigation passed. |
| ER-010 | Keep server authoritative over points, roles and branch | G16 | VERIFIED_COMPLETE | None for this requirement. |
| ER-011 | Maintain compact desktop hierarchy | G17 | VERIFIED_COMPLETE | None for this requirement. |
| ER-012 | Keep mobile web layout within the viewport | G18 | VERIFIED_COMPLETE | None for this requirement. |
| ER-013 | Keep keyboard, touch and assistive-technology semantics | G22 | PARTIAL | Verify VoiceOver and TalkBack. Larger text passed on both simulators. |
| ER-014 | Distinguish unavailable, empty, zero and loading | G07 | VERIFIED_COMPLETE | None for this requirement. |
| ER-015 | Preserve point and purchase-credit separation | G15 | VERIFIED_COMPLETE | None for this requirement. |
| ER-016 | Block spending on restricted balances | G10 | VERIFIED_COMPLETE | None for this requirement. |
| ER-017 | Keep maximum reward discount and delivery exclusion | G26 | VERIFIED_COMPLETE | None for this requirement. |
| ER-018 | Enforce verified purchase and service earning | G09 | VERIFIED_COMPLETE | None for this requirement. |
| ER-019 | Keep approved Smart Refill offers, consent and budget | G12 | VERIFIED_COMPLETE | None for this requirement. |
| ER-020 | Recover after web offline or server failure | G24 | PARTIAL | Verify native offline/reconnect on installed builds. |
| ER-021 | Avoid duplicate submission effects | G13 | PARTIAL | Exercise repeated taps in rendered native referral UI. Web repeated clicks and server deduplication passed. |
| ER-022 | Preserve exact refunds, reversals and cancellation restoration | G14 | VERIFIED_COMPLETE | None for this requirement. |
| ER-023 | Preserve immutable historical and audit evidence | G13 | VERIFIED_COMPLETE | None for this requirement. |
| ER-024 | Preserve Paystack and checkout safeguards | G26 | VERIFIED_COMPLETE | None for this requirement. |
| ER-025 | Preserve booking, stock and cylinder custody | G27 | VERIFIED_COMPLETE | None for this requirement. |
| ER-026 | Verify iOS Simulator and iOS accessibility | G19 | PARTIAL | Verify VoiceOver. Installed sign-in, entry, empty history, dark appearance and larger text passed. |
| ER-027 | Verify Android emulator and Android accessibility | G20 | PARTIAL | Verify TalkBack and resolve the inherited AndroidX WorkManager crash in the minified APK. The unminified local build passed navigation, dark appearance and larger text. |
| ER-028 | Audit repository and baseline before changes | G01 | VERIFIED_COMPLETE | None for this requirement. |
| ER-029 | Record executed tests and evidence | G28 | PARTIAL | Complete device accessibility, browser enabled actions and cross-device error journeys. |
| ER-030 | Record rollback and release decision | G30 | VERIFIED_COMPLETE | None for this requirement. |

## Test scenarios

| ID | Scenario | Result | Evidence or outstanding work |
| --- | --- | --- | --- |
| T01 | web route | PASS | [browser](../easyrewards-redesign/evidence/browser.txt) |
| T02 | direct refresh | PASS | [browser](../easyrewards-redesign/evidence/browser.txt) |
| T03 | existing sidebar | PASS | [browser](../easyrewards-redesign/evidence/browser.txt) |
| T04 | header/cart/search/location | PARTIAL | Customer shell rendered. Header controls were not individually exercised. [native-types](../easyrewards-redesign/evidence/native-types.txt), [native-export](../easyrewards-redesign/evidence/native-export.txt) |
| T05 | Light/Dark/System | PARTIAL | System dark on reload and initial light passed on web. Native theme interaction pending. [ios-dark](../easyrewards-redesign/evidence/ios-dark.txt), [android-large](../easyrewards-redesign/evidence/android-large.txt) |
| T06 | native entry | PASS | Passed signed-in entry on iPhone 17 Pro and unminified Pixel 8. [ios](../easyrewards-redesign/evidence/ios.txt), [android](../easyrewards-redesign/evidence/android.txt) |
| T07 | native navigation | PASS | Passed account entry on both platforms and Android hardware back. [ios](../easyrewards-redesign/evidence/ios.txt), [android](../easyrewards-redesign/evidence/android.txt) |
| T08 | real zero points | PASS | [browser](../easyrewards-redesign/evidence/browser.txt) |
| T09 | nonzero balance | PASS | [browser](../easyrewards-redesign/evidence/browser.txt) |
| T10 | missing balance | PASS | [focused](../easyrewards-redesign/evidence/focused.txt) |
| T11 | pending award count | PASS | [focused](../easyrewards-redesign/evidence/focused.txt) |
| T12 | pending not available | PASS | [focused](../easyrewards-redesign/evidence/focused.txt) |
| T13 | programme disabled | PASS | [browser](../easyrewards-redesign/evidence/browser.txt) |
| T14 | earning enabled with policy | PASS | [baseline](../easyrewards-redesign/evidence/baseline.txt) |
| T15 | redemption disabled | PASS | [browser](../easyrewards-redesign/evidence/browser.txt) |
| T16 | redemption enabled with policy+flag | PASS | [baseline](../easyrewards-redesign/evidence/baseline.txt) |
| T17 | referral disabled | PASS | [browser](../easyrewards-redesign/evidence/browser.txt) |
| T18 | referral enabled | PARTIAL | Backend policy and enabled web sheet passed. Native enabled sheet remains open. [focused](../easyrewards-redesign/evidence/focused.txt), [browser-enabled](../easyrewards-redesign/evidence/browser-enabled.txt) |
| T19 | no policy approved | PASS | [browser](../easyrewards-redesign/evidence/browser.txt) |
| T20 | approved policy version | PASS | [baseline](../easyrewards-redesign/evidence/baseline.txt) |
| T21 | no expiry/tier fabrication | PASS | [browser](../easyrewards-redesign/evidence/browser.txt) |
| T22 | real redemption minimum | PASS | [baseline](../easyrewards-redesign/evidence/baseline.txt) |
| T23 | max discount | PASS | [baseline](../easyrewards-redesign/evidence/baseline.txt) |
| T24 | delivery excluded | PASS | [baseline](../easyrewards-redesign/evidence/baseline.txt) |
| T25 | restricted balance | PASS | [baseline](../easyrewards-redesign/evidence/baseline.txt) |
| T26 | finance review | PASS | [baseline](../easyrewards-redesign/evidence/baseline.txt) |
| T27 | no offers | PASS | [browser](../easyrewards-redesign/evidence/browser.txt) |
| T28 | eligible offer | PARTIAL | Eligible web offer, checkout and ledger readback passed. Native checkout remains open. [baseline](../easyrewards-redesign/evidence/baseline.txt), [browser-enabled](../easyrewards-redesign/evidence/browser-enabled.txt) |
| T29 | expired offer hidden | PASS | [baseline](../easyrewards-redesign/evidence/baseline.txt) |
| T30 | budget exhausted | PASS | [baseline](../easyrewards-redesign/evidence/baseline.txt) |
| T31 | per-customer offer limit | PASS | [baseline](../easyrewards-redesign/evidence/baseline.txt) |
| T32 | referral code generation | PARTIAL | Web code generation and policy tests passed. Native enabled flow remains open. [baseline](../easyrewards-redesign/evidence/baseline.txt), [browser-enabled](../easyrewards-redesign/evidence/browser-enabled.txt) |
| T33 | HTTPS link requirement | PASS | [baseline](../easyrewards-redesign/evidence/baseline.txt) |
| T34 | self-referral denied | PASS | [baseline](../easyrewards-redesign/evidence/baseline.txt) |
| T35 | first verified fulfilment | PASS | [baseline](../easyrewards-redesign/evidence/baseline.txt) |
| T36 | repeat purchase no duplicate bonus | PASS | [baseline](../easyrewards-redesign/evidence/baseline.txt) |
| T37 | cross-branch referral | PASS | [baseline](../easyrewards-redesign/evidence/baseline.txt) |
| T38 | refund reversal | PASS | [baseline](../easyrewards-redesign/evidence/baseline.txt) |
| T39 | cancellation restoration | PASS | [baseline](../easyrewards-redesign/evidence/baseline.txt) |
| T40 | partial refund existing rules | PASS | [baseline](../easyrewards-redesign/evidence/baseline.txt) |
| T41 | idempotent ledger posting | PASS | [baseline](../easyrewards-redesign/evidence/baseline.txt) |
| T42 | history empty | PASS | [browser](../easyrewards-redesign/evidence/browser.txt) |
| T43 | signed history entries | PASS | [browser](../easyrewards-redesign/evidence/browser.txt) |
| T44 | order detail links | PARTIAL | Rendered web order link and owned reference passed. Native order navigation remains open. [focused](../easyrewards-redesign/evidence/focused.txt), [browser-enabled](../easyrewards-redesign/evidence/browser-enabled.txt) |
| T45 | booking detail links | PARTIAL | Service earn and reversal tested. Rendered booking navigation not exercised. [baseline](../easyrewards-redesign/evidence/baseline.txt) |
| T46 | history truncation | PASS | [browser](../easyrewards-redesign/evidence/browser.txt), [focused](../easyrewards-redesign/evidence/focused.txt) |
| T47 | cross-user API denial | PASS | [focused](../easyrewards-redesign/evidence/focused.txt), [baseline](../easyrewards-redesign/evidence/baseline.txt) |
| T48 | role revocation | PASS | [focused](../easyrewards-redesign/evidence/focused.txt), [baseline](../easyrewards-redesign/evidence/baseline.txt) |
| T49 | expired session | PASS | [browser](../easyrewards-redesign/evidence/browser.txt), [focused](../easyrewards-redesign/evidence/focused.txt) |
| T50 | offline/stale | PASS | [browser](../easyrewards-redesign/evidence/browser.txt) |
| T51 | network failure | PASS | [browser](../easyrewards-redesign/evidence/browser.txt) |
| T52 | duplicate tap | PARTIAL | Web repeated click passed. Native repeated tap remains open. [browser-enabled](../easyrewards-redesign/evidence/browser-enabled.txt) |
| T53 | 320/390px mobile web | PASS | [browser](../easyrewards-redesign/evidence/browser.txt) |
| T54 | tablet 768px | PASS | [browser](../easyrewards-redesign/evidence/browser.txt) |
| T55 | desktop 1440px | PASS | [browser](../easyrewards-redesign/evidence/browser.txt) |
| T56 | iOS safe area/VoiceOver | PARTIAL | Installed iOS screenshot and core workflow passed. VoiceOver remains open. [ios](../easyrewards-redesign/evidence/ios.txt) |
| T57 | Android back/TalkBack | PARTIAL | Android hardware back passed on the unminified build. TalkBack and standard release remain open. [android](../easyrewards-redesign/evidence/android.txt), [android-minified-launch](../easyrewards-redesign/evidence/android-minified-launch.txt) |
| T58 | keyboard and focus | PASS | Keyboard disclosure, enabled referral dialog, Escape and focus restoration passed. [browser](../easyrewards-redesign/evidence/browser.txt), [browser-enabled](../easyrewards-redesign/evidence/browser-enabled.txt) |
| T59 | large text | PASS | Larger text passed on iPhone 17 Pro and Pixel 8. [ios-large](../easyrewards-redesign/evidence/ios-large.txt), [android-large](../easyrewards-redesign/evidence/android-large.txt) |
| T60 | wallet separation | PASS | [browser](../easyrewards-redesign/evidence/browser.txt), [baseline](../easyrewards-redesign/evidence/baseline.txt) |
| T61 | Paystack/checkout regression | PASS | [cross-feature-regression](../easyrewards-redesign/evidence/cross-feature-regression.txt), [browser-enabled](../easyrewards-redesign/evidence/browser-enabled.txt) |
| T62 | service booking regression | PASS | [baseline](../easyrewards-redesign/evidence/baseline.txt), [cross-feature-regression](../easyrewards-redesign/evidence/cross-feature-regression.txt) |
| T63 | inventory/cylinder custody regression | PASS | [cross-feature-regression](../easyrewards-redesign/evidence/cross-feature-regression.txt) |
| T64 | reward policy independent approval | PASS | [baseline](../easyrewards-redesign/evidence/baseline.txt) |
| T65 | traceability and rollback evidence | PASS | [05-rollback-and-release](../easyrewards-redesign/05-rollback-and-release.md) |

## Acceptance gates

| ID | Gate | Status | Linked requirements |
| --- | --- | --- | --- |
| G01 | repository audit | PASS | ER-028 |
| G02 | baseline evidence | PASS | ER-028 |
| G03 | route preserved | PASS | ER-009 |
| G04 | sidebar preserved | PASS | ER-009 |
| G05 | backend balance | PASS | ER-001 |
| G06 | pending distinct | PASS | ER-001 |
| G07 | no fake points | PASS | ER-014 |
| G08 | policy approval preserved | PASS | ER-002 |
| G09 | earning flags | PASS | ER-002, ER-018 |
| G10 | redemption flags | PASS | ER-016, ER-017 |
| G11 | referral flags | PARTIAL | ER-004 |
| G12 | offers eligibility | PARTIAL | ER-003, ER-019 |
| G13 | immutable ledger | PASS | ER-021, ER-023 |
| G14 | refund reversal | PASS | ER-022 |
| G15 | no wallet conflation | PASS | ER-015 |
| G16 | user/branch security | PASS | ER-010 |
| G17 | desktop compact design | PASS | ER-011 |
| G18 | mobile web | PASS | ER-012 |
| G19 | native iOS | PARTIAL | ER-026 |
| G20 | native Android | BLOCKED | ER-027 |
| G21 | Light/Dark/System | PARTIAL | ER-008 |
| G22 | accessible UI | PARTIAL | ER-013 |
| G23 | loading/empty/unavailable | PASS | ER-006, ER-014 |
| G24 | offline/retry | PARTIAL | ER-020 |
| G25 | navigation continuity | PARTIAL | ER-009 |
| G26 | payment/checkout regression | PASS | ER-017, ER-024 |
| G27 | stock/fulfilment regression | PASS | ER-025 |
| G28 | executed test evidence | PARTIAL | ER-029 |
| G29 | RTM/rollback | PASS | ER-030 |
| G30 | explicit GO/NO-GO | PASS | ER-030 |
