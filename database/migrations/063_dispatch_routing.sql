-- Route planning evidence only: does not alter orders, delivery charges or inventory.
CREATE TABLE dispatch_destinations (
 id text PRIMARY KEY, order_id text NOT NULL REFERENCES orders(id), branch_id text NOT NULL REFERENCES branches(id),
 revision integer NOT NULL CHECK(revision>0), address_hash text NOT NULL, latitude double precision NOT NULL CHECK(latitude BETWEEN -90 AND 90), longitude double precision NOT NULL CHECK(longitude BETWEEN -180 AND 180),
 evidence text NOT NULL, confirmed_by text NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(order_id,revision)
);
CREATE TABLE dispatch_route_estimates (
 id text PRIMARY KEY, order_id text NOT NULL REFERENCES orders(id), driver_id text NOT NULL REFERENCES users(id), branch_id text NOT NULL REFERENCES branches(id),
 trip_id text NOT NULL REFERENCES driver_trips(id), context_hash text NOT NULL, policy_version integer NOT NULL,
 provider text NOT NULL, metres double precision NOT NULL CHECK(metres>=0), seconds double precision NOT NULL CHECK(seconds>=0), operating_kobo bigint NOT NULL CHECK(operating_kobo>=0),
 plan jsonb NOT NULL, expires_at timestamptz NOT NULL, created_by text NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX dispatch_route_current ON dispatch_route_estimates(order_id,driver_id,created_at DESC);
CREATE TRIGGER dispatch_destination_immutable BEFORE UPDATE OR DELETE ON dispatch_destinations FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();
CREATE TRIGGER dispatch_route_immutable BEFORE UPDATE OR DELETE ON dispatch_route_estimates FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();
ALTER TABLE dispatch_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_destinations FORCE ROW LEVEL SECURITY;
ALTER TABLE dispatch_route_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_route_estimates FORCE ROW LEVEL SECURITY;
REVOKE ALL ON dispatch_destinations,dispatch_route_estimates FROM PUBLIC;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='easygas_server') THEN
 GRANT SELECT,INSERT ON dispatch_destinations,dispatch_route_estimates TO easygas_server;
 CREATE POLICY trusted_server ON dispatch_destinations TO easygas_server USING(true) WITH CHECK(true);
 CREATE POLICY trusted_server ON dispatch_route_estimates TO easygas_server USING(true) WITH CHECK(true);
END IF; END $$;
INSERT INTO setting_definitions(key,label,category,description,owner_role,risk,value_type,propose_roles,approve_roles,view_roles,required_roles,additional_verification)
VALUES('dispatch.routing','Road routing and operating-cost policy','Delivery','Independently approved route-planning rates and stop allowance. Estimates never change customer fees. Default disabled.','owner',3,'dispatch_routing','["owner","manager","dispatcher"]','["owner","finance"]','["owner","manager","dispatcher","finance"]','["finance"]',true);
INSERT INTO settings(key,scope,value) SELECT 'dispatch.routing',id,'{"enabled":false,"fuelKoboPerLitre":null,"operatingKoboPerKm":null,"stopMinutes":null,"maxSnapMetres":null}'::jsonb FROM branches;
