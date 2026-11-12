# Driver data and permission contracts

| Screen | Server authority | Scope and fallback |
| --- | --- | --- |
| Home | `driver.snapshot`, `driver.heartbeat`, `driver.availability`, `notifications.list` | Restricted active driver and branch. Committed readiness is independent of connection, GPS permission and trip consent. Unavailable sources show no fabricated count. |
| Orders | `orders`, `dispatch.respond`, `delivery.pickup`, `order.transition`, `delivery.arrived`, `driver.complete` | Existing current driver and branch guards, acknowledged attempt and version, payment, custody and evidence checks. Read-only state while stale. |
| History | `driver.history` reads delivery attempts, recorded responses and terminal order events | Driver-owned attempts in current branch. Closed summaries omit customer contact and address data. Stable page ordering and Lagos date filters. Existing proof routes retain their own access and retention controls. |
| Profile | `driver.snapshot`, `driver.location`, `account.update`, `account.password`, `support.create`, `logout` | Own identity and active-trip vehicle only. Backend verification stays read-only. Native reads actual OS permissions and the existing secure local lease/queue. |
| Dispatch | Existing `/admin/deliveries` and dispatch APIs | Driver gets the scoped driver view. Staff retain the grouped administration shell and dispatch view. Manual assignment policy stays in force. |

The new history read uses existing records and needs no migration. Terminal outcomes require a recorded close, decline or cancellation. An elapsed authorisation alone does not create a historical event. No new customer contact, proof or GPS exposure is introduced.
