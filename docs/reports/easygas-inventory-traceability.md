# Inventory control and requirement traceability

Stable requirement matrix:../traceability/easygas-inventory-rtm.json and readable companion. All56 requirements and22 gates retained. No route-only completion. Shared canonical implementation:components/inventory-workspace.tsx + lib/inventory-workspace.ts; mutations retain BusinessCentre/inventory-business.ts/governance.ts; DB unchanged. Existing single-login and sidebar preserved.

| Control | Actual API/workspace | Authoritative data | Behavior/security |
|---|---|---|---|
| Stock Movement | inventory.movements | stock_movements/gas_stock_movements | Server paginated History |
| Export Stock CSV | inventory.export | same filtered stock CTE + audit_events | <=5000 rows;CSV escaping;no costs |
| Add Stock | inventory.receipt | stock_receipts + projections + ledgers | Existing receiving form |
| Refresh | inventory.workspace | canonical branch reads | No optimistic stock |
| Stock tab | inventory.workspace | inventory/gas_stock/holds | 20/page |
| Receipts tab | inventory.receipt | stock_receipts/purchase_orders | Original form retained |
| Adjustments tab | inventory.adjust/stocktake/quarantine/threshold | inventory_operations/change_requests | Independent approval/stale snapshot |
| Returns tab | inventory.return/release/disposition | stock_holds/custody | Unsaleable/qualified review |
| Transfers tab | transfer.request/dispatch/receive/cancel | stock_transfers/ledgers | Partial/damage/custody;generic serial transfer blocked |
| Purchases tab | purchase.create + supplier controls | purchase_orders/suppliers | Ordered !=received |
| History tab | inventory.movements | immutable movements | 20/page |
| Category selectors | inventory.workspace category | product asset/category;bulk gas separately | No services added |
| Search | inventory.workspace q | name/SKU/branch literal LIKE | <=100 characters |
| Branch filter | inventory.workspace branchId | current session/branches | No nonowner override |
| Stock state filter | inventory.workspace status | eligible/reserved/holds/threshold | Closed enums |
| Sort | inventory.workspace sort | server allowlisted SQL ordering | No SQL interpolation from arbitrary input |
| Clear filters | existing /admin/inventory URL | current tab preserved | Query/page reset |
| Previous/Next | workspace/movements page | count +20 rows | Bounded server pagination |
| Row menu | existing catalogue/custody/tab controls | same canonical modules | No arbitrary direct issue |
| Alerts | stock status filter/Approval Centre | threshold SQL / unexpired requests | Scope labeled separately from sidebar |
| Quick actions | original receipt/adjustment/return/transfer tabs | same mutation services | Writer role;server rechecks |
| Record Usage | existing /admin/bookings | authorised service material authority | No free-form stock consumption |
| View all movements | inventory.movements | immutable ledgers | Filters and paging |
| Valuation review/chart | inventoryValuation / Reports | approved acquisition movements | No fabricated chart when unavailable |
| Dates/kind in History | inventory.movements | Lagos timestamp/kind | Validated range/literal parameters |

Operational forms below these tabs retain their existing field/action mappings documented in inventory-workflows.md. Backend receipt, quarantine, returns, disposition, qualification, transfers, supplier/purchase, count-sheet/count submission and independent approval tests remain; rendered forms alone are not end-to-end acceptance. See ../testing/easygas-inventory-acceptance-tests.md and blocker register for exact remaining scope.
