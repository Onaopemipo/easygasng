# Rollback

Revert the isolated public-width change set if it was committed separately. Otherwise reverse only its scoped hunks in `apps/web/components/site.tsx`, `apps/web/app/layout.tsx` and `apps/web/app/homepage.css`, then remove `apps/web/app/public-width.css`. Preserve any unrelated changes in shared files. The revert also removes the Home anchor recovery effect and restores the original homepage width rules.

After reverting, run the focused regression checks and compare the storefront with the before captures. For a hosted rollback, rebuild and promote the last approved frontend revision through the existing release workflow. No data repair, migrations, payment changes or provider credential changes are required. The existing production NO-GO remains in force.
