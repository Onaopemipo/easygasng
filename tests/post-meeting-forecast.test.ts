import test from "node:test";
import assert from "node:assert/strict";
import { forecast } from "../packages/business-rules/src/forecast";
test("PM-T34: two or three verified refills produce preliminary low-confidence purchase estimates without false sensors", () => {
  const r = ["2026-01-01", "2026-02-01", "2026-03-01"].map((date) => ({
    date,
    kg: 6,
    verified: true,
    cylinderId: "c",
  }));
  for (const n of [2, 3]) {
    const f = forecast(r.slice(0, n), "c", new Date("2026-03-02"));
    assert.equal(f.available, true);
    assert.equal(f.confidence, "low");
    assert.equal(f.preliminary, true);
    assert.match(f.reason, /not a sensor/);
  }
  assert.equal(
    forecast(r.slice(0, 1), "c", new Date("2026-03-02")).available,
    false,
  );
  assert.equal(
    forecast(
      r.map((x) => ({ ...x, verified: false })),
      "c",
    ).available,
    false,
  );
  assert.equal(forecast(r, "other").available, false);
  assert.equal(
    forecast(
      [
        { ...r[0], date: "2026-01-01" },
        { ...r[1], date: "2026-01-02" },
      ],
      "c",
    ).available,
    false,
  );
});
