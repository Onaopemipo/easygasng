-- Public consent is separate from immutable operational service feedback.
CREATE TABLE customer_testimonials (
 id text PRIMARY KEY, customer_id text NOT NULL REFERENCES users(id),
 order_id text UNIQUE REFERENCES orders(id), booking_id text UNIQUE REFERENCES service_bookings(id),
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','PENDING_REVIEW','APPROVED','PUBLISHED','REJECTED','CHANGES_REQUESTED','HIDDEN','WITHDRAWN')),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0), current_version integer NOT NULL DEFAULT 1,
 reviewed_version integer, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz,
 CHECK(num_nonnulls(order_id,booking_id)=1)
);
CREATE TABLE testimonial_versions (
 testimonial_id text NOT NULL REFERENCES customer_testimonials(id), version integer NOT NULL,
 rating integer NOT NULL CHECK(rating BETWEEN 1 AND 5), body text NOT NULL CHECK(length(body) BETWEEN 20 AND 2000),
 display_name text NOT NULL CHECK(length(display_name) BETWEEN 2 AND 60), name_style text NOT NULL CHECK(name_style IN ('first','initials','custom')),
 public_location text NOT NULL DEFAULT '', consent boolean NOT NULL DEFAULT false, consent_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(testimonial_id,version), CHECK(NOT consent OR consent_at IS NOT NULL)
);
CREATE TABLE testimonial_events (
 id text PRIMARY KEY, testimonial_id text NOT NULL REFERENCES customer_testimonials(id), actor_id text NOT NULL REFERENCES users(id),
 action text NOT NULL, from_status text, to_status text NOT NULL, revision integer NOT NULL, reason text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX testimonial_queue ON customer_testimonials(status,updated_at DESC);
CREATE INDEX testimonial_customer ON customer_testimonials(customer_id,created_at DESC);
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON testimonial_versions FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON testimonial_events FOR EACH ROW EXECUTE FUNCTION prevent_record_mutation();
ALTER TABLE customer_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonial_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonial_events ENABLE ROW LEVEL SECURITY;
INSERT INTO setting_definitions(key,label,category,description,owner_role,risk,value_type,propose_roles,approve_roles,view_roles,required_roles,additional_verification) VALUES
('testimonials.policy','Customer testimonials','Website & Testimonials','Consent and moderation are mandatory. Images remain disabled until secure private-to-public media withdrawal is implemented.','owner',3,'testimonial_policy','["owner","manager"]','["owner"]','["owner","manager"]','[]',true);
INSERT INTO settings(key,scope,value) VALUES ('testimonials.policy','lagos','{"enabled":true,"minimumLength":20,"maximumLength":2000,"publishedLimit":12,"moderationRequired":true,"imagesEnabled":false,"dailyLimit":3}');
