# Driver assignment notification correction —18 November2026

The user reported no driver web-bell notification for EG-2026-7BB8640B. Authenticated read-only inspection found the order **Placed**, payment **verified**, driver **null**, no delivery attempt, version1. Its assignment had not committed. This work does not advance, prepare, allocate stock for, assign, or backfill a notice for that order.

A separate genuine code defect was reproduced: initial assignments wrote only the customer confirmation-code notice. Reassignments had a separate driver notice. Shared `beginAttempt` now writes one private “Delivery assigned” alert to its receiving driver in the same transaction. Removing the former reassignment-only send prevents duplicates. The body contains the order reference and review instruction; no customer code, address or phone. Existing role/branch/availability/stock/payment/vehicle/physical custody guards are unchanged. Stable operation receipts and transaction rollback remain authoritative.

The owner order modal previously offered every status regardless of current state and displayed failed-save feedback behind the dialog. It now offers only canonical allowed next steps (excluding proof-only Delivered), disables driver selection before assignment becomes a valid next step, requires an explicit status choice, explains Accept → Prepare → Assign → Submit, and displays errors inside the open form. Opening a different order clears stale feedback. Owner/manager mutation controls match the existing authority; backend permission/readiness checks remain authoritative.

## Executed evidence

| Check | Result | Evidence |
| --- | --- | --- |
| Baseline missing-notice regression | Reproduced initial/enhanced notification failures; resolved by this correction | [historical red log](evidence/baseline-failure.txt) |
| Focused notification, tracking, operations, driver and safety suites |63 PASS /0 fail /0 skip | [focused log](evidence/focused.txt) |
| Independent PostgreSQL connections |1 PASS /0 fail: concurrent same-operation assignments create one attempt/alert; forced post-notification failure rolls back | [PostgreSQL log](evidence/postgres.txt) |
| Actual separate owner/driver Chrome sessions |1 PASS /0 fail: valid steps, real stale-update error inside modal, automatic badge and private bell alert, mark-read,390/1440 fit | [browser log](evidence/browser.txt), [browser scenario](../../scripts/qa-assignment-notifications.mjs) |
| Web production webpack build / TypeScript | PASS | [build](evidence/build.txt), [types](evidence/types.txt) |
| Named demo order inspection | Read only; no recorded driver/attempt | [inspection](evidence/reported-order-inspection.txt) |

The browser check uses a disposable local PostgreSQL database and new synthetic accounts/order only. Driver notices reach the visible web workspace through existing polling/focus refresh (up to approximately30 seconds); this is an in-app notification, not a new phone-push/email integration. Responsive geometry is checked after resize transitions settle; immediate resizing originally measured an intermediate sidebar/header position, then the actual390px layout passed with no CSS change. Screenshots retain only the final passing run.

[Scoped source review](../traceability/assignment-notifications-reviewed-hashes.json) preserves the immutable original driver SaaS18-source baseline and explicitly permits this later user-requested notification/UI correction. No finance/proof/GPS/custody implementation was weakened to satisfy a hash test. [Matrix](../traceability/assignment-notifications-rtm.md) retains all four bounded requirements. Prior whole-app matrices, commercial NO-GO, physical acceptance, outstanding email-provider setup and Excel import hold remain.

## Release

Push, fresh web/native release validation and synthetic demo candidate verification pending. Preserve permanent fulfilment/tracking/bulk flags and Paystack sandbox. No database migration is required; rollback is the scoped code correction, with committed notification records retained.
