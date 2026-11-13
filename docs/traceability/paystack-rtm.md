# Paystack requirements traceability

NO-GO unchanged; Excel actual import not approved

Full scope retained. Mock evidence is not official sandbox verification.

## Requirements

| ID | Requirement | Status |
|---|---|---|
| PAY-R00 | EXECUTION CONTRACT — READ FIRST | VERIFIED_COMPLETE |
| PAY-R01 | BUSINESS SCOPE AND CHANNEL MATRIX | PARTIAL |
| PAY-R02 | PAYMENT POLICY AUTHORITY AND CONFIGURATION | PARTIAL |
| PAY-R03 | CANONICAL DATA MODEL — EXTEND, DO NOT DUPLICATE | PARTIAL |
| PAY-R04 | FEE QUOTATION AND CUSTOMER-PAID PROCESSING CHARGE | VERIFIED_COMPLETE |
| PAY-R05 | PAYSTACK ADAPTER AND PROVIDER INTEGRATION | PARTIAL |
| PAY-R06 | PHONE-ASSISTED ORDER → ONE-TIME PROFILE → PAYMENT | PARTIAL |
| PAY-R07 | CHECKOUT AND INVOICE PAYMENT | PARTIAL |
| PAY-R08 | WALLET TOP-UPS AND CLOSED-LOOP CREDIT | PARTIAL |
| PAY-R09 | PROFESSIONAL SERVICES AND ON-SITE ORDER ADDITIONS | PARTIAL |
| PAY-R10 | WEBHOOKS, VERIFICATION AND EXACTLY-ONCE EFFECTS | PARTIAL |
| PAY-R11 | REFUNDS, CANCELLATIONS, REVERSALS AND DISPUTES | PARTIAL |
| PAY-R12 | RECONCILIATION, SETTLEMENTS AND FINANCIAL REPORTS | PARTIAL |
| PAY-R13 | MESSAGING, NOTIFICATIONS AND RECEIPTS | PARTIAL |
| PAY-R14 | ADMIN, STAFF, CUSTOMER, DRIVER AND TECHNICIAN UI | PARTIAL |
| PAY-R15 | SECURITY, AUTHORIZATION AND PRIVACY | PARTIAL |
| PAY-R16 | MIGRATIONS, DATA PRESERVATION AND BACKWARD COMPATIBILITY | PARTIAL |
| PAY-R17 | OFFLINE, FAILURES, RETRIES AND RECOVERY | PARTIAL |

## All 82 scenarios

