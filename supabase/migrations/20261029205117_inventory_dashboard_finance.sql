BEGIN;
SET LOCAL search_path TO easygas_private,pg_catalog;
-- Extend existing stock and approval authorities. No opening quantities/costs are invented.
ALTER TABLE gas_stock_movements DROP CONSTRAINT gas_stock_movements_kind_check;
ALTER TABLE gas_stock_movements ADD CONSTRAINT gas_stock_movements_kind_check CHECK(kind IN ('received','reserved','released','fulfilled','adjustment','transfer_out','transfer_in','quarantine','return_release'));
CREATE TABLE inventory_operations(id text PRIMARY KEY,branch_id text NOT NULL REFERENCES branches(id),kind text NOT NULL CHECK(kind IN ('adjustment','stocktake','quarantine','return_release','threshold','purchase','transfer','expense','expense_reversal','hold_disposition')),reference text NOT NULL UNIQUE,payload jsonb NOT NULL,requested_by text NOT NULL REFERENCES users(id),request_id text REFERENCES change_requests(id),applied_at timestamptz,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX inventory_operations_branch ON inventory_operations(branch_id,created_at DESC);
CREATE TABLE stock_receipts(id text PRIMARY KEY,branch_id text NOT NULL REFERENCES branches(id),product_id text REFERENCES products(id),gas boolean NOT NULL DEFAULT false,quantity bigint NOT NULL CHECK(quantity>0),unit_cost_kobo bigint CHECK(unit_cost_kobo>=0),supplier_id text REFERENCES suppliers(id),purchase_id text REFERENCES purchase_orders(id),reference text NOT NULL UNIQUE,reason text NOT NULL,evidence text NOT NULL,received_date date NOT NULL,actor_id text NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),CHECK((gas AND product_id IS NULL) OR (NOT gas AND product_id IS NOT NULL)));
CREATE INDEX stock_receipts_cost ON stock_receipts(branch_id,product_id,created_at);
CREATE TRIGGER receipts_immutable BEFORE UPDATE OR DELETE ON stock_receipts FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();
CREATE TABLE stock_holds(id text PRIMARY KEY,branch_id text NOT NULL REFERENCES branches(id),product_id text REFERENCES products(id),gas boolean NOT NULL DEFAULT false,quantity bigint NOT NULL CHECK(quantity>0),released bigint NOT NULL DEFAULT 0 CHECK(released>=0 AND released<=quantity),kind text NOT NULL,reference text NOT NULL UNIQUE,reason text NOT NULL,evidence text NOT NULL,actor_id text NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),CHECK((gas AND product_id IS NULL) OR (NOT gas AND product_id IS NOT NULL)));
ALTER TABLE purchase_orders ALTER COLUMN product_id DROP NOT NULL;
ALTER TABLE purchase_orders ADD COLUMN gas boolean NOT NULL DEFAULT false;
ALTER TABLE purchase_orders ADD COLUMN received_quantity bigint NOT NULL DEFAULT 0 CHECK(received_quantity>=0 AND received_quantity<=quantity);
UPDATE purchase_orders SET received_quantity=quantity WHERE status='received';
ALTER TABLE purchase_orders ADD COLUMN approval_request_id text REFERENCES change_requests(id);
ALTER TABLE purchase_orders ADD COLUMN payment_status text NOT NULL DEFAULT 'unverified' CHECK(payment_status IN ('unverified','verified'));
ALTER TABLE stock_transfers ALTER COLUMN product_id DROP NOT NULL;
ALTER TABLE stock_transfers DROP CONSTRAINT stock_transfers_status_check;
ALTER TABLE stock_transfers ADD CONSTRAINT stock_transfers_status_check CHECK(status IN ('requested','reserved','in_transit','partial','received','discrepancy','cancelled'));
ALTER TABLE stock_transfers ADD COLUMN gas boolean NOT NULL DEFAULT false;
ALTER TABLE stock_transfers ADD COLUMN received_quantity bigint NOT NULL DEFAULT 0 CHECK(received_quantity>=0 AND received_quantity<=quantity);
ALTER TABLE stock_transfers ADD COLUMN damaged_quantity bigint NOT NULL DEFAULT 0 CHECK(damaged_quantity>=0 AND received_quantity+damaged_quantity<=quantity);
ALTER TABLE stock_transfers ADD COLUMN approval_request_id text REFERENCES change_requests(id);
ALTER TABLE stock_transfers ADD COLUMN dispatched_by text REFERENCES users(id);
UPDATE stock_transfers SET received_quantity=quantity WHERE status='received';
CREATE TABLE transfer_receipts(id text PRIMARY KEY,transfer_id text NOT NULL REFERENCES stock_transfers(id),quantity bigint NOT NULL CHECK(quantity>=0),damaged bigint NOT NULL CHECK(damaged>=0),reference text NOT NULL UNIQUE,reason text NOT NULL,actor_id text NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),CHECK(quantity+damaged>0));
CREATE TRIGGER transfer_receipts_immutable BEFORE UPDATE OR DELETE ON transfer_receipts FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();
CREATE TABLE expense_categories(id text PRIMARY KEY,label text NOT NULL,active boolean NOT NULL DEFAULT true);
INSERT INTO expense_categories(id,label) VALUES ('gas-procurement','Gas procurement'),('cylinders','Cylinder purchases'),('accessories','Accessories procurement'),('fuel','Fuel'),('vehicle','Vehicle maintenance'),('wages','Staff wages'),('labour','Technician labour'),('rent','Rent'),('utilities','Utilities'),('marketing','Marketing'),('communication','Communication'),('processing','Processing charges'),('maintenance','Equipment maintenance'),('other','Other operating expenses');
CREATE TABLE expenses(id text PRIMARY KEY,branch_id text NOT NULL REFERENCES branches(id),category_id text NOT NULL REFERENCES expense_categories(id),amount_kobo bigint NOT NULL CHECK(amount_kobo>0),expense_date date NOT NULL,payee text NOT NULL,description text NOT NULL,method text NOT NULL,evidence text NOT NULL,reference text NOT NULL UNIQUE,fingerprint text NOT NULL UNIQUE,requested_by text NOT NULL REFERENCES users(id),approval_request_id text REFERENCES change_requests(id),status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','pending_approval','approved','recorded','paid','rejected','cancelled','reversed')),created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX expenses_branch_date ON expenses(branch_id,expense_date);
CREATE TABLE expense_events(id text PRIMARY KEY,expense_id text NOT NULL REFERENCES expenses(id),kind text NOT NULL CHECK(kind IN ('recorded','paid','reversed')),amount_kobo bigint NOT NULL CHECK(amount_kobo>0),reference text NOT NULL UNIQUE,actor_id text NOT NULL REFERENCES users(id),reason text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(expense_id,kind));
CREATE TRIGGER expense_events_immutable BEFORE UPDATE OR DELETE ON expense_events FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();
CREATE TABLE report_schedules(id text PRIMARY KEY,branch_id text NOT NULL REFERENCES branches(id),user_id text NOT NULL REFERENCES users(id),report text NOT NULL,frequency text NOT NULL CHECK(frequency IN ('daily','weekly','monthly')),next_run timestamptz NOT NULL,active boolean NOT NULL DEFAULT true,created_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX active_report_schedule ON report_schedules(user_id,branch_id,report,frequency) WHERE active;
CREATE TABLE report_deliveries(id text PRIMARY KEY,schedule_id text NOT NULL REFERENCES report_schedules(id),scheduled_for timestamptz NOT NULL,status text NOT NULL CHECK(status IN ('available_in_app','failed')),detail text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(schedule_id,scheduled_for));
CREATE TRIGGER report_deliveries_immutable BEFORE UPDATE OR DELETE ON report_deliveries FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();
INSERT INTO setting_definitions(key,label,category,description,owner_role,risk,value_type,propose_roles,approve_roles,view_roles,required_roles,additional_verification) VALUES ('inventory.valuation','Inventory valuation method','Inventory','Explicit method selection; incomplete acquisition costs always make valuation unavailable.','owner',3,'inventory_valuation','["owner","finance"]','["owner","finance"]','["owner","finance"]','[]',true);
INSERT INTO settings(key,scope,value) SELECT 'inventory.valuation',id,'"unconfigured"'::jsonb FROM branches;
ALTER TABLE gas_stock ADD COLUMN threshold_grams bigint CHECK(threshold_grams>=0);
ALTER TABLE purchase_orders ALTER COLUMN quantity TYPE bigint;
ALTER TABLE purchase_orders DROP CONSTRAINT purchase_orders_quantity_check;
ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_quantity_check CHECK(quantity BETWEEN 1 AND 1000000000);
ALTER TABLE operational_incidents ADD COLUMN assigned_reviewer_id text REFERENCES users(id);
-- A request cannot be redirected to a different business operation after review.
CREATE FUNCTION protect_inventory_operation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.id<>OLD.id OR NEW.branch_id<>OLD.branch_id OR NEW.kind<>OLD.kind OR NEW.reference<>OLD.reference OR NEW.payload<>OLD.payload OR NEW.requested_by<>OLD.requested_by OR (OLD.request_id IS NOT NULL AND NEW.request_id IS DISTINCT FROM OLD.request_id) OR (OLD.applied_at IS NOT NULL AND NEW.applied_at IS DISTINCT FROM OLD.applied_at) THEN
  RAISE EXCEPTION 'Business operation evidence is immutable';
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER protect_inventory_operation BEFORE UPDATE ON inventory_operations FOR EACH ROW EXECUTE FUNCTION protect_inventory_operation();
ALTER TABLE report_deliveries ADD COLUMN snapshot jsonb;

INSERT INTO schema_migrations(version) VALUES ('028') ON CONFLICT DO NOTHING;
-- Browser/native roles have no direct grants; server actor/branch checks are mandatory.
DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['inventory_operations','stock_receipts','stock_holds','transfer_receipts','expense_categories','expenses','expense_events','report_schedules','report_deliveries'] LOOP
  EXECUTE format('ALTER TABLE easygas_private.%I ENABLE ROW LEVEL SECURITY',tab);
  EXECUTE format('REVOKE ALL ON easygas_private.%I FROM PUBLIC',tab);
  EXECUTE format('CREATE POLICY trusted_server ON easygas_private.%I TO easygas_server USING(true) WITH CHECK(true)',tab);
  EXECUTE format('GRANT SELECT,INSERT ON easygas_private.%I TO easygas_server',tab);
 END LOOP;
END $$;
GRANT UPDATE(request_id,applied_at) ON easygas_private.inventory_operations TO easygas_server;
GRANT UPDATE(released) ON easygas_private.stock_holds TO easygas_server;
GRANT UPDATE(status,approval_request_id) ON easygas_private.expenses TO easygas_server;
GRANT UPDATE(active) ON easygas_private.expense_categories TO easygas_server;
GRANT UPDATE(active,next_run) ON easygas_private.report_schedules TO easygas_server;
GRANT UPDATE(gas,received_quantity,approval_request_id,payment_status) ON easygas_private.purchase_orders TO easygas_server;
GRANT UPDATE(gas,received_quantity,damaged_quantity,approval_request_id,dispatched_by) ON easygas_private.stock_transfers TO easygas_server;
GRANT UPDATE(threshold) ON easygas_private.inventory TO easygas_server;
GRANT UPDATE(threshold_grams) ON easygas_private.gas_stock TO easygas_server;
GRANT UPDATE(name,contact,active) ON easygas_private.suppliers TO easygas_server;
GRANT UPDATE(assigned_reviewer_id) ON easygas_private.operational_incidents TO easygas_server;

INSERT INTO schema_migrations(version) VALUES ('029') ON CONFLICT DO NOTHING;
CREATE TABLE stocktakes(id text PRIMARY KEY,branch_id text NOT NULL REFERENCES branches(id),reference text NOT NULL UNIQUE,reason text NOT NULL,snapshot jsonb NOT NULL,created_by text NOT NULL REFERENCES users(id),status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','submitted','closed')),counts_hash text,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE stocktake_counts(id text PRIMARY KEY,stocktake_id text NOT NULL REFERENCES stocktakes(id),product_id text REFERENCES products(id),gas boolean NOT NULL,expected bigint NOT NULL CHECK(expected>=0),counted bigint NOT NULL CHECK(counted>=0),reason text NOT NULL,evidence text NOT NULL,operation_id text REFERENCES inventory_operations(id),created_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX stocktake_product_once ON stocktake_counts(stocktake_id,COALESCE(product_id,'__bulk_gas__'));
CREATE INDEX stocktakes_branch ON stocktakes(branch_id,created_at DESC);
CREATE TRIGGER stocktake_counts_immutable BEFORE UPDATE OR DELETE ON stocktake_counts FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();
ALTER TABLE stocktake_counts ADD CONSTRAINT stocktake_units CHECK((gas AND product_id IS NULL) OR (NOT gas AND product_id IS NOT NULL));

INSERT INTO schema_migrations(version) VALUES ('030') ON CONFLICT DO NOTHING;
ALTER TABLE easygas_private.stocktakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE easygas_private.stocktake_counts ENABLE ROW LEVEL SECURITY;
CREATE POLICY trusted_server ON easygas_private.stocktakes TO easygas_server USING(true) WITH CHECK(true);
CREATE POLICY trusted_server ON easygas_private.stocktake_counts TO easygas_server USING(true) WITH CHECK(true);
GRANT SELECT,INSERT ON easygas_private.stocktakes,easygas_private.stocktake_counts TO easygas_server;
GRANT UPDATE(status,counts_hash) ON easygas_private.stocktakes TO easygas_server;

INSERT INTO schema_migrations(version) VALUES ('031') ON CONFLICT DO NOTHING;
COMMIT;
