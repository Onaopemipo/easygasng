# Tracking acceptance evidence

Use the [32-row matrix](../traceability/order-tracking-rtm.md) for every required TRK-01–32 and OT-G01–14 status. Partial, blocked and unexecuted cases remain in denominators. No production fixtures, real notifications or payment-provider actions were used.

Executed commands and environment:

- `node --import tsx --test tests/integrity-regressions.test.ts`: original baseline, 5 pass, 0 fail; order-tracking-baseline-20261102.txt.
- `node --import tsx --test tests/order-tracking.test.ts tests/order-tracking-postgres.test.ts tests/integrity-regressions.test.ts tests/platform.test.ts tests/commerce.test.ts tests/shared-approval-gas.test.ts tests/deployment.test.ts`: final affected regression log order-tracking-regression-20261102.txt; PGlite and private-schema restricted server role. PostgreSQL case explicitly skipped.
- `npm test`: full repository suite; order-tracking-all-tests-20261102.txt. Read actual counts/skips; skipped PostgreSQL is NOT_TESTED, not pass.
- `npm run typecheck` and `npm run typecheck --prefix apps/mobile`: web/native TypeScript logs.
- `npm run build`: production compilation log; compilation is not release authorization.
- `npm run db:export`: regenerated fresh bootstrap; restricted runtime tests verify new schema locally.
- Phase RTM validation: `node --import tsx --test tests/customer-traceability.test.ts`.
- Prettier source checks: order-tracking-format-20261102.txt. Lint NOT_TESTED: no lint script/configuration exists.

TRK-17 implementation uses independent pg Pool connections only when EASYGAS_ENABLE_LOCAL_PG_TESTS=yes and EASYGAS_TEST_POSTGRES_URL targets an isolated loopback database named easygas_test*. It rejects DATABASE_URL/remote targets and cleans only its unique schema. This environment has no running Docker daemon/disposable PostgreSQL, so that test remains unexecuted.

Browser observations/screenshots: order-tracking-browser-20261102.txt. Actual arrival and synthetic proof updates flowed customer↔driver without refresh; missing handover proof failed. Remaining admin browser permission, actual native offline/device, screen reader/tablet/zoom, process kill/COMMIT ambiguity and production load/recovery drills are explicitly not certified. Encrypted isolated restore validates actual tracking/proof/outcome/outbox records, not production RPO/RTO.

Final totals on the final source: full repository 237 tests, 233 pass, 0 fail, 4 PostgreSQL skips; affected suite 85 tests, 84 pass, 0 fail, 1 PostgreSQL skip; RTM 2 pass; web/native TypeScript, production build and Prettier pass. These are local evidence, not physical/device/infrastructure release acceptance.
