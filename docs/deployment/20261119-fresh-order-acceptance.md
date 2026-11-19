# Fresh customer order acceptance — 19 November 2026

**PASS for the fresh hosted wallet-order workflow.** New order **EG-2026-FD9F2C67** completed through customer checkout, dispatch, normal vehicle loading and acknowledgement, inspected pickup, departure, arrival, metered dispensing, uploaded proof and customer-code handover. Both customer and driver show Delivered at **06:05 Lagos / 15:05 Brisbane**,19November2026. Zero return was independently reconciled and the new duty trip closed.

All operational changes used the existing [demo](https://easygas-client-demo.vercel.app) UI. This run used **no hosted database connection, query or write**, seed, API mutation shortcut, direct status edit, stock adjustment, manual wallet credit or missing-custody recovery. No deployable source changed or redeployment was needed; the deployed application remains600b0fddd1a90e6c5edecfd5f81b2c539c6f5196. The original Demo customer account was reused with a genuinely new order; brand-new account registration was not part of this run.

## Actual sequence and authoritative evidence

| Stage | Observed result |
|---|---|
| Customer checkout |6kg refill in6kg capacity at₦1,800/kg,₦10,800 gas +₦5,000 delivery = **₦15,800**. Saved Victoria Island address,19Nov09:00–12:00 Lagos. Existing synthetic wallet payment verified. [Checkout](evidence/20261119-fresh-order/checkout-success-ax.txt) |
| Coverage and preparation |Owner confirmed configured coverage, accepted and prepared the order through normal order controls. [Execution record](evidence/20261119-fresh-order/execution.txt) |
| Cylinder registration |Normal intake of explicit virtual serial **DEMO-QA-FRESH-FD9F2C67** generated UUID`f8695fbc-d058-4f20-885d-8a84f188b2ea` automatically and placed it in quarantine. The ID was observed from the selected UI option, never supplied manually. [Registration](evidence/20261119-fresh-order/cylinder-registered-ax.txt) |
| Qualified inspection |User approved a one-hour demo-only renewal. Demo owner independently renewed Demo finance's cylinder_inspection through the normal qualification dialog,expiry06:55 Lagos. Finance reauthenticated, recorded explicitly simulated passing inspection/date2027-02-19 and6kg allowance/zero residual. Existing bulk qualifications and meter calibration were not renewed or changed in this run. |
| Trip and dispatch |Driver started new trip`09637fca-2f6a-4a34-bbda-537900034da5` on existing SANDBOX QA VEHICLE E8ED8AE8,synthetic odometer1000,GPS consent off. Owner assigned the inspected order normally. [Trip](evidence/20261119-fresh-order/trip-started-ax.txt) |
| Normal loading |Finance issued **6000g before pickup**,load`29233322-6e59-4054-894f-e89165978324`,existing meterSANDBOX-METER-E8ED8AE8/counter9000g,no buffer. No recovery action. [Issued load](evidence/20261119-fresh-order/normal-load-issued-ax.txt) |
| Driver custody and movement |Driver independently acknowledged6000g/counter9000,accepted assignment,confirmed inspected pickup,started delivery and recorded arrival. [Customer timeline](evidence/20261119-fresh-order/customer-timeline-ax.txt) |
| Invoice prerequisite |First dispensing correctly rejected because no immutable invoice had yet been issued. Finance used normal View invoice → reauthenticate → Issue immutable invoice. **EGI-0000000005** showed₦15,800 verified paid,₦0 due; no balance correction or extra payment. [Guard](evidence/20261119-fresh-order/dispensing-invoice-prerequisite-ax.txt),[issued invoice](evidence/20261119-fresh-order/issued-paid-invoice-ax.txt) |
| Metered dispensing |Driver retry accepted cumulative9000→15000g,exactly **6000g**,against the selected customer cylinder and allocation. [Dispensing](evidence/20261119-fresh-order/metered-dispensing-ax.txt) |
| Proof and handover |New generated placard explicitly says synthetic QA/no physical delivery. Uploaded through the real proof uploader with QA consent. Customer's own tracking UI revealed the code privately; it was hidden again and never logged or saved. Driver completed handover using it and the full-quantity confirmation. [Proof](evidence/20261119-fresh-order/proof-uploaded.jpg),[driver history](evidence/20261119-fresh-order/driver-delivered-ax.txt) |
| Return and trip closure |Driver declared0g; Finance independently received0g and reconciled the load. Custody history contains load.issued → load.acknowledge → dispense → fulfilled → return.declare → return.received,no recovery. Trip ended at synthetic odometer1000,GPS off. [Custody](evidence/20261119-fresh-order/load-reconciled-ax.txt),[closure](evidence/20261119-fresh-order/trip-ended-ax.txt) |

The operational sequence should include **Finance issuing the invoice before dispatch/departure**. Wallet checkout alone does not issue it automatically. The observed late guard and its normal UI resolution are retained in evidence; the successful result does not hide this prerequisite or claim unattended invoicing.

## Reconciliation

All **15 recorded UI checks pass**,derived from actual authenticated readbacks:[check results and source files](evidence/20261119-fresh-order/ui-final-reconciliation.json).

- Wallet:₦83,200 before → **₦67,400** after,one new **₦15,800** order-payment entry for`0ef2f7cf-f877-42cb-879a-531544c34368`. [Wallet history](evidence/20261119-fresh-order/customer-wallet-after-ax.txt).
- Stock:previous verified on-hand5991kg → **5985kg**,reserved13kg,available5972kg. The actual recent movements show one new−6kg fulfilment entry for this order and its earlier6kg reservation. [Inventory](evidence/20261119-fresh-order/stock-after-delivery-ax.txt). This is UI reconciliation and aggregate delta,not an independent global database-table/hash audit.
- New customer cylinder: **Filled**. Earlier customer/company cylinders retain their visible prior states. [Register](evidence/20261119-fresh-order/cylinder-filled-ax.txt).
- Customer can retrieve the single matching **paid invoice EGI-0000000005**,₦15,800 paid,₦0 due. Existing wallet ledger is the payment source; this wallet purchase did not create a new Paystack receipt or external card charge. [Customer invoice](evidence/20261119-fresh-order/customer-paid-invoice-ax.txt).
- Customer and driver show **Delivered**,normal timeline preserved; load6000g issued/6000g dispensed/0g returned/reconciled and trip closed.

The existing isolated **DLPG-04 regression passed1/1,0 failures/0 skips**,including normal checkout/intake/inspection/loading/pickup/handover,pre-load pickup rejection and idempotent inspection assertions. [Executed result](evidence/20261119-fresh-order/normal-checkout-regression.txt). Its isolated test-fixture SQL is separate from hosted operations; it made no changes to demo records.

[Traceability](../traceability/fresh-order-demo-20261119-rtm.md):implementation4/4,verified4/4,critical3/3,gates4/4,no exclusions. Final repository matrix validation is in[traceability-results.txt](evidence/20261119-fresh-order/traceability-results.txt).

This is synthetic web acceptance using an existing customer and sandbox wallet. All inspection,qualification,meter,proof and travel evidence is explicitly QA-only. No real gas,funds,physical certification or travel is asserted. New account registration,card/COD/provider,native,physical/formal-accessibility and global database-hash acceptance remain unclaimed. Existing production NO-GO,actual-import hold,retain-all and unrelated work are preserved. Time-limited demo qualifications expire normally.
