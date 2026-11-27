# Daily delivery requirements traceability

28 November 2026. 7/7 implemented; 5/7 verified; 2 partial remain in the denominator. Critical server requirements: 5/5 verified. Gates: 5/7 passed. Routes: 3/3 implemented, 2/3 verified end to end; native device acceptance remains open. Existing production NO-GO is unchanged.

| ID | Requirement | Status | Gate | Outstanding |
|---|---|---|---|---|
| DAY-01 | One office-started daily run with net opening gas and automatic trip/driver defaults | VERIFIED_COMPLETE | DAY-G-01 | None within the bounded server workflow; actual business measurements and production acceptance are not fabricated. |
| DAY-02 | Automatic live-run reservations for incoming paid orders without per-order load issue, supporting multiple assignments and existing same-visit fee/prepayment | VERIFIED_COMPLETE | DAY-G-02 | None within the bounded server workflow; actual business measurements and production acceptance are not fabricated. |
| DAY-03 | Driver scale before/after readings in kg, paid quantity validation, current visit photo and secure completion | VERIFIED_COMPLETE | DAY-G-03 | None within the bounded server workflow; actual business measurements and production acceptance are not fabricated. |
| DAY-04 | Office midday loading and closing net weight, actual variance and single Admin reconciliation, safe unfinished-order carry-forward | VERIFIED_COMPLETE | DAY-G-04 | None within the bounded server workflow; actual business measurements and production acceptance are not fabricated. |
| DAY-05 | Focused Dispatch and native/web driver experience, preserved forms on error and uncertain-operation recovery | PARTIAL | DAY-G-05 | Browser journey passed; physical iOS/Android scale/camera/offline acceptance. New signed/TestFlight binary was not requested or built. |
| DAY-06 | Scoped roles, denied privilege overrides, current actor/session, immutable records, replay/concurrency/stock integrity | VERIFIED_COMPLETE | DAY-G-06 | None within the bounded server workflow; actual business measurements and production acceptance are not fabricated. |
| DAY-07 | Retain legacy metered history and operational holds, migration/release guard, manuals and verified traceability | PARTIAL | DAY-G-07 | Publish bounded source to existing Vercel demo and verify release; preserve production NO-GO and prior native/provider/real-operation gates. |

See the [machine matrix](daily-delivery-rtm.json) for exact files, sources, controls and executed evidence; [manual](../user-manual/daily-delivery.md) and [implementation report](../daily-delivery/README.md). Service tests use clearly synthetic disposable databases. No genuine opening/closing figures were invented.
