# Native workflow and account-entry port — 20 November 2026

The actual Expo/React Native app now contains the remaining business workspaces and native account-entry screens. Internal owner dashboard, inventory, reporting and notification links use native navigation. The existing dedicated customer, driver and technician workspaces remain in use. The private review prototype and its deployment remain unchanged.

This is an implementation and bounded local acceptance delivery, not a production release. The [matrix](../traceability/native-workflows-rtm.md) retains all 36 families, 300 features, six gates and the 14 external acceptance blocks. Complete per-feature installed-device acceptance is still outstanding. Production NO-GO, actual-import hold and retain-all remain.

## Use the native screens

Sign in using the existing account. Owner, manager and finance users have **Workspaces** on Home and Account/More. The directory is restricted by current server navigation permissions. Choose a workspace, use its tabs/search/filters, select a record, then open **Actions**. Selectors show record names; money is entered in naira and converted to exact integer kobo once. Review the selected records, amount and evidence before confirming. A server response determines success; refresh reloads canonical records. If write confirmation is lost, close the sheet and refresh the canonical records before another change. Password expiry offers inline verification while preserving the proposed change. Revoked access clears private workspace data.

The directory covers inventory, product specifications, cylinders, purchasing, credits/refunds, reconciliation, campaigns, rewards reconciliation, recommendations, testimonials, incidents, policies, branches/coverage, message delivery, dispatch/custody, customers/follow-ups, bundles, quotations, services/scheduling, reports, equipment/qualifications, release readiness, approvals, business controls and staff/access. Existing native service appointments handle assessment, reviewed quotations, work authority, materials, reports and settlement. Existing driver screens handle assignments, pickup, trips, custody, evidence and delivery exceptions.

Report and schedule choices match each role’s actual API permissions; only relevant filters appear, and inactive filters are discarded when changing reports. Point-in-time reports omit historical date fields. Inventory and testimonial filters are sent to their actual paged endpoints. Reports use the existing scoped report/export API and native file sharing for CSV, Excel XML and PDF. Inventory, testimonials and rewards have their own authorised CSV exports. Temporary shared files are deleted when sharing finishes. A share sheet is not evidence of successful third-party delivery.

**Product import preview** accepts pasted product-metadata CSV and checks it against the current catalogue. It shows malformed, duplicate and invalid rows. It never imports, adjusts stock or changes customer/payment data. Actual imports remain on hold.

**Profile & Security** and native notifications are now available to all three business roles, using their own account APIs and current-role checks. Customer, driver and technician account controls remain in their existing workspaces.

On Sign In, choose **Open an account link** to paste a reset, email-verification, invitation or requested phone-completion link. Native `easygas://` links and the configured API origin are accepted. Opaque tokens stay in component memory and are not displayed in reviews. Missing, foreign, expired and already-used links do not establish access. Invitation acceptance still requires the existing access review and temporary-password replacement. Phone completion requires the actual OTP, owned-order review and explicit terms acceptance. A signed-in account is preserved when a different account-entry link arrives; sign out before reopening it. Universal/app-link association and real mailbox/SMS delivery need external device acceptance.

Public **Policies & terms** shows only published effective server documents, with versions and Lagos effective dates. **About & delivery** uses the approved public catalogue/contact/coverage data. Hosted payment checkout, map navigation and telephone links remain intentional provider/OS integrations; returning from payment cannot verify it.

## Architecture and controls

- `apps/mobile/NativeBusinessWorkspace.tsx`: native tabs, sheets, record/source selection, filters, current-version binding, review, inline verification and private export.
- `packages/business-rules/src/native-workspaces.ts` and `native-workflow-contracts.json`: reviewed API shape registry and request serialization. They do not contain a shadow business database. Schema scripts are audit aids; the server remains authoritative for all business validation.
- `native-workspace-session.ts`: fresh current-user/role/navigation check, concurrent-submit guard, no optimistic business success and explicit uncertain-outcome handling.
- `apps/mobile/NativeEntry.tsx` and `native-entry-links.ts`: native public account-entry and policy/information screens, using the existing public token/OTP APIs.
- `NativeCataloguePreview.tsx` / `native-catalogue-preview.ts`: bounded, read-only metadata preview.
- `apps/web/lib/readiness.ts`: a new owner/recent-verification-only evidence intake. It appends an audit record. It cannot change a gate, release recommendation, safety evidence, provider configuration or production decision.

Role, branch, independent review, qualification expiry, meter calibration, revision, idempotency and ledger controls remain on the existing dispatcher/database. No provider was activated, QA qualification renewed on the client demo, production record imported, or physical fulfilment claimed. Disposable test reviewers are fixture data, not additional business owners. The sole-owner business policy remains separate from independently qualified safety/financial controls.

## Executed evidence and limits

`evidence/native-tests.txt` records 136 passing checks, including 69 report/role permission comparisons, using real NextRequest/native bearer HTTP tests, canonical database readback and native controller/serializer/entry/preview tests. Cases include exact money and invalid precision, duplicate receipt replay, failed receiving checks, maker self-review, stale versions, cross-branch writes, revoked/expired sessions, mutation method boundaries, single-use/expired/forged account links, unchanged production NO-GO and uncertain network outcomes.

`evidence/component-test.txt` and `component-tests.json` exercise the actual new native workspace, NativeForm and ContextSheet components using React test-renderer host primitives and HTTP to a disposable API. All 97 registered action forms render in the 9 passing component checks; representative purchasing/credit submissions, customer search, verification recovery, lookup failures, filters, staff profiles and token secrecy are checked. Host primitives do not prove device pixels, file sharing, accessibility or OS permissions.

