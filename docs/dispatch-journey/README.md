# Connected Dispatch acceptance

The connected web journey now covers admin vehicle assignment, manager order dispatch, paid gas delivery, product/COD, failed-delivery return/retry, independent reconciliation and admin trip closure. Positive operational tests use disposable synthetic fixtures. Initial accounts, stock and configuration are seeded; successful order, trip and custody stages use actual service transitions.

## Issues repaired

| Finding | Result |
| --- | --- |
| An earlier attempt's photo returned upload success but could not satisfy the current attempt's proof requirement. | The server returns an explicit 409 requesting new consented proof for the current visit. Same-attempt replay remains supported. |
| Metering alone made handover available before proof was confirmed. | Handover remains disabled until the current attempt's proof is confirmed. Read failure, timeout, retry and a late read after upload are covered. |
| Successful handover left an obsolete active-assignment message. | Confirmed delivery opens unfiltered History with an explicit success message. |

Only three runtime files changed. Existing role, password, branch, qualification, custody, cash, metering, consent, version and replay controls remain in force. See [reviewed source changes](reviewed-source-changes.json) and [findings](findings.json).

## Executed acceptance

- **Connected service journeys:** normal wallet-paid gas delivery; supervised product/COD delivery with separate finance verification and surplus manifest receipt; failed wallet delivery with exact independent return, new attempt/proof and no duplicate wallet debit or reservation.
- **Actual browser shift:** owner assigned the vehicle and paid gas order; a qualified loader issued 10,000 g; the restricted driver delivered 6,000 g and a wallet-paid product using actual pickup, arrival, proof and customer-code handover controls. Manager closure stayed disabled until a different account independently received the remaining 4,000 g. The manager then ended the 100 → 125 km trip using their own password.
- **Canonical final state:** two delivered/payment-verified orders, one ended trip, reconciled 10,000/6,000/4,000 g load, gas stock 94,000 g and zero reserved. All own browser/API sessions were signed out; the own preview and PostgreSQL instance were stopped.
- **Retained regression checks:** 69 focused tests passed without failures or skips, including independent PostgreSQL connection races. Eight supplementary connected/UI/source/security checks passed; they overlap the focused suite and are not summed as unique tests. Fifteen affected historical/source checks passed without skips.

Customer codes and second-order preparation used scoped APIs; operator assignment, loading, driver delivery, receipt and manager closure used the actual UI. COD and failed retry are service-level acceptance, not a fresh positive browser claim. [Browser steps](evidence/browser-local.json), [final canonical state](evidence/browser-final-state.json), [manual](../user-manual/order-to-delivery.md#connected-dispatch-shift-checklist) and [matrix](../traceability/dispatch-journey-rtm.md).

## Client demo and release boundary

The fixes are published to the existing [client demo](https://easygas-client-demo.vercel.app) as application commit `b91aa554fd5701ba69464eb6c574570442130de6`, Ready deployment `dpl_HTVUhddZvZHpvxew5LKug2TAQoCd`. All 452 deployed application files match the reviewed source. Own candidate/stable sessions passed the scoped role/proof-access and business-snapshot preservation checks; no hosted order, trip, stock, payment or qualification was changed.

A fresh hosted visual pass is not claimed: the shared browser had a different active customer session, which was preserved and the own QA tab closed. The complete positive visual shift used the isolated app. Physical measurement/travel, native, provider, import/retain-all and full production acceptance remain outside this phase; the original production NO-GO remains unchanged. No mobile binary was built, exported or uploaded.

Initial [CI run 45328012490](https://github.com/Onaopemipo/easygasng/actions/runs/45328012490) passed 1,270 of 1,273 regressions; three historical source-hash checks needed an explicit continuation for the three reviewed files. The correction retains original manifests/assertions and verifies each committed baseline; all 15 affected local checks now pass. It changes no deployed application bytes. [Initial CI record](evidence/ci-initial.json), [CI/deployment source equivalence](evidence/ci-source.json). Full [CI rerun 45330071502](https://github.com/Onaopemipo/easygasng/actions/runs/45330071502) passed all **1,273 web tests**, with zero failures or skips, plus web build/type checks/audits and **3 native dependency tests**. Mobile export was skipped. [Final CI evidence](evidence/ci.json). All six bounded requirements and gates now pass with zero exclusions. The final documentation/evidence commit changes no application or test source.
