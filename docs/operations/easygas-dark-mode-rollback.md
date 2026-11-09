# Dark mode rollback

The repository had an unborn main branch and no HEAD at preflight. Do not use git reset, blanket checkout or an invented baseline commit to roll back these changes. Preserve all unrelated work.

For an appearance emergency, set `EASYGAS_DARK_MODE=false` in the deployment environment and restart/rebuild that runtime. The bootstrap and provider force light, theme controls disappear, and stored browser preferences are preserved. This leaves homepage data, publication state, customer records and the administration theme intact. The default is true. `THEME-ROLLBACK` verifies the early-light script; validate the deployed runtime after changing the flag.

For one affected browser, choose Light in Appearance or the header toggle. Re-enable the deployment flag after the underlying issue has been fixed and the relevant routes pass again.

Do not drop testimonial/version/event tables or delete financial/safety records. To stop public feedback, propose `testimonials.policy.enabled=false` through the existing independent approval workflow, or hide an individual publication after owner identity verification. Withdrawal remains a customer action. Keep the audit history and existing media records private; do not recreate consent from a backup blindly.

After rollback, verify login/logout, public navigation, gas estimate and draft preservation, cart availability/total, checkout restrictions, customer bookings, account data, footer contacts, testimonial privacy and the light administration boundary. Hosted migrations have not been applied; review additive migrations 034–037 and mirrored Supabase files before any separately authorized managed rollout. Use existing backup/recovery runbooks for database recovery, never a visual rollback to reverse business transactions.


## Staff theme extension — 30 October 2026

The administration light-only boundary described in the original phase is superseded. All administration and restricted staff routes now share the root theme provider and header switch. See `docs/traceability/easygas-admin-theme-rtm.md` for current scope and executed evidence. Global light-only rollback remains supported.
