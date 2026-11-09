import {
  orderEffectiveSql,
  orderNetReceiptsSql,
  orderRevenueSql,
} from "../apps/web/lib/order-financial-basis";
import test from "node:test";
import assert from "node:assert/strict";
import { doorstepFixture } from "./helpers/doorstep-fixture";
import { id } from "../apps/web/lib/auth";
async function group() {
  const f = await doorstepFixture();
  const second = id();
  await f.db.query(
    "INSERT INTO cylinders(id,branch_id,serial,size_kg,ownership,status,test_due,customer_id) VALUES($1,'lagos',$1,6,'customer','empty',current_date+365,$2)",
    [second, f.actors.customer.id],
  );
  const o = (await f.db.query("SELECT * FROM orders WHERE id=$1", [f.order.id]))
    .rows[0];
  const m = await f.call("driver", "doorstep.gas.propose", {
    orderId: o.id,
    version: Number(o.tracking_version),
    lines: [
      { capacityKg: 6, kg: 2 },
      { capacityKg: 6, kg: 1 },
    ],
    operationKey: id(),
  });
  await f.call("customer", "doorstep.consent", {
    orderId: o.id,
    amendmentId: m.id,
    consent: true,
    operationKey: id(),
  });
  const context = {
    orderId: o.id,
    amendmentId: m.id,
    reason: "Synthetic grouped-cylinder evidence",
  };
  const run = (role: string, action: string, data: any = {}) =>
    f.call(role, action, { ...context, ...data, operationKey: id() });
  const inspections = [
    {
      cylinderId: f.c,
      allowableKg: 6,
      evidence: "Synthetic first cylinder inspected",
    },
    {
      cylinderId: second,
      allowableKg: 6,
      evidence: "Synthetic second cylinder inspected",
    },
  ];
  const lines = async () =>
    (
      await f.db.query(
        "SELECT * FROM doorstep_cylinder_lines WHERE amendment_id=$1 ORDER BY position",
        [m.id],
      )
    ).rows;
  const settle = async (p: any) => {
    await f.decide(p.noteId);
    await run("driver", "doorstep.collection.report", {
      amountKobo: p.amountKobo,
    });
    await run("owner", "doorstep.collection.verify");
  };
  return { ...f, context, run, inspections, lines, settle };
}
test("DOOR-MULTI01: every cylinder has distinct inspection, per-cylinder meter evidence and one settled supplementary obligation", async () => {
  const env = { ...process.env },
    f = await group();
  try {
    await assert.rejects(
      () =>
        f.run("inventory", "doorstep.prepare", {
          inspections: [f.inspections[0], f.inspections[0]],
        }),
      /distinct/,
    );
    assert.equal((await f.lines()).length, 0);
    const p = await f.run("inventory", "doorstep.prepare", {
      inspections: f.inspections,
    });
    await f.settle(p);
    const lines = await f.lines();
    assert.equal(lines.length, 2);
    assert.equal(p.amountKobo, 540000);
    await assert.rejects(
      () =>
        f.run("driver", "doorstep.dispense", {
          loadVersion: 3,
          meterReadingGrams: 102000,
        }),
      /Choose/,
    );
    await assert.rejects(
      () =>
        f.run("driver", "doorstep.dispense", {
          lineId: lines[0].id,
          loadVersion: 3,
          meterReadingGrams: 103000,
        }),
      /delta/,
    );
    const operation = {
      ...f.context,
      lineId: lines[0].id,
      loadVersion: 3,
      meterReadingGrams: 102000,
      operationKey: id(),
    };
    await f.call("driver", "doorstep.dispense", operation);
    await f.call("driver", "doorstep.dispense", operation);
    assert.equal((await f.lines())[0].state, "dispensed");
    assert.equal((await f.lines())[1].state, "reserved");
    assert.equal(
      (
        await f.db.query(
          "SELECT state FROM doorstep_execution WHERE amendment_id=$1",
          [f.context.amendmentId],
        )
      ).rows[0].state,
      "reserved",
    );
    await assert.rejects(
      () =>
        f.run("driver", "doorstep.dispense", {
          lineId: lines[0].id,
          loadVersion: 4,
          meterReadingGrams: 104000,
        }),
      /unfilled/,
    );
    await assert.rejects(
      () =>
        f.run("driver", "doorstep.dispense", {
          lineId: lines[1].id,
          loadVersion: 3,
          meterReadingGrams: 103000,
        }),
      /Load changed/,
    );
    await f.run("driver", "doorstep.dispense", {
      lineId: lines[1].id,
      loadVersion: 4,
      meterReadingGrams: 103000,
    });
    assert.equal(
      (await f.lines()).every((l) => l.state === "dispensed"),
      true,
    );
    assert.equal(
      (
        await f.db.query(
          "SELECT state FROM doorstep_execution WHERE amendment_id=$1",
          [f.context.amendmentId],
        )
      ).rows[0].state,
      "dispensed",
    );
    assert.equal(Number((await f.balance()).grams), 17000);
    assert.equal(Number((await f.balance()).reserved_grams), 7000);
    assert.equal(
      Number(
        (
          await f.db.query(
            "SELECT count(*) n FROM gas_stock_movements WHERE reference LIKE $1",
            [`doorstep:${f.context.amendmentId}:%:fulfilled`],
          )
        ).rows[0].n,
      ),
      2,
    );
    await assert.rejects(
      () =>
        f.db.query(
          "UPDATE doorstep_cylinder_lines SET state='reserved' WHERE id=$1",
          [lines[0].id],
        ),
      /immutable/,
    );
  } finally {
    await f.db.close?.();
    for (const k of ["EASYGAS_DOORSTEP_ENABLED", "EASYGAS_BULK_LPG_ENABLED"])
      if (env[k] === undefined) delete process.env[k];
      else process.env[k] = env[k];
  }
});
test("DOOR-MULTI02: partial execution credits only unfilled lines, restores only undispensed vehicle mass and retains paid credit for finance", async () => {
  const env = { ...process.env },
    f = await group();
  try {
    const p = await f.run("inventory", "doorstep.prepare", {
      inspections: f.inspections,
    });
    await f.settle(p);
    const lines = await f.lines();
    await f.run("driver", "doorstep.dispense", {
      lineId: lines[0].id,
      loadVersion: 3,
      meterReadingGrams: 102000,
    });
    await assert.rejects(
      () => f.run("owner", "doorstep.cancel"),
      /exact invoice credit/,
    );
    await f.db.query("UPDATE users SET role='finance' WHERE id=$1", [
      f.actors.commercial.id,
    ]);
    await f.db.query("UPDATE sessions SET verified_at=now() WHERE user_id=$1", [
      f.actors.commercial.id,
    ]);
    const credit = await f.call("owner", "invoice.correction.propose", {
      orderId: f.order.id,
      kind: "credit",
      amountKobo: 180000,
      reason: "Synthetic unfilled second-cylinder cancellation",
      operationKey: id(),
    });
    await f.call("commercial", "invoice.correction.decide", {
      orderId: f.order.id,
      noteId: credit.noteId,
      approve: true,
      operationKey: id(),
    });
    await f.run("owner", "doorstep.cancel", { creditNoteId: credit.noteId });
    const saved = await f.lines();
    assert.equal(saved[0].state, "dispensed");
    assert.equal(saved[1].state, "cancelled");
    const load = (
      await f.db.query("SELECT * FROM bulk_lpg_loads WHERE id=$1", [f.load.id])
    ).rows[0];
    assert.equal(Number(load.buffer_grams), 2000);
    assert.equal(Number(load.dispensed_grams), 2000);
    const balance = await f.call("owner", "invoice.corrections", {
      orderId: f.order.id,
    });
    assert.equal(balance.overpaidKobo, 180000);
    assert.equal(
      Number(
        (
          await f.db.query(
            "SELECT count(*) n FROM credit_requests WHERE order_id=$1",
            [f.order.id],
          )
        ).rows[0].n,
      ),
      0,
    );
    await assert.rejects(
      () =>
        f.run("driver", "doorstep.dispense", {
          lineId: lines[1].id,
          loadVersion: 5,
          meterReadingGrams: 103000,
        }),
      /reserved amendment/,
    );
    assert.equal(Number((await f.balance()).grams), 18000);
    assert.equal(Number((await f.balance()).reserved_grams), 8000);
    await assert.rejects(
      () =>
        f.call("owner", "invoice.excess.request", {
          orderId: f.order.id,
          acceptWalletCredit: true,
          reason: "Staff cannot consent to customer credit",
          operationKey: id(),
        }),
      /owning customer/,
    );
    const input = {
      orderId: f.order.id,
      acceptWalletCredit: true,
      reason: "Customer requests unfilled-cylinder excess as purchase credit",
      operationKey: id(),
    };
    const refund = await f.call("customer", "invoice.excess.request", input);
    await f.call("customer", "invoice.excess.request", input);
    await f.call("owner", "credit.decide", {
      id: refund.id,
      decision: "approved",
      reason: "Independent exact excess-collection reconciliation",
    });
    await f.call("owner", "credit.decide", {
      id: refund.id,
      decision: "approved",
      reason: "Retry original finance decision",
    });
    const settled = await f.call("owner", "invoice.corrections", {
      orderId: f.order.id,
    });
    assert.equal(settled.overpaidKobo, 0);
    const financial = (
      await f.db.query(
        `SELECT ${orderEffectiveSql} AS effective, ${orderNetReceiptsSql} AS receipts, ${orderRevenueSql} AS revenue FROM orders o WHERE o.id=$1`,
        [f.order.id],
      )
    ).rows[0];
    const original = Number(
      (
        await f.db.query("SELECT total_kobo FROM orders WHERE id=$1", [
          f.order.id,
        ])
      ).rows[0].total_kobo,
    );
    assert.equal(Number(financial.effective), original + 360000);
    assert.equal(Number(financial.receipts), original + 360000);
    assert.equal(Number(financial.revenue), original + 360000);

    assert.equal(
      Number(
        (
          await f.db.query(
            "SELECT sum(amount_kobo) n FROM wallet_entries WHERE reference=$1",
            [`credit:${refund.id}`],
          )
        ).rows[0].n,
      ),
      180000,
    );
    const order = (
      await f.db.query("SELECT status,payment_status FROM orders WHERE id=$1", [
        f.order.id,
      ])
    ).rows[0];
    assert.equal(order.status, "out_for_delivery");
    assert.equal(order.payment_status, "verified");
    await assert.rejects(
      () =>
        f.call("customer", "invoice.excess.request", {
          ...input,
          operationKey: id(),
        }),
      /actual excess/,
    );
  } finally {
    await f.db.close?.();
    for (const k of ["EASYGAS_DOORSTEP_ENABLED", "EASYGAS_BULK_LPG_ENABLED"])
      if (env[k] === undefined) delete process.env[k];
      else process.env[k] = env[k];
  }
});
