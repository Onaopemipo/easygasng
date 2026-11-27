# Daily delivery requirements traceability

28 November 2026. **7/7 implemented;6/7 verified;1 partial retained.** Critical server controls:5/5. Gates:6/7. Route scopes:3/3 implemented,2/3 verified end to end; native physical acceptance remains open. Existing production NO-GO unchanged.

| ID | Requirement | Status | Gate | Outstanding |
|---|---|---|---|---|
| DAY-01 | One office-started daily run with net opening gas and automatic trip/driver defaults | VERIFIED_COMPLETE | DAY-G-01 | None within the bounded server workflow; actual business measurements and production acceptance are not fabricated. |
| DAY-02 | Automatic live-run reservations for incoming paid orders without per-order load issue, supporting multiple assignments and existing same-visit fee/prepayment | VERIFIED_COMPLETE | DAY-G-02 | None within the bounded server workflow; actual business measurements and production acceptance are not fabricated. |
| DAY-03 | Driver scale before/after readings in kg, paid quantity validation, current visit photo and secure completion | VERIFIED_COMPLETE | DAY-G-03 | None within the bounded server workflow; actual business measurements and production acceptance are not fabricated. |
| DAY-04 | Office midday loading and closing net weight, actual variance and single Admin reconciliation, safe unfinished-order carry-forward | VERIFIED_COMPLETE | DAY-G-04 | None within the bounded server workflow; actual business measurements and production acceptance are not fabricated. |
| DAY-05 | Focused Dispatch and native/web driver experience, preserved forms on error and uncertain-operation recovery | PARTIAL | DAY-G-05 | Physical iOS/Android camera/scale acceptance; full offline scale/photo queueing is not verified and current scale saves require connectivity. New signed/TestFlight binary was not requested or built. |
| DAY-06 | Scoped roles, denied privilege overrides, current actor/session, immutable records, replay/concurrency/stock integrity | VERIFIED_COMPLETE | DAY-G-06 | None within the bounded server workflow; actual business measurements and production acceptance are not fabricated. |
| DAY-07 | Retain legacy metered history and operational holds, migration/release guard, manuals and verified traceability | VERIFIED_COMPLETE | DAY-G-07 | No outstanding bounded release/manual work. Existing production NO-GO, actual operations/provider and signed-device gates remain separately open. |

[Machine matrix](daily-delivery-rtm.json) maps exact files, sources, controls, test IDs and executed evidence. [Manual](../user-manual/daily-delivery.md) · [Report](../daily-delivery/README.md). Full browser journey, private photo upload, live-form recovery, PostgreSQL concurrency/RLS and preservation of reconciled legacy history passed. Physical native camera/scale acceptance and offline scale/photo queueing are not verified; current scale saves require connectivity. No new signed/TestFlight binary was built. No hosted business measurements were invented.
