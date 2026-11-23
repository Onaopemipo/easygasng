# Executed store acceptance — 23 November 2026

These are manual acceptance checks performed in the authenticated store consoles through CUA. They are distinct from the six automated artifact checks and do not claim installation or device operation.

## STORE23-U01: Google Play internal release and matching tester access

1. User approved both exact Play legal declarations; created EasyGas/free/en-US with package `com.easygasng.customer` in the existing authorised developer account.
2. Uploaded the actual verified AAB, version0.1.0/code2, to the internal track. Google processed the bundle with targetSDK36 and accepted its signature.
3. Reviewed the single warning: no selected testers. Published only the internal release; readback said Available to internal testers.
4. User requested the same testing accounts as AfriMarket. Opened AfriMarket's internal testing configuration read-only and observed its checked Pilot Testers list with48 members; SmartInvoice Internal was unchecked.
5. Selected only that same existing Pilot Testers list on EasyGas and saved. Final readback: internal track Active, latest release0.1.0(2), Pilot Testers checked48, SmartInvoice Internal unchecked, Save disabled. No tester email list contents were exported or changed.

Result: PASS. [Tester opt-in link](https://play.google.com/apps/internaltest/4701444205316057539). Only accounts in the selected list can join. No production or open/closed-test release was created. Google's temporary unreviewed package-name label is expected on this first internal release.

## STORE23-U02: TestFlight processing, compliance and matching internal group

1. User completed Apple browser sign-in. Created EasyGas Energy Solutions/app6838122026 under the verified bundle/team; EasyGas alone was already taken.
2. Submitted the exact signed device IPA through the configured EAS API key. Submission59b9df06 finished; Apple builda3a7f07c processed and showed Missing Compliance.
3. Audited the actual local encryption use. Prepared published third-party encryption beyond Apple OS / no-France distribution answers. User explicitly approved the declaration and no testing in France; saved it. Missing Compliance cleared.
4. Read AfriMarket's Team (Expo) group: two existing internal testers. Added exactly those same two existing accounts to EasyGas Internal QA. No account/admin permissions were changed. Automatic distribution of future builds is OFF.
5. Added only version0.1.0/build2 to that group. Final group readback: Internal Group ·2 Testers ·1 Build, build0.1.0(2), status Testing, expires in90days. The selector had shown Ready to Test before assignment.
6. Saved the role/layout/exception-case beta instructions in What to Test. Final build page showed Saved, Group(1), EasyGas Internal QA/Internal/2.

Result: PASS for internal test distribution. Open TestFlight using the same Apple account used for AfriMarket. No public TestFlight link or external beta/App Store review was created. Device install/launch/lifecycle acceptance remains separate.

Local proof screenshots are kept under ignored `.data/google-easygas-testers-active.jpg` and `.data/apple-easygas-testing.jpg` and shown in the task response. They contain authenticated account UI and are intentionally excluded from Git. Public evidence keeps group names/counts and store IDs, not personal tester email addresses.
