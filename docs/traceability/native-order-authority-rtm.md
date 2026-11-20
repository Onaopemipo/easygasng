# Native Orders authority repair

21 November 2026. [Machine-readable matrix](native-order-authority-rtm.json) · [executed evidence](../native-order-authority/README.md).

| Requirement | Purpose and implementation | Acceptance | Status |
|---|---|---|---|
| MORD-01 | Resolve ORDTXT-F01 through `CustomerOrderRefunds` and shared role/order-ownership guard | Seven-role component matrix, real API denials, owner delivered-order simulator readback | VERIFIED_COMPLETE |
| MORD-02 | Customer-only doorstep consent/excess actions; staff keep authorised reads | Actual OrderVisit components across seven roles; owner invoice read after reload | VERIFIED_COMPLETE |
| MORD-03 | Valid selected quantities, explicit purchase-credit consent and retry/idempotency safeguards | Invalid/empty/loading/failed/stale reads; duplicate taps; same-key retry; real pending refund and independent approval tests | VERIFIED_COMPLETE |
| MORD-04 | Verify preview, documentation and artifact preservation | Typecheck, 18 regressions, two API tests, five prototype checks, owner iOS observation; unchanged native artifacts | VERIFIED_COMPLETE |

Gates MORD-G01–G04: **4/4 pass for this repair**. Implementation and requirements 4/4. Component/API roles 7/7; subsequent [MDEV-01–04](mobile-device-acceptance-rtm.md) supplies representative device roles **7/7** and actual Orders, visit and customer/commercial refund observations **3/3**. All seven sibling components are rendered natively in that follow-up, including one separate legacy harness. No exclusions; the inactive legacy route and unrelated release limits remain explicit in the current matrix.

Authority stays with existing authenticated orders, scoped refund/visit/invoice APIs, independent review and immutable financial evidence. No backend permission or financial rule change. **ORDTXT-F01 resolved in source/Expo preview.** Production NO-GO and unrelated holds remain; no new binary, install, private-prototype publication or hosted financial writes.
