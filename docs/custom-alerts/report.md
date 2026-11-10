# Branded, friendly project alerts

[Traceability](../traceability/custom-alerts-rtm.md) · [Audit](audit.md)

Web window.alert/confirm/prompt call sites now use a shared EasyGas dialog provider: dirty-modal closure, protected form confirmation, reviewed reward reason and export failures. Clear Keep editing/Discard changes labels replace Cancel/OK for unsaved work. Safe cancellation is the default; Escape closes only the top alert and keeps the parent draft. Dialogs have accessible title/description, keyboard focus containment/restoration, scroll limits, theme colors and responsive stacked actions. Prompt input still enforces the required reason length; no business approval is implied.

The shared queue shows one dialog at a time, ignores stale/double responses and cancels abandoned form actions through AbortSignal. Async form submission captures its form element before waiting, so entered values survive confirmation. Queue cancellation never invokes a protected action. Native customer/driver/technician Alert.alert calls use a themed Modal provider with explicit buttons, Android dismissal, screen-reader announcement, queued callback handling and account-change cancellation. Offline/sync messages still state that the server has not confirmed delivery; signing out does not delete pending records.

A shared narrowly matched message formatter translates ISO/date, phone/format, network/timeout and technical internal errors. It preserves authoritative business/payment/safety/pending messages. Inline validation remains inline rather than creating excessive popups. No operation is reclassified as successful or paid by presentation logic.

Executed23/23 queue, message, call-site, dispatch preservation, datetime and password regressions; web/native types and web production build pass. Actual shared components checked in an isolated browser: default focus, Tab, Escape retaining parent/value, explicit discard, reason minimum/returned input, asynchronous form values, focus recovery, light/dark screenshots, and390px browser-frame bounds (350px card,20px margins). This is not physical-device or signed-native evidence. No business action, payment, permission change or customer data was used by the preview.

Original driver/technician dispatch source baselines remain archived; approved ALERT-03/PW-MIN02 exact hashes are recorded separately and enforced by DDI-AUDIT01. Customer/staff business functions and all backend guards remain. Native runtime remains PARTIAL; hosted rollout/retest and new native builds are not performed. Existing production NO-GO, retained-record/import holds and all other pending work remain.

Exception: browser beforeunload refresh/tab-close warnings are browser-owned and cannot be styled or replaced reliably. They remain to protect unsaved data. The in-app unsaved-change confirmation from the reported screenshot is custom.
