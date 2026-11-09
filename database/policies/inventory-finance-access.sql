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
