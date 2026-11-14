# Cinematic customer onboarding

[Detailed matrix, 30 acceptance gates and 60 scenarios](onboarding-redesign-rtm.json) · [Baseline](../onboarding-redesign/00-baseline-audit.md) · [Test evidence](../onboarding-redesign/04-test-results.md)

| Requirement | Implemented behavior | Verification still needed |
| --- | --- | --- |
| ONB-001 | Cooking Gas Delivered to Your Home, with the original EasyGas kitchen artwork | Installed native interaction and device visuals |
| ONB-002 | Fast & Reliable Delivery, with existing delivery artwork | Installed native interaction and device visuals |
| ONB-003 | More Than Just Gas, with conditional descriptions of services, rewards and refill estimates | Installed native interaction and device visuals |
| ONB-004 | Verified customer first-run entry, optional guest preview, replay and stored seen state | iOS skip, replay and restart exercised. Repeat immediate first sign-in on the updated iOS build and test Android and role transitions |
| ONB-005 | Optional responsive homepage introduction with navigation and focus return | Verified in Chromium at seven widths |
| ONB-006 | Accessible navigation, reduced motion, image fallback and recovery | Native assistive technology and device acceptance |
| ONB-007 | Regression coverage and documented rollback | Pending native interaction, release and production gates |

All seven requirements have implementation changes. One is fully verified and six are partial. Of 30 gates, 15 passed and 15 are partial. Of 60 scenarios, ten passed, 37 are partial and 13 are pending. These counts include untested work. Production remains **NO-GO**.
