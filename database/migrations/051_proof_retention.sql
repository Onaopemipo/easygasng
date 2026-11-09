-- Preserve immutable evidence metadata and hash. Only expired image bytes may be purged.
CREATE FUNCTION preserve_delivery_photo() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='UPDATE' AND OLD.retain_until<=now() AND octet_length(OLD.data)>0 AND octet_length(NEW.data)=0 AND (to_jsonb(NEW)-'data')=(to_jsonb(OLD)-'data') THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'Delivery photo history is immutable; only expired image bytes may be purged';
END $$;
DROP TRIGGER delivery_photos_immutable ON delivery_photos;
CREATE TRIGGER delivery_photos_immutable BEFORE UPDATE OR DELETE ON delivery_photos FOR EACH ROW EXECUTE FUNCTION preserve_delivery_photo();
CREATE INDEX delivery_photo_expiration ON delivery_photos(retain_until) WHERE octet_length(data)>0;