| ID | Scenario | Status | Named evidence |
|---|---|---|---|
| PAY-A01 | existing login | PARTIAL | Outstanding |
| PAY-A02 | role scope | PARTIAL | Outstanding |
| PAY-A03 | customer checkout | PARTIAL | Outstanding |
| PAY-A04 | manual/COD path | PARTIAL | Outstanding |
| PAY-A05 | invoice issue | PARTIAL | Outstanding |
| PAY-A06 | wallet balance | PARTIAL | Outstanding |
| PAY-A07 | refunds | PARTIAL | Outstanding |
| PAY-A08 | driver assignment | PARTIAL | Outstanding |
| PAY-A09 | technician quote | PARTIAL | Outstanding |
| PAY-A10 | stock reservation | PARTIAL | Outstanding |
| PAY-B01 | zero amount | VERIFIED_COMPLETE | PAY-FEE |
| PAY-B02 | below waiver threshold | VERIFIED_COMPLETE | PAY-FEE |
| PAY-B03 | at waiver threshold | VERIFIED_COMPLETE | PAY-FEE |
| PAY-B04 | threshold+1 | VERIFIED_COMPLETE | PAY-FEE |
| PAY-B05 | cap boundary | VERIFIED_COMPLETE | PAY-FEE |
| PAY-B06 | above cap | VERIFIED_COMPLETE | PAY-FEE |
| PAY-B07 | 12.5kg example | NOT_IMPLEMENTED | Outstanding |
| PAY-B08 | wallet exact credit | VERIFIED_COMPLETE | PAY-FEE-LIMIT |
| PAY-B09 | discounts | NOT_IMPLEMENTED | Outstanding |
| PAY-B10 | loyalty redemption | NOT_IMPLEMENTED | Outstanding |
| PAY-B11 | partial invoice | NOT_IMPLEMENTED | Outstanding |
| PAY-B12 | expired fee quote | PARTIAL | PAY-EXPIRY |
| PAY-B13 | policy change mid-checkout | NOT_IMPLEMENTED | Outstanding |
| PAY-B14 | gross-up minimality/rounding | VERIFIED_COMPLETE | PAY-FEE |
| PAY-C01 | successful checkout | NOT_IMPLEMENTED | Outstanding |
| PAY-C02 | failed | NOT_IMPLEMENTED | Outstanding |
| PAY-C03 | abandoned | VERIFIED_COMPLETE | PAY-RESUME |
| PAY-C04 | pending | NOT_IMPLEMENTED | Outstanding |
| PAY-C05 | redirect before webhook | NOT_IMPLEMENTED | Outstanding |
| PAY-C06 | webhook before redirect | NOT_IMPLEMENTED | Outstanding |
| PAY-C07 | duplicate webhook | VERIFIED_COMPLETE | PAY-POST |
| PAY-C08 | out-of-order event | NOT_IMPLEMENTED | Outstanding |
| PAY-C09 | wrong amount | VERIFIED_COMPLETE | PAY-ZERO-EFFECT |
| PAY-C10 | wrong currency | VERIFIED_COMPLETE | PAY-ZERO-EFFECT |
| PAY-C11 | wrong environment | VERIFIED_COMPLETE | PAY-ZERO-EFFECT |
| PAY-C12 | unknown reference | VERIFIED_COMPLETE | PAY-ZERO-EFFECT |
| PAY-C13 | duplicate payment attempt | VERIFIED_COMPLETE | PAY-POST |
| PAY-C14 | provider timeout/retry | VERIFIED_COMPLETE | PAY-RECOVERY |
| PAY-D01 | top-up exact amount | VERIFIED_COMPLETE | PAY-POST |
| PAY-D02 | concurrent webhook | NOT_IMPLEMENTED | Outstanding |
| PAY-D03 | concurrent top-up | NOT_IMPLEMENTED | Outstanding |
| PAY-D04 | refund funded balance | NOT_IMPLEMENTED | Outstanding |
| PAY-D05 | insufficient balance | NOT_IMPLEMENTED | Outstanding |
| PAY-D06 | reversed payment | NOT_IMPLEMENTED | Outstanding |
| PAY-D07 | existing wallet compatibility | NOT_IMPLEMENTED | Outstanding |
| PAY-D08 | no cross-customer credit | VERIFIED_COMPLETE | PAY-ZERO-EFFECT |
| PAY-E01 | full refund | NOT_IMPLEMENTED | Outstanding |
| PAY-E02 | partial refund | NOT_IMPLEMENTED | Outstanding |
| PAY-E03 | duplicate refund | NOT_IMPLEMENTED | Outstanding |
| PAY-E04 | self-approval rejected | NOT_IMPLEMENTED | Outstanding |
| PAY-E05 | failed provider refund | NOT_IMPLEMENTED | Outstanding |
| PAY-E06 | settlement variance | NOT_IMPLEMENTED | Outstanding |
| PAY-E07 | fee variance | VERIFIED_COMPLETE | PAY-RECOVERY |
| PAY-E08 | chargeback | NOT_IMPLEMENTED | Outstanding |
| PAY-E09 | unmatched transaction | NOT_IMPLEMENTED | Outstanding |
| PAY-E10 | reconciliation retry | NOT_IMPLEMENTED | Outstanding |
| PAY-E11 | no wallet-as-revenue | VERIFIED_COMPLETE | PAY-POST |
| PAY-E12 | branch reporting | PARTIAL | PAY-POST |
| PAY-F01 | phone-assisted link | NOT_IMPLEMENTED | Outstanding |
| PAY-F02 | once-only profile | NOT_IMPLEMENTED | Outstanding |
| PAY-F03 | expired/forwarded link | NOT_IMPLEMENTED | Outstanding |
| PAY-F04 | mobile deep-link | PARTIAL | PAY-LINK |
| PAY-F05 | service payment gate | NOT_IMPLEMENTED | Outstanding |
| PAY-F06 | driver amendment | NOT_IMPLEMENTED | Outstanding |
| PAY-F07 | one delivery fee | NOT_IMPLEMENTED | Outstanding |
| PAY-F08 | insufficient vehicle stock | NOT_IMPLEMENTED | Outstanding |
| PAY-F09 | invoice payment | NOT_IMPLEMENTED | Outstanding |
| PAY-F10 | messaging fallback | NOT_IMPLEMENTED | Outstanding |
| PAY-F11 | notification dedupe | NOT_IMPLEMENTED | Outstanding |
| PAY-F12 | no duplicate receipt | NOT_IMPLEMENTED | Outstanding |
| PAY-G01 | forged signature | VERIFIED_COMPLETE | PAY-SIGNATURE |
| PAY-G02 | replay | VERIFIED_COMPLETE | PAY-SIGNATURE |
| PAY-G03 | raw body signature validation | VERIFIED_COMPLETE | PAY-SIGNATURE |
| PAY-G04 | role escalation | NOT_IMPLEMENTED | Outstanding |
| PAY-G05 | branch escalation | NOT_IMPLEMENTED | Outstanding |
| PAY-G06 | cross-customer invoice access | NOT_IMPLEMENTED | Outstanding |
| PAY-G07 | leaked secret scan | NOT_IMPLEMENTED | Outstanding |
| PAY-G08 | rate limit | NOT_IMPLEMENTED | Outstanding |
| PAY-G09 | server restart during posting | NOT_IMPLEMENTED | Outstanding |
| PAY-G10 | two-connection concurrent posting | VERIFIED_COMPLETE | PAY-PG-CONCURRENCY |
| PAY-G11 | restore/rollback | NOT_IMPLEMENTED | Outstanding |
| PAY-G12 | accessibility/theme regression | NOT_IMPLEMENTED | Outstanding |

