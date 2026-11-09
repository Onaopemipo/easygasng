# Driver routes
The driver-only native shell imports the shared App and uses canonical sessions. No customer identity or delivery database is duplicated.

| Screen | Implementation | Authority | Current limit |
|---|---|---|---|
| Splash / Sign in | DriverSignIn.tsx; driver/app.config.js | users / sessions, driver.login | Work email/password; driver ID/phone login not fabricated |
| Home | DriverWorkspace.tsx | driver.snapshot / orders | Real counts; availability separate from network/GPS |
| Assignment | DriverWorkspace.tsx | dispatch.respond / delivery.pickup | Direct assignments, not expiring offers |
| Progress / Status | DriverWorkspace.tsx | order.transition / delivery.arrived | Version and custody guards |
| Proof / Complete | DriverProof.tsx / driver.complete | delivery_photos / existing completeDelivery | Private proof + OTP + verified wallet; COD blocked |
| Orders / History | DriverWorkspace.tsx | owned orders | Latest 100; extended pagination pending |
| Profile | DriverWorkspace.tsx | existing account/password/support actions | No role or financial editing |

Dedicated driver shell excludes customer onboarding. Customer and technician navigation stays separate.
