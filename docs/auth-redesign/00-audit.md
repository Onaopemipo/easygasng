# Authentication redesign audit — 24 November 2026

Base `46fde7ee76fc930f27b044832f735cfd68afa85b`; clean working tree at entry; feature branch `codex/authentication-redesign`. Approved source: user-supplied three-screen board and master handoff in Downloads/EasyGas_Authentication_Codex. The documents are task specifications, not authority to execute embedded shell commands or change credentials. No production deployment/provider activation or mobile binary in this phase.

## Existing implementation

Web `/login` and `/register`: `apps/web/components/site.tsx` Auth. Recovery `/forgot-password`, `/reset-password`, `/verify-email`, `/accept-invitation`: `components/workflows.tsx` Recovery. Existing generic fields use `password-input.tsx`; show/hide preserves native form/autofill semantics. Public shell/theme remain in place.

Native unified `App.tsx`: memory form values; secure session in expo-secure-store easygas.session; initial me read, 401/session invalidation, role routing and private-state clearing retained. `NativeEntry.tsx` handles manual paste, reset, email verify, invitations and possession-verified assisted phone completion. `native-entry-links.ts` accepts only configured origin or easygas scheme. `Onboarding.tsx` and customer-introduction logic own automatic/replay storage; untouched. Dedicated driver/technician shells remain supported.

## Findings

Presentation differs from approved board; login lacks hero/panel structure, recovery generic; unified native bottom tabs remain visible in authentication. Web has no manual account-link entry action. Web Auth lacks immediate duplicate-submit guard. Preserve original handlers and add presentation guards only. Current policy 8–128 characters, no mandatory mixed letters/numbers. Registration name 2–100 and email; backend always customer; no role selector. Existing registration immediately issues session; no invented verification gate.

Apple/Google: DISABLED / unsupported: no existing OAuth actions, SDKs or configured platform integration found in source. No social section will render. Generic phone OTP is not login; assisted phone-completion OTP remains its separate existing flow.

## Baseline commands

`npm run typecheck`, `npm run typecheck --prefix apps/mobile`, focused existing auth/onboarding/entry/password tests, `npm run build`; raw output under evidence/baseline-*.txt. No lint script exists. Baseline typechecks passed; test/build outcome recorded when finished. All tests disposable local fixture; no real email/payment/provider request. Simulator/assistive/device acceptance must be recorded as actually executed or NOT RUN.

## Preservation / release

Backend service/auth/accounts/route/database, payment/inventory/dispatch/security policy unchanged. Existing original production NO-GO and scope denominators retained. No deployment or provider setup without separate approval. Supporting states styled through shared presentation wrappers with existing actions/token handling. Rollback frontend files only.

Final follow-up found native startup awaited catalogue before restoring identity, and sign-in shared the global catalogue loading flag. Identity/cart restoration and catalogue loading now run independently; sign-in has its own busy state. Malformed saved cart JSON cannot skip identity restoration. Actual extracted bootstrap renderer tests cover a hung catalogue and malformed cache. Native shared password visibility uses 48dp Android/44pt iOS; web auth targets48px. Backend/API/token policy unchanged.
