# Eight-character account passwords

[Detailed matrix](password-minimum-rtm.json) · [Audit](../password-policy/audit.md) · [Report](../password-policy/report.md)

| ID | Requirement | Status |
|---|---|---|
| PW-MIN01 | Shared backend/provisioning minimum8, maximum128 | VERIFIED_COMPLETE |
| PW-MIN02 | Matching web/mobile forms and instructions | PARTIAL: source/types verified; native/hosted runtime open |

Implementation2/2; verification1/2; critical verification1/1; gates1/2. Both requirements remain in coverage. Existing hashes, security/session controls, backup passphrase policy and production NO-GO remain. No deployment/native build implied.
