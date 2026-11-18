# Technician and driver alerts demo release — 19 November 2026

User explicitly authorised pushing all pending changes and deploying the existing web demo, with no new native build. This includes the technician SaaS redesign, driver assignment popup/chime implementation and all accumulated verification evidence. Previous reports that say no deployment describe their historical implementation phase; this continuation records the newly authorised release.

[Release traceability](../traceability/demo-release-20261119-rtm.md). Validation and deployment pending. No native build, export, installation or store release will be run. Existing iOS audible chime confirmation, Android runtime checks, remote background notification transport, hosted order EG-2026-7BB8640B handover and physical/provider/production gates remain incomplete. Commercial production NO-GO and Excel import hold remain.

Target: existing easygas-client-demo Vercel project. Inherit permanent fulfilment/tracking/bulk and Paystack sandbox settings without per-deployment overrides. Verify a Ready candidate before promotion; retain the prior Ready deployment for rollback. No database migration or operational/financial data change is part of this release.

Pre-push validation: focused feature/deployment/traceability suite passed; web and native TypeScript passed; native dependency assertions passed; web/native production audits report zero vulnerabilities. Exact logs are under `evidence/20261119-technician-alerts/`. New native build/export/install has not been invoked. Immutable source and GitHub/Vercel readback will be appended after release.
