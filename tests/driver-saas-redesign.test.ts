import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import {
  driverMetric,
  driverInitials,
  driverContactLabel,
  driverNextAssignment,
  driverNextAction,
  driverAssignmentSummary,
} from "../packages/business-rules/src/driver-presentation";
import { fixture } from "./helpers/order-tracking-fixture";

test("DRVS-DATA: counts distinguish authoritative zero from missing, malformed or stale data", () => {
  assert.equal(driverMetric(0), "0");
  assert.equal(driverMetric(21), "21");
  for (const n of [
    undefined,
    null,
    "0",
    NaN,
    Infinity,
    -1,
    1.5,
    Number.MAX_SAFE_INTEGER + 1,
  ])
    assert.equal(driverMetric(n), "Unavailable");
  assert.equal(driverMetric(21, false), "Unavailable");
  assert.equal(driverInitials("  Adé   Olú  "), "AO");
  assert.equal(driverInitials(null), "D");
});
test("DRVS-CONTACT: foreground freshness cannot imply availability, GPS or trip consent", () => {
  const now = Date.parse("2026-11-18T12:00:00Z");
  assert.equal(driverContactLabel(null, now), "Foreground contact unknown");
  assert.equal(
    driverContactLabel("not-a-date", now),
    "Foreground contact unknown",
  );
  assert.equal(
    driverContactLabel("2026-11-18T12:00:01Z", now),
    "Foreground contact unknown",
  );
  assert.equal(
    driverContactLabel("2026-11-18T11:58:30Z", now),
    "Stale foreground contact",
  );
  assert.equal(
    driverContactLabel("2026-11-18T11:59:00Z", now),
    "Recent foreground contact",
  );
});
test("DRVS-NEXT: the next card only selects current assigned attempts, prioritises active handover and never mutates the source", () => {
  const row = (id: string, status = "assigned", state = "assigned") => ({
    id,
    status,
    attempt: { state },
    delivery_date: "2026-11-20",
  });
  const rows = [
    row("z"),
    row("rejected"),
    row("closed", "delivered", "delivered"),
    row("picked", "assigned", "picked_up"),
    row("road", "out_for_delivery", "picked_up"),
    row("arrival", "out_for_delivery", "arrived"),
  ];
  assert.deepEqual(
    driverAssignmentSummary({ gas_lines: [{ grams: null }, { grams: "" }] }),
    ["Gas quantity unavailable", "Gas quantity unavailable"],
  );
  const before = JSON.stringify(rows),
    responses = [{ order_id: "rejected", decision: "rejected" }];
  assert.equal(driverNextAssignment(rows, responses)?.id, "arrival");
  assert.equal(JSON.stringify(rows), before);
  assert.equal(
    driverNextAssignment([
      row("closed", "delivered", "delivered"),
      row("bad", "assigned", "failed"),
    ]),
    null,
  );
  assert.equal(driverNextAction(row("new")), "Review assignment");
  assert.equal(
    driverNextAction(row("ack"), "acknowledged"),
    "Review pickup requirements",
  );
  assert.equal(
    driverNextAction(row("arrival", "out_for_delivery", "arrived")),
    "Review handover requirements",
  );
  assert.deepEqual(
    driverAssignmentSummary({
      items: [{ name: "Hose", quantity: 2 }],
      gas_lines: [{ grams: 6000, capacity_grams: 12500 }],
    }),
    ["2 × Hose", "6 kg gas · 12.5 kg cylinder"],
  );
});
test("DRVS-SCOPE: current attempt removal and branch revocation stay authoritative, and history never gains customer contacts", async () => {
  const f = await fixture();
  try {
    const o = await f.assigned();
    await f.call("driver", "driver.restrict");
    assert.equal(
      (await f.call("driver", "orders", { active: "1" }))[0].id,
      o.id,
    );
    const history = await f.call("driver", "driver.history");
    assert.equal(history.total, 0);
    await f.db.query("UPDATE orders SET driver_id=$1 WHERE id=$2", [
      f.actors.owner.id,
      o.id,
    ]);
    assert.deepEqual(
      await f.call("driver", "orders", { active: "1", id: o.id }),
      [],
    );
    await assert.rejects(
      () =>
        f.call("driver", "driver.history", {
          customerId: f.actors.customer.id,
        }),
      /Unrecognized/,
    );
    await f.db.query("UPDATE branches SET active=false WHERE id='lagos'");
    await assert.rejects(() => f.call("driver", "driver.snapshot"), /branch/);
    await assert.rejects(() => f.call("driver", "driver.history"), /branch/);
  } finally {
    await f.db.close?.();
  }
});
test("DRVS-PRESERVED: this presentation phase leaves canonical finance, permissions, custody, GPS and proof implementations unchanged", async () => {
  const rows = JSON.parse(
    await readFile(
      "docs/driver-saas-redesign/protected-business-sources.json",
      "utf8",
    ),
  );
  for (const [file, hash] of Object.entries(rows))
    assert.equal(
      createHash("sha256")
        .update(await readFile(file))
        .digest("hex"),
      hash,
      file,
    );
});

