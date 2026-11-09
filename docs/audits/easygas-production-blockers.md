> Current 2 November web + signed-native continuation: [release report](../reports/production-release-20261102.md) and [traceability](../traceability/production-release-rtm.md). Preserve historical findings below as audit history; do not treat resolved local PostgreSQL/partial financial refund/SMTP adapter gaps as current missing code. Actual provider, privacy, distribution/device and production acceptance remain open. NO-GO is unchanged.

# Production blockers and launch gates

**Current release decision: NO-GO for public commercial production.** A successful web build is confirmed. Deployment readiness, operational readiness and independent production certification are **not** confirmed. The user has explicitly chosen local hosting and unconnected payments; this report does not authorize changing either decision.

## P0 — confirmed integrity and safety controls

1. **R01 / F03:** connect serialised cylinder eligibility/inspection/custody to checkout, dispatch, POS and returns before claiming safe serialised-cylinder fulfilment. Currently a complete empty-cylinder delivery succeeds with no cylinder records. Physical safety compliance requires qualified review in addition to software controls.
2. **R02 / F02:** reject staff checkout into unauthorised branches.
3. **R03 / F01:** reject orders when fulfilment branch is inactive.
4. **R04 / F06:** revalidate delivery capacity when failed deliveries are reassigned/reactivated.
5. **R05 / F04:** prevent reissuing an already-held cylinder without a recorded return/authorised custody transfer.

Acceptance: regression reproductions must fail safely with zero unintended ledger/stock/order effects, then succeed under valid conditions; run under isolated multi-connection managed PostgreSQL and through applicable UI flows. No production records are to be used as test fixtures.

## P1 — essential before affected workflow launch

- **Runtime/continuity R06/R11/R23:** reviewed source baseline and CI, provisioned HTTPS app and restricted pg login, migrations, measured multi-connection transaction/failure tests, supervised worker/health/error alerts, off-site managed backups with restoration/rollback ownership. No hosted environment exists in current authorized scope.
- **Accounts/privacy R07/R08/R22:** proven email recovery/verification delivery, effective anti-abuse controls, approved privacy/terms/refund/delivery policy, data subject request fulfilment/retention and incident procedures.
- **Money/stock R14–R16/R25:** finance-approved cash/funding/credit liability reconciliation, complete reports, reward refund clawback policy, physical stock units/count/returns procedures. Existing immutable ledgers and independent finance approvals are useful controls but not full books.
- **Forecast/fulfilment R12/R17:** correct delivery/refill timestamp provenance, code renewal/reschedule/failure handling and accepted estimate limitations before reminder promises.
- **Web R13:** mobile homepage overflow and stocked browser acceptance for cart/checkout/retries/price changes. Add accessibility and realistic load/security validation.
- **Native R09/R10:** compatible dependency remediation, bundle/package IDs, branded app icon/splash, signed builds and real iOS/Android/offline/keyboard/lifecycle/security acceptance. Web release and native release may have separate approved scope/gates.

## Conditional blockers, not mandatory expansion

- Online payments remain intentionally unavailable. A clearly scoped COD/restricted-credit release does not require inventing a provider. Advertising online payment requires selected provider credentials, sandbox verification/webhook authentication/replay/refund/settlement/monitoring tests first.
- Full commercial account credit, contracts, negotiated prices and statements (R18) must be excluded until implemented and tested. A commercial role/public page alone does not qualify.
- Cylinder exchanges/deposits/recalls, offline POS/electronic POS and provider notifications cannot be advertised before their relevant operations and recovery controls exist.
- Optional advanced modules in the advanced-gap report do not block a narrower, explicitly approved launch; they do block a claim that the entire master specification is complete.

## Evidence required to change NO-GO

The responsible business owner must agree a concrete release scope. Engineering must close affected P0/P1 findings and retain acceptance evidence; finance must approve reconciled liabilities/revenue/cash rules; operations must validate safety/stock/dispatch and fallback procedures; privacy/legal must review actual notices/processes; platform must perform production-like restore/rollback/load/security checks; native lead must approve real-device readiness if native is in scope. Unknown gates remain open, rather than assumed passed. No data volume, uptime, financial loss, security certification or regulatory compliance has been inferred from green unit/integration tests.
