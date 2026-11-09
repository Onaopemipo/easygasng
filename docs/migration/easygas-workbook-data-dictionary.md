# EasyGas workbook data dictionary

Source SHA256 `761854f961474cfb7789cddf4d9e16759796581bff8cc420253d9ceb32e1c380`. Mapping `easygas-excel-review-v1`. Review as of5 November2026, Lagos. Original unchanged and never recalculated/saved. Cells/formulas/caches/number formats, shared-formula expansion, hidden state, row attributes, named ranges and validation rules are retained in restricted source-provenance.json. No source PII is stored in these versioned documents.

## Package and worksheets

| Sheet | Stored rows | Nonempty literal rows including header | Formula cells | Hidden rows/columns | Merged cells |
|---|---|---|---|---|---|
| Inventory-Online Delivery | 1004 | 283 | 4979 | 0/0 | 0 |
| KeyInputs | 1000 | 59 | 0 | 0/0 | 0 |

1900 date system. No macro or external-link parts found. Two hidden defined names describe filter ranges A1:AA1004 and A1:A526. Six validation rules on the operational sheet. A:AA contains27 operational fields; A has no source header. Styled/empty cells extend farther but contain no extra operational fields. KeyInputs has58 populated data rows; remaining stored rows are formatting/empty. Formula-only operational rows284–1004 total721 and are excluded. Row283 is a category-only placeholder, retained as AMBIGUOUS rather than counted as a confirmed order.

## Operational mapping

| Column | Original header / meaning | Parsing / units | Existing target model after approval | Current decision |
|---|---|---|---|---|
| A | Unlabelled category | literal source category; no silent normalization | provenance classifier | HOLD; no target writes |
| B | Name of Customer | source alias; never unique identity | users and reviewed customer aliases | HOLD; no target writes |
| C | Phone Number | string digits/raw numeric type/format preserved; no guessed zero/country prefix | users.contact_phone / account_addresses.phone after verification | HOLD; no target writes |
| D | Customer Address | original address; no inferred branch/coverage | account_addresses or immutable order.address after customer review | HOLD; no target writes |
| E | Delivery Date | Excel1900 date; source activity date only, not proof of fulfilment | historical activity timestamp; no fabricated delivered_at | HOLD; no target writes |
| F | 50kg Received Stock | source formula uses units×50kg, not the raw unit count as kg | approved gas_stock_movements only after unit/cutover confirmation | HOLD; no target writes |
| G | 12.5kg Received Stock | source formula uses units×12.5kg | approved gas_stock_movements after review | HOLD; no target writes |
| H | Top Ups Received Stock | formula adds as kg; no values supplied | reviewed gas-stock evidence | HOLD; no target writes |
| I | Gas Qty Sold (KG) | source per-line quantity, multiplied by J; not verified cylinder capacity | historical gas item quantity | HOLD; no target writes |
| J | # of Cylinders | source count; must be positive integer | reviewed historical item count, no serialized cylinder ownership | HOLD; no target writes |
| K | Expected Stock Balance | saved cache versus independent85+receipts-sales rollforward | review evidence, never direct gas_stock balance | HOLD; no target writes |
| L | LPG Selling/Cost Price | recorded NGN; includes miscategorised Stock/Credit/Shop rows | preserved historical amount, never current-price checkout | HOLD; no target writes |
| M | Delivery Fee Charged | 48×4000 and114×5000; blanks unknown/not recorded | original historical fee, never current configured fee | HOLD; no target writes |
| N | Actual Balance on Whatsapp | one26500 value; unverified external balance note | finance evidence only | HOLD; no target writes |
| O | Variance | no populated actual variance controls | none inferred | HOLD; no target writes |
| P | End Users | formula references18/30-day KeyInputs B2/C2 | historical assumption only | HOLD; no target writes |
| Q | Corporate Customers | formula references10/14-day KeyInputs B3/C3 | historical assumption only | HOLD; no target writes |
| R | Next Refill Date | cached estimate; broken/mismatched references exist | excluded from forecast training | HOLD; no target writes |
| S | Expected Totals | blank; no source control total available | none manufactured | HOLD; no target writes |
| T | Accessories | product/service label, preserve spelling | existing products or service catalogue only after reviewed mapping | HOLD; no target writes |
| U | Unit | count only when present; no automatic multiplication of V | reviewed historical item quantity | HOLD; no target writes |
| V | Amount | recorded combined accessory/service amount; total-versus-unit basis unconfirmed | historical item/service evidence, not a second duplicate receipt | HOLD; no target writes |
| W | Actual Received | 75 numeric amounts sum5162700; one malformed text284000, excluded | unverified receipt evidence, not verified_payments | HOLD; no target writes |
| X | Date Received | payment evidence date, not delivery date | finance evidence timestamp | HOLD; no target writes |
| Y | Name of Payer | payer may differ from customer; never match accounts on this alone | finance evidence alias | HOLD; no target writes |
| Z | Gas Installation | no literal amounts supplied | none inferred | HOLD; no target writes |
| AA | Credit | blank even though one row category is Credit | unknown credit note, no debt/wallet posting | HOLD; no target writes |

KeyInputs A2:A7 categories: Bulk Buyer, Corporate Customer, Credit, End Users, Shop Sales, Stock. P references Bulk Buyer18/30 assumptions despite its End Users label; Q references Corporate10/14. R tests singular `end user`, which does not match plural `End Users` (case-insensitivity does not resolve singular/plural). Other source labels include spelling variants such as50kg Cylinger and Guage; product mapping needs review, not automatic correction. KeyInputs quantity lists and refill assumptions are not approved operating policy.
