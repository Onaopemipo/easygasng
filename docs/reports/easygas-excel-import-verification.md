# EasyGas Excel audit and migration preview

**Audit/reconciliation/preview completed. Actual import NOT APPROVED and NOT PERFORMED. Production NO-GO unchanged.**

Source: Easygas Inventory 2026(1).xlsx, SHA256 `761854f961474cfb7789cddf4d9e16759796581bff8cc420253d9ceb32e1c380`. Original unchanged, never saved or recalculated. Cutoff: 5 November 2026, Lagos.

## Confirmed findings

Two sheets, 27 operational columns, 4,979 formulas, 282 meaningful rows (including opening and placeholder), 721 formula-only rows excluded. Classification is provisional: 197 customer orders, 66 stock receipts, 3 mixed events, 7 ambiguous rows, 1 opening balance, 1 accessory sale, 3 services, 1 credit/payment note and 3 shop sales. Source formula totals do not establish verified business events.

Stock: 85 kg opening + 5,875 kg receipts − 5,894 kg sold = 66 kg source closing. This includes a future 50 kg receipt on row 282 (29 November). Rows 94, 239 and 274 contain undated movements. Therefore stock as of the audit cutoff is UNKNOWN. The 16 kg scenario assumes all undated movements predate cutoff; it is not approved stock. Row 225 explains the 0.5 kg difference from category-only summation.

Recorded amounts: column L ₦10,423,400; historical delivery charges ₦762,000 (48 × ₦4,000 and 114 × ₦5,000); column V ₦580,000 comprising ₦462,500 accessories and ₦117,500 services. No double counting or current-fee repricing is approved.

75 parseable numeric receipts total ₦5,162,700, all UNVERIFIED. W67 contains malformed text `284000,` and is excluded. Blank receipts do not establish unpaid debt. No bank/cashbook evidence was supplied. No verified settlement, debt, wallet balance, profit or revenue is asserted.

74 normalized non-stock name groups are review groups, not verified unique customers. There are 215 customer review rows, repeated names, numeric phones with lost/uncertain prefixes and one shared phone group. Target matching found zero candidates and zero approved matches. No guessed phone prefixes or automatic merges.

Refill estimates use historical assumptions; 206 category mismatches, R275 #REF! and the shifted reference in R276 make training unsafe. All rows are excluded from refill training; dormant state remains UNKNOWN_DATA.

## Preview and target evidence

Private owner-only ignored artefacts: `.data/excel-preview/761854f961474cfb/index.html`, `exceptions.csv`, `customer-review.csv`, `row-review.csv` and provenance JSON. There are 1,456 exception entries (multiple per source row), 361 held non-executable event proposals, zero executable writes and zero imported customers/orders/payments/stock effects.

Existing target orders, payments and stock movements were zero at snapshot. Existing users, notifications, messages and audit history were preserved. The snapshot used an isolated consistent local copy with a read-only transaction; rejected write guard and equal before/after logical counts support zero preview business writes. Original files were unchanged at capture. Normal app background work after restart is outside this comparison. Disposable database copy was deleted after extraction; minimal private review snapshot remains. The local web development server was restarted.

Only audit scripts, tests, documentation and ignored review artefacts were added. No app route, migration, ledger, privilege, product price or operational action was changed. See the preflight audit for actual reusable services and missing historical importer capabilities.

## Customer decisions required before import

1. **Payments:** resolve W67 and receipt-to-order allocations, missing payer/dates, partial/combined payments and settlement evidence. Do not infer debt from blanks.
2. **Stock:** confirm physical quantity, units, opening date, undated rows 94/239/274, future row 282 and misclassified/mixed rows 59/111/112/122/179/225/283. No balancing adjustment without authority.
3. **Historical delivery fees:** confirm the ₦4,000/₦5,000 fees and treatment of blanks, inclusive totals and refunds. Preserve history rather than applying current pricing.
4. **Customers:** approve row-level existing/new/unresolved matches with evidence; resolve shared contacts and missing prefixes. Names alone cannot authorise a merge.

Each resolution needs customer/reviewer identity, date, source rows and supporting evidence. Review files intentionally contain no import approval. After these decisions, a separately reviewed staging/approval/commit implementation, idempotency, concurrency, compensation and restore verification is still required before importing.

## Verification and limits

Baseline: 283 passed, 0 failed, 11 skipped out of 294. Preview: 11 Python cases and 2 Node wrapper cases passed. Independent reader agrees with eight controls. Source hash, HTML structure, CSP and local links passed. Evidence is under `../audits/excel-evidence/`; full requirement and gate denominators remain in `../traceability/easygas-excel-migration-rtm.json`.

Automatic visual review is NOT_TESTED because browser security rejected opening the local HTML file; no alternate serving/rendering bypass was attempted. Open the private HTML manually for customer review. Full production build, live PostgreSQL importer, role/device, recovery and release acceptance are not claimed. Existing production NO-GO and prior unrelated defects remain unchanged.
