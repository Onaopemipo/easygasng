# Recovery dependency map

| Operation | Authoritative records | Boundary / identity | Recovery owner and action |
|---|---|---|---|
| Create | service_bookings, slots, events | dispatch transaction; customer/idempotency + optional operation result | Customer/support: retry unchanged request, recover native reference, check existing bookings |
| Reschedule | same booking slot/version, events | locked booking, destination slot/technician; operationKey | Service manager/customer: refresh version, inspect actual slot before retry |
| Cancel | booking status, materials, events | one transaction; state + operationKey | Service manager: verify cancelled status and released reservations; refund separately |
| Quote decision | latest quote, immutable decision, reserved materials | booking lock + unique quote decision + operationKey | Customer/service manager: retrieve decision, never create another charge |
| Material issue/use/return | service_materials, stock movements | existing state/reference + operation result | Inventory: reconcile actual custody; never return consumed stock automatically |
| Report | immutable report, checklist, booking event | one transaction + operation result | Assigned qualified technician/safety: retrieve actual report and outcome; never overwrite unsafe finding |
| Wallet/refund/cash | wallet_entries, verified_payments, credit_requests | unique financial references; existing independent approvals | Finance: reconcile posted original/reversal; no blind external retry |
| Notification | notifications, message_outbox | same transaction; stable event dedupe | Support/platform: retry delivery only when configured; booking state remains authoritative |

Implementation: lib/business-operation.ts, lib/professional-services.ts, lib/db.ts, lib/refills.ts, lib/service-followups.ts and existing immutable migrations. Failed dispatch operations generate protected diagnostic incidents where storage permits; request bodies and credentials are not logged. No new recovery authority was granted.
