# Dependency-aware mobile work register

| ID | Work | Status / dependency | Can continue independently? |
|---|---|---|---|
| MUI-T01 | Final installed-build visual/accessibility label/replay check | BLOCKED: Mac locked at final CUA check; unlock requested | Native export, docs and tests continue |
| MUI-T02 | Exact auth/order/account visual fidelity and semantic token conversion | PENDING engineering; no external blocker | Yes |
| MUI-T03 | Branded native splash/waves | PENDING engineering | Yes |
| MUI-T04 | Receipt PDF action and finer service/tracking presentation | PENDING engineering; reuse existing APIs | Yes |
| MUI-T05 | Complete all 40 native scenarios and 18 gates | PENDING test execution; devices and configured workflows needed | Available isolated cases can continue |
| MUI-T06 | Payment sandbox, OTP, Google and provider acceptance | BLOCKED until approved providers/configuration; do not fabricate activation | Independent UI and domain checks continue |
| MUI-T07 | Production hosting/signing/launch | Existing production NO-GO and independent release gates | No live release; local work continues |

The existing full operations/release blocker registers and Excel import hold remain unchanged. Pending engineering is not classified as an external blocker.
