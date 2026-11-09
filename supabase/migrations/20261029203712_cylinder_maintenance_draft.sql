BEGIN;
SET LOCAL search_path TO easygas_private,pg_catalog;
-- Confirmed service name; commercial terms and qualified availability remain unpublished.
INSERT INTO service_catalogue(id,branch_id,name,config)
SELECT 'cylinder-maintenance',s.branch_id,'Cylinder Maintenance',s.config||jsonb_build_object('name','Cylinder Maintenance','description','Professional cylinder inspection and maintenance, subject to qualified assessment.','active',false,'pricingModel','quote','priceKobo',NULL,'calloutKobo',0,'zones','[]'::jsonb,'preparation','Business configuration and qualified assessment required.','warranty','No warranty terms configured.','inclusions','Business configuration required.','exclusions','Parts, gas and installation are separately priced.') FROM service_catalogue s WHERE s.id='cylinder-installation' AND NOT EXISTS(SELECT 1 FROM service_catalogue existing WHERE existing.branch_id=s.branch_id AND lower(existing.name)='cylinder maintenance') ON CONFLICT(id,branch_id) DO NOTHING;
INSERT INTO setting_definitions(key,label,category,description,owner_role,risk,value_type,propose_roles,approve_roles,view_roles,required_roles,additional_verification)
SELECT 'service.cylinder-maintenance','Cylinder Maintenance',category,description,owner_role,risk,value_type,propose_roles,approve_roles,view_roles,required_roles,additional_verification FROM setting_definitions WHERE key='service.cylinder-installation' ON CONFLICT(key) DO NOTHING;
INSERT INTO setting_definitions(key,label,category,description,owner_role,risk,value_type,propose_roles,approve_roles,view_roles,required_roles,additional_verification)
SELECT 'checklist.cylinder-maintenance','Cylinder Maintenance safety checklist',category,description,owner_role,risk,value_type,propose_roles,approve_roles,view_roles,required_roles,additional_verification FROM setting_definitions WHERE key='checklist.cylinder-installation' ON CONFLICT(key) DO NOTHING;
INSERT INTO settings(key,scope,value) SELECT 'service.cylinder-maintenance',branch_id,config FROM service_catalogue WHERE id='cylinder-maintenance' ON CONFLICT(key,scope) DO NOTHING;
INSERT INTO settings(key,scope,value) SELECT 'checklist.cylinder-maintenance',branch_id,'[]'::jsonb FROM service_catalogue WHERE id='cylinder-maintenance' ON CONFLICT(key,scope) DO NOTHING;

INSERT INTO schema_migrations(version) VALUES ('027');
COMMIT;
