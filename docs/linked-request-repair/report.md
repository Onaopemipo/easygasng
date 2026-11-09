# Linked-request contact repair

[Requirements matrix](../traceability/linked-request-contact-rtm.md)

Root cause: linked service drafts bypassed server validation while being saved; an invalid or formatted phone reached the strict booking schema only at final confirmation. The review screen did not expose the saved contact for correction, and the schema returned an unreadable regex message.

Changes: reuse the existing customer phone normalizer for equivalent Nigerian formats, preserve already-valid representations for existing request hashes, retain strict backend rejection with a helpful example, validate before saving/submitting drafts, and expose editable per-appointment contact fields persisted in the original session draft. No guessed phone, customer identity mutation, duplicated booking system or bypass of existing approvals.

Evidence:18/18 scoped contact/commerce/professional-service tests, web typecheck, production build and2/2 traceability checks pass. Tests cover formatted valid numbers, invalid/foreign contacts, legacy valid representation stability, UI correction/validation wiring, booking ownership/replay/overlap, stale service versions, quotation approvals and existing commerce controls. This phase did not execute browser interaction or a hosted booking. LINK-CONTACT02 therefore remains PARTIAL in coverage until those acceptance checks pass.

Not deployed. Existing production NO-GO, pending provider/device acceptance, actual Excel-import hold, retain-all and native/server deferrals remain unchanged. Rollback requires reverting this phase's contact helper/schema/client changes together; no migration/backfill introduced.
