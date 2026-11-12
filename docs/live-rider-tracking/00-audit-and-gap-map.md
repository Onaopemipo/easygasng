# Live rider tracking audit

Baseline HEAD `54b1b15`, branch `codex/notifications-centre`. The shared worktree already contained web, mobile, test and documentation changes for other phases. The preceding full regression recorded 676 passes in `docs/compact-gas-order/evidence/full-regression.txt`.

| State | Capability | Existing source or gap |
| --- | --- | --- |
| Existing | Native trip capture and local encrypted queue | `apps/mobile/driver-location.ts`, `DriverTripTracking.tsx`, `offline.ts`. Requests 30 m, 30 s and 60 s background deferral. OS scheduling and reconnect can delay capture or receipt. |
| Existing | Committed trip evidence | `apps/web/lib/driver-operations.ts`, migration 050. Driver-owned trips, consent, event sequence and conflict checks. |
| Existing | Dispatcher read and access | `dispatch-centre.ts`, service action privilege enforcement, owner and branch-scoped manager/dispatcher. |
| Existing | Customer scoped status stream | `tracking-stream.ts` and `/api/tracking/stream` revalidate orders every five seconds. Migrations 040–042 hold attempts and tracking events. |
| Existing | Road estimate | `dispatch-routing.ts` and migration 063. Governed OSRM provider, financial controls and manual fallback. |
| Missing | Customer rider-location projection | Orders returned an unavailable placeholder. Trips identify drivers and vehicles, with no direct attempt foreign key. |
| Missing | Embedded web and native maps | Web had a static unavailable state. Mobile had a status-only tracking summary and no map SDK. |
| Blocked | Provider and physical acceptance | Repository and locally visible environment expose no Google Maps key configuration. Cloud API enablement, quotas, referrer and package restrictions, device credentials and privacy approval require evidence from the configured projects. |
| Defective | Read-side temporal evidence | Dispatcher lookup did not constrain event actor and showed recent copy without checking delayed receipt. |

The implementation adds scoped projections and consent withdrawal to existing records. It keeps the existing local capture lease. Server-side replay verifies actor, branch scope, consent, trip window and event identity; an independently issued server capture lease is still open. New GPS writes with usable accuracy are checked against adjacent trusted observations within five minutes for implausible movement, with tolerance for reported accuracy. The provider remains off, and no database migration or historical rewrite was added.
