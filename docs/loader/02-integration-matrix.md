# Applied loading-state matrix

| Surface | Actual integration | Preservation |
|---|---|---|
| Website/auth/customer/admin/stock/cylinders/dispatch/services/orders/wallet/rewards | components/ui.tsx Loading backward-compatible adapter to SectionLoadingFallback; all existing imports retain their request ownership | Existing sidebar, route permissions, empty/error views and skeletons retained |
| Streaming route wait | app/loading.tsx section PageLoadingFallback, only while Next boundary suspends | No global event bus, full-page navigation block or artificial delay |
| Private documents | components/document-library.tsx genuine busy fetch | Private ownership, pagination, immutable snapshots and download links unchanged |
| Paystack verification/submission/bank request | components/hosted-payment.tsx small ActionLoadingIndicator inside existing busy buttons | Visible action labels remain outside graphic; verify/posted/queued states unchanged, no server animation dependency |
| Customer/driver/technician shared shell | mobile/App.tsx replaces actual catalogue/session ActivityIndicator | Role navigation/identity and retry/offline indicators unchanged |
| Customer fetches/shared role Feedback | mobile/CustomerUI.tsx Feedback actual loading state | Existing useRemote stale response cleanup/error/retry remains |
| Rewards/service/workflow fetches | mobile/EasyRewards.tsx, Services.tsx, Workflows.tsx | No wallet/payment/service-state rewrite |
| Technician authorised job fetch/history | mobile/TechnicianScreens.tsx loading indicator | Scope, approvals/payment/safety gates unchanged |
| Driver assignments | DriverWorkspace existing Feedback consumes shared component | No change to driver route/source, contact, queue or custody logic |
| Technician workspace | Existing shared shell and TechnicianScreens loading | No job transition changes |
| Dashboard skeletons, native pull-to-refresh, OS splash, theme/font bootstrap | Deliberately retained | No layout blanket replacement or startup white flash from altered splash |
| Camera/photo/offline report, notifications/SMS/WhatsApp/provider status | No existing spinner inserted where only queued/pending/busy labels exist | Never represent offline intent as transmitted or provider state as delivered |

No timer/percentage added to any business request. Existing busy flags still control button disabling; disabled does not automatically mean loading. Overlay/fullscreen variants are available but not inserted over local requests. Existing long-pending/error ownership defects noted in audit remain explicit acceptance risks, not hidden by claims of improved networking.

GasOrder initial gas catalogue GET: existing missing-config loading branch now terminates into explicit error/retry on503 or15s timeout; request uses api's existing AbortSignal option, timer cleared on completion/unmount and stale callbacks ignored. Pricing/order/payment methods unchanged. This is a targeted UI-state defect correction required to avoid concealing failures. Shared web Loading preserves its previous260px min-height via the existing loading wrapper. Mobile Feedback removes nested progress semantics and prioritises errors, with executed focused host-render checks.
