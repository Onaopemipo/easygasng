BEGIN;
SET LOCAL search_path=easygas_private,pg_catalog;
ALTER TABLE media_assets ADD COLUMN testimonial_id text REFERENCES customer_testimonials(id);
ALTER TABLE media_assets DROP CONSTRAINT media_target;
ALTER TABLE media_assets ADD CONSTRAINT media_target CHECK(num_nonnulls(product_id,booking_id,service_id,testimonial_id)=1 AND (service_id IS NULL OR branch_id IS NOT NULL));
ALTER TABLE testimonial_versions ADD COLUMN image_id text REFERENCES media_assets(id);
ALTER TABLE testimonial_versions ADD COLUMN photo_consent boolean NOT NULL DEFAULT false;
ALTER TABLE testimonial_versions ADD CONSTRAINT testimonial_photo_consent CHECK(image_id IS NULL OR (photo_consent AND consent));
UPDATE setting_definitions SET description='Explicit text and photo consent, eligibility and moderation are mandatory. Photo publication is revalidated on every request and withdrawn images are never publicly cached.' WHERE key='testimonials.policy';

INSERT INTO schema_migrations(version) VALUES ('036');
COMMIT;
