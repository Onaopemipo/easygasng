# Settings monetary display repair — 10 November 2026

The settings cleanup's scalar money renderer treated the authoritative stored kobo as naira. Hosted read-only audit confirms gas.price_per_kg version1 stores180000kobo, correctly ₦1,800/kg. The shared UI money formatter and setting editor already divide by100; checkout pricing was not changed. Payment gateway nested fee formatting already uses kobo correctly.

SettingSummary now uses its existing exact two-decimal naira(kobo) formatter for scalar money too. No setting value/version, pending request, price engine, approval rule, ledger or schema is changed. Gas180000/180500, delivery500000, zero and fractional naira101 are tested; wrong ₦180,000/₦18 double-conversion displays are rejected and non-money/null values retained.

Fifteen focused settings/gas/approval regressions pass. Web types/build and rollout acceptance recorded in evidence. This is a presentation-only repair; production NO-GO and other pending scope remain unchanged. No native build or VPS work.
