# EasyGas signed beta distribution — 23 November 2026

Both requested native store builds completed from source `b7a53c9d7d70dd20ce31cc1326874e42b7880784`: version0.1.0, Android versionCode2 and iOS build2. Both connect to the explicitly approved synthetic client-demo API at `https://easygas-client-demo.vercel.app`.

| Platform | Result | Remaining testing gate |
| --- | --- | --- |
| Android | Signed AAB verified and uploaded through authenticated Google Play Console. Internal release0.1.0(2) published, readback: Available to internal testers. | No email list selected, so track summary remains Inactive. Exact tester accounts requested; unrelated existing lists were not reused. |
| iPhone/iPad | Signed device IPA verified; EAS submission59b9df06 FINISHED; Apple processed build2 under EasyGas Energy Solutions/app6838122026. | Apple shows Missing Compliance. Prepared declaration awaiting owner approval; tester accounts/group assignment still open. |

Google's exact Developer Program Policies and US export declarations were approved by the user before app creation. Apple browser login was completed by the user. The app name EasyGas was unavailable at Apple, so the existing business name EasyGas Energy Solutions was used. Both stores use the verified `com.easygasng.customer` identity.

Six executed artifact checks verified archive structure, signatures, exact upload certificate/Apple team and profile, package/version, iPhone/iPad support and approved API presence in compiled JavaScript. Five configuration/security guard checks and two matrix checks pass. These are artifact and configuration checks; no installation or whole-app device acceptance is claimed.

- [Artifact identities, SHA-256 hashes and readback](artifact-verification.json)
- [Executed artifact verification](artifact-verification.txt)
- [Configured release guards](configuration-and-traceability-tests.txt)
- [Matrix validation](traceability-final.txt)
- [Source/API/signing/store record](preflight.json)
- [Actual encryption inventory and pending declaration](ENCRYPTION-INVENTORY.md)
- [What to test](WHAT-TO-TEST.md)
- [Requirements, gates and outstanding work](../traceability/store-testing-20261123-rtm.md)

The `testing` submit profile pins the actual Apple app ID/team and defaults future Android CLI submissions to an internal draft. This release used the exact iOS build ID and a manual authenticated Android Console upload; no unrelated Play service account was assigned. No commercial production release was performed. Private artifacts, account screenshots, authenticated temporary URLs, signing keys and one-time codes are excluded from Git. The temporary local Apple API-key file was removed after signing setup; the original remains in the authorised EAS credential store.

Original production NO-GO, physical/provider/native lifecycle acceptance, retained records and historical import holds remain. Signed beta uploads do not close those gates.
