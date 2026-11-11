# Finance & Expenses baseline

The existing Business Centre presents finance snapshot fields as one grid. Expense intake, category management, record/payment/reversal controls, ledger and reconciliation links sit below it. The finance view requires the existing finance permission. The snapshot applies role and branch checks in business-reporting.ts. Verified completed revenue sums qualifying order, service and verified POS totals. The snapshot returns null for profit and for dependent totals when their datasets are incomplete. Expense workflow mutations already use their dedicated server handlers.

This pass changes the responsive web presentation and moves existing expense intake into the shared modal. It uses the current snapshot contract. No schema or financial posting changes are needed. The supplied design is a visual reference. Its sample trends and comparisons are illustrative.

Web typecheck passed. The existing inventory-finance and report-empty-state suites passed all 12 tests. [Regression output](regression.txt).
