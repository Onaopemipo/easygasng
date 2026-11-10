# Reports empty-state cleanup

The screenshot showed two separate empty tables: report schedules and scheduled-report deliveries. Both used the generic Table fallback, producing identical large cards. The reports workspace now renders one combined, actionable empty state when both collections are empty. When either contains records, separate named sections preserve both lists and use compact contextual messages for the empty list. Existing generated-report open buttons, schedule creation/cancellation and permissions remain unchanged.

Actual rendering regression exercises empty/empty, populated/empty, empty/populated and populated/populated, including preservation of both tables and record identities. Existing unrelated technician work is preserved. No database mutation, migration or deployment; production NO-GO unchanged. Verification evidence is in evidence/.
