# Existing technician lifecycle preserved

Assigned booking → acknowledge/decline through versioned existing command → assessment visit → latest quotation → independent business approval + customer decision + verified payment/authorised audited exception → server-authorised chargeable work → required checklist/material reconciliation/private proof → report → required customer acknowledgement → completed record.

`professional-services.ts`, `service.ts`, `technician-session.ts`, `service-photos.ts` and existing approval/payment/stock ledgers remain authoritative. UI eligibility is guidance; the server revalidates current actor, branch, assignment, qualification, job version, work phase, approvals and payment. A stale picker cannot grant permission. No technician self-approval, unverified cash as payment, inventory consumption twice, or offline final completion is introduced.

Home photo/report pickers accept only existing own in-progress authorised-work jobs without submitted report. The chosen job opens existing `Services.Appointment`, retaining its checklist, photos, materials and report forms. These shortcuts do not create another report/upload lifecycle. Inner forms currently show the full job workflow rather than automatically scrolling to the photo/report section; section-focus polish remains outstanding.

Existing backend tests cover unpaid work rejection, approval/payment progression, revised quotation invalidation, assignment response, stale/concurrent progression, proof-required report, material reconciliation and unsafe inspection escalation. See executed349-test suite and acceptance matrix; a test suite is not a field-service safety certification.
