# Customer dashboard preflight — 30 October 2026

Proceed within authorised local customer UI, read-model, navigation and session-continuity scope. Branch main has no HEAD; all source directories are untracked, with no staged entries. Existing changes are preserved. No unrelated schema, financial ledger, stock movement, checkout, admin role, infrastructure or provider changes are authorised by this phase.

The catch-all customer route renders components/site.tsx. Existing customer identity is an HttpOnly cookie backed by revocable database sessions; service.ts dispatch validates it. Public and customer screens share the Site shopping context and easygas.cart localStorage. Gas checkout has a session draft and backend repricing. AccountSettings already manages owned addresses/defaults; orders, wallet/rewards ledger, schedules, notifications, support, services and consumption profiles have existing APIs. Their working flows will be retained.

Confirmed gaps: fragmented account layouts, flat navigation, no safe post-login return handling, public header has no account dropdown, session validation only at mount, overview lacks real order/activity/history widgets, /refill is an introductory empty state. Optional overview sources need independent error/retry states. Existing profile feedback supports three states, not already-refilled or snooze; do not invent refill events or weaken forecasts to add these.

Use official easygas-logo-hd.png and cylinder-illustration.png, existing 15px type floor, shared Modal, API and existing native/admin experiences. New read models use authenticated identity only and strict inputs. No second authentication system or cart store.

Validation: memory database negative ownership/session tests, existing business regressions, typecheck/build, isolated local browser QA for public/account transitions, all 15 routes, expanded/compact/mobile navigation, empty states and accessibility. Actual results must be mapped to 65 requirements and CD-01–15; unverified results remain visible. Existing public commercial production NO-GO and unconnected payments/notifications are preserved.

Resolution during implementation: the two missing feedback actions were safely implemented through additive state-check migration032, generated with the installed Supabase CLI for the managed mirror. No rows are rewritten. Self-reports remain unverified; snooze is a 24-hour pause of estimated reminders. Existing forecast arithmetic, signed ledgers and append-only feedback are preserved.