## All 26 gates

| ID | Gate | Status | Reason |
|---|---|---|---|
| PAY-01 | Repository audit and baseline evidence complete. | PASS | Audit/baseline recorded before changes; lint unavailable (no script). |
| PAY-02 | Existing flows and historical data preserved. | BLOCKED | Required engineering, scenario execution or independent acceptance is incomplete. |
| PAY-03 | Paystack merchant eligibility, fee policy and pass-through verified/approved. | BLOCKED | External merchant/provider/business approval unavailable; engineering gaps separately retained. |
| PAY-04 | Server-authoritative fee gross-up correct at thresholds/caps. | PASS | Synthetic fee policy solver boundary/minimality tests passed. |
| PAY-05 | Transparent customer fee disclosure and explicit confirmation. | BLOCKED | Required engineering, scenario execution or independent acceptance is incomplete. |
| PAY-06 | Web and mobile checkout complete in sandbox. | BLOCKED | Required engineering, scenario execution or independent acceptance is incomplete. |
| PAY-07 | Staff-assisted order completion link and one-time profile complete. | BLOCKED | Required engineering, scenario execution or independent acceptance is incomplete. |
| PAY-08 | Invoice issue, payment, receipt and allocation consistent. | BLOCKED | Required engineering, scenario execution or independent acceptance is incomplete. |
| PAY-09 | Wallet top-up credits exactly intended amount once. | BLOCKED | Required engineering, scenario execution or independent acceptance is incomplete. |
| PAY-10 | Professional service payment gate enforced. | BLOCKED | Required engineering, scenario execution or independent acceptance is incomplete. |
| PAY-11 | On-site amendment collects additional payment without duplicate delivery fee. | BLOCKED | Required engineering, scenario execution or independent acceptance is incomplete. |
| PAY-12 | Webhook signature, replay and event dedupe verified. | BLOCKED | Required engineering, scenario execution or independent acceptance is incomplete. |
| PAY-13 | Provider verify, reference/amount/currency/environment checks verified. | BLOCKED | Required engineering, scenario execution or independent acceptance is incomplete. |
| PAY-14 | Exactly-once business effects under concurrency and crashes verified. | BLOCKED | Required engineering, scenario execution or independent acceptance is incomplete. |
| PAY-15 | Refund approvals, partial refunds and reversals verified. | BLOCKED | Required engineering, scenario execution or independent acceptance is incomplete. |
| PAY-16 | Reconciliation, settlement and fee variance reports correct. | BLOCKED | Required engineering, scenario execution or independent acceptance is incomplete. |
| PAY-17 | Customer, finance, driver, technician and staff access restrictions tested. | BLOCKED | Required engineering, scenario execution or independent acceptance is incomplete. |
| PAY-18 | SMS/WhatsApp/email delivery and failure handling tested with configured providers. | BLOCKED | External merchant/provider/business approval unavailable; engineering gaps separately retained. |
| PAY-19 | Secrets, privacy, monitoring, audit and alerting reviewed. | BLOCKED | Required engineering, scenario execution or independent acceptance is incomplete. |
| PAY-20 | Staging migration, backup restore and rollback exercised. | BLOCKED | Required engineering, scenario execution or independent acceptance is incomplete. |
| PAY-21 | Mobile/web regression, accessibility and light/dark modes pass. | BLOCKED | Required engineering, scenario execution or independent acceptance is incomplete. |
| PAY-22 | Finance signs off liabilities, fees, refunds and revenue definitions. | BLOCKED | External merchant/provider/business approval unavailable; engineering gaps separately retained. |
| PAY-23 | Owner signs off payment policy and customer disclosures. | BLOCKED | External merchant/provider/business approval unavailable; engineering gaps separately retained. |
| PAY-24 | Operations signs off fulfilment gating and failure procedures. | BLOCKED | External merchant/provider/business approval unavailable; engineering gaps separately retained. |
| PAY-25 | Live provider credentials and activation remain disabled until separately authorised. | PASS | No credentials supplied or activated; runtime rejects live mode/keys; defaults OFF. |
| PAY-26 | Existing P0 cylinder/branch/capacity controls remain enforced. | BLOCKED | Required engineering, scenario execution or independent acceptance is incomplete. |

