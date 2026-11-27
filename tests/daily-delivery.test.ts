import { setup } from "./helpers/daily-delivery-fixture";
import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers/order-tracking-fixture";
import { id, actor } from "../apps/web/lib/auth";
import { one } from "../apps/web/lib/db";
import { attachDeliveryPhoto } from "../apps/web/lib/delivery-photos";
test("DAY01 full paid refill → actual scale stock debit → consented current photo → delivery → office net-weight close", async () => {
  const f = await setup();
  try {
    const r = await f.start(),
      o = await f.make();
    await f.assign(o);
    await assert.rejects(()=>f.transition(o,"out_for_delivery"),/driver.*Start delivery/i);
    let current = await f.arrive(o);
    assert(current.daily_run);
    assert.equal(Number((await f.summary()).committed_grams), 6000);
    const input = {
      orderId: o.id,
      version: current.tracking_version,
      readings: [{ beforeKg: 8.4, afterKg: 14.4 }],
      operationKey: id(),
    };
    const result = await f.call("driver", "daily.refill.record", input);
    assert.equal(result.suppliedKg, 6);
    await f.call("driver", "daily.refill.record", input);
    assert.equal(
      Number(
        (await one(f.db, "SELECT grams FROM gas_stock WHERE branch_id='lagos'"))
          ?.grams,
      ),
      494000,
    );
    await assert.rejects(
      () =>
        f.run("driver", "driver.complete", {
          orderId: o.id,
          version: current.tracking_version,
          handover: true,
        }),
      /photo/,
    );
    assert.equal((await f.snapshot(o.id)).daily_run.photo_ready, false);
    const driver = await actor(f.db, f.actors.driver.token);
    await f.db.transaction((tx) =>
      attachDeliveryPhoto(
        tx,
        driver,
        o.id,
        Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
        "Synthetic refill photo",
        true,
        new Date().toISOString(),
      ),
    );
    assert.equal((await f.snapshot(o.id)).daily_run.photo_ready, true);
    await f.run("driver", "driver.complete", {
      orderId: o.id,
      version: current.tracking_version,
      handover: true,
    });
    assert.equal((await f.snapshot(o.id)).status, "delivered");
    assert.equal(
      Number(
        (await one(f.db, "SELECT grams FROM gas_stock WHERE branch_id='lagos'"))
          ?.grams,
      ),
      494000,
    );
    const day = await f.summary();
    const close = {
      runId: r.id,
      version: Number(day.version),
      kg: 94,
      endOdometer: 20,
      operationKey: id(),
    };
    await f.call("owner", "daily.close", close);
    await f.call("owner", "daily.close", close);
    assert.equal((await f.summary()).state, "closed");
    assert.equal(
      Number(
        (
          await one(
            f.db,
            "SELECT reserved_grams FROM gas_stock WHERE branch_id='lagos'",
          )
        )?.reserved_grams,
      ),
      0,
    );
    assert.equal(
      Number(
        (
          await one(
            f.db,
            "SELECT count(*) n FROM daily_delivery_refills WHERE order_id=$1",
            [o.id],
          )
        )?.n,
      ),
      1,
    );
    await assert.rejects(
      () =>
        f.db.query(
          "UPDATE daily_delivery_refills SET supplied_grams=1 WHERE order_id=$1",
          [o.id],
        ),
      /Append-only|immutable/,
    );
  } finally {
    await f.db.close?.();
  }
});
test("DAY02 existing reservations attach once; arriving new orders/midday gas and cancellation conserve stock", async () => {
  const f = await setup();
  try {
    const before = await f.make(),
      r = await f.start();
    assert.equal(Number((await f.summary()).committed_grams), 6000);
    assert.equal(
      Number(
        (
          await one(
            f.db,
            "SELECT reserved_grams FROM gas_stock WHERE branch_id='lagos'",
          )
        )?.reserved_grams,
      ),
      100000,
    );
    const o = await f.make();
    await f.assign(before);
    await f.assign(o);
    assert.equal(Number((await f.summary()).committed_grams), 12000);
    let day = await f.summary();
    await f.run("owner", "daily.add", {
      runId: r.id,
      version: Number(day.version),
      kg: 20,
    });
    assert.equal(Number((await f.summary()).added_grams), 20000);
    await f.run("owner", "order.transition", {
      id: o.id,
      status: "delivery_failed",
      version: (await f.snapshot(o.id)).tracking_version,
      failureReason: "customer_unavailable",
      note: "Synthetic customer unavailable; no gas supplied",
    });
    await f.transition(o, "cancelled");
    assert.equal(Number((await f.summary()).committed_grams), 6000);
    day = await f.summary();
    await f.run("owner", "daily.close", {
      runId: r.id,
      version: Number(day.version),
      kg: 120,
      endOdometer: 21,
      carryForward: true,
    });
    const carried = await f.snapshot(before.id);
    assert.equal(carried.status, "preparing");
    assert.equal(carried.driver_id, null);
    assert.equal(carried.payment_status, "verified");
    assert.equal(
      Number(
        (
          await one(
            f.db,
            "SELECT reserved_grams FROM gas_stock WHERE branch_id='lagos'",
          )
        )?.reserved_grams,
      ),
      6000,
    );
    await f.start();
    await f.transition(before, "assigned");
    assert((await f.snapshot(before.id)).daily_run);
  } finally {
    await f.db.close?.();
  }
});
test("DAY03 wrong driver/branch, non-Admin variance, stale version, bad/mismatching weights, duplicate day and bypass trip end are denied", async () => {
  const f = await setup();
  try {
    const r = await f.start();
    await assert.rejects(f.start, /already open/);
    const o = await f.make();
    await f.assign(o);
    let c = await f.arrive(o);
    await assert.rejects(
      () =>
        f.run("customer", "daily.refill.record", {
          orderId: o.id,
          version: c.tracking_version,
          readings: [{ beforeKg: 8, afterKg: 14 }],
        }),
      /permission/,
    );
    await assert.rejects(
      () =>
        f.run("driver", "daily.refill.record", {
          orderId: o.id,
          version: c.tracking_version - 1,
          readings: [{ beforeKg: 8, afterKg: 14 }],
        }),
      /changed/,
    );
    for (const pair of [
      [8, 8],
      [8, 13],
      [8, 15],
      [8, 14.0001],
    ])
      await assert.rejects(() =>
        f.run("driver", "daily.refill.record", {
          orderId: o.id,
          version: c.tracking_version,
          readings: [{ beforeKg: pair[0], afterKg: pair[1] }],
        }),
      );
    await assert.rejects(
      async () =>
        f.run("driver", "trip.end", {
          tripId: (await f.summary()).trip_id,
          endOdometer: 20,
        }),
      /office|closing gas/,
    );
    let day = await f.summary();
    await assert.rejects(
      () =>
        f.run("dispatcher", "daily.close", {
          runId: r.id,
          version: Number(day.version),
          kg: 99,
          endOdometer: 20,
          carryForward: true,
        }),
      /Admin/,
    );
    const close = await f.run("owner", "daily.close", {
      runId: r.id,
      version: Number(day.version),
      kg: 99,
      endOdometer: 20,
      carryForward: true,
      reason: "Synthetic genuine closing measurement differs by 1kg",
    });
    assert.equal(close.varianceKg, -1);
    assert.equal(
      Number(
        (await one(f.db, "SELECT grams FROM gas_stock WHERE branch_id='lagos'"))
          ?.grams,
      ),
      499000,
    );
    await assert.rejects(
      () =>
        f.db.query(
          "UPDATE daily_delivery_runs SET opening_grams=1 WHERE id=$1",
          [r.id],
        ),
      /immutable/,
    );
  } finally {
    await f.db.close?.();
  }
});

