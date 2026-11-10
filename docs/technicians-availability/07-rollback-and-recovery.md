# Rollback and recovery

For presentation rollback rebuild web with NEXT_PUBLIC_EASYGAS_TECHNICIANS_UI=legacy. Retain technician row locks, independent qualification checks, explicit availability validation and existing financial controls. Remove only the new native management destination if reverting mobile presentation; approved field shell files were never changed.

No DDL/down migration is needed. Never erase a committed slot, qualification audit or financial record to roll back UI. Existing booked-slot blocking requires customer rescheduling; do not rewrite booking status to unblock a UI operation.

Recovery test evidence: repeated operationKey returns the same slot; competing independent PostgreSQL transactions produce exactly one new slot; unavailable/self-review/revoked-qualification failures leave domain changes uncommitted. Actual staged operational rollback drill and backup restore for a released build remain open; a written runbook is not evidence that such a drill occurred.
