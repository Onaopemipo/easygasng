# Shared editable design system

Reuse the official EasyGas assets and repository colour tokens; do not infer exact hex values from generated mockups.

**Desktop:** existing grouped sidebar, 12-column fluid workspace, 24–32px responsive gutters.
**Tablet:** 2 columns where readable.
**Mobile:** one-column, bottom tabs, safe-area insets, native keyboard handling.

Components: OwnerMetric (verified/zero/unavailable/stale), OwnerPriority, OwnerStatus, BranchFilter, PeriodFilter, ApprovalRow, EvidencePanel, DecisionConfirmation, TransactionRow, AuditEvent, Empty, Offline, Stale, Denied, Retry, Loading.

Accessibility: WCAG AA where applicable, 44pt iOS/48dp Android touch targets, visible focus, dynamic text, reduced motion, chart text equivalents, light/dark/system.

Sensitive decisions: dedicated review and confirmation screen, not generic offline queued mutation. All status transitions server-confirmed.
