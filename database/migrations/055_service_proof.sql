ALTER TABLE service_bookings ADD COLUMN work_started_at timestamptz;
ALTER TABLE media_assets ADD COLUMN service_photo_consent boolean NOT NULL DEFAULT false;
ALTER TABLE media_assets ADD COLUMN service_retain_until timestamptz;
ALTER TABLE media_assets ADD COLUMN service_sha256 text;
CREATE UNIQUE INDEX service_proof_content_once ON media_assets(booking_id,owner_id,service_sha256) WHERE booking_id IS NOT NULL AND service_sha256 IS NOT NULL;
