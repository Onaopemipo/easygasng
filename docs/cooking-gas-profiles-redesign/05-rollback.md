# Rollback and recovery

Publish the web and backend changes together. Keep the previous web revision and the previous native build available. During rollback, restore the previous web and backend revision as a pair. If a new native build is already in distribution, keep the additive API responses available until those clients are rolled back or replaced.

For source rollback in this dirty worktree, reverse only the Cooking Gas Profiles hunks and newly added files using the phase diff. Shared files already contained other work, including `App.tsx`, `Workflows.tsx`, `site.tsx` and `workflows.tsx`. Never reset those entire files to the baseline commit.

There are no new tables or migration steps. Preserve committed profiles, supply reports, verified history, consent and audit records. For an interrupted supply update, reload the profile, review the last confirmed reading and retry only if a change is still needed. A duplicate creation returns the existing active-size rule instead of adding a second row.
