# Mobile driver sign-in feedback

| ID | Requirement and gate | Implementation and evidence | Status |
| --- | --- | --- | --- |
| DRIVER-LOGIN-UI-01 | Show authentication errors in the mobile form. | apps/mobile/App.tsx renders API sign-in errors in an accessible alert above Sign In. Mobile typecheck passed. | Implemented, simulator visual check pending. |
| DRIVER-LOGIN-ENV-01 | Local driver account can authenticate. | Existing driver-only API and isolated demo account fixture. Wrong password returned 401. Native-header sign-in and session checks exercised locally. | Local API checked. Installed app sign-in pending. |

Implementation coverage 2/2. Full device acceptance remains open.
