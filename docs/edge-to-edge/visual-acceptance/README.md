# Native role/device visual acceptance — 22–23 November 2026

**All 14 bounded iOS/iPadOS simulator role/device cases pass:** seven canonical roles on phone and tablet, zero exclusions. The user resolved Device Hub contention by authorizing EasyGas to finish first. Post-repair checks, software keyboards, form dismissal and QA cleanup are complete. [Exact observations](observations.json) describe each tested scenario; [37 unaltered captures](screenshot-manifest.json) include historical before-fix evidence. This closes the requested simulator visual pass, not physical-device or production acceptance.

| Role | Phone | Tablet |
|---|---|---|
| Admin / owner | PASS: overview, branch picker, account; current-source full-screen form, software keyboard, Keep editing / Close form | PASS: full-width overview, branch picker, Technicians, form, keyboard and repaired confirmation |
| Service Manager | PASS: dashboard, corrected icons, Dispatch loader and No active deliveries after repair | PASS: dashboard/icons, Dispatch loader, fleet loading and empty state |
| Inventory / finance | PASS: verified and Unavailable summaries, account scrolling | PASS: full-width summaries, Unavailable rows, scrolling/account |
| Driver | PASS: header/footer, no assignments, actual keyboard, Profile and cancel/confirm logout | PASS: full-width layout, missing trip/GPS states, Orders, Profile and cancel/confirm logout |
| Technician | PASS: home, Jobs/empty state, inline filter, Profile and logout warning | PASS: home, Jobs/empty state, filter, Profile, Dark/System appearance and logout warning |
| Customer | PASS: home, introduction/Skip, light/dark, loaded Orders timeline, account | PASS: home, introduction/Skip, long loaded Orders, actual landscape, restored portrait/account |
| Commercial customer | PASS: named account, loaded home, zero-credit/no-transactions Wallet | PASS: named account, loaded home, zero-credit/no-transactions Wallet |

Normal sign-out was observed for every tested session. These are representative visual scenarios, not every screen/theme/orientation combination or complete operational workflow certification. Denied/offline/malformed access and retry were executed in component tests; the simulator checks used real synthetic demo identities and read-only business views.

The initial Owner check used iPhone17Pro / iOS26.5 (402 points wide). Dedicated checks used iPhone15 / iOS26.5 (393 points) and iPadPro13-inch(M5) / iPadOS27.0 (1032 points portrait). Actual tablet landscape filled 1376 × 1032 points with usable bottom navigation. Release orientation configuration was unchanged. The development source connected to the synthetic client demo through our own Metro port 8084. The unrelated port 8081 was untouched.

## Issues repaired and rechecked

- **EDGE-UI-01 — blank standalone Manager Dispatch:** the optional fleet widget returned no content while access loaded or failed. The standalone route now shows loading, denied guidance and retry for offline/malformed responses. Only authoritative `navigation.access` delivery access permits fleet queries; the optional owner widget retains hidden behavior when unavailable. Phone and tablet loading/empty states were rechecked.
- **EDGE-UI-02 — generic Manager icons:** Dispatch, Customers and POS now use bus, people and desktop icons. Phone and tablet checks confirmed the mappings; navigation handlers are retained.
- **EDGE-UI-03 — confirmation hidden behind a full-screen form:** shared native dialog presentation now renders queued alerts inside the top presented screen. Underlying controls are hidden from touch/accessibility until the dialog settles; keyboard dismissal, root overlays, back/cancel, stale-action rejection and callback semantics are retained. Actual Add Technician forms on phone and tablet confirmed **Keep editing** retains the form and **Close form** dismisses it. No invitation was submitted.

The [additive source review](reviewed-source-changes.json) maps actual current bytes to the retained original canvas and committed FleetLocations baselines. The original phase review was not rewritten. Shared queue tests cover top/nested hosts, exactly-once confirmation, back cancellation and abandonment without executing a hidden action.

## Executed verification and boundaries

[Regression log](regression-tests.txt): **75 passed, 0 failed, 1 skipped**, 76 total. The existing PostgreSQL concurrency test requires an explicitly enabled disposable database; its skip is not counted as a pass. [Native TypeScript check](typecheck.txt) passed. Source proof also checks the new dialog implementation hash and rejects historical-baseline tampering.

[Preservation evidence](native-preservation.json) confirms all three original release artifacts retain SHA256, size and nanosecond modification time. **Zero new EasyGas builds, exports or application installations; no web/API deployment.** Two dedicated simulators reuse the existing cached official Expo Go 58.0.7 runtime; these two runtime installations are separately recorded in [provenance](runtime-provenance.json). Semantic repairs were loaded after clearing our development cache and reloading Expo Go. Previously installed release applications are unchanged.

QA sessions on the dedicated phone/tablet and earlier shared phone were signed out. Tablet portrait, System appearance/OS Light and Increase Contrast OFF were restored. Our duplicate compact QA window was closed, own Metro 8084 stopped, and Device Hub released. SmartInvoice was restored to the shared phone foreground; its splash advanced to Home during one stale accessibility-index action, with no business record, setting or source changed. The other chat was informed.

No order, payment, trip, invitation, qualification, branch grant or business setting was changed. Location/notification permissions and availability switches were not enabled. Local appearance/introduction choices and normal QA authentication were the only app interactions beyond read-only views.

EDGE-04/05 remain PARTIAL **only for broader physical Android/iOS and release-device verification**. Their completed simulator subset is explicitly recorded in the [matrix](../../traceability/edge-to-edge-rtm.md); none of the six requirements was removed. Existing production **NO-GO**, native/provider/physical-device, actual-import and retain-all holds remain unchanged.
