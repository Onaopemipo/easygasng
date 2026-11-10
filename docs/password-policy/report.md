# Account password minimum8

[Traceability](../traceability/password-minimum-rtm.md)

Reduced minimum account-password length12 to8 using shared constants/schema across email/phone registration and sign-in, phone completion, invitation acceptance, password reset/change and owner/staff provisioning. Web inputs and customer/driver/shared technician mobile instructions use the same minimum. Maximum128 remains. Existing identities/password hashes are not rewritten; users can retain their current passwords.

Executed19 scoped tests: eight-character registration/login/change/reset; seven-character rejection without account creation; wrong current password; session revocation; reset token replay; maximum-length bounds; source coverage across entry points; existing workflow/assisted identity regressions. Web and mobile typechecks and web production build pass. No native build/runtime or hosted rollout performed. PW-MIN02 remains partial in the denominator until runtime acceptance, not marked complete from routes/source alone.

Hashing, rate limits, account ownership/roles, expiring single-use tokens, session invalidation and password visibility controls remain. Backup encryption passphrases are separate and keep minimum16. No migration or seed introduced. Rollback must preserve any passwords already created under the approved minimum; reintroducing a12-character login minimum could lock those users out.

Existing production NO-GO, import/retention and native/server decisions, and pending staff order-addition implementation are preserved. Not deployed.
