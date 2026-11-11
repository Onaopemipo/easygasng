# Release CI repair

Run 42926443699: web passed 660 of 661 tests; EO-PG failed during overlapping fixture creation. Native typecheck passed; npm audit failed on node-forge 1.4.2. Node.js action deprecation warnings did not cause either failure.

The revised test passes on isolated PostgreSQL 17. The mobile lockfile resolves 1.4.3 with zero vulnerabilities reported by npm update. Hosted rerun pending; no deployment or mobile export.

Clean mobile install, typecheck and the unchanged moderate audit gate passed locally (zero vulnerabilities).
