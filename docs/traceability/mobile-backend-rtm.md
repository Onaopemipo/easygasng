# Mobile local backend connection — 5 November 2026

| ID | Status | Implementation/evidence | Limits |
|---|---|---|---|
| MOB-API01 | VERIFIED_COMPLETE | Explicit local-demo config, separate app ID, shared origin guard; four passing focused tests and native typecheck; actual Xcode build; backend catalogue and authentication roundtrip verified in simulator. See JSON companion for files/security/evidence. | Bounded iOS simulator connection only. Android installation and physical-device/production release remain unverified. |
| MOB-G01 | PASS | Products/prices loaded from running backend; sign-in received expected backend rejection for a synthetic nonexistent account. Form cleared and left ready. | No customer credential was changed or actual private account access claimed. |

Production NO-GO, all prior release gates, and Excel import hold remain unchanged. [Run instructions](../operations/mobile-local-backend.md).
