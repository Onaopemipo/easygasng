# Approved authentication design implementation

Authority: [approved board](references/Approved_Authentication_Screens.png), [master specification](references/master-specification.md); exact copied reference hashes recorded beside them. Existing IMG references document former controls and are not substituted for the approved design.

## Editable implementation

Web `auth-presentation.tsx` supplies AuthShell/brand hero/waves/envelope and labelled AuthField using the existing password-visibility control. `site.tsx` retains the existing Auth handler and server-role routing, with segmented route navigation, live 8-character guidance, request locking, memory-only fields and lifecycle cancellation. `auth-recovery-request.tsx` uses the original email-only action and generic confirmation. `workflows.tsx` retains reset/verify/invitation contracts, fragment scrubbing and ActionForm; an optional transport dependency changes only authentication requests. `phone-completion.tsx` retains possession proof, explicit applicable terms and same-account activation inside the same presentation. Manual account links use the original strict origin/scheme parser; activation retains the existing raw fragment contract and temporary setup metadata is preserved.

Desktop uses a max 1200px split frame, 480px focused fields and safe Home/Sign In return. Public header/footer/mobile tabs are hidden only for authentication presentation; all other pages retain the original shell. The existing theme toggle remains available. Phone/tablet web stacks the compact hero and rounded form panel; all controls remain real editable elements.

Native `AuthPresentation.tsx` supplies AuthShell/AuthField/AuthAction/NativeAuth. `AuthRecovery.tsx` uses the existing recovery API. `NativeEntry.tsx` retains manual links, reset confirmation, verify/invitation and assisted code/terms flows inside the shared shell. Dedicated driver/technician sign-in keeps its effective workspace restrictions and original fields within the same visual shell. Unified App hides tabs/dock/header only in guest login/recovery/account-link screens, restores them on exit, clears password values on appropriate exit, handles registration Back before leaving authentication and retains cart/pending checkout/onboarding. Existing ScreenCanvas safe areas and ScrollView keyboard insets remain; large text lets hero copy flow and removes decorative cylinders first. Existing motion honors OS reduce-motion; only auth transitions use 220ms, ordinary screens keep 160ms.

## Deliberate reference adaptations

- Original approved repository cylinder/full-logo assets reused. A warm off-white logo plate keeps the full-colour original readable on forest/dark surfaces; no inverted image or new identity artwork.
- Apple/Google section omitted entirely: no verified existing integration. No dummy buttons or OAuth setup.
- Password guidance reflects actual server 8–128 policy; no invented letters/numbers/strength requirement or prechecked indicators.
- Required manual account-link, recovery, policy and supported informational controls remain accessible even where absent in the flattened board.
- Approved desktop split and responsive scroll adapt the board to actual screen sizes. No device/browser chrome is rendered in the app. Short native screens use concise supporting copy and smaller decoration; accessible text is not clipped into a fixed hero.

## Visual evidence

Actual local-browser screenshots and 21 width/route observations are under evidence. Device screenshots are recorded only when actually observed; simulator/Android/physical/assistive gates cannot be inferred from renderer snapshots or type checking. No new mobile binary or deployment was made.

Session availability: initial web auth waits for the actual me result and offers Retry session check on unavailable reads. Native catalogue loading no longer blocks identity restoration or sign-in; cart parsing failures are isolated. Password-reveal controls meet 48px web auth/48dp Android, while iOS retains 44pt. Supporting envelope decoration shrinks on short screens.
