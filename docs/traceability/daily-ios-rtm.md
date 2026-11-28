# Daily iOS driver acceptance traceability

28 November2026. **5/5 bounded requirements and gates verified;0 exclusions.** Parent DAY-05 retains physical camera/signed-device/full-offline holds. Original production NO-GO unchanged.

| ID | Requirement | Source of authority | Verification |
|---|---|---|---|
| DIO-01 | Daily driver acceptance, departure, Home/Work and vehicle views contain no normal meter/load/pickup/code steps | Scoped canonical orders, attempts, daily gas, payments and private photos | VERIFIED_COMPLETE · DIO-G-01 |
| DIO-02 | Record portable-scale before/after kg for exactly the paid amount with one physical stock debit | Scoped canonical orders, attempts, daily gas, payments and private photos | VERIFIED_COMPLETE · DIO-G-02 |
| DIO-03 | Current consented native photo upload,503 retry, blocked missing proof and server-confirmed delivery completion | Scoped canonical orders, attempts, daily gas, payments and private photos | VERIFIED_COMPLETE · DIO-G-03 |
| DIO-04 | Fresh office allocation at unchanged order version invalidates native readiness cache, preserving driver/branch authority and existing metered history | Scoped canonical orders, attempts, daily gas, payments and private photos | VERIFIED_COMPLETE · DIO-G-04 |

| DIO-05 | Normal iOS sign-in against shared demo, reassigned daily acceptance → scale → gallery proof → delivered | Same deployed order/stock/photo/audit authority; simulator-only gallery adapter | VERIFIED_COMPLETE · DIO-G-05 |

[Machine mapping](daily-ios-rtm.json) includes exact implementation files, data sources, security controls, executed tests, negative checks, evidence and limits. [iOS report](../daily-delivery/ios-acceptance.md), [parent matrix](daily-delivery-rtm.md). Simulator gallery selection is not physical camera capture. No new mobile binary was built or uploaded.

Hosted native continuation completed29 November2026: [full report](../daily-delivery/ios-hosted-acceptance.md) and [results](../daily-delivery/evidence/ios-hosted/results.json). Native EG-2026-2CC5FA2F completed against the shared demo with12.5kg and private proof. Simulator-only gallery flag adapter, user-assisted picker selection and final proof-copy renderer scope are explicit; deployed camera policy unchanged. Four feedback/navigation repairs,14 focused checks/native types and exact32-order/stock/Lagos preservation passed. No new TestFlight binary or runtime deployment.
