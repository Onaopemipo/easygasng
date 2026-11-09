import test from "node:test";
import assert from "node:assert/strict";
import { refillFeedbackEffect } from "../packages/business-rules/src/refill-feedback";
const now = new Date("2026-10-30T12:00:00Z"),
  verified = "2026-10-01T12:00:00Z";
test("CD-N-feedback: snooze expires exactly at 24 hours and respects verified refill chronology", () => {
  const snooze = { state: "remind_later", created_at: "2026-10-29T12:00:01Z" };
  assert.equal(
    refillFeedbackEffect(snooze, verified, now).suppressReminder,
    true,
  );
  assert.equal(
    refillFeedbackEffect(
      { ...snooze, created_at: "2026-10-29T12:00:00Z" },
      verified,
      now,
    ).suppressReminder,
    false,
  );
  assert.equal(
    refillFeedbackEffect(snooze, "2026-10-30T11:00:00Z", now).suppressReminder,
    false,
  );
  assert.equal(
    refillFeedbackEffect(
      { ...snooze, created_at: "2026-10-31T12:00:00Z" },
      verified,
      now,
    ).suppressReminder,
    false,
  );
});
test("CD-N-feedback: self-report suppresses outdated estimates until a new verified purchase; later level reports cannot resurrect it", () => {
  const report = {
    state: "already_refilled",
    created_at: "2026-10-25T12:00:00Z",
  };
  assert.equal(
    refillFeedbackEffect(
      [report, { state: "low", created_at: "2026-10-29T12:00:00Z" }],
      verified,
      now,
    ).suppressPrediction,
    true,
  );
  assert.equal(
    refillFeedbackEffect(report, "2026-10-26T12:00:00Z", now)
      .suppressPrediction,
    false,
  );
  for (const state of ["still_available", "low", "empty"])
    assert.equal(
      refillFeedbackEffect(
        { state, created_at: "2026-10-29T12:00:00Z" },
        verified,
        now,
      ).suppressPrediction,
      false,
    );
});
