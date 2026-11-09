# Mobile acceptance register

All 40 scenarios remain in scope. Baseline/final skipped tests are not device acceptance. Existing automated domain evidence does not imply each native scenario was executed.

| Scenario | Requirement | Result |
|---|---|---|
| MOB-01 | splash/logo | NOT_TESTED — complete native scenario pending |
| MOB-02 | onboarding sequence | NOT_TESTED — complete native scenario pending |
| MOB-03 | onboarding persistence | NOT_TESTED — complete native scenario pending |
| MOB-04 | reduced motion | NOT_TESTED — complete native scenario pending |
| MOB-05 | phone OTP abuse/expiry | NOT_TESTED — complete native scenario pending |
| MOB-06 | configured Google login | NOT_TESTED — complete native scenario pending |
| MOB-07 | assisted deep-link identity | NOT_TESTED — complete native scenario pending |
| MOB-08 | one-time profile completion | NOT_TESTED — complete native scenario pending |
| MOB-09 | session expiry/logout | NOT_TESTED — complete native scenario pending |
| MOB-10 | Home real data/empty states | NOT_TESTED — complete native scenario pending |
| MOB-11 | bottom/nested navigation | NOT_TESTED — complete native scenario pending |
| MOB-12 | cylinder capacity/quantity | NOT_TESTED — complete native scenario pending |
| MOB-13 | price/flat fee | NOT_TESTED — complete native scenario pending |
| MOB-14 | inactive location | NOT_TESTED — complete native scenario pending |
| MOB-15 | stock/custody rejection | NOT_TESTED — complete native scenario pending |
| MOB-16 | cart persistence | NOT_TESTED — complete native scenario pending |
| MOB-17 | duplicate checkout | NOT_TESTED — complete native scenario pending |
| MOB-18 | Paystack sandbox initialization | NOT_TESTED — complete native scenario pending |
| MOB-19 | forged webhook rejection | NOT_TESTED — complete native scenario pending |
| MOB-20 | duplicate webhook no duplicate posting | NOT_TESTED — complete native scenario pending |
| MOB-21 | ambiguous payment recovery | NOT_TESTED — complete native scenario pending |
| MOB-22 | invoices/receipts isolation | NOT_TESTED — complete native scenario pending |
| MOB-23 | order timeline | NOT_TESTED — complete native scenario pending |
| MOB-24 | realtime reconnect | NOT_TESTED — complete native scenario pending |
| MOB-25 | stale GPS state | NOT_TESTED — complete native scenario pending |
| MOB-26 | evidence history/privacy | NOT_TESTED — complete native scenario pending |
| MOB-27 | service booking/quotation | NOT_TESTED — complete native scenario pending |
| MOB-28 | technician permissions | NOT_TESTED — complete native scenario pending |
| MOB-29 | refill insufficient history | NOT_TESTED — complete native scenario pending |
| MOB-30 | rewards ledger | NOT_TESTED — complete native scenario pending |
| MOB-31 | notifications/consent | NOT_TESTED — complete native scenario pending |
| MOB-32 | theme persistence | NOT_TESTED — complete native scenario pending |
| MOB-33 | system theme changes | NOT_TESTED — complete native scenario pending |
| MOB-34 | no theme flash | NOT_TESTED — complete native scenario pending |
| MOB-35 | all modal/native surfaces themed | NOT_TESTED — complete native scenario pending |
| MOB-36 | responsive/accessibility | NOT_TESTED — complete native scenario pending |
| MOB-37 | Android/iOS lifecycle | NOT_TESTED — complete native scenario pending |
| MOB-38 | animation performance | NOT_TESTED — complete native scenario pending |
| MOB-39 | cross-account isolation | NOT_TESTED — complete native scenario pending |
| MOB-40 | existing web/admin regression | NOT_TESTED — complete native scenario pending |

## Gates

- APP-G01 — preflight/repository preservation: NOT_TESTED.
- APP-G02 — approved visual fidelity: NOT_TESTED.
- APP-G03 — cinematic splash/onboarding: NOT_TESTED.
- APP-G04 — auth/assisted onboarding: NOT_TESTED.
- APP-G05 — home/navigation: NOT_TESTED.
- APP-G06 — gas ordering/cylinder integrity: NOT_TESTED.
- APP-G07 — Paystack/invoices: NOT_TESTED.
- APP-G08 — tracking/evidence: NOT_TESTED.
- APP-G09 — services: NOT_TESTED.
- APP-G10 — account/refill: NOT_TESTED.
- APP-G11 — rewards/messaging: NOT_TESTED.
- APP-G12 — full theme coverage: NOT_TESTED.
- APP-G13 — offline/recovery: NOT_TESTED.
- APP-G14 — accessibility/device quality: NOT_TESTED.
- APP-G15 — security/ownership: NOT_TESTED.
- APP-G16 — nonbreaking regression: NOT_TESTED.
- APP-G17 — documentation/traceability: NOT_TESTED.
- APP-G18 — release restrictions: NOT_TESTED.

Executed: native typecheck; iOS export/release simulator build; MUI-01 preference unit test; RTM validator; regression 302 PASS / 12 SKIP / 0 FAIL. Driver navigation visually retained. Detailed device check evidence is in docs/mobile/evidence.
