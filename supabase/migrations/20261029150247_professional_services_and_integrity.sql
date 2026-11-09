-- Local incremental migration. Requires the three preceding EasyGas migrations. Never apply without backup and staging validation.
BEGIN;
SET LOCAL search_path TO easygas_private,pg_catalog;

-- Application schema version 012
ALTER TABLE orders ADD COLUMN delivered_at timestamptz;
UPDATE orders o SET delivered_at=(SELECT min(e.created_at) FROM order_events e WHERE e.order_id=o.id AND e.status='delivered') WHERE status='delivered';
ALTER TABLE cylinders DROP CONSTRAINT cylinders_status_check;
ALTER TABLE cylinders ADD CONSTRAINT cylinders_status_check CHECK(status IN ('filled','empty','damaged','quarantined','inspection_due','sold'));
CREATE TABLE cylinder_allocations(id text PRIMARY KEY,cylinder_id text NOT NULL REFERENCES cylinders(id),order_id text REFERENCES orders(id),sale_id text REFERENCES pos_sales(id),state text NOT NULL CHECK(state IN ('reserved','issued','released')),created_at timestamptz NOT NULL DEFAULT now(),CHECK((order_id IS NOT NULL)::integer+(sale_id IS NOT NULL)::integer=1));
CREATE UNIQUE INDEX cylinder_allocated_once ON cylinder_allocations(cylinder_id) WHERE state IN ('reserved','issued');
CREATE INDEX cylinder_allocations_order ON cylinder_allocations(order_id);
CREATE INDEX order_events_order ON order_events(order_id,created_at);
CREATE INDEX payments_order ON verified_payments(order_id);
CREATE INDEX wallet_customer ON wallet_entries(customer_id,created_at);
CREATE INDEX rewards_customer ON reward_entries(customer_id,created_at);

INSERT INTO schema_migrations(version) VALUES ('012');

-- Application schema version 013
ALTER TABLE easygas_private.cylinder_allocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY trusted_server ON easygas_private.cylinder_allocations TO easygas_server USING(true) WITH CHECK(true);
GRANT SELECT,INSERT ON easygas_private.cylinder_allocations TO easygas_server;
GRANT UPDATE(state) ON easygas_private.cylinder_allocations TO easygas_server;
GRANT UPDATE(delivered_at) ON easygas_private.orders TO easygas_server;

INSERT INTO schema_migrations(version) VALUES ('013');

