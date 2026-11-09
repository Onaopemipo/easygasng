import test from "node:test";
import assert from "node:assert/strict";
import { doorstepFixture } from "./helpers/doorstep-fixture";
import { id } from "../apps/web/lib/auth";
async function fixture() {
  const f = await doorstepFixture();
  await f.db.query(
    "UPDATE driver_vehicles SET physical_capacity_grams=20000 WHERE id=$1",
    [f.vehicle.id],
  );
  await f.call("owner", "technician.qualify", {
    userId: f.actors.inventory.id,
    code: "inventory_safety",
    evidence: "Synthetic independently verified inventory safety",
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  });
  const run = (role: string, action: string, data: any) =>
    f.call(role, action, { ...data, operationKey: id() });
  return { ...f, run };
}
const restore = (env: NodeJS.ProcessEnv) => {
  for (const k of ["EASYGAS_DOORSTEP_ENABLED", "EASYGAS_BULK_LPG_ENABLED"])
    if (env[k] === undefined) delete process.env[k];
    else process.env[k] = env[k];
};
test("MANIFEST-01: qualified issue, independent exact receipt and measured capacity protect canonical branch inventory", async () => {
  const env = { ...process.env },
    f = await fixture();
  try {
    const input = {
      tripId: f.trip.id,
      productId: "hose",
      quantity: 3,
      unitWeightGrams: 500,
      evidence: "Synthetic weighed stock and manifest",
      reason: "Synthetic measured vehicle supplementary stock",
    };
    await assert.rejects(
      () => f.run("driver", "manifest.issue", input),
      /permission/,
    );
    await assert.rejects(
      () =>
        f.run("inventory", "manifest.issue", {
          ...input,
          unitWeightGrams: 10000,
        }),
      /capacity/,
    );
    const load = await f.run("inventory", "manifest.issue", input);
    assert.equal(
      Number(
        (
          await f.db.query(
            "SELECT reserved FROM inventory WHERE branch_id='lagos' AND product_id='hose'",
          )
        ).rows[0].reserved,
      ),
      4,
    );
    await assert.rejects(
      () =>
        f.run("inventory", "manifest.acknowledge", {
          manifestId: load.id,
          version: 1,
          quantity: 3,
          serialIds: [],
          evidence: input.evidence,
          reason: input.reason,
        }),
      /permission/,
    );
    await f.run("driver", "manifest.acknowledge", {
      manifestId: load.id,
      version: 1,
      quantity: 3,
      serialIds: [],
      evidence: input.evidence,
      reason: input.reason,
    });
    await f.run("driver", "manifest.return.declare", {
      manifestId: load.id,
      version: 2,
      quantity: 3,
      serialIds: [],
      evidence: input.evidence,
      reason: input.reason,
    });
    await f.run("inventory", "manifest.return.receive", {
      manifestId: load.id,
      version: 3,
      foundQuantity: 3,
      saleableQuantity: 3,
      foundSerialIds: [],
      saleableSerialIds: [],
      evidence: input.evidence,
      reason: input.reason,
    });
    const stock = (
      await f.db.query(
        "SELECT quantity,reserved FROM inventory WHERE branch_id='lagos' AND product_id='hose'",
      )
    ).rows[0];
    assert.equal(Number(stock.quantity), 50);
    assert.equal(Number(stock.reserved), 1);
    await assert.rejects(
      () =>
        f.db.query("UPDATE vehicle_product_loads SET available=1 WHERE id=$1", [
          load.id,
        ]),
      /immutable/,
    );
  } finally {
    await f.db.close?.();
    restore(env);
  }
});
test("MANIFEST-02: loss/quarantine remains held until exact independent owner and finance recovery; no fabricated cost", async () => {
  const env = { ...process.env },
    f = await fixture();
  try {
    const common = {
      evidence: "Synthetic verified return count and evidence",
      reason: "Synthetic vehicle return discrepancy review",
    };
    const load = await f.run("inventory", "manifest.issue", {
      tripId: f.trip.id,
      productId: "hose",
      quantity: 3,
      unitWeightGrams: 500,
      ...common,
    });
    const ack = await f.run("driver", "manifest.acknowledge", {
      manifestId: load.id,
      version: 1,
      quantity: 2,
      serialIds: [],
      ...common,
    });
    assert.equal(ack.held, true);
    await f.run("driver", "manifest.return.declare", {
      manifestId: load.id,
      version: 2,
      quantity: 2,
      serialIds: [],
      ...common,
    });
    const returned = {
      manifestId: load.id,
      version: 3,
      foundQuantity: 2,
      saleableQuantity: 1,
      foundSerialIds: [],
      saleableSerialIds: [],
      ...common,
    };
    await assert.rejects(
      () => f.run("inventory", "manifest.return.receive", returned),
      /owner and finance/,
    );
    const review = await f.run("inventory", "manifest.return.review", returned);
    await f.call("owner", "approval.decide", {
      id: review.id,
      decision: "approve",
      reason: "Independent synthetic physical loss review",
    });
    await assert.rejects(
      () => f.run("inventory", "manifest.return.receive", returned),
      /owner and finance/,
    );
    await f.db.query("UPDATE users SET role='finance' WHERE id=$1", [
      f.actors.commercial.id,
    ]);
    await f.db.query("UPDATE sessions SET verified_at=now() WHERE user_id=$1", [
      f.actors.commercial.id,
    ]);
    await f.call("commercial", "approval.decide", {
      id: review.id,
      decision: "approve",
      reason: "Independent synthetic finance loss review",
    });
    await f.run("inventory", "manifest.return.receive", returned);
    const stock = (
      await f.db.query(
        "SELECT quantity,reserved FROM inventory WHERE branch_id='lagos' AND product_id='hose'",
      )
    ).rows[0];
    assert.equal(Number(stock.quantity), 48);
    assert.equal(Number(stock.reserved), 1);
    const hold = (
      await f.db.query("SELECT quantity FROM stock_holds WHERE reference=$1", [
        `manifest:${load.id}:quarantine`,
      ])
    ).rows[0];
    assert.equal(Number(hold.quantity), 1);
    assert.equal(
      Number(
        (
          await f.db.query(
            "SELECT sum(quantity) n FROM stock_movements WHERE reference IN ($1,$2)",
            [
              `manifest:${load.id}:vehicle_loss`,
              `manifest:${load.id}:quarantine`,
            ],
          )
        ).rows[0].n,
      ),
      -2,
    );
  } finally {
    await f.db.close?.();
    restore(env);
  }
});

