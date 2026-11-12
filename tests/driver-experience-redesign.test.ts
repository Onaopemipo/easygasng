import assert from "node:assert/strict";
import test from "node:test";
import { id } from "../apps/web/lib/auth";
import { fixture } from "./helpers/order-tracking-fixture";
import { assignmentLabel, driverNavigation } from "../packages/business-rules/src/driver-experience";

test("DRV-T46–55: closed history is scoped, chronologically paged and filtered in Lagos without exposing customer data", async () => {
  const f = await fixture();
  try {
    await assert.rejects(() => f.call("driver", "driver.history"), /delivery-only/);
    await f.call("driver", "driver.restrict");
    await assert.rejects(() => f.call("customer", "driver.history"), /permission/);
    await assert.rejects(() => f.call("driver", "driver.history", { driverId: f.actors.owner.id }), /Unrecognized/);
    await assert.rejects(() => f.call("driver", "driver.history", { from: "2026-11-11", to: "2026-11-10" }), /end date/);
    const order = await f.assigned();
    const current = await f.call("driver", "driver.history");
    assert.deepEqual(current.rows, []);
    assert.equal((await f.call("driver", "orders", { active: "1" })).length, 1);
    const open = (await f.call("driver", "driver.snapshot")).metrics;
    assert.deepEqual(open, { newAssignments: 1, inProgress: 0, completedToday: 0 });

    const older = await f.make();
    await f.db.query(
      `INSERT INTO delivery_attempts(id,order_id,driver_id,state,completed_at,assignment_version)
       SELECT 'fixture-history-' || n,$1,$2,CASE WHEN n=21 THEN 'delivered' ELSE 'failed' END,
              TIMESTAMPTZ '2026-11-10T23:30:00Z' + n * interval '1 second',n
       FROM generate_series(1,21) n`,
      [older.id, f.actors.driver.id],
    );
    await f.db.query(
      "INSERT INTO delivery_attempts(id,order_id,driver_id,state,completed_at,assignment_version) VALUES($1,$2,$3,'failed',now(),22)",
      [id(), older.id, f.actors.dispatcher.id],
    );
    const query = { from: "2026-11-11", to: "2026-11-11" };
    const first = await f.call("driver", "driver.history", query);
    const last = await f.call("driver", "driver.history", { ...query, page: "2" });
    assert.equal(first.total, 21);
    assert.equal(first.delivered, 1);
    assert.equal(first.rows.length, 20);
    assert.equal(last.rows.length, 1);
    assert.equal(new Set([...first.rows, ...last.rows].map((r) => r.id)).size, 21);
    assert.equal(first.rows[0].outcome, "delivered");
    assert.equal(first.rows[0].has_proof, false);
    assert.ok(first.rows.every((r: any) => !("address" in r) && !("customer_name" in r)));
    const failed = await f.call("driver", "driver.history", { ...query, outcome: "failed" });
    assert.equal(failed.total, 20);
    assert.equal(failed.delivered, 1);

    await f.call("driver", "dispatch.respond", {
      orderId: order.id, version: order.tracking_version, decision: "rejected",
      reason: "Declined synthetic assignment for history", operationKey: id(),
    });
    assert.equal((await f.call("driver", "orders", { active: "1" })).length, 0);
    assert.equal((await f.call("driver", "driver.history", { outcome: "declined" })).rows[0].order_id, order.id);
    await f.db.query("UPDATE branches SET active=false WHERE id='lagos'");
    await assert.rejects(() => f.call("driver", "driver.history"), /active.*branch/);
  } finally {
    await f.db.close?.();
  }
});

test("DRV-T42–43: directions require verified coordinates and status wording follows the attempt", async () => {
  const f = await fixture();
  try {
    const order = await f.assigned();
    await f.call("driver", "driver.restrict");
    const lookup = () => f.call("driver", "orders", { active: "1", id: order.id });
    assert.equal(driverNavigation((await lookup())[0].destination), null);
    await f.call("owner", "reauth", { password: "Tracking-fixture-only-123!" });
    await f.call("owner", "dispatch.destination.confirm", {
      orderId: order.id, version: order.tracking_version, revision: 0, operationKey: id(),
      latitude: 6.44, longitude: 3.48, evidence: "Confirmed synthetic test pin",
    });
    assert.match(driverNavigation((await lookup())[0].destination) ?? "", /6.44%2C3.48$/);
    await f.db.query("UPDATE orders SET address=jsonb_set(address,'{street}','\"Changed synthetic street\"') WHERE id=$1", [order.id]);
    assert.equal(driverNavigation((await lookup())[0].destination), null);
    assert.equal(driverNavigation({ latitude: 900, longitude: 0 }), null);
    assert.equal(assignmentLabel("assigned", "assigned", "acknowledged"), "Awaiting pickup");
    assert.equal(assignmentLabel("out_for_delivery", "arrived"), "At destination");
  } finally {
    await f.db.close?.();
  }
});
