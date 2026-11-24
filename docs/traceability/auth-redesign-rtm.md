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

**Coverage:**8/8 implemented,1/8 fully verified,7 partial,0 excluded.23/30 gates pass;7 open (5 partial and2 not run). All70 minimum scenarios remain, plus6 discovered cases (T71–76):53 software/web pass,17 partial,5 not run,1 genuinely conditional provider case not applicable and explicitly retained. No untested/blocked case is removed.

**Executed:**1,284 broad local tests including PostgreSQL;43 final focused;49 final historical-source;9 current auth component/request/session/bootstrap checks; all zero failures/skips. Web build/types and native types/3 dependency checks passed. These suites overlap and their counts are not added into a claimed unique total. Ten actual browser groups include 21 viewport/route observations; the late vertical polish was recaptured at 390/1440. Positive customer/owner routing and logout used only disposable local sessions.

**Open:** Updated iOS/Android preview and keyboard/Back/tablet/large-text, password-manager, VoiceOver/TalkBack and asset-failure acceptance. Device Hub/Android Studio windows were inaccessible; Android had no attached emulator. The manual launch handoff remains pending. Renderer/type/API evidence does not substitute for device acceptance. No production/client-demo deployment, new provider, native export/binary or store upload. TestFlight 4/Android 2 and original production/provider/physical/import/retain-all holds remain.