Actual file/source/security/evidence/outstanding details: [machine-readable matrix](paystack-rtm.json). No scope removed.

Coverage:2/18 requirement sections verified complete;16 partial. Scenario verification and gate pass counts remain independent. Route journey coverage is unmeasured; no complete provider/device journeys executed. All blocked and untested rows remain in denominators.

## Merchant configuration check — 9 November 2026

New deployment `dpl_GKt5Ls6wHDHk1CxdzaRbSc8k8dGQ` is Ready. Vercel test-key variable exists; secret cannot be downloaded and has not been validated against Paystack. Hosted configuration returns available=false. Existing authenticated policy remains disabled with fee=null, channels=[], providerAutomaticFees=unknown. Added test mode and synthetic-data environment values for next deployment; kept gateway disabled. Await merchant signing-mode confirmation and approved fee/channel policy before sandbox exercise. No payment attempted; full scope/NO-GO unchanged.

## Standard-signature deployment — 9 November 2026

Merchant supplied Test Mode screenshot with correct URLs and no separate signing secret. Configured explicit legacy x-paystack-signature HMAC SHA512 verification using server test secret; no silent fallback. Deployment dpl_E7neXt1G1ALvLx8SjVwHEfs6oM9u is Ready. Actual hosted unsigned/forged events return401 and checkout available=false; 4 adapter/policy and 6 orchestration regression checks pass. Evidence: [hosted signature rejection](../payments/paystack/evidence/merchant-hosted-signature.txt), [tests](../payments/paystack/evidence/merchant-signature-tests.txt), [orchestration](../payments/paystack/evidence/merchant-orchestration-tests.txt). Runtime flag is enabled for webhook validation; existing DB gateway policy remains disabled. Shared Vercel flag applies to Production/Preview, but test/data/signature configuration is scoped to Production; incomplete Preview config fails closed. No real signed event or provider transaction verified yet. Fee bearer, approved fees/channels and actual sandbox exercise remain outstanding. All prior scope and NO-GO preserved.

