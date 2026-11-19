# Named demo web fulfilment — EG-2026-7BB8640B

**PARTIAL — final handover rejected, not delivered.** Actual hosted web execution on 18 November 2026 (Lagos); documentation completed 19 November (Brisbane). Requirement DWT-06 extends the existing [matrix](../traceability/web-driver-trips-rtm.json). DWT-05 is explicitly downgraded because the hosted run exposed a missing bulk LPG driver web workflow. All prior IDs, production NO-GO, physical/provider/device gates and historical import hold remain.

All operational writes below used the existing EasyGas web UI, with sequential existing owner, finance, customer and driver sign-ins. No API/database write shortcut, native app, new payment, live setting or safety bypass was used. Application source remains the previously deployed `c5bf616`; this run changes operational demo records and documentation only.

| Step | Actual observed outcome |
| --- | --- |
| Order | EG-2026-7BB8640B, canonical ID `c22eac68-f5e2-4ba4-8c26-6f02a028d24b`, 6 kg gas, 6 kg cylinder capacity, Lagos/Victoria Island |
| Financial baseline | Existing payment verified; gas ₦10,830 + delivery ₦5,000 = ₦15,830. No new charge or balance credit |
| EasyGas invoice | Issued EGI-0000000004 through owner UI after recent password verification; Paid invoice, effective total/net paid ₦15,830, balance ₦0 |
| Coverage/status | Explicitly labelled synthetic address review; accepted then preparing through valid status transitions |
| Driver trip | Primary Demo driver started existing SANDBOX QA VEHICLE E8ED8AE8 at synthetic odometer 1,000 km, 14:44 WAT. Location consent left off; no browser GPS permission or position inferred |
| Customer cylinder | SANDBOX-CUSTOMER-7BB8640B, ID `4214df22-8d80-4307-8a67-d7bb3655dcac`, 6 kg customer-owned intake linked through the named order, initially quarantined |
| Inspection guard | Finance inspection first rejected because the independently verified cylinder_inspection qualification had expired |
| Approved renewal | User explicitly approved one-hour demo-only renewal. Independent Demo owner submitted cylinder_inspection for existing Demo finance, DEMO-QA-7BB8640B evidence; audit technician.qualification_verified success at14:52:58 WAT. Submitted expiry19Nov00:51 Brisbane =18Nov15:51 WAT (less than one hour after submission). No role or live access change |
| Inspection/eligibility | Finance reverified password, recorded explicitly simulated passed inspection, next due2027-02-18; selected cylinder became empty. Recorded 6 kg allowable additional fill and zero-residual/customer-custody evidence in named gas line. Owner order readback: Inspection Recorded |
| Assignment | Owner selected Assign Driver and primary Demo driver; customer readback Ready for Dispatch/assigned driver Demo driver at14:55:09 WAT |
| Notification | Primary driver bell contained one unread Delivery assigned notification naming EG-2026-7BB8640B |
| Pickup | Driver acknowledged assignment, checked displayed 6 kg/serial manifest and submitted labelled simulated pickup; resulting status Picked up |
| Departure/arrival | Driver Start delivery then simulated arrival; resulting At destination. Scheduled window had already passed; no new ETA or physical trip asserted |
| Proof | Actual multipart upload of a generated placard explicitly labelled DEMO SIMULATION / NOT REAL DELIVERY EVIDENCE; UI Proof photo uploaded for this order. No real photo, face, interior or physical delivery claimed |
| Handover | Customer code obtained only from customer's own web Orders UI, entered privately in driver UI with synthetic full-handover acknowledgement. Server rejected: “Bulk LPG requires acknowledged vehicle custody and verified metered dispensing.” Code cleared before screenshot; not retained in evidence |
| Final observed state | Driver still At destination, active trip, one in progress, zero completed today. Order not delivered. Final stock debit/cylinder-filled state not claimed |

An unused company-owned fixture `SANDBOX-REFILL-7BB8640B` (`d697e9a0-6cb0-44b5-a3d7-91a74f126de3`) was initially registered. It was explicitly quarantined as unused and never allocated or filled; the actual refill uses the separate customer intake above. Earlier `SANDBOX-REFILL-E8ED8AE8` remained filled and was not reused.

The pre-run stock UI showed 5,997 kg on hand,13 kg reserved and5,984 kg available. No independent stock receipt or fabricated fulfilment was recorded. Final stock/custody reconciliation remains pending successful canonical handover.

The customer-visible EasyGas receipt `TEST-7e57b625-90ca-47e5-8228-2306eaa7cb6e` names this order and shows **SANDBOX — NO LIVE FUNDS**, verified principal **₦15,830**, processing charge **₦342.59**, total paid **₦16,172.59**. It reconciles to invoice EGI-0000000004's principal and zero balance. Verified collection does not prove merchant settlement. Fulfilment was left enabled; no Paystack/environment flag was changed.

## Remaining work and approval boundary

The production-mode guard in `apps/web/lib/bulk-lpg-reservation.ts` requires existing bulk allocation, acknowledged vehicle custody and exact metered dispensing. The deployed driver experience does not render `BulkLPGPanel`, although staff dispatch exposes it. The earlier isolated browser success did not exercise this production-mode obligation and cannot establish complete hosted gas fulfilment.

