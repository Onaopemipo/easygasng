# Inventory badge stability

INV-BADGE-01: VERIFIED_COMPLETE. Each background refresh previously emptied all counters before fetching replacements. Confirmed counts now remain in memory with an updating label, and failed refreshes display an explicitly stale count/time and dashed indicator. Fresh zero removes the badge; missing initial data never invents a count. Existing authentication failure/logout clearing and role/branch access remain.

13/13 navigation/rendering/traceability checks passed; web types and local/cloud builds passed. Actual hosted browser showed Inventory4 before, during and after Refresh information, then4 on the loaded Inventory route. Stale/failure/zero/revoked-grant cases were tested through actual component rendering. [Full source/data/security/test mapping and evidence](inventory-badge-rtm.json).

Demo deployment: dpl_D8tyZ2BAGZMXp5dFQECzrz1sDKg5; stable URL https://easygas-client-demo.vercel.app . Initial first-load still shows a truthful unknown/loading state. Original production NO-GO, retained records and historical import hold remain. No business stock or notification data was changed by this fix.
