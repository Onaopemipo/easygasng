BEGIN;
SET LOCAL search_path TO easygas_private,pg_catalog;
-- Preserve financial amounts. Infer legacy fixed-fill kg only from an explicit original order-line label.
ALTER TABLE order_items ADD COLUMN gas_grams_per_unit bigint CHECK(gas_grams_per_unit>0);
UPDATE order_items SET gas_grams_per_unit=round(((regexp_match(lower(name),'^([0-9]+(?:\.[0-9]+)?)\s*kg\s+(?:gas\s+)?refill'))[1])::numeric*1000)::bigint WHERE lower(name) ~ '^[0-9]+(\.[0-9]+)?\s*kg\s+(gas\s+)?refill';
UPDATE setting_definitions SET propose_roles='[]',description='Historical fixed-fill price retained. New gas sales use the governed per-kilogram price.' WHERE key LIKE 'price.refill-%';

INSERT INTO schema_migrations(version) VALUES ('025');
COMMIT;
