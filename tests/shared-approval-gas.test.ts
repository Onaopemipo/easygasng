import { verifiedPickup } from "./helpers/tracking-fixture";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createDatabase, migrate, one } from "../apps/web/lib/db";
import { id, hashPassword, issueSession } from "../apps/web/lib/auth";
import { dispatch } from "../apps/web/lib/service";
import { gasLine } from "../packages/business-rules/src/gas-pricing";
async function fixture() {
  const db = await createDatabase("memory://");
  await migrate(db);
  const users: Record<string, any> = {};
  const password = "Shared-fixture-only-123!";
  for (const role of [
    "owner",
    "manager",
    "finance",
    "sales",
    "inventory",
    "dispatcher",
    "customer",
    "driver",
  ]) {
    const uid = id();
    await db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES ($1,$2,$3,$4,$5,'lagos')",
      [uid, role, uid + "@example.test", hashPassword(password), role],
    );
    users[role] = { id: uid, token: await issueSession(db, uid) };
  }
  await db.query("UPDATE users SET driver_available=true WHERE id=$1",[users.driver.id]);
  const call = (role: string, action: string, input: any = {}) =>
    dispatch(action, users[role].token, input, db);
  for (const role of ["owner", "manager", "finance", "inventory"])
    await call(role, "reauth", { password });
  const value = (key: string) =>
    one(db, "SELECT * FROM settings WHERE key=$1 AND scope='lagos'", [key]);
  const propose = async (
    key: string,
    v: any,
    draft = false,
    effectiveAt?: string,
  ) =>
    call("manager", "setting.propose", {
      key,
      scope: "lagos",
      version: (await value(key))!.version,
      value: v,
      reason: "Synthetic business change for independent review",
      draft,
      ...(effectiveAt ? { effectiveAt } : {}),
    });
  const approve = (rid: string) =>
    call("owner", "approval.decide", {
      id: rid,
      decision: "approve",
      reason: "Independent fixture owner review",
    });
  return { db, users, call, value, propose, approve };
}
test("A–C,K: draft, permissions, status injection and independent review share one authoritative workflow", async () => {
  const f = await fixture();
  try {
    const r = await f.propose("gas.price_per_kg", 195000, true);
    assert.equal(r.state, "DRAFT");
    assert.equal((await f.value("gas.price_per_kg"))!.value, 180000);
    await assert.rejects(
      () =>
        f.call("sales", "setting.propose", {
          key: "gas.price_per_kg",
          scope: "lagos",
          value: 1,
          version: 1,
          reason: "Unauthorized change",
        }),
      /permission|authority|role/i,
    );
    await assert.rejects(() =>
      f.call("manager", "setting.propose", {
        key: "gas.price_per_kg",
        scope: "lagos",
        value: 195000,
        version: 1,
        reason: "Injected status",
        status: "ACTIVE",
      }),
    );
    await f.call("manager", "approval.submit", {
      id: r.id,
      reason: "Submit reviewed draft",
    });
    assert.equal(
      (await one(f.db, "SELECT status FROM change_requests WHERE id=$1", [
        r.id,
      ]))!.status,
      "pending_approval",
    );
    await assert.rejects(() =>
      f.call("manager", "approval.decide", {
        id: r.id,
        decision: "approve",
        reason: "",
      }),
    );
    await f.approve(r.id);
    assert.equal((await f.value("gas.price_per_kg"))!.value, 195000);
  } finally {
    await f.db.close?.();
  }
});
test("D,G: distinct dual approval and revisions invalidate prior decisions by revision", async () => {
  const f = await fixture();
  try {
    const p = await f.call("owner", "setting.propose", {
      key: "payment.settlement",
      scope: "lagos",
      version: 1,
      value: {
        bank: "Fixture bank",
        account: "0123456789",
        name: "Fixture account",
      },
      reason: "Synthetic settlement review",
    });
    await f.call("finance", "approval.decide", {
      id: p.id,
      decision: "approve",
      reason: "Finance review",
    });
    assert.equal(
      (await one(f.db, "SELECT status FROM change_requests WHERE id=$1", [
        p.id,
      ]))!.status,
      "partially_approved",
    );
    await assert.rejects(() =>
      f.call("finance", "approval.decide", {
        id: p.id,
        decision: "approve",
        reason: "Cannot count twice",
      }),
    );
    const secondOwner = id();
    await f.db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES ($1,'Second synthetic owner',$2,$3,'owner','lagos')",
      [
        secondOwner,
        secondOwner + "@example.test",
        hashPassword("Second-owner-fixture-only-123!"),
      ],
    );
    const token = await issueSession(f.db, secondOwner);
    await dispatch(
      "reauth",
      token,
      { password: "Second-owner-fixture-only-123!" },
      f.db,
    );
    await dispatch(
      "approval.decide",
      token,
      {
        id: p.id,
        decision: "approve",
        reason: "Second independent financial approval",
      },
      f.db,
    );
    assert.equal(
      (await one(f.db, "SELECT status FROM change_requests WHERE id=$1", [
        p.id,
      ]))!.status,
      "active",
    );
    const r = await f.propose("gas.price_per_kg", 190000);
    await f.call("owner", "approval.decide", {
      id: r.id,
      decision: "request_changes",
      reason: "Revise supplier evidence",
    });
    await f.call("manager", "approval.revise", {
      id: r.id,
      value: 195000,
      reason: "Updated supplier evidence",
    });
    assert.equal(
      (await one(
        f.db,
        "SELECT revision,status FROM change_requests WHERE id=$1",
        [r.id],
      ))!.revision,
      2,
    );
    await f.call("manager", "approval.submit", {
      id: r.id,
      reason: "Resubmit revised price",
    });
    await f.approve(r.id);
    assert.equal((await f.value("gas.price_per_kg"))!.value, 195000);
  } finally {
    await f.db.close?.();
  }
});
test("E,H,J,O: schedule, stale requests, idempotent activation and append-only reversal", async () => {
  const f = await fixture();
  try {
    const a = await f.propose(
      "gas.price_per_kg",
      190000,
      false,
      new Date(Date.now() + 3600000).toISOString(),
    );
    await f.approve(a.id);
    assert.equal((await f.value("gas.price_per_kg"))!.value, 180000);
    const b = await f.propose("gas.price_per_kg", 195000);
    await f.approve(b.id);
    await f.db.query(
      "UPDATE change_requests SET effective_at=now()-interval '1 second' WHERE id=$1",
      [a.id],
    );
    await f.call("owner", "approval.activate", { id: a.id });
    assert.equal(
      (await one(f.db, "SELECT status FROM change_requests WHERE id=$1", [
        a.id,
      ]))!.status,
      "superseded",
    );
    await Promise.all([
      f.call("owner", "approval.activate", { id: b.id }),
      f.call("owner", "approval.activate", { id: b.id }),
    ]);
    assert.equal(
      (await one(
        f.db,
        "SELECT count(*)::int n FROM setting_versions WHERE request_id=$1",
        [b.id],
      ))!.n,
      1,
    );
    const version = await one(
      f.db,
      "SELECT id FROM setting_versions WHERE request_id=$1",
      [b.id],
    );
    const rollback = await f.call("manager", "setting.rollback", {
      versionId: version!.id,
      reason: "Restore prior approved gas price",
    });
    await f.approve(rollback.id);
    assert.equal((await f.value("gas.price_per_kg"))!.value, 180000);
    assert.equal((await f.value("gas.price_per_kg"))!.version, 3);
    assert.equal(
      (await one(f.db, "SELECT status FROM change_requests WHERE id=$1", [
        b.id,
      ]))!.status,
      "rolled_back",
    );
  } finally {
    await f.db.close?.();
  }
});
test("F,L,M,N: fee rejection, expired request, revoked approver and governed location lifecycle", async () => {
  const f = await fixture();
  try {
    const r = await f.propose("delivery.fee", 600000);
    await f.call("owner", "approval.decide", {
      id: r.id,
      decision: "reject",
      reason: "Keep approved flat fee",
    });
    assert.equal((await f.value("delivery.fee"))!.value, 500000);
    const location = (await f.value("location.lekki"))!;
    const l = await f.propose("location.lekki", {
      ...location.value,
      active: false,
      visible: false,
    });
    assert.equal(
      (await one(
        f.db,
        "SELECT active FROM delivery_locations WHERE id='lekki'",
      ))!.active,
      true,
    );
    await f.approve(l.id);
    assert.equal(
      (await one(
        f.db,
        "SELECT active FROM delivery_locations WHERE id='lekki'",
      ))!.active,
      false,
    );
    const expired = await f.propose("gas.price_per_kg", 200000);
    await f.db.query(
      "UPDATE change_requests SET expires_at=now()-interval '1 second' WHERE id=$1",
      [expired.id],
    );
    await assert.rejects(() => f.approve(expired.id));
    await f.db.query("UPDATE users SET role='sales' WHERE id=$1", [
      f.users.owner.id,
    ]);
    const newRequest = await f.propose("gas.price_per_kg", 205000);
    await assert.rejects(() => f.approve(newRequest.id));
  } finally {
    await f.db.close?.();
  }
});
test("I: activation database failure leaves active value intact, records failure, and revalidates a retry", async () => {
  const f = await fixture();
  try {
    await f.db.exec(
      "CREATE FUNCTION fixture_price_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.key='gas.price_per_kg' THEN RAISE EXCEPTION 'Controlled activation failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER fixture_price_failure BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION fixture_price_failure();",
    );
    const r = await f.propose("gas.price_per_kg", 195000);
    await f.approve(r.id);
    assert.equal((await f.value("gas.price_per_kg"))!.value, 180000);
    assert.equal(
      (await one(f.db, "SELECT status FROM change_requests WHERE id=$1", [
        r.id,
      ]))!.status,
      "failed",
    );
    assert.ok(
      await one(
        f.db,
        "SELECT id FROM notifications WHERE related_id=$1 AND title='Approval failed'",
        [r.id],
      ),
    );
    await f.db.exec("DROP TRIGGER fixture_price_failure ON settings");
    await f.call("owner", "approval.retry", {
      id: r.id,
      reason: "Controlled failure cause removed",
    });
    assert.equal((await f.value("gas.price_per_kg"))!.value, 195000);
  } finally {
    await f.db.close?.();
  }
});
test("decimal calculator matches confirmed gas quantities and rejects unsafe precision", () => {
  for (const [kg, total] of [
    [3, 1040000],
    [6, 1580000],
    [7.5, 1850000],
    [12.5, 2750000],
    [25, 5000000],
    [50, 9500000],
  ])
    assert.equal(gasLine(kg, kg, 180000).subtotalKobo + 500000, total);
  assert.equal(
    gasLine(7, 12.5, 180000).subtotalKobo +
      gasLine(4, 6, 180000).subtotalKobo +
      500000,
    2480000,
  );
  for (const n of [0, -1, 1.0001, NaN])
    assert.throws(() => gasLine(n, 12.5, 180000));
  assert.throws(() => gasLine(13, 12.5, 180000));
});
test("gas checkout snapshots prices, charges one fee, reserves grams once, prevents stale prices and preserves safety", async () => {
  const f = await fixture();
  try {
    await f.db.query(
      "UPDATE settings SET value='true' WHERE key IN ('delivery.enabled','payment.cod')",
    );
    const policy = {
      minimumKg: 0.5,
      maximumKg: 50,
      incrementKg: 0.5,
      precision: 1,
      capacitiesKg: [3, 6, 12.5, 25, 50],
    };
    const change = await f.propose("gas.quantity_policy", policy);
    await f.approve(change.id);
    const location = (await f.value("location.lekki"))!;
    const coverage = await f.propose("location.lekki", {
      ...location.value,
      coverage: "Synthetic district boundary confirmed for fixture only",
    });
    await f.approve(coverage.id);
    await f.call("inventory", "gas.stock.receive", {
      branchId: "lagos",
      grams: 11000,
      reference: "Synthetic-bulk-receipt",
      reason: "Synthetic physically counted receipt",
    });
    const lines = [
      { capacityKg: 12.5, kg: 7 },
      { capacityKg: 6, kg: 4 },
    ];
    const q = await dispatch("gas.quote", null, { lines }, f.db);
    const request = {
      items: [],
      gasLines: lines,
      pricing: {
        priceVersion: q.priceVersion,
        feeVersion: q.feeVersion,
        policyVersion: q.policyVersion,
        totalKobo: q.subtotalKobo + q.deliveryKobo,
      },
      address: {
        locationId: "lekki",
        zone: "Lekki",
        name: "Synthetic customer",
        phone: "08012345678",
        street: "12 Synthetic Street",
        building: "12",
      },
      date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      window: "14:00–18:00",
      idempotencyKey: id(),
    };
    const [a, b] = await Promise.all([
      f.call("customer", "checkout", request),
      f.call("customer", "checkout", request),
    ]);
    assert.equal(a.id, b.id);
    assert.equal(Number(a.total_kobo), 2480000);
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT reserved_grams FROM gas_stock WHERE branch_id='lagos'",
        ))!.reserved_grams,
      ),
      11000,
    );
    await assert.rejects(
      () =>
        f.call("customer", "checkout", { ...request, idempotencyKey: id() }),
      /Insufficient verified gas/,
    );
    await assert.rejects(() =>
      f.call("owner", "order.transition", {
        id: a.id,
        status: "assigned",
        driverId: f.users.driver.id,
        note: "Must not bypass inspection",
      }),
    );
    const price = await f.propose("gas.price_per_kg", 195000);
    await f.approve(price.id);
    assert.equal(
      Number(
        (await one(f.db, "SELECT total_kobo FROM orders WHERE id=$1", [a.id]))!
          .total_kobo,
      ),
      2480000,
    );
    await assert.rejects(
      () =>
        f.call("customer", "checkout", { ...request, idempotencyKey: id() }),
      /Pricing or quantity rules changed/,
    );
    await f.call("customer", "order.transition", {
      id: a.id,
      status: "cancelled",
      note: "Release synthetic reservation",
    });
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT reserved_grams FROM gas_stock WHERE branch_id='lagos'",
        ))!.reserved_grams,
      ),
      0,
    );
  } finally {
    await f.db.close?.();
  }
});
test("delivery fee is once per order in every area; inactive locations retain addresses and flag affected orders", async () => {
  const f = await fixture();
  try {
    await f.db.query(
      "UPDATE settings SET value='true' WHERE key IN ('delivery.enabled','payment.cod')",
    );
    await f.db.query(
      "UPDATE delivery_locations SET coverage='Synthetic business-confirmed test coverage definition'",
    );
    await f.db.query("UPDATE gas_stock SET grams=100000");
    await f.db.query(
      "UPDATE settings SET value=$1 WHERE key='gas.quantity_policy'",
      [
        JSON.stringify({
          minimumKg: 0.5,
          maximumKg: 50,
          incrementKg: 0.5,
          precision: 1,
          capacitiesKg: [3, 6, 12.5, 25, 50],
        }),
      ],
    );
    const lines = [{ capacityKg: 3, kg: 3 }],
      q = await dispatch("gas.quote", null, { lines }, f.db),
      pricing = {
        priceVersion: q.priceVersion,
        feeVersion: q.feeVersion,
        policyVersion: q.policyVersion,
        totalKobo: q.subtotalKobo + q.deliveryKobo,
      };
    let ajah: any;
    for (const [locationId, zone] of [
      ["lagos-island", "Lagos Island"],
      ["victoria-island", "Victoria Island"],
      ["lekki", "Lekki"],
      ["ajah", "Ajah"],
    ]) {
      const request = {
        items: [],
        gasLines: lines,
        pricing,
        address: {
          locationId,
          zone,
          name: "Synthetic customer",
          phone: "08012345678",
          street: "12 Synthetic Avenue",
          building: "12",
        },
        date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
        window: "14:00–18:00",
        idempotencyKey: id(),
      };
      const order = await f.call("customer", "checkout", request);
      assert.equal(Number(order.delivery_kobo), 500000);
      if (locationId === "ajah") ajah = { order, request };
    }
    const address = await f.call("customer", "address.save", {
      label: "Synthetic default",
      locationId: "ajah",
      street: "12 Synthetic Avenue",
      phone: "08012345678",
      building: "12",
      isDefault: true,
    });
    assert.equal(
      (await f.call("customer", "account.profile")).addresses.find(
        (a: any) => a.id === address.id,
      ).is_default,
      true,
    );
    const loc = (await f.value("location.ajah"))!;
    const change = await f.propose("location.ajah", {
      ...loc.value,
      active: false,
      visible: false,
    });
    await f.approve(change.id);
    const historical = await one(
      f.db,
      "SELECT location_snapshot,operational_review FROM orders WHERE id=$1",
      [ajah.order.id],
    );
    assert.equal(historical!.location_snapshot.name, "Ajah");
    assert.match(historical!.operational_review, /no longer active/);
    assert.equal(
      (await f.call("customer", "account.profile")).addresses.find(
        (a: any) => a.id === address.id,
      ).location_available,
      false,
    );
    await assert.rejects(
      () =>
        f.call("customer", "checkout", {
          ...ajah.request,
          idempotencyKey: id(),
        }),
      /active supported delivery location/,
    );
    const report = await f.call("owner", "gas.report", {});
    assert.equal(report.summary.orderedKg, 12);
    assert.equal(report.orders.length, 4);
    assert.equal(report.byLocation.length, 4);
  } finally {
    await f.db.close?.();
  }
});
test("verified gas-cylinder filling and delivery consume bulk stock once and preserve custody restrictions", async () => {
  const f = await fixture();
  const oldRewardsFlag = process.env.EASYGAS_REWARDS_ISSUANCE_ENABLED;
  process.env.EASYGAS_REWARDS_ISSUANCE_ENABLED = "true";
  try {
    const ownerId = id();
    await f.db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,'Rewards fixture owner',$2,$3,'owner','lagos')",
      [
        ownerId,
        ownerId + "@gas-rewards.test",
        hashPassword("Shared-fixture-only-123!"),
      ],
    );
    f.users.owner2 = { id: ownerId, token: await issueSession(f.db, ownerId) };
    await f.call("owner2", "reauth", { password: "Shared-fixture-only-123!" });
    const policy = await f.call("owner", "setting.propose", {
      key: "loyalty.policy",
      scope: "lagos",
      version: 1,
      value: {
        earningEnabled: true,
        redemptionEnabled: false,
        spendPerPointKobo: 10000,
        discountPerPointKobo: 100,
        minimumPoints: 500,
        maximumDiscountBps: 2000,
        eligibleCategories: ["Gas refills"],
        referralEnabled: false,
        referralPoints: 0,
      },
      reason: "Synthetic independently approved verified gas rewards policy",
    });
    for (const role of ["owner2", "finance"])
      await f.call(role, "approval.decide", {
        id: policy.id,
        decision: "approve",
        reason: "Independent synthetic gas rewards approval",
      });

    await f.db.query(
      "UPDATE settings SET value='true' WHERE key IN ('delivery.enabled','payment.cod')",
    );
    await f.db.query(
      "UPDATE delivery_locations SET coverage='Synthetic physically verified coverage for test only'",
    );
    await f.db.query("UPDATE gas_stock SET grams=6000");
    await f.db.query(
      "UPDATE settings SET value=$1 WHERE key='gas.quantity_policy'",
      [
        JSON.stringify({
          minimumKg: 0.5,
          maximumKg: 50,
          incrementKg: 0.5,
          precision: 1,
          capacitiesKg: [6, 12.5],
        }),
      ],
    );
    const lines = [{ capacityKg: 6, kg: 6 }],
      q = await dispatch("gas.quote", null, { lines }, f.db),
      o = await f.call("customer", "checkout", {
        items: [],
        gasLines: lines,
        pricing: {
          priceVersion: q.priceVersion,
          feeVersion: q.feeVersion,
          policyVersion: q.policyVersion,
          totalKobo: q.subtotalKobo + q.deliveryKobo,
        },
        address: {
          name: "Synthetic customer",
          phone: "08012345678",
          street: "12 Synthetic Street",
          zone: "Lekki",
          locationId: "lekki",
        },
        date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
        window: "14:00–18:00",
        idempotencyKey: id(),
      });
    for (const status of ["accepted", "preparing"])
      await f.call("owner", "order.transition", {
        id: o.id,
        status,
        note: "Synthetic order preparation",
      });
    await assert.rejects(
      () =>
        f.call("owner", "order.transition", {
          id: o.id,
          status: "assigned",
          driverId: f.users.driver.id,
          note: "Cannot bypass physical inspection",
        }),
      /inspection/,
    );
    const line = await one(
      f.db,
      "SELECT id FROM order_gas_lines WHERE order_id=$1",
      [o.id],
    );
    const intake = await f.call("inventory", "gas.cylinder.intake", {
      lineId: line!.id,
      serial: "SYNTHETIC-" + id(),
      sizeKg: 6,
      testDue: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
      reason: "Synthetic verified customer ownership and physical intake",
    });
    const cylinder = intake.id;
    assert.equal(
      (await one(f.db, "SELECT status FROM cylinders WHERE id=$1", [cylinder]))!
        .status,
      "quarantined",
    );
    await f.call("owner", "technician.qualify", {
      userId: f.users.inventory.id,
      code: "cylinder_inspection",
      evidence: "Synthetic independently verified physical inspector",
      expiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
    });
    await f.call("inventory", "cylinder.inspect", {
      id: cylinder,
      passed: true,
      notes: "Synthetic documented physical inspection evidence",
      nextDue: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    });
    await f.call("inventory", "gas.inspection.record", {
      lineId: line!.id,
      cylinderId: cylinder,
      allowableKg: 6,
      reason:
        "Synthetic physical intake, inspection and residual fill evidence",
    });
    await f.call("owner", "delivery.coverage.confirm", {
      orderId: o.id,
      reason:
        "Synthetic verified street address within the approved test coverage",
    });
    await f.call("owner", "order.transition", {
      id: o.id,
      status: "assigned",
      driverId: f.users.driver.id,
      note: "Synthetic verified dispatch assignment",
    });
    await verifiedPickup(f.call, o.id);
    await f.call("driver", "order.transition", {
      id: o.id,
      status: "out_for_delivery",
      note: "Synthetic driver collection",
    });
    const code = (await f.call("customer", "orders")).find(
      (x: any) => x.id === o.id,
    ).confirmation_code;
    await f.call("driver", "delivery.complete", {
      handover: true,
      orderId: o.id,
      code,
      collectedKobo: Number(o.total_kobo),
    });
    await f.call("driver", "delivery.complete", {
      handover: true,
      orderId: o.id,
      code,
      collectedKobo: Number(o.total_kobo),
    });
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT grams FROM gas_stock WHERE branch_id='lagos'",
        ))!.grams,
      ),
      0,
    );
    assert.equal(
      (await one(f.db, "SELECT status FROM cylinders WHERE id=$1", [cylinder]))!
        .status,
      "filled",
    );
    assert.equal(
      (await one(
        f.db,
        "SELECT count(*)::int n FROM gas_stock_movements WHERE reference=$1",
        [o.id + ":fulfilled"],
      ))!.n,
      1,
    );
    const report = await f.call("owner", "gas.report", {});
    assert.equal(report.summary.deliveredKg, 6);
    assert.equal(report.summary.gasRevenueKobo, 1080000);
    assert.equal(report.summary.verifiedPaymentsKobo, 0);
    assert.equal(report.summary.outstandingKobo, 1580000);
    const { processRewards } = await import("../apps/web/lib/rewards");
    await f.db.transaction(processRewards);
    assert.equal((await f.call("customer", "wallet")).points, 0);
    const collection = await one(
      f.db,
      "SELECT id FROM cash_collections WHERE order_id=$1",
      [o.id],
    );
    await f.call("finance", "cash.reconcile", { id: collection!.id });
    await f.db.transaction(processRewards);
    await f.db.transaction(processRewards);
    assert.equal((await f.call("customer", "wallet")).points, 108);
  } finally {
    if (oldRewardsFlag === undefined)
      delete process.env.EASYGAS_REWARDS_ISSUANCE_ENABLED;
    else process.env.EASYGAS_REWARDS_ISSUANCE_ENABLED = oldRewardsFlag;
    await f.db.close?.();
  }
});
test("gas report exports preserve totals and escape untrusted spreadsheet and HTML text", async () => {
  const { gasReportRows, gasReportCsv, gasReportExcel, gasReportHtml } =
    await import("../packages/business-rules/src/gas-report-export");
  const rows = gasReportRows({
    orders: [
      {
        reference: '=HYPERLINK("bad")',
        status: "delivered",
        payment_status: "collected",
        location_snapshot: { name: "<script>alert(1)</script>" },
        gas_lines: [{ grams: 7500, subtotal_kobo: 1350000 }],
        delivery_kobo: 500000,
        total_kobo: 1850000,
      },
    ],
  });
  assert.match(gasReportCsv(rows), /'=HYPERLINK/);
  assert.ok(!gasReportHtml(rows).includes("<script>"));
  assert.match(gasReportExcel(rows), /ss:Type="Number">1850000/);
});
test("confirmed cylinder maintenance is an unpublished draft governed by the existing service and safety approvals", async () => {
  const f = await fixture();
  try {
    const service = await one(
      f.db,
      "SELECT * FROM service_catalogue WHERE id='cylinder-maintenance' AND branch_id='lagos'",
    );
    assert.equal(service!.config.active, false);
    assert.equal(service!.config.priceKobo, null);
    assert.equal(service!.checklist_version, 0);
    assert.equal(
      (await f.value("service.cylinder-maintenance"))!.value.active,
      false,
    );
    assert.ok(
      await one(
        f.db,
        "SELECT key FROM setting_definitions WHERE key='checklist.cylinder-maintenance' AND risk=4",
      ),
    );
  } finally {
    await f.db.close?.();
  }
});

test("COMPACT-QUOTE01: selected location gates a read-only fractional quote without reserving stock", async () => {
  const f = await fixture();
  try {
    const location = await one(f.db, "SELECT id FROM delivery_locations WHERE branch_id='lagos' AND active=true AND visible=true LIMIT 1");
    assert.ok(location);
    await f.db.query("UPDATE delivery_locations SET coverage='Confirmed synthetic coverage boundary' WHERE id=$1", [location.id]);
    await f.db.query("UPDATE settings SET value='true' WHERE key='delivery.enabled' AND scope='lagos'");
    await f.db.query("UPDATE settings SET value=$1 WHERE key='gas.quantity_policy' AND scope='lagos'", [
      JSON.stringify({ minimumKg: .5, maximumKg: 50, incrementKg: .5, precision: 1, capacitiesKg: [6, 12.5] }),
    ]);
    await f.db.query("UPDATE settings SET value='182900' WHERE key='gas.price_per_kg' AND scope='lagos'");
    await f.db.query("UPDATE settings SET value='510000' WHERE key='delivery.fee' AND scope='lagos'");
    await f.db.query("UPDATE gas_stock SET grams=10000,reserved_grams=0 WHERE branch_id='lagos'");
    const input = { locationId: location.id, branchId: "lagos", lines: [{ capacityKg: 12.5, kg: 2.5 }] };
    const quote = (body = input) => dispatch("gas.quote", null, body, f.db);
    const result = await quote();
    assert.equal(result.subtotalKobo, 457250);
    assert.equal(result.deliveryKobo, 510000);
    assert.equal(Number((await one(f.db, "SELECT reserved_grams FROM gas_stock WHERE branch_id='lagos'"))?.reserved_grams), 0);
    await assert.rejects(() => quote({ ...input, branchId: "wrong-branch" }), /active supported/);
    await f.db.query("UPDATE gas_stock SET reserved_grams=9000 WHERE branch_id='lagos'");
    await assert.rejects(() => quote(), /Insufficient verified gas stock/);
    await f.db.query("UPDATE delivery_locations SET active=false WHERE id=$1", [location.id]);
    await assert.rejects(() => quote(), /active supported/);
  } finally {
    await f.db.close?.();
  }
});
