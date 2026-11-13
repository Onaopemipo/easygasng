# Unified email and phone sign-in

The web and native forms send one identifier to the existing sign-in endpoints. Nigerian numbers are normalized before lookup. Phone sign-in requires a unique, verified number on an active account. Registration and email recovery continue to use the account email. The change needs no database migration.

| Requirement | Acceptance gate | Status |
| --- | --- | --- |
| SIGNIN-REQ-01 · One web sign-in field | SIGNIN-G01 · Desktop email and mobile web phone sign-in | Verified locally |
| SIGNIN-REQ-02 · Shared account lookup and legacy compatibility | SIGNIN-G02 · Both identifiers resolve to the same account, invalid phone matches fail and retry limits apply | Verified locally |
| SIGNIN-REQ-03 · Onboarding and field-role controls | SIGNIN-G03 · Verify temporary-password replacement, scoped sessions and recovery | Verified locally |
| SIGNIN-REQ-04 · One native sign-in field | SIGNIN-G04 · Installed iOS and Android validation | Implemented, installation checks pending |

Three of four requirements have passed their local acceptance gates. [Implementation and security mapping](unified-sign-in-rtm.json) · [Executed evidence](unified-sign-in-evidence.txt)

Hosted rollout is pending. The existing commercial production NO-GO remains in effect.
