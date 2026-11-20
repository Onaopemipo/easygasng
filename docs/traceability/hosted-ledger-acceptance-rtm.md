# Hosted ledger endpoint and role acceptance

[Machine-readable matrix](hosted-ledger-acceptance-rtm.json) · [Original report](../hosted-ledger-acceptance/README.md) · [Hosted cross-branch closure and evidence](../hosted-ledger-acceptance/cross-branch/README.md)

| ID | Requirement / gate | Current status | Evidence |
| --- | --- | --- | --- |
| HLED-01 | Correct endpoint, complete stable pagination / G01 | VERIFIED COMPLETE / PASS | Initial 10 rows; current owner 11 rows at limit 1 and 500, including labelled synthetic row |
| HLED-02 | Seven roles, anonymous, method/input restrictions / G02 | VERIFIED COMPLETE / PASS | Repeated owner/finance scope; five denied roles and two restricted workspace sessions 403; anonymous 401; strict inputs 400; wrong method 405 |
| HLED-03 | Hosted branch/cursor isolation and existing-source preservation / G03 | VERIFIED COMPLETE / PASS | Owner sees foreign synthetic row, finance retains exactly original 10 Lagos rows; foreign cursors and spoofing denied, foreign order hidden; existing data unchanged |
| HLED-04 | Repair tooling and reconcile prior gap / G04 | VERIFIED COMPLETE / PASS | Complete finance.ledger verifier; schema-qualified fixture readback; original wrong-endpoint 405 and earlier unavailable case retained as history |

Coverage: implemented **4/4**, verified requirements **4/4**, gates **4/4**, roles **7/7**, original hosted business endpoints **4/4**, full hosted checks **30/30**, detailed cross-branch checks **13/13**, local branch isolation **1/1**, hosted foreign-branch case **1/1**. No exclusions or denominator reductions. Eight current acceptance tests pass; initial five tests and six service regressions remain retained evidence.

User explicitly authorised the synthetic follow-up after the original read-only pass. One labelled 1-kobo append-only payment remains in an inactive demo branch, with an inactive customer and cancelled order. Existing financial records, stock, settings and staff assignments are preserved. No application deployment, native build, external payment, grant/schema change or new QA endpoint was needed. Production NO-GO, actual-import hold, retain-all and unrelated native/provider/device/feature gates remain.
