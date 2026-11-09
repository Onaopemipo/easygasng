# Authorised demo shopping setup

Bounded setup complete:3/3 requirements and1/1 gate verified. Production NO-GO and Excel import hold remain. [Machine-readable requirements](shopping-demo-rtm.json), [operation instructions](../operations/mobile-demo-accounts.md).

| ID | Requirement | Evidence | Status |
|---|---|---|---|
| SHOP-01 | Isolated, audited test stock only | Guard rejects production/hosted config; exact fixture lock ownership; receipt replay stays20 units per cylinder and1,000kg bulk | VERIFIED_COMPLETE |
| SHOP-02 | Independently approved demo quantity limits | Manager proposal / owner approval; canonical catalogue0.5–50kg/0.5 increments | VERIFIED_COMPLETE |
| SHOP-03 | Add stocked product to cart; preserve unavailable guards | Browser cart1x6kg cylinder; unpriced accessory disabled; actual screenshot | VERIFIED_COMPLETE |

Executed23 targeted tests:22 inventory/gas regressions and1 fixture guard,0 failures. Web TypeScript passes. Source: scripts/prepare-shopping-demo.ts, apps/web/components/site.tsx; existing receipt, gas and governance APIs. Evidence: docs/shopping-demo/evidence. User explicitly authorised synthetic local stock on6 November2026. Stock reasons/references identify DEMO-SHOPPING. No order, payment, business import or production rollout. Checkout still requires separate delivery/payment activation. Do not migrate this dataset to production.
