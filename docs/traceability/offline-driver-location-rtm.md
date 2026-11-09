# Offline driver location traceability

Production NO-GO, import hold and mobile-build/server deferrals preserved.

| ID | Requirement | Status | Outstanding |
|---|---|---|---|
| GPS-R01 | Record consented offline/background driver GPS using existing encrypted queue | PARTIAL | New native build and actual offline/background/restart/permission/force-quit/device/battery/storage acceptance. No mobile build performed. |
| GPS-R02 | Synchronise delayed GPS through scoped canonical trip API without making old points live | VERIFIED_COMPLETE | None within bounded backend contract; full physical/native and production gates remain separate. |
| GPS-R03 | Show last known observation, age, receipt time and latest200 recorded points in existing fleet view | IMPLEMENTED_UNVERIFIED | Actual role-scoped browser interaction and customer/location-disclosure review. |
| GPS-R04 | Validate installed native background/offline location end to end without false continuous/live guarantees | BLOCKED | Build and physical iOS/Android airplane-mode/lock/restart/reconnect/logout/lease/device-storage acceptance; existing production NO-GO unchanged. |

Bounded implementation coverage:3/4 have source changes; verified requirement coverage1/4. All four remain in the denominator.27/27 focused checks, web build/types and native types pass. Native recording was not executed on a phone. Machine-readable companion maps exact files, authoritative sources, security controls, negative tests and evidence. See [operating guide](../operations/offline-driver-location.md).
