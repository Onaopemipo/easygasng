# Public website width QA

Local Chrome via Playwright on macOS, using an isolated synthetic EasyGas fixture. No orders, bookings, payments or enquiries were submitted. Captures are viewport screenshots. Footer crops are provided separately.

| Destination | 1920px | 390px | 768px |
| --- | --- | --- | --- |
| Home | [Before](evidence/before-home-1920.jpg) · [After](evidence/after-home-1920.jpg) | [Before](evidence/before-home-390.jpg) · [After](evidence/after-home-390.jpg) | [Before](evidence/before-home-768.jpg) · [After](evidence/after-home-768.jpg) |
| Order Gas | [Before](evidence/before-gas-1920.jpg) · [After](evidence/after-gas-1920.jpg) | [Before](evidence/before-gas-390.jpg) · [After](evidence/after-gas-390.jpg) | [Before](evidence/before-gas-768.jpg) · [After](evidence/after-gas-768.jpg) |
| Products | [Before](evidence/before-products-1920.jpg) · [After](evidence/after-products-1920.jpg) | [Before](evidence/before-products-390.jpg) · [After](evidence/after-products-390.jpg) | [Before](evidence/before-products-768.jpg) · [After](evidence/after-products-768.jpg) |
| Book a Service | [Before](evidence/before-services-1920.jpg) · [After](evidence/after-services-1920.jpg) | [Before](evidence/before-services-390.jpg) · [After](evidence/after-services-390.jpg) | [Before](evidence/before-services-768.jpg) · [After](evidence/after-services-768.jpg) |
| How It Works | [Before](evidence/before-steps-1920.jpg) · [After](evidence/after-steps-1920.jpg) | [Before](evidence/before-steps-390.jpg) · [After](evidence/after-steps-390.jpg) | — |
| About Us | [Before](evidence/before-about-1920.jpg) · [After](evidence/after-about-1920.jpg) | [Before](evidence/before-about-390.jpg) · [After](evidence/after-about-390.jpg) | — |
| Help | [Before](evidence/before-help-1920.jpg) · [After](evidence/after-help-1920.jpg) | [Before](evidence/before-help-390.jpg) · [After](evidence/after-help-390.jpg) | — |
| Business Supply | [Before](evidence/before-business-1920.jpg) · [After](evidence/after-business-1920.jpg) | [Before](evidence/before-business-390.jpg) · [After](evidence/after-business-390.jpg) | — |
| Home footer | [Before](evidence/before-footer-1920.jpg) · [After](evidence/after-footer-1920.jpg) | [Before](evidence/before-footer-390.jpg) · [After](evidence/after-footer-390.jpg) | — |

Chrome measured all eight destinations at 1920, 1600, 1440, 1280, 1024, 768, 390, 375 and 320 CSS pixels. All 72 destination/viewport checks passed. The shared shell measured 1440px including 40px gutters, with 240px side margins at 1920px and 80px at 1600px. The measured full-bleed bands filled the viewport. The public document had no horizontal overflow. The separate anchor regression check confirmed direct links and navigation from both Home without a fragment and Products. The measurement log also records the existing behaviour when clicking the same fragment already present in the URL after manually scrolling away. Signed-in customer `/account`, `/services`, `/help`, owner `/admin`, guest product and service details and guest `/how-it-works` matched baseline measurements. [Baseline measurements](evidence/baseline-browser.txt) · [Final measurements](evidence/final-browser.txt)

| Check | Result |
| --- | --- |
| Baseline Node test selection covering homepage tasks, navigation, compact gas quantity and product UI | Exit 0, 26 passed · [Log](evidence/baseline-tests.txt) |
| Final Node test selection adding public header, catalogue integration and professional services | Exit 0, 45 passed · [Log](evidence/final-tests.txt) |
| Chrome interaction groups | Exit 0, 8 passed · [Log](evidence/interactions.txt) |
| `npm run typecheck` | Exit 0 · [Log](evidence/typecheck.txt) |
| `npm run build` | Exit 0 · [Log](evidence/build.txt) |
| `node --import tsx --test tests/customer-traceability.test.ts` | Exit 0, 2 passed · [Log](evidence/traceability.txt) |
| `git diff --check` and phase source review | Exit 0. Four frontend source files in phase scope. Pre-existing unrelated changes are excluded from the phase. |

The final focused test command was:

```sh
node --import tsx --test tests/homepage-task-register.test.ts \
  tests/product-ui.test.ts tests/compact-gas-quantity.test.ts \
  tests/navigation.test.ts tests/public-header.test.ts \
  tests/catalogue-services-integration.test.ts tests/professional-services.test.ts
```

The fixture had no configured gas quantity policy, saleable catalogue stock or published bookable services. Chrome verified the displayed API prices, address inputs, gas sign-in handoff, catalogue search/category filters, unavailable cart actions and service empty state. Positive checkout, cart addition and booking were not replayed in-browser. Existing tests cover the associated quantity, catalogue and service rules. The Products route has category/search controls; no separate sort or pagination UI was added. Business Supply leads to `/contact`; there is no inline enquiry form on `/business`. Chrome verified FAQ expansion, the enquiry link, desktop navigation, mobile drawer keyboard focus and Escape, light/dark toggle and system theme response. Other browser engines, screen readers and native devices were not tested. The entire repository test suite was not run.

Release decision remains NO-GO for production. This phase was verified locally with the gaps above and was not deployed.
