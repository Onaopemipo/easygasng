# Active sidebar visibility and scroll continuity

[Machine-readable matrix](sidebar-focus-rtm.json) · [Implementation and evidence](../sidebar-focus/README.md)

| ID | Approved requirement | Gate | Local status |
| --- | --- | --- | --- |
| NAVFOCUS-01 | Preserve sidebar scroll across routes/reload; reveal the active item with minimal movement | NAVFOCUS-G01 | VERIFIED_COMPLETE |
| NAVFOCUS-02 | Expanded/compact/mobile visibility without moving keyboard focus; retain drawer behavior | NAVFOCUS-G02 | VERIFIED_COMPLETE |

Coverage: implementation 2/2; verification 2/2; critical 0/0; shared sidebar route family 1/1; gates 2/2; exclusions 0. Shared navigation acceptance does not imply acceptance of every page feature. All earlier requirements and holds remain in their matrices.

Sources: existing pathname/active route and permission-filtered navigation; numeric per-user/per-mode sessionStorage offset only. Implementation: admin-navigation.tsx, sidebar-scroll.ts and scoped globals.css scroll behavior. Actual routes, access.allowed, backend checks, mobile focus trap, aria-current and counters retained.

Executed:15 regressions,1 saved-browser-evidence validator, actual desktop/compact/mobile/reload/direct-entry/saved-group/Back checks, production build and TypeScript pass. See the JSON mappings for exact files, named tests, sources, controls and logs. Matrix validation is recorded separately in [traceability validation](../sidebar-focus/evidence/traceability.txt).

Changes:19 November2026—scope recorded before implementation; active group expansion waits for saved preference hydration, restored offsets are tab/user/mode scoped, active visibility adjusts only the menu viewport. Final local checks pass. No scope removed.

Outstanding outside local scope: hosted rollout, physical Firefox/Safari and formal accessibility checks are unperformed. Existing demo release, order-modal work, production NO-GO, actual-import hold and retain-all remain unchanged.

Subsequent authorised rollout (19 November2026): both changes are now deployed and verified in [OSREL-01–03](order-sidebar-demo-release-rtm.md). The earlier local-phase rollout limitation is superseded by that release; original IDs, acceptance scope and production holds remain.