test("DAY04 daily same-visit phone extra remains fee-free, unassigned until verified payment and reserves daily gas once", async () => {
  const { phonePaymentFixture } = await import(
    "./helpers/phone-order-payment-fixture"
  );
  const p = await phonePaymentFixture();
  const f = await setup(p.db, p);
  try {
    await f.start();
    const parent = await f.make();
    await f.assign(parent);
    const current = await f.snapshot(parent.id);
    const cart = {
      parentOrderId: parent.id,
      version: Number(current.tracking_version),
      items: [],
      gasLines: [{ capacityKg: 6, kg: 6 }],
    };
    const quote = await f.call("owner", "order.visit.quote", cart);
    const child = await f.call("owner", "order.visit.create", {
      ...cart,
      quoteHash: quote.quoteHash,
      requestKey: id(),
      reason: "Synthetic caller requests additional gas",
    });
    let o = await f.snapshot(child.orderId);
    assert.equal(o.driver_id, null);
    assert.equal(o.payment_status, "unpaid");
    assert.equal(Number(o.delivery_kobo), 0);
    const [linkId, token] = new URL(child.paymentLink.url).hash
      .slice(1)
      .split(":");
    await p.http("view", { linkId, token });
    assert.equal((await p.confirm({ o, linkId, token })).status, 200);
    const paid = await p.pay({ o, linkId, token });
    assert.equal(paid.v.body.status, "paid");
    o = await f.snapshot(child.orderId);
    assert.equal(o.driver_id, f.actors.driver.id);
    assert.equal(o.status, "assigned");
    assert(o.daily_run);
    assert.equal(Number((await f.summary()).committed_grams), 12000);
    assert.equal(
      Number(
        (
          await one(
            f.db,
            "SELECT reserved_grams FROM gas_stock WHERE branch_id='lagos'",
          )
        )?.reserved_grams,
      ),
      100000,
    );
    await assert.rejects(() =>
      f.run("owner", "daily.close", {
        runId: (current.daily_run as any).run_id,
        version: 1,
        kg: 100,
        endOdometer: 20,
        carryForward: true,
      }),
    );
  } finally {
    await f.db.close?.();
  }
});
test("DAY05 revoked privileges, foreign driver/branch, premature photo, unfinished supply, disabled operations and multiple cylinders", async () => {
  const f = await setup();
  try {
    const day = await f.start(),
      o = await f.make();
    await f.assign(o);
    const c = await f.arrive(o);
    const input = {
      orderId: o.id,
      version: c.tracking_version,
      readings: [
        { beforeKg: 4, afterKg: 6.5 },
        { beforeKg: 8, afterKg: 11.5 },
      ],
    };
    const { issueSession, hashPassword } = await import("../apps/web/lib/auth");
    const { dispatch } = await import("../apps/web/lib/service");
    const other = id();
    await f.db.query(
      "INSERT INTO branches(id,name) VALUES('abuja','Synthetic Abuja') ON CONFLICT DO NOTHING",
    );
    await f.db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,'Other driver',$2,$3,'driver','abuja')",
      [other, other + "@test.invalid", hashPassword("Disposable-only-123!")],
    );
    const token = await issueSession(f.db, other);
    await assert.rejects(
      () =>
        dispatch(
          "daily.refill.record",
          token,
          { ...input, operationKey: id() },
          f.db,
        ),
      /not found|scope|branch/,
    );
    await f.db.query(
      "INSERT INTO staff_privilege_overrides(user_id,privilege,effect,changed_by,role_at_change,branch_at_change) VALUES($1,'orders.manage','deny',$2,'driver','lagos')",
      [f.actors.driver.id, f.actors.owner.id],
    );
    await assert.rejects(
      () => f.run("driver", "daily.refill.record", input),
      /revoked/,
    );
    await f.db.query("DELETE FROM staff_privilege_overrides WHERE user_id=$1", [
      f.actors.driver.id,
    ]);
    const driver = await actor(f.db, f.actors.driver.token);
    await assert.rejects(
      () =>
        f.db.transaction((tx) =>
          attachDeliveryPhoto(
            tx,
            driver,
            o.id,
            Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
            "Synthetic pre-refill photo",
            true,
            new Date(Date.now() - 1000).toISOString(),
          ),
        ),
      /scale refill first/,
    );
    await f.run("driver", "daily.refill.record", input);
    await assert.rejects(
      () =>
        f.run("driver", "driver.complete", {
          orderId: o.id,
          version: c.tracking_version,
          handover: true,
        }),
      /photo/,
    );
    await assert.rejects(
      async () =>
        f.run("owner", "daily.close", {
          runId: day.id,
          version: Number((await f.summary()).version),
          kg: 94,
          endOdometer: 20,
          carryForward: true,
        }),
      /photo|supplied/,
    );
    const env = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    process.env.EASYGAS_FIELD_OPERATIONS_ENABLED = "false";
    try {
      await assert.rejects(
        async () =>
          f.run("owner", "daily.add", {
            runId: day.id,
            version: Number((await f.summary()).version),
            kg: 1,
          }),
        /release/,
      );
    } finally {
      process.env.NODE_ENV = env;
      process.env.EASYGAS_FIELD_OPERATIONS_ENABLED = "true";
    }
    const { lagosDate } = await import(
      "../packages/business-rules/src/dispatch-centre"
    );
    const centre = await f.call("owner", "dispatch.centre", {
      date: lagosDate(),
    });
    assert.equal(centre.operations.loadedGrams, 100000);
    assert.equal(centre.operations.dailySuppliedGrams, 6000);
    assert.equal(centre.operations.estimatedRemainingGrams, 94000);
    assert.equal(Number((await f.summary()).supplied_grams), 6000);
    assert.equal(
      Number(
        (
          await one(
            f.db,
            "SELECT jsonb_array_length(readings) n FROM daily_delivery_refills WHERE order_id=$1",
            [o.id],
          )
        )?.n,
      ),
      2,
    );
  } finally {
    await f.db.close?.();
  }
});

