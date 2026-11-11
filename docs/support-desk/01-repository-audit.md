# Support Desk preflight — 11 November 2026

Base 834e701 with an uncommitted compact gas-order implementation on
codex/compact-order-widget. Preserve those changes. npm workspaces, Next and
Expo. Synthetic Vercel demo is not production. Migration 075 remains the
baseline; production NO-GO and retain-all remain.

| Surface | Existing | Gap / proposed change |
| --- | --- | --- |
| /admin/support | Existing grouped sidebar, scoped ticket/message reads, update and reply | Dashboard/KPIs, dedicated empty state, split inbox and contextual forms; staff intake requires an existing customer |
| /support and /help | Customer owns tickets, linked order is verified; public help/contact separate | Replace inline support-workspace forms with modal; preserve contact flow |
| Customer mobile Conversations | Scoped list and inline intake/replies | Bottom sheets and one conversation at a time, preserve navigation |
| Driver/technician | Existing exception reporting and own operational access | Do not change field apps or grant queue access |
| support_requests / support_messages | Stable IDs, scope, basic states/assignment, internal flag, history | Preserve schema; optional inbox response and staff customer reference. SLA, attachments, real-time and complete advanced state-machine work remain open |
| Governance and finance | Replies/status audited; in-app notices; financial controls outside Support | Staff intake audited; do not create customers, send external notifications or mutate financial/order records |

Risks: unbounded claims from a 100-row list, cross-branch customer selection,
notes leaking to customers, false empty state on fetch failure. Target scoped
aggregates, exact existing identity, existing auth checks, failure/retry states.
Baseline evidence is recorded separately; approved screenshot is visual reference,
not measured before-state or a source of data.
