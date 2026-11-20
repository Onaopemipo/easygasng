# Deployment request with no new build

20 November 2026. Native source is committed as `d190bde`. The subsequent request authorises committing all remaining changes, including the order-modal preview log, and deployment while restricting new builds. The user subsequently clarified: **no new mobile binaries; web/API build is permitted**. The initial inspection below explains why a web/API build is required.

Read-only inspection found the stable client demo still on Ready deployment `dpl_Ewd4EFdg7QEGbaAgqxAzBZ4MBiVN`, source `b10829aa447a7ae5bd430a73f9644e2feca854a6`. The 30 listed cloud deployments do not contain the new native/API commit. No Vercel Build Output API prebuilt artifact exists in the workspace. The ordinary Next output is a previous local verification build, not a prepared Vercel deployment artifact.

Existing iOS/Android artifacts remain recorded in `evidence/build-manifest.json`. They use loopback fixture API URLs; the iOS artifact is a simulator build. No configured Expo Updates runtime/channel exists. Publishing these files would not connect installed phones to the client demo.

At the initial inspection, no build, source push that would trigger build CI, cloud deployment, alias promotion or mobile distribution had been performed. The clarified web/API rollout is now being prepared; mobile build/export/distribution remains prohibited. The current demo remains available. No business records, environment flags or release controls were changed. Production NO-GO, actual-import hold, retain-all and all external/provider/physical/device gates remain.

[Read-only artifact inspection](evidence/no-build-release-inspection.json) · [Current matrix](../traceability/native-workflows-rtm.md).

## Clarification and completion

The user authorised a web/API build while prohibiting new mobile binaries. The web/API release is now deployed and verified; this supersedes the initial deployment-pending status. [Final release, evidence and rollback](WEB-API-RELEASE.md). Existing native binaries and the private prototype remain unchanged.
