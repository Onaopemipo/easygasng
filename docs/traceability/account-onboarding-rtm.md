# Account invitation and password recovery

[Machine-readable matrix](account-onboarding-rtm.json) · [Executed evidence](../account-onboarding/evidence.txt)

| Requirement | Evidence and status |
| --- | --- |
| ONBOARD-R01 Staff invitation | Verified locally. Chrome exercised an invitation from Staff Management through acceptance with a captured email. The staff approval workflow still applies after acceptance. |
| ONBOARD-R02 Customer setup | Verified locally. Chrome exercised Add Customer, email confirmation and first sign-in. |
| ONBOARD-R03 First sign-in password replacement | Verified at the browser and API boundaries. No valid session exists until the temporary password is replaced. The invitation and temporary password expire after 48 hours. |
| ONBOARD-R04 Staff and customer reset | Verified locally. The reset link is single use, expires after 30 minutes and revokes existing sessions. Chrome reset worked with the catalogue offline. |
| ONBOARD-R05 Hosted email and installed mobile acceptance | Partial. The local mail worker used a capture transport. Native source passed TypeScript. Live delivery and installed iOS and Android verification remain open. |

Implementation coverage is 5/5, including the partial rollout requirement. Verification and gate coverage are 4/5. All four P0 controls passed local verification. Browser coverage includes Staff Management, Customers, invitation acceptance, email confirmation, sign-in, password reset request, and password replacement. Hosted and native routes remain in scope for final acceptance.

Deploy migration 077 before the code and worker. Configure the approved HTTPS `APP_URL`, the transactional SMTP settings documented in `.env.example`, and the same `EASYGAS_MESSAGE_ENCRYPTION_KEY` on the API and worker. Run the existing worker using `npm run worker`. A queued status confirms the database write. Provider delivery requires the worker and configured SMTP service.

To roll back, preserve the additive schema and keep the first-sign-in and mail-decoding code running for pending accounts. An earlier build would treat temporary passwords as permanent credentials and cannot safely serve those accounts. Finish onboarding or use the current reset flow to replace the remaining temporary passwords before reverting authentication code. Stop the sender before rollback and review queued messages and active links. Existing production NO-GO remains.