test('DAY06 existing trip handover requires real reconciliation, then reuses the vehicle without rewriting earlier metered history',async()=>{
 const {phonePaymentFixture}=await import('./helpers/phone-order-payment-fixture');const p=await phonePaymentFixture();const f=await setup(p.db,p);try{
 const trip=await p.start();const load=await p.run('inventory','bulk.load.issue',{tripId:trip.id,meterId:p.meter.id,grams:6000,meterReadingGrams:100000,orderIds:[],reason:'Synthetic earlier load'});await p.run('driver','bulk.load.acknowledge',{loadId:load.id,version:1,returnGrams:6000,meterReadingGrams:100000,reason:'Synthetic earlier weight confirmed'});
 const start={driverId:f.actors.driver.id,vehicleId:p.vehicle.id,openingKg:20};await assert.rejects(()=>f.run('owner','daily.start',start),/Reconcile.*custody/);
 await p.run('driver','bulk.return.declare',{loadId:load.id,version:2,returnGrams:6000,reason:'Synthetic actual earlier load returned'});await p.run('inventory','bulk.return.receive',{loadId:load.id,version:3,returnGrams:6000,reason:'Synthetic actual earlier return received'});
 const before=await one(f.db,'SELECT to_jsonb(l) snapshot FROM bulk_lpg_loads l WHERE id=$1',[load.id]);const day=await f.run('owner','daily.start',start);assert.equal((await f.summary()).trip_id,trip.id);const order=await f.make();await f.assign(order);const c=await f.arrive(order);await f.run('driver','daily.refill.record',{orderId:order.id,version:c.tracking_version,readings:[{beforeKg:8,afterKg:14}]});const driver=await actor(f.db,f.actors.driver.token);await f.db.transaction(tx=>attachDeliveryPhoto(tx,driver,order.id,Buffer.from([1,2,3,4,5,6,7,8,9,10,11,12]),'Synthetic daily refill evidence',true,new Date().toISOString()));await f.run('driver','driver.complete',{orderId:order.id,version:c.tracking_version,handover:true});await f.run('owner','daily.close',{runId:day.id,version:Number((await f.summary()).version),kg:14,endOdometer:125});assert.deepEqual((await one(f.db,'SELECT to_jsonb(l) snapshot FROM bulk_lpg_loads l WHERE id=$1',[load.id]))?.snapshot,before?.snapshot);assert.equal(Number((await one(f.db,"SELECT grams FROM gas_stock WHERE branch_id='lagos'"))?.grams),494000);
 }finally{await f.db.close?.();}
});
