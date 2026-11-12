# Release and rollback

Production remains **NO-GO**. This phase used isolated synthetic records and did not deploy.

To roll back a release containing this phase, revert the driver redesign as a coordinated code change and rebuild the web and native clients. Restore the previous known-good deployment if the change is already hosted. Keep the existing database and private storage. The phase adds no migration, so rollback requires no schema downgrade or data restore. Preserve orders, attempts, photos, audit history and all on-device queues. Do not clear app data or re-enqueue confirmed operations. If the previous native version is active during rollout, keep the additive history API available until redesigned clients have been replaced.

After rollback verify driver sign-in, current assignments, private proof access, and staff dispatch. Reconcile any pending operation against its server record before retrying. Keep live release flags and automatic assignment subject to their existing approval controls.
