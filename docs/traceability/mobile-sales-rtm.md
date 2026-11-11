# Mobile Sales Attendant

The repository audit found an existing mobile cash POS and branch-scoped assisted customer lookup. The server checks role and branch scope. Customer lookup is read-only for business records and uses the existing audit trail. The all-roles specification IDs remain mapped through aliases in the [JSON matrix](mobile-sales-rtm.json).

The repository audit did not establish approved field-sales APIs for leads, visits, targets or commission. Commission remains conditional within SR-011.

| ID | Screen | Status |
| --- | --- | --- |
| SR-001 | Sales Home | PARTIAL |
| SR-002 | Leads & Opportunities | BLOCKED |
| SR-003 | Customer Account | PARTIAL |
| SR-004 | Create Order | PARTIAL |
| SR-005 | Payment Collection | PARTIAL |
| SR-006 | Order Confirmation | PARTIAL |
| SR-007 | Visit Planning | BLOCKED |
| SR-008 | Visit Check-in | BLOCKED |
| SR-009 | Sales Performance | BLOCKED |
| SR-010 | Products & Pricing | NOT_IMPLEMENTED |
| SR-011 | Sales Reports | NOT_IMPLEMENTED |
| SR-012 | Profile & Settings | PARTIAL |

Mobile typecheck passed. Full simulator acceptance remains open for all 12 screens.
