# EasyGas ordering, payment and delivery

This guide follows the approved doorstep refill model. The driver travels with a gas tank, supplies the purchased quantity into the customer’s cylinder at the address, records actual metering and photo evidence, and completes the order. Customer-cylinder registration and workshop inspection are not part of this ordering flow. Vehicle, equipment, qualification and physical custody checks still apply.

## Customer orders in the app or website

1. Choose the gas quantity and any products.
2. Choose a saved address or enter the recipient, phone, street and delivery area. Confirm the exact delivery pin using the map, current location or a full map link/coordinates. The pin must match the written address. Choose a delivery date and window.
3. Review the current total and payment method, then confirm. For card payment, complete the existing secure payment page. Only verified payment changes the paid state.
4. Follow the order in Orders: **Payment pending → Confirmed → Driver on the way → Delivered**. A cash-on-delivery order starts as **Order received** and remains unpaid until the authorised collection process records payment.
5. For a completed or cancelled order, open its details and choose **Order again**. This copies editable quantities and address details into a fresh checkout. Select a new date/window and review current prices, availability and payment. An unrelated cart is retained. An unresolved native checkout must be recovered before a repeat purchase can proceed.

A confirmed pin is reused only for the same written street and area. Editing either requires a new confirmation. Location permission is optional: use **Paste a map link or coordinates** if GPS is unavailable. Use a full map URL containing coordinates or latitude, longitude; shortened links cannot be resolved by the app. On Android the foreground-location and manual-link options remain available without a Google Maps key. Do not choose your present location if you are ordering for another address.

## Staff phone orders

1. Open **Orders → Create phone-assisted order**. Find the customer by phone/email, or add the new caller’s basic details. A returning caller’s saved address is offered; verify it with the caller.
2. Enter the quantity, delivery area, street, date and window. Review the current price and create the phone order. Routine explanatory text is recorded from the staff action; no repetitive operational note is required.
3. Stay in the same dialog at **Payment link ready**. Confirm that the customer requested the link. Choose **Open WhatsApp**, **Open email draft** or **Copy payment link**. The first two open your own messaging app with a draft: review and send it there. Opening a draft does not send it. Keep the private link confidential. Choose **Continue with order** to open the saved order directly without returning to the Orders list.
4. The customer opens that one link, completes basic profile and delivery details, confirms the pin, then pays. They do not need another sign-in. The order stays unpaid and cannot be dispatched until authoritative payment verification confirms it.
5. **Send with the configured messaging service** is available separately for the existing encrypted email/WhatsApp queue. A queued message is not proof of delivery. If the service is unavailable, use the user-app draft or copy option. Revoking the private link prevents its further use.

**Every phone order is pay first**, including an extra order requested while a driver is at the customer or travelling there. Use the original order’s same-visit extra-order action. The extra retains that visit’s driver/address and has **zero additional delivery fee**. It has its own payment, supply and proof requirements. Do not create an unrelated normal delivery to obtain the fee waiver.

## Dispatch: one workspace

Open **Deliveries / Dispatch Centre** and choose the correct Lagos operations date. Tomorrow’s scheduled orders appear under tomorrow’s date, not today’s.

- **Awaiting payment:** open the phone-payment-link action or the current payment/invoice details. Never mark an unpaid order as paid to unblock assignment.
- **Ready to assign:** choose **Assign Driver**, select a ready driver and confirm. The action records required acceptance/preparation and assignment together; a failed final check rolls the entire action back.
- **Assigned / on the way:** after assigning a driver, the same order modal stays open, shows **Driver assigned**, and refreshes the driver and status. Continue using the next action (for example, **Start delivery**) without reopening the order. Review the driver and actual order status. Assignment itself does not mean the driver has departed.
- **Needs attention:** use the direct action for the missing prerequisite. For address coverage, the dialog displays the actual street and approved coverage. Confirm only after reviewing them. The order modal stays open and shows **Address confirmed**; choose **Back to order** to continue with driver assignment. A customer pin provides navigation; it does not prove that an address is inside the business’s approved coverage.
- **Completed:** delivery history remains available.

