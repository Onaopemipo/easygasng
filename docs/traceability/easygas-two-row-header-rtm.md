# Two-row public header traceability — 1 November2026

24 stable HDR IDs and10 H-G gates are retained. Implementation:24/24; verified requirements23/24; critical requirements1/1; responsive viewport coverage16/16 theme-width combinations; acceptance gates9/10PASS, H-G05 NOT_TESTED for actual200% zoom. HDR-15 remainsPARTIAL in the denominator. No claim of production release or complete accessibility certification.

- HDR-01: Two-row layout — VERIFIED_COMPLETE; H-G01
- HDR-02: Official logo and home link — VERIFIED_COMPLETE; H-G01
- HDR-03: Approved primary menu ordering — VERIFIED_COMPLETE; H-G02
- HDR-04: Verified navigation destinations — VERIFIED_COMPLETE; H-G02
- HDR-05: Exact/nested/anchor active states — VERIFIED_COMPLETE; H-G02
- HDR-06: Working public product/service/help search — VERIFIED_COMPLETE; H-G03
- HDR-07: Active delivery areas and calculator continuity — VERIFIED_COMPLETE; H-G03
- HDR-08: Actual cart quantity and route — VERIFIED_COMPLETE; H-G03
- HDR-09: Shared theme persistence — VERIFIED_COMPLETE; H-G03
- HDR-10: Existing signed-out auth flow — VERIFIED_COMPLETE; H-G03
- HDR-11: Role-aware signed-in account actions — VERIFIED_COMPLETE; H-G03
- HDR-12: Website/dashboard session and cart continuity — VERIFIED_COMPLETE; H-G04
- HDR-13: Keyboard and pointer account dropdown — VERIFIED_COMPLETE; H-G06
- HDR-14: Accessible mobile drawer and dismissal — VERIFIED_COMPLETE; H-G06
- HDR-15: Responsive widths and200% zoom — PARTIAL; H-G05
- HDR-16: Hero/anchor visibility — VERIFIED_COMPLETE; H-G01
- HDR-17: Keyboard/focus/contrast/reduced motion — VERIFIED_COMPLETE; H-G06
- HDR-18: Readable two-row dark mode — VERIFIED_COMPLETE; H-G01
- HDR-19: Truthful empty/error/loading states — VERIFIED_COMPLETE; H-G03
- HDR-20: Expired/revoked-session protections — VERIFIED_COMPLETE; H-G07
- HDR-21: Hero/calculator/cart/booking regression — VERIFIED_COMPLETE; H-G09
- HDR-22: Typecheck/build/test/lint reporting — VERIFIED_COMPLETE; H-G09
- HDR-23: Content integrity without dummy data — VERIFIED_COMPLETE; H-G08
- HDR-24: Preserve Git baseline and no deployment — VERIFIED_COMPLETE; H-G10

See machine matrix for files, actual data sources, security negatives and evidence; phase report for route/action map, commands, gate decisions and remaining verification.

## Search correction — 1 November2026

Added HDR-25 (server-authorised preview search; production excludes drafts) and HDR-27 (reactive products query/history).26 requirements now retained,25 verified and HDR-15 remainsPARTIAL.8 search/catalogue tests passed; real Gas Hose ->6kg ->Back browser verification confirmed result consistency. No item was published or priced by this correction. See easygas-header-search-fix test/browser evidence.
