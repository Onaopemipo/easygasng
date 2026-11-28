# Deployed full-flow acceptance —28 November2026

The existing demo completed synthetic order **EG-2026-FB8DDC69** end to end. Actual Admin and Driver browser actions passed; no new application fix or deployment was required. Runtime remained16160a1 / Ready dpl_7DrsEXcvd7HVS6Ndw3cJmLWawAjq. [Results](results.json), [verification](verification.txt), [traceability](../../traceability/daily-assignment-rtm.md).

| Step | Observed result |
|---|---|
| Admin reassigns to today’s driver | Updated driver and reserved12.5kg automatically; modal stayed open and showed Awaiting driver start |
| Driver accepts and starts | No reason, meter calibration, load issuance or pickup-manifest step |
| Driver arrives and records scale |8kg before,20.5kg after;12.5kg supplied |
| Driver uploads evidence | Labelled synthetic photo selected through the actual file picker; consent required; upload succeeded |
| Driver completes | Delivered in History; customer order also Delivered |
| Office closes test day |25kg opening−12.5kg supplied=12.5kg closing; zero variance |

[Reassignment](02-reassigned.jpg) · [scale readings](05-scale-readings.jpg) · [photo uploaded](07-photo-uploaded.jpg) · [Delivered](08-delivered.jpg).

All positive writes used a new labelled QA branch, generated customer/drivers, synthetic wallet funding and separate25kg day. No real payment, message, calibration or physical measurement was represented as genuine. The test vehicle and scale values are synthetic. Photo description says SYNTHETIC DEMO TEST. Final stock was87.5kg from100kg test opening branch stock; fulfilled order commitment became0. Closing released the remaining vehicle reservation.

Negative checks rejected completion before refill/photo, an incorrect paid quantity, photo upload without consent and duplicate completion under a new operation identity. Prior-driver proof access returned404; anonymous access401; authorised current-driver/customer/Admin access200 with private,no-store caching. Each assignment/reservation/refill/completion audit occurred once. Duplicate completion left stock unchanged.

## Preservation and cleanup

Strict snapshot comparison did **not** pass unchanged:30/31 original order snapshots matched exactly; one original Lagos order retained status/driver/payment/total but advanced tracking4→5 with a6kg daily reservation audited at13:31:21UTC, after synthetic delivery completion13:29:51UTC. Lagos day commitment12.5→18.5kg and branch reservation85→79kg changed consistently with ordinary-to-day reservation transfer. The actor/session is not attributed here. Test script mutation inputs targeted the QA order/branch. No automatic rollback was attempted.

Original physical branch gas, Lagos opening/added/supplied/closing measured figures and Lagos settings matched their baseline. This is an explicit concurrent reservation exception, not a claim that the entire shared database was unchanged. The initial strict-comparison failure was investigated and retained in the results.

The synthetic day is closed, previous test trip ended, temporary delivery location hidden/inactive and branch delivery/wallet disabled. Generated drivers were suspended; known current test API sessions logged out. Synthetic order/audit/photo history remains labelled and retained. Existing business records were not reverted.

## Limits

This phase tested the deployed responsive Driver web workspace. It does not claim new signed iOS/TestFlight, offline or physical-camera acceptance. Historical production NO-GO and broader Dispatch18-case denominator with2 baseline failures remain. No schema or application source changed. The stateful hosted verifier records sensitive fixture state only under ignored .data; committed evidence contains no credentials/tokens.
