# Loader preflight and repository audit — 9 November2026

Before source edits: clean git status; main862344a. Node24.21.0; npm workspaces apps/web, independent apps/mobile lockfile. Next16.4.3/React19 web; Expo58.0.22/RN0.88.1 mobile. Driver/technician entrypoints reuse shared App and role workspaces. Existing Vercel demo, NO-GO, no native builds/signing/server work/live-provider activation unchanged. No schema or API changes planned.

Baseline: verified GitHub run42580549402 source89e5e8a (862344a changes evidence only):533/533 tests,0skip; web build/types/audit, mobile types/audit pass. Fresh local web/mobile typechecks captured in evidence. No lint script. No browser/native baseline performance measurement claimed.

Web inventory: components/ui.tsx Loading reused across admin, stock, dispatch, services, orders, wallets, customer and authenticated screens. Existing useAPI/resource loading owns network state; shared Loading does not own requests. Document library has local busy text. Payment submission/verification uses separate busy states and meaningful visible labels. Customer dashboard skeletons remain. Existing known risk: some legacy !data branches do not inspect errors; loader replacement cannot fix those underlying state owners safely and must not claim timeout guarantees for them. Existing explicit errors/retry are preserved.

Mobile inventory: App catalogue/session wait; CustomerUI Feedback and useRemote with live cleanup; EasyRewards, Services, Workflows and TechnicianScreens ActivityIndicator. Driver/technician share App. DriverWorkspace has action busy disables and retains explicit pending/offline text; no new global blocking loader. Native pull-to-refresh and native splash remain native. ThemeProvider currently returns null before preferences/fonts restore; preserve that startup handoff. Theme via web data-theme and mobile ThemeProvider, existing safe areas and navigation unchanged.

Brand: --orange #ff7900, dark/light surfaces from current theme; lime/green brand palette. No SVG files present. Existing1254px flame-transparent.png has edge artefacts, so reconstruct approved flame silhouette as a shared vector path rather than use raster crop. Green motion/track shades are presentation tokens derived from approved reference, not new business settings.

Native dependency assessment: react-native-svg absent. Expo's installed bundledNativeModules.json specifies15.16.0. Add only that compatible dependency for the shared SVG primitive; use existing React Native Animated with native driver, AccessibilityInfo and AppState. No Reanimated/animation library, no JS animation-frame loop, no native build. Installed development binaries may need a later rebuild to include SVG; iOS/Android real-target gates remain NOT VERIFIED. New runtime dependency is documented before lockfile edit.

Plan: shared vector/tokens/progress model; SVG web and mobile renderers; backward-compatible web Loading adapter; replace actual native indicators; local document/payment busy indicators only; scoped route fallback. Preserve skeletons, offline queue states, error/empty views, auth/payment/ledger code. Add feature-off fallback to old indicators for presentation rollback. Keep all50 scenarios and28gates in denominators, including blocked device/performance/manual accessibility checks.

## Actual app matrix and confirmed error-state finding

| Application | Entry/framework | Shared presentation |
|---|---|---|
| Website/customer web | apps/web/app/[...slug]/page.tsx, Next16.4.3/React19.3 | components/ui.tsx and contextual client fetchers |
| Administration/staff | apps/web/app/admin/[[...section]]/page.tsx, same Next app | Existing admin navigation and scoped components |
| Customer mobile | apps/mobile/index.ts, App.tsx, Expo58/RN0.88.1 | ThemeProvider, CustomerUI and role-conditional screens |
| Driver mobile | apps/mobile/driver/index.ts imports shared index | DriverWorkspace Feedback and shared App |
| Technician mobile | apps/mobile/technician/index.ts imports shared index | TechnicianWorkspace/TechnicianScreens and shared App |

Confirmed pre-existing defect: gas-order.tsx returned Loading whenever initial config was absent, even after its catalogue GET set error. Corrected only that UI request owner: local error/retry precedence,15s abort, unmount/stale-response cleanup; no API/quote/order semantics changed. Other named owners inspected (readiness, rewards, catalogue-tools, reconciliation, admin useData) already display errors before missing-data loaders. No claim that every legacy request has a bounded timeout. Mobile Feedback now uses one progress role and prioritises existing errors over loading flags.
