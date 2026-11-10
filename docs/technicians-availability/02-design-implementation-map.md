# Design implementation map

The existing grouped sidebar, global header and all route definitions are preserved. Only the technicians workspace is replaced. `apps/web/components/technicians-availability.tsx` renders the heading/actions, permission-filtered service chips, four KPIs, directory/cards and upcoming rail. Scoped CSS in globals.css uses current theme tokens. Desktop splits directory/rail; tablet stacks with 2x2 KPIs; narrow web uses cards. Filters expand on demand. All IDs derive from existing UUIDs (abbreviated visibly with full ID in details), not invented EG numbers.

Existing Modal handles focus/return/Escape and shared branded unsaved-change confirmation. Existing ServiceForm now supports explicit Lagos datetime conversion and dirty-state indication. Invite/profile/access workflows reuse existing staff operations. Verification exposes safety reviewers as well as technicians, preserving the old safety_review qualification flow. Branch creation/role authority is not widened.

Native `TechniciansManagement.tsx` is reached through the existing staff More/account destination with role checks in App.tsx and the backend. The field-technician early return and approved Home/Jobs/History/Profile sources are unchanged. Native management supports server KPIs, search/status/paging, details, invite, profile name, independent verification/revocation, creation and blocking sheets; native advanced filters/calendar, full accessibility/device acceptance remain open.

Calendar date filters use Africa/Lagos, explicit create/expiry input uses Lagos regardless of device timezone. Appointments retain actual date+time; earlier settings-only date-only preference is preserved, not applied to service appointment times.