Use **Refresh order** inside the dialog after the customer pays or the driver records pickup, arrival, supply or photo evidence. This reloads the authoritative order and next available actions without closing the dialog. A phone order remains blocked until payment verification has actually succeeded.

For gas-only tanker refills, **Confirm delivery** asks you to confirm the full supplied quantity and current-visit photo evidence; a customer confirmation code and cylinder registration are not required. The server still requires arrival, complete measured supply, a current photo and verified payment. Product and mixed deliveries retain their required customer confirmation code and handover checks.

The order modal stays open after every successful status update, including accepting/preparing the order, assigning a driver, starting delivery, recording a delivery failure, cancelling and completing delivery. It returns to **Overview**, shows the saved result and refreshes the status and next available actions. Delivered and cancelled orders stay open for review. Failed updates keep the current form open for correction; close the dialog when you are finished.

The **Dispatch setup checklist** shows branch, drivers, vehicles and operational readiness. Use its direct actions to resolve missing setup. Ready drivers appear first. Blocked drivers remain in an expandable section with their own missing requirements. An existing active order does not by itself block another assignment; capacity, trip, custody and order checks still apply.

### Vehicle and trip setup

Dispatch can assign an available, LPG-suitable branch vehicle to a driver and enter the actual starting odometer without signing in as that driver. Use **Assign vehicle to driver**. Vehicle registration and approved capacity/meter/calibration/qualifications must already exist. Do not invent odometer or safety evidence.

Use the existing loading/receipt actions once for the real trip/load. Subsequent orders reuse its genuine readiness; the order still needs enough allocated mass/products. A newly assigned order is not evidence that more gas was physically loaded. Use real available load/buffer and the existing allocation/extra-order controls.

Dispatch can review/end a trip or change a vehicle. Resolve active orders, unreconciled gas/products, measured return discrepancies and independent finance/stock reviews first. Enter the actual closing odometer. Vehicle change must close the old trip through those same checks before starting the replacement trip.

## Driver journey

