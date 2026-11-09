# Design and route integration

| Approved feature | Existing route / implementation | Result |
|---|---|---|
| Dispatch Centre overview | /admin/deliveries; components/dispatch-centre.tsx | Management workspace only; grouped navigation unchanged |
| Six KPI cards / queues / filters / paging | dispatch.centre GET; canonical orders/users | Actual scoped records; no screenshot values; readiness unknown above250 probe candidates |
| Manual assignment drawer | dispatch.candidates GET → existing dispatch.assign | Eligible/ineligible reasons; authoritative write revalidation; automatic assignment OFF |
| Map / driver panel | Active authorised trips and GPS events | Map-free fallback; recent/stale/unknown contact and GPS distinguished; external map link only for actual authorised observation |
| Daily LPG and quick actions | Existing bulk, manifest and FleetPanel forms | Reused in secondary operational view, not duplicated ledgers |
| Order actions/history/proof | Existing DispatchTracking | Secondary view retained, including canonical mutation/recovery workflow |
| Driver web | Existing DispatchTracking / restricted driver APIs | Preserved |
| Driver mobile | Existing Home/Orders/History/Profile | Only foreground heartbeat integration; same existing photo/report actions, no new home cards |
| Customer/technician | Existing applications | Byte-preserved protected workspace files; no identity replacement |

The approved screenshot is a visual reference; the explicit preservation directive takes precedence over its different Operations sidebar. Consequently Delivery & Services remains the existing group and Deliveries remains its working route/label. No role selector or automatic assignment was introduced.

Manual priority is not an existing governed field. Priority currently means derived Overdue/Normal, not invented High/Low values. Bulk assignment is deliberately absent; individual assignment retains all final checks. An embedded map, proximity/ETA promises and unsupported fuel permissions are not fabricated to imitate the screenshot.

Log Fuel Purchase opens the existing trip/fuel records. Only an authorised driver can submit their own measured purchase through the existing workflow; opening this view grants no fuel or financial authority to administrators. All operational forms/history are retained.
