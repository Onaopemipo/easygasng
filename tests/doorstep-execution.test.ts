import test from "node:test";
import assert from "node:assert/strict";
import { doorstepFixture as setup } from "./helpers/doorstep-fixture";
import { actor, id } from "../apps/web/lib/auth";
import { gasReservation } from "../apps/web/lib/gas-delivery";
const restore = (before: NodeJS.ProcessEnv) => {
  for (const k of ["EASYGAS_DOORSTEP_ENABLED", "EASYGAS_BULK_LPG_ENABLED"]) {
    if (before[k] === undefined) delete process.env[k];
    else process.env[k] = before[k];
  }
};
test("DOOR-01: exact consent, independent debit/cash verification and metered supplement share canonical stock without second fee", async () => {
  const env = { ...process.env },
    f = await setup();
  try {
    await assert.rejects(f.prepare, /Customer consent/);
    await assert.rejects(
      () =>
        f.call("driver", "doorstep.consent", {
          orderId: f.order.id,
          amendmentId: f.context.amendmentId,
          consent: true,
          operationKey: id(),
        }),
      /customer/,
    );
    await f.consent();
    const p = await f.prepare();
    assert.equal(Number((await f.balance()).reserved_grams), 10000);
    const owner = await actor(f.db, f.actors.owner.token);
    await assert.rejects(
      () =>
        f.db.transaction((tx) =>
          gasReservation(tx, owner, f.order.id, "fulfilled"),
        ),
      /supplementary/,
    );
    await assert.rejects(
      () =>
        f.call("driver", "bulk.return.declare", {
          loadId: f.load.id,
          version: 3,
          returnGrams: 10000,
          reason: "Synthetic premature return rejected",
          operationKey: id(),
        }),
      /supplementary/,
    );
    await assert.rejects(
      () =>
        f.call("inventory", "invoice.correction.decide", {
          orderId: f.order.id,
          noteId: p.noteId,
          approve: true,
          operationKey: id(),
        }),
      /Independent finance\/owner decision required/,
    );
    await assert.rejects(
      () =>
        f.call("driver", "doorstep.collection.report", {
          ...f.context,
          amountKobo: p.amountKobo,
          operationKey: id(),
        }),
      /approved debit/,
    );
    await f.decide(p.noteId);
    await f.call("driver", "doorstep.collection.report", {
      ...f.context,
      amountKobo: p.amountKobo,
      operationKey: id(),
    });
    await assert.rejects(
      () =>
        f.call("driver", "doorstep.collection.verify", {
          ...f.context,
          operationKey: id(),
        }),
      /permission/,
    );
    await assert.rejects(
      () =>
        f.call("driver", "doorstep.dispense", {
          ...f.context,
          loadVersion: 3,
          meterReadingGrams: 102000,
          operationKey: id(),
        }),
      /settlement/,
    );
    await f.call("owner", "doorstep.collection.verify", {
      ...f.context,
      operationKey: id(),
    });
    const key = id();
    await f.call("driver", "doorstep.dispense", {
      ...f.context,
      loadVersion: 3,
      meterReadingGrams: 102000,
      operationKey: key,
    });
    await f.call("driver", "doorstep.dispense", {
      ...f.context,
      loadVersion: 3,
      meterReadingGrams: 102000,
      operationKey: key,
    });
    assert.equal(Number((await f.balance()).grams), 18000);
    assert.equal(Number((await f.balance()).reserved_grams), 8000);
    const inv = (
      await f.call("customer", "invoice.order", { orderId: f.order.id })
    ).invoice;
    assert.equal(Number(inv.amountDueKobo), 0);
    const row = (
      await f.db.query("SELECT * FROM orders WHERE id=$1", [f.order.id])
    ).rows[0];
    assert.equal(Number(inv.total_kobo), Number(row.total_kobo));
    assert.equal(
      Number(inv.effectiveTotalKobo),
      Number(row.total_kobo) + p.amountKobo,
    );
    await f.call("driver", "bulk.dispense", {
      loadId: f.load.id,
      version: 4,
      orderId: f.order.id,
      meterReadingGrams: 108000,
      reason: "Synthetic original quantity metered",
      operationKey: id(),
    });
    const attempt = (
      await f.db.query("SELECT id FROM delivery_attempts WHERE order_id=$1", [
        f.order.id,
      ])
    ).rows[0];
    await f.db.query(
      "INSERT INTO delivery_photos(id,order_id,attempt_id,actor_id,data,sha256,alt,consent,retain_until) VALUES($1,$2,$3,$4,$5,$6,'Synthetic existing proof fixture',true,now()+interval '1 day')",
      [
        id(),
        f.order.id,
        attempt.id,
        f.actors.driver.id,
        Buffer.from("synthetic proof fixture"),
        id(),
      ],
    );
    await f.call("driver", "driver.restrict");
    await f.call("driver", "driver.complete", {
      orderId: f.order.id,
      version: row.tracking_version,
      code: "123456",
      handover: true,
      operationKey: id(),
    });
    assert.equal(
      (
        await f.db.query("SELECT payment_status FROM orders WHERE id=$1", [
          f.order.id,
        ])
      ).rows[0].payment_status,
      "verified",
    );
    assert.equal(Number((await f.balance()).grams), 12000);
    assert.equal(Number((await f.balance()).reserved_grams), 2000);
    assert.equal(
      Number((await f.db.query("SELECT count(*) n FROM orders")).rows[0].n),
      1,
    );
    assert.equal(
      (await f.call("customer", "doorstep.list", { orderId: f.order.id }))
        .amendments[0].execution.state,
      "dispensed",
    );
  } finally {
    restore(env);
    await f.db.close?.();
  }
});
test("DOOR-02: rejected debit cancellation restores buffer without releasing branch custody or erasing consent", async () => {
  const env = { ...process.env },
    f = await setup();
  try {
    await f.consent();
    const p = await f.prepare();
    await assert.rejects(
      () =>
        f.call("owner", "doorstep.cancel", {
          ...f.context,
          operationKey: id(),
        }),
      /reject the pending debit/,
    );
    await f.decide(p.noteId, false);
    await f.call("owner", "doorstep.cancel", {
      ...f.context,
      operationKey: id(),
    });
    assert.equal(Number((await f.balance()).reserved_grams), 10000);
    const load = (await f.call("driver", "bulk.summary")).loads[0];
    assert.equal(Number(load.buffer_grams), 4000);
    assert.equal(
      (await f.call("customer", "doorstep.list", { orderId: f.order.id }))
        .amendments[0].state,
      "consented",
    );
    await assert.rejects(() => f.prepare(), /already has/);
  } finally {
    restore(env);
    await f.db.close?.();
  }
});

