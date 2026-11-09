# Route matrix test evidence

Date: 30 October 2026. Environments: Node 24, Next 16.4.3, PGlite in-memory/private-schema runtime fixtures and isolated browser QA on localhost:3004. Normal localhost:3003 business data/server were preserved.

- `node --import tsx --test tests/navigation.test.ts`: **10 passed, 0 failed, 0 skipped**. Includes route/group uniqueness/order, safe active matching, existing staff read-action mappings, preference corruption, badge bounds, role/branch/session changes, all badge families, independent decision/delegation rules, failure state and restricted-runtime queries.
- `npm test`: **143 passed, 0 failed, 1 skipped** across 144 test entries. This full run includes nine navigation tests. The final additional private-runtime timing test was executed in the focused run; totals overlap and must not be added.
- `npm run typecheck` and `npx tsc --noEmit -p apps/mobile/tsconfig.json`: passed.
- `EASYGAS_PREVIEW=true npm run build`: passed using the isolated build output; final log `navigation-build-20261030.txt`.
- No lint script/config exists in the repository. Lint-command execution is NOT_APPLICABLE; changed-source Prettier checking is recorded separately.

`navigation-browser-evidence-20261030.json` records 28/28 owner routes in expanded, compact and 390px mobile modes. Every route had the correct active item; expanded/compact module headings loaded without error notices. Mobile checks found 28 links, modal/inert background and no document overflow (390/390px) on all 28 pages. Tablet 1024px checks and desktop 1280/1560px checks passed. The complete route register is `docs/navigation/route-verification-register-20261030.json`.

Seven browser roles: owner, manager, sales, inventory, finance, driver, technician. Inventory direct access to Financial Reconciliation returned 404. Driver had one navigation route; technician had two. Every existing staff role was additionally tested against actual permitted read-action APIs. Anonymous/customer/inactive/expired/revoked access was denied by automated tests. Live independently approved synthetic role reduction revoked the old browser session and reauthentication exposed only reduced access; the original fixture role was restored. See `navigation-live-access-qa-20261030.jsonl`.

Unknown paths returned the existing not-found experience. Unsupported nested pages remain not-found; only active matching of potential valid descendants was unit tested. Existing route names were not changed.

Screenshots are in `docs/screenshots/navigation-{expanded,compact,mobile,tablet,driver,technician}-20261030.png`. Browser QA used synthetic data only. No test directly repeated every business mutation on every route: the unchanged business regression suites provide those checks. VoiceOver spoken-output, physical device testing, production-sized database load and external PostgreSQL integration remain NOT_TESTED/BLOCKED as applicable; they are not claimed by this local route/UI acceptance.
