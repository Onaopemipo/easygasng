# Customer booking permissions

All reads and writes use dispatch's fresh session/active-account lookup. Customers and commercial accounts see only customer_id = actor.id. Technicians see assigned branch-scoped work; service managers, safety, inventory and finance retain their existing restricted operations. Owners have existing business authority. This phase grants no new staff roles or financial permissions.

The new operation result store checks actor, action, canonical request hash, original role and branch before returning a committed replay. Cross-customer operation reuse conflicts without exposing the original result. The GET outcome endpoint filters actor/role/branch; native booking recovery filters customer/idempotency identity. Neither endpoint accepts an arbitrary customer ID. SQL values are parameterized. Customer responses remove request hashes, native idempotency keys, technician IDs, collector IDs and material acquisition costs.

business_operation_results has RLS and trusted easygas_server policy/grants only. It is in the private schema for managed deployments, with no anonymous/authenticated Data API policy. Committed results are immutable. Existing immutable audit/quote/report/decision records remain unchanged. CSRF/origin, bounded request size, media ownership/metadata stripping and private no-store API protections remain in the shared route.

Replay does not re-execute effects. Revoked sessions and suspended accounts cannot replay. Changed role/branch cannot read the original operation result. No authentication token, customer address or equipment description is stored in the browser operation-key map; only a SHA-256 fingerprint and random operation key are stored per account. Existing logout clears easygas session storage.
