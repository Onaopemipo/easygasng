-- Execute only in Neon project silent-sun-90759854 / easygas-client-demo-db.
-- User authorised synthetic client-demo fixture on 21 Nov 2026. No real payment.
-- The SQL console uses its existing owner connection; no roles/grants are changed.
-- Append-only payment is retained. The inactive branch and cancelled order cannot sell/fulfil.
BEGIN;
SET LOCAL search_path TO easygas_private,pg_catalog;
DO $qa$
DECLARE
  qa_owner text;
  table_name text;
  fingerprint text;
  before_rows jsonb := '{}'::jsonb;
  predicate text := $filter$COALESCE(to_jsonb(t)->>'id','') NOT IN ('qa-ledger-cross-branch','637fe876-4424-4d52-8c70-141078af81ec','1e9e700b-a268-47d1-a448-ae57c688d640','d9c2340e-845e-4eec-84bd-b9316386f0af')$filter$;
BEGIN
  IF current_user NOT IN ('neondb_owner','easygas_demo_runtime','easygas_server') THEN
    RAISE EXCEPTION 'Use the verified dedicated demo console/runtime, never a production database';
  END IF;
  SELECT id INTO STRICT qa_owner FROM users
    WHERE role='owner' AND active=true AND name LIKE 'Demo QA%'
      AND email LIKE 'owner.qa-ac7e0495@%';
  IF NOT EXISTS (SELECT 1 FROM users WHERE role='finance' AND active=true AND branch_id='lagos') THEN
    RAISE EXCEPTION 'Expected existing Lagos QA finance identity is missing';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('easygas-demo/HLED-03/synthetic-20261121',0));
  FOREACH table_name IN ARRAY ARRAY['branches','users','orders','verified_payments','wallet_entries','credit_requests','inventory','gas_stock','settings'] LOOP
    EXECUTE format('SELECT md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text)::text,''[]'')) FROM %I t WHERE %s',table_name,predicate) INTO fingerprint;
    before_rows := before_rows || jsonb_build_object(table_name,fingerprint);
  END LOOP;
  IF EXISTS(SELECT 1 FROM branches WHERE id='qa-ledger-cross-branch') OR
     EXISTS(SELECT 1 FROM users WHERE id='637fe876-4424-4d52-8c70-141078af81ec') OR
     EXISTS(SELECT 1 FROM orders WHERE id='1e9e700b-a268-47d1-a448-ae57c688d640') OR
     EXISTS(SELECT 1 FROM verified_payments WHERE id='d9c2340e-845e-4eec-84bd-b9316386f0af') THEN
    IF NOT EXISTS (
      SELECT 1 FROM branches b JOIN users u ON u.branch_id=b.id
      JOIN orders o ON o.customer_id=u.id AND o.branch_id=b.id
      JOIN verified_payments p ON p.order_id=o.id
      WHERE b.id='qa-ledger-cross-branch' AND b.active=false AND b.name='SYNTHETIC QA ONLY - Ledger isolation'
        AND u.id='637fe876-4424-4d52-8c70-141078af81ec' AND u.active=false AND u.role='customer'
        AND o.id='1e9e700b-a268-47d1-a448-ae57c688d640' AND o.reference='SYNTHETIC-QA-HLED-ORDER-20261121'
        AND o.status='cancelled' AND o.payment_status='verified' AND o.total_kobo=1
        AND p.id='d9c2340e-845e-4eec-84bd-b9316386f0af' AND p.amount_kobo=1
        AND p.reference='SYNTHETIC-QA-HLED-PAY-20261121' AND p.method='synthetic_qa'
    ) THEN RAISE EXCEPTION 'Fixture collision or altered fixture: investigate without overwriting'; END IF;
  ELSE
    INSERT INTO branches(id,name,active) VALUES('qa-ledger-cross-branch','SYNTHETIC QA ONLY - Ledger isolation',false);
    INSERT INTO users(id,name,email,password_hash,role,branch_id,active,verified)
      VALUES('637fe876-4424-4d52-8c70-141078af81ec','SYNTHETIC QA ONLY - Inactive ledger fixture','ledger-isolation-20261121@demo.easygas.invalid','!INACTIVE-NO-LOGIN!','customer','qa-ledger-cross-branch',false,false);
    INSERT INTO orders(id,reference,customer_id,branch_id,status,payment_status,payment_method,subtotal_kobo,delivery_kobo,total_kobo,address,delivery_date,delivery_window,instructions,idempotency_key,request_hash,delivery_code_hash,delivery_code_expires_at)
      VALUES('1e9e700b-a268-47d1-a448-ae57c688d640','SYNTHETIC-QA-HLED-ORDER-20261121','637fe876-4424-4d52-8c70-141078af81ec','qa-ledger-cross-branch','cancelled','verified','synthetic_qa',1,0,1,
        '{"name":"SYNTHETIC QA ONLY","street":"Not a real address","zone":"No delivery","phone":""}',
        '2026-11-21','NO DELIVERY - QA ONLY','Synthetic ledger isolation fixture, not a real sale, receipt, delivery, refund or provider transaction. Retain only for QA; cancelled and inactive.',
        'SYNTHETIC-QA-HLED-20261121','SYNTHETIC-QA-HLED-20261121','',now()-interval '1 day');
    INSERT INTO verified_payments(id,order_id,reference,amount_kobo,method,verified_by)
      VALUES('d9c2340e-845e-4eec-84bd-b9316386f0af','1e9e700b-a268-47d1-a448-ae57c688d640','SYNTHETIC-QA-HLED-PAY-20261121',1,'synthetic_qa',qa_owner);
    INSERT INTO audit_events(id,actor_id,action,target,outcome,detail)
      VALUES('e1470472-ddc7-41fa-8084-563b67b8f60d',qa_owner,'demo.synthetic_ledger_fixture_created','d9c2340e-845e-4eec-84bd-b9316386f0af','success',
        jsonb_build_object('syntheticOnly',true,'authorisation','User requested synthetic demo data for hosted cross-branch ledger test, 21 Nov 2026','retained',true,'amountKobo',1,'existingRowsBeforeMd5',before_rows,'noExternalTransaction',true));
  END IF;
  FOREACH table_name IN ARRAY ARRAY['branches','users','orders','verified_payments','wallet_entries','credit_requests','inventory','gas_stock','settings'] LOOP
    EXECUTE format('SELECT md5(COALESCE(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text)::text,''[]'')) FROM %I t WHERE %s',table_name,predicate) INTO fingerprint;
    IF fingerprint IS DISTINCT FROM before_rows->>table_name THEN
      RAISE EXCEPTION 'Existing % rows changed; entire fixture must roll back',table_name;
    END IF;
  END LOOP;
  IF EXISTS(SELECT 1 FROM settings WHERE scope='qa-ledger-cross-branch') OR
     EXISTS(SELECT 1 FROM inventory WHERE branch_id='qa-ledger-cross-branch') THEN
    RAISE EXCEPTION 'Synthetic branch must have no selling configuration or stock';
  END IF;
END $qa$;
COMMIT;
SELECT b.id AS branch,b.active AS branch_active,u.active AS customer_active,o.status AS order_status,p.reference,p.amount_kobo,p.method,
 (SELECT count(*) FROM easygas_private.verified_payments) AS payment_count,
 (SELECT detail->>'syntheticOnly' FROM easygas_private.audit_events WHERE id='e1470472-ddc7-41fa-8084-563b67b8f60d') AS synthetic_audit
 FROM easygas_private.branches b JOIN easygas_private.users u ON u.branch_id=b.id JOIN easygas_private.orders o ON o.customer_id=u.id JOIN easygas_private.verified_payments p ON p.order_id=o.id
 WHERE p.id='d9c2340e-845e-4eec-84bd-b9316386f0af';
