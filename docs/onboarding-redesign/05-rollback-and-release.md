# Rollback and release

No database migration or environment change. Revert the cinematic onboarding commit to restore previous UI. Leave SecureStore key `easygas.onboarding.v1`, sessions and appearance preferences intact. The prior web code ignores the new local seen marker; no user action required. Release only from the reviewed code after the remaining gates have owners and results. This work has not been deployed, signed for distribution or linked to the staged demo database migration `079`.

Decision: **NO-GO for production**. Existing commercial holds and pending verification for the staged demo release remain in effect.

15 November demo release: web onboarding is now live at the [client demo](https://easygas-client-demo.vercel.app) in source `f75473a`. Hosted Chromium verified that the tour opens, can be skipped, and stays available from the homepage. No native package was published.