-- Application schema version 014
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK(role IN ('owner','manager','sales','inventory','dispatcher','driver','finance','customer','commercial','administrator','service_manager','technician','safety_officer'));
CREATE TABLE service_catalogue(id text NOT NULL,branch_id text NOT NULL REFERENCES branches(id),name text NOT NULL,config jsonb NOT NULL,version integer NOT NULL DEFAULT 1,checklist jsonb NOT NULL DEFAULT '[]',checklist_version integer NOT NULL DEFAULT 0,PRIMARY KEY(id,branch_id));
CREATE TABLE technician_qualifications(id text PRIMARY KEY,user_id text NOT NULL REFERENCES users(id),code text NOT NULL,evidence text NOT NULL,expires_at timestamptz NOT NULL,verified_by text NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),CHECK(user_id<>verified_by),UNIQUE(user_id,code));
CREATE TABLE service_slots(id text PRIMARY KEY,technician_id text NOT NULL REFERENCES users(id),service_id text NOT NULL,branch_id text NOT NULL,starts_at timestamptz NOT NULL,ends_at timestamptz NOT NULL,capacity integer NOT NULL CHECK(capacity BETWEEN 1 AND 100),blocked boolean NOT NULL DEFAULT false,FOREIGN KEY(service_id,branch_id) REFERENCES service_catalogue(id,branch_id),CHECK(ends_at>starts_at),UNIQUE(service_id,branch_id,starts_at));
CREATE TABLE service_bookings(id text PRIMARY KEY,reference text NOT NULL UNIQUE,service_id text NOT NULL,branch_id text NOT NULL,customer_id text NOT NULL REFERENCES users(id),slot_id text NOT NULL REFERENCES service_slots(id),technician_id text REFERENCES users(id),snapshot jsonb NOT NULL,checklist jsonb NOT NULL,checklist_version integer NOT NULL,address jsonb NOT NULL,equipment jsonb NOT NULL,notes text NOT NULL,status text NOT NULL CHECK(status IN ('pending_confirmation','confirmed','assigned','en_route','in_progress','awaiting_customer_approval','awaiting_acknowledgement','completed','cancelled','failed')),version integer NOT NULL DEFAULT 1,idempotency_key text NOT NULL,request_hash text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),FOREIGN KEY(service_id,branch_id) REFERENCES service_catalogue(id,branch_id),UNIQUE(customer_id,idempotency_key));
CREATE INDEX booking_customer ON service_bookings(customer_id,created_at);
CREATE INDEX booking_technician ON service_bookings(technician_id,status);
CREATE INDEX booking_slot ON service_bookings(slot_id,status);
CREATE TABLE service_booking_events(id text PRIMARY KEY,booking_id text NOT NULL REFERENCES service_bookings(id),actor_id text NOT NULL REFERENCES users(id),status text NOT NULL,note text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE service_quotes(id text PRIMARY KEY,booking_id text NOT NULL REFERENCES service_bookings(id),revision integer NOT NULL,labour_kobo bigint NOT NULL CHECK(labour_kobo>=0),callout_kobo bigint NOT NULL CHECK(callout_kobo>=0),total_kobo bigint NOT NULL CHECK(total_kobo>=0),lines jsonb NOT NULL,notes text NOT NULL,created_by text NOT NULL REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(booking_id,revision));
CREATE TABLE service_quote_decisions(id text PRIMARY KEY,quote_id text NOT NULL UNIQUE REFERENCES service_quotes(id),customer_id text NOT NULL REFERENCES users(id),approved boolean NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE service_materials(id text PRIMARY KEY,booking_id text NOT NULL REFERENCES service_bookings(id),quote_id text NOT NULL REFERENCES service_quotes(id),product_id text NOT NULL REFERENCES products(id),quantity integer NOT NULL CHECK(quantity>0),unit_price_kobo bigint NOT NULL CHECK(unit_price_kobo>0),unit_cost_kobo bigint CHECK(unit_cost_kobo>=0),state text NOT NULL CHECK(state IN ('reserved','issued','usage_recorded','reconciled','released')),used integer CHECK(used>=0),damaged integer CHECK(damaged>=0),UNIQUE(quote_id,product_id));
CREATE TABLE service_reports(id text PRIMARY KEY,booking_id text NOT NULL UNIQUE REFERENCES service_bookings(id),technician_id text NOT NULL REFERENCES users(id),outcome text NOT NULL CHECK(outcome IN ('success','recommendations','further_assessment','unsafe','unable')),body jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE service_acknowledgements(id text PRIMARY KEY,report_id text NOT NULL UNIQUE REFERENCES service_reports(id),customer_id text NOT NULL REFERENCES users(id),accepted boolean NOT NULL,notes text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE service_cash_collections(id text PRIMARY KEY,booking_id text NOT NULL REFERENCES service_bookings(id),amount_kobo bigint NOT NULL CHECK(amount_kobo>0),reference text NOT NULL UNIQUE,collector_id text NOT NULL REFERENCES users(id),verified_by text REFERENCES users(id),verified_at timestamptz,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE verified_payments ALTER COLUMN order_id DROP NOT NULL;
ALTER TABLE verified_payments ADD COLUMN booking_id text REFERENCES service_bookings(id);
ALTER TABLE verified_payments ADD CONSTRAINT payment_target CHECK((order_id IS NOT NULL)::integer+(booking_id IS NOT NULL)::integer=1);
ALTER TABLE credit_requests ADD COLUMN booking_id text REFERENCES service_bookings(id);
CREATE UNIQUE INDEX service_refund_once ON credit_requests(booking_id) WHERE kind='refund' AND status IN ('pending','approved');
CREATE INDEX service_payments_booking ON verified_payments(booking_id);
CREATE TABLE service_feedback(id text PRIMARY KEY,booking_id text NOT NULL UNIQUE REFERENCES service_bookings(id),customer_id text NOT NULL REFERENCES users(id),rating integer NOT NULL CHECK(rating BETWEEN 1 AND 5),body text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE operational_incidents(id text PRIMARY KEY,branch_id text REFERENCES branches(id),severity text NOT NULL CHECK(severity IN ('critical','high','medium','low')),category text NOT NULL,target text NOT NULL,detail text NOT NULL,owner_role text NOT NULL,status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','acknowledged','resolved')),created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(category,target));
CREATE TABLE incident_events(id text PRIMARY KEY,incident_id text NOT NULL REFERENCES operational_incidents(id),actor_id text NOT NULL REFERENCES users(id),status text NOT NULL,note text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['service_booking_events','service_quotes','service_quote_decisions','service_reports','service_acknowledgements','service_feedback','incident_events'] LOOP EXECUTE format('CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation()',t); END LOOP; END $$;
INSERT INTO service_catalogue(id,branch_id,name,config) SELECT s.id,b.id,s.name,jsonb_build_object('name',s.name,'description',s.description,'active',false,'pricingModel','quote','priceKobo',NULL,'calloutKobo',0,'durationMinutes',60,'zones','[]'::jsonb,'qualification','lpg_service','preparation','Contact EasyGas to confirm preparation requirements.','safety','Work may proceed only after qualified assessment.','cancellationHours',24,'warranty','No warranty terms configured.','inclusions','Business configuration required.','exclusions','Parts and additional work require an approved quotation.') FROM branches b CROSS JOIN (VALUES ('cooker-servicing','Cooker Servicing','Assessment and servicing of cooking equipment.'),('cooker-installation','Cooker Installation','Qualified assessment and installation of a cooker.'),('cylinder-installation','Cylinder Installation','Qualified assessment and connection of compatible cylinder equipment.'),('gas-safety-check','Gas Safety Checks','Documented inspection by appropriately qualified personnel.')) s(id,name,description);
INSERT INTO setting_definitions(key,label,category,description,owner_role,risk,value_type,propose_roles,approve_roles,view_roles,required_roles,additional_verification) SELECT 'service.'||s.id,s.name,'Professional Services','Service content, pricing and availability require independent business approval.','owner',3,'service','["owner","service_manager"]','["owner"]','["owner","service_manager","safety_officer","finance"]','[]',true FROM service_catalogue s GROUP BY s.id,s.name;
INSERT INTO setting_definitions(key,label,category,description,owner_role,risk,value_type,propose_roles,approve_roles,view_roles,required_roles,additional_verification) SELECT 'checklist.'||s.id,s.name||' safety checklist','Professional Services','A qualified safety reviewer and independent owner approve checklist changes.','safety_officer',4,'checklist','["owner","service_manager"]','["owner","safety_officer"]','["owner","service_manager","safety_officer"]','["owner","safety_officer"]',true FROM service_catalogue s GROUP BY s.id,s.name;
INSERT INTO settings(key,scope,value) SELECT 'service.'||id,branch_id,config FROM service_catalogue;
INSERT INTO settings(key,scope,value) SELECT 'checklist.'||id,branch_id,'[]'::jsonb FROM service_catalogue;
UPDATE setting_definitions SET propose_roles=propose_roles||'["service_manager"]'::jsonb WHERE key='security.permissions';

INSERT INTO schema_migrations(version) VALUES ('014');

-- Application schema version 015
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['service_catalogue','technician_qualifications','service_slots','service_bookings','service_booking_events','service_quotes','service_quote_decisions','service_materials','service_reports','service_acknowledgements','service_cash_collections','service_feedback','operational_incidents','incident_events'] LOOP EXECUTE format('ALTER TABLE easygas_private.%I ENABLE ROW LEVEL SECURITY',t); EXECUTE format('CREATE POLICY trusted_server ON easygas_private.%I TO easygas_server USING(true) WITH CHECK(true)',t); EXECUTE format('GRANT SELECT,INSERT ON easygas_private.%I TO easygas_server',t); END LOOP; END $$;
GRANT UPDATE ON easygas_private.service_catalogue,easygas_private.technician_qualifications,easygas_private.service_slots,easygas_private.service_bookings,easygas_private.service_materials,easygas_private.operational_incidents TO easygas_server;
GRANT UPDATE(verified_by,verified_at) ON easygas_private.service_cash_collections TO easygas_server;
REVOKE UPDATE ON easygas_private.service_booking_events,easygas_private.service_quotes,easygas_private.service_quote_decisions,easygas_private.service_reports,easygas_private.service_acknowledgements,easygas_private.service_feedback,easygas_private.incident_events FROM easygas_server;

INSERT INTO schema_migrations(version) VALUES ('015');

-- Application schema version 016
CREATE TABLE product_categories(name text PRIMARY KEY,active boolean NOT NULL DEFAULT true,created_at timestamptz NOT NULL DEFAULT now());
INSERT INTO product_categories(name) SELECT DISTINCT category FROM products;
INSERT INTO product_categories(name) VALUES ('Gas Gauges'),('Gas Lighters'),('Gas Hoses'),('Gas Valves'),('Gas Regulators') ON CONFLICT DO NOTHING;
ALTER TABLE products ADD COLUMN sku text;
UPDATE products SET sku=id;
ALTER TABLE products ALTER COLUMN sku SET NOT NULL;
CREATE UNIQUE INDEX product_sku ON products(sku);
ALTER TABLE products ALTER COLUMN sku SET DEFAULT '';
ALTER TABLE products ADD COLUMN parent_id text REFERENCES products(id);
ALTER TABLE products ADD COLUMN attributes jsonb NOT NULL DEFAULT '{}';
ALTER TABLE products ADD COLUMN archived boolean NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE products ADD CONSTRAINT product_not_own_parent CHECK(parent_id IS NULL OR parent_id<>id);
CREATE TABLE media_assets(id text PRIMARY KEY,owner_id text NOT NULL REFERENCES users(id),product_id text REFERENCES products(id),booking_id text REFERENCES service_bookings(id),mime text NOT NULL CHECK(mime='image/webp'),data bytea NOT NULL,alt text NOT NULL,position integer NOT NULL DEFAULT 0 CHECK(position>=0),archived boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now(),CHECK((product_id IS NOT NULL)::integer+(booking_id IS NOT NULL)::integer=1),CHECK(octet_length(data)<=4000000));
CREATE INDEX media_product ON media_assets(product_id,archived,position);
CREATE INDEX media_booking ON media_assets(booking_id,archived);
CREATE TABLE commerce_checkouts(id text PRIMARY KEY,customer_id text NOT NULL REFERENCES users(id),idempotency_key text NOT NULL,request_hash text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(customer_id,idempotency_key));
CREATE TABLE checkout_fulfilments(checkout_id text NOT NULL REFERENCES commerce_checkouts(id),order_id text UNIQUE REFERENCES orders(id),booking_id text UNIQUE REFERENCES service_bookings(id),CHECK((order_id IS NOT NULL)::integer+(booking_id IS NOT NULL)::integer=1));
CREATE TABLE recommendation_rules(id text PRIMARY KEY,branch_id text NOT NULL REFERENCES branches(id),product_id text REFERENCES products(id),service_id text NOT NULL,relation text NOT NULL CHECK(relation IN ('assessment','verified_compatible','incompatible','unknown')),evidence text NOT NULL,active boolean NOT NULL DEFAULT false,created_by text NOT NULL REFERENCES users(id),reviewed_by text REFERENCES users(id),FOREIGN KEY(service_id,branch_id) REFERENCES service_catalogue(id,branch_id),CHECK(created_by<>reviewed_by));
CREATE TABLE recommendation_events(id text PRIMARY KEY,dedupe_key text UNIQUE,rule_id text NOT NULL REFERENCES recommendation_rules(id),customer_id text REFERENCES users(id),kind text NOT NULL CHECK(kind IN ('displayed','selected','booked','completed')),booking_id text REFERENCES service_bookings(id),created_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX recommendation_booking_event ON recommendation_events(rule_id,booking_id,kind) WHERE booking_id IS NOT NULL;
CREATE TRIGGER recommendations_immutable BEFORE UPDATE OR DELETE ON recommendation_events FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();
CREATE TRIGGER checkouts_immutable BEFORE UPDATE OR DELETE ON commerce_checkouts FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();

INSERT INTO schema_migrations(version) VALUES ('016');

-- Application schema version 017
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['product_categories','media_assets','commerce_checkouts','checkout_fulfilments','recommendation_rules','recommendation_events'] LOOP EXECUTE format('ALTER TABLE easygas_private.%I ENABLE ROW LEVEL SECURITY',t); EXECUTE format('CREATE POLICY trusted_server ON easygas_private.%I TO easygas_server USING(true) WITH CHECK(true)',t); EXECUTE format('GRANT SELECT,INSERT ON easygas_private.%I TO easygas_server',t); END LOOP; END $$;
GRANT UPDATE ON easygas_private.product_categories,easygas_private.media_assets,easygas_private.recommendation_rules TO easygas_server;
GRANT UPDATE(sku,parent_id,attributes,archived,updated_at) ON easygas_private.products TO easygas_server;

INSERT INTO schema_migrations(version) VALUES ('017');

-- Application schema version 018
ALTER TABLE recommendation_events ADD COLUMN IF NOT EXISTS dedupe_key text;
CREATE UNIQUE INDEX IF NOT EXISTS recommendation_event_dedupe ON recommendation_events(dedupe_key);
ALTER TABLE media_assets ADD COLUMN service_id text;
ALTER TABLE media_assets ADD COLUMN branch_id text;
ALTER TABLE media_assets ADD CONSTRAINT media_service_fk FOREIGN KEY(service_id,branch_id) REFERENCES service_catalogue(id,branch_id);
ALTER TABLE media_assets DROP CONSTRAINT media_assets_check;
ALTER TABLE media_assets ADD CONSTRAINT media_target CHECK((product_id IS NOT NULL)::integer+(booking_id IS NOT NULL)::integer+(service_id IS NOT NULL)::integer=1 AND (service_id IS NULL OR branch_id IS NOT NULL));
CREATE TABLE legal_documents(kind text PRIMARY KEY,title text NOT NULL,content text NOT NULL DEFAULT '',published boolean NOT NULL DEFAULT false,version integer NOT NULL DEFAULT 1,effective_at timestamptz);
INSERT INTO legal_documents(kind,title) VALUES ('terms','Terms and Conditions'),('privacy','Privacy Policy'),('delivery','Delivery Policy'),('refund','Refund Policy'),('cancellation','Cancellation Policy'),('service-booking','Service Booking Terms'),('warranty','Service Warranty Terms'),('purchase-credit','Prepaid Purchase Credit Terms'),('loyalty','Loyalty Programme Terms');
INSERT INTO setting_definitions(key,label,category,description,owner_role,risk,value_type,propose_roles,approve_roles,view_roles,required_roles,additional_verification) SELECT 'legal.'||kind,title,'Business Policies','Business-reviewed policy publication requires independent owner approval.','owner',3,'legal','["owner"]','["owner"]','["owner","administrator"]','[]',true FROM legal_documents;
INSERT INTO settings(key,scope,value) SELECT 'legal.'||kind,'lagos',jsonb_build_object('title',title,'content','','published',false,'effectiveAt',NULL) FROM legal_documents;
CREATE TABLE product_compatibility(id text PRIMARY KEY,product_id text NOT NULL REFERENCES products(id),equipment_brand text NOT NULL,equipment_model text NOT NULL,connection_spec text NOT NULL,pressure_spec text NOT NULL,evidence text NOT NULL,status text NOT NULL CHECK(status IN ('unknown','professional_confirmation','verified_compatible','incompatible')),proposed_by text NOT NULL REFERENCES users(id),reviewed_by text REFERENCES users(id),created_at timestamptz NOT NULL DEFAULT now(),CHECK(proposed_by<>reviewed_by));
CREATE TABLE service_followups(id text PRIMARY KEY,booking_id text NOT NULL REFERENCES service_bookings(id),customer_id text NOT NULL REFERENCES users(id),due_date date NOT NULL,reason text NOT NULL,created_by text NOT NULL REFERENCES users(id),dismissed_at timestamptz,rebooked_id text REFERENCES service_bookings(id),created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX followups_customer ON service_followups(customer_id,due_date);
ALTER TABLE communication_preferences ADD COLUMN service_reminders boolean NOT NULL DEFAULT true;

INSERT INTO schema_migrations(version) VALUES ('018');

-- Application schema version 019
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['legal_documents','product_compatibility','service_followups'] LOOP EXECUTE format('ALTER TABLE easygas_private.%I ENABLE ROW LEVEL SECURITY',t); EXECUTE format('CREATE POLICY trusted_server ON easygas_private.%I TO easygas_server USING(true) WITH CHECK(true)',t); EXECUTE format('GRANT SELECT,INSERT,UPDATE ON easygas_private.%I TO easygas_server',t); END LOOP; END $$;

INSERT INTO schema_migrations(version) VALUES ('019');
COMMIT;
