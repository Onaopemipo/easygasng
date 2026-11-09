# Mobile implementation — partial

[Traceability](../traceability/easygas-mobile-rtm.md). Existing business modules retained. Added image-led onboarding, customer Home, Home/Orders/Services/Wallet/More navigation, account hub, invoice list/detail, visual cylinder tiles, device appearance controller and legacy theme bridge. Staff navigation remains separate. Approved existing artwork and real records only. No data migration or provider activation.

Executed: typecheck, appearance preference unit test, traceability validator, iOS export, actual Xcode release simulator build. Final regression: 302 passed, 12 skipped, zero failures. Simulator staff navigation retained; UI inspection prompted scroll-reset and icon fixes. Evidence: docs/mobile/evidence.

Outstanding: exact auth/order/account visual matching, native splash/waves, receipt PDF action, service/tracking visual refinement, complete semantic-token conversion, all-screen contrast/native surface review, all MOB-01–40 and APP-G01–18 device/business scenarios on iOS/Android. No full-phase acceptance or production readiness claim. Existing operational/payment/provider and NO-GO blockers persist.

[Executed simulator observations](../mobile/evidence/device-checks.md) and [dependency-aware task register](../mobile/blockers-and-tasks.md). Final installed-build visual recheck was blocked when the Mac locked; unlock requested. Earlier actual screenshots remain valid only for the observed build, as documented.
