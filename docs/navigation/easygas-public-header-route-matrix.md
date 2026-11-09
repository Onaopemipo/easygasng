# Public header route matrix — 1 November 2026

All primary routes are reused from the existing Site router; all are public landing pages. Ordering, bookings and account mutations retain existing server-side authentication. Primary links appear in the separate desktop navigation row or mobile drawer. No Product/Service chevrons imply nonexistent submenus.

| Label | Actual destination | Icon | Active match | Test |
|---|---|---|---|---|
| Home | `/` | House | Exact path; excluded when How It Works hash is active | HDR-03/04/05 |
| Order Gas | `/gas-order` | Flame | Exact or nested | HDR-03/04/05 |
| Products | `/products` | Package | Exact or nested | HDR-03/04/05 |
| Services | `/services` | Wrench | Exact or nested | HDR-03/04/05 |
| How It Works | `/#how-it-works` | BookOpen | Homepage and matching hash | HDR-03/04/05 |
| About Us | `/about` | UsersRound | Exact or nested | HDR-03/04/05 |
| Help | `/help` | CircleHelp | Exact or nested | HDR-03/04/05 |
| Business Supply | `/business` | Secondary text link | Existing secondary public route | HDR-03/04/05 |

| Action | Destination/data | Authority and behaviour | Test |
|---|---|---|---|
| Logo | `/`; `/assets/easygas-logo-hd.png` | Official source asset, aspect ratio2172/724 | HDR-02 |
| Public search | `catalogue`, `services.catalogue`; existing product/service detail routes; `/help`, `/delivery`, `/contact`, `/track` | Only published product matches and active public services; named help pages. Enter/submit, loading, empty/error/partial states. Capped12 with truthful total and all-products search link. | HDR-06/19/23 |
| All product matches | `/products?q=<encoded query>` | Existing product search; no invented API or route | HDR-06 |
| Delivery area | `catalogue.gas.locations` | Backend-active areas only; per-identity browser-session preference; bidirectional calculator sync. Existing customer default may initialise label. No saved-address/order mutations or location-authorisation bypass. | HDR-07 |
| Cart | `/cart` | Existing cart quantity sum; zero badge omitted; signed-in count retained | HDR-08/12 |
| Theme | Existing ThemeToggle/root provider | Stored Light/Dark/System remains shared; accessible destination label | HDR-09/18 |
| Sign in/up | `/login`; registration via existing Auth link | Real session flow and safe return rules | HDR-10 |
| Account dropdown | Customer/commercial `/account`, `/orders`, `/account-settings`, `/`; staff `/admin`, `/account-settings`, `/` | Existing role-aware CustomerAccountMenu and logout; native details keyboard + Escape/focus return and outside dismissal | HDR-11/13/20 |
| Mobile navigation | In-page modal drawer | All seven links + Business Supply; Escape/backdrop/route close; focus trap/return and scroll lock | HDR-14/17 |

Cart/account session isolation and fresh authority remain server enforced. No payment, order, stock or qualification APIs are called by the header except existing logout. Read-only catalogue and owned navigation reads are reused. Direct route rendering remains in the existing catch-all router; header does not create permission grants.


### Gas Hose search correction

Header search now uses the existing server catalogue visibility policy consistently: published items in production, plus clearly labelled Preview product results only when the server authorises development preview. No product publication status, stock or price was changed. Products reads reactive URL search parameters so same-route query changes and Back/Forward update the filter.8 search/catalogue tests and browser Gas Hose ->6kg ->Back checks passed. Evidence prefix: `docs/testing/easygas-header-search-fix-`; screenshot `docs/screenshots/easygas-gas-hose-search-fixed-20261101.png`. Original200% zoom gap and production NO-GO remain unchanged.
