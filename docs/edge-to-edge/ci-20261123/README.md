# GitHub Actions verification — 23 November 2026 (Brisbane)

Original source: `1b4a281762cf8265bc3dd6b460e9744e8acda787`, [Release validation run 72](https://github.com/Onaopemipo/easygasng/actions/runs/45074671341).

Native job 137369136356 passed TypeScript, all three dependency tests and the moderate-threshold production dependency audit (zero vulnerabilities). Its manual-only mobile export step was skipped. Original web job failed: 1,187 passed, 3 failed, zero skipped. [Exact failure excerpts](original-ci-failures.txt) retain all three defects. The first repair-only rerun is still running; complete repaired-source hosted verification remains pending.

## EDGE-CI-01: generated Android file in a source-only test

A fresh detached checkout reproduced `ENOENT` for `apps/mobile/android/gradle.properties`: native projects are ignored CNG output and are absent from GitHub checkouts. Earlier local tests happened to have that generated file. [Before evidence](clean-checkout-before.txt) records 8 passes and 1 failure.

`tests/native-edge-to-edge.test.ts` now checks the committed Expo SDK 58 dependency and evaluated Android configuration without generating a native project. It rejects the removed `edgeToEdgeEnabled` config flag. Expo removed that customization in SDK 55 because Android 16+ requires edge-to-edge: [official changelog](https://expo.dev/changelog/sdk-55). The existing installed prebuild plugin also warns that the flag is no longer available. Native configuration and implementation are unchanged.

[Clean-checkout verification](clean-checkout-tests.txt): both native edge suites passed, 16 tests, zero failures/skips. The checkout had no generated Android/iOS projects and reused already installed dependencies; no mobile build, prebuild, export or installation was run.

All six EDGE requirements and existing coverage denominators remain. EDGE-04/05 retain physical/release-device acceptance; production NO-GO, provider, actual-import and retain-all holds stay unchanged. This CI follow-up changes test portability and evidence, not production readiness.

## EDGE-CI-02: executed-evidence identifiers

The global matrix audit requires a successful `✔ TEST-ID:` line for every test ID of a verified requirement. Six EDGE entries used full descriptive test titles without an ID separator, so the audit could not match their real passing logs. The same assertions now have explicit `EDGE-CANVAS-ZERO`, `EDGE-CANVAS-NOTCH`, `EDGE-CANVAS-SIDE`, `EDGE-CANVAS-THEME`, `EDGE-ROOTS` and `EDGE-SOURCE-PROOF` prefixes. The matrix records the one-to-one migration; stable requirement IDs and all six requirements/gates remain unchanged. Historical logs are retained, with newly executed ID-bearing results in [current regression evidence](ci-regression-tests.txt). Failure reproduction logs remain linked through this report rather than being aggregated as current successful evidence.

## EDGE-CI-03: prototype preservation continuation

`MEXP-ARTIFACT` compared current native source directly to the last device-acceptance hash, omitting the two approved edge-to-edge source continuations. `scripts/validate-mobile-prototype.mjs` now passes that retained incoming hash through the existing reviewed edge-source helper before comparing current bytes. Original prototype/native/logo/text/authority/device manifest and bundle checks remain, followed by exact edge allowlists, retained-commit hashes and tamper rejection. No old manifest or binary proof was rewritten and no prototype bundle was regenerated.

[Final clean-checkout regression](clean-checkout-final-tests.txt): **37 passed, zero failed/skipped** across both edge suites, the prototype acceptance suites and the global traceability audit. The isolated checkout had no generated Android/iOS projects. [Global matrix audit](traceability-tests.txt) also passed independently. [Native preservation](native-preservation.json) confirms three original mobile artifacts are unchanged.