test("DOOR-03: changed prices, insufficient physical buffer, unsafe ownership and disabled release leave custody unchanged", async () => {
  const env = { ...process.env },
    f = await setup();
  try {
    await assert.rejects(
      () =>
        f.call("commercial", "doorstep.consent", {
          orderId: f.order.id,
          amendmentId: f.context.amendmentId,
          consent: true,
          operationKey: id(),
        }),
      /not found/,
    );
    await f.consent();
    await assert.rejects(
      () =>
        f.call("customer", "doorstep.prepare", {
          ...f.context,
          cylinderId: f.c,
          allowableKg: 6,
          evidence: "Synthetic invalid customer inspection",
          operationKey: id(),
        }),
      /permission/,
    );
    await f.db.query(
      "UPDATE cylinders SET test_due=current_date-1 WHERE id=$1",
      [f.c],
    );
    await assert.rejects(f.prepare, /inspection/);
    await f.db.query(
      "UPDATE cylinders SET test_due=current_date+365 WHERE id=$1",
      [f.c],
    );
    await f.db.query("UPDATE cylinders SET customer_id=$1 WHERE id=$2", [
      f.actors.commercial.id,
      f.c,
    ]);
    await assert.rejects(f.prepare, /ownership/);
    await f.db.query("UPDATE cylinders SET customer_id=$1 WHERE id=$2", [
      f.actors.customer.id,
      f.c,
    ]);
    await f.db.query(
      "UPDATE bulk_lpg_loads SET buffer_grams=1000 WHERE id=$1",
      [f.load.id],
    );
    await assert.rejects(f.prepare, /physical vehicle buffer/);
    await f.db.query(
      "UPDATE bulk_lpg_loads SET buffer_grams=4000 WHERE id=$1",
      [f.load.id],
    );
    await f.db.query(
      "UPDATE settings SET version=version+1 WHERE key='gas.price_per_kg' AND scope='lagos'",
    );
    await assert.rejects(f.prepare, /price or gas policy changed/);
    assert.equal(Number((await f.balance()).reserved_grams), 10000);
    assert.equal(
      Number(
        (await f.db.query("SELECT count(*) n FROM doorstep_execution")).rows[0]
          .n,
      ),
      0,
    );
    process.env.EASYGAS_DOORSTEP_ENABLED = "false";
    await assert.rejects(f.prepare, /release approval/);
  } finally {
    restore(env);
    await f.db.close?.();
  }
});

