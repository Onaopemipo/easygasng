-- Private, server-only tables. Public/mobile access stays behind the authoritative API.
DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['delivery_locations','gas_stock','gas_stock_movements','order_gas_lines'] LOOP
  EXECUTE format('ALTER TABLE easygas_private.%I ENABLE ROW LEVEL SECURITY',tab);
  EXECUTE format('CREATE POLICY trusted_server ON easygas_private.%I TO easygas_server USING(true) WITH CHECK(true)',tab);
  EXECUTE format('GRANT SELECT,INSERT ON easygas_private.%I TO easygas_server',tab);
 END LOOP;
END $$;
GRANT UPDATE(name,city,state,country,active,visible,archived,display_order,coverage,description,version,updated_at) ON easygas_private.delivery_locations TO easygas_server;
GRANT UPDATE(grams,reserved_grams) ON easygas_private.gas_stock TO easygas_server;
GRANT UPDATE(cylinder_id,inspected_by,inspection_note,inspected_at,allowable_grams) ON easygas_private.order_gas_lines TO easygas_server;
GRANT UPDATE(risk,policy_snapshot,requester_role,submitted_at,activated_at,failure_reason,activation_attempts,proposed_value,reason,revision,base_version,previous_value,effective_at) ON easygas_private.change_requests TO easygas_server;
GRANT UPDATE(location_id,location_snapshot,pricing_snapshot,operational_review) ON easygas_private.orders TO easygas_server;
GRANT UPDATE(location_id,details) ON easygas_private.account_addresses TO easygas_server;
REVOKE UPDATE ON easygas_private.gas_stock_movements FROM easygas_server;

GRANT UPDATE(pricing_snapshot) ON easygas_private.recurring_authorisations TO easygas_server;

GRANT UPDATE(is_default) ON easygas_private.account_addresses TO easygas_server;
