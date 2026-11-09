# Inventory reconciliation

All amounts below are **DERIVED under the workbook formula convention**, not a physical stock verification.

| Bridge | kg | Source |
|---|---:|---|
| Opening anchor |85|K2 literal,1January2026|
| F receipts |5850|117 source units×50kg|
| G receipts |25|2 source units×12.5kg|
| H top-ups |0|No literal entries|
| Gas sold |−5894|Sum I×J, including unlabelled row225|
| Calculated full-sheet closing |66|85+5875−5894|
| Saved source closing |66|K282/K283 and formula-only tail K1004|
| Per-row running-cache mismatches |0|Independent rollforward versus K caches|

The earlier5893.5kg sales estimate excluded row225 (0.5kg), which would produce66.5kg. Include it in the mechanical reconciliation but hold its event category/identity pending confirmation. Source formulas support50/12.5 multipliers; actual supplier package semantics and mass still need customer confirmation.69 rows carry receipts, including miscategorised112/122/179. Source Stock rows59/111 instead have gas sales and must not become stock receipts from category alone.

Row282 is dated29November2026 and adds50kg, after the review cutoff5November. Rows94/239 lack receipt dates (50kg and100kg); row274 lacks the date for12.5kg sold. **Stock as of5November is UNKNOWN.** Dated-only movement arithmetic gives−121.5kg and is incomplete, not actual negative physical stock. If all undated movements predate the cutoff, excluding only the future50kg yields16kg; this is a scenario, not an approved cutover balance.

Local snapshot gas stock and stock-movement ledgers are zero/empty. This does not authorise importing66kg or16kg. Require dated physical stocktake, unit confirmations, receipt ownership and finance/operations independent approval, with a cutover effective timestamp and stale-target checks. Never post a balancing adjustment merely to match Excel. No serialized cylinder ownership, inspection, eligibility, quarantine release or custody is established by this workbook. R01–R05 remain unchanged. No gas_stock or movement row was written.
