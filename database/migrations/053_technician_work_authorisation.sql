-- Assessment and chargeable work remain phases of the canonical booking.
ALTER TABLE service_bookings ADD COLUMN work_phase text NOT NULL DEFAULT 'assessment' CHECK(work_phase IN ('assessment','authorised','paused'));
ALTER TABLE service_bookings ADD COLUMN work_quote_id text REFERENCES service_quotes(id);
ALTER TABLE users ADD COLUMN technician_available boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN technician_availability_updated_at timestamptz;
