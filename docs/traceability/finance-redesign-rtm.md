# Finance redesign traceability

| ID | Status | Implementation and source | Controls and evidence | Outstanding gates |
| --- | --- | --- | --- | --- |
| FIN-R01 | Partial | business-centre.tsx and product-ui.css show four primary metrics from the authorized business snapshot, secondary metrics and a responsive expense breakdown | Null values remain unavailable. Breakdown uses recorded and paid expenses and checks its sum against the server total. See regression evidence. | Browser, native, period chart, branch and date filters, accessibility and theme verification |
| FIN-R02 | Partial | business-centre.tsx places existing expense.create form in Modal. Existing approval and reconciliation routes remain in use. | Uses the existing finance permission and backend expense contract. See regression evidence. | Expense ledger search, drilldowns, evidence workflow and end-to-end device checks |
| FIN-R03 | Open | Existing dated Reports remain accessible. No trend series is added. | No illustrative chart data or inferred profitability is shown. | Reconciled period series, comparisons, exports and cost-basis validation |
| FIN-R04 | Open | Release and operational acceptance | Production NO-GO applies. | Full regression, performance, restore, screenshots and release acceptance |

Acceptance gates G01–G32 remain in scope. This phase does not claim acceptance of the full specification. See [baseline audit](../finance-redesign/BASELINE_AUDIT.md).