## Customer-paid fee choice — 9 November 2026

User selected customer as fee bearer. Saved governed draft `fac05363-95a6-489b-b147-691a549bef19` in isolated client demo, using public local NGN rates solely as a candidate requiring merchant verification. Not applied: enabled=false, passThroughApproved=false, providerAutomaticFees=unknown. Existing separate checkout fee and explicit amount acceptance reused. Four fee/policy checks pass ([evidence](../payments/paystack/evidence/customer-fee-choice-tests.txt)). Dashboard automatic fee OFF confirmation, merchant terms/channels, independent approval and actual provider sandbox checkout remain pending; no new completion claims or production activation.

User confirmed automatic pass-fees already OFF. Existing customer-fee draft updated via governed approval.edit; active policy remains disabled. Concrete card-only public-local-rate sandbox proposal presented for approval; live/merchant-specific acceptance remains outstanding.

## Approved sandbox submission — 9 November 2026

User approved exact card-only fee policy. Existing request `fac05363-95a6-489b-b147-691a549bef19` submitted for independent review; status pending_approval, zero decisions. Active policy remains disabled/version1. Existing risk4 rule requires two independent reviewers covering owner and finance; requester is sole demo owner, with one finance account. Third distinct test identity needed; permission requested to add clearly labelled sandbox-only requester, not yet created. Actual self-approval returns403 SELF_APPROVAL. [Submission evidence](../payments/paystack/evidence/sandbox-policy-submission.txt); [12 passing regression checks](../payments/paystack/evidence/sandbox-approved-policy-tests.txt). Provider checkout, genuine signed webhook and receipt remain unexecuted. Production NO-GO and prior scope retained.

## Authorised third sandbox identity — 9 November 2026

One explicitly authorised labelled synthetic finance requester created/audited in dedicated client demo only; random credentials saved privately (0600). Existing identities unchanged. Prior owner request cancelled as superseded; request `521b825e-c7b5-45ba-93ff-f8e831a3e4f1` received two distinct synthetic owner/finance test decisions through the existing APIs. Policy version2 ACTIVE; actual configuration available=true, environment=test, walletFunding=false. Synthetic approval exercise does not represent independent real-business review. No approval rule changed.

Card-only customer-paid sandbox policy now active with approved100000naira gross ceiling.12 regression tests and hosted auth/customer-isolation checks pass. Separate labelled synthetic delivery test location governed through manager/owner, preserving all real coverage boundaries. No serial inspection fabricated; empty-cylinder stock guard remains enforced. Native build/live activation not performed.

Actual hosted provider initialization/charge/webhook/receipt remain pending; `.invalid` customer addresses are intentionally ineligible and a real test mailbox was requested. Full Paystack scope remains PARTIAL, production NO-GO/import holds unchanged. Evidence: [requester creation](../payments/paystack/evidence/sandbox-requester-created.txt), [synthetic decisions](../payments/paystack/evidence/sandbox-three-account-approval.txt), [regression checks](../payments/paystack/evidence/sandbox-requester-regression-tests.txt), [hosted checks](../payments/paystack/evidence/sandbox-requester-hosted-tests.txt).