`bulk.load.issue` additionally requires independently qualified loading staff, a current calibrated vehicle meter and an order still assigned. The current arrived attempt therefore needs an authorised, audited recovery/reassignment path, rather than a silent backward status edit or late invented custody. Any meter registration/recalibration also checks metering qualification. Do not disable these guards or assume physical measurements from this simulation.

The user subsequently **approved one-hour demo bulk renewals** on19 November (Brisbane), independently verified and labelled DEMO-QA-7BB8640B. Approval is recorded; renewals will be submitted when the guarded web recovery controls are ready so their short validity is useful. No bulk renewal, meter certificate, load, dispensing or recovery has yet been submitted.

Next: use the approved short-lived renewals when ready, expose the canonical guarded driver web bulk workflow and qualification UI as needed, exercise production-equivalent bulk-enabled tests, deploy the correction with permanent demo fulfilment and Paystack sandbox intact, then recover/complete the same order through the web and reconcile actual stock/custody. No final delivery success has been inferred.

## Evidence

Actual CUA screenshots in [order evidence](evidence/order-7BB8640B): [trip](evidence/order-7BB8640B/trip-started.jpg), [renewal audit](evidence/order-7BB8640B/qualification-renewal-audit.jpg), [inspection](evidence/order-7BB8640B/inspection-passed.jpg), [assignment notification](evidence/order-7BB8640B/driver-assignment-notification.jpg), [pickup](evidence/order-7BB8640B/pickup-verified.jpg), [proof upload](evidence/order-7BB8640B/proof-uploaded.jpg), [blocked handover](evidence/order-7BB8640B/handover-blocked-bulk-custody.jpg), [final driver state](evidence/order-7BB8640B/driver-current-state.jpg), [invoice](evidence/order-7BB8640B/easygas-paid-invoice.jpg), [receipt](evidence/order-7BB8640B/easygas-sandbox-receipt.jpg). The PNG placard is a labelled synthetic upload fixture, not real delivery evidence. Historical focused test logs remain historical; no fake passing hosted test log was generated.

## Simulator assignment demonstration — 19 November 2026

Existing shared iOS preview was built with the hosted demo HTTPS origin and installed on EasyGas First Sign-In QA (iPhone15/iOS26.5). Demo Driver signed in through native UI. Home showed one delivery in progress and EG-2026-7BB8640B; the unread Delivery assigned notification opened its canonical order timeline. The simulator is left on order details. This demonstrated the existing assignment; no fresh assignment, stock movement, charge or handover was made. GPS permission remains Not granted and trip sharing Off, so this demonstrates order status rather than live map movement.

[Native observations](evidence/order-7BB8640B/simulator-assignment-observation.txt), [assignment notification](evidence/order-7BB8640B/simulator-assignment-notification.png), [order timeline](evidence/order-7BB8640B/simulator-assigned-order.png), [preview build](evidence/order-7BB8640B/simulator-preview-build.json). Prior missing web bulk workflow and handover gap remain unresolved; no production gate is waived.

## Hosted recovery completed —19 November2026

Explicitly authorised one-hour demo bulk renewals were recorded through the web with independent verifier accounts and DEMO-QA-7BB8640B labels (expiry05:11UTC/06:11Lagos). Existing meter SANDBOX-METER-E8ED8AE8 retained its identity and was renewed with equally short, explicitly simulated calibration evidence. No real certificate or physical measurement implied.

Inventory recovered current arrived attempt without status rewind into load4340bb3c-aa5a-48b6-bdc7-4a05a2aa0efe,6000g,0buffer,demo counter3000g. Original Demo driver independently acknowledged and recorded6000g dispensing to counter9000g,matching existing customer cylinderSANDBOX-CUSTOMER-7BB8640B. Existing valid consented synthetic proof and the privately obtained customer-owned code completed handover. Driver History and customer Orders showDelivered19Nov05:21WAT. Driver declared0g remaining;Inventory independently received0g and reconciled load;driver ended original trip with unchanged synthetic odometer1000/GPSoff.

[18 canonical checks](../deployment/evidence/20261119-all-fixes/named-order-final-reconciliation.json) pass:one6000g debit;on-hand5991kg,reserved13kg,available5978kg;customer cylinderFilled;prior pickup/arrival unchanged;unrelated orders preserved;original invoiceEGI-0000000004/NGN15830/balance0 and sandboxreceiptTEST-7e57b625-90ca-47e5-8228-2306eaa7cb6e/principal15830/fee342.59/total16172.59 unchanged. No new charge or financial ledger row. All historical blocked-stage evidence retained. DWT-05/DWT-06 nowverified for bounded synthetic web scope;commercial/physical/provider/native/import/retention gates remain.

[Delivered screenshot](../deployment/evidence/20261119-all-fixes/named-order-driver-delivered.jpg) · [independent custody receipt](../deployment/evidence/20261119-all-fixes/named-order-load-reconciled.jpg) · [final paid invoice](../deployment/evidence/20261119-all-fixes/named-order-final-paid-invoice.jpg) · [sandbox receipt](../deployment/evidence/20261119-all-fixes/named-order-final-sandbox-receipt.jpg).
