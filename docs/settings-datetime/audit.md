# Settings effective-date repair

Reported Invalid ISO datetime while enabling card payment. Admin setting form intentionally serializes datetime-local as Lagos time (+01:00). New setting.propose used UTC-only z.iso.datetime(), while existing approval edit/revise already accepts explicit timezone offsets. Align proposal validation with existing edit/revise behavior. No gateway flags/fees/merchant credentials, date limits or independent approvals may be bypassed. Preserve pending local changes and production NO-GO.

DATE-01: backend accepts valid Lagos/UTC instants, preserves exact instant and rejects naive/invalid/out-of-range values. All acceptance evidence and status retained in phase traceability.
