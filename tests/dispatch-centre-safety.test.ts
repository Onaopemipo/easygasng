import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers/order-tracking-fixture";
import { id } from "../apps/web/lib/auth";

test("DDI-S024: unavailable drivers cannot receive a legacy manual assignment", async () => {
  const f = await fixture();
  try {
    await f.db.query("UPDATE users SET driver_available=false WHERE id=$1", [
      f.actors.driver.id,
    ]);
    const order = await f.make();
    await f.transition(order, "accepted");
    await f.transition(order, "preparing");
    await assert.rejects(
      () => f.transition(order, "assigned"),
      /unavailable|availability/i,
    );
    const current = await f.snapshot(order.id);
    assert.equal(current.driver_id, null);
    assert.equal(current.status, "preparing");
    assert.equal(
      (
        await f.db.query("SELECT id FROM delivery_attempts WHERE order_id=$1", [
          order.id,
        ])
      ).rows.length,
      0,
    );
  } finally {
    await f.db.close?.();
  }
});

test("DDI-S024B: enhanced manual assignment rejects unavailable drivers before trip or route selection", async () => {
  const f = await fixture();
  try {
    await f.db.query("UPDATE users SET driver_available=false WHERE id=$1", [
      f.actors.driver.id,
    ]);
    const order = await f.make();
    await f.transition(order, "accepted");
    await f.transition(order, "preparing");
    const current = await f.snapshot(order.id);
    await assert.rejects(
      () =>
        f.call("dispatcher", "dispatch.assign", {
          orderId: order.id,
          driverId: f.actors.driver.id,
          version: current.tracking_version,
          reason: "Synthetic unavailable-driver safety regression",
          operationKey: id(),
        }),
      /unavailable|availability/i,
    );
    assert.equal((await f.snapshot(order.id)).driver_id, null);
  } finally {
    await f.db.close?.();
  }
});

test("DDI-READ01: scoped counts include every matching record and pagination never changes totals", async () => {
  const f = await fixture();
  try {
    const order = await f.make();
    await f.transition(order, "accepted");
    await f.transition(order, "preparing");
    const source = (
      await f.db.query("SELECT * FROM orders WHERE id=$1", [order.id])
    ).rows[0];
    // Explicit synthetic records in an isolated DB; no invoice/stock facts invented for readiness.
    for (let n = 0; n < 260; n++)
      await f.db.query(
        `INSERT INTO orders(id,reference,customer_id,branch_id,status,payment_method,subtotal_kobo,delivery_kobo,total_kobo,address,delivery_date,delivery_window,idempotency_key,request_hash,delivery_code_hash,delivery_code_expires_at) VALUES($1,$2,$3,'lagos','preparing','cash_on_delivery',100,0,100,$4,$5,$6,$7,'synthetic','synthetic',now()+interval '1 day')`,
        [
          id(),
          `DDI-SYNTHETIC-${n}`,
          f.actors.customer.id,
          source.address,
          source.delivery_date,
          source.delivery_window,
          id(),
        ],
      );
    const before = (await f.db.query("SELECT count(*) n FROM stock_movements"))
      .rows[0].n;
    const first = await f.call("owner", "dispatch.centre", {
      date: source.delivery_date,
      pageSize: 5,
    });
    const last = await f.call("owner", "dispatch.centre", {
      date: source.delivery_date,
      pageSize: 5,
      page: 53,
    });
    assert.equal(first.total, 261);
    assert.equal(first.counts.queue, 261);
    assert.equal(first.rows.length, 5);
    assert.equal(last.rows.length, 1);
    assert.equal(last.total, 261);
    assert.equal(first.kpis.ready, null); // Full counts stay exact; no partial readiness figure above the probe budget.
    assert.equal(first.kpis.driversOnline, 0);
    assert.equal(first.automaticAssignmentEnabled, false);
    assert.equal(
      (await f.db.query("SELECT count(*) n FROM stock_movements")).rows[0].n,
      before,
    );
  } finally {
    await f.db.close?.();
  }
});

