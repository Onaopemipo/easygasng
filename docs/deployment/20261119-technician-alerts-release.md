# Technician and driver alerts demo release — 19 November 2026

User explicitly authorised pushing all pending changes and deploying the existing web demo, with no new native build. This includes the technician SaaS redesign, driver assignment popup/chime implementation and all accumulated verification evidence. Previous reports that say no deployment describe their historical implementation phase; this continuation records the newly authorised release.

[Release traceability](../traceability/demo-release-20261119-rtm.md). Validation and deployment pending. No native build, export, installation or store release will be run. Existing iOS audible chime confirmation, Android runtime checks, remote background notification transport, hosted order EG-2026-7BB8640B handover and physical/provider/production gates remain incomplete. Commercial production NO-GO and Excel import hold remain.

Target: existing easygas-client-demo Vercel project. Inherit permanent fulfilment/tracking/bulk and Paystack sandbox settings without per-deployment overrides. Verify a Ready candidate before promotion; retain the prior Ready deployment for rollback. No database migration or operational/financial data change is part of this release.

Pre-push validation: focused feature/deployment/traceability suite passed; web and native TypeScript passed; native dependency assertions passed; web/native production audits report zero vulnerabilities. Exact logs are under `evidence/20261119-technician-alerts/`. New native build/export/install has not been invoked. Immutable source and GitHub/Vercel readback will be appended after release.

## Committed candidate

Source `afeb919b4d12c0226677cb9dd2cd498e8cf4644e` was pushed to `codex/technician-saas-redesign`. The clean committed archive produced Ready candidate `dpl_3FWhBohS3bmXoFWCM8oQ51rgkKpX` at https://easygas-client-demo-k7yig4nvi-onaopemipos-projects.vercel.app. Vercel source metadata matches that exact source SHA. No runtime/build environment overrides were supplied.

33/33 targeted feature/deployment/traceability checks, web/native types, native dependency3/3 and web/native zero-vulnerability audits passed. GitHub Release validation [44335535588](https://github.com/Onaopemipo/easygasng/actions/runs/44335535588) runs against the same source; native checks passed and native export was skipped. Full web regression/promotion are pending.

Candidate read-only checks passed for readiness/noindex, four retained account roles, technician summary/today/upcoming/jobs and access denials, driver snapshot, Paystack test/available, field availability writes, bulk and dispatch tracking writes. Existing EG-2026-7BB8640B remains verified-paid/out_for_delivery; its handover gap is not altered by release. Login/logout and reading canonical APIs were the only QA writes. The first candidate probe was stopped by deployment protection; it subsequently used the project's existing authorised automation bypass. A probe method mismatch was corrected to GET; the preserved failed harness log is not counted as product acceptance. No access setting was weakened.

Permanent Production-slot project values were read and verified without alteration: field operations=true, tracking mutations=true, bulk LPG=true, proof retention=1day. Paystack test mode was verified through the running candidate. Existing native bundle/APK size, SHA256 and mtime are identical to pre-release values. No native build, export, installation or store submission occurred. Native source is pushed; this web deployment does not update installed native apps.

Rollback candidate: `dpl_BG7raiYJy745co8FUCzaQjWnD4Qg`, the preceding Ready stable deployment. Promote it within the same Vercel project and repeat readiness/fulfilment/sandbox checks. No database migration, reversal of records or change to permanent project defaults is required.

## Configuration preservation repair

Initial full CI completed with763/764 tests passed,0 skipped: only CUI-SCOPE failed because the exact notification/audio app.json delta was absent from the historical native configuration approval chain. Added an explicit DAPP-02 native-config mapping chained to the unchanged GPS-R01 approved hash, retaining all existing source/role/dependency checks. This is a traceability/test repair; application source and existing native artifacts remain unchanged. The existing Ready candidate therefore remains the same application source. Corrected focused and fresh CI results follow.
