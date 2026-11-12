# Public website width audit

Baseline source was inspected on `codex/driver-experience-redesign` at `6a7522c`. The working tree already contained form-contrast work and generated evidence from earlier phases.

| Requirement | Destination | Existing entry and container |
| --- | --- | --- |
| PUB-01 | `/` | `app/page.tsx` → `Site` → `Home`; hero, benefits, home content, testimonials and coverage card |
| PUB-02 | `/gas-order` | `app/[...slug]/page.tsx` → `Site` → `GasOrder` inside `.container.page` |
| PUB-03 | `/products` | Catch-all → `Site` → `Products` with `.container.page` |
| PUB-04 | `/services` | Catch-all → `Site` → public service workflow inside `.container.page` |
| PUB-05 | `/#how-it-works` | Home → `HowItWorks` with `id="how-it-works"` inside `.home-content` |
| PUB-06 | `/about` | Catch-all → `Site` → `ContentPage` with `.container.page` |
| PUB-07 | `/help` | Catch-all → `Site` → `ContentPage` with `.container.page` |
| PUB-08 | `/business` | Catch-all → `Site` → `ContentPage` with `.container.page` |

Files above are relative to `apps/web` and route rendering is in `components/site.tsx`. Before the change, `app/globals.css` set the generic container to viewport width minus responsive margins, without an outer cap. `app/homepage.css` separately capped Home and its footer at 1,320px. Header utility and navigation rows in `app/theme.css` used independent fluid padding, and the outer header/hero/benefits/footer owned their band backgrounds. Existing gas-order grids constrain fields inside the editor. The homepage carousel has intentional internal horizontal scrolling.

`Site` also renders checkout, tracking, detail and account routes. Its existing `CustomerFrame` chooses the customer workspace for eligible sessions, including shared URLs such as `/services` and `/help`. `PublicHeader` and `Footer` are siblings of the public main and also render on excluded public routes. The width selector therefore needs both an exact destination allowlist and the existing workspace decision. Staff/admin and native shells use separate entry points. Data fetching, protected routes, submissions, prices, eligibility and payment are outside this phase.

Pre-change focused regression tests passed 26/26. See [test output](evidence/baseline-tests.txt). Browser baseline and post-change evidence are recorded in [QA results](02-qa-results.md).
