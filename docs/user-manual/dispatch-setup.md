# Set up Dispatch and assign a driver

Open **Deliveries → Dispatch setup checklist**. Select the fulfilment branch. The four steps show current branch records; **Refresh setup** rechecks them after another person completes a task.

| Step | What it checks | Resolve missing items |
| --- | --- | --- |
| Branch | The selected branch exists and is active. | **Review branches** opens Operations Centre → Branches. Choose an active branch; ask the owner to review inactive or missing branch access. |
| Drivers | Registered drivers and active accounts marked available in this branch. | **Add a driver / Manage drivers & availability** opens Drivers. The owner creates or reinstates accounts; authorised staff confirm on-duty availability. |
| Vehicles | Active, LPG-suitable branch vehicles with a positive approved gas capacity. | **Register / review vehicles** opens Fleet & trips, where the owner can choose **Register vehicle**. Enter genuine approved capacities and suitability evidence; confirm the current password when requested. Managers can review trips but cannot register vehicles. |
| Operational readiness | An available driver on an active suitable branch trip, configured delivery windows/capacity/coverage, delivery ordering and operational assignment controls. | The driver opens **Home → Start trip**, selects an approved branch vehicle and enters the starting odometer. **Review delivery settings & coverage** opens the selected branch’s **Delivery & Dispatch** settings. Changes keep their existing proposal/approval controls. Owner-only release review does not enable dispatch automatically. |

Setup is checked per branch. Owners with several branches choose one; managers see only their authorised branch. A driver being available does not mean they have started a trip. A vehicle’s registered capacity is not a substitute for order inspection or custody evidence. Four ready setup steps do not certify that every order can be fulfilled.

From **Orders** or the **Dispatch Queue**, open assignment. Eligible drivers appear first. **Blocked drivers (count)** starts collapsed; expand it to see each driver’s exact blocker, responsible person and next step. Blocked and unchecked drivers cannot be selected. Resolve the task, then choose **Refresh eligibility**. If no driver is ready, the explanation and expandable blockers remain visible.

Select a ready driver, enter the assignment reason and confirm through the existing guarded workflow. The server rechecks current role/branch, driver availability, trip/vehicle, capacity, payment, inspection, stock and custody. A previously displayed ready option cannot bypass a new blocker. Read errors or changed branches clear the old setup result; refresh after reconnecting.

No setup button changes business records automatically. This web change creates no mobile binary and does not change existing production release decisions. See [verification](../dispatch-setup/README.md) and [traceability](../traceability/dispatch-setup-rtm.md).

The checklist is live on the existing client demo. At verification, Lagos had three setup steps ready; the missing step was an available driver on an active suitable-vehicle trip. The existing order also retained its own address/inspection controls. These records were left unchanged.
