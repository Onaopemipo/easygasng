# Initial setup release, superseded

Source1f83a40 / Ready dpl_6gJm697cEPqt5uEHLPJhH3NkJR7Y. Initial scoped read, responsive UI, role/branch denials and unchanged business snapshots pass. A final audit identified the need to inherit individual dispatch.manage revocations on the new setup read. The follow-up retains this evidence and adds the explicit guard and DS-SCOPE negative test. No business writes occurred. See current phase report for final source/deployment.

Both application-source CI runs (45295756574 and 45296964385) retained the same one failing historical Fleet source comparison: 1,247/1,248 tests passed, zero skips. The test-only continuation correction is recorded in [ci-failure.json](ci-failure.json); it leaves all application bytes and historical/tamper/native checks intact. These superseded results are retained as failure history and are not counted as accepted final CI.
