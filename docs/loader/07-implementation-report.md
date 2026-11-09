# Loader implementation report

Shared central orange vector flame, themed disc/track and green orbit/endpoint implemented for existing web/mobile source. Typed bounded sizes, real-only monotonic progress, local wrappers, web reduced-motion/visibility pause, native accessibility/AppState/native-driven animation and presentation rollback flags included. Native SVG15.16.0 matches installed Expo58 mapping. Existing sidebar, auth/role routes, payment/stock/custody/dispatch/service/offline logic retained; no schema/API/server/provider changes.

Actual loader integration and deliberately preserved skeletons/splash/pull-refresh/queued states:02-integration-matrix.md. Initial gas-catalogue failure concealment corrected with existing AbortSignal API, retry and15s timeout. Mobile Feedback errors/empty/loading remain distinct and expose one progress target. Legacy web loading region260px retained; rollback inline indicator remains compact.

Evidence:584/584 full regressions (before final UI refinements),67/67 overlapping final focused cases including54loader cases; actual browser hydration/light/dark/390px/keyboard/history/failure/retry/timeout; final webpack build and web/mobile types; audits0; traceability2/2. Component/native host simulation is not real device validation. Isolated web component bundle estimate in bundle-observation.json; not route/native performance. Unrelated PDF fixtures restored and test PostgreSQL stopped.

Overall acceptance PARTIAL: actual iOS/Android startup/lifecycle/offline/photo, real OS reduce-motion, assistive tools/200percent zoom, low-end performance and native rollback remain NOT VERIFIED. Compatible SVG-enabled native runtime/build is needed for target acceptance; user has deferred native builds. No production deployment or mobile build performed, no new production readiness claim. Existing NO-GO remains. All18requirement sections/50scenarios/28gates retained.

Review local preview http://127.0.0.1:4177 (private test harness; sample progress is a test fixture, no orders/payment/data). Source changes remain local for review.

## Changed source and documentation

```text
 M .env.example
 M apps/mobile/App.tsx
 M apps/mobile/CustomerUI.tsx
 M apps/mobile/EasyRewards.tsx
 M apps/mobile/Services.tsx
 M apps/mobile/TechnicianScreens.tsx
 M apps/mobile/Workflows.tsx
 M apps/mobile/package-lock.json
 M apps/mobile/package.json
 M apps/web/app/theme.css
 M apps/web/components/document-library.tsx
 M apps/web/components/gas-order.tsx
 M apps/web/components/hosted-payment.tsx
 M apps/web/components/ui.tsx
 M docs/traceability/README.md
?? apps/mobile/EasyGasLoader.tsx
?? apps/web/app/loading.tsx
?? apps/web/components/easygas-loader.tsx
?? docs/loader/
?? docs/traceability/central-loader-rtm.json
?? docs/traceability/central-loader-rtm.md
?? packages/business-rules/src/loader-design.ts
?? tests/easygas-loader.test.ts
```
