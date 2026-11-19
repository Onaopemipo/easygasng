# Staff order detail — requirements traceability

[Machine mapping](admin-order-modal-rtm.json) · [Audit, implementation and executed evidence](../admin-order-modal/README.md)

Implementation **4/4**, verification **4/4**, critical requirements **1/1**, routes **1/1**, gates **4/4**. Zero exclusions. This is local staff web scope; the hosted demo remains on its preceding release.

| Stable requirement | Priority | Gate | Status |
| --- | --- | --- | --- |
| AORD-01 — Compact summary-first order detail with focused tabs | P1 | AORD-G01 PASS | VERIFIED_COMPLETE |
| AORD-02 — Status- and role-aware actions in one focused dialog view | P1 | AORD-G02 PASS | VERIFIED_COMPLETE |
| AORD-03 — Retain items, invoice, private visit/photo history and consent flows on demand | P1 | AORD-G03 PASS | VERIFIED_COMPLETE |
| AORD-04 — Preserve canonical role, scope, version, consent, invoice and delivery controls | P0 | AORD-G04 PASS | VERIFIED_COMPLETE |

Actual implementation paths, authoritative data, controls, executed named tests, evidence, reasons and outstanding work are mapped per requirement in the JSON. Route existence alone does not close a row.

62 distinct regression checks, build/types and actual responsive dialog/tab/draft/focus observations passed. The default delivered summary contains zero forms and measures368px desktop/475px phone. Known context IDs are hidden; canonical data and all operation guards remain. Terminal operational notes are retained under History.

Outstanding: no bounded local implementation remains; hosted rollout not performed. Existing production NO-GO, actual-import hold, retain-all and physical/Firefox/formal-accessibility/native/provider/populated-proof visual and broader acceptance gaps remain separate.

Matrix validation: [executed report](../admin-order-modal/evidence/traceability.txt), deliberately outside row evidence to avoid self-referential validation.

Subsequent authorised rollout (19 November2026): both changes are now deployed and verified in [OSREL-01–03](order-sidebar-demo-release-rtm.md). The earlier local-phase rollout limitation is superseded by that release; original IDs, acceptance scope and production holds remain.
