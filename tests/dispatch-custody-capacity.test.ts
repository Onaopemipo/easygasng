import test from "node:test";
import assert from "node:assert/strict";
import { bulkFixture } from "./helpers/bulk-lpg-fixture";
import { vehicleReady } from "../apps/web/lib/fleet-constraints";
import { id } from "../apps/web/lib/auth";
test("DISP-CUSTODY01: dispatch recommendation and final backend guard include unallocated physical vehicle LPG", async () => {
  const env = { ...process.env };
  const f = await bulkFixture();
  try {
    await f.issue({ grams: 20000 });
    // Current order has 6kg; the other14kg is physically held buffer, not spare vehicle capacity.
    const next = await f.make();
    await f.db.query(
      "INSERT INTO order_gas_lines(id,order_id,capacity_grams,grams,unit_price_kobo,subtotal_kobo,pricing_version) VALUES($1,$2,6000,6000,180000,1080000,1)",
      [id(), next.id],
    );
    await f.db.query("UPDATE orders SET status='preparing' WHERE id=$1", [
      next.id,
    ]);
    const board = await f.call("owner", "dispatch.board");
    const candidate = board.orders
      .find((o: any) => o.id === next.id)
      .recommendations.find((r: any) => r.driverId === f.actors.driver.id);
    assert.equal(candidate.supplementaryCustodyGrams, 14000);
    assert.equal(candidate.remainingGrams, 0);
    assert.equal(candidate.eligible, false);
    await assert.rejects(
      () =>
        f.db.transaction((tx) =>
          vehicleReady(tx, f.actors.driver.id, next.id, "lagos"),
        ),
      /capacity exceeded/,
    );
    await f.db.transaction((tx) =>
      vehicleReady(tx, f.actors.driver.id, f.order.id, "lagos"),
    ); // Existing original allocation is not counted twice.
  } finally {
    process.env = env;
    await f.db.close?.();
  }
});
