# Security and financial regression

- Profile reads and mutations resolve the customer from the authenticated server session. The clients cannot set a customer ID. The database lookup requires that the profile is owned and active before it can append feedback.
- Creation and supply writes are serialised with existing database rows. The existing feedback throttle still applies. Clients wait for confirmed writes and never queue profile changes offline.
- Existing forecast inputs, marketing consent, reward eligibility, reminder controls and audit events continue to use the same records. Supply reports do not post inventory, payments, refunds, orders or ledger entries.
- Focused tests covered ownership, staff denial, expired sessions, invalid refill products, stale edits and duplicates. Two independent PostgreSQL transactions verified that one conflicting create and one conflicting supply write commit. The broader suite covered delivery, cylinder, rewards, checkout, stock and finance paths.
