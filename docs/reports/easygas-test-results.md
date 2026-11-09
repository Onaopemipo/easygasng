# Executed test and build results — 30 October 2026

Environment: macOS arm64, Node v24.21.0, npm 11.19.0; pinned root and separate native lockfiles. Test databases are isolated in-memory PGlite/PostgreSQL. Browser fixture uses a separate ignored directory and disabled background jobs. No hosted database or actual customer/payment/provider was used.

| Command / check | Actual result | Saved evidence |
|---|---|---|
| `npm test` | **106 passed; 0 failed; 0 skipped; 0 cancelled**, 34.53 seconds | [Full executed output](test-results-2026-10-30.txt) |
| `npm run typecheck` | Passed | [Web TypeScript](web-typecheck-2026-10-30.txt) |
| `EASYGAS_PREVIEW=true npm run build` | Production optimisation/build passed (webpack); dedicated .next-qa output | [Web build](web-build-2026-10-30.txt) |
| Native `npm run typecheck` | Passed | [Native TypeScript](native-typecheck-2026-10-30.txt) |
| Native `npx expo export --platform ios --platform android --output-dir /tmp/easygas-mobile-final-20261030` | Android and iOS Hermes/asset exports passed | [Native export](native-export-2026-10-30.txt) |
| `npm audit --json` root | 0 known vulnerabilities | [Web audit](web-dependency-audit-2026-10-30.json) |
| `npm audit --json` native | 8 aggregate entries: 3 high, 5 low; command correctly returns non-zero | [Native audit](mobile-dependency-audit-2026-10-30.json) |
| Migration validation | Fresh bootstrap, previous three incremental files plus both new incremental files, RLS and restricted runtime workflows pass within suite | deployment.test.ts; service-governance.test.ts |
| Local encrypted backup/restore | Actual authenticated restore passes, including completed service report, verified receipt and immutable history | backups.test.ts; [targeted evidence](restoration-verification-2026-10-30.txt) |
| Browser service acceptance | Customer request persisted; owner confirm/assign; qualification/slot forms; bundle/readiness routes; public compatibility state | screenshots and browser observations below |
| Responsive 390px | Home viewport/page/body 390/390/390; bookings viewport/page 390/390 | browser-observations-2026-10-30.json |

The earlier native export could not resolve the shared report formatter outside Metro's root. A narrow shared-source watch-folder configuration fixed it; the final both-platform export above was rerun successfully. Browser acceptance caught an ambiguous post-booking state and missing readiness/bundle route allowlist entries; they were corrected and rechecked. Failed earlier attempts are not described as passing acceptance.

## Suite inventory

All listed tests ran in the final `npm test` invocation, with the counts below matching the 106-test executed total. This is a suite count, not measured code coverage.

| File | Tests |
|---|---|
| backups.test.ts | 2 |
| bundles.test.ts | 1 |
| catalogue-import.test.ts | 2 |
| catalogue-services-integration.test.ts | 6 |
| commerce.test.ts | 8 |
| delegation.test.ts | 3 |
| deployment.test.ts | 3 |
| http.test.ts | 8 |
| integrity-regressions.test.ts | 5 |
| platform.test.ts | 39 |
| professional-services.test.ts | 7 |
| scheduling.test.ts | 5 |
| service-governance.test.ts | 6 |
| workflows.test.ts | 11 |

## Evidence limits

No coverage percentage or production performance figures were collected. No separate-session hosted PostgreSQL concurrency/load/advisor check, signed binary, physical-device/simulator acceptance, external payment/message verification, independent penetration test or managed recovery drill was executed. Local green tests do not close those gates.

Browser screenshots use **synthetic test-only** customers, qualifications, prices and appointments. They are not proof of actual business availability or certification. Temporary browser tabs and the isolated port-3004 QA server were closed after verification; an existing normal development server was not stopped.

The explicit tooling/test TypeScript check also passed: `tsc --noEmit --target ES2022 --module ESNext --moduleResolution Bundler --esModuleInterop --skipLibCheck --jsx react-jsx scripts/*.ts tests/*.ts` ([output](tooling-typecheck-2026-10-30.txt)). The aggregate authentication-budget test covers identity-independent limits and window reset; matching service feedback retries now return the original result while changed retries are denied.
