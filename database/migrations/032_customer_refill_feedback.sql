-- Add customer self-report and snooze states without changing verified history.
ALTER TABLE consumption_feedback DROP CONSTRAINT consumption_feedback_state_check;
ALTER TABLE consumption_feedback ADD CONSTRAINT consumption_feedback_state_check CHECK(state IN ('still_available','low','empty','already_refilled','remind_later'));
