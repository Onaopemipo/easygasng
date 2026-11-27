# Daily iOS driver acceptance traceability

28 November2026. **4/4 bounded requirements and gates verified;0 exclusions.** Parent DAY-05 retains physical camera/signed-device/full-offline holds. Original production NO-GO unchanged.

| ID | Requirement | Source of authority | Verification |
|---|---|---|---|
| DIO-01 | Daily driver acceptance, departure, Home/Work and vehicle views contain no normal meter/load/pickup/code steps | Scoped canonical orders, attempts, daily gas, payments and private photos | VERIFIED_COMPLETE · DIO-G-01 |
| DIO-02 | Record portable-scale before/after kg for exactly the paid amount with one physical stock debit | Scoped canonical orders, attempts, daily gas, payments and private photos | VERIFIED_COMPLETE · DIO-G-02 |
| DIO-03 | Current consented native photo upload,503 retry, blocked missing proof and server-confirmed delivery completion | Scoped canonical orders, attempts, daily gas, payments and private photos | VERIFIED_COMPLETE · DIO-G-03 |
| DIO-04 | Fresh office allocation at unchanged order version invalidates native readiness cache, preserving driver/branch authority and existing metered history | Scoped canonical orders, attempts, daily gas, payments and private photos | VERIFIED_COMPLETE · DIO-G-04 |

[Machine mapping](daily-ios-rtm.json) includes exact implementation files, data sources, security controls, executed tests, negative checks, evidence and limits. [iOS report](../daily-delivery/ios-acceptance.md), [parent matrix](daily-delivery-rtm.md). Simulator gallery selection is not physical camera capture. No new mobile binary was built or uploaded.
