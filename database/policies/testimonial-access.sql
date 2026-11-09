ALTER TABLE easygas_private.customer_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE easygas_private.testimonial_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE easygas_private.testimonial_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY trusted_server ON easygas_private.customer_testimonials TO easygas_server USING(true) WITH CHECK(true);
CREATE POLICY trusted_server ON easygas_private.testimonial_versions TO easygas_server USING(true) WITH CHECK(true);
CREATE POLICY trusted_server ON easygas_private.testimonial_events TO easygas_server USING(true) WITH CHECK(true);
GRANT SELECT,INSERT ON easygas_private.customer_testimonials,easygas_private.testimonial_versions,easygas_private.testimonial_events TO easygas_server;
GRANT UPDATE(status,revision,current_version,reviewed_version,updated_at,published_at) ON easygas_private.customer_testimonials TO easygas_server;
DO $$ DECLARE role_name text; BEGIN
 FOREACH role_name IN ARRAY ARRAY['anon','authenticated'] LOOP
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname=role_name) THEN
 EXECUTE format('REVOKE ALL ON easygas_private.customer_testimonials,easygas_private.testimonial_versions,easygas_private.testimonial_events FROM %I',role_name);
 END IF;
 END LOOP;
END $$;