## Restricted invoice quote repair

Actual test order/invoice checkout reached a42501 invoice permission error. The runtime correctly has SELECT/INSERT-only access to immutable invoices; SELECT FOR UPDATE required UPDATE. Removed that lock and retained the source-order FOR UPDATE, shared with invoice corrections. No grants/triggers relaxed. PAY-INVOICE now denies invoice row locks in its fixture and checks source locks through quote/initialization/posting;6 orchestration checks/web types pass. Actual restricted Neon runtime reaches the intended409 real-email guard. [Before](../payments/paystack/evidence/sandbox-restricted-runtime-before.txt), [after](../payments/paystack/evidence/sandbox-restricted-runtime-after.txt), [regression](../payments/paystack/evidence/sandbox-invoice-lock-tests.txt).

Provider initialization/payment/webhook/receipt remain unexecuted pending an authorised real test mailbox. Test order remains retained and explicitly marked DO NOT DISPATCH OR FULFIL; no actual fulfilment authorised.

Invoice lock fix deployed `dpl_9hLUecG3X9f3k45fTXbaiQ32nrb4` READY on canonical demo. [Hosted restricted-role quote](../payments/paystack/evidence/sandbox-invoice-fix-hosted.txt) now reaches409 real-email guard; [final12 regression checks](../payments/paystack/evidence/sandbox-final-regression-tests.txt) pass. Genuine provider initialization/payment/signed-success/receipt remain pending authorised real test mailbox.

## Official merchant sandbox acceptance — 9 November 2026

User authorised a real test mailbox; existing synthetic customer email updated with stable ID/history/password preserved, no duplicate customer or real-customer merge. Real Paystack Test Mode credentials accepted and hosted checkout exercised with provider Success and Declined options.

| Check | Executed result |
| --- | --- |
| Successful hosted test | NGN7,005.08 total, NGN6,800.00 principal, NGN205.08 customer/provider fee |
| Server verification and replay | paid; repeat verify retains exactly1posting and1principal payment |
| Invoice allocation | NGN6,800.00 immutable invoice unchanged, paid6,800.00, due0 |
| Receipt | Private branded PDF200, separate principal/fee; visually reviewed |
| Declined hosted test | failed; invoice paid0/due6,800.00; receipt404 |
| Customer UI | Verified paid-once and failed screens observed |
| Paystack dashboard | Successful transaction/fee confirmed; test URLs saved; automatic pass-fees OFF |
| Automatic signed webhook | **NOT VERIFIED** — inbox has0events; manual server verification posted success |

Evidence: [initialization](../payments/paystack/evidence/merchant-real-test-initialization.txt), [verification and PDF](../payments/paystack/evidence/merchant-real-test-verification.txt), [decline](../payments/paystack/evidence/merchant-real-test-decline.txt), [actual database effects/webhook gap](../payments/paystack/evidence/merchant-real-test-posting-proof.txt), [success UI](../payments/paystack/evidence/merchant-test-payment-verified.png), [decline UI](../payments/paystack/evidence/merchant-test-payment-declined.png).

Two clearly labelled sandbox order histories retained; neither authorises real dispatch. PDF stored privately under .data; no credentials/mailbox included in published evidence. Genuine automatic webhook delivery, hosted background processing, refund/settlement/full-scope and production gates remain open. No entire requirement promoted solely on this bounded test. Original production NO-GO/live unsupported/walletfundingfalse/import hold preserved.

## Merchant return after verification

PAY-RETURN-R01 adds a merchant return link and automatically continues to the corresponding EasyGas page after the server verifies payment. The native callback retains the app link, and pending verification retains a retry action. [Requirement and controls](paystack-return-rtm.json) · [Executed tests](paystack-return-evidence.txt)
