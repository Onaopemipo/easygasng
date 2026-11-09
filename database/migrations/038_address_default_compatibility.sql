-- Existing databases may have recorded 023 before default-address support was added.
-- Preserve addresses and existing choices; never infer a customer's preferred address.
ALTER TABLE account_addresses ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS address_default_once ON account_addresses(customer_id) WHERE is_default=true AND archived=false;