test("MANIFEST-03: inactive-driver custody needs exact independent recovery approval even when all stock is found", async () => {
  const env = { ...process.env },
    f = await fixture();
  try {
    const common = {
      evidence: "Synthetic independently counted vehicle stock",
      reason: "Synthetic deactivated driver custody recovery",
    };
    const load = await f.run("inventory", "manifest.issue", {
      tripId: f.trip.id,
      productId: "hose",
      quantity: 2,
      unitWeightGrams: 500,
      ...common,
    });
    const returned = {
      manifestId: load.id,
      version: 1,
      foundQuantity: 2,
      saleableQuantity: 2,
      foundSerialIds: [],
      saleableSerialIds: [],
      ...common,
    };
    await assert.rejects(
      () => f.run("inventory", "manifest.return.review", returned),
      /declared return/,
    );
    await f.db.query("UPDATE users SET active=false WHERE id=$1", [
      f.actors.driver.id,
    ]);
    await assert.rejects(
      () => f.run("inventory", "manifest.return.receive", returned),
      /owner and finance/,
    );
    const review = await f.run("inventory", "manifest.return.review", returned);
    await f.call("owner", "approval.decide", {
      id: review.id,
      decision: "approve",
      reason: common.reason,
    });
    await assert.rejects(
      () => f.run("inventory", "manifest.return.receive", returned),
      /owner and finance/,
    );
    await f.db.query("UPDATE users SET role='finance' WHERE id=$1", [
      f.actors.commercial.id,
    ]);
    await f.db.query("UPDATE sessions SET verified_at=now() WHERE user_id=$1", [
      f.actors.commercial.id,
    ]);
    await f.call("commercial", "approval.decide", {
      id: review.id,
      decision: "approve",
      reason: common.reason,
    });
    await assert.rejects(
      () =>
        f.run("inventory", "manifest.return.receive", {
          ...returned,
          saleableQuantity: 1,
        }),
      /owner and finance/,
    );
    const key = id();
    await f.call("inventory", "manifest.return.receive", {
      ...returned,
      operationKey: key,
    });
    await f.call("inventory", "manifest.return.receive", {
      ...returned,
      operationKey: key,
    });
    const stock = (
      await f.db.query(
        "SELECT quantity,reserved FROM inventory WHERE branch_id='lagos' AND product_id='hose'",
      )
    ).rows[0];
    assert.equal(Number(stock.quantity), 50);
    assert.equal(Number(stock.reserved), 1);
    assert.equal(
      (
        await f.db.query(
          "SELECT state FROM vehicle_product_loads WHERE id=$1",
          [load.id],
        )
      ).rows[0].state,
      "reconciled",
    );
    assert.equal(
      (
        await f.db.query(
          "SELECT id FROM vehicle_product_events WHERE load_id=$1 AND kind='manifest.return_received'",
          [load.id],
        )
      ).rows.length,
      1,
    );
  } finally {
    await f.db.close?.();
    restore(env);
  }
});
