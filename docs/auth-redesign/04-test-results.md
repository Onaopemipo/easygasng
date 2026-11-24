# Authentication acceptance results

All evidence is local synthetic QA. No real email, payment, production account, provider enablement or live mutation was used.

| Check | Executed result / evidence |
| --- | --- |
| Baseline web/native types | Passed; baseline-*-types.txt |
| Baseline web build | Passed; baseline-web-build.txt |
| Baseline authentication/onboarding/links/password |13 passed, 0 failed/skipped; baseline-tests.txt |
| Existing focused security/visibility regression |16 passed; core-regression.txt |
| New actual-handler/native-presentation/recovery/request/source tests |9 passed, 0 failed/skipped; auth-tests.txt |
| Expanded auth/audit/assisted/source regression |43 passed, 0 failed/skipped; focused-final.txt on final source |
| Traceability validator |2 passed, 0 failed/skipped; traceability.txt |
| Actual browser |10 groups pass, including 21 width/route observations, dark/errors, generic recovery, manual-link rejection, customer intended return, owner routing and both logouts; browser-web.json |
| Web build, sequential post-build web types, native types/dependencies |Outputs in web-build.txt/web-types.txt/native-types.txt/native-dependencies.txt; all passed; 3 native dependency tests passed, 0 failures/skips |
| Full regression with fresh PostgreSQL |release-regression.txt is the final run; 1,284 passed, 0 failed, 0 skipped; 31 formerly skipped PostgreSQL checks executed against the new isolated local fixture |
| Initial iOS/Android preview attempt |Initially blocked by inaccessible windows. See the executed native follow-up below; remaining keyboard/iPad/assistive cases stay open. |
| Physical password-manager/VoiceOver/TalkBack/provider delivery/store build |NOT RUN; not silently marked passed |
| Lint |NOT RUN: no lint script exists in actual package scripts |

## Failures investigated and retained

Initial broad run: 1,277 tests, 1,233 passed, 13 historical-source/matrix failures, 31 PostgreSQL skips. Exact reviewed authentication continuation retains earlier bytes and allows only ten existing frontend files/eight additions. Old phase no-native proofs are still asserted at their original phase base, then this later approved native scope is checked. All 57 source follow-up checks passed. No historical manifest/assertion or requirement ID was removed.

A new renderer case caught password visibility persisting when switching registration mode. The password control now remounts masked on that transition, with a regression assertion. Browser review caught hero contrast/wave overlap and an unstyled link action; corrected. Manual link review caught the existing raw fragment required by assisted activation; output now preserves that contract and temporary-setup metadata. Existing HTTP tests retain the same assisted customer/order.

The first full PostgreSQL run had 1,283 tests: 1,282 passed, 1 failed, 0 skipped. The one failure was an existing source-format assertion requiring the verification resend link text immediately after its opening tag; behavior and destination were unchanged. Original formatting was restored; the existing audit test then passed without weakening its assertions. The fresh broad run passed all 1,284 tests with 0 failures/skips. Final authentication/availability/accessibility refinements were then rechecked with 43 focused tests and 49 historical-source checks, both zero failures/skips; final web build/types and native types also pass. The extra native-bootstrap/session tests are in the current 9-test auth file. This is local executed evidence, not a GitHub CI claim for a new release.

No benchmark screenshots or stale native screenshots are substituted for actual browser evidence. Current signed binaries and deployed demo remain unchanged. Full release remains NO-GO until critical open device/security/assistive gates are resolved.

At the initial source checkpoint, 49/49 historical-source checks passed and native preview remained NOT RUN because windows were inaccessible and no Android emulator was attached. The native follow-up below supersedes that environment status, while retaining the same ten existing frontend transitions/eight additions and unchanged server/auth/schema authority. No deployment or EasyGas binary/export/upload was made.


## Native follow-up after preview handoff

[Actual observations and fixes](06-native-followup.md) include seven iOS groups and ten Android groups. iOS phone core screens/errors/recovery/link rejection/Back, dark/larger text/reduced-motion settings, Android phone core screens/registration Back, and Android tablet core screens/dark/1.6 font scale/recovery success/Back/software-keyboard CTA were observed. Original settings were restored. No new EasyGas binary was built.

The latest source passes **44 focused tests** (`focused-native-followup.txt`), **10 authentication tests** (`auth-tests-followup.txt`), **25 source/traceability preservation tests** (`source-native-followup.txt`) and native type checking (`native-types-followup.txt`), all zero failures/skips. The actual Back-handler test covers repeated auth navigation, checkout return and authenticated order drilldown. The recovery renderer asserts a supported polite live announcement. Suites overlap and are not added into a unique count. The 1,284-test broad run and original web build remain earlier-phase evidence, not a fresh full-suite run after these native changes.

Actual devices found and resolved an iOS gradient/label clipping defect, larger-text artwork crowding, guest auth-history loops, an Android recovery success crash from an unsupported accessibility role and Android keyboard obstruction. The original Android failure image is retained; the actual corrected tablet confirmation and keyboard screenshots are separate. No assertion or security requirement was weakened.

The user approved the Android phone Nearby devices permission, which was allowed on the QA emulator. Reconnect, phone keyboard Enter submission for invalid sign-in and generic recovery, recovery Back, valid synthetic customer sign-in, same-identity restoration after reopening Expo Go, logout and empty Sign In afterward passed. See `android-native-observations.json` and the current phone screenshots. Full iOS software-keyboard/submit, iPad, dedicated staff keyboard and native positive account-link/physical/assistive/asset-failure coverage remain open. Dedicated staff framing is implemented but not separately accepted on actual devices. Release remains NO-GO.

Android phone documentation continuation: both traceability validation tests passed, zero failures/skips (`evidence/traceability-phone-followup.txt`). Application source is unchanged from `9ad9d6e`; the earlier focused/source/type results remain applicable and the broad run remains historical.
