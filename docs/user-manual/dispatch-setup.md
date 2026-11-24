# Set up Dispatch and assign a driver

Open **Deliveries → Dispatch setup checklist**. Select the fulfilment branch. The four steps show current branch records; **Refresh setup** rechecks them after another person completes a task.

| Step | What it checks | Resolve missing items |
| --- | --- | --- |
| Branch | The selected branch exists and is active. | **Review branches** opens Operations Centre → Branches. Choose an active branch; ask the owner to review inactive or missing branch access. |
| Drivers | Registered drivers and active accounts marked available in this branch. | **Add a driver / Manage drivers & availability** opens Drivers. The owner creates or reinstates accounts; authorised staff confirm on-duty availability. |
| Vehicles | Active, LPG-suitable branch vehicles with a positive approved gas capacity. | **Register / review vehicles** opens Fleet & trips, where the owner can choose **Register vehicle**. Enter genuine approved capacities and suitability evidence; confirm the current password when requested. Managers can review trips but cannot register vehicles. |
| Operational readiness | An available driver on an active suitable branch trip, configured delivery windows/capacity/coverage, delivery ordering and operational assignment controls. | Choose **Assign vehicle to driver** in Dispatch, select the driver and an available branch vehicle, and enter the starting odometer. Confirm the on-duty checkbox only when appropriate and verify your own password. The driver can also use **Home → Start trip**. **Review delivery settings & coverage** opens the selected branch’s **Delivery & Dispatch** settings. Changes keep their existing proposal/approval controls. Owner-only release review does not enable dispatch automatically. |

Setup is checked per branch. Owners with several branches choose one; managers see only their authorised branch. An owner or branch manager can now start the vehicle trip directly from Dispatch without signing in as the driver. A driver being available does not mean they have started a trip. A vehicle’s registered capacity is not a substitute for order inspection or custody evidence. Four ready setup steps do not certify that every order can be fulfilled.

From **Orders** or the **Dispatch Queue**, open assignment. Eligible drivers appear first. **Blocked drivers (count)** starts collapsed; expand it to see each driver’s exact blocker, responsible person and next step. Blocked and unchecked drivers cannot be selected. Resolve the task, then choose **Refresh eligibility**. If no driver is ready, the explanation and expandable blockers remain visible.

Select a ready driver, enter the assignment reason and confirm through the existing guarded workflow. The server rechecks current role/branch, driver availability, trip/vehicle, capacity, payment, inspection, stock and custody. A previously displayed ready option cannot bypass a new blocker. Read errors or changed branches clear the old setup result; refresh after reconnecting.

No setup button changes business records automatically. This web change creates no mobile binary and does not change existing production release decisions. See [verification](../dispatch-setup/README.md) and [traceability](../traceability/dispatch-setup-rtm.md).

The checklist is live on the existing client demo. At verification, Lagos had three setup steps ready; the missing step was an available driver on an active suitable-vehicle trip. The existing order also retained its own address/inspection controls. These records were left unchanged.

## Assign a vehicle directly as an administrator

1. Open **Deliveries → Assign vehicle to driver** (also available in Operational readiness or the missing-trip warning).
2. Choose the branch if required, then the **Driver** and **Vehicle**. Only active drivers without an active trip and available LPG-suitable vehicles with approved capacity are offered.
3. Enter the actual **Starting odometer (km)**.
4. Leave **I confirm the driver is on duty — mark available for deliveries** checked only when the driver is on duty. Uncheck it to keep availability unchanged. This option is absent if your staff-management authority is revoked.
5. Enter your **Current password** and choose **Verify and assign vehicle**. The trip starts and Dispatch refreshes automatically; the driver sees it on Home. You can then assign an order normally.

Owners and branch managers can use this action within their authorised scope. GPS sharing stays off; an admin cannot give location consent for a driver. No driver sign-in or permanent vehicle/account change is required. A driver or vehicle already on a trip is listed separately: choose **Manage trip** to reconcile and end it or change vehicles directly. The existing payment, coverage, inspection, stock and custody checks still apply to each order.

On an incorrect password or failed save, entries stay in the form. Retry an uncertain save with the same entries so it cannot create a duplicate trip. **Refresh options** rechecks availability; edited entries require confirmation before being discarded. Closing a pending save is blocked. [Verification matrix](../traceability/dispatch-vehicle-rtm.md).

## End a trip or change its vehicle as an administrator

1. Open **Deliveries → Manage trips**. Select the branch and **Driver / current vehicle**. Alternatively, expand **Drivers already on a trip** in the assignment dialog and choose **Manage trip** beside the driver.
2. Review the current vehicle, starting odometer and reconciliation check. If blocked, use **Review product manifests**, **Review LPG custody** or **Review deliveries & returns**. Authorised operations/finance staff must complete the existing receipt, return and reconciliation workflows; refresh the trip afterwards.
3. Choose **End trip** to record the actual current vehicle ending odometer. Choose **Change vehicle** to also select a different available suitable branch vehicle and enter that replacement vehicle’s actual starting odometer. These are separate readings and may be different.
4. Enter **your own current password**, then choose **Verify and end trip** or **Verify and change vehicle**. Dispatch refreshes automatically. No driver sign-in is required.

Owners and authorised branch managers can use these controls. Ending is blocked by unreconciled product manifests, bulk LPG custody, assigned/in-transit deliveries and held delivery goods/cylinders. A stale trip, unavailable replacement or failed reconciliation cannot force a change. Changing a vehicle closes the old trip and starts the replacement together: if either part fails, the old trip remains intact. Nothing transfers or clears custody automatically.

Driver availability stays unchanged. Location sharing stops on the ended trip and stays off on a replacement trip; an admin cannot provide the driver’s GPS consent. Incorrect passwords clear only the password; entries remain for retry. Edited entries require confirmation before refresh, mode changes or dismissal; pending saves cannot be dismissed. [Trip management verification matrix](../traceability/dispatch-trip-rtm.md).