`evidence/regression-final.txt` records the successful broad application regression (1,042 passed, 28 existing skips, zero failures). `regression.txt` retains the initial run with three subsequently resolved source/matrix-baseline failures. Historical source checks are reconciled explicitly through `reviewed-source-changes.json`; original prototype manifest and bundle hashes remain pinned. Follow-up evidence records the final matrix/source checks. The PostgreSQL/provider/device skips remain skips, not passes.

`evidence/ios-build.txt`, `android-build.txt`, `android-export.txt` and simulator observations record local builds and bounded UI checks. Simulator keychain acceptance required Xcode-generated simulated application/keychain entitlements for the local bundle only; production entitlements were not weakened. Local Android release APKs use the existing local signing setup, not store/physical-device production certification.

[Simulator observations](evidence/simulator-observations.json) record representative installed iOS acceptance for all six roles. Owner supplier and finance pending-credit requests have canonical readback; technician and driver acknowledgements persisted; customer sees matching owned records. Installed report filters/results and CSV/XML/PDF OS share previews passed. A subsequent report-schedule/staff-role enum-picker correction passed component/API checks and both native builds; it is not represented as an additional device observation. Invalid verification links remained unauthenticated. The share sheets were cancelled, so no third-party file delivery is claimed. Final Android APK installation/launch and error logs passed; Android visual role acceptance remains open. [Source/build manifest](evidence/build-manifest.json) records exact content hashes.

Outstanding: individual device acceptance across all 300 features; real iOS/Android hardware and accessibility; locked/background/airplane-mode and interruption/replay drills; associated domains and real mail/SMS/WhatsApp/push/Paystack/maps; independent PostgreSQL concurrency; physical cylinder/meter/load/dispensing and authorised business/finance/safety release acceptance. Existing matrix denominators and production NO-GO remain.

## Reproduce the isolated checks

```sh
npm --prefix apps/mobile run typecheck
npm run typecheck
node --import tsx --test --test-concurrency=1 tests/native-workflows.test.ts tests/native-workflows-api.test.ts tests/native-entry.test.ts
node --import tsx scripts/native-acceptance-server.ts
```

The last command binds only `127.0.0.1:3106`, creates a disposable memory database and does not connect to the client demo or the existing local database. Its six labelled fixture accounts use `role@native.example.test` and the disposable password in that script. No real credential is copied. Stop it after acceptance.

For component checks, install isolated test tooling outside the repository and keep the disposable server running:

```sh
npm install --prefix /tmp/easygas-native-component-test --no-audit --no-fund react@19.2.0 react-test-renderer@19.2.0
node scripts/test-native-workspaces.mjs
```

Build using `EAS_BUILD_PROFILE=local-demo` and the loopback API: iOS `http://127.0.0.1:3106`; Android emulator `http://10.0.2.2:3106`. These builds are local fixtures, not a phone-ready public deployment. Use the unchanged HTTPS guard and confirmed identifiers for any later approved signed distribution.

## Native acceptance screenshots

All screenshots below are from the installed app against disposable synthetic API records. They are not prototype frames or production data.

| Role / check | Evidence |
|---|---|
| Owner supplier confirmation | [Installed iOS](evidence/ios-owner-write-confirmed.jpg) |
| Finance verification preserves pending credit | [Installed iOS](evidence/ios-finance-reauth-draft-retained.jpg) |
| Manager campaigns | [Installed iOS](evidence/ios-manager-campaigns.jpg) |
| Technician acknowledgement | [Installed iOS](evidence/ios-technician-assignment-confirmed.jpg) |
| Driver acknowledgement and pickup guard | [Installed iOS](evidence/ios-driver-acknowledged-pickup-guard.jpg) |
| Customer owned order | [Installed iOS](evidence/ios-customer-owned-order.jpg) |
| Report filters and result | [Scope](evidence/ios-report-point-in-time.jpg), [result](evidence/ios-native-report-result.jpg) |
| Native exports | [CSV](evidence/ios-csv-share-sheet.jpg), [Excel XML](evidence/ios-excel-share-sheet.jpg), [PDF](evidence/ios-pdf-share-sheet.jpg) |
| Invalid account link | [Installed iOS](evidence/ios-expired-account-link.jpg) |

For an incremental local Android build after changes under the shared `packages/` directory, first run `./gradlew :app:createBundleReleaseJsAndAssets --rerun-tasks` from `apps/mobile/android`, then `:app:assembleRelease`, with the same fixture build profile/API variables. The default generated Gradle input set can otherwise reuse a bundle after shared-contract edits. Final evidence uses the forced bundle followed by APK packaging.

Final verification: 162/162 targeted tests after the last contract/picker corrections; 9/9 rendered native/API tests; 3/3 native traceability checks. The earlier full regression finished with 1,042 pass, zero failures and 28 existing skips. These sets overlap and must not be added together as independent feature coverage. Both local native builds passed; exact source/artifact hashes are retained.

Stored text logs preserve test/build output with terminal line endings and trailing whitespace normalized for repository review.

## Client-demo web/API rollout

The user clarified that web/API builds are permitted while new mobile binaries are prohibited. Source `405fb5da501fc7828946ab4de425de2a7a7d088c` is deployed and verified at [the client demo](https://easygas-client-demo.vercel.app). The new readiness evidence endpoint is now available under its existing owner/recent-verification/schema controls. The native screens remain committed source and previously tested local artifacts; this web rollout does not distribute them to installed phones. [Release report and rollback](WEB-API-RELEASE.md). All original device/provider/physical and individual feature acceptance limits remain.
