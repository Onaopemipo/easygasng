# Smart Refill redesign traceability

Baseline `54b1b15`. Production remains **NO-GO**.

- 30 requirements · 1 BLOCKED, 9 PARTIAL, 20 VERIFIED_COMPLETE
- 70 scenarios · 7 PARTIAL, 63 PASS
- 30 gates · 1 BLOCKED, 9 PARTIAL, 20 PASS

[Source, API and evidence mapping](smart-refill-redesign-rtm.json) · [Test results](../smart-refill-redesign/04-test-results.md) · [Rollback](../smart-refill-redesign/05-rollback-and-release.md) · [Demo rollout](../smart-refill-redesign/07-demo-deployment.md)

| Requirement | Scope | Gate | Result | Outstanding work |
| --- | --- | --- | --- | --- |
| SR-001 | Audit the current application and contracts | G01 | VERIFIED_COMPLETE | None for this requirement. |
| SR-002 | Record pre-change targeted baseline | G02 | PARTIAL | Five focused baseline tests ran. A new pre-change build was not repeated. |
| SR-003 | Keep the Smart Refill route and sign-in return | G03 | VERIFIED_COMPLETE | None for this requirement. |
| SR-004 | Keep the separate Cooking Gas Profiles entry | G04 | VERIFIED_COMPLETE | None for this requirement. |
| SR-005 | Keep customer navigation, theme controls and demo banner | G05 | PARTIAL | All header controls were visible. Individual header workflows were not replayed. |
| SR-006 | Show real profile, offer and estimate states | G06 | PARTIAL | An inactive profile was verified at the API. A rendered inactive profile count was not exercised. |
| SR-007 | Enforce customer ownership and role | G07 | VERIFIED_COMPLETE | None for this requirement. |
| SR-008 | Keep duplicate same-size creation protection | G08 | VERIFIED_COMPLETE | None for this requirement. |
| SR-009 | Preserve all profile creation fields | G09 | VERIFIED_COMPLETE | None for this requirement. |
| SR-010 | Use the supported supply enum | G10 | VERIFIED_COMPLETE | None for this requirement. |
| SR-011 | Respect cooldown and stale writes | G11 | VERIFIED_COMPLETE | None for this requirement. |
| SR-012 | Retain audit and reminder acknowledgement | G12 | VERIFIED_COMPLETE | None for this requirement. |
| SR-013 | Keep verified, cylinder-specific forecasts | G13 | VERIFIED_COMPLETE | None for this requirement. |
| SR-014 | Identify self-reporting and estimated levels | G14 | VERIFIED_COMPLETE | None for this requirement. |
| SR-015 | Distinguish unavailable, preliminary and suppressed forecasts | G15 | PARTIAL | The available and preliminary forecast cases were exercised in domain tests. Positive rendered forecast remains open. |
| SR-016 | Respect offer policy, consent, expiry and budget | G16 | PARTIAL | Eligible offer was verified at the domain layer. Native and web offer handoff was not replayed for Smart Refill. |
| SR-017 | Display eligible offers or truthful empty/unavailable state | G17 | VERIFIED_COMPLETE | None for this requirement. |
| SR-018 | Keep profile changes separate from financial and order writes | G18 | VERIFIED_COMPLETE | None for this requirement. |
| SR-019 | Implement compact desktop workspace | G19 | VERIFIED_COMPLETE | None for this requirement. |
| SR-020 | Implement narrow and tablet web layouts | G20 | VERIFIED_COMPLETE | None for this requirement. |
| SR-021 | Run installed iOS acceptance | G21 | PARTIAL | Installed profile creation, supply save and history passed. VoiceOver, large text and native offline still need acceptance. |
| SR-022 | Run installed Android acceptance | G22 | BLOCKED | Unminified local APK passed entry, activity and Back. Standard release launch remains blocked by the existing WorkManager defect. TalkBack is open. |
| SR-023 | Preserve appearance modes | G23 | PARTIAL | Web System dark, iOS dark and Android light were checked. Explicit cross-platform preference switching remains open. |
| SR-024 | Keep form labels, keyboard, touch and screen-reader semantics | G24 | PARTIAL | Keyboard and focus passed on web. Full VoiceOver/TalkBack and text scaling acceptance remain open. |
| SR-025 | Recover after stale data, auth rejection or network failure | G25 | PARTIAL | Web reconnect and stale gating passed. Installed native offline and reconnect remain open. |
| SR-026 | Regress privacy, security and concurrent writes | G26 | VERIFIED_COMPLETE | None for this requirement. |
| SR-027 | Regress rewards, payments, stock and cylinder custody | G27 | VERIFIED_COMPLETE | None for this requirement. |
| SR-028 | Record executed verification and screenshots | G28 | VERIFIED_COMPLETE | None for this requirement. |
| SR-029 | Preserve source rollback and maintain traceability | G29 | VERIFIED_COMPLETE | None for this requirement. |
| SR-030 | Record explicit production decision | G30 | VERIFIED_COMPLETE | None for this requirement. |

