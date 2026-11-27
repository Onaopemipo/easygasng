# Mobile sign-out repair

[Machine-readable matrix](mobile-signout-rtm.json) · [Report and evidence](../mobile-signout/README.md)

| Stable requirement | Result | Acceptance |
|---|---|---|
| MSO-01 Restore normal Expo Go App wiring | VERIFIED_COMPLETE | Real Profile/confirmation → guest; normal index.ts entry |
| MSO-02 Local-first bounded cleanup | VERIFIED_COMPLETE | Six cleanup/server negative/positive tests;12 total scoped regressions; native types |
| MSO-03 Revocation and reload persistence | VERIFIED_COMPLETE | Canonical logout200 and denied token replay; final-source normal-entry reload remains guest |

Coverage:3/3 implemented,3/3 verified,2/2 critical requirements,3/3 bounded gates;0 exclusions. Driver native route observed; shared callback code coverage is not independent native acceptance of every role. Post-hardening fresh signed-in native journey, physical offline OS behaviour and new signed binary are not claimed. Prior production NO-GO and unrelated holds retained.