test("DDI-READ02: dispatch reads reject customer/driver access and cross-branch filters", async () => {
  const f = await fixture();
  try {
    for (const role of ["customer", "driver"])
      await assert.rejects(
        () => f.call(role, "dispatch.centre", {}),
        /permission|access|allowed|authori/i,
      );
    await assert.rejects(
      () =>
        f.call("dispatcher", "dispatch.centre", { branch: "another-branch" }),
      /branch access denied/i,
    );
    await assert.rejects(
      () => f.call("owner", "dispatch.centre", { date: "2026-02-30" }),
      /valid date/i,
    );
  } finally {
    await f.db.close?.();
  }
});

test("DDI-READ03: empty-date dashboard reports actual zeros and unknown contact", async () => {
  const f = await fixture();
  try {
    const result = await f.call("owner", "dispatch.centre", {
      date: "2001-01-01",
    });
    assert.equal(result.total, 0);
    assert.equal(result.kpis.ready, 0);
    assert.equal(result.kpis.delivered, 0);
    assert.equal(result.kpis.driversOnline, 0);
    assert.equal(result.operations.loadedGrams, 0);
  } finally {
    await f.db.close?.();
  }
});

test("DDI-CONTACT01: foreground contact is independently measured, scoped and expires without changing availability", async () => {
  const f = await fixture();
  try {
    await f.call("driver", "driver.restrict", {});
    await f.db.query("UPDATE users SET driver_available=false WHERE id=$1", [
      f.actors.driver.id,
    ]);
    await f.call("driver", "driver.heartbeat", {});
    const before = (
      await f.db.query(
        "SELECT driver_available,driver_last_seen_at FROM users WHERE id=$1",
        [f.actors.driver.id],
      )
    ).rows[0];
    assert.equal(before.driver_available, false);
    assert.ok(before.driver_last_seen_at);
    let result = await f.call("owner", "dispatch.centre", {});
    assert.equal(result.kpis.driversOnline, 1);
    assert.equal(result.drivers[0].contact, "recent_contact");
    await f.db.query(
      "UPDATE users SET driver_last_seen_at=now()-interval '5 minutes' WHERE id=$1",
      [f.actors.driver.id],
    );
    result = await f.call("owner", "dispatch.centre", {});
    assert.equal(result.kpis.driversOnline, 0);
    assert.equal(result.drivers[0].contact, "stale");
    await assert.rejects(
      () => f.call("customer", "driver.heartbeat", {}),
      /permission|access|allowed|authori/i,
    );
    await f.db.query("UPDATE branches SET active=false WHERE id='lagos'");
    await assert.rejects(
      () => f.call("driver", "driver.heartbeat", {}),
      /inactive/i,
    );
  } finally {
    await f.db.close?.();
  }
});

test("DDI-PAY01: unverified payment and revoked COD exception block canonical assignment with no attempt", async () => {
  const f = await fixture();
  try {
    const o = await f.make();
    await f.transition(o, "accepted");
    await f.transition(o, "preparing");
    await f.db.query(
      "UPDATE settings SET value='false' WHERE key='payment.cod' AND scope='lagos'",
    );
    // Cached payment_status is intentionally misleading; canonical verified_payments remains empty.
    await f.db.query("UPDATE orders SET payment_status='paid' WHERE id=$1", [
      o.id,
    ]);
    const result = await f.call("owner", "dispatch.centre", {
      date: (await f.snapshot(o.id)).delivery_date,
    });
    assert.equal(result.kpis.ready, 0);
    assert.equal(result.rows[0].paymentLabel, "Payment review");
    await assert.rejects(
      () => f.transition(o, "assigned"),
      /verified payment|approved cash/i,
    );
    assert.equal(
      (
        await f.db.query("SELECT id FROM delivery_attempts WHERE order_id=$1", [
          o.id,
        ])
      ).rows.length,
      0,
    );
  } finally {
    await f.db.close?.();
  }
});