## Test scenarios

| ID | Scenario | Status | Evidence and notes |
| --- | --- | --- | --- |
| T01 | `/refill` direct route | PASS | [browser](../smart-refill-redesign/evidence/browser.txt)  |
| T02 | customer sidebar preserved | PASS | [browser](../smart-refill-redesign/evidence/browser.txt)  |
| T03 | active nav | PASS | [browser](../smart-refill-redesign/evidence/browser.txt)  |
| T04 | header controls | PARTIAL | [browser](../smart-refill-redesign/evidence/browser.txt) Header was rendered. Individual controls were not replayed. |
| T05 | theme toggle | PARTIAL | [browser](../smart-refill-redesign/evidence/browser.txt) System dark verified on web. Explicit preference choices were not all replayed. |
| T06 | sandbox banner | PASS | [browser](../smart-refill-redesign/evidence/browser.txt)  |
| T07 | real profile count | PASS | [browser](../smart-refill-redesign/evidence/browser.txt)  |
| T08 | verified zero | PASS | [browser](../smart-refill-redesign/evidence/browser.txt)  |
| T09 | unavailable metric | PASS | [focused](../smart-refill-redesign/evidence/focused.txt)  |
| T10 | active profile filter | PARTIAL | [focused](../smart-refill-redesign/evidence/focused.txt) Inactive mutation was rejected. Rendered active count with an inactive fixture was not exercised. |
| T11 | one profile | PASS | [browser](../smart-refill-redesign/evidence/browser.txt)  |
| T12 | multiple | PASS | [browser](../smart-refill-redesign/evidence/browser.txt)  |
| T13 | no profiles | PASS | [browser](../smart-refill-redesign/evidence/browser.txt)  |
| T14 | valid product label | PASS | [browser](../smart-refill-redesign/evidence/browser.txt)  |
| T15 | duplicate same-size profile 409 | PASS | [browser](../smart-refill-redesign/evidence/browser.txt), [focused](../smart-refill-redesign/evidence/focused.txt), [cross-feature](../smart-refill-redesign/evidence/cross-feature.txt)  |
| T16 | creation required label | PASS | [focused](../smart-refill-redesign/evidence/focused.txt)  |
| T17 | household size bounds | PASS | [focused](../smart-refill-redesign/evidence/focused.txt)  |
| T18 | cooking days bounds | PASS | [focused](../smart-refill-redesign/evidence/focused.txt)  |
| T19 | invalid product | PASS | [focused](../smart-refill-redesign/evidence/focused.txt)  |
| T20 | successful creation | PASS | [browser](../smart-refill-redesign/evidence/browser.txt), [ios](../smart-refill-redesign/evidence/ios.txt)  |
| T21 | creation retry after failure | PASS | [browser](../smart-refill-redesign/evidence/browser.txt)  |
| T22 | cross-user create/read denied | PASS | [focused](../smart-refill-redesign/evidence/focused.txt)  |
| T23 | cross-user feedback denied | PASS | [browser](../smart-refill-redesign/evidence/browser.txt), [focused](../smart-refill-redesign/evidence/focused.txt)  |
| T24 | inactive profile feedback denied | PASS | [focused](../smart-refill-redesign/evidence/focused.txt)  |
| T25 | enum still_available | PASS | [focused](../smart-refill-redesign/evidence/focused.txt)  |
| T26 | enum low | PASS | [browser](../smart-refill-redesign/evidence/browser.txt), [focused](../smart-refill-redesign/evidence/focused.txt)  |
| T27 | enum empty | PASS | [focused](../smart-refill-redesign/evidence/focused.txt)  |
| T28 | enum already_refilled | PASS | [focused](../smart-refill-redesign/evidence/focused.txt)  |
| T29 | enum remind_later | PASS | [focused](../smart-refill-redesign/evidence/focused.txt)  |
| T30 | invalid enum | PASS | [focused](../smart-refill-redesign/evidence/focused.txt)  |
| T31 | 429 cooldown | PASS | [browser](../smart-refill-redesign/evidence/browser.txt), [focused](../smart-refill-redesign/evidence/focused.txt)  |
| T32 | feedback audit | PASS | [focused](../smart-refill-redesign/evidence/focused.txt)  |
| T33 | notification side effects | PASS | [focused](../smart-refill-redesign/evidence/focused.txt)  |
| T34 | no false success offline | PASS | [browser](../smart-refill-redesign/evidence/browser.txt)  |
| T35 | server-confirmed save | PASS | [browser](../smart-refill-redesign/evidence/browser.txt), [focused](../smart-refill-redesign/evidence/focused.txt), [ios](../smart-refill-redesign/evidence/ios.txt)  |
| T36 | duplicate click prevented | PASS | [cross-feature](../smart-refill-redesign/evidence/cross-feature.txt)  |
| T37 | Reset local only | PASS | [browser](../smart-refill-redesign/evidence/browser.txt)  |
| T38 | insufficient verified history | PASS | [browser](../smart-refill-redesign/evidence/browser.txt), [focused](../smart-refill-redesign/evidence/focused.txt), [cross-feature](../smart-refill-redesign/evidence/cross-feature.txt)  |
| T39 | exactly two valid refills | PASS | [focused](../smart-refill-redesign/evidence/focused.txt)  |
| T40 | invalid refill intervals | PASS | [focused](../smart-refill-redesign/evidence/focused.txt) One-day refill interval rejected by the algorithm. |
| T41 | preliminary confidence | PASS | [focused](../smart-refill-redesign/evidence/focused.txt), [cross-feature](../smart-refill-redesign/evidence/cross-feature.txt)  |
| T42 | high confidence only from algorithm | PASS | [focused](../smart-refill-redesign/evidence/focused.txt) High confidence verified with six consistent qualifying refill records. |
| T43 | forecast suppression | PASS | [focused](../smart-refill-redesign/evidence/focused.txt)  |
| T44 | unverified payment excluded | PASS | [focused](../smart-refill-redesign/evidence/focused.txt), [cross-feature](../smart-refill-redesign/evidence/cross-feature.txt)  |
| T45 | cancelled order excluded | PASS | [focused](../smart-refill-redesign/evidence/focused.txt), [cross-feature](../smart-refill-redesign/evidence/cross-feature.txt)  |
| T46 | multiple-cylinder ambiguous history excluded | PASS | [focused](../smart-refill-redesign/evidence/focused.txt), [focused](../smart-refill-redesign/evidence/focused.txt) Verified multi-cylinder order excluded and authoritative date retained. |
| T47 | valid last verified date | PASS | [focused](../smart-refill-redesign/evidence/focused.txt)  |
| T48 | no fabricated sensor reading | PASS | [focused](../smart-refill-redesign/evidence/focused.txt), [cross-feature](../smart-refill-redesign/evidence/cross-feature.txt)  |
| T49 | offers none | PASS | [browser](../smart-refill-redesign/evidence/browser.txt), [focused](../smart-refill-redesign/evidence/focused.txt)  |
| T50 | offers approved and eligible | PARTIAL | [focused](../smart-refill-redesign/evidence/focused.txt) Eligible offer passed at the API. Smart Refill screen-to-checkout handoff remains open. |
| T51 | offers consent gating | PASS | [focused](../smart-refill-redesign/evidence/focused.txt)  |
| T52 | offers disabled policy | PASS | [focused](../smart-refill-redesign/evidence/focused.txt)  |
| T53 | offers budget/expiry | PASS | [focused](../smart-refill-redesign/evidence/focused.txt)  |
| T54 | offers no fabricated CTA | PASS | [browser](../smart-refill-redesign/evidence/browser.txt), [focused](../smart-refill-redesign/evidence/focused.txt)  |
| T55 | real feedback history | PASS | [browser](../smart-refill-redesign/evidence/browser.txt), [focused](../smart-refill-redesign/evidence/focused.txt), [ios](../smart-refill-redesign/evidence/ios.txt), [android](../smart-refill-redesign/evidence/android.txt)  |
| T56 | no fake history link | PASS | [browser](../smart-refill-redesign/evidence/browser.txt), [focused](../smart-refill-redesign/evidence/focused.txt)  |
| T57 | stale refresh timestamp | PASS | [browser](../smart-refill-redesign/evidence/browser.txt)  |
| T58 | network retry | PASS | [browser](../smart-refill-redesign/evidence/browser.txt)  |
| T59 | 401 sign-in | PASS | [browser](../smart-refill-redesign/evidence/browser.txt), [focused](../smart-refill-redesign/evidence/focused.txt)  |
| T60 | 403 role revocation | PASS | [browser](../smart-refill-redesign/evidence/browser.txt), [focused](../smart-refill-redesign/evidence/focused.txt)  |
| T61 | desktop 1440 | PASS | [browser](../smart-refill-redesign/evidence/browser.txt)  |
| T62 | tablet 768/1024 | PASS | [browser](../smart-refill-redesign/evidence/browser.txt)  |
| T63 | mobile web 320/375/390 | PASS | [browser](../smart-refill-redesign/evidence/browser.txt)  |
| T64 | iOS safe area/VoiceOver | PARTIAL | [ios](../smart-refill-redesign/evidence/ios.txt) Installed iOS create, save and history passed. VoiceOver and larger text remain open. |
| T65 | Android back/TalkBack | PARTIAL | [android](../smart-refill-redesign/evidence/android.txt), [android-minified-launch](../smart-refill-redesign/evidence/android-minified-launch.txt) Unminified Pixel 8 entry, activity and Back passed. Standard minified release and TalkBack remain open. |
| T66 | Light/Dark/System | PARTIAL | [browser](../smart-refill-redesign/evidence/browser.txt), [ios](../smart-refill-redesign/evidence/ios.txt), [android](../smart-refill-redesign/evidence/android.txt) Web System dark and native light/dark rendering checked. Full preference switching matrix remains open. |
| T67 | keyboard and modal focus | PASS | [browser](../smart-refill-redesign/evidence/browser.txt)  |
| T68 | recurring orders/refill plans unchanged | PASS | [focused](../smart-refill-redesign/evidence/focused.txt), [cross-feature](../smart-refill-redesign/evidence/cross-feature.txt)  |
| T69 | wallet/rewards/Paystack regression | PASS | [focused](../smart-refill-redesign/evidence/focused.txt), [cross-feature](../smart-refill-redesign/evidence/cross-feature.txt)  |
| T70 | Inventory, cylinder custody and order checkout regression | PASS | [focused](../smart-refill-redesign/evidence/focused.txt), [cross-feature](../smart-refill-redesign/evidence/cross-feature.txt)  |

