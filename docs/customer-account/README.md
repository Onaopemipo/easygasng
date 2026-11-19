# Customer Account & Privacy redesign

`/account-settings` now opens on a concise Profile summary with a settings submenu: Profile, Addresses, Notifications, Security & privacy, Appearance and Your reviews. The same menu wraps into six links on small screens. Existing account links and completed-order/service review links continue to work.

Profile/name, address add/edit/removal, password, session sign-out, privacy verification and review creation/editing use focused dialogs. Saved addresses show default/availability status; communication settings use switches and time selectors. SMS and WhatsApp purposes remain independent and collapse under each channel. Reviews show five at a time, with publication consent and moderation preserved. Browser-local theme choice stays in Appearance. Technical delivery explanations and repeated forms are removed from the initial page; reference/history information is collapsed.

The existing APIs remain authoritative. No schema, role, ownership, session, password, media, reauthentication, publication or retention policy is relaxed. Data export still requires recent password verification. Deletion review still retains records. Address edits now preserve the recipient field; the default address has no ineffective unset checkbox. Channel writes retain operation keys for safe retries. Sensitive UI state resets with the signed-in identity.

## Validation

[Executed tests, build, types and screenshots](evidence/). Final focused suite: 62 passed, including actual component rendering, account/address/consent/privacy/session negatives, password policy and testimonial consent/moderation/ownership/media/deep-link controls, plus prior Orders/Notifications regressions. The web production build and typecheck pass. [Browser observations](evidence/browser-observations.txt) record desktop, tablet, mobile, dark theme, save flows, keyboard dismissal and focus recovery. Password change and external message delivery were not performed in browser QA.

[Machine-readable requirements matrix](../traceability/customer-account-redesign-rtm.json) and [readable matrix](../traceability/customer-account-redesign-rtm.md) retain all five approved scope rows. Independent matrix validation is recorded separately from implementation test evidence.

## Scope and remaining gates

This is a bounded local web redesign. Hosted rollout, real verification-mail delivery, formal assistive-technology and physical-device acceptance remain outside this phase and unverified. No deployment or native build performed. Existing production NO-GO, retain-all, actual-import hold, previous phase coverage denominators and unrelated work remain unchanged.

The repeatable fixture is `scripts/prepare-customer-account-qa.ts`. It refuses hosted/production configuration, writes a fresh temporary database, and stores synthetic local configuration only in ignored `.data/customer-account-qa.json`. Its fabricated completed orders/verified-payment rows establish UI eligibility only; they are not evidence of fulfilment, payment settlement or live operation.