1. **Accept order.** One tap; no acknowledgement text. Declining or reporting a problem still requires its actual reason.
2. Review **Vehicle gas readiness**. If gas is missing or awaiting receipt, choose **Open vehicle gas load**, have authorised Dispatch staff issue the real measured load for this order, then independently confirm receipt in **Trip & custody → LPG**. Return and choose **Refresh gas readiness**. See the [measured-load setup steps](dispatch-setup.md#accepted-order-waiting-for-vehicle-gas-readiness), including expired meter calibration. Acceptance remains recorded while this is resolved. Review the readable **Load for this delivery** summary. Physically check the allocated gas/products on the assigned vehicle, turn on **I checked the load for this order**, then choose **Start delivery**. Pickup confirmation and departure commit together. Missing acceptance, changed manifest, revoked access, insufficient/incorrect custody or other final checks prevent both.
3. Use the confirmed destination for directions. On arrival choose **I’ve arrived**. No routine typed arrival note is needed. If a legacy order has no valid pin, Dispatch must confirm a real destination through the existing protected route-planning action; do not guess coordinates.
4. Choose **Record supply and photo → Record dispensing**. Enter the vehicle meter’s actual new **cumulative reading in grams**, then confirm that you physically supplied the full ordered quantity and choose **Continue**. For example, a meter starting at100,000 g would read106,000 g after an actual6 kg refill. Enter the observed reading; do not enter just6,000 g or copy an example. The app records the supply against this order and its vehicle load.
5. Enter a short, accurate **Proof description**, confirm the customer’s photo consent and choose **Take Photo**. Allow camera access when requested. **Choose approved photo from Gallery** appears only when the business has approved that evidence channel. Cancelling the picker or denying permission does not create proof. A photo saved on the phone is initially encrypted and pending upload.
6. Choose **Synchronise Encrypted Proof** and wait for the server verification message. If a temporary upload fails, the encrypted photo remains on the phone; reconnect and retry synchronisation. A changed assignment or visit requires Dispatch review, rather than uploading the old photo into a new visit. **Profile → Synchronise pending records** also uploads retained evidence after reopening the app with the same account.
7. Confirm the full actual handover and choose **Complete Refill**. A gas-only tanker refill does not require a customer code or cylinder registration. Completion still requires verified payment, arrival, the full metered supply and the current driver’s consented photo for this visit. Wait for **Delivery completed**. Product/mixed deliveries retain their customer code checks.
8. A delivered order is separate from trip reconciliation. Continue to other assigned orders using the same genuine trip/load.

Start delivery needs a current connection. A network error leaves its outcome uncertain: reconnect, refresh and retry the same logical action. The app does not silently enqueue a physical departure for offline replay. Exceptions, shortages, failures and return discrepancies retain written reasons and the established review controls.

## End of shift

Declare actual remaining gas/products, obtain independent receipt, reconcile real measurements and recorded collections, resolve discrepancies, then end the trip in Dispatch with the closing odometer. Completing customer deliveries does not waive these checks. Physical work, payments and provider delivery cannot be established solely from a successful software test.

See [requirements and evidence](../traceability/seamless-ordering-rtm.md) for the exact software acceptance scope. Existing commercial-production NO-GO, provider activation, actual-import, retain-all and physical/signed-device gates remain separate.

## Latest iOS TestFlight build — 25 November 2026

For the latest ordering and driver screens, open **TestFlight → EasyGas → Update** and check that the version is **0.1.0 (5)**. It is available to the existing EasyGas Internal QA testers and connects to the synthetic client-demo backend. The Dispatch checklist, vehicle assignment and phone-order creation remain web admin actions. [Build, test notes and verification](../ios-testflight-refresh-20261125/README.md).

The subsequent25 November driver acceptance phase repaired native refill submission, camera configuration and photo upload/retry in source. Those repairs require a new signed build before they are available in TestFlight; build5 is unchanged. The [iOS driver acceptance report](../ios-driver-journey/README.md) distinguishes simulator results from physical-camera and signed-device checks.

## Optional operational notes

Normal order acceptance/preparation, initial driver assignment, pickup, arrival, delivery start, routine technician progress, authorised work start and rescheduling do not require typed operational notes. Add a short comment only when it helps. Blank notes do not prevent these actions; the audit history still records the action, actor and time.

A customer accepting a documented service or exact settlement may leave the comment blank. Declining still needs the actual concern. Cash-up notes are optional when the actual count balances; explain any discrepancy.

Cancellation, failed delivery/work, driver reassignment, returns, disputes, refunds and safety/financial decisions retain their actual reasons and required evidence. Actual loaded mass, meter readings, calibration evidence, supply/photo/consent, payment and reconciliation requirements remain mandatory. See the [field-by-field audit](../optional-operation-notes/field-audit.md). This source change does not rebuild TestFlight or alter hosted custody records.

## Meter and LPG load setup inside an order

For an assigned gas order, open **Details → Vehicle gas readiness**. **Renew meter calibration** records the actual new certificate for its displayed vehicle/meter and advances directly to **Issue LPG load**. The order and trip are preselected; enter only the actual required certificate/measurement evidence. Saves keep this same modal open. Both actions are also available from **Start delivery** or **More order actions**. The Business Owner handles calibration; qualified owner/finance staff handle loading. Pending saves cannot be dismissed; failed saves retain the original logical operation for retry. Driver receipt, acceptance, pickup and all reconciliation checks remain separate. [Detailed operating steps](dispatch-setup.md#accepted-order-waiting-for-vehicle-gas-readiness).

## Latest iOS TestFlight build —29 November2026

Open **TestFlight → EasyGas → Update** and verify **0.1.0(7)**. This supersedes the build5 guidance above and includes the latest daily delivery, reassignment/automatic reservation, scale refill, photo synchronisation/completion, sign-out and map validation changes. Existing EasyGas Internal QA testers use the same synthetic client-demo backend. [Release evidence and test notes](../ios-testflight-refresh-20261129/README.md).

Office staff start the daily gas-weight record and assign orders on the admin website. The driver accepts, starts delivery, arrives, records cylinder scale readings, uploads a consented refill photo and completes delivery. Normal daily scale orders do not need the old per-order LPG meter/load/pickup steps. Opening and closing figures remain actual gas-only weights. Physical camera, GPS/background/offline and signed installed workflow acceptance remain separately tracked.
