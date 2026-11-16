-- Optional delivery contact. Phone sign-in and verification continue to use contact_phone.
ALTER TABLE users ADD COLUMN delivery_phone text
  CHECK (delivery_phone IS NULL OR delivery_phone ~ '^\+234[789][01][0-9]{8}$');
