# Driver acceptance evidence

Executed: 5 boundary/integration tests pass; full regression 324 tests, 312 pass, 12 skipped, zero failures. Web/mobile types, web build, iOS bundle and simulator native build pass. Existing customer home and onboarding checksum checks pass.

Simulator interaction: existing isolated local driver account signed into dedicated shell using the canonical backend. Home shows real zero assignments; no delivery fixtures were inserted. Saved driver-home.png. Full delivery camera/OTP, physical device, deep-link, private-photo and offline crash visual acceptance are NOT_TESTED.

## Required scenarios retained

| DR-01 | Valid driver sign-in | Authorised driver session | — NOT_TESTED for full end-to-end acceptance.
| DR-02 | Customer/suspended driver sign-in | Denied | — NOT_TESTED for full end-to-end acceptance.
| DR-03 | Session expiry and logout | Protected data inaccessible; caches cleared safely | — NOT_TESTED for full end-to-end acceptance.
| DR-04 | Home metrics | Actual assigned records only | — NOT_TESTED for full end-to-end acceptance.
| DR-05 | Availability toggle | Server-authorised availability, independent of connectivity | — NOT_TESTED for full end-to-end acceptance.
| DR-06 | Device offline | Never labelled live GPS | — NOT_TESTED for full end-to-end acceptance.
| DR-07 | Another driver's offer | No access | — NOT_TESTED for full end-to-end acceptance.
| DR-08 | Valid offer acceptance | One acknowledged assignment | — NOT_TESTED for full end-to-end acceptance.
| DR-09 | Duplicate accept | Same result; no second assignment | — NOT_TESTED for full end-to-end acceptance.
| DR-10 | Concurrent accept/expiry | Only valid winner commits | — NOT_TESTED for full end-to-end acceptance.
| DR-11 | Decline with reason | Dispatch receives exception | — NOT_TESTED for full end-to-end acceptance.
| DR-12 | Dispatcher reassignment | Previous driver's access revoked | — NOT_TESTED for full end-to-end acceptance.
| DR-13 | Valid status progression | Correct ordered events | — NOT_TESTED for full end-to-end acceptance.
| DR-14 | Skip directly to Delivered | Rejected | — NOT_TESTED for full end-to-end acceptance.
| DR-15 | Stale order version | Rejected with recovery guidance | — NOT_TESTED for full end-to-end acceptance.
| DR-16 | Inactive branch | Dispatch blocked | — NOT_TESTED for full end-to-end acceptance.
| DR-17 | Unauthorised branch | Action rejected | — NOT_TESTED for full end-to-end acceptance.
| DR-18 | Reactivation/reassignment | Delivery capacity revalidated | — NOT_TESTED for full end-to-end acceptance.
| DR-19 | Missing cylinder inspection/custody | Fulfilment blocked | — NOT_TESTED for full end-to-end acceptance.
| DR-20 | Reissue without recorded return | Rejected | — NOT_TESTED for full end-to-end acceptance.
| DR-21 | Photo capture/preview | Functional and accessible | — NOT_TESTED for full end-to-end acceptance.
| DR-22 | Private evidence upload | Authenticated, validated storage | — NOT_TESTED for full end-to-end acceptance.
| DR-23 | Cross-customer proof access | Denied | — NOT_TESTED for full end-to-end acceptance.
| DR-24 | Later delivery | Prior photo preserved | — NOT_TESTED for full end-to-end acceptance.
| DR-25 | Missing required proof | Completion blocked | — NOT_TESTED for full end-to-end acceptance.
| DR-26 | Valid proof + handover | One confirmed completion | — NOT_TESTED for full end-to-end acceptance.
| DR-27 | Duplicate completion request | No duplicate business effects | — NOT_TESTED for full end-to-end acceptance.
| DR-28 | Offline status update | Queued and clearly pending | — NOT_TESTED for full end-to-end acceptance.
| DR-29 | App restart while offline | Queue preserved securely | — NOT_TESTED for full end-to-end acceptance.
| DR-30 | Reconnect | Ordered, authorised sync | — NOT_TESTED for full end-to-end acceptance.
| DR-31 | Reassigned during offline period | Conflict; no stale update applied | — NOT_TESTED for full end-to-end acceptance.
| DR-32 | Offline photo retry | One evidence record, verified upload | — NOT_TESTED for full end-to-end acceptance.
| DR-33 | Offline completion attempted | No false Delivered confirmation | — NOT_TESTED for full end-to-end acceptance.
| DR-34 | GPS permission denied | Clear fallback, no false location | — NOT_TESTED for full end-to-end acceptance.
| DR-35 | Stale GPS | Last-update time and warning | — NOT_TESTED for full end-to-end acceptance.
| DR-36 | Mobile data off | No simulated live updates | — NOT_TESTED for full end-to-end acceptance.
| DR-37 | Delivery finished | Location sharing stops | — NOT_TESTED for full end-to-end acceptance.
| DR-38 | Failed delivery | Reason, audit, dispatch escalation | — NOT_TESTED for full end-to-end acceptance.
| DR-39 | Delayed/duplicate push | No duplicate business operation | — NOT_TESTED for full end-to-end acceptance.
| DR-40 | Unauthorised deep link | Denied | — NOT_TESTED for full end-to-end acceptance.
| DR-41 | Order tabs/history | Correct driver-scoped data | — NOT_TESTED for full end-to-end acceptance.
| DR-42 | Profile access | Only permitted fields/actions | — NOT_TESTED for full end-to-end acceptance.
| DR-43 | Accessibility | Keyboard/screen reader/touch targets | — NOT_TESTED for full end-to-end acceptance.
| DR-44 | Appearance | Reuse shared theme; no regressions | — NOT_TESTED for full end-to-end acceptance.
| DR-45 | Responsive phones | No clipping/overflow | — NOT_TESTED for full end-to-end acceptance.
| DR-46 | Notification failure | Business event remains committed | — NOT_TESTED for full end-to-end acceptance.
| DR-47 | Multi-connection PostgreSQL race | No over-assignment/duplicate effects | — NOT_TESTED for full end-to-end acceptance.
| DR-48 | Migration failure/rollback | Safe recovery, existing records intact | — NOT_TESTED for full end-to-end acceptance.
| DR-49 | Existing business regression | Orders, finance, stock, cylinder, customer unaffected | — NOT_TESTED for full end-to-end acceptance.
| DR-50 | Build and real device smoke tests | Android/iOS where in scope; results documented | — NOT_TESTED for full end-to-end acceptance.
