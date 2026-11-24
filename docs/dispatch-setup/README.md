# Dispatch setup checklist and ready-first assignment

The approved change consolidates branch setup into one four-step checklist in Dispatch Centre. A new scoped read returns canonical branch, driver, vehicle, active-trip and delivery configuration prerequisites. It performs a bounded set of aggregate reads, independently of the order queue, without starting trips or changing business records. It does not claim order-specific eligibility or production release readiness.

Direct actions open the existing Drivers and Fleet workspaces, Operations Centre’s Branches tab and the selected branch’s Delivery & Dispatch settings category. Existing account/vehicle/password/setting approval controls remain. Managers see only their branch; vehicle registration remains owner-only. Stale or failed setup requests clear old readiness and offer refresh.

The shared assignment chooser used by Orders and Dispatch lists ready drivers first. False/unknown readiness is kept in a collapsed Blocked drivers section. Expanding reveals the original exact blockers, responsible roles and resolution steps. All final assignment guards remain authoritative. The Dispatch keyboard trap now ignores controls inside closed sections.

Focused verification and responsive browser acceptance are in progress. Initial test evidence retained a fixture error (incorrect privilege-table assumption), resolved using the existing staff privilege override table. Browser acceptance caught the checklist’s initial array assumption for delivery windows; it now reads canonical comma-separated text, as ordering does. No historical source proof was overwritten: seven reviewed web continuations retain committed baselines, and all prior native/final-guard holds remain.

[Manual](../user-manual/dispatch-setup.md) · [Matrix](../traceability/dispatch-setup-rtm.md). No new mobile binary/export or commercial-production approval.
