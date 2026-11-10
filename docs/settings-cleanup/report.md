# Business settings cleanup — 10 November 2026

The screenshot exposed a generic object-to-string formatter producing `[object Object]`, raw internal keys and kobo amounts. Gas tools were rendered above every category. The existing authenticated settings API and approval system remain authoritative.

Implemented a read-only payment summary with explicit checkout/card-funding/environment labels, exact naira limits, configured fee and expandable full fee/approval details. Other object settings render labelled fields; history and approval text recursively formats nested objects. Gas tools are collapsed, category selection clears search, search spans categories with an empty state, and action errors use error notices. Existing role-restricted edit/history/restoration and independent approvals remain intact. No configuration, financial record, credential, ledger or database mutation was performed.

Executed: 5 focused summary/settings-date/Paystack policy tests, web typecheck and production build pass. Browser inspected the actual summary component rendered with a clearly labelled isolated fixture and confirmed collapsed/expanded details. Desktop screenshot saved. Full authenticated settings page and physical/mobile integration acceptance remain untested. No deployment or native build performed.

Production NO-GO, historical import hold, retain-all instruction and unrelated pending work remain unchanged.

## Delivery Locations continuation

SETUP-03 extends the same presentation to location settings: separate active/archived and customer visibility labels; deduplicated area; branch; missing boundary warning; expandable address-confirmation policy, display position, description and all additional fields. An active flag never implies coverage approval. Archived/hidden and configured/blank boundary states covered. Six focused tests pass; isolated desktop component verified. Full page/mobile and hosted rollout remain open.
