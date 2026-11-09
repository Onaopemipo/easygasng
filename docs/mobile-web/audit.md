# Mobile web correction audit — 10 November 2026

Scope: four reported mobile web defects. Existing native applications, identity, inventory and financial systems remain authoritative. No native build, server deployment, live gateway activation or real-data import is authorised by this correction.

Repository inspected before implementation: Site owns guest cart hydration/persistence and authentication; its catalogue-fetch effect also rehydrated the cart on home/non-home navigation. Authentication links discarded returnTo. CustomerWorkspace had no cart link after registration. Checkout selectors offered COD/wallet only, while existing Paystack orchestration supported invoice/service/wallet targets. Root route loading used the short section fallback. Next's viewport/loading guides were read before editing.

Browser baseline: local isolated synthetic demo on port3004, 320px/390px viewport. Public catalogue/home intentional horizontal carousels stay inside scroll containers. Registration inputs and header area selector computed at15px, making iOS focus zoom possible. Initial public page width did not reproduce global overflow at those widths; checkout/cart and authenticated layouts require continued checks. Do not claim a confirmed cause for all device-specific viewport observations.

Implementation: hydrate cart once, retain safe checkout return path, keep cart visible in customer header; mobile inputs16px and intrinsic-width/wrapping corrections; full-screen root fallback versus remaining-space page waits; direct order card obligation added to existing sandbox orchestrator, using owned authoritative order totals, fee consent and verified ledger. Existing invoice issuance/corrections take precedence once finance issues an invoice. Card orders remain unpaid and dispatch-blocked until verification. No new invoice numbering or payment service.

Migration073 adds a nullable FK and expands payment-target constraints, with no historical backfill/financial posting. Only isolated test databases may be migrated during verification. Managed deployment requires its normal migration step before new code. Existing production NO-GO and Excel import hold remain in effect.
