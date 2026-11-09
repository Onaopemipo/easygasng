import test from "node:test";
import assert from "node:assert/strict";
import {
  vehicleFixture,
  restoreVehicleEnv,
} from "./helpers/vehicle-products-fixture";
import { id, actor } from "../apps/web/lib/auth";
import { allocateCylinders } from "../apps/web/lib/cylinder-allocation";
async function proposal(
  f: Awaited<ReturnType<typeof vehicleFixture>>,
  items: { productId: string; quantity: number }[],
) {
  const o = (
    await f.db.query("SELECT tracking_version FROM orders WHERE id=$1", [
      f.order.id,
    ])
  ).rows[0];
  const m = await f.run("driver", "doorstep.products.propose", {
    orderId: f.order.id,
    version: Number(o.tracking_version),
    items,
  });
  await f.run("customer", "doorstep.consent", {
    orderId: f.order.id,
    amendmentId: m.id,
    consent: true,
  });
  const context = {
    orderId: f.order.id,
    amendmentId: m.id,
    reason: "Synthetic exact product custody and handover evidence",
  };
  const execute = (role: string, action: string, data: any = {}) =>
    f.run(role, action, { ...context, ...data });
  return { m, context, execute };
}
async function load(
  f: Awaited<ReturnType<typeof vehicleFixture>>,
  productId = "hose",
  serialIds: string[] = [],
) {
  const m = await f.run("inventory", "manifest.issue", {
    tripId: f.trip.id,
    productId,
    quantity: serialIds.length || 3,
    unitWeightGrams: serialIds.length ? 5000 : 500,
    serialIds,
    evidence: "Synthetic measured actual manifest",
    reason: "Synthetic supplementary physical stock load",
  });
  await f.run("driver", "manifest.acknowledge", {
    manifestId: m.id,
    version: 1,
    quantity: serialIds.length || 3,
    serialIds,
    evidence: "Synthetic physical count confirmed",
    reason: "Synthetic driver manifest receipt",
  });
  return m;
}
test("DOOR-PRODUCT01: acknowledged vehicle products share original consent/invoice/verified cash/code and one fee; return releases only remaining custody", async () => {
  const env = { ...process.env },
    f = await vehicleFixture();
  try {
    const manifest = await load(f);
    const p = await proposal(f, [{ productId: "hose", quantity: 2 }]);
    const allocations = [
      { productId: "hose", manifestId: manifest.id, serialIds: [] },
    ];
    await assert.rejects(
      () => p.execute("driver", "doorstep.products.prepare", { allocations }),
      /permission/,
    );
    const prepared = await p.execute("inventory", "doorstep.products.prepare", {
      allocations,
    });
    assert.equal(prepared.amountKobo, 700000);
    await assert.rejects(
      () =>
        f.run("driver", "manifest.return.declare", {
          manifestId: manifest.id,
          version: 3,
          quantity: 1,
          evidence: "Synthetic premature return",
          reason: "Cannot return reserved goods",
        }),
      /reservations/,
    );
    await f.decide(prepared.noteId);
    await p.execute("driver", "doorstep.products.collection.report", {
      amountKobo: 700000,
    });
    await assert.rejects(
      () =>
        p.execute("driver", "doorstep.products.handover", {
          code: "123456",
          handover: true,
        }),
      /settlement/,
    );
    await p.execute("owner", "doorstep.products.collection.verify");
    await assert.rejects(
      () =>
        p.execute("driver", "doorstep.products.handover", {
          code: "654321",
          handover: true,
        }),
      /incorrect/,
    );
    const input = {
      ...p.context,
      code: "123456",
      handover: true,
      operationKey: id(),
    };
    await f.call("driver", "doorstep.products.handover", input);
    await f.call("driver", "doorstep.products.handover", input);
    const stock = (
      await f.db.query(
        "SELECT quantity,reserved FROM inventory WHERE product_id='hose' AND branch_id='lagos'",
      )
    ).rows[0];
    assert.equal(Number(stock.quantity), 48);
    assert.equal(Number(stock.reserved), 2);
    const order = (
      await f.db.query("SELECT status,total_kobo FROM orders WHERE id=$1", [
        f.order.id,
      ])
    ).rows[0];
    assert.equal(order.status, "out_for_delivery");
    const invoice = await f.call("owner", "invoice.corrections", {
      orderId: f.order.id,
    });
    assert.equal(invoice.totalKobo, Number(order.total_kobo) + 700000);
    assert.equal(invoice.amountDueKobo, 0);
    await f.run("driver", "manifest.return.declare", {
      manifestId: manifest.id,
      version: 4,
      quantity: 1,
      serialIds: [],
      evidence: "Synthetic actual remaining unit",
      reason: "Synthetic remaining stock returned",
    });
    await f.run("inventory", "manifest.return.receive", {
      manifestId: manifest.id,
      version: 5,
      foundQuantity: 1,
      saleableQuantity: 1,
      foundSerialIds: [],
      saleableSerialIds: [],
      evidence: "Synthetic independent return inspection",
      reason: "Synthetic exact product return",
    });
    assert.equal(
      Number(
        (
          await f.db.query(
            "SELECT reserved FROM inventory WHERE product_id='hose' AND branch_id='lagos'",
          )
        ).rows[0].reserved,
      ),
      1,
    );
    await assert.rejects(
      () =>
        p.execute("driver", "doorstep.products.handover", {
          code: "123456",
          handover: true,
        }),
      /reserved physical/,
    );
  } finally {
    await f.db.close?.();
    restoreVehicleEnv(env);
  }
});
test("DOOR-PRODUCT02: manifested empty cylinders cannot be sold from branch and transfer exact serial ownership once on original visit", async () => {
  const env = { ...process.env },
    f = await vehicleFixture();
  try {
    const c = id();
    await f.db.query(
      "INSERT INTO cylinders(id,branch_id,serial,size_kg,ownership,status,test_due) VALUES($1,'lagos',$1,6,'company','empty',current_date+365)",
      [c],
    );
    await f.db.query(
      "UPDATE inventory SET quantity=1,published=true WHERE branch_id='lagos' AND product_id='cylinder-empty-6'",
    );
    const manifest = await load(f, "cylinder-empty-6", [c]);
    const owner = await actor(f.db, f.actors.owner.token);
    await assert.rejects(
      () =>
        allocateCylinders(
          f.db,
          owner,
          "lagos",
          [{ productId: "cylinder-empty-6", quantity: 1 }],
          { orderId: f.order.id },
        ),
      /Not enough/,
    );
    const p = await proposal(f, [
      { productId: "cylinder-empty-6", quantity: 1 },
    ]);
    const prepared = await p.execute("inventory", "doorstep.products.prepare", {
      allocations: [
        {
          productId: "cylinder-empty-6",
          manifestId: manifest.id,
          serialIds: [c],
        },
      ],
    });
    await f.decide(prepared.noteId);
    await p.execute("driver", "doorstep.products.collection.report", {
      amountKobo: prepared.amountKobo,
    });
    await p.execute("owner", "doorstep.products.collection.verify");
    await p.execute("driver", "doorstep.products.handover", {
      code: "123456",
      handover: true,
    });
    const saved = (await f.db.query("SELECT * FROM cylinders WHERE id=$1", [c]))
      .rows[0];
    assert.equal(saved.status, "sold");
    assert.equal(saved.ownership, "customer");
    assert.equal(saved.customer_id, f.actors.customer.id);
    assert.equal(
      Number(
        (
          await f.db.query(
            "SELECT quantity FROM inventory WHERE product_id='cylinder-empty-6' AND branch_id='lagos'",
          )
        ).rows[0].quantity,
      ),
      0,
    );
    await assert.rejects(
      () =>
        f.db.query(
          "UPDATE vehicle_product_serials SET state='loaded' WHERE cylinder_id=$1",
          [c],
        ),
      /immutable/,
    );
  } finally {
    await f.db.close?.();
    restoreVehicleEnv(env);
  }
});
