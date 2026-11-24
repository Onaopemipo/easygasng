# Native acceptance follow-up

The user reopened the QA preview after the initial source commit `1573f16`. These are actual simulator/emulator observations through the existing Expo Go development preview, using disposable local API data. No new EasyGas native binary, native bundle export, provider activation, deployment or store upload was made.

## Executed checks

| Environment | Actual bounded observations |
| --- | --- |
| iOS 26.5, EasyGas First Sign-In QA | Sign In, Create Account and Account recovery render with editable labels and hidden customer tabs. Registration Back returns to Sign In. Invalid synthetic credentials return a generic error; unknown-email recovery returns a generic confirmation. A foreign account link is rejected and cleared. Sign In Back exits the recovery/link history to guest Home and restores all five tabs. |
| iOS appearance | Dark appearance, Text Size 5 and Reduce Motion on exercised. Larger text removes decorative cylinders before they crowd the heading. Original Light/Text Size 3/Reduce Motion off restored. |
| Android phone, existing EasyGas Driver QA AVD, 1080 × 2400 at 420 dpi | All three core screens rendered, including the primary buttons and masked password control. Hardware Back from registration returned to Sign In. A recovery success transition exposed the unsupported-role crash below. A later Expo Go cold reconnect reached Android's Nearby devices permission prompt; permission remains pending rather than silently granted. |
| Android tablet, existing EasyGas Tablet QA AVD, 2560 × 1600 at 320 dpi | All three core screens, focused 480 dp form width, dark appearance and 1.6 font scale observed. Recovery confirmation renders successfully after the fix. Hardware Back returns recovery → Sign In → guest Home with tabs restored. With the software keyboard open, the recovery field and CTA remain above it and tapping the CTA succeeds. |

Screenshots and structured observations are under `evidence/`. Expo Go's developer gear/menu is preview tooling, not EasyGas product UI. Initial screenshots are retained as initial observations; follow-up success and keyboard captures document the corrected paths. No native role-by-role, iPad, physical device or assistive certification is inferred from these checks.

## Defects corrected

1. The iOS primary action gradient clipped its label. Its SVG is now inside a separate absolute decorative View, with a solid fallback, so it cannot participate in the action's flex layout.
2. Moderately larger text crowded the hero artwork before the previous large-text threshold. The native hero switches to flowing copy and removes decorative cylinders above font scale 1.15. Action labels receive the full available row width and may wrap; font scaling remains enabled.
3. Visiting recovery/account links could leave authentication screens in the navigation history. The actual Back handler now removes only guest authentication entries before returning to the previous guest screen, preserving a checkout return. Registration Back still returns to Sign In first. Existing authenticated service/order drilldown behavior remains covered.
4. Android rejected `accessibilityRole="status"` and crashed after a successful recovery request. Recovery and account-link success messages now use an accessible polite live region supported by the native platform. The actual native recovery renderer checks the announcement contract, and the Android tablet success path was rerun without the crash. `android-phone-recovery-before-fix.png` retains the original failure.
5. The Android keyboard could cover the recovery action. A shared Android-only authentication keyboard frame now resizes the scroll viewport in unified and dedicated staff entry screens. iOS keeps its existing keyboard-inset behavior; non-authentication workspaces keep their original structure. Actual tablet keyboard evidence shows the field and CTA above the keyboard, followed by successful submission.

## Remaining acceptance

Full iOS software-keyboard/submit, iPad, Android phone cold reconnect/remaining keyboard cases, positive native reset/verification/invitation/assisted-completion, physical password managers, VoiceOver/TalkBack and asset-failure checks remain open. Android phone Nearby devices permission is awaiting the user's decision. The tablet keyboard check is not a claim for every native screen, IME, device or role.

The earlier 1,284-test broad run remains historical evidence. Latest focused/source/type and traceability results are recorded separately in `04-test-results.md`; they are local checks, not a new GitHub Actions result. All original requirements, the 70 minimum cases and release holds remain. Release remains **NO-GO**.
