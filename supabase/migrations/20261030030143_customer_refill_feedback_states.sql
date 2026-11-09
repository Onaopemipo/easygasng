BEGIN;
SET LOCAL search_path TO easygas_private,pg_catalog;
-- Add customer self-report and snooze states without changing verified history.
ALTER TABLE consumption_feedback DROP CONSTRAINT consumption_feedback_state_check;
ALTER TABLE consumption_feedback ADD CONSTRAINT consumption_feedback_state_check CHECK(state IN ('still_available','low','empty','already_refilled','remind_later'));
INSERT INTO schema_migrations(version) VALUES ('032') ON CONFLICT DO NOTHING;
COMMIT;
