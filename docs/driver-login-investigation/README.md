# Supplied driver login: Expo Go environment repair

24 November 2026. Source baseline `12d2aaf`; runtime-only preview repair. [Traceability](../traceability/driver-preview-login-rtm.md).

The user reported `driver.qa-ac7e0495@demo.easygas.invalid` failing on iOS, then confirmed **Expo Go**. Device Hub's EasyGas First Sign-In QA phone showed that exact identifier with the generic incorrect-credentials error. The existing Metro server on port 8086 was running the authentication redesign against isolated local API 3140 and `local-demo` configuration. That private fixture has different accounts; the supplied shared-demo account does not exist there.

The exact supplied account succeeded on the existing website backend through both `login` and `driver.login`, with no temporary-password change required. `me` returned role driver/Lagos, and current driver orders, snapshot and notifications all returned HTTP 200. Each diagnostic API session was signed out. No account reset, new account, password/role change, privilege expansion or business configuration write was needed.

## Applied correction and observed result

Stopped only the owned Metro process on 8086 and restarted the same Expo Go preview with `EXPO_PUBLIC_API_URL=https://easygas-client-demo.vercel.app` and `EAS_BUILD_PROFILE=preview`, clearing Metro's development cache. The returned manifest identifies EasyGas / preview; the served iOS development bundle defines the public API environment value as the shared demo origin. The isolated web/API fixture on 3140 remains separate and unchanged.

Through Device Hub's Expo Go menu, reloaded the preview, opened Account, entered the exact supplied credentials privately and submitted Sign In. Actual resulting native state: **LAGOS**, **Ready for the road?**, **Driver workspace**, **Trip & delivery readiness**, Today / Deliveries / Work / Profile and zero new/in-progress assignments. The supplied account is left signed in for the user. No duty trip, availability, location consent, pickup, delivery, proof or finance action was submitted.

This is an existing Expo Go development preview, not a TestFlight or signed installed-build acceptance claim. No EasyGas mobile binary/export/signing/store upload or hosted deployment was performed. The existing TestFlight 4 artifact was already configured for the shared demo origin; it was not rebuilt or changed. Original commercial production NO-GO and wider authentication/native/provider/physical holds remain.

## Reopen this preview

From `apps/mobile`:

```sh
EXPO_PUBLIC_API_URL=https://easygas-client-demo.vercel.app EAS_BUILD_PROFILE=preview npx expo start --port 8086 --localhost --clear
```

Open/reload the same `exp://127.0.0.1:8086` project on the local QA simulator. A physical phone cannot use its own loopback address to reach the Mac; use a separately configured approved reachable development connection when needed. Never copy supplied hosted accounts into a local database to conceal an environment mismatch.

For isolated API/component testing, continue using local API 3140 and its private synthetic fixture credentials. Explicitly restart a separate intended preview with the correct local configuration if returning to isolated native acceptance. The prior authentication redesign screenshots/tests remain local-fixture history; this supplied-account continuation is recorded separately.

## Evidence and limits

- `evidence/exact-ios-driver-account.json`: exact user-identified account, both shared/dedicated APIs, current driver reads, and own API logout.
- `evidence/environment-comparison.json`: different originally supplied demo credentials rejected against local fixture, while local fixture driver succeeds. The exact newer user account was subsequently confirmed by hosted APIs and the observed failing/successful iOS UI, rather than assuming these are the same account.
- `evidence/corrected-preview-runtime.json`: corrected manifest/runtime/API environment and served development bundle.
- `evidence/ios-observations.json`: actual initial failure and corrected signed-in driver Home.

Before the user identified iOS/Expo Go, a supplementary headless website-form check timed out twice awaiting a login response; no website UI success or website product failure is claimed from those attempts. They are not evidence of the reported native fault. The controlled API diagnostics and actual native outcome establish this repair; unrelated browser sessions were untouched. Evidence excludes passwords and tokens.
