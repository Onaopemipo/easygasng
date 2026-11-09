# EasyRewards customer model extension

2026-11-02. Local additive revision 043; live activation remains NO-GO.

`users.id` remains the customer/auth key. `reward_entries` is the only points ledger: balances are SUM(points), including historical rows and reversing entries. `wallet_entries` is the only monetary purchase-credit ledger; points do not become wallet credit. No enrolment/balance/customer/auth table is duplicated.

043 adds reward_entry_details (immutable branch/order/policy/kind/original entry and line evidence), reward_jobs (one verified source order, immutable policy/line snapshot, mutable processing outcome), reward_order_discounts (immutable one-per-order point debit and economics), reward_referral_codes (random 128-bit public code) and reward_referrals (one attribution per existing customer and at most one award). All reference existing users/orders/settings versions. New tables are private: RLS enabled, no public Data API policies, restricted runtime grants. Server authentication remains mandatory.

Orders gain zero-default reward_discount_kobo and the total invariant becomes subtotal + delivery - discount. The old subtotal is preserved; stock/quantity and delivery charge do not change. Existing clients omit rewardPoints and retain their prior behavior. Transactional checkout commits the discount/point debit/order together, with no separately abandoned point hold. Failed transactions roll back all three. Pending payment is still pending payment.

No historical awards, edits, reset, balance cache, expiry or migration fixtures. Historical conversion outcomes remain replayable, but new point-to-wallet conversion is closed. Legacy rows without metadata remain visible and are labelled historical. Their original branch cannot be reconstructed from current customer branch; reports explicitly disclose this limitation.

Service-only earning, partial fulfilment/refund allocation and an administrable reward catalogue are outstanding. They must not be represented as active from route existence or a rendered card. See the complete 38-row RTM.

## Completion continuation — revisions 044–046

The earlier outstanding application code has now been extended: `credit_requests` accepts immutable line allocations and scoped retry identity; `reward_refund_allocations` records cumulative compensation; `reward_service_jobs` extends the same immutable points ledger to verified completed labour; `reward_offer_claims` consumes approved versioned offer budgets; `reward_referral_reviews` is materialised only by the existing shared approval engine; `reward_offer_notices` deduplicates consented in-app offers. There is still no second customer, points balance, wallet, checkout or approval engine.

Revision 046 explicitly permits the existing NOLOGIN, non-BYPASSRLS trusted server role on the rewards tables. Grants alone did not pass RLS; this was corrected and tested using the actual private-schema migrations under SET LOCAL ROLE. Public roles remain denied even when an isolated test deliberately gives them a SELECT grant.
