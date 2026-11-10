# Technicians & Availability audit — 10 November 2026

Audit completed before implementation edits. Baseline: 628 tests, 607 pass, 21 environment-dependent skips, zero failures; web/mobile TypeScript and web production build pass. Evidence in evidence/. No lint script exists. Native binary builds remain deferred by the user's prior instruction; physical devices and staging acceptance are not established by typechecking.

## Existing architecture and routes
npm workspace Next 16 web, separate Expo React Native application, shared business-rules package. SQL abstraction supports PostgreSQL and isolated PGlite fixtures. Migrations001–074; existing trusted-server RLS, custom session authentication, outbox/worker, private media and audit_events. release-validation.yml runs regression/type/build/dependency gates. main is the existing branch; no infrastructure or credentials changed.

Grouped administration navigation: packages/business-rules/src/admin-navigation.ts and apps/web/components/admin.tsx. Existing catch-all guarded admin route maps /admin/technicians, /admin/services, /admin/bookings, /admin/quotations, /admin/incidents. Preserve all. ProfessionalServices currently loads services.manage/catalogue/bookings then renders inline Technicians. StaffManagement already owns staff invitations, existing identity lookup, profile edits and governed role/branch changes. Do not create another identity store.

## Feature and permission map
| Area | Existing implementation / source | Finding / minimal change |
|---|---|---|
| Directory/KPIs | professional-services.ts services.manage, users | Partial: active-only staff query, no inactive directory or authoritative KPIs. Add a dedicated scoped paged read model; leave legacy response intact. |
| Qualifications | technician_qualifications, technician.qualify/revoke, audit_events | Existing independent owner/safety officer verification, recent reauth, expiry, self-review rejection, current reviewer authority. Preserve and expose in modal. Issuer/method/issue-date attachment metadata and full history presentation remain gaps. |
| Schedule | service_slots, service_bookings; validateSlot locks slot+technician | Existing booking overlap protection, cancellation/reschedule paths; slot creation itself lacks technician overlap lock. Repair creation without replacing booking workflow. Weekly hours/breaks/holiday model absent. |
| Blocks | services.slot.block | Existing reason/audit and booked-slot conflict rejection. Move form into modal. |
| Services/quotes/payments | professional-services.ts, service-schema.ts, service mutation receipts | Existing approved checklist, quotation/customer approval, invoice and verified-payment work guards. No workflow changes. |
| Staff identity | staff.ts/accounts.ts, staff_invitations, governed security.permissions | Existing invites/lookup/edit. Owner/admin staff invitation; service_manager cannot independently grant access. Reuse permitted flows. |
| Native | App.tsx, TechnicianWorkspace.tsx, TechnicianScreens.tsx | Field Home/Jobs/History/Profile includes own availability and read-only qualifications; restricted session denylist protects management. General native staff shell lacks technician management. Add guarded management destination, preserve field shell. |
| Refresh | component reloads, API/polling and existing worker/outbox | Add scoped refresh with stale indication, never fabricate connectivity. Notification and recurring schedule gaps remain acceptance work. |

## Security and safety boundaries
Management workspace read roles retain owner/service_manager/safety_officer/inventory/finance; editing remains owner/service_manager, independent verification owner/safety_officer. Technical administrator has staff identity authority, not automatic service safety authority. Owner may select permitted branches; others remain current-branch scoped. Field technicians must be denied management endpoint even with an ordinary non-restricted session. Qualification evidence only through existing authorised scope; no PII-rich customer records in directory.

No synthetic business records will be added. Current hosted client demo remains isolated. No real data import, live Paystack enablement, automatic driver assignment, record erasure, native binary build or production hosting authorised by this phase. Existing production NO-GO and all prior matrix denominators preserved.

## Acceptance risks and change plan
1. Add typed server directory/KPIs/upcoming schedule, strict runtime filters and role/branch guards.
2. Replace only technician workspace inline layout with responsive directory/rail and accessible existing Modal workflows.
3. Preserve identities, canonical IDs, financial and inventory ledgers, current qualification/work guards and routes.
4. Repair creation locking/timezone semantics and run negative fixtures.
5. Integrate applicable native management only within existing shell; do not alter field navigation.
6. Capture tests and UI evidence. All76 scenarios/32 gates retained in phase matrix; do not claim complete until applicable acceptance is evidenced. Additive schema needs remain explicit, no speculative migration.
