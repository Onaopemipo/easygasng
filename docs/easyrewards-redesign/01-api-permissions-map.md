# EasyRewards API and permissions

| Action | Authoritative records | Boundary |
| --- | --- | --- |
| `rewards.summary` | Owned ledger and order/service references, approved branch policy, active runtime flags, award queues and eligible offer catalogue | Customer and commercial roles. Session identity and current branch determine scope. Strict empty DTO. Up to 200 ledger entries. |
| `rewards.referral` | The authenticated customer’s code and approved HTTPS share URL | Existing approved programme, issuance flag and branch constraints. |
| `rewards.referral.attribute` | Governed attribution to a valid referrer | Existing same-branch, one-time, first-purchase and self-referral checks. |
| Checkout reward selection | Existing approved offer or general discount policy, eligible products and committed ledger | Existing authoritative checkout rechecks and idempotency. |
| Admin reconciliation and corrections | Existing audit, approval and ledger records | Existing owner/finance/manager permissions and branch scope. |
