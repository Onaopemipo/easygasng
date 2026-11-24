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
| iOS/Android actual preview, keyboard/back, tablets/large text and assistive |NOT RUN; Device Hub window/updated preview handoff pending. Renderer/type tests do not substitute for those gates. |
| Physical password-manager/VoiceOver/TalkBack/provider delivery/store build |NOT RUN; not silently marked passed |
| Lint |NOT RUN: no lint script exists in actual package scripts |

## Failures investigated and retained

Initial broad run: 1,277 tests, 1,233 passed, 13 historical-source/matrix failures, 31 PostgreSQL skips. Exact reviewed authentication continuation retains earlier bytes and allows only ten existing frontend files/eight additions. Old phase no-native proofs are still asserted at their original phase base, then this later approved native scope is checked. All 57 source follow-up checks passed. No historical manifest/assertion or requirement ID was removed.

A new renderer case caught password visibility persisting when switching registration mode. The password control now remounts masked on that transition, with a regression assertion. Browser review caught hero contrast/wave overlap and an unstyled link action; corrected. Manual link review caught the existing raw fragment required by assisted activation; output now preserves that contract and temporary-setup metadata. Existing HTTP tests retain the same assisted customer/order.

The first full PostgreSQL run had 1,283 tests: 1,282 passed, 1 failed, 0 skipped. The one failure was an existing source-format assertion requiring the verification resend link text immediately after its opening tag; behavior and destination were unchanged. Original formatting was restored; the existing audit test then passed without weakening its assertions. The fresh broad run passed all 1,284 tests with 0 failures/skips. Final authentication/availability/accessibility refinements were then rechecked with 43 focused tests and 49 historical-source checks, both zero failures/skips; final web build/types and native types also pass. The extra native-bootstrap/session tests are in the current 9-test auth file. This is local executed evidence, not a GitHub CI claim for a new release.

No benchmark screenshots or stale native screenshots are substituted for actual browser evidence. Current signed binaries and deployed demo remain unchanged. Full release remains NO-GO until critical open device/security/assistive gates are resolved.

Final source protections: 49/49 historical-source follow-ups pass on the exact current manifest; 10 existing frontend transitions and 8 additions, all server/auth/schema and unrelated authority files unchanged. Native preview/physical/assistive acceptance still NOT RUN. Device Hub and Android Studio both failed to expose windows; no Android emulator was attached. No deployment or mobile binary/export/upload.
