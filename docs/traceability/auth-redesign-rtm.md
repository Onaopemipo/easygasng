# Authentication redesign traceability

[Authoritative matrix](auth-redesign-rtm.json), [audit/contracts](../auth-redesign/00-audit.md), [test report](../auth-redesign/04-test-results.md), [manual](../user-manual/authentication.md).

All 8 requirements are implemented. Seven remain PARTIAL across the full platform scope; the evidence/reporting requirement is verified. No requirement is excluded. Critical requirements remain open for current native acceptance. **Release: NO-GO.**

| Requirement | Implemented / executed evidence | Status |
| --- | --- | --- |
| AUTH-001 Sign In | Real web handler, native controls, server email/activated phone, latest server role, single flight and bounded requests | Partial: native device checks open |
| AUTH-002 Create Account | Actual8–128 policy, no role selector, masked visibility reset, original server session/duplicate rules | Partial: native device checks open |
| AUTH-003 Account recovery | Email-only original action, generic confirmation, provider error/duplicate handling and manual-link guidance | Partial: native device checks open |
| AUTH-004 Supporting entry states | Strict origins, reset/verify/invitation, original assisted fragment/proof/terms and token expiry/replay rules | Partial: native entry acceptance open |
| AUTH-005 Responsive original brand | Editable layouts, original assets,21 viewport observations and core desktop/mobile captures | Partial: native visual acceptance open |
| AUTH-006 Accessibility/motion/theme | Persistent labels/autofill,44pt iOS/48dp Android controls, motion preference, themed surfaces and large-text flow | Partial: OS/assistive/device checks open |
| AUTH-007 Identity/session/drafts/onboarding | Server authority unchanged; session lifecycle, independent catalogue/bootstrap, safe routing, cart and onboarding regressions | Partial: native runtime acceptance open |
| AUTH-008 Evidence/rollback/release | Audit, contracts, source proof, executed tests, manual, full matrix and explicit reversible NO-GO | Verified |

**Coverage:** 8/8 implemented, 1/8 fully verified, 7 partial, 0 excluded. 23/30 gates pass; 7 remain partial. All 70 original scenarios remain, plus 10 discovered cases (T71–80): 59 bounded cases pass, 17 are partial, 3 are not run and 1 conditional provider case is not applicable but retained. No open case is removed.

**Executed:**1,284 broad local tests including PostgreSQL;43 final focused;49 final historical-source;9 current auth component/request/session/bootstrap checks; all zero failures/skips. Web build/types and native types/3 dependency checks passed. These suites overlap and their counts are not added into a claimed unique total. Ten actual browser groups include 21 viewport/route observations; the late vertical polish was recaptured at 390/1440. Positive customer/owner routing and logout used only disposable local sessions.

**Native follow-up:** actual iOS phone and Android phone/tablet observations recorded in [the follow-up report](../auth-redesign/06-native-followup.md). Fixed clipped actions, larger-text artwork crowding, guest auth Back loops, Android recovery status-role crash and Android keyboard obstruction. Latest source: 44 focused tests, 10 auth tests, 25 preservation checks and native types pass; historical broad/web evidence above remains distinct.

**Open:** full iOS software-keyboard/submit and iPad; dedicated staff keyboard; positive native reset/verification/invitation/assisted completion, password managers, VoiceOver/TalkBack and asset-failure acceptance. Actual bounded core observations do not close the full native gates. No production/client-demo deployment, provider enablement, new EasyGas binary/export or store upload. TestFlight 4/Android 2 and original production holds remain.

**Android phone continuation:** user-approved Expo Go permission/reconnect, keyboard Enter sign-in/recovery, hardware Back, valid synthetic customer identity restoration and logout passed; [structured observations](../auth-redesign/evidence/android-native-observations.json). T61 is a bounded PASS; full native gates remain partial. Source unchanged from `9ad9d6e`.
