# Authenticated TestFlight acceptance — 24 November 2026

Executed against Apple app `6838122026`, exact Apple build `881dfd4c-3797-4fe2-a4ce-3cfa35811855` / **0.1.0 (4)** using the existing EAS-resolved App Store Connect API credential and installed Expo Apple model API. The browser session expired after navigation; no current authenticated browser screenshot is claimed, and no new sign-in, API key, credential revocation or tester grant was needed.

| Case | Authoritative readback | Result |
| --- | --- | --- |
| IOS24-U01 | EAS exact-build submission FINISHED; Apple build4 processing VALID. Same approved build3 encryption-source/dependency hashes retained. Reused Apple's stored exemption value from the owner-approved standard third-party/no-France declaration; Missing Compliance cleared. | PASS |
| IOS24-U02 | Build4 IN_BETA_TESTING; exact existing EasyGas Internal QA group contains build4. Its two tester IDs match before/after; automatic future-build access remains off. What to Test content read back exactly from the saved en-US localisation. No external/public testing or expanded audience. | PASS |
| IOS24-U03 | Eight exact signed IPA checks and packaged iPhone/iPad icon comparison passed; all native/shared source hashes unchanged after packaging a2ef477. Android build2 and all production/physical/provider/import/retain-all gates retained. | PASS |

[Sanitised submission/API readback](submission.json), [preflight and source manifest](preflight.json), [artifact verification](artifact-verification.json), [packaged icon](icon-verification.json), [saved notes](WHAT-TO-TEST.md). Credential material, JWTs, temporary artifact URLs and tester addresses are excluded.

Upload and internal availability do not accept installed launch/launcher appearance, real provider return, physical devices, background/push/camera/GPS, accessibility or every feature/device/role combination. These remain in their original matrices; the production NO-GO remains unchanged.
