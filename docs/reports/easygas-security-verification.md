# Security verification — local implementation

## Verified boundaries

The executed suite covers web-cookie/native-bearer authority parity, unauthorised direct API denial, stale/current roles, independent settings approvals, recent verification, branch restrictions, owned customer data, opaque sessions/revocation, exact credit/cash/refund replay, stock reservations and service safety restrictions. New tests exercise the full service path under the private-schema restricted runtime role; anonymous reads and immutable report/financial/history mutations remain denied.

New evidence includes double-slot/overlap rejection, current/expiring qualification checks, required independent qualified checklist review, itemised quote revisions/customer consent, material reconciliation, unsafe-outcome incident creation, report acknowledgement, private photograph access/report locking, image decoding, HTML escaping, matching mixed-checkout replay/rollback, compatibility review/expiry, follow-up consent/quiet hours/dedupe, owned export and readiness access. Bundle inputs cannot change approved quantities/discounts and work cannot start before linked product delivery.

## Audit finding remediation

| Finding | Current result | Evidence |
|---|---|---|
| F01 inactive branch accepted | Local fixed, zero unintended order/reservation | integrity-regressions.test.ts |
| F02 other-branch sales checkout | Local denied before write | integrity-regressions.test.ts |
| F03 serial-free empty-cylinder sale | Local checkout/POS/delivery allocation integrated; history without allocations fails closed | integrity-regressions.test.ts; cylinder-allocation.ts |
| F04 custody overwrite | Local return required; active sale allocation blocks generic issue | integrity-regressions.test.ts |
| F05 payment date used as refill | Fulfilment date/event provenance corrected | integrity-regressions.test.ts |
| F06 failed-delivery reactivation capacity | Capacity revalidated | integrity-regressions.test.ts |
| F07 mobile overflow | 390px page and viewport measured equal | screenshots/home-mobile-20261030.png |

## Remaining risk

No hosted PostgreSQL multi-session concurrency/advisor run or independent penetration test has occurred. Serial-sale safeguards do not establish a complete historical physical-cylinder classification/refill/exchange/recall system or regulatory certification. Qualification records require real verification and field acceptance. Policy publication does not establish accepted customer terms or privacy erasure operations.

Web dependency audit: zero known vulnerabilities in the executed registry result. Native audit: eight aggregate entries (three high, five low) through Expo's Zod3/deepmerge toolchain. See saved audit JSON and linked upstream advisories in `docs/security.md`; no unsupported downgrade/override was forced. No real credentials are embedded in source. Synthetic QA credentials/tokens are confined to fixture code/ignored isolated data and private temporary files, not production bootstrap.

In-process failure capture/auth budgets/private schema are useful controls but not a production WAF, monitoring service or security certification. Production is NO-GO; see outstanding work and twenty-gate readiness reports.
