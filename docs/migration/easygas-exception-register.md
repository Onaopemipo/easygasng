# Exception register

1456 row-level exceptions are recorded with stable IDs, source sheet/row, evidence, severity, required action, reviewer, pending status, resolution reason and timestamps. They are not1456 distinct transactions. Full downloadable CSV is private: `.data/excel-preview/761854f961474cfb/exceptions.csv`. No exception is resolved or approved.

| Type | Count |
|---|---|
| UNVERIFIED_CYLINDER_CAPACITY_CUSTODY | 207 |
| NUMERIC_PHONE_STORAGE | 178 |
| UNVERIFIED_RECORDED_RECEIPT | 76 |
| INCOMPLETE_RECEIPT_METADATA | 51 |
| HISTORICAL_FEE_VARIATION | 48 |
| REFILL_CATEGORY_MISMATCH | 206 |
| STOCK_UNIT_AND_CUTOVER_REVIEW | 69 |
| STOCK_ROW_IN_CUSTOMER_LAYOUT | 69 |
| UNVERIFIED_PHONE_FORMAT | 160 |
| MISSING_CONTACT | 20 |
| UNKNOWN_PAYMENT_EVIDENCE | 135 |
| RECORDED_PAYMENT_COMPONENT_DIFFERENCE | 20 |
| MIXED_EVENT | 3 |
| ACCESSORY_SERVICE_AMOUNT_BASIS | 7 |
| AMBIGUOUS_ROW | 7 |
| UNPARSED_MONEY_EVIDENCE | 1 |
| UNDATED_STOCK_MOVEMENT | 3 |
| MISSING_ACTIVITY_DATE | 1 |
| REFILL_FORMULA_ERROR | 1 |
| FORMULA_ERROR | 1 |
| CROSS_ROW_REFILL_REFERENCE | 1 |
| FUTURE_DATED_ACTIVITY | 1 |
| REPEATED_NAME_REVIEW | 184 |
| SHARED_PHONE_REVIEW | 7 |

## Customer confirmations required

- W67 malformed receipt;75 other numeric receipts still lack independent bank/cash verification. Review51 incomplete payer/date records and20 parseable component differences; blanks do not prove debt.
- K2 opening85kg; row225 unlabelled0.5kg; undated94/239/274; row282 future50kg. Confirm physical stock and effective cutoff; no balancing entry proposed.
- M fees:48 rows at4000 and114 at5000. Confirm original fees and preserve them.
- Customer identity:74 non-stock name groups,44 repeated-name groups,13 valid-format phone keys, one shared-phone group,160 unsupported phone representations. No customer matches approved.
- Categories59/111/112/122/179; placeholder283; mixed item/service rows and V amount basis. Do not double-count accessories/services or stock receipts as customer revenue.
- R275#REF!, R276 cross-row reference and206 singular/plural mismatches. Historical forecasts remain ineligible.

Decision: REQUIRES_APPROVAL for financial/stock/identity/fee resolutions; CONTINUE_WITH_RESTRICTION for read-only analysis. No STOP_ALL: the repository and source remain intact. Production NO-GO is unchanged.
