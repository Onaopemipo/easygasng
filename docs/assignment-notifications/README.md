# Driver assignment notification correction — 18 November 2026

The user reported no driver web-bell notification for EG-2026-7BB8640B. Authenticated read-only inspection found the order **Placed**, payment **verified**, driver **null**, no delivery attempt, version 1. Its assignment had not committed. This work does not advance, prepare, allocate stock for, assign, or backfill a notice for that order.

A separate genuine code defect was reproduced: initial assignments wrote only the customer confirmation-code notice. Reassignments had a separate driver notice. Shared `beginAttempt` now writes one private “Delivery assigned” alert to its receiving driver in the same transaction. Removing the former reassignment-only send prevents duplicates. The body contains the order reference and review instruction; no customer code, address or phone. Existing role/branch/availability/stock/payment/vehicle/physical custody guards are unchanged. Stable operation receipts and transaction rollback remain authoritative.

The owner order modal previously offered every status regardless of current state and displayed failed-save feedback behind the dialog. It now offers only canonical allowed next steps (excluding proof-only Delivered), disables driver selection before assignment becomes a valid next step, requires an explicit status choice, explains Accept → Prepare → Assign → Submit, and displays errors inside the open form. Opening a different order clears stale feedback. Owner/manager mutation controls match the existing authority; backend permission/readiness checks remain authoritative.

## Executed evidence

| Check | Result | Evidence |
| --- | --- | --- |
| Baseline missing-notice regression | Reproduced initial/enhanced notification failures; resolved by this correction | [historical red log](evidence/baseline-failure.txt) |
| Focused notification, tracking, operations, driver and safety suites | 63 PASS / 0 fail / 0 skip | [focused log](evidence/focused.txt) |
| Independent PostgreSQL connections | 1 PASS / 0 fail: concurrent same-operation assignments create one attempt/alert; forced post-notification failure rolls back | [PostgreSQL log](evidence/postgres.txt) |
| Actual separate owner/driver Chrome sessions | 1 PASS / 0 fail: valid steps, real stale-update error inside modal, automatic badge and private bell alert, mark-read,390/1440 fit | [browser log](evidence/browser.txt), [browser scenario](../../scripts/qa-assignment-notifications.mjs) |
| Web production webpack build / TypeScript | PASS | [build](evidence/build.txt), [types](evidence/types.txt) |
| Named demo order inspection | Read only; no recorded driver/attempt | [inspection](evidence/reported-order-inspection.txt) |

The browser check uses a disposable local PostgreSQL database and new synthetic accounts/order only. Driver notices reach the visible web workspace through existing polling/focus refresh (up to approximately 30 seconds); this is an in-app notification, not a new phone-push/email integration. Responsive geometry is checked after resize transitions settle; immediate resizing originally measured an intermediate sidebar/header position, then the actual 390px layout passed with no CSS change. Screenshots retain only the final passing run.

[Scoped source review](../traceability/assignment-notifications-reviewed-hashes.json) preserves the immutable original driver SaaS 18-source baseline and explicitly permits this later user-requested notification/UI correction. No finance/proof/GPS/custody implementation was weakened to satisfy a hash test. [Matrix](../traceability/assignment-notifications-rtm.md) retains all four bounded requirements. Prior whole-app matrices, commercial NO-GO, physical acceptance, outstanding email-provider setup and Excel import hold remain.

## Owner and driver workflow

For an order still Placed, accept it, then move it to Preparing once the real preparation checks are satisfied. When assignment is an allowed next step, select Assigned and a suitable driver, then submit Update order. Selecting a driver alone does not save an assignment. Read any rejection in the open dialog and resolve the underlying readiness condition. The driver’s existing web session refreshes its unread badge within approximately 30 seconds or on focus; open the bell or Orders to review the committed assignment.

The named order has not been advanced by these checks. Payment verification alone does not establish preparation, stock allocation or assignment.

## Release

Source `47aa471` was pushed and passed both jobs in [fresh Release validation](https://github.com/Onaopemipo/easygasng/actions/runs/44304026095): **754/754 web tests with zero skips**, web build/types/audit and native types/three dependency tests/moderate audit. Both audits report zero vulnerabilities. Native bundle export was skipped by the push workflow; no new installed binary is claimed.

Ready deployment `dpl_Fodr4MdgFR2C7HYyMQR4qBM8kqfA` was built from a clean committed archive, verified, then promoted to [the stable demo](https://easygas-client-demo.vercel.app). No per-deployment environment overrides were used. Permanent fulfilment/tracking/bulk defaults remain enabled, proof retention remains one day, and authenticated runtime configuration confirms Paystack available in **test** mode. Email and background jobs remain OFF.

[Hosted scenario](../../scripts/qa-assignment-notifications-hosted.mjs) passed **1/1** after promotion: canonical owner next steps, mobile driver bell/privacy/fit, and unchanged named order. The final snapshot still has EG-2026-7BB8640B Placed, payment verified, driver null, no attempt, version 1. No hosted assignment or backfilled notice was manufactured. New assignment alert delivery was proven by the separate disposable local browser and PostgreSQL scenarios above.

[Release evidence](evidence/release.txt), [CI artifact provenance](evidence/release-validation.json), [hosted log](evidence/hosted.txt), [candidate configuration](evidence/candidate-verification.txt). Rollback: promote previous Ready deployment `dpl_EaXJRaDgh8ocgWnPuH18TN2EqkX3`, then repeat readiness/fulfilment/sandbox checks. No migration is required; committed notification records and operational/financial history remain. Commercial production NO-GO, external email-provider setup, real-phone acceptance and Excel import hold remain separate.
