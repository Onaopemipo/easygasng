# Driver web trip controls — 18 November 2026

Drivers can open **Current trip → Start trip / Manage trip** on Home, or **Profile → Vehicle and location → Manage trip**, in the existing web dashboard. The popup shows branch-eligible active LPG-suitable vehicles, accepts an odometer and optional trip location consent, displays the authoritative current trip, revokes consent and ends a trip with an ending odometer. Empty vehicle lists direct the driver to the owner. It uses existing `driver.location`, `trip.start`, `trip.end` and `trip.location.revoke`; no backend/schema/permission or native code changes.

The browser does not request GPS permission or record locations. Consent remains a separate server record; mobile tracking/device permissions remain independent. This change does not bypass assignment, physical preparation, stock/cylinder, custody, payment or proof gates. No fuel/finance or fleet-wide reads were added to restricted driver sessions. Stable operation keys, in-flight duplicate suppression, explicit pending state, timed requests, stale-read disabled mutations and authoritative refresh preserve uncertain-update behaviour. Home/Profile refer to the same server trip.

## Web-only delivery continuation

Audit also found that the old web Orders detail handed pickup/proof to mobile, which prevented the user’s intended web-only completion. Stable requirement DWT-05 explicitly adds existing canonical actions to the driver Orders detail: acknowledge assignment; verify the displayed products/gas/serial manifest and inspect pickup; start delivery; confirm arrival; upload an actual consented photo; enter the customer-provided six-digit code and confirm full physical handover. Failed-delivery and dispatch-help forms retain the canonical structured reasons. The frontend never fetches the customer’s code and grants no payment/cash authority. Existing `driver.complete` checks payment, arrived attempt, non-expired own proof, code and handover; all server code is unchanged.

The initial trip-only source fafc162/candidate dpl_5EFUb1W2MkAoDzd623etoGQiVrhA was superseded without promotion so that the published correction can actually support the web-only journey.

## Executed local acceptance

- **66/66 focused tests**, zero failures/skips: own restricted driver lifecycle, branch/suitability/ownership/odometer/replay/consent controls plus existing notification, tracking, operations and dispatch safety suites. [Log](evidence/focused.txt).
- **1/1 actual Chrome browser scenario** against a new disposable local PostgreSQL database: start with consent off; end; reopen through Profile; start with consent; revoke; failed status request blocks writes until refreshed;390/1440px fit; canonical synthetic owner assignment, driver acknowledgement and pickup succeed with the web-created trip. Out-for-delivery custody blocks trip end. The extended scenario uses three real browser sessions and a canonically wallet-paid synthetic order: every driver acknowledgement/pickup/departure/arrival/proof/completion action is performed in the UI. Missing proof blocks handover; a real multipart image plus customer-provided code permits completion; the trip then ends. The isolated database uses an explicitly labelled test_fixture wallet balance consumed by actual checkout. No hosted credit or Paystack success was inferred. [Scenario](../../scripts/qa-web-driver-trips.mjs), [log](evidence/browser.txt).
- The first browser probe correctly hit the existing acknowledgement-before-pickup guard. The final probe supplies that acknowledgement through the canonical API; the guard was preserved.

The synthetic browser order is a new local test fixture. No hosted trip was started on behalf of Demo Driver, and order EG-2026-7BB8640B was not progressed or assigned by these checks. User-entered odometer/vehicle checks and actual handling remain necessary. [Requirements matrix](../traceability/web-driver-trips-rtm.md) retains all five requirements/gates and historical production NO-GO, external email/provider/device/physical acceptance and import hold.

Production web build and TypeScript passed. The actual browser scenario also verifies Escape cannot close an in-flight trip mutation.

## Release

Application source `c5bf616` passed [fresh web/native CI](https://github.com/Onaopemipo/easygasng/actions/runs/44310710756): **756/756 web tests with zero skips**, production build/types and both audits with zero vulnerabilities; native types/three dependency checks passed. Native export was skipped by the push workflow; no installed binary was built in this phase.

Ready deployment `dpl_BG7raiYJy745co8FUCzaQjWnD4Qg` was built from a clean committed archive without environment overrides, runtime verified and promoted to [the existing demo](https://easygas-client-demo.vercel.app). The permanent field/tracking/bulk defaults remain enabled, proof retention one day, Paystack available in **test** mode, and email/background jobs OFF. [Candidate evidence](evidence/candidate.txt).

[Hosted read-only scenario](../../scripts/qa-web-driver-trips-hosted.mjs) passed **1/1**: Home/Profile trip controls, canonical branch vehicle list, consent off by default, and320/390/1440px fit. The QA driver’s trip and EG-2026-7BB8640B were unchanged throughout; the named order remains Placed, verified payment, driver null/no attempt/version1. The full driver fulfilment and exception paths were exercised locally, not by fabricating a hosted assignment. [Hosted log](evidence/hosted.txt), [CI provenance](evidence/release-validation.json), [release and rollback](evidence/release.txt).

The final local browser scenario also submits dispatch help and a structured customer_unavailable failure on a separate synthetic unpaid COD order; it does not infer payment success or physical pickup. The final screenshots omit the customer code. The final evidence/QA update does not change application code from validated/deployed c5bf616.

To operate the demo: sign in as the driver, start a trip with the checked vehicle/odometer from Home, then let the owner accept/prepare/assign the order with the required stock and inspected-cylinder readiness. In driver Orders, acknowledge, inspect pickup, start delivery, confirm arrival, upload consented proof and complete actual handover using the customer-provided code. End the trip after custody/returns are reconciled. No browser GPS or phone app is required by these exposed actions; all server readiness rules remain.

Rollback is previous Ready `dpl_Fodr4MdgFR2C7HYyMQR4qBM8kqfA`, followed by readiness/fulfilment/sandbox checks. No schema migration; retain all committed operational/financial/notification history. All five requirements/gates are verified for this bounded synthetic demo release. Historical commercial NO-GO, external email/provider/device/physical acceptance and import hold remain.

[Own phase artifact register](artifact-register.json) records current evidence and QA hashes; historical phase registers are unchanged.
