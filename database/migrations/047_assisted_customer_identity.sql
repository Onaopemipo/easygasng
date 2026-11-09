-- Additive identity and assisted-order attribution; no invented customers or contact data.
ALTER TABLE users ADD COLUMN public_customer_id text;
ALTER TABLE users ADD COLUMN contact_phone text;
ALTER TABLE users ADD COLUMN phone_verified_at timestamptz;
ALTER TABLE users ADD COLUMN onboarding_version integer NOT NULL DEFAULT 0 CHECK(onboarding_version>=0);
ALTER TABLE users ADD COLUMN provisional boolean NOT NULL DEFAULT false;
UPDATE users SET public_customer_id='EGC-'||upper(replace(gen_random_uuid()::text,'-','')) WHERE role IN ('customer','commercial');
CREATE UNIQUE INDEX users_public_customer_id_unique ON users(public_customer_id) WHERE public_customer_id IS NOT NULL;
CREATE INDEX users_contact_phone_lookup ON users(contact_phone) WHERE contact_phone IS NOT NULL;
ALTER TABLE users ADD CONSTRAINT users_contact_phone_format CHECK(contact_phone IS NULL OR contact_phone ~ '^\+234[789][01][0-9]{8}$');
CREATE FUNCTION customer_public_identity_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='UPDATE' AND OLD.public_customer_id IS NOT NULL AND NEW.public_customer_id IS DISTINCT FROM OLD.public_customer_id THEN RAISE EXCEPTION 'Public customer identity is immutable'; END IF;
 IF NEW.role IN ('customer','commercial') AND NEW.public_customer_id IS NULL THEN NEW.public_customer_id='EGC-'||upper(replace(gen_random_uuid()::text,'-','')); END IF;
 IF TG_OP='UPDATE' AND NEW.contact_phone IS DISTINCT FROM OLD.contact_phone THEN NEW.phone_verified_at=NULL; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER customer_public_identity_guard BEFORE INSERT OR UPDATE ON users FOR EACH ROW EXECUTE FUNCTION customer_public_identity_guard();
ALTER TABLE orders ADD COLUMN order_source text NOT NULL DEFAULT 'LEGACY' CHECK(order_source IN ('LEGACY','WEB','MOBILE','PHONE_ASSISTED'));
ALTER TABLE orders ADD COLUMN assisted_by text REFERENCES users(id);
ALTER TABLE orders ADD COLUMN assisted_reason text;
ALTER TABLE orders ADD CONSTRAINT assisted_attribution_required CHECK((order_source='PHONE_ASSISTED' AND assisted_by IS NOT NULL AND length(assisted_reason)>=10) OR (order_source<>'PHONE_ASSISTED' AND assisted_by IS NULL));
CREATE FUNCTION preserve_assisted_attribution() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF (NEW.order_source,NEW.assisted_by,NEW.assisted_reason) IS DISTINCT FROM (OLD.order_source,OLD.assisted_by,OLD.assisted_reason) THEN RAISE EXCEPTION 'Order source attribution is immutable'; END IF;
 RETURN NEW;
END $$;
-- Attribution is set in the original INSERT, never patched over an issued order.
CREATE TRIGGER preserve_assisted_attribution BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION preserve_assisted_attribution();
CREATE INDEX account_addresses_normalised_phone_lookup ON account_addresses ((regexp_replace(phone,'[^0-9]','','g'))) WHERE archived=false;