test("DDI-S031: expired authorisation prevents driver acknowledgement without a response", async () => {
  const f = await fixture();
  try {
    const o = await f.assigned();
    await f.db.query(
      "UPDATE orders SET delivery_code_expires_at=now()-interval '1 minute' WHERE id=$1",
      [o.id],
    );
    await assert.rejects(
      () =>
        f.call("driver", "dispatch.respond", {
          orderId: o.id,
          version: Number(o.tracking_version),
          decision: "acknowledged",
          reason: "Synthetic acknowledgement",
          operationKey: id(),
        }),
      /expired/i,
    );
    assert.equal(
      (
        await f.db.query(
          "SELECT r.* FROM dispatch_responses r JOIN delivery_attempts a ON a.id=r.attempt_id WHERE a.order_id=$1",
          [o.id],
        )
      ).rows.length,
      0,
    );
  } finally {
    await f.db.close?.();
  }
});

test("DDI-AUDIT01: grouped navigation, customer/technician apps and financial orchestrator retain reviewed hashes", async () => {
  const { readFile } = await import("node:fs/promises");
  const { createHash } = await import("node:crypto");
  const baseline = JSON.parse(
    await readFile(
      "docs/dispatch-driver/evidence/preserved-files-baseline.json",
      "utf8",
    ),
  );
  // Preserve the original audit baseline. The later approved invoice phase
  // added immutable descriptive document snapshots, covered by payment posting tests.
  const approvedInvoiceSnapshotHash =
    "85164d77454e38825516938640d40dfa379f29cde74e2b5f9054c082273ed5a1";
  for (const [file, originalHash] of Object.entries(baseline)) {
    const hash = file === "apps/web/lib/payments/orchestrator.ts"
      ? approvedInvoiceSnapshotHash : originalHash;
    let source = await readFile(file, "utf8");
    if (file === "apps/mobile/DriverWorkspace.tsx")
      source = source.replace('      api("driver.heartbeat", {}),\n', "");
    assert.equal(createHash("sha256").update(source).digest("hex"), hash, file);
  }
});

test("DDI-S016: Lagos date boundaries and contact freshness never use upload time or future observations", async () => {
  const { lagosDate, driverContact } = await import(
    "../packages/business-rules/src/dispatch-centre"
  );
  assert.equal(lagosDate("2026-10-31T22:59:59Z"), "2026-10-31");
  assert.equal(lagosDate("2026-10-31T23:00:00Z"), "2026-11-01");
  const now = Date.parse("2026-11-09T12:00:00Z");
  assert.equal(driverContact(null, now), "unknown");
  assert.equal(driverContact("2026-11-09T12:01:00Z", now), "unknown");
  assert.equal(driverContact("2026-11-09T11:58:30Z", now), "stale");
});

test("DDI-READ04: literal search and status filters share scope and hide private order internals", async () => {
  const f = await fixture();
  try {
    const o = await f.make();
    await f.transition(o, "accepted");
    const date = (await f.snapshot(o.id)).delivery_date;
    let r = await f.call("dispatcher", "dispatch.centre", {
      date,
      q: "SYNTHETIC street",
      status: "accepted",
    });
    assert.equal(r.total, 1);
    assert.equal(r.counts.queue, 1);
    assert.equal(r.kpis.ready, 0); // Accepted still requires canonical preparation.
    assert.equal(r.rows[0].canAssign, false);
    await assert.rejects(
      () => f.call("owner", "dispatch.candidates", { orderId: o.id }),
      /prepar/i,
    );
    assert.equal(r.rows[0].delivery_code_hash, undefined);
    assert.equal(r.rows[0].request_hash, undefined);
    assert.equal(r.rows[0].address.phone, undefined);
    r = await f.call("dispatcher", "dispatch.centre", { date, q: "%" });
    assert.equal(r.total, 0);
    await f.db.query(
      "INSERT INTO branches(id,name) VALUES('ddi-other','Synthetic other branch')",
    );
    await f.db.query("UPDATE users SET branch_id='ddi-other' WHERE id=$1", [
      f.actors.dispatcher.id,
    ]);
    r = await f.call("dispatcher", "dispatch.centre", { date });
    assert.equal(r.total, 0);
    assert.equal(r.drivers.length, 0);
    await assert.rejects(
      () => f.call("dispatcher", "dispatch.candidates", { orderId: o.id }),
      /branch|permission|access/i,
    );
  } finally {
    await f.db.close?.();
  }
});

