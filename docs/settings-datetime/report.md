# Invalid ISO datetime repair

[Traceability](../traceability/settings-datetime-rtm.md)

Root cause: the existing settings editor sends explicit Lagos +01:00 timestamps, but new proposals used Z-only datetime validation. Existing edit/revise already accepted offsets. Changed only the new-proposal datetime validator to accept explicit offsets consistently. The selected instant is retained, not interpreted in the tester's computer timezone.

Executed14 date, shared approval/gas and payment-policy checks: actual payment-setting drafts accept equivalent UTC/Lagos timestamps and store the exact same instant; timezone-less, invalid calendar, malformed and beyond-six-day timestamps are rejected without adding requests. Gateway setting/version remain unchanged. Independent approval/reauthentication/branch controls are retained. Web types/build pass.

Not deployed. Hosted proposal form retest remains open. Until deployed, leaving the optional effective-date field blank uses its existing default and avoids the incompatible timestamp; required approvals still apply. No gateway flags/fees/keys or real payments changed. All prior production NO-GO and unrelated pending work remain.
