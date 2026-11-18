# Driver web trip controls — 18 November 2026

Drivers can open **Current trip → Start trip / Manage trip** on Home, or **Profile → Vehicle and location → Manage trip**, in the existing web dashboard. The popup shows branch-eligible active LPG-suitable vehicles, accepts an odometer and optional trip location consent, displays the authoritative current trip, revokes consent and ends a trip with an ending odometer. Empty vehicle lists direct the driver to the owner. It uses existing `driver.location`, `trip.start`, `trip.end` and `trip.location.revoke`; no backend/schema/permission or native code changes.

The browser does not request GPS permission or record locations. Consent remains a separate server record; mobile tracking/device permissions remain independent. This change does not bypass assignment, physical preparation, stock/cylinder, custody, payment or proof gates. No fuel/finance or fleet-wide reads were added to restricted driver sessions. Stable operation keys, in-flight duplicate suppression, explicit pending state, timed requests, stale-read disabled mutations and authoritative refresh preserve uncertain-update behaviour. Home/Profile refer to the same server trip.

## Executed local acceptance

- **64/64 focused tests**, zero failures/skips: own restricted driver lifecycle, branch/suitability/ownership/odometer/replay/consent controls plus existing notification, tracking, operations and dispatch safety suites. [Log](evidence/focused.txt).
- **1/1 actual Chrome browser scenario** against a new disposable local PostgreSQL database: start with consent off; end; reopen through Profile; start with consent; revoke; failed status request blocks writes until refreshed;390/1440px fit; canonical synthetic owner assignment, driver acknowledgement and pickup succeed with the web-created trip. Out-for-delivery custody blocks trip end. [Scenario](../../scripts/qa-web-driver-trips.mjs), [log](evidence/browser.txt).
- The first browser probe correctly hit the existing acknowledgement-before-pickup guard. The final probe supplies that acknowledgement through the canonical API; the guard was preserved.

The synthetic browser order is a new local test fixture. No hosted trip was started on behalf of Demo Driver, and order EG-2026-7BB8640B was not progressed or assigned by these checks. User-entered odometer/vehicle checks and actual handling remain necessary. [Requirements matrix](../traceability/web-driver-trips-rtm.md) retains all four requirements/gates and historical production NO-GO, external email/provider/device/physical acceptance and import hold.

Production web build and TypeScript passed. The actual browser scenario also verifies Escape cannot close an in-flight trip mutation.

## Release

Push, fresh web/native CI and demo release pending. Permanent fulfilment/tracking/bulk defaults and Paystack sandbox must carry forward unchanged. No migration is required. Previous Ready demo dpl_Fodr4MdgFR2C7HYyMQR4qBM8kqfA is the rollback point; operational history is retained.
