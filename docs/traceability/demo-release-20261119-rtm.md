# Demo release — 19 November 2026

[JSON matrix](demo-release-20261119-rtm.json) · [Deployment report and evidence](../deployment/20261119-technician-alerts-release.md).

**3/3 release requirements and3/3 gates verified;2/2 critical requirements verified.** This covers the bounded authorised demo rollout, not full product/native acceptance.

| Requirement | Status | Gate | Evidence |
|---|---|---|---|
| DREL-20261119-01 — Push all remaining reviewed source and evidence | VERIFIED_COMPLETE | DREL-G01 PASS | Git remote source readback, committed implementation/evidence and final publication |
| DREL-20261119-02 — Deploy isolated web demo; retain fulfilment and sandbox | VERIFIED_COMPLETE | DREL-G02 PASS | Ready stable deployment, canonical API/role checks, permanent flags and actual desktop/mobile technician views |
| DREL-20261119-03 — No new native build; preserve incomplete acceptance | VERIFIED_COMPLETE | DREL-G03 PASS | Existing binary hashes/mtimes unchanged, native CI export skipped; previous RTMs unchanged in scope |

33/33 targeted checks,11/11 exact preservation repair,764/764 fresh web CI with0 failures/skips; both web/native jobs successful. No new native build/export/install. Existing technician5/12 and alerts2/5 coverage, pending audible chime, remote background push, Android/physical/provider acceptance, named-order handover defect, commercial production NO-GO and import hold remain.
