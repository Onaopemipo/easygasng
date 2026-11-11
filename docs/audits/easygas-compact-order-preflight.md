# Compact ordering preflight — 11 November 2026

Clean base 834e701, review branch codex/compact-order-widget. The prior Vercel
synthetic demo is separate from the local production-readiness branch; production
remains NO-GO. npm workspaces and Expo package locks retained. Release CI already
includes web and mobile type checking; no migration, native build or deployment
is required for this UI change. Baseline: 20 passed shared gas/approval and
same-delivery addition tests (see ../qa/compact-order/baseline.txt). The supplied
approved screenshot is design input, not a record of the local baseline.

| Path | Existing / risk | Change / evidence |
| --- | --- | --- |
| / homepage and GasOrder compact | Existing hero, guest session draft and configurable gas estimate. Capacity/quantity presentation is tall; address inference can clear a manually selected area. | Compact icon/title, two price columns, four labelled controls, summary and draft handoff. No hero asset or global navigation edits. |
| /gas-order, /checkout | Existing canonical quote, saved address, guest authentication handoff, mixed orders, stock checks, and idempotent checkout. | Preserve checkout payload, quote snapshots and stock gates. Compact estimates are not binding quotes or stock guarantees. |
| Native customer Home → GasOrder | Existing catalogue, cylinder cards, editable decimal input, saved addresses, staged services and NativeForm checkout. Quantity was rounded during editing and the stepper could create invalid increments. | Compact native price/capacity/location/address controls; shared integer-gram stepping; existing native checkout stays authoritative. |
| /api/gas.catalogue, /api/gas.quote | Active branch/area lookup, versioned fee/price/quantity and integer gasLine calculations; quote is not a reservation. | Reuse endpoints; selected area scopes catalogue and quote. No policy, ledger, or reservation changes. |
| /admin/settings, /admin/orders | Governed pricing and areas; existing same-delivery cutoff and zero additional delivery fee. | Preserve actions and snapshots. Shared gas/approval and addition suites cover invariants. |
| Phone-assisted, wallet, rewards, Paystack, invoices, dispatch, tracking, driver and technician | Existing separate workflows. Production provider/device gates remain open. | No new order paths or permission changes. Keep all scenarios in traceability. |

No sample amounts, production customer data, payments, messages or import writes.
