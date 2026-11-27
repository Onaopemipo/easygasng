# Daily weighed gas delivery

This is the routine workflow for the business’s single delivery vehicle. It replaces per-order meter calibration/load issue and driver return declaration for **new daily runs**. Earlier metered trips and product deliveries keep their existing records and reconciliation controls.

## Configure once

1. In Owner settings, select the active branch (Lagos is the default), currency, gas price per kg, permitted order quantities, delivery area, delivery hours/windows and daily order capacity. Enable delivery and manual assignment for the branch.
2. Keep Cash on delivery **off** while the business accepts prepaid orders only. Configure the approved payment gateway, verified callback/webhook and the customer email/WhatsApp channel. A payment link being opened is not payment confirmation.
3. Create/activate the driver in the correct branch. Give office staff Dispatch and order-management privileges. Only Admin can confirm a closing weight difference; there is no second approver. Privilege denials and branch boundaries still apply.
4. Register the vehicle with its actual usable gas capacity and LPG suitability. Record actual stock receipts so available branch stock covers the loaded gas. Vehicle gas is part of branch stock, not a second stock balance.
5. Prepare a suitable portable scale. Optional “Scale reference” identifies the scale used. Do not enter a tank’s total gross weight as the opening or closing figure: those fields are **gas-only kg**.
6. Production infrastructure still needs verified database TLS, secure sessions, private photo storage, backups and approved provider integrations. The existing production NO-GO and feature holds are unchanged by this workflow.

## Start the day — office

Open **Dispatch → Today’s deliveries**. Choose the driver and vehicle (each is selected automatically when there is only one), enter actual opening gas-only kg and starting odometer, and confirm with your password. The driver is marked on duty; GPS consent is not enabled automatically.

Start the day once. Incoming orders use this same vehicle throughout the day. You can also open the daily setup card within a gas order’s **Overview**, without closing the order modal. Existing order reservations that fit are attached automatically; other orders can be assigned when gas is available. Actual available stock and vehicle capacity remain enforced.

If an earlier metered/product trip has open custody, finish its genuine reconciliation before starting the new day. Expand **Branch setup & earlier vehicle trips** for those management actions. Existing measurements are never invented, converted or erased. A current trip can be reused once all earlier custody is genuinely reconciled; its history remains unchanged.

## Take and assign orders — office/customer

- Customers select kg, confirm their delivery address and pay.
- For a phone call, staff create the phone order and send the scoped payment link. A first-time customer supplies their basic profile and address, then pays. Assign only after the server verifies payment.
- Confirm the real address/coverage and map destination in the order when required. Select an eligible driver and assign. The office modal then shows **Awaiting driver start**; the driver starts from their own app. It shows **Awaiting driver refill** and **Awaiting refill photo** until the current scale readings/photo are recorded. Refresh the order to see driver progress. A driver can receive more orders while already delivering; the whole day is not blocked by one assignment.
- For extra gas at the same customer/on the same visit, use **Extra order for this visit** on the original active order. It creates a separate prepaid order with **no additional delivery fee**. After verified payment it rejoins that visit/driver, subject to available vehicle gas. Do not create a normal unrelated order to waive its fee.
- Address confirmation, driver assignment and status updates keep the order modal open. Refresh the current record if another user changes it.

## Fulfil each order — driver

1. Tap **Accept order**, then **Start delivery**. Daily gas allocation is checked automatically; there is no per-order load declaration or cumulative meter entry.
2. Use the confirmed directions and contact the customer if needed. Confirm arrival.
3. Weigh the customer’s cylinder **before filling**. Record its actual scale reading in kg.
4. Fill the paid amount, then weigh the **same cylinder** again on the same scale. Record its actual after reading. The difference is gas added, so the empty-cylinder tare cancels out; the business does not register the customer’s cylinder. Do not put total cylinder weight into a “gas-only” field.
5. Tap **Save scale readings**. For multiple cylinders, add a row for each. Their combined increase must equal the paid quantity. Example: before **8.4 kg**, after **14.4 kg** means **6 kg supplied**. If readings differ from the paid amount, check the actual measurements or contact the office; never change evidence just to pass a check.
6. Take/upload the refill photo with the required consent, then complete delivery. The photo must belong to this visit and be captured after the recorded refill. A photo stored only on the phone is not yet uploaded.

Scale saves currently require a connection. A failed save keeps the entered readings while the screen remains open; reconnect and retry the same save before proceeding to the refill photo. Full offline scale/photo queueing and physical device acceptance remain outside this verified release.

Measured supply reduces physical stock immediately. Completing the photo/order cannot deduct that gas a second time. Do not cancel an order to release gas that has already been supplied; contact the office for proper review.

## Extra gas loaded during the day — office

In **Today’s deliveries → Add gas**, enter the actual additional gas-only kg and confirm. This is an addition, not a replacement opening figure. Stock must already include that genuine receipt and the vehicle must have enough capacity.

## Return and reconcile — office

Open **Close delivery day** and enter actual remaining gas-only kg plus ending odometer. The system shows:

**Expected remaining = opening gas + additional gas − scale-measured gas supplied.**

For example, 100 kg opening + 20 kg added − 36 kg supplied = **84 kg expected**. Record the actual closing figure even if it differs. A balanced close needs one authorised office confirmation. A difference needs **one Admin confirmation and an explanation**, retained in the audit trail.

Finish photos/completion for any gas already supplied before closing. For unsupplied ordinary orders, select **Carry forward orders that have not been filled**. Their payment and gas reservation remain; driver assignment resets so the next day can handle them. Same-visit extras must be completed or cancelled before the original visit ends, because they cannot silently move to another paid visit. Mixed product orders also require actual product handovers/returns before carry-forward.

Closing reconciles gas and ends the trip together. No separate driver return declaration is required. Historical metered/product custody must still be reconciled. A closed day’s measurements are immutable.

## Common messages

| Message | Action |
|---|---|
| Opening gas exceeds recorded stock | Review genuine receipts and outstanding reservations; do not create an artificial opening balance. |
| Day’s gas figures changed | Refresh the day, compare the new totals and enter the actual figure again. |
| Readings differ from paid quantity | Recheck actual before/after readings; contact the office for a real discrepancy. |
| Complete photo/delivery before closing | Driver uploads the current refill photo and completes the supplied order. |
| Driver/vehicle on another trip | Reconcile and end that trip, then start the day. |
| Network error after saving | Keep entered readings, reconnect and retry the same save. The operation key prevents a duplicate stock movement. |

Routine operational notes remain optional. Closing-variance explanations and required proof/measurements remain mandatory because they document a discrepancy or physical delivery, rather than an optional note.
