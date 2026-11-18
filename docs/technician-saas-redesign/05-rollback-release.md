# Rollback and release

Current decision: PARTIAL / NO-GO for full native/physical acceptance; no automatic deployment. Review local source and actual evidence before any release. Existing permanent demo fulfilment and Paystack sandbox settings were not changed by this phase; live payment/provider/commercial NO-GO and import hold remain.

Baseline source:1a23e5337cd7e5a6541ede1ea61a65bab1343ee8. Dedicated branch `codex/technician-saas-redesign`. Unrelated pending driver demo documentation/evidence stays in the working tree. Do not reset the repository or overwrite those changes.

Rollback only this phase's reviewed paths: remove technician-only Admin integration, new technician web component/styles/helper and its scoped overview additions; restore the previous technician native presentation/local-shell config and BookingCard compatibility change only after reviewing later edits. Preserve canonical bookings, reports, photos, financial and audit history; no schema rollback or data deletion is required. Use `git diff 1a23e53 -- <reviewed path>` to review each patch and `git revert <this phase's eventual commit>` once committed, rather than a whole-worktree reset. Re-run scoped/role/financial tests and verify native and web before release.

The previous driver demo Ready deployment remains the rollback candidate documented in `docs/web-driver-trips/README.md`. This technician phase did not deploy or promote a candidate. Do not promote unverified native binaries as signed store/physical-device acceptance.

Disposable QA uses an explicitly isolated temporary PGlite dataset recorded in ignored `.data/technician-saas-qa.json` and localhost3104. No original local business or hosted database was mutated. Android Release APK targets emulator loopback10.0.2.2:3104; iOS local shell targets127.0.0.1:3104. Simulator-only iOS app/archive is not a distribution IPA. Stop only this phase's local server after device checks, and retain test drafts/evidence until review.

User-authorised release continuation: all pending source/evidence pushed and demo web deployed on19 November. See [release report](../deployment/20261119-technician-alerts-release.md). No new native build/export/install or upgrade of incomplete feature/native/audio/background/physical acceptance occurred. Earlier no-deployment statements describe the implementation phase before this explicit release authorisation.
