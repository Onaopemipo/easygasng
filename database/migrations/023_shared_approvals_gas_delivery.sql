-- Additive upgrade: historical orders, inventory and decisions are retained.
ALTER TABLE change_requests ADD COLUMN policy_snapshot jsonb;
ALTER TABLE change_requests ADD COLUMN requester_role text;
ALTER TABLE change_requests ADD COLUMN submitted_at timestamptz;
ALTER TABLE change_requests ADD COLUMN activated_at timestamptz;
ALTER TABLE change_requests ADD COLUMN failure_reason text;
ALTER TABLE change_requests ADD COLUMN activation_attempts integer NOT NULL DEFAULT 0;
UPDATE change_requests r SET policy_snapshot=jsonb_build_object('risk',d.risk,'propose_roles',d.propose_roles,'approve_roles',d.approve_roles,'required_roles',d.required_roles,'additional_verification',d.additional_verification),requester_role=u.role,submitted_at=r.created_at FROM setting_definitions d,users u WHERE d.key=r.key AND u.id=r.requester_id;
ALTER TABLE change_requests ADD CONSTRAINT approval_status CHECK(status IN ('draft','pending_approval','changes_requested','partially_approved','approved','scheduled','applying','active','rejected','cancelled','expired','failed','superseded','rolled_back'));
CREATE INDEX approval_due_idx ON change_requests(effective_at) WHERE status IN ('approved','scheduled');
CREATE UNIQUE INDEX activation_once_idx ON setting_versions(request_id);
CREATE TABLE delivery_locations(id text PRIMARY KEY,name text NOT NULL,city text NOT NULL DEFAULT 'Lagos',state text NOT NULL DEFAULT 'Lagos',country text NOT NULL DEFAULT 'Nigeria',branch_id text NOT NULL REFERENCES branches(id),active boolean NOT NULL DEFAULT false,visible boolean NOT NULL DEFAULT false,archived boolean NOT NULL DEFAULT false,display_order integer NOT NULL DEFAULT 0,coverage text NOT NULL DEFAULT '',description text NOT NULL DEFAULT '',version integer NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX delivery_location_branch_idx ON delivery_locations(branch_id,active,display_order);
CREATE TABLE gas_stock(branch_id text PRIMARY KEY REFERENCES branches(id),grams bigint NOT NULL DEFAULT 0 CHECK(grams>=0),reserved_grams bigint NOT NULL DEFAULT 0 CHECK(reserved_grams>=0 AND reserved_grams<=grams));
CREATE TABLE gas_stock_movements(id text PRIMARY KEY,branch_id text NOT NULL REFERENCES branches(id),grams bigint NOT NULL,kind text NOT NULL CHECK(kind IN ('received','reserved','released','fulfilled')),reference text NOT NULL UNIQUE,actor_id text NOT NULL REFERENCES users(id),reason text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE order_gas_lines(id text PRIMARY KEY,order_id text NOT NULL REFERENCES orders(id),capacity_grams bigint NOT NULL CHECK(capacity_grams>0),grams bigint NOT NULL CHECK(grams>0 AND grams<=capacity_grams),unit_price_kobo bigint NOT NULL CHECK(unit_price_kobo>0),subtotal_kobo bigint NOT NULL CHECK(subtotal_kobo>0),cylinder_id text REFERENCES cylinders(id),inspected_by text REFERENCES users(id),inspection_note text,inspected_at timestamptz,allowable_grams bigint,pricing_version integer NOT NULL);
CREATE INDEX gas_order_idx ON order_gas_lines(order_id);
CREATE UNIQUE INDEX gas_cylinder_order_idx ON order_gas_lines(order_id,cylinder_id) WHERE cylinder_id IS NOT NULL;
ALTER TABLE orders ADD COLUMN location_id text REFERENCES delivery_locations(id);
ALTER TABLE orders ADD COLUMN location_snapshot jsonb;
ALTER TABLE orders ADD COLUMN pricing_snapshot jsonb;
ALTER TABLE orders ADD COLUMN operational_review text;
ALTER TABLE account_addresses ADD COLUMN location_id text REFERENCES delivery_locations(id);
ALTER TABLE account_addresses ADD COLUMN details jsonb NOT NULL DEFAULT '{}';
INSERT INTO gas_stock(branch_id) SELECT id FROM branches;
-- Confirmed initial values supplied by EasyGas. No operational quantity limits or stock are invented.
INSERT INTO setting_definitions(key,label,category,description,owner_role,risk,value_type,propose_roles,approve_roles,view_roles,required_roles,minimum,additional_verification) VALUES
('gas.price_per_kg','Gas price per kilogram','Gas Pricing','Selling price in kobo per kilogram, used for new gas quotations.','owner',3,'money','["owner","manager","finance"]','["owner"]','["owner","manager","finance","sales","inventory","dispatcher","administrator"]','["owner"]',1,true),
('gas.quantity_policy','Gas quantity and cylinder sizes','Gas Pricing','Business must configure minimum, maximum, increment, precision and supported cylinder capacities before gas ordering opens.','owner',3,'gas_policy','["owner","manager","inventory"]','["owner"]','["owner","manager","finance","sales","inventory","dispatcher","administrator"]','["owner"]',NULL,true);
INSERT INTO settings(key,scope,value) SELECT 'gas.price_per_kg',id,'180000'::jsonb FROM branches;
INSERT INTO settings(key,scope,value) SELECT 'gas.quantity_policy',id,'{"minimumKg":null,"maximumKg":null,"incrementKg":null,"precision":null,"capacitiesKg":[3,6,12.5,25,50]}'::jsonb FROM branches;
-- Record the initial fee as a new version, preserving its previous value.
INSERT INTO change_requests(id,key,scope,requester_id,previous_value,proposed_value,base_version,reason,risk,status,effective_at,expires_at)
SELECT 'initial-flat-fee-'||s.scope,s.key,s.scope,(SELECT id FROM users WHERE role='owner' AND active=true ORDER BY created_at LIMIT 1),s.value,'500000',s.version,'Confirmed delivery-only business specification supplied by EasyGas',3,'active',now(),now() FROM settings s WHERE s.key='delivery.fee' AND EXISTS(SELECT 1 FROM users WHERE role='owner' AND active=true);
INSERT INTO setting_versions(id,key,scope,version,previous_value,value,request_id,actor_id) SELECT r.id,r.key,r.scope,r.base_version+1,r.previous_value,r.proposed_value,r.id,r.requester_id FROM change_requests r WHERE r.id LIKE 'initial-flat-fee-%';
UPDATE settings SET value='500000',version=version+1,changed_at=now() WHERE key='delivery.fee';
UPDATE setting_definitions SET label='Flat delivery fee per order',category='Delivery Pricing',description='One flat fee per eligible physical delivery order; service call-outs are separate.',risk=3,approve_roles='["owner"]',required_roles='["owner"]',additional_verification=true WHERE key='delivery.fee';
-- Legacy area list remains historical; all new coverage is governed by individual location records.
UPDATE setting_definitions SET propose_roles='[]',description='Legacy area list retained for historical records. Use Delivery Locations for new coverage.' WHERE key='delivery.zones';
INSERT INTO delivery_locations(id,name,branch_id,active,visible,display_order) VALUES ('lagos-island','Lagos Island','lagos',true,true,1),('victoria-island','Victoria Island','lagos',true,true,2),('lekki','Lekki','lagos',true,true,3),('ajah','Ajah','lagos',true,true,4);
INSERT INTO setting_definitions(key,label,category,description,owner_role,risk,value_type,propose_roles,approve_roles,view_roles,required_roles,additional_verification)
SELECT 'location.'||id,name,'Delivery Locations','Named coverage only. Exact service boundaries require operational verification.','owner',3,'location','["owner","manager","dispatcher"]','["owner"]','["owner","manager","dispatcher","finance","sales","administrator"]','["owner"]',true FROM delivery_locations;
INSERT INTO settings(key,scope,value) SELECT 'location.'||id,branch_id,jsonb_build_object('name',name,'city',city,'state',state,'country',country,'branchId',branch_id,'active',active,'visible',visible,'archived',archived,'displayOrder',display_order,'coverage',coverage,'description',description) FROM delivery_locations;

CREATE TRIGGER gas_movements_append_only BEFORE UPDATE OR DELETE ON gas_stock_movements FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();

ALTER TABLE recurring_authorisations ADD COLUMN pricing_snapshot jsonb;

ALTER TABLE account_addresses ADD COLUMN is_default boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX address_default_once ON account_addresses(customer_id) WHERE is_default=true AND archived=false;

UPDATE setting_definitions SET propose_roles='[]',description='Historical fixed-fill price retained. New gas sales use the governed per-kilogram price.' WHERE key LIKE 'price.refill-%';
