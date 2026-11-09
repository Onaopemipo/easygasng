# Inventory and financial permissions

Implementation: 30 October 2026. Permission keys below are existing authenticated API operation names, not a second authorisation system. `auth.actor` reloads current role, branch, activity and session state on every dispatch. Owner scope is business-wide; all other eligible roles are limited to their assigned branch. Technical administrator status grants no financial approval authority.

| Permission key | Function | Eligible roles | Scope | Approval | Fresh password | Audit / enforcement / tests |
|---|---|---|---|---|---|---|
| inventory, business.snapshot | Read stock and scoped operational metrics | owner, manager, inventory, sales; snapshot additionally finance, dispatcher, administrator | assigned / owner global | none | no | auth/service + business-reporting; inventory-finance F,N |
| inventory.receipt | Verify incoming physical units or bulk kg | owner, manager, inventory | receiving branch | approved PO when linked | no | receipt/movement unique reference, receiving checks; D, partial-purchase test |
| inventory.adjust, inventory.stocktake | Request correction/count variance | owner, manager, inventory | assigned branch | independent owner | yes | immutable operation payload, shared activation; A–E,M |
| inventory.threshold | Change reorder threshold | owner, manager, inventory | assigned branch | independent owner | yes | shared activation / movement-free configuration |
| inventory.quarantine | Immediate protective removal from sale | owner, manager, inventory | assigned branch | immediate protective exception | yes | append movement + held record, cannot consume reservations; A–E,M |
| inventory.return | Record actually recovered customer stock into hold | owner, manager, inventory | assigned branch | release separate | no | unique hold; no saleable credit |
| inventory.release | Request held stock release | owner, manager, inventory with current independently verified inventory_safety qualification | assigned branch | independent owner, qualification rechecked at activation | yes | held balance + append movement; K |
| inventory.disposition | Supplier return / write-off of already-held goods | owner, manager, inventory | assigned branch | independent owner | yes | held disposition; no second stock deduction |
| transfer.create | Request transfer | owner, manager, inventory | source branch | independent owner reserves stock | submission no / approver yes | existing transfer + shared approval; controlled-transfer test |
| transfer.dispatch | Dispatch approved reserved transfer | owner, manager, inventory | source branch | revalidates active approval/requester/owner | yes | source movement once |
| transfer.receive | Verify good/damaged partial receipt | owner, manager, inventory; different from requester/dispatcher | destination branch | approved dispatch | yes | unique receipt, bounded quantities, held damage |
| transfer.cancel | Cancel undispatched transfer | owner, manager, inventory | source branch | only requested/reserved states | yes | reservation release + audit; dispatched recovery not silently cancelled |
| supplier.create / supplier.update | Supplier records | create owner/manager/inventory; update owner/manager | assigned branch | none | no | supplier audit; costs remain restricted |
| purchase.create / purchase.update | Purchase request / approve / receive | request owner/manager/inventory; approve independent owner; receive stock roles | supplier branch | shared canonical engine | approver yes | PO is not stock; partial receipt test |
| finance.summary, finance.ledger, business.report sensitive types | Financial records and acquisition costs | owner, finance | assigned / owner global | none | no | restricted-role queries; F,L,N; wallet/loyalty/branch consolidation owner-only |
| business.report operational types | Movements, stocktakes, low stock, deliveries | operational roles | assigned / owner global | none | no | no financial summary for non-revenue roles; refills owner/manager only; audit owner-only |
| business.export | Export current authorised report | owner, finance; manager operational reports only | assigned / owner global | none | no | rechecks at generation, audit; no public stored download URL; L |
| expense.create | Expense draft/submission | owner, finance | assigned branch | independent owner | yes | duplicate fingerprint/reference, evidence; I,J |
| expense.record | Record approved expense | owner, finance | assigned branch | active independent approval revalidated | yes | append expense event; approval is not payment |
| expense.pay | Record independently checked actual payment evidence | owner, finance excluding requester | assigned branch | active independent approval | yes | unique paid event, no payment adapter called; I,J,P |
| expense.reverse | Request reversal of recorded expense | owner, finance | assigned branch | independent owner | yes | append reversal, preserve original events; P |
| inventory.valuation (setting) | Choose valuation method | owner, finance | assigned branch | independent owner or finance under existing risk-3 policy | yes to approve | settings versions; complete-input valuation test |
| cylinder.inspect (pass) | Safety release to empty, never automatic filling | owner, manager, inventory with cylinder_inspection qualification | cylinder branch | independent prior qualification verification | yes | existing inspection/custody events; K, workflows |
| technician.qualify | Independently verify actual inspector evidence | owner, safety_officer | assigned / owner global | cannot self-qualify | yes | existing qualification infrastructure extended to inventory/manager/owner |
| report.schedule / report.delivery | Generate and open scheduled snapshots | owner, finance, manager where report permitted | assigned branch + own schedule | read permission rechecked by worker and download | no | in-app notification only after snapshot persistence; schedule test |
| business.incident.assign | Assign exception reviewer | owner; branch manager; finance for cash discrepancy only | assigned / owner global | none | no | active eligible reviewer and immutable incident event |

Stronger restrictions are intentional: no approved manager quantity/value limits were supplied, so managers cannot independently approve stock write-offs, expenses or purchases. A requesting owner needs another owner for these operations. Existing risk-4 dual approval remains unchanged and tested in the original governance suite. No new delegation bypass is added; existing delegated authority remains subject to its role/scope/risk/expiry restrictions. Suspension and staff role changes revoke sessions through existing staff controls; current actor checks also protect sessions if a permission changes without explicit revocation.

Database layer: private-schema trusted `easygas_server`, RLS and column-level grants in `database/policies/inventory-finance-access.sql`. This is a trusted application-server boundary, not per-human PostgreSQL identities. Direct database administrator access remains privileged. No browser/mobile role receives table access.
