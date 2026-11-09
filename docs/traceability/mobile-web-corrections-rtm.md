# Mobile web corrections — 10 November 2026

Machine-readable source: [mobile-web-corrections-rtm.json](mobile-web-corrections-rtm.json). Repository findings: [audit](../mobile-web/audit.md). All four reported requirements remain in scope; previous production NO-GO, native build deferral and Excel import hold remain unchanged.

| ID | Requirement | Delivery and remaining acceptance |
|---|---|---|
| MWEB-01 | Device-width layout and usable mobile form fields | Explicit accessible viewport,16px mobile controls, bounded cart/form/grid widths and wrapping. Browser checks at320/390px pass; original physical-device zoom behaviour still needs iPhone Safari acceptance. |
| MWEB-02 | Guest cart survives registration | Cart hydrates once independently of catalogue refresh; auth links retain a safe checkout return; customer header includes cart count/link. Real registration in the isolated local demo returned to checkout with two Gas Hose units, retained through full navigation. |
| MWEB-03 | Customer credit/debit card checkout | Existing sandbox Paystack engine extended with owned order obligations, exact kobo fee disclosure, fee consent and principal-only verified posting. Products, gas and linked product/service checkout expose card when configured; My Orders can resume payment. Unpaid dispatch is blocked, prepaid deliveries collect no cash, existing invoice corrections take precedence. Official merchant-hosted sandbox/device acceptance remains pending; live payments stay unsupported/OFF. |
| MWEB-04 | Appropriate mobile loader centring | Root route fallback uses full viewport; page waits use a centred page container; section and button waits remain local. Actual390×844 route loader centre measured at195×422. No time-based payment success or fabricated progress. |

Coverage is reported separately in the JSON:4 implementation areas,4 acceptance gates and11 applicable routes remain in their denominators. Browser checks cover8 routes; combined checkout, My Orders payment resumption and provider return still need the fresh merchant-hosted browser journey. This is not whole-app production readiness.
