# Settings monetary display repair — 10 November 2026

The settings cleanup's scalar money renderer treated the authoritative stored kobo as naira. Hosted read-only audit confirms gas.price_per_kg version1 stores180000kobo, correctly ₦1,800/kg. The shared UI money formatter and setting editor already divide by100; checkout pricing was not changed. Payment gateway nested fee formatting already uses kobo correctly.

SettingSummary now uses its existing exact two-decimal naira(kobo) formatter for scalar money too. No setting value/version, pending request, price engine, approval rule, ledger or schema is changed. Gas180000/180500, delivery500000, zero and fractional naira101 are tested; wrong ₦180,000/₦18 double-conversion displays are rejected and non-money/null values retained.

Fifteen focused settings/gas/approval regressions pass. Web types/build and rollout acceptance recorded in evidence. This is a presentation-only repair; production NO-GO and other pending scope remain unchanged. No native build or VPS work.

Rollout accepted: source0fc8d56, Vercel dpl_Be164Ky3KuEukFCPzMeE893Q2sk9 READY at the stable demo alias. Actual owner browser confirms ACTIVE VALUE VERSION1 ₦1,800.00. Before/after hosted read-only audits match180000kobo/version1. New display does not activate the pending ₦1,805 request. Fifteen scoped tests, web types/build and traceability checks pass. No native build or database migration.
