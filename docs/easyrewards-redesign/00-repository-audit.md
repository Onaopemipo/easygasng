# EasyRewards redesign audit

The approved screenshot supplied visual direction. The regenerated Markdown supplied the implementation and acceptance requirements. Baseline is commit `54b1b15` with unrelated changes in the shared worktree. The previous checkpoint passed 690 regression tests. The existing Android minified startup defect and production NO-GO remain tracked.

- The customer rewards page is rendered by `apps/web/components/site.tsx` and `apps/web/components/easyrewards.tsx`. Its previous loading gate depended on an unrelated wallet request.
- `apps/mobile/App.tsx` and `apps/mobile/EasyRewards.tsx` provide the native screen, offer handoff and referral actions.
- `rewards.summary` returns ledger totals, approved policy, customer-scoped offers, pending award event count and the latest 200 entries. Both order and service references are joined with customer ownership. `rewards.referral` and `rewards.referral.attribute` retain their existing policy checks.
- The points ledger is separate from monetary purchase credit. Approved policies and independent activation, checkout revalidation, refunds and reward reversals remain governed by existing domain code.
- The design includes View all. The regenerated brief prohibits a new history route or endpoint. The existing bounded history will remain visible with an explicit limit.

Authenticated local runtime baseline returned HTTP 200, zero available points, no approved policy, no eligible offers, all three programme capabilities off, and a 200-entry history limit. This describes the synthetic test account only.
