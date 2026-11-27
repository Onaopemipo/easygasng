# Early public gas price and flat delivery fee

[Machine-readable sources, controls and executed evidence](public-price-loading-rtm.json) · [Report](../public-price-loading/README.md)

| Requirement | Status | Gate/evidence |
|---|---|---|
| PLOAD-01 Initial visible pair; one fallback loader | VERIFIED_COMPLETE | Real server-rendered compact/full card, hosted first HTML, actual browser |
| PLOAD-02 Same-branch continuity and bounded deduplication | VERIFIED_COMPLETE | Remount/refresh/loader/retry renderer cases; branch/version/private-data negative tests |
| PLOAD-03 Canonical early reads and safe rollout | VERIFIED_COMPLETE | SQL count/pair identity; old quote/stock guard; Ready demo cf0031a;510 exact source hashes |

Coverage:3/3 implementation,3/3 verification,2/2 critical requirements,5/5 routes with **bounded price-rendering/read/negative-checkout evidence**,3/3 gates;0 exclusions. Route evidence is not a complete checkout/browser audit.19 focused regressions, types and build pass; additional root mirror checks pass. Existing production NO-GO and unrelated holds preserved.

The website may still show its normal route/page loading state. The loaded gas price/fee pair is no longer replaced by its own repeated spinners. No native binary, database migration or operational setting/order/payment mutation was performed.
