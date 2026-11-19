# Customer notification inbox

The customer Notifications page now uses a compact inbox instead of large expanded cards. Eight summaries appear per page, with All/Unread counts, server search, individual/all read controls, refresh and Preferences. A focused dialog contains the original full message, timestamp and verified related-order action. Code notifications use a neutral preview; sandbox/payment meaning remains visible. No notification history is deleted.

The page reuses `notifications.list` and `notifications.read.bulk`. Search is an optional, trimmed, 100-character parameter applied before pagination and count calculation, with literal matching and bound SQL parameters. Order links are emitted only after a customer-ownership check; staff permission/branch rules retain their previous behavior. Read timestamps and recipient guards are unchanged. Identity keys, abortable reads, scoped acknowledgement IDs and explicit error/empty states keep client state bounded to the current account. The native dialog has focus boundaries, Escape, focus restoration and scroll locking.

## Executed evidence

27 focused checks pass, including actual component rendering, code preview/destination handling, literal global search, pagination, recipient privacy, first-read timestamps, customer dashboard, driver assignment and prior My Orders regression. Final web build and typecheck pass. [Logs and screenshots](evidence/) and [browser observations](evidence/browser-observations.txt).

Local browser verification covered 1280×720, 768×1024 and 390×844; light/dark themes, search/page changes, full messages, individual/all read, caught-up/empty search, keyboard focus, preview-server failure/recovery and an actual owned-order handoff. A local acknowledgement-state error found during recovery was corrected and its successful read path retested before final checks.

[Requirement/source/control mappings](../traceability/customer-notifications-redesign-rtm.json) and [readable matrix](../traceability/customer-notifications-redesign-rtm.md). Implementation4/4, verification4/4, critical safeguards1/1, customer route1/1 and gates4/4 apply only to this bounded local web phase.

## Remaining broader gates

Hosted rollout, production-volume search, formal assistive-technology and physical-device acceptance remain unverified outside this bounded redesign. No deployment or native build performed. Existing production NO-GO, actual-import hold, retain-all policy, previous phase denominators and unrelated work remain.

The repeatable isolated fixture is `scripts/prepare-customer-notifications-qa.ts`; it refuses hosted/production configuration and stores private local paths/accounts only in ignored `.data/customer-notifications-qa.json`. Its synthetic sample messages are UI evidence, never provider, payment or operational fulfilment evidence.
