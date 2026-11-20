# Hosted ledger acceptance

The previous hosted ledger gap is resolved: the supported contract is **GET `/api/finance.ledger`**, not GET `/api/ledger`. The original 405 observation remains in the frozen mobile-device evidence. The client-demo endpoint needed no application change or deployment. Verification tooling and documentation were repaired; no mobile build was created.

Executed 21 November 2026 Brisbane time (20 November UTC) against `https://easygas-client-demo.vercel.app`. This was a business-read-only pass using the existing labelled QA accounts. Authentication/logout and normal read/denial audit records are expected; no financial writes, account assignments, grants, settings or qualification renewals were made.

| Check | Observed result |
| --- | --- |
| Owner / Admin | HTTP 200, all 10 verified-payment rows; 10 pages at limit 1, same fingerprint at limit 500 |
| Finance / Inventory | HTTP 200, 10 rows; exactly the owner's subset for the account's existing Lagos branch |
| Manager, driver, technician, customer, commercial | HTTP 403 for both valid and malformed ledger queries; no rows disclosed |
| Restricted driver and technician workspace sessions | HTTP 403 |
| Anonymous | HTTP 401 |
| Invalid limit, malformed/unknown cursor, extra branch/role parameters | HTTP 400 for owner and finance (14 cases) |
| POST to read endpoint / old GET alias | HTTP 405; no alias or permissions broadened |
| Final cursor | HTTP 200, empty rows, `hasMore: false`, `nextCursor: null` |
| Cache / pagination | `no-store`; bounded pages, unique rows, stable ordering and correct cursor continuation |
| Preservation | All 10 ledger rows unchanged; fingerprints unchanged for 14 orders, three credits and 12 inventory rows |
| Session cleanup | All nine sweep sessions revoked; independent snapshot session also signed out |

[Hosted sweep](evidence/hosted-results.json) stores counts, checks, page metadata and fingerprints, with credentials, tokens and payment/customer row contents omitted. [Independent corrected snapshot](evidence/corrected-snapshot.json) agrees with the sweep. No external provider transaction was attempted.

## Findings and repairs

1. `scripts/verify-mobile-device-hosted.mjs` used the unsupported `ledger` action and accepted error-shaped responses into snapshots. It now uses a shared `finance.ledger` reader, requires successful array responses for other endpoints, follows every ledger cursor, validates the response and cache policy, and revokes its own temporary session in `finally`.
2. The new sweep initially read `branch_id` from `/me`; that endpoint actually returns `branchId`. This verification-script defect was corrected before the completed sweep. The product's authoritative branch restriction remained unchanged.
3. No hosted ledger authorization or financial-source defect was found. The application continues to enforce owner-global / finance-assigned-branch access from the server-side actor. `verified_payments`, orders and service bookings remain authoritative; UI visibility and supplied role/branch parameters grant no access.

## Exceptions and remaining limit

The hosted ledger contains only Lagos rows, matching the existing finance QA branch. **Hosted foreign-branch cursor isolation remains untested (0/1)** because no such payment exists. No hosted role or financial record was altered to manufacture a case. This remains in the expanded acceptance denominator: HLED-03 / HLED-G03 is **PARTIAL**, with hosted preservation and local isolation passed. The original four hosted business-endpoint reads are now **4/4 verified**; these are distinct measures.

The disposable local database ran the real dispatcher under `easygas_server` with Lagos and another branch, three payments at the identical timestamp and cursor boundaries. Owner saw all three, finance saw only its two, a foreign cursor was denied, tied records were not omitted/repeated, five other roles were denied before input validation, and financial source tables were unchanged while read/denial audit records were written. A separate service integration regression also verifies booking-linked ledger receipts. This local evidence supports the implementation but does not convert the unavailable hosted case into a hosted pass.

[Acceptance tests](evidence/acceptance-tests.txt): 5/5. [Service/source regressions](evidence/service-source-tests.txt): 6/6. [Documentation checks](evidence/documentation-tests.txt) validate the matrices and retained manual artifacts. The tests also reject failed/cached/malformed responses, duplicate/nonadvancing/unordered pages and incomplete bounded pagination.

The [traceability matrix](../traceability/hosted-ledger-acceptance-rtm.md) preserves all four requirements, three completed gates and one partial gate. Production **NO-GO**, actual-import hold, retain-all, legacy native navigation, physical-device, provider, signed-build and wider feature gates remain unchanged.
