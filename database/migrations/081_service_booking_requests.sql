-- Customer preference intake has no provider or reserved capacity. Existing
-- qualified calendar slots retain their non-null provider and uniqueness rules.
ALTER TABLE service_slots ADD COLUMN request_only boolean NOT NULL DEFAULT false;
ALTER TABLE service_slots ALTER COLUMN technician_id DROP NOT NULL;
ALTER TABLE service_slots ADD CONSTRAINT service_slot_provider_kind CHECK (
  (request_only AND technician_id IS NULL AND capacity=1 AND blocked=true)
  OR (NOT request_only AND technician_id IS NOT NULL)
);
ALTER TABLE service_slots DROP CONSTRAINT service_slots_service_id_branch_id_starts_at_key;
CREATE UNIQUE INDEX service_slots_reserved_start ON service_slots(service_id,branch_id,starts_at) WHERE NOT request_only;
