# Product catalogue redesign — 30 October 2026

The Products page now follows the supplied layout within the existing workspace shell. The sidebar, navigation menu and shared header remain unchanged. Five category cards show actual record counts. Search, category/status/location selectors, name/price/stock sorting, grid/list switching, publication badges, product illustrations or uploaded images, prices and branch stock are connected to existing data.

Add Product and Edit open the existing catalogue editor with the selected product. Owners retain content creation/editing authority. Row menus retain image/specification/category/variant/archive tools and links to existing pricing/publication approvals and inventory workflows. View Details includes SKU, original category, safety information and actual pricing/stock. Cooking gas shows the approved per-kilogram rate rather than legacy fixed refill prices. No screenshot prices, stock counts or locations were fabricated.

Location selection lets owners browse active branches; non-owners remain restricted to their current branch. The default All Locations entry keeps the existing current-branch scope, explained below the cards. It does not aggregate stock across branches. Broad visual categories group the existing detailed product categories; Service Materials displays zero when no such catalogue products exist.

Import Products accepts JSON files or pasted JSON with up to 25 new records. It validates and previews content, then creates unpublished, unpriced, zero-stock drafts through owner-only, recently verified server requests. Existing identifiers and SKU collisions are rejected without overwriting records, including concurrent insert collisions. Prices, publication and stock fields cannot be imported. Rows commit individually; a failure reports the completed count and stops, rather than claiming batch atomicity. No production or normal local business records were imported during QA.

Verification: web TypeScript passes; all 13 workflow tests pass, including protected import creation, duplicate non-overwrite, input rejection and branch access. Browser QA in the isolated synthetic database checked populated Edit, View Details, JSON preview (without saving), search, list/grid switching and desktop/mobile layouts. At 390px document width remains 390px. Card text and controls use the requested 15px minimum. No live payment, email or hosting integration changed.

Screenshots: `docs/screenshots/products-redesign-desktop-20261030.png` and `docs/screenshots/products-redesign-mobile-20261030.png`.
