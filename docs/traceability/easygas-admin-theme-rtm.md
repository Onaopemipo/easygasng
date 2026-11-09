# Administration and staff themes — 30 October 2026

The user extended appearance controls to administration and other staff. This supersedes the previous phase’s administration light-only boundary. All roles using the shared administration shell receive the same accessible header switch; the existing public/customer controls remain available. Theme choices remain browser-local and preserve authentication and role-specific navigation.

| Requirement | Implementation and verification | Status |
|---|---|---|
| AT-01 Shared staff switch | Admin header uses the existing ThemeToggle; owner and technician switched modes in isolated browser QA | Verified |
| AT-02 Persistence and bootstrap | Shared resolver and pre-hydration script support admin paths; dark survived owner reload | Verified |
| AT-03 Readable workspace | Semantic surfaces, headings, tables, filters, menus, footer and service tabs; owner desktop and technician 390px mobile inspected | Verified |
| AT-04 Preserve role boundaries and rollback | Existing navigation regression checks; technician sidebar retained only bookings/services; rollback tests pass | Verified |

Implementation/verification/gate coverage: 6/6. Browser route coverage: owner dashboard/staff and restricted technician bookings, rather than an exhaustive screenshot audit of every module. Automated resolver coverage additionally includes settings/products/deliveries/finance. Existing navigation tests cover role visibility. No production deployment, payment integration, hosted migration or new privileges were introduced. Existing production NO-GO remains unchanged.

Machine matrix: `easygas-admin-theme-rtm.json`. Logs: `docs/testing/easygas-admin-theme-tests-20261030.txt`, browser notes and build log with the same prefix. Screenshot: `docs/screenshots/easygas-admin-dark-20261030.png`.

## AT-05 — inactive tabs contrast correction

Product category buttons now explicitly pair foreground/secondary and selected primary-foreground/primary colours. Hover preserves the active distinction; keyboard focus has a visible ring. Service and business settings tabs share the correction. The product search wrapper uses the input surface. Browser QA at `/products` checked actual computed colours, selected Accessories then All and confirmed the 12 products returned. Updated token contrast tests include secondary and accent backgrounds; screenshot evidence is `docs/screenshots/easygas-product-tabs-dark-20261030.png`. Service/settings selectors were reviewed in source; no claim of an exhaustive new route audit.

## AT-06 — public footer, 31 October 2026

Scoped the public footer and applied a deep green surface, white headings and links, muted body/copyright text, green hover accents and visible keyboard focus. Border separation and the existing HD logo plate remain. Browser verified both theme backgrounds and the corrected desktop footer. Automated token contrast includes the footer background. Evidence: `docs/testing/easygas-footer-theme-tests-20261031.txt` and `docs/screenshots/easygas-footer-dark-20261031.png`. No data, navigation destinations or release gates changed.
