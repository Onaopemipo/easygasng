# Admin trip management

Owners and authorised branch managers can end a driver’s trip or change its vehicle directly in Dispatch, using their own password and actual odometers. Product/LPG reconciliation, assigned/in-transit deliveries and held delivery custody block both actions. Replacement is atomic; failure preserves the old trip. Availability stays unchanged and GPS stays off.

Local validation:42 focused regressions passed without skips, including actual PostgreSQL concurrency and qualified manifest receipt/return. Actual browser checks exercised owner change, manager closure, blockers, wrong-password retry, dirty state, keyboard containment, phone/tablet and dark layout. Hosted/full CI publication remains pending in TC-R04. [Matrix](../traceability/dispatch-trip-rtm.md). Original production NO-GO and unrelated provider/native/physical/import/retain-all holds are retained. No mobile binary/export.