test("DOOR-04: exact cash, stale meter version and consent expiry fail closed; linked credit cancels without inventing a refund", async () => {
  const env = { ...process.env },
    f = await setup();
  const clock = Date.now;
  try {
    await f.consent();
    const p = await f.prepare();
    await f.decide(p.noteId);
    await assert.rejects(
      () =>
        f.call("driver", "doorstep.collection.report", {
          ...f.context,
          amountKobo: p.amountKobo - 1,
          operationKey: id(),
        }),
      /exact outstanding cash/,
    );
    Date.now = () => clock() + 16 * 60000;
    await assert.rejects(
      () =>
        f.call("driver", "doorstep.collection.report", {
          ...f.context,
          amountKobo: p.amountKobo,
          operationKey: id(),
        }),
      /unexpired exact-price consent/,
    );
    Date.now = clock;
    await f.call("driver", "doorstep.collection.report", {
      ...f.context,
      amountKobo: p.amountKobo,
      operationKey: id(),
    });
    await assert.rejects(
      () =>
        f.call("owner", "doorstep.cancel", {
          ...f.context,
          operationKey: id(),
        }),
      /physically reported cash/,
    );
    await f.call("owner", "doorstep.collection.verify", {
      ...f.context,
      operationKey: id(),
    });
    await assert.rejects(
      () =>
        f.call("driver", "doorstep.dispense", {
          ...f.context,
          loadVersion: 2,
          meterReadingGrams: 102000,
          operationKey: id(),
        }),
      /Load changed/,
    );
    await assert.rejects(
      () =>
        f.call("driver", "doorstep.dispense", {
          ...f.context,
          loadVersion: 3,
          meterReadingGrams: 102001,
          operationKey: id(),
        }),
      /Meter delta/,
    );
    const second = f.actors.commercial;
    await f.db.query("UPDATE users SET role='finance' WHERE id=$1", [
      second.id,
    ]);
    await f.db.query("UPDATE sessions SET verified_at=now() WHERE user_id=$1", [
      second.id,
    ]);
    const credit = await f.call("owner", "invoice.correction.propose", {
      orderId: f.order.id,
      kind: "credit",
      amountKobo: p.amountKobo,
      reason: `Doorstep ${f.context.amendmentId} cancelled before dispensing`,
      operationKey: id(),
    });
    await f.call("commercial", "invoice.correction.decide", {
      orderId: f.order.id,
      noteId: credit.noteId,
      approve: true,
      operationKey: id(),
    });
    await f.call("owner", "doorstep.cancel", {
      ...f.context,
      creditNoteId: credit.noteId,
      operationKey: id(),
    });
    const inv = (
      await f.call("customer", "invoice.order", { orderId: f.order.id })
    ).invoice;
    assert.equal(Number(inv.overpaidKobo), p.amountKobo);
    assert.equal(Number((await f.balance()).grams), 20000);
    assert.equal(Number((await f.balance()).reserved_grams), 10000);
    assert.equal(
      (await f.call("driver", "bulk.summary")).loads[0].buffer_grams,
      4000,
    );
    assert.equal(
      Number(
        (await f.db.query("SELECT count(*) n FROM credit_requests")).rows[0].n,
      ),
      0,
    );
  } finally {
    Date.now = clock;
    restore(env);
    await f.db.close?.();
  }
});

test("DOOR-05: finance can reconcile cash reported in time after meter retirement and quote expiry without permitting gas handover", async () => {
  const env = { ...process.env },
    f = await setup(),
    clock = Date.now;
  try {
    await f.consent();
    const p = await f.prepare();
    await f.decide(p.noteId);
    await f.call("driver", "doorstep.collection.report", {
      ...f.context,
      amountKobo: p.amountKobo,
      operationKey: id(),
    });
    const meter = (
      await f.db.query("SELECT * FROM bulk_lpg_meters WHERE id=$1", [
        f.meter.id,
      ])
    ).rows[0];
    await f.call("owner", "bulk.meter.retire", {
      meterId: f.meter.id,
      expectedCalibrationExpiresAt: new Date(
        meter.calibration_expires_at,
      ).toISOString(),
      expectedCalibrationReference: meter.calibration_reference,
      reason: "Synthetic meter defect after actual cash report",
      operationKey: id(),
    });
    // Advance the application clock with a matching fresh synthetic reauthentication.
    const later = clock() + 16 * 60000;
    await f.db.query("UPDATE sessions SET verified_at=$1 WHERE user_id=$2", [
      new Date(later).toISOString(),
      f.actors.owner.id,
    ]);
    Date.now = () => later;
    await f.call("owner", "doorstep.collection.verify", {
      ...f.context,
      operationKey: id(),
    });
    await assert.rejects(
      () =>
        f.call("driver", "doorstep.dispense", {
          ...f.context,
          loadVersion: 3,
          meterReadingGrams: 102000,
          operationKey: id(),
        }),
      /calibrated meter/,
    );
    assert.equal(Number((await f.balance()).grams), 20000);
    assert.equal(Number((await f.balance()).reserved_grams), 10000);
    assert.equal(
      Number(
        (
          await f.db.query(
            "SELECT count(*) n FROM verified_payments WHERE reference=$1",
            [`doorstep:${f.context.amendmentId}`],
          )
        ).rows[0].n,
      ),
      1,
    );
  } finally {
    Date.now = clock;
    restore(env);
    await f.db.close?.();
  }
});
