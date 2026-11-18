# Technician baseline — 19 November 2026

HEAD1a23e5337cd7e5a6541ede1ea61a65bab1343ee8; branch codex/technician-saas-redesign from codex/driver-saas-redesign. Dirty worktree contains prior driver operational report/RTM/screenshots; preserved unchanged by this phase.

Existing web /admin/bookings renders all BookingCards, technician /admin/services remains authorised read-only catalogue. Authenticated shell search/bell/account/sidebar retained. Existing native TechnicianWorkspace/TechnicianScreens already provide four tabs, secure queue, canonical Appointment, foreground resume, notifications and profile. No duplicate app or authentication.

Existing technician.snapshot and technician.jobs derive scope from actor/current active branch. Jobs are paged20, terminal filter past; current all includes history. Snapshot has all-time/this-month counters but no daily counts, next assigned item or today list. Additive bounded scoped read projections needed for requested truthful overview. Native qualification display currently checks expiry alone; independent verifier validity must also be exposed. Availability mutation exists and is independent from connection, qualifications and work permission.

19/19 baseline focused tests passed with zero skips in isolated PGlite fixtures; web/native types/build running. Existing production NO-GO, pending provider/device/physical gates and Excel import hold retained. No hosted operational writes or deployment authorised by this design handoff.

Baseline outcome: web production build and native typecheck passed. Concurrent initial web typecheck encountered generated Next types during build; sequential final typecheck passed. Final executed outcomes and limitations are in04-test-results.md. Unrelated driver documentation was preserved and updated separately to record the user-approved, not-yet-applied one-hour bulk renewal.
