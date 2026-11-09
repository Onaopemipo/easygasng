-- User-requested catalogue update. No stock, orders or payment configuration are changed.
BEGIN;
SET LOCAL search_path TO easygas_private,pg_catalog;
-- Product list and NGN prices explicitly supplied by the user, 29 October 2026.
-- Existing stock, reservations, order snapshots and payment configuration are preserved.
CREATE TEMP TABLE easygas_requested_catalogue (
  id text PRIMARY KEY, name text NOT NULL, description text NOT NULL,
  category text NOT NULL, size_kg numeric NOT NULL, price_kobo bigint NOT NULL
) ON COMMIT DROP;
INSERT INTO easygas_requested_catalogue VALUES
('cylinder-empty-6','6kg Empty Cylinder','Empty 6kg LPG cylinder. Cooking gas is sold separately.','Empty cylinders',6,2600000),
('cylinder-empty-12','12.5kg Empty Cylinder','Empty 12.5kg LPG cylinder. Cooking gas is sold separately.','Empty cylinders',12.5,4200000),
('cylinder-empty-25','25kg Empty Cylinder','Empty 25kg LPG cylinder. Cooking gas is sold separately.','Empty cylinders',25,6000000),
('cylinder-empty-50','50kg Empty Cylinder','Empty 50kg LPG cylinder. Cooking gas is sold separately.','Empty cylinders',50,11000000),
('refill-6','6kg Refill','LPG refill for your eligible 6kg cylinder. Empty cylinder is sold separately.','Gas refills',6,900000),
('refill-12','12.5kg Refill','LPG refill for your eligible 12.5kg cylinder. Empty cylinder is sold separately.','Gas refills',12.5,1875000),
('refill-25','25kg Refill','LPG refill for your eligible 25kg cylinder. Empty cylinder is sold separately.','Gas refills',25,3750000),
('refill-50','50kg Refill','LPG refill for your eligible 50kg cylinder. Empty cylinder is sold separately.','Gas refills',50,7500000);
SELECT id FROM branches ORDER BY id FOR UPDATE;
INSERT INTO audit_events(id,actor_id,action,target,outcome,detail)
SELECT 'catalogue-user-import-20261029',NULL,'catalogue.user_import','lagos','success',
jsonb_build_object('source','User-supplied Easygas Quick Sale screenshot, 29 October 2026','currency','NGN','stockChanged',false,
'products',(SELECT jsonb_agg(jsonb_build_object('id',r.id,'name',r.name,'priceKobo',r.price_kobo,'previousPriceKobo',i.price_kobo,'previousPublished',i.published)) FROM easygas_requested_catalogue r LEFT JOIN inventory i ON i.product_id=r.id AND i.branch_id='lagos'));
INSERT INTO products(id,name,description,category,size_kg,asset)
SELECT id,name,description,category,size_kg,'cylinder' FROM easygas_requested_catalogue
ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,category=EXCLUDED.category,size_kg=EXCLUDED.size_kg;
INSERT INTO inventory(branch_id,product_id)
SELECT b.id,r.id FROM branches b CROSS JOIN easygas_requested_catalogue r ON CONFLICT DO NOTHING;
UPDATE inventory i SET price_kobo=r.price_kobo,published=true
FROM easygas_requested_catalogue r WHERE i.product_id=r.id AND i.branch_id='lagos';
INSERT INTO setting_definitions(key,label,category,description,owner_role,risk,value_type,propose_roles,approve_roles,view_roles,minimum,maximum)
SELECT 'price.'||id,name||' price','Products & Pricing','Changes apply to future orders; confirmed order prices are preserved.','owner',2,'money',
'["owner","manager","sales"]'::jsonb,'["owner","manager"]'::jsonb,'["owner","manager","sales","inventory","dispatcher","driver","finance","administrator"]'::jsonb,100,100000000
FROM easygas_requested_catalogue ON CONFLICT DO NOTHING;
INSERT INTO setting_definitions(key,label,category,description,owner_role,risk,value_type,propose_roles,approve_roles,view_roles)
SELECT 'publish.'||id,name||' visibility','Products & Pricing','Publish only after checking the description, price and product safety.','manager',2,'boolean',
'["owner","manager","inventory"]'::jsonb,'["owner","manager"]'::jsonb,'["owner","manager","sales","inventory","dispatcher","driver","finance","administrator"]'::jsonb
FROM easygas_requested_catalogue ON CONFLICT DO NOTHING;
INSERT INTO settings(key,scope,value)
SELECT 'price.'||r.id,b.id,CASE WHEN b.id='lagos' THEN to_jsonb(r.price_kobo) ELSE 'null'::jsonb END FROM branches b CROSS JOIN easygas_requested_catalogue r
ON CONFLICT(key,scope) DO UPDATE SET value=EXCLUDED.value,version=settings.version+1,changed_at=now()
WHERE settings.scope='lagos' AND settings.value IS DISTINCT FROM EXCLUDED.value;
INSERT INTO settings(key,scope,value)
SELECT 'publish.'||r.id,b.id,to_jsonb(b.id='lagos') FROM branches b CROSS JOIN easygas_requested_catalogue r
ON CONFLICT(key,scope) DO UPDATE SET value=EXCLUDED.value,version=settings.version+1,changed_at=now()
WHERE settings.scope='lagos' AND settings.value IS DISTINCT FROM EXCLUDED.value;

INSERT INTO schema_migrations(version) VALUES ('011');
COMMIT;
