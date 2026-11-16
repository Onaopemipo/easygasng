# Catalogue upgrade regression repair

The [failed GitHub web job](https://github.com/Onaopemipo/easygasng/actions/runs/43781526814/job/133019579827) passed 722 of 723 tests. The catalogue upgrade test used current registration code against the schema in use before the catalogue import. Registration tried to insert session fields added by later migrations (PostgreSQL error 42703).

| Requirement | Source and control | Acceptance and status |
| --- | --- | --- |
| CATALOGUE-UPGRADE-R01 — preserve the catalogue upgrade test | `tests/catalogue-import.test.ts` creates a synthetic customer against the historical schema inside the isolated fixture transaction. Current registration, migrations, and stock checks are unchanged. | CATALOGUE-UPGRADE-G01 passed: preserved stock, reservations, existing order prices, and one-time import behavior. Replacement hosted validation (G02) is pending. |

Focused verification: 1/1 requirements implemented and verified; 1/2 acceptance gates passed. This phase adds no application routes or P0 requirements. The [machine-readable matrix](catalogue-upgrade-ci-rtm.json) links the executed evidence. Production remains NO-GO.

The isolated Node 22 / PostgreSQL 17 suite ran 724 tests with no skips: 723 passed, including `CATALOGUE-UPGRADE01`. The only failure was matrix validation, which read the evidence file before the focused run finished writing it. Both matrix checks passed when rerun with the finalized evidence in the same isolated checkout. The web build, TypeScript check, and production dependency audit also passed locally. No replacement GitHub workflow has run with this fix.
