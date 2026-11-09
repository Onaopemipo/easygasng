# Row classification and provenance

282 source rows2–283 have nonempty literal operational data, including the opening anchor, ambiguous entries and the trailing placeholder. This is not282 completed transactions. There are281 nonblank category entries and one unlabelled row225. The preliminary281 figure omits that unlabelled row while still including row283.

| Preview class | Rows |
|---|---|
| OPENING_BALANCE | 1 |
| CUSTOMER_ORDER | 197 |
| STOCK_RECEIPT | 66 |
| MIXED_EVENT | 3 |
| AMBIGUOUS | 7 |
| ACCESSORY_SALE | 1 |
| INSTALLATION_OR_SERVICE | 3 |
| CREDIT_OR_PAYMENT_NOTE | 1 |
| SHOP_SALE | 3 |

721 formula-only rows284–1004 are excluded. No empty operational rows remain in the stored1003 data-row span. Classification is syntactic evidence, not business verification.

Seven ambiguous rows:59 and111 are labelled Stock but contain25kg total sales/37500 recorded gas value;112,122 and179 are labelled End Users but contain50kg stock receipts each;225 is an unlabelled0.5kg/1000 movement;283 contains only a category plus prefilled formulas. Three mixed rows require linked-event review and no double counting.

SourceRowId=SHA256(workbook hash + sheet + row). Event ID includes sourceRowId, event type and mapping version. Raw source fingerprint covers original cells, formulas, saved caches and formats.361 non-executable event candidates are on HOLD, with0 executable proposed target writes. Repeated previews preserve IDs; revised workbook bytes require a separate review directory and hash. No invented order references, fulfilment status, proof, tax, custody, invoices or receipts.
