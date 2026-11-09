-- Optional verified identity via the existing independent shared approval workflow.
-- No sample registration/tax values; no changes to historical issued snapshots.
INSERT INTO setting_definitions(key,label,category,description,owner_role,risk,value_type,propose_roles,approve_roles,view_roles,required_roles,additional_verification)
VALUES('document.identity','Verified financial document identity','Business Details','Configure only verified business legal/contact details; record verification evidence. Independent approval required. New documents only; optional fields may remain empty.','owner',3,'document_identity','["owner"]','["owner","finance"]','["owner","finance"]','[]',true);
INSERT INTO settings(key,scope,value) SELECT 'document.identity',id,'null'::jsonb FROM branches;
