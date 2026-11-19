# Customer service bookings redesign — 19 November 2026

Five bounded local web requirements verified. Production NO-GO, retain-all, actual-import hold and unrelated work preserved.

| ID | Requirement | Authority / control | Test IDs | Gate / status |
|---|---|---|---|---|
| CSBK-01 | Compact bookings workspace with searchable status views and on-demand booking details | Existing service_catalogue, service_bookings, service_slots, account.profile and billing/qualification APIs; Original authenticated ownership, approved service/version/area and actual work qualification/safety controls retained | CSBK-UI01 | CSBK-G01 PASS / VERIFIED_COMPLETE |
| CSBK-02 | Focused customer service-request dialog with preferred Lagos date/time, address, review and retry recovery | Existing service_catalogue, service_bookings, service_slots, account.profile and billing/qualification APIs; Original authenticated ownership, approved service/version/area and actual work qualification/safety controls retained | CSBK-UI02, CSBK-API04, CSBK-API05 | CSBK-G02 PASS / VERIFIED_COMPLETE |
| CSBK-03 | Accept canonical unassigned booking requests independently of technician slots without confirming a provider or visit | Existing service_catalogue, service_bookings, service_slots, account.profile and billing/qualification APIs; Original authenticated ownership, approved service/version/area and actual work qualification/safety controls retained | CSBK-API01, CSBK-API02, CSBK-API03, CSBK-API05, EO-PG | CSBK-G03 PASS / VERIFIED_COMPLETE |
| CSBK-04 | Clean service detail/catalogue presentation and consistent booking entry points | Existing service_catalogue, service_bookings, service_slots, account.profile and billing/qualification APIs; Original authenticated ownership, approved service/version/area and actual work qualification/safety controls retained | CSBK-UI02, CSBK-UI03 | CSBK-G04 PASS / VERIFIED_COMPLETE |
| CSBK-05 | Preserve ownership, pricing/version, coverage, payment, qualification, safety and existing appointment controls | Existing service_catalogue, service_bookings, service_slots, account.profile and billing/qualification APIs; Original authenticated ownership, approved service/version/area and actual work qualification/safety controls retained | CSBK-API02, CSBK-API03, CSBK-API04, EO-PG | CSBK-G05 PASS / VERIFIED_COMPLETE |

Implementation5/5; verification5/5; critical2/2; route templates3/3; gates5/5. 75 focused tests and1 independent PostgreSQL test passed; web build/types and desktop/tablet/mobile light/dark browser checks passed.

[Machine mapping](customer-service-booking-redesign-rtm.json) includes actual implementation paths, controls, exact negative test titles and evidence. [Validation report](../customer-service-bookings/README.md).

Approved scope change: standalone customer intake no longer requires technician/calendar availability. A preferred time creates an unassigned Awaiting confirmation request. Actual qualified allocation and work authorisation still apply; no automatic outsourcing/confirmed slot or payment is implied. Bundles retain qualified-slot scheduling. Prior SDR/SBV matrices retain their IDs, historical evidence, native gaps and NO-GO.

Hosted migration081/rollout, installed native parity, formal assistive/physical-device acceptance and outsourced-provider integrations remain unverified; they are outside the bounded local completion claim.
