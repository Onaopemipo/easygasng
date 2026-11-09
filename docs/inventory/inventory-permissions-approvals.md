# Inventory permissions and approval map

Single existing login, stored active user role/branch; no role picker or arbitrary switch. Existing grouped sidebar and route/action policy unchanged. navigationAccess is required for new reads; non-owner branch override fails, inactive staff branches fail. Owners may select an existing branch including historical inactive balances; this does not authorize fulfilment there.

| Capability | Existing roles / control |
|---|---|
| Inventory read | Existing inventory navigation roles:owner,manager,inventory,sales,finance,dispatcher,administrator; current assigned branch except owner scope |
| Acquisition costs/value | Owner/finance; other roles receive reason, no cost rows |
| Receipt/correction/hold/stocktake/transfer requests | Existing owner/manager/inventory, active branch, independent existing approvals/recent verification as required |
| Export | Owner/manager/inventory/finance; same validated filters, <=5000 rows, CSV injection escape, audit; no acquisition costs in export |
| Movement history | Existing non-sales inventory-read roles; bounded branch/date/search |
| Approve | Existing governance definitions, independent actor and current authority; no requester self-approval |
| Serial inspections/reissue | Existing qualified cylinder/custody actions, never generic release/transfer |
| Usage | Existing authorized service job/material reconciliation; no arbitrary issue button |
| Audit/thresholds | Existing role/action/governance controls; no grants added |

Direct API calls cannot grant role/branch access. Field-session driver/technician restrictions execute before the new facade. New reads are GET-only, existing stock writes remain POST with origin, authentication and service validation. Inputs reject forged fields and unbounded filters. Read limits use namespaced existing auth_attempts records outside read transactions. No new schema grants or frontend-only permission assumptions.
