# Encryption inventory for the beta upload

This is a technical inventory for answering Apple's actual export-compliance questions. It is not an owner legal attestation or an assertion of exemption.

- HTTPS protects API traffic. The test builds use the explicitly approved `https://easygas-client-demo.vercel.app` origin.
- `apps/mobile/field-crypto.ts` imports TweetNaCl 1.0.3 and calls `nacl.secretbox` / `nacl.secretbox.open` for authenticated encryption of local field records. This is XSalsa20-Poly1305 implemented by a bundled library, beyond operating-system HTTPS alone.
- Platform secure storage holds sensitive local credentials/key material. Existing encrypted queues and role/account isolation remain enabled.
- The signed iOS IPA has no `ITSAppUsesNonExemptEncryption` declaration. This was deliberately not changed to a guessed exemption to get through a release gate.

Apple finished processing build2 and showed Missing Compliance. The prepared, unsaved answer is published third-party encryption beyond Apple's OS, followed by a proposed no-France distribution answer. The industry-standard category is an interpretation based on the published library/algorithm and Apple's distinction between published encryption and proprietary/unpublished cryptography; it is not a claim that XSalsa20 is itself an IETF RFC. Owner confirmation of this declaration and the intended testing geography was requested before Save. No declaration has been submitted.

Authoritative references: [Apple export-compliance overview](https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance), [Apple documentation requirements](https://developer.apple.com/help/app-store-connect/reference/app-information/export-compliance-documentation-for-encryption/) and [TweetNaCl secretbox documentation](https://github.com/dchest/tweetnacl-js#secret-key-authenticated-encryption-secretbox). Apple describes its non-standard category using proprietary/unpublished functionality; TweetNaCl documents the published XSalsa20-Poly1305 construction. If testing/distribution includes France or a different owner-reviewed classification applies, revisit the prepared answers and supply the actual required documents.

Do not remove the queue encryption or weaken transport/storage controls to avoid this step. Do not set an exemption flag merely to clear the upload gate.

Production remains NO-GO. Test builds and upload completion do not establish physical-device, provider or commercial acceptance.
