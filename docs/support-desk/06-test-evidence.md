# Test evidence

Baseline 18 tests passed. Combined focused suite: 65 passed. Web build and both
typechecks passed. SUPPORT-DESK01 covers authorised staff intake, cross-branch
rejection, ownership, private notes and totals beyond the latest 100 rows.
Isolated Chromium browser: empty state, staff popup, request creation, populated
thread, narrow single panel with no document overflow at 390px. Evidence in
evidence/. Signed-device and full acceptance remain pending.

## Completion verification

- `SUPPORT-C01`–`SUPPORT-C05` passed along with the restricted database-role regressions. PostgreSQL used independent connections for concurrent reply and attachment retries. See [focused evidence](evidence/completion-focused.txt).
- `SUPPORT-C06` verified request navigation, search, SLA configuration and enrollment, two-session refresh, private upload and preview, and the 390 px browser layout. See [browser evidence](evidence/completion-browser.txt).
- `SUPPORT-C07` verified native bearer requests against the isolated HTTP server. Both mobile bundles exported and types passed. Simulator UI could not be inspected, and signed physical-device acceptance remains open.
- Web build, web and mobile types, and production dependency audits passed. The native lockfile carries the existing node-forge patch. The existing service-booking concurrency test uses an explicitly seeded legacy overlap after verifying the normal API rejects overlap.
- Full release regression suite: 667 passed, zero failures or skips. See [suite totals](evidence/completion-full-suite.txt).
- Deployed to the client demo after a verified encrypted backup and additive migration. Hosted scope, attachments and SLA policy read checks passed. See [deployment evidence](evidence/completion-deployment.txt).
