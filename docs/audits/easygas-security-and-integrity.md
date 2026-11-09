# Security and business-integrity findings

The six API reproductions below ran successfully using `node --import tsx docs/audits/audit-probes.mts`, on a new **memory://** database with synthetic `.test` accounts, no DATABASE_URL and background jobs disabled. They intentionally demonstrate missing controls rather than repair them. `audit-probe-results.json` is the captured result. An audit probe reporting successful reproduction means the defective behavior occurred; it is not a feature acceptance pass.

## F01 — High: checkout ignores inactive branch

**Evidence:** `apps/web/lib/operations.ts:68` selects active Lagos `FOR UPDATE` but never checks that a row was returned. Subsequent settings/inventory/order operations still target Lagos. **Safe reproduction:** seed a memory DB, give a synthetic customer an ordinary session, enable COD/delivery and add test stock; set only the fixture Lagos branch inactive; dispatch checkout for a valid slot. **Actual:** an order is created for inactive Lagos. **Expected:** reject with no order, payment or reservation. **Impact:** inactive branch can receive commitments and fulfilment load; no production outage is claimed. **Remedy:** require an active branch result before all side effects and reject stale retry keys according to a documented replay policy. Risk R03.

## F02 — High: cross-branch staff checkout

**Evidence:** `operations.ts:53` checks only allowed role; `:68` and `:197` hardcode fulfilment to Lagos. **Reproduction:** place a synthetic sales account in `audit-other`; dispatch checkout using its valid token. **Actual:** creates Lagos order despite branch mismatch. Read/settings restrictions elsewhere do not prevent this write. **Expected:** staff must be authorised for the fulfilling branch; customer purchases follow public service eligibility. **Impact:** branch controls can be bypassed through API, with inventory reservations in another branch. The order belongs to the calling staff account, so this is not proof of access to another customer's order or wallet. **Remedy:** resolve authorised branch explicitly; test sales/manager/owner and customer/commercial cases independently. Risk R02.

## F03 — Critical safety-control gap: delivery without cylinder allocation

**Evidence:** `delivery.ts:84` and `commerce.ts:418` consume product counts; neither joins `cylinders`, inspections or custody. No order-to-cylinder allocation table exists. **Reproduction:** with zero rows in cylinders, add synthetic product inventory for 6kg empty cylinders; customer checkout → owner accepts/prepares/assigns → driver dispatches → customer code → driver records exact cash and completes. **Actual:** delivery completes and product stock decreases despite no serialised cylinder existing. **Expected for serialised cylinder sales/exchanges:** validated physical unit allocation and safe status/inspection/custody transaction. **Impact:** software cannot enforce quarantine/recall eligibility at fulfilment. This proves a disconnected control, **not** that an unsafe physical cylinder was delivered. **Remedy:** explicit allocation and unit/type policy integrated into POS, dispatch and returns; physical safety SOP and qualified review remain necessary. Risk R01.

## F04 — High: custody issue can replace existing holder

**Evidence:** `workspace.ts:395–436` validates branch/status/inspection and new customer, but not current custody or an incoming return. **Reproduction:** register safe filled synthetic company cylinder; issue to customer A; issue same serial directly to B. **Actual:** customer_id changes from A to B, with a descriptive event but no return confirmation. **Expected:** reject a second issue until return/approved custody transfer. **Impact:** current-holder records can diverge from physical custody and obscure asset accountability. **Remedy:** typed custody events/state transitions, return proof and retry-safe issue/transfer. The serial unique constraint prevents two cylinder records with the same serial, not sequential double issue. Risk R05.

## F05 — Medium: forecasts use payment date as refill date

**Evidence:** `refills.ts:131–135` inserts `v.created_at` as refilled_at. **Reproduction:** create three synthetic verified delivered orders with payment-verification timestamps five days after the explicit delivered events; create profile and query profiles. **Actual:** all three history timestamps equal payment verification dates, not delivery events. **Impact:** COD reconciliation delays shift estimates later; prepaid wallet timestamps can shift them earlier. No calibrated field-error claim. **Remedy:** verified refill/fulfilment event time and immutable provenance; migration strategy for previously ingested histories; replay/late-verification tests. Risk R12.

