# GitHub Actions verification — 23 November 2026 (Brisbane)

Original source: `1b4a281762cf8265bc3dd6b460e9744e8acda787`, [Release validation run 72](https://github.com/Onaopemipo/easygasng/actions/runs/45074671341).

Native job 137369136356 passed TypeScript, all three dependency tests and the moderate-threshold production dependency audit (zero vulnerabilities). Its manual-only mobile export step was skipped. Web job result is pending; no overall success is claimed yet.

## EDGE-CI-01: generated Android file in a source-only test

A fresh detached checkout reproduced `ENOENT` for `apps/mobile/android/gradle.properties`: native projects are ignored CNG output and are absent from GitHub checkouts. Earlier local tests happened to have that generated file. [Before evidence](clean-checkout-before.txt) records 8 passes and 1 failure.

`tests/native-edge-to-edge.test.ts` now checks the committed Expo SDK 58 dependency and evaluated Android configuration without generating a native project. It rejects the removed `edgeToEdgeEnabled` config flag. Expo removed that customization in SDK 55 because Android 16+ requires edge-to-edge: [official changelog](https://expo.dev/changelog/sdk-55). The existing installed prebuild plugin also warns that the flag is no longer available. Native configuration and implementation are unchanged.

[Clean-checkout verification](clean-checkout-tests.txt): both native edge suites passed, 16 tests, zero failures/skips. The checkout had no generated Android/iOS projects and reused already installed dependencies; no mobile build, prebuild, export or installation was run.

All six EDGE requirements and existing coverage denominators remain. EDGE-04/05 retain physical/release-device acceptance; production NO-GO, provider, actual-import and retain-all holds stay unchanged. This CI follow-up changes test portability and evidence, not production readiness.
