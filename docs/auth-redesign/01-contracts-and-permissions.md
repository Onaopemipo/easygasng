# Existing identity contracts and permissions

| UI | Existing authoritative action / boundary |
| --- | --- |
| Web/unified native sign-in | login {identifier,password,newPassword?}; service.ts normalises email or activated verified phone; generic 401; 8 attempts/15min429. Legacy email field accepted server-side. |
| Dedicated shells | driver.login / technician.login; server limits correct effective role/workspace. |
| Registration | register {name,email,password}; name 2–100, email max200, password 8–128. Server hardcodes customer; existing duplicate 409 preserved. No unverified merge. |
| First sign-in | passwordChangeRequired true returns no session; temporary password + newPassword required; server revokes old sessions. |
| Recovery | account.recover {email}; generic result for active/unknown accounts; three challenge attempts/hour; encryption/origin required. Provider/config failure remains error, never fake success. |
| Reset / verify | account.reset {token,password}, account.verify {token}; 64hex hashed expiring single-use challenge; reset revokes sessions. Tokens stay in memory, web hash removed after consumption into component memory. |
| Invitation | invitation.accept {token,password}; existing approval/effective-role boundary retained. |
| Assisted completion | phone.otp/review/complete; possession proof before order display, same customer/order preserved, applicable terms explicit. |
| Session / logout / step-up | me / logout / reauth; hashed server sessions 12h, SecureStore native; HttpOnly SameSite=lax cookie web, secure production and route same-origin/CSRF controls unchanged. |
| Return / drafts | safeCustomerReturn allowlist; customer-only approved return, staff /admin. Native pendingLink/service/checkout draft remain original memory state. Cart and intro persistence unchanged. |

Provider inventory: email/password and activated-phone/password SUPPORTED; Apple DISABLED; Google DISABLED; generic OTP/biometric/MFA not invented. UI must omit social buttons and divider. Existing account settings verification/role-request approval/session controls remain outside visual redesign and unchanged.
