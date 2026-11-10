# Driver web login repair

The production role boundary restricts every driver session. Its action allowlist omitted `navigation.access` and `navigation`, so the existing /admin server page caught a navigation 403 and rendered 404 before redirecting to /admin/deliveries.

Added only those two read operations to the driver session allowlist. Existing navigation role/branch/privilege checks still constrain the driver to Deliveries. No sidebar, routes, driver assignment, financial authority, user accounts or business records changed.

17 driver/navigation tests pass, including restricted-session navigation and denial of audit, staff, settings, inventory and legacy completion. Inactive branch access remains denied. Web typecheck and build pass.

Local HTTP acceptance attempted twice against the existing isolated demo preview: driver sign-in returned 500, so redirect/page-response checks did not execute. This is an outstanding acceptance blocker, not a passed browser test. Hosted deployment and verification remain pending. Production NO-GO remains.
