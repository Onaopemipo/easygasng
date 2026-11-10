# Password minimum audit — 10 November 2026

Approved change: minimum account password length8, previously12, across registration/login, activation, password change/reset, staff provisioning and customer/driver/technician web/mobile interfaces. Existing maximum128, hashing, verification, rate limits, reset-token/session revocation and role controls remain. Backup encryption passphrases are a separate16-character control and are outside account-password scope. Existing identities/password hashes must not be reset or rewritten. No native build or deployment requested.

PW-MIN01: authoritative backend and provisioning rules; PW-MIN02: consistent web/mobile forms and copy. Both requirements stay in denominator; implementation/evidence and release limits will be mapped in the phase RTM before completion. Preserve unrelated pending order-addition work and production NO-GO.
