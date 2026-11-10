# Audit History pagination —11November2026

Preflight found the existing audit read was a global owner/administrator-only array capped at200records. The administration record table then searched only that truncated array. Grouped sidebar and route remain unchanged.

The existing audit action now supports an opt-in paged view with10/25/50/100rows, authoritative total/page counts, literal full-history search, newest-first created_at/id ordering and bounded validated inputs. Empty and out-of-range pages are handled safely. Legacy callers still receive the capped array. No migration is required.

The dedicated workspace has First/Previous/Next/Last, row-size selection, debounced search, loading/error/empty states, retry and Refresh history. Search or row-size changes reset to page1. Active requests cannot overwrite a newer search result. Display times use Africa/Lagos.

A browser check reproduced one duplicate across offset pages when a new event arrived between requests. The final version carries an explicit server-time cutoff across pages. The final version also uses precise timestamp/ID cursors for Next/Previous, so late commits above the previous page boundary cannot repeat existing rows. It displays the cutoff, while Refresh history/search/row-size changes start a fresh view. This is not a persistent PostgreSQL transaction snapshot: late commits may change counts or become visible according to their position, and joined actor names remain current.

Local regression fixtures verify215matching records beyond the old200cap, deterministic timestamp ties, no duplicate pages, a fresh append excluded from the earlier cutoff and included in a new view, literal wildcard characters, empty/last-page clamping, legacy response compatibility, unchanged canonical events, valid administrator read, role denials and malformed query rejection. Final24focused regressions, web typecheck and production build pass. Actual local browser pages1/2 each contain25rows with zero overlap;10-row selection resets to page1; an empty search shows0–0/page1of1 with disabled navigation. The390px mobile viewport has375px document width; wide columns scroll inside the317px table viewport. Browser evidence is recorded in evidence/. No demo business records were created or changed to test pagination. Existing audit events remain append-only.

Not deployed. Production NO-GO, retain-all policy, previous matrices and all pending inventory/homepage work remain. Native binaries and server hosting changes are outside this phase.