## Acceptance gates

| ID | Gate | Status | Requirement |
| --- | --- | --- | --- |
| G01 | audit complete | PASS | SR-001 |
| G02 | baseline captured | PARTIAL | SR-002 |
| G03 | existing `/refill` route preserved | PASS | SR-003 |
| G04 | `/consumption` unchanged or intentionally shared without regression | PASS | SR-004 |
| G05 | customer shell preserved | PARTIAL | SR-005 |
| G06 | real profile data | PARTIAL | SR-006 |
| G07 | ownership enforced | PASS | SR-007 |
| G08 | duplicate creation rule | PASS | SR-008 |
| G09 | all create fields preserved | PASS | SR-009 |
| G10 | feedback enum enforced | PASS | SR-010 |
| G11 | one-hour cooldown respected | PASS | SR-011 |
| G12 | feedback audit/notification behavior | PASS | SR-012 |
| G13 | forecasts use verified history | PASS | SR-013 |
| G14 | no sensor claims | PASS | SR-014 |
| G15 | unavailable/low confidence correct | PARTIAL | SR-015 |
| G16 | offers eligibility and consent | PARTIAL | SR-016 |
| G17 | no fake offers | PASS | SR-017 |
| G18 | no automatic order/payment | PASS | SR-018 |
| G19 | compact desktop | PASS | SR-019 |
| G20 | mobile web | PASS | SR-020 |
| G21 | native iOS | PARTIAL | SR-021 |
| G22 | native Android | BLOCKED | SR-022 |
| G23 | light/dark/system | PARTIAL | SR-023 |
| G24 | accessibility | PARTIAL | SR-024 |
| G25 | stale/offline/error states | PARTIAL | SR-025 |
| G26 | security regression | PASS | SR-026 |
| G27 | financial/stock/custody regression | PASS | SR-027 |
| G28 | executed tests and screenshots | PASS | SR-028 |
| G29 | RTM and rollback | PASS | SR-029 |
| G30 | Explicit release decision and preserved production blockers | PASS | SR-030 |
