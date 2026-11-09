# EasyRewards permissions and privacy

Existing dispatch authentication revalidates active users and sessions on every call. HTTP origin/CSRF and rate-limit controls remain in the common route; strict Zod DTOs reject caller-supplied customer IDs/balances/policies in summary and referral endpoints. Customers/commercial customers read only their own ledger/outcomes and checkout their own points. No customer ledger-write API exists. Staff must use audited independent governance corrections.

Owner/finance/manager reconciliation is branch scoped. Only owner may use owner authority across scopes; a manager/finance branch override is rejected. Exports require recent password verification and repeat authorisation, not a cached UI export. CSV cells neutralise spreadsheet formulas; export events contain scope/row count, not a copied customer statement. Existing customer privacy export continues to use owned reward_entries only.

New relations have RLS enabled and no anon/authenticated grants or policies. Trusted runtime role has only SELECT/INSERT on immutable evidence/discount/code ledgers and column-limited UPDATE on job outcomes/referral committed award fields. Triggers prohibit source snapshot/attribution mutation. In-app SQL, not a public service-role browser key, is authoritative. Hosted packaging and isolated real PostgreSQL privilege/concurrency validation remain acceptance gates.

Referral code is 128 random bits, unrelated to customer ID. Own referral history does not return the referred user's customer/order ID. Raw referral attribution is not exposed in customer exports. HTTPS public links exclude credentials/local/IP domains; APP_URL must be the approved public site. No address sharing or address-based automatic fraud decision. Suspicious-pattern review/retention policy and actual device accessibility need further acceptance.

Point debt is a restricted points state and finance operational incident, never silent monetary wallet debit. No platform tenant namespace exists: this is the existing single EasyGas installation with branch scope, not proof of a multi-tenant isolation product.

## Completion controls

Actual PostgreSQL SET LOCAL ROLE testing verifies the canonical runtime role is NOLOGIN and not BYPASSRLS; explicit trusted_server policies cover the related rewards tables. Public-denial testing gives a disposable public role schema usage and SELECT on metadata: RLS still returns zero rows, and ledger INSERT is refused. No public credential was issued.

Refund source allocations/identity/amount become immutable once prepared; approved line quantities and monetary totals cannot exceed the original remaining source. Offer policy rows are locked before reading approved economics and checking budget, preventing a policy activation race. Native selectors and history use server-owned summaries; no client balance is authoritative. Device/runtime accessibility and final visual acceptance remain unverified; system-themed native surfaces and the existing 15px typography are preserved in code, not represented as certification.