## F06 — High: failed delivery reassignment bypasses capacity

**Evidence:** `operations.ts:148` excludes delivery_failed from booked capacity; `:318` assignment does not revalidate capacity. **Reproduction:** set synthetic window capacity=1; checkout A → assigned/out_for_delivery → delivery_failed; checkout B same window; reassign A. **Actual:** two active orders occupy a capacity-one window. **Expected:** block or explicitly rebook A with availability/consent. **Impact:** oversubscribed delivery windows and unreliable commitments. **Remedy:** one slot-allocation invariant across checkout/reassignment/reschedule, consistent locking and explicit recovery. Risk R04.

## F07 — Medium: mobile homepage expands beyond viewport

Browser on isolated preview: desktop viewport/document 1280/1280; tablet 768/768; mobile **390/1686**. `.home-main` and compact product grid width measured 1668.73px. See `responsive-observations.json` and `mobile-home-overflow.jpg`. `globals.css:2387,2401` uses a horizontal compact strip inside an intrinsic-width parent grid. Expected strip scroll should not widen page. No stylesheet correction was made. Risk R13.

## Mandatory security scenarios — actual evidence and limits

| Scenario | Result / evidence |
|---|---|
| Customer reads another customer's order | Existing API integration denies/isolates histories, `platform.test.ts:646`; passed |
| Customer reads another wallet | Wallet query binds actor id (`service.ts:388`); no customer-id input accepted. Source verified; dedicated adversarial wallet case not present |
| Driver accesses/completes unassigned order | `delivery.ts:22`, driver list filter; assignment controls exercised `platform.test.ts:665`; no real devices |
| Cashier changes restricted price | `platform.test.ts:310,347`; role/proposal tampering denied; passed |
| Branch manager accesses another branch | Settings tests `platform.test.ts:374`; passed; checkout branch write fails F02 for sales, managers follow same unscoped role path (manager exploit not separately executed) |
| Employee self-elevation | `platform.test.ts:337,814`; self request/recipient approval prohibited; passed |
| Requester self-approval | `platform.test.ts:173`; passed |
| One person supplies dual approvals | Distinct decision unique key + required owner/finance checks `platform.test.ts:124`; passed |
| Expired/revoked/suspended session | `platform.test.ts:387,401`, `workflows.test.ts:376`; passed |
| Replay payment confirmation | No online provider/webhook exists, so NOT TESTABLE as provider replay. Internal cash verification/credit replay tests passed |
| Duplicate refund requests/decisions | `commerce.test.ts:186,279`; one pending/approved full refund and exact replay; passed |
| Manipulated checkout totals | Strict schema rejects client prices/totals; `platform.test.ts:626`; passed |
| Bypass product inventory | `platform.test.ts:547`, `commerce.test.ts:114`; counts guarded. Physical cylinder allocation bypass confirmed F03 |
| Integration credential access | No connected provider credentials supplied or read; financial setting read restrictions tested `platform.test.ts:310`. Secret exposure scanning did not print real env contents; no claim of comprehensive historical secret scan |
| Modify immutable audit/financial records | Direct UPDATE/DELETE triggers tested `platform.test.ts:430`; runtime role permission denial tested `deployment.test.ts:5`; passed in isolated DB |

## Database/security qualifications

The trusted backend role sees all branches by design; its true RLS policy is not customer tenancy protection. Tests prove private-schema isolation and specific restricted writes in PGlite, not hosted Supabase grants/API exposure. Audit logs/approvals/wallet/payments have immutable triggers; cylinder_events and order_events lack equivalent append-only triggers in this snapshot, and privileged DB access is not proven tamper-evident. No user-facing mutation route for arbitrary historical events was found; this is a hardening gap, not a reproduced remote exploit.

Per-email login/recovery/reauth limits, bounded JSON, parameterized SQL, session reloading and safe API errors are real safeguards. No global registration/IP abuse control, MFA, CSP, HSTS, production secret manager or external security alerting was verified. No load/bruteforce/penetration test against real services was performed. No SQL-injection exploit, wallet double-spend or self-promotion path was confirmed by this audit.
