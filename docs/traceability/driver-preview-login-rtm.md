# Supplied driver Expo Go login repair

[Authoritative matrix](driver-preview-login-rtm.json) · [Diagnosis, correction and restart instructions](../driver-login-investigation/README.md) · [Authentication manual](../user-manual/authentication.md#supplied-demo-logins-in-expo-go).

| Requirement | Actual evidence | Status |
| --- | --- | --- |
| DLOGIN-01 Identify reported supplied account failure | User confirmed exact newer account/iOS/Expo Go; native UI displayed matching identifier and generic error. Exact account succeeded on shared and driver APIs; isolated preview had a different account database. | Verified |
| DLOGIN-02 Correct existing preview backend | Owned Metro 8086 restarted against the matching shared demo API; manifest EasyGas/preview and public API environment property verified. Local API 3140 remains isolated. | Verified |
| DLOGIN-03 Native acceptance and handover | Actual iOS Expo Go reload, exact supplied credential submission and Lagos Driver workspace/Today/Deliveries/Work/Profile observed. User's requested preview left signed in; separate diagnostic API sessions revoked; guide and traceability updated. | Verified within supplied-account preview scope |

Three requirements/three gates verified, zero excluded. Authentication regression: 10 passed, zero failures/skips. Shared/dedicated exact-account login, identity and driver read endpoints return HTTP 200. This is runtime configuration repair; no application code, passwords, roles, privileges, operational records, mobile binary/export/store upload or hosted deployment changed.

Original production NO-GO and wider native/authentication/physical/provider acceptance remain open in their original matrices. This does not certify all roles/devices or installed TestFlight behavior; TestFlight 4 already used the shared backend and was unchanged.
