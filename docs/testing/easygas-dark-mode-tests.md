# Theme verification

Executed tests: `easygas-theme-unit-20261030.txt`; full regression: `easygas-homepage-regression-20261030.txt`; browser records: `easygas-theme-browser-routes.json`, `easygas-theme-public-routes.json`, `easygas-homepage-browser-evidence.json`, `easygas-homepage-clean-console.json`, `easygas-theme-public-console.json`.

There are 30 customer-route checks (15 routes × 2 themes) and 56 public/checkout checks (28 routes × 2 themes). They verify rendering, the resolved theme and document overflow; they are smoke checks, not exhaustive verification of every possible UI state. Representative dashboard, account settings, booking, authentication, cart, checkout, modal, notification, empty and loading states were also inspected. Screenshots cover 1440px, 768px and 390px homepages in both themes. Browser tests verify keyboard switching, preserved 2.5kg/Lekki/cart selections, cross-tab changes, refresh, the admin light boundary, mobile menu and Escape, and real public testimonial withdrawal.

`THEME-CONTRAST` checks dark token pairs, input borders and focus ratios; `THEME-BOOTSTRAP` checks invalid/blocked storage and system preference resolution; `THEME-ROLLBACK` checks the light-only deployment flag. OS-theme emulation and a complete assistive-technology audit were not claimed. There is no configured repository lint command; formatting, typecheck, tests and build are used instead.

A temporary hot-reload warning appeared while a dependency array changed during editing. A fresh final tab had no console errors. Broken image count was zero. The browser read API did not expose performance.getEntriesByType; no LCP, INP, CLS or field-performance result is fabricated. Production performance acceptance remains open.

The final transaction-entry browser check also verifies a commercial customer receives only the selected owned eligible transaction, can save with first-name preference without a custom display-name field, and can withdraw the synthetic draft. See `easygas-testimonial-entry-browser.json`.
