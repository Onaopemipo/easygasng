# Security and domain regression

The changes reuse existing authenticated actions. Account and branch identity scope the mounted screens. The existing service checks current ownership and role on each read or write. It also enforces active profile, the expected report ID, the one-hour cooldown and duplicate creation restrictions. Closing a sheet or resetting a selection has no server side effect.

The existing backend handles eligibility, notification acknowledgement, forecast suppression and offer consent. Profile actions create no orders, stock changes, payments or subscriptions. Native and web show confirmed timestamps and preserve the draft after a recoverable save failure. Web blocks writes while offline and rechecks data after reconnecting.
