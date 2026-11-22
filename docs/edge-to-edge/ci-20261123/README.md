# GitHub Actions verification — 23 November 2026 (Brisbane)

**PASS:** [Release validation run #74](https://github.com/Onaopemipo/easygasng/actions/runs/45076301926) verified repaired source `5027eb3f91a4409bfb13e80866fa3478ee5d5634`. All **1,190 regression tests passed, zero failed/skipped**, followed by successful web build, web typecheck and production dependency audit (zero vulnerabilities). The native job passed typecheck, all three dependency tests and its production dependency audit (zero vulnerabilities). Its mobile export step was **skipped**.

| Attempt | Source | Regression result | Native job |
|---|---|---|---|
| [#72](https://github.com/Onaopemipo/easygasng/actions/runs/45074671341) | `1b4a281` | 1,187 passed / 3 failed / 0 skipped | Passed; export skipped |
| [#73](https://github.com/Onaopemipo/easygasng/actions/runs/45075015137) | `22524ae` | 1,188 passed / 2 failed / 0 skipped | Passed; export skipped |
| [#74](https://github.com/Onaopemipo/easygasng/actions/runs/45076301926) | `5027eb3` | 1,190 passed / 0 failed / 0 skipped | Passed; export skipped |

[Run/job/step results](run-results.json), [hosted successful test summary](hosted-job-summary.txt), [web build](hosted-build.txt), [web typecheck](hosted-types.txt) and [web audit](hosted-dependency-audit.txt) retain the authoritative result. GitHub artifact 14775074746 (`web-validation`) was downloaded and its SHA256 verified as `8283d4be253f985869c57ccf39993efb21512e273dbf2d59836c822187939064`. The ZIP contains build, test, typecheck and audit logs, with no native binary.

## Defects resolved

**EDGE-CI-01 — generated Android file in a source-only test.** A fresh detached checkout reproduced `ENOENT` for ignored `apps/mobile/android/gradle.properties`. Earlier local tests had that generated file. The test now checks the committed Expo SDK 58 dependency and evaluated Android configuration, without generating a native project, and rejects the removed `edgeToEdgeEnabled` config flag. Expo removed that customization in SDK 55 because Android 16+ requires edge-to-edge: [official changelog](https://expo.dev/changelog/sdk-55). No app configuration changed. [Before reproduction](clean-checkout-before.txt), [first clean repair](clean-checkout-tests.txt).

**EDGE-CI-02 — executed-evidence identifiers.** The global audit requires a successful `✔ TEST-ID:` line for each verified requirement's test ID. Six EDGE mappings used descriptive test titles without an ID separator. The unchanged assertions now have explicit `EDGE-CANVAS-ZERO`, `EDGE-CANVAS-NOTCH`, `EDGE-CANVAS-SIDE`, `EDGE-CANVAS-THEME`, `EDGE-ROOTS` and `EDGE-SOURCE-PROOF` IDs. The matrix records the one-to-one migration and [newly executed ID-bearing evidence](ci-regression-tests.txt). All six requirement/gate IDs and every inset case remain; original logs are retained.

**EDGE-CI-03 — prototype source preservation continuation.** `MEXP-ARTIFACT` compared current native source directly with the earlier device-acceptance hash, omitting the approved edge-to-edge continuations. `scripts/validate-mobile-prototype.mjs` now passes the retained incoming hash through the existing reviewed edge-source helper. Original prototype/native/logo/text/authority/device manifest and bundle checks remain, followed by exact edge allowlists, retained-commit hashes and tamper rejection. No historic manifest/binary proof was rewritten and no prototype bundle was regenerated.

[Original hosted failure excerpts](original-ci-failures.txt) retain all three defects. They are historical reproduction evidence, not current passing-suite evidence.

## Local checks and release boundaries

[Final clean-checkout regression](clean-checkout-final-tests.txt): **37 passed, zero failed/skipped** across both edge suites, prototype acceptance and global traceability. No generated Android/iOS projects were present; already installed dependencies were reused. [Independent global matrix audit](traceability-tests.txt) passed as well. Only a generated timestamp changed during local model tests; the historic evidence file was restored after confirming its substantive contents were identical.

[Native artifact preservation](native-preservation.json) confirms the original iOS bundle, Android APK and Android export retain SHA256, size and nanosecond modification time. **Zero mobile builds, prebuilds, exports or installations** during this follow-up. CI's web build is separate; native export was skipped in all three attempts.

The follow-up changes tests, a source-proof validator and documentation; native app behavior/configuration is unchanged. The final evidence publication is documentation only and references the exact CI-tested repair commit above.

All six EDGE requirements remain in the denominator. EDGE-04/05 remain PARTIAL for physical Android/iOS and installed release-device verification. Existing production **NO-GO**, native/provider/physical, actual-import and retain-all holds remain unchanged. Green CI does not certify physical devices or authorize production release.
