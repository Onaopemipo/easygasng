-- Destructive rollback is restricted to an empty installation. Back up before running.
DO $$ BEGIN IF EXISTS(SELECT 1 FROM orders) OR EXISTS(SELECT 1 FROM users) THEN RAISE EXCEPTION 'Rollback refused: business records exist'; END IF; END $$;
DROP TABLE cylinder_events,cylinders,support_requests,refill_schedules,reward_entries,wallet_entries,verified_payments,cash_collections,order_events,order_items,orders,notifications,audit_events,setting_versions,approval_decisions,change_requests,settings,setting_definitions,stock_movements,inventory,products,auth_attempts,sessions,users,branches,schema_migrations;
DROP FUNCTION prevent_record_mutation();
