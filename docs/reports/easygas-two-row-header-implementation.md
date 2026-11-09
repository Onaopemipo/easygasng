# Two-row public header implementation — 1 November2026

Preflight CONDITIONAL_PASS. Git main has no HEAD, staged changes or tracked application baseline; all app content was already untracked. Scoped SHA256 baseline was recorded in easygas-two-row-header-preflight.json. Existing source and user changes preserved; no commit, push, reset, deploy, hosted provisioning, payment connection or production-record mutations. A real commit diff is unavailable on this unborn checkout; final scoped source hashes are retained instead.

Delivered larger official HD logo, wide real public search and delivery/cart/theme/account controls on the upper white row (semantic dark surface under Dark). All7 primary navigation links occupy a distinct72px deep-green second row, with icons, active pill/indicator and readable hover/focus. Business Supply remains a secondary destination. At smaller widths the hierarchy becomes compact brand/actions + area/search and separate green menu trigger with modal drawer. No mock contact/certification strip or unimplemented Product/Service chevrons were copied. Hero content/artwork and pricing logic remain unchanged; header is deliberately nonsticky to avoid obstruction.

Changed: new apps/web/components/public-header.tsx; new packages/business-rules/src/public-header.ts; new browser-only delivery-area-preference.ts; Site Header wrapper; GasOrder preference synchronisation; existing CustomerAccountMenu outside dismissal; scoped theme.css styling. No backend API, dependency or migration changed. Root theme provider, existing cart context and role-aware account menu reused. Search reads existing catalogue/services APIs; excludes unpublished products and returns actual encoded product/service routes and existing public help destinations. Active area options come from existing gas catalogue; per-identity session preference updates current calculator only. Server validation still controls orders.

Verified route/action contract: docs/navigation/easygas-public-header-route-matrix.md. Primary order: Home `/`; Order Gas `/gas-order`; Products `/products`; Services `/services`; How It Works `/#how-it-works`; About Us `/about`; Help `/help`. Business Supply `/business` secondary. Cart `/cart`; login `/login`; role-aware dashboard `/account` or `/admin`; customer orders `/orders`; settings `/account-settings`; logout existing session action. Details/native selects use actual destinations; no inert menus.

| Gate | Status | Evidence |
|---|---|---|
| H-G01 | PASS | Separate115px/72px desktop rows, official250px logo, hero directly below; screenshots |
| H-G02 | PASS |7-link canonical order, nested/hash matching unit tests, actual routes/anchor |
| H-G03 | PASS | Real search/products/service, location/calculator persistence, real cart, theme and account controls |
| H-G04 | PASS | Isolated customer login -> dashboard -> website retains session/cart; sign-out clears account controls |
| H-G05 | NOT_TESTED |16/16 theme-width checks pass; actual200% zoom remains unverified after user interruption |
| H-G06 | PASS | Applicable local keyboard/focus/target/contrast/reduced-motion checks; no full accessibility certification claim |
| H-G07 | PASS | Existing session/ownership/redirect/gas/stock/service negatives pass; no new backend privileges |
| H-G08 | PASS | Only actual counts/areas/catalogue; no dummy contacts/certifications copied |
| H-G09 | PASS |57 tests, typecheck, build, formatting; lint unavailable/not applicable |
| H-G10 | PASS | Route/design/test/report documentation,24-row matrix and evidence retained |

Requirement verification23/24 (HDR-15 PARTIAL); critical1/1; implementation24/24; acceptance9/10; viewport checks16/16. Remaining local verification is actual200% zoom. No approval is needed for the shipped local header work. Existing production prerequisites and overall production NO-GO remain unchanged; no release was authorised.

See docs/testing/easygas-two-row-header-tests.md for executed commands and honest limitations, docs/design/easygas-two-row-header.md for theme/responsive/rollback behaviour, and docs/traceability/easygas-two-row-header-rtm.json/.md for each stable requirement. Source/visual presence alone is not used to certify production acceptance.


### Gas Hose search correction

Header search now uses the existing server catalogue visibility policy consistently: published items in production, plus clearly labelled Preview product results only when the server authorises development preview. No product publication status, stock or price was changed. Products reads reactive URL search parameters so same-route query changes and Back/Forward update the filter.8 search/catalogue tests and browser Gas Hose ->6kg ->Back checks passed. Evidence prefix: `docs/testing/easygas-header-search-fix-`; screenshot `docs/screenshots/easygas-gas-hose-search-fixed-20261101.png`. Original200% zoom gap and production NO-GO remain unchanged.
