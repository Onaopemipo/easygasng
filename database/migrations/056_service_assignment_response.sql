ALTER TABLE service_bookings ADD COLUMN assignment_response text NOT NULL DEFAULT 'pending' CHECK(assignment_response IN ('pending','acknowledged','declined'));
ALTER TABLE service_bookings ADD COLUMN assignment_response_reason text;
