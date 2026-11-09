# Vehicle stock and doorstep commitment — confirmed operating model and implementation dependencies

6 November2026. Production remains NO-GO; no actual stock/import/write approval inferred.

Audited source: driver-operations.ts/fleet-constraints.ts contain vehicles, active trips, observed order gas capacity and assignment acknowledgements. doorstep-amendments.ts stores proposals and customer consent but deliberately cannot commit. cylinder-allocation.ts allocates inspected company EMPTY cylinders to an order or POS sale; it does not represent loaded filled-cylinder custody. gas_stock is a branch balance, not evidence of vehicle stock. At the initial audit, no vehicle stock ledger or authoritative loaded-gas/cylinder manifest existed.

Required invariant: extra goods may only be fulfilled from accepted, inspectable, available stock actually loaded onto the current delivery vehicle. Branch availability cannot stand in for vehicle custody. The original order/invoice stays immutable; the same eligible visit gets zero additional delivery fee. Additional quantity, stock/custody, consent, pricing, obligation and independently verified collection must commit coherently and replay safely. No branch or customer opening quantities will be invented.

Confirmed by the customer on 6 November 2026: vehicles carry **bulk LPG dispensed on-site**. The vehicle ledger therefore tracks measured LPG mass, meter evidence, load acknowledgement, dispensing and returned mass. Customer cylinders remain subject to the existing ownership, capacity and safety inspection controls. This confirmation does not establish any opening stock quantities or physical certification.

Implementation dependency order for the confirmed bulk model:
1. Reuse existing product/cylinder IDs, trip/vehicle/branch IDs and inventory/custody authority. Add an auditable loaded-stock manifest with staff issue and driver acknowledgement; preserve branch ownership valuation without double-counting vehicle holdings.
2. Revalidate inspection, capacity, branch, active trip and serial availability at load, acknowledgement, proposal, consent and commit. No duplicate/expired/held serial or negative stock; expose actual discrepancies to inventory/dispatch.
3. Bind supplementary obligation to the exact delivery attempt, customer consent and immutable quote; retain one eligible delivery fee. Require independently verified principal before extra handover.
4. Atomic stock/custody/obligation/audit effects with unique operation identity, concurrent last-unit and rollback tests. Record returns/unused quantities before trip closure; never make an unverified adjustment to make balances match.
5. Existing driver/admin/customer UI, scoped permissions and offline pending/review states; no offline success.

The prefilled-cylinder alternative is excluded from this phase by the confirmed operating model. Unrelated technician recovery, production role-boundary and CRM work continues independently. Existing Excel stock/customer/payment/fee clarification hold is unchanged.

## Canonical accounting constraints

The current `gasReservation(..., "fulfilled")` debits both branch gas mass and the existing order reservation. Loading and dispensing must be integrated with that transaction; a second independent van debit would duplicate consumption. Existing empty-cylinder serial allocations are not LPG load records.

A viable ownership-preserving model retains branch total mass as inclusive of its vehicles, with a physical custody subledger. Each loaded gram must be allocated either to a canonical reserved order line or to explicitly reserved vehicle buffer; loading an already reserved order must not reserve it twice. Free warehouse availability must exclude all loaded buffer. Buffer conversion to a new obligation must atomically transfer its reservation rather than create another reservation. Dispensing must reduce both the vehicle custody balance and the existing canonical branch/reservation balance exactly once. Returns release unused buffer and record physical mass; unexplained loss is an exception requiring independent adjustment approval, never automatic reconciliation.

Required records bind branch, vehicle, active trip, issuing staff, acknowledging driver, measured grams, meter identity/unit/calibration evidence and immutable operation identity. Volume-to-mass conversion must not be guessed. Record mass in integer grams; use certified mass readings or an explicitly approved conversion policy backed by actual measurement evidence. Expired inspection/calibration, stale assignment, missing loaded balance and unresolved discrepancies must reject handover and trip closure.

This document records the initial design/dependencies. The subsequent original-order implementation is documented in bulk-lpg-implementation.md; supplementary doorstep execution remains unfinished. No doorstep execution flag has been enabled. Remaining work: schema and canonical reservation integration; independently authorised issue/acknowledgement/return workflows; metered original and supplementary dispensing; scoped UI; transaction/concurrency/replay tests and operational safety acceptance.

Implementation continuation: original-order bulk load/acknowledgement, metered dispensing, canonical fulfilment, cash/finance sequencing, returns and discrepancy holds now exist in migration058 and bulk-lpg modules. No actual opening quantity or certification was inferred. See bulk-lpg-implementation.md for remaining engineering and acceptance.
