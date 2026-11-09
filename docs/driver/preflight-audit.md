# Driver preflight audit — 5 November 2026

Audit completed before source implementation. main has unborn HEAD, no tracked/staged diff; 16 top-level entries untracked. Preserve all existing work. Source-only compatible snapshot: .data/driver-preflight-source.tgz. Existing customer Home/onboarding checksums recorded. Baseline:319 tests,307 PASS,12 SKIP,0 FAIL; web/native typechecks and web build passed. No lint script exists (NOT_AVAILABLE).

Expo58/React Native0.88 shared App.tsx/session/ThemeProvider; no separate delivery data store. DriverOperations.tsx currently exposes trip/fuel and old App driver navigation includes Products/Cart. OrderVisit.tsx exposes driver doorstep proposals. These are excluded from the new delivery-only workspace; do not delete existing finance/dispatch histories or rewrite their engines.

Canonical sources: users/sessions (auth.ts), orders/order_events and delivery_attempts (service.ts/operations.ts/order-tracking.ts), driver_vehicles/trips/dispatch_responses (driver-operations.ts), delivery_photos private bytes/hash/retention (delivery-photos.ts and /api/media), cylinder_allocations/order_gas_lines/inventory (fulfilmentReady), business_operation_results and durable order_event_outbox (business-operation.ts/order-tracking.ts). Existing completeDelivery atomically applies stock/custody, OTP handover and legacy COD collection. Legacy completion does not require a photo. Camera is currently disabled; existing DriverPhoto supports gallery-only queued encryption. Field queue is authenticated secretbox with SecureStore key, actor isolation and stable operation IDs; legacy completion queue contains cash.

| Requirement | Audit disposition | Existing files / safe reuse |
|---|---|---|
| D01 Splash | PARTIAL | Shared native launch; add driver-only thin native shell/brand loading surface, preserve customer launch |
| D02 Sign-in | EXISTING / EXTEND | Canonical email/password and activated phone; new driver-only sign-in must reuse throttle/hash/session and reject non-driver before issue |
| D03 Home/availability | MISSING | Real assigned orders exist; availability needs minimal additive canonical user state and audit; never equate it to connectivity/GPS |
| D04 Acknowledge/decline | EXISTING | dispatch.respond, direct assignments rather than offers; requires canonical version/assignment and independent dispatch notice |
| D05–06 progression | EXISTING / RESTYLE | delivery.pickup/arrived, order.transition, manifest and R01–05 readiness checks; no arbitrary status engine |
| D07 Proof | PARTIAL / EXTEND | Existing private upload/hash/consent/retention/history; camera/preview and completion proof gate missing |
| D08 completion | DEFECTIVE for new scope | Existing legacy engine includes COD. New restricted session must deny cash/finance and use photo+arrived+paid-only wrapper calling same completeDelivery; legacy operational compatibility remains explicit launch issue |
| D09 Orders/history | EXISTING / RESTYLE | orders is driver/branch-scoped; completed records read-only; preserve bounded polling |
| D10 Profile | EXISTING / RESTYLE | Existing account/profile/password/notifications/support; remove commercial features from driver UI |
| Offline/GPS | PARTIAL | Reuse encrypted field queue; add actor/version/reassignment reconciliation for order-status/photo records. Existing fuel/cash records retained for review, never silently replayed in delivery-only scope. GPS explicitly unavailable unless actual authorised source exists |

Scope conflict: legacy API/client driver sessions permit COD collection and photo-less completion. Silently changing those globally would break working business flows/tests. Add an explicit delivery-only session capability for the new workspace so its session cannot bypass the new restrictions through legacy actions. Legacy-client retirement/global policy remains a P0 operational cutover issue, not falsely closed by UI. The app must not independently edit stock, sales, finance or amendments.

Plan: additive052 user availability/session capability only; canonical login helper and scoped dispatch allowlist; new driver completion adapter delegates to existing engine inside existing idempotent transaction. Thin driver-native shell imports shared app; no duplicate auth/order/delivery/ledger model. New actions remain behind existing production release flags. No production migration/deployment, providers, financial policy activation or demonstration orders. Isolated synthetic fixtures only for tests.