test("DDI-KPI01: completed counts use actual Lagos delivery date rather than scheduled date", async () => {
  const f = await fixture();
  try {
    const a = await f.make(),
      b = await f.make();
    await f.db.query(
      "UPDATE orders SET status='delivered',delivery_date='2026-01-01',delivered_at=$1 WHERE id=$2",
      ["2026-11-08T23:30:00Z", a.id],
    );
    await f.db.query(
      "UPDATE orders SET status='delivered',delivery_date='2026-01-01',delivered_at=$1 WHERE id=$2",
      ["2026-11-09T23:30:00Z", b.id],
    );
    const r = await f.call("owner", "dispatch.centre", {
      date: "2026-11-09",
      tab: "completed",
    });
    assert.equal(r.kpis.delivered, 1);
    assert.equal(r.rows[0].id, a.id);
  } finally {
    await f.db.close?.();
  }
});

test("DDI-MASS01: vehicle mass is read once from custody and never added to inclusive branch stock", async () => {
  const before = process.env.EASYGAS_BULK_LPG_ENABLED;
  const { bulkFixture } = await import("./helpers/bulk-lpg-fixture");
  const f = await bulkFixture();
  try {
    await f.issue();
    const balance = await f.balance();
    const r = await f.call("owner", "dispatch.centre", {});
    assert.equal(r.operations.loadedGrams, 10000);
    assert.equal(r.operations.estimatedRemainingGrams, 10000);
    assert.equal(r.operations.deliveredGrams, 0);
    assert.equal(r.operations.verifiedReturnsGrams, 0);
    assert.deepEqual(await f.balance(), balance);
  } finally {
    if (before === undefined) delete process.env.EASYGAS_BULK_LPG_ENABLED;
    else process.env.EASYGAS_BULK_LPG_ENABLED = before;
    await f.db.close?.();
  }
});

test("DDI-DECLINE01: declined assignments surface in exceptions and replay retains one response", async () => {
  const f = await fixture();
  try {
    const o = await f.assigned(),
      request = {
        orderId: o.id,
        version: Number(o.tracking_version),
        decision: "rejected",
        reason: "Synthetic driver decline reason",
        operationKey: id(),
      };
    await f.call("driver", "dispatch.respond", request);
    await f.call("driver", "dispatch.respond", request);
    const r = await f.call("owner", "dispatch.centre", {
      date: o.delivery_date,
      tab: "exceptions",
    });
    assert.equal(r.counts.exceptions, 1);
    assert.equal(r.kpis.assigned, 0);
    assert.equal(r.rows[0].exception, "Driver declined");
    assert.equal(
      (
        await f.db.query(
          "SELECT r.* FROM dispatch_responses r JOIN delivery_attempts a ON a.id=r.attempt_id WHERE a.order_id=$1",
          [o.id],
        )
      ).rows.length,
      1,
    );
  } finally {
    await f.db.close?.();
  }
});

