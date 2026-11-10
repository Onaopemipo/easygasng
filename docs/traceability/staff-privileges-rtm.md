# Staff privileges traceability

| ID | Requirement | Evidence | Status |
| --- | --- | --- | --- |
| STAFF-PRIV01 | Per-user grants, denials and role defaults in the explicit catalogue | STAFF-PRIV01/07/08; authoritative operation tests and identity-change invalidation | VERIFIED_COMPLETE |
| STAFF-PRIV02 | Backend, scope, fresh verification, history and concurrency | STAFF-PRIV02–06; STAFF-PRIV-PG independent connections; restricted runtime | VERIFIED_COMPLETE |
| STAFF-PRIV-UI01 | Staff Management editor, retained role requests and branded dirty-state handling | Actual local desktop/mobile browser; authenticated HTTP tests | VERIFIED_COMPLETE |

Three bounded requirements and three gates pass. See the [JSON matrix](staff-privileges-rtm.json) and [implementation report](../staff-privileges/report.md) for exact catalogue scope, policy boundaries, implementation paths and executed evidence. The broad625-pass regression preceded final identity hardening, followed by final focused24/real PostgreSQL1 checks. 22 environment-dependent skips remain in the broad denominator. Not pushed/deployed. Production NO-GO and prior outstanding requirements remain unchanged.
