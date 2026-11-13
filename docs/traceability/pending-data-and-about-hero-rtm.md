# Pending data and About Us hero

[Machine-readable matrix](pending-data-and-about-hero-rtm.json) · [Executed evidence](../loader/evidence/pending-data-and-about-hero.txt)

| ID | Implementation and source | Acceptance |
| --- | --- | --- |
| LDR-DATA-01 | Web pages and widgets use the existing EasyGas loader while their APIs are pending. Dashboard snapshots match the selected scope, and same-scope refreshes retain confirmed dashboard values. | Partial. Seven Chrome checks passed across the Owner Dashboard, a branch-scoped Finance login, Customers and Inventory. The remaining web routes require individual browser acceptance. |
| LDR-DATA-02 | Native shell and selected workspaces use the existing native loader with the current session and business APIs. | Implemented, runtime unverified. TypeScript and shared loader checks passed. Installed iOS and Android acceptance remains open. |
| ABOUT-HERO-01 | The About page uses responsive WebP versions of the original delivery photograph and exposes it in the initial render. | Verified locally. Chrome decoded 23–92 KB assets while the catalogue response was held, at mobile, desktop and high-density desktop widths. The original was 2.18 MB. |

Implementation covers 3 of 3 requirements to varying depth. Full verification and gate coverage are each 1 of 3. There are no P0 requirements in this phase. Browser route coverage is bounded to 4 distinct routes (About Us, Dashboard, Inventory and Customers). Other web and native routes remain in scope for acceptance. The user added the image optimization during the loading-state work. The earlier central-loader matrix and production NO-GO still apply.