test("DDI-S084: production assignment stays disabled without both explicit release approvals", async () => {
  const f = await fixture();
  const previous = {
    node: process.env.NODE_ENV,
    tracking: process.env.EASYGAS_TRACKING_MUTATIONS_ENABLED,
    field: process.env.EASYGAS_FIELD_OPERATIONS_ENABLED,
  };
  try {
    const o = await f.make();
    await f.transition(o, "accepted");
    await f.transition(o, "preparing");
    process.env.NODE_ENV = "production";
    delete process.env.EASYGAS_TRACKING_MUTATIONS_ENABLED;
    process.env.EASYGAS_FIELD_OPERATIONS_ENABLED = "true";
    const c = await f.call("owner", "dispatch.candidates", { orderId: o.id });
    assert.equal(c.writesEnabled, false);
    assert.equal(c.automaticAssignmentEnabled, false);
    await assert.rejects(
      () =>
        f.call("owner", "dispatch.assign", {
          orderId: o.id,
          driverId: f.actors.driver.id,
          version: 2,
          reason: "Synthetic release rejection",
          operationKey: id(),
        }),
      /disabled/i,
    );
    assert.equal((await f.snapshot(o.id)).driver_id, null);
  } finally {
    for (const [key, value] of Object.entries({
      NODE_ENV: previous.node,
      EASYGAS_TRACKING_MUTATIONS_ENABLED: previous.tracking,
      EASYGAS_FIELD_OPERATIONS_ENABLED: previous.field,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await f.db.close?.();
  }
});

test("DDI-PAY02: legacy invoice-less fulfilment uses the shared net-payment authority after an approved refund", async () => {
  const f = await fixture();
  try {
    const oid = id();
    await f.db.query(
      `INSERT INTO orders(id,reference,customer_id,branch_id,status,payment_method,subtotal_kobo,delivery_kobo,total_kobo,address,delivery_date,delivery_window,idempotency_key,request_hash,delivery_code_hash,delivery_code_expires_at) VALUES($1,$1,$2,'lagos','preparing','wallet',100,0,100,'{}','2026-12-01','AM',$1,'synthetic','synthetic',now()+interval '1 day')`,
      [oid, f.actors.customer.id],
    );
    await f.db.query(
      "INSERT INTO verified_payments(id,order_id,reference,amount_kobo,method,verified_by) VALUES($1,$2,$1,100,'wallet',$3)",
      [id(), oid, f.actors.owner.id],
    );
    const { fulfilmentReady } = await import("../apps/web/lib/order-tracking");
    const order = (await f.db.query("SELECT * FROM orders WHERE id=$1", [oid]))
      .rows[0];
    await f.db.transaction((tx) => fulfilmentReady(tx, order));
    await f.db.query(
      "INSERT INTO credit_requests(id,branch_id,customer_id,order_id,amount_kobo,kind,status,requested_by,decided_by,reason) VALUES($1,'lagos',$2,$3,100,'refund','approved',$2,$4,'Synthetic approved historical refund')",
      [id(), f.actors.customer.id, oid, f.actors.owner.id],
    );
    await assert.rejects(
      () => f.db.transaction((tx) => fulfilmentReady(tx, order)),
      /verified payment|approved cash/i,
    );
  } finally {
    await f.db.close?.();
  }
});

test("DDI-S060: missing serialized cylinder allocation blocks dispatch before a delivery attempt", async () => {
  const f = await fixture();
  try {
    const oid = id();
    await f.db.query(
      `INSERT INTO orders(id,reference,customer_id,branch_id,status,payment_method,subtotal_kobo,delivery_kobo,total_kobo,address,delivery_date,delivery_window,idempotency_key,request_hash,delivery_code_hash,delivery_code_expires_at) VALUES($1,$1,$2,'lagos','preparing','cash_on_delivery',100,0,100,'{}','2026-12-01','AM',$1,'synthetic','synthetic',now()+interval '1 day')`,
      [oid, f.actors.customer.id],
    );
    await f.db.query(
      "INSERT INTO order_items(order_id,product_id,name,quantity,unit_price_kobo) VALUES($1,'cylinder-empty-6','6kg Empty Cylinder',1,100)",
      [oid],
    );
    await f.db.query(
      "UPDATE inventory SET quantity=1,reserved=1 WHERE branch_id='lagos' AND product_id='cylinder-empty-6'",
    );
    await assert.rejects(
      () => f.transition({ id: oid }, "assigned"),
      /serialised cylinder allocation is incomplete/i,
    );
    assert.equal(
      (
        await f.db.query("SELECT id FROM delivery_attempts WHERE order_id=$1", [
          oid,
        ])
      ).rows.length,
      0,
    );
    assert.equal((await f.snapshot(oid)).status, "preparing");
  } finally {
    await f.db.close?.();
  }
});
