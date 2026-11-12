# Driver experience release report

The four driver screens are implemented on the existing web route and native driver workspace. Server-scoped History, actual dispatch statistics and confirmed destinations replace previous partial or inferred reads. No business settings or operational data were migrated. The grouped staff sidebar and Dispatch Centre retain their existing route and staff access.

[Design and changed surfaces](02-design-implementation.md) · [Source and API contracts](01-source-contracts.md) · [Test evidence](04-test-results.md) · [Requirements traceability](../traceability/driver-experience-redesign-rtm.md) · [Rollback and release](05-rollback-release.md).

Production remains **NO-GO**. Physical-device GPS, lock-screen and offline handover acceptance, standard Android release validation, and comprehensive accessibility and theme checks remain open.


## Changed source

- `apps/mobile/DriverWorkspace.tsx` and `DriverPhotoHistory.tsx` — native driver navigation and views, attempt-specific evidence reads.
- `apps/web/components/driver-experience.tsx`, `driver-experience.module.css` and `admin.tsx` — responsive driver workspace in the existing shell.
- `apps/web/lib/driver-workspace.ts`, `service.ts`, `delivery-photos.ts` and `apps/web/app/api/[action]/route.ts` — scoped reads and integration with the existing driver and private-media actions.
- `packages/business-rules/src/driver-experience.ts` — shared outcomes, date and destination formatting.
- `tests/driver-experience-redesign.test.ts`, `tests/dispatch-centre-safety.test.ts` and the phase source manifest — driver regressions and preservation checks.
