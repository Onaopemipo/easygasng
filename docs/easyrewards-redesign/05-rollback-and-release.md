# Rollback and release

**Public commercial production remains NO-GO.** The redesign is available in the local worktree. The existing demo and production deployments retain their current releases. Test programme flags and fixtures apply only to the isolated QA processes.

Pre-change revision is `54b1b15`, with pre-existing changes in the shared worktree. For a rollback, revert the EasyRewards changes in a scoped commit or redeploy the last known-good web and native releases. Preserve unrelated work when reverting shared entry points and the root web stylesheet imports. The optional `referralEnabled` field on `rewards.summary` can stay during a client rollback. The new client understands the previous response during rolling deployment.

Rollback requires no migration or financial reversal. Preserve committed point events, checkout records, refunds, wallet entries, independent approvals, issued referral codes and audit trails. After reverting, use a synthetic account to check sign-in, balance, history, eligible checkout and referral visibility before resuming a rollout.
