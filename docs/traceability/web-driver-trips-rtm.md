# Driver web trip controls

PARTIAL — hosted execution of EG-2026-7BB8640B exposed missing bulk LPG custody/metering controls in the driver web experience. Trip/inspection/assignment/pickup/arrival/proof succeeded; final handover was rejected. Existing public commercial production NO-GO preserved.

**4/6 requirements verified;1 defective and1 partial. 4/6 gates pass;1 fails and1 remains pending. 1/3 critical requirements verified.** All six requirements remain in denominators. [Named hosted execution and evidence](../web-driver-trips/demo-order-EG-2026-7BB8640B.md) · [Historical release](../web-driver-trips/README.md) · [Full matrix](web-driver-trips-rtm.json)

| ID | Requirement | Status |
| --- | --- | --- |
| DWT-01 | Start and manage own duty trip from driver web Home and Profile | VERIFIED_COMPLETE |
| DWT-02 | Preserve canonical trip ownership, branch, suitability, replay and custody controls | VERIFIED_COMPLETE |
| DWT-03 | Responsive, explicit consent and authoritative error/reconnect states | VERIFIED_COMPLETE |
| DWT-04 | Release to the synthetic demo with fulfilment enabled and Paystack sandbox | VERIFIED_COMPLETE |
| DWT-05 | Complete the paid synthetic delivery through the driver web interface without requiring the native app | DEFECTIVE |
| DWT-06 | Complete named hosted order EG-2026-7BB8640B entirely through the web | PARTIAL |

Historical66 focused checks, isolated browser workflows, web756/756/native CI and hosted read-only acceptance are preserved. They did not prove production-mode bulk gas fulfilment. The named hosted run changed authorised synthetic trip/order/cylinder/inspection/proof records; final delivery did not succeed. A user-approved short-lived cylinder qualification renewal was independently audited. Additional one-hour demo bulk renewals are now approved but not yet applied. Fulfilment remains enabled and Paystack sandbox; no new charge, guard bypass or live operation.

Simulator continuation (19 November): existing assignment/notification/timeline observed on the hosted-demo-connected iOS preview. [Evidence](../web-driver-trips/evidence/order-7BB8640B/simulator-assignment-observation.txt). No new assignment/charge/handover or GPS permission change; DWT-05 DEFECTIVE/DWT-06 PARTIAL and all denominators unchanged.
