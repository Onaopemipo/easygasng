import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers/order-tracking-fixture";
import { id, issueSession } from "../apps/web/lib/auth";
import { one, type DB } from "../apps/web/lib/db";
import { dispatch } from "../apps/web/lib/service";
import { Pool } from "pg";

async function setup(db?: DB) {
  const f = await fixture(db);
  for (const role of ["owner", "dispatcher", "inventory"])
    await f.call(role, "reauth", { password: "Tracking-fixture-only-123!" });
  const vehicle = async (label: string) =>
    f.call("owner", "fleet.vehicle.create", {
      branchId: "lagos",
      label,
      capacityGrams: 30000,
      physicalCapacityGrams: 30000,
      lpgSuitable: true,
      operationKey: id(),
    });
  const first = await vehicle("Synthetic current vehicle"),
    second = await vehicle("Synthetic replacement vehicle");
  const trip = await f.call("owner", "dispatch.vehicle.assign", {
    driverId: f.actors.driver.id,
    vehicleId: first.id,
    startOdometer: 100,
    makeAvailable: false,
    operationKey: id(),
  });
  const body = (extra = {}) => ({
    tripId: trip.id,
    version: 1,
    endOdometer: 120,
    operationKey: id(),
    ...extra,
  });
  const current = () =>
    one(f.db, "SELECT * FROM driver_trips WHERE id=$1", [trip.id]);
  return { ...f, first, second, trip, body, current };
}
const denied = (code: number) => (e: any) => e.status === code;

test("TC-END: owner/manager end a reconciled driver trip with their own audited identity and password; GPS stops, availability stays and exact replay creates no duplicate", async () => {
  const f = await setup();
  try {
    const t = await f.current();
    const request = f.body({ version: t!.version });
    await f.db.query(
      "UPDATE driver_trips SET location_consent=true WHERE id=$1",
      [f.trip.id],
    );
    const before = (
      await f.db.query("SELECT driver_available FROM users WHERE id=$1", [
        f.actors.driver.id,
      ])
    ).rows;
    assert.equal(
      (
        await f.call("dispatcher", "dispatch.trip.review", {
          tripId: f.trip.id,
        })
      ).reconciliation.clear,
      true,
    );
    const result = await f.call("dispatcher", "dispatch.trip.end", request);
    assert.equal(result.stopLocation, true);
    assert.equal(
      (await f.call("dispatcher", "dispatch.trip.end", request)).id,
      result.id,
    );
    const ended = await f.current();
    assert.ok(ended!.ended_at);
    assert.equal(Number(ended!.end_odometer), 120);
    assert.equal(ended!.location_consent, false);
    assert.equal(Number(ended!.version), Number(t!.version) + 1);
    assert.deepEqual(
      (
        await f.db.query("SELECT driver_available FROM users WHERE id=$1", [
          f.actors.driver.id,
        ])
      ).rows,
      before,
    );
    const audit = (
      await f.db.query(
        "SELECT * FROM audit_events WHERE action='dispatch.trip.end'",
      )
    ).rows;
    assert.equal(audit.length, 1);
    assert.equal(audit[0].actor_id, f.actors.dispatcher.id);
    assert.equal(audit[0].detail.driverId, f.actors.driver.id);
    await assert.rejects(
      () =>
        f.call("owner", "dispatch.trip.end", f.body({ version: t!.version })),
      (e: any) => e.code === "TRIP_VERSION_CONFLICT",
    );
  } finally {
    await f.db.close?.();
  }
});

test("TC-CHANGE: vehicle replacement atomically closes the old trip and starts one new trip with separate odometers, no GPS consent and unchanged availability", async () => {
  const f = await setup();
  try {
    const old = await f.current(),
      request = f.body({
        version: old!.version,
        vehicleId: f.second.id,
        startOdometer: 9000,
      });
    const result = await f.call("owner", "dispatch.trip.change", request);
    assert.ok(result.newTripId);
    assert.equal(
      (await f.call("owner", "dispatch.trip.change", request)).newTripId,
      result.newTripId,
    );
    const original = await f.current(),
      next = await one(f.db, "SELECT * FROM driver_trips WHERE id=$1", [
        result.newTripId,
      ]);
    assert.ok(original!.ended_at);
    assert.equal(Number(original!.end_odometer), 120);
    assert.equal(Number(next!.start_odometer), 9000);
    assert.equal(next!.vehicle_id, f.second.id);
    assert.equal(next!.driver_id, f.actors.driver.id);
    assert.equal(next!.location_consent, false);
    assert.equal(
      (await f.db.query("SELECT id FROM driver_trips WHERE ended_at IS NULL"))
        .rows.length,
      1,
    );
    f.actors.driver.token = await issueSession(
      f.db,
      f.actors.driver.id,
      "driver",
    );
    assert.equal(
      (await f.call("driver", "driver.snapshot")).trip.id,
      result.newTripId,
    );
    assert.equal(
      (
        await f.db.query(
          "SELECT * FROM audit_events WHERE action='dispatch.trip.change'",
        )
      ).rows.length,
      1,
    );
    await assert.rejects(
      () =>
        f.call("owner", "dispatch.trip.change", {
          ...request,
          startOdometer: 9001,
        }),
      (e: any) => e.code === "IDEMPOTENCY_CONFLICT",
    );
  } finally {
    await f.db.close?.();
  }
});

test("TC-CUSTODY: every unreconciled product/LPG state and assigned/outbound/held failed delivery blocks both admin actions without clearing custody; driver baseline still blocks physical loads", async () => {
  const f = await setup();
  try {
    const load = id(),
      meter = id(),
      lpg = id();
    await f.db.query(
      "INSERT INTO vehicle_product_loads(id,trip_id,branch_id,product_id,quantity,unit_weight_grams,available,issued_by,evidence) VALUES($1,$2,'lagos','hose',1,500,1,$3,'Synthetic custody evidence')",
      [load, f.trip.id, f.actors.inventory.id],
    );
    await f.db.query(
      "INSERT INTO bulk_lpg_meters(id,vehicle_id,serial,calibration_reference,calibration_expires_at,recorded_by) VALUES($1,$2,$1,'Synthetic calibration',now()+interval '1 day',$3)",
      [meter, f.first.id, f.actors.owner.id],
    );
    await f.db.query(
      "INSERT INTO bulk_lpg_loads(id,trip_id,meter_id,branch_id,loaded_grams,buffer_grams,meter_reading_grams,issued_by) VALUES($1,$2,$3,'lagos',1000,1000,1000,$4)",
      [lpg, f.trip.id, meter, f.actors.inventory.id],
    );
    for (const state of ["issued", "active", "returning", "held"]) {
      await f.db.query(
        "UPDATE vehicle_product_loads SET state=$1 WHERE id=$2",
        [state, load],
      );
      await f.db.query("UPDATE bulk_lpg_loads SET state=$1 WHERE id=$2", [
        state,
        lpg,
      ]);
      const r = await f.call("owner", "dispatch.trip.review", {
        tripId: f.trip.id,
      });
      assert.deepEqual(
        r.reconciliation.blockers.map((b: any) => b.code),
        ["PRODUCT_RECONCILIATION", "LPG_RECONCILIATION"],
      );
      for (const action of ["dispatch.trip.end", "dispatch.trip.change"])
        await assert.rejects(
          () =>
            f.call(
              "owner",
              action,
              f.body(
                action.endsWith("change")
                  ? { vehicleId: f.second.id, startOdometer: 1 }
                  : {},
              ),
            ),
          (e: any) => e.code === "TRIP_RECONCILIATION_REQUIRED",
        );
      await assert.rejects(
        () =>
          f.call("driver", "trip.end", {
            tripId: f.trip.id,
            endOdometer: 120,
            operationKey: id(),
          }),
        denied(409),
      );
      assert.equal((await f.current())!.ended_at, null);
    }
    await f.db.query(
      "UPDATE vehicle_product_loads SET state='reconciled' WHERE id=$1",
      [load],
    );
    await f.db.query(
      "UPDATE bulk_lpg_loads SET state='reconciled' WHERE id=$1",
      [lpg],
    );
    const order = await f.make();
    for (const state of ["assigned", "out_for_delivery"]) {
      await f.db.query("UPDATE orders SET status=$1,driver_id=$2 WHERE id=$3", [
        state,
        f.actors.driver.id,
        order.id,
      ]);
      await assert.rejects(
        () => f.call("owner", "dispatch.trip.end", f.body()),
        (e: any) => e.code === "TRIP_RECONCILIATION_REQUIRED",
      );
    }
    await f.db.query("UPDATE orders SET status='delivery_failed' WHERE id=$1", [
      order.id,
    ]);
    await f.db.query(
      "INSERT INTO delivery_attempts(id,order_id,driver_id,assignment_version,state,picked_up_at) VALUES($1,$2,$3,1,'failed',now())",
      [id(), order.id, f.actors.driver.id],
    );
    const held = await f.call("owner", "dispatch.trip.review", {
      tripId: f.trip.id,
    });
    assert.equal(held.reconciliation.blockers[0].code, "HELD_DELIVERY_CUSTODY");
    await assert.rejects(
      () =>
        f.call(
          "owner",
          "dispatch.trip.change",
          f.body({ vehicleId: f.second.id, startOdometer: 1 }),
        ),
      denied(409),
    );
    assert.equal((await f.current())!.ended_at, null);
  } finally {
    await f.db.close?.();
  }
});

test("TC-RECEIVE: actual qualified manifest return and independent receipt clears the existing reconciliation gate before admin closure", async () => {
  const f = await setup(),
    env = { ...process.env };
  process.env.EASYGAS_DOORSTEP_ENABLED = "true";
  process.env.EASYGAS_BULK_LPG_ENABLED = "true";
  try {
    await f.call("owner", "technician.qualify", {
      userId: f.actors.inventory.id,
      code: "inventory_safety",
      evidence: "Synthetic independently checked qualification",
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });
    const run = (role: string, action: string, input: any) =>
      f.call(role, action, { ...input, operationKey: id() });
    const why = {
      evidence: "Synthetic measured physical count",
      reason: "Synthetic manifest custody check",
    };
    const load = await run("inventory", "manifest.issue", {
      tripId: f.trip.id,
      productId: "hose",
      quantity: 2,
      unitWeightGrams: 500,
      serialIds: [],
      ...why,
    });
    await assert.rejects(
      () => f.call("owner", "dispatch.trip.end", f.body()),
      denied(409),
    );
    await run("driver", "manifest.acknowledge", {
      manifestId: load.id,
      version: 1,
      quantity: 2,
      serialIds: [],
      ...why,
    });
    await run("driver", "manifest.return.declare", {
      manifestId: load.id,
      version: 2,
      quantity: 2,
      serialIds: [],
      ...why,
    });
    await assert.rejects(
      () =>
        f.call(
          "owner",
          "dispatch.trip.change",
          f.body({ vehicleId: f.second.id, startOdometer: 1 }),
        ),
      denied(409),
    );
    await run("inventory", "manifest.return.receive", {
      manifestId: load.id,
      version: 3,
      foundQuantity: 2,
      saleableQuantity: 2,
      foundSerialIds: [],
      saleableSerialIds: [],
      ...why,
    });
    assert.equal(
      (await f.call("owner", "dispatch.trip.review", { tripId: f.trip.id }))
        .reconciliation.clear,
      true,
    );
    await f.call("owner", "dispatch.trip.end", f.body());
    assert.ok((await f.current())!.ended_at);
  } finally {
    process.env = env;
    await f.db.close?.();
  }
});

test("TC-AUTH: all roles, branch/revoked/password/release/version/odometer/replacement exceptions fail closed and preserve the original trip", async () => {
  const f = await setup(),
    env = { ...process.env };
  try {
    const tech = id();
    await f.db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) SELECT $1,'Synthetic technician',$2,password_hash,'technician','lagos' FROM users WHERE id=$3",
      [tech, tech + "@tc.test", f.actors.driver.id],
    );
    f.actors.technician = { id: tech, token: await issueSession(f.db, tech) };
    for (const role of [
      "driver",
      "customer",
      "commercial",
      "inventory",
      "technician",
    ])
      for (const action of [
        "dispatch.trip.options",
        "dispatch.trip.review",
        "dispatch.trip.end",
        "dispatch.trip.change",
      ])
        await assert.rejects(
          () =>
            f.call(role, action, action.endsWith("options") ? {} : f.body()),
          denied(403),
        );
    await assert.rejects(
      () => dispatch("dispatch.trip.options", null, {}, f.db),
      denied(401),
    );
    await f.db.query(
      "UPDATE sessions SET verified_at=now()-interval '6 minutes' WHERE user_id=$1",
      [f.actors.owner.id],
    );
    await assert.rejects(
      () => f.call("owner", "dispatch.trip.end", f.body()),
      (e: any) => e.code === "REAUTH_REQUIRED",
    );
    await f.call("owner", "reauth", { password: "Tracking-fixture-only-123!" });
    await f.db.exec(
      "INSERT INTO branches(id,name) VALUES('tc-private','Synthetic private branch')",
    );
    await f.db.query("UPDATE users SET branch_id='tc-private' WHERE id=$1", [
      f.actors.dispatcher.id,
    ]);
    assert.equal(
      (await f.call("dispatcher", "dispatch.trip.options")).trips.length,
      0,
    );
    await assert.rejects(
      () => f.call("dispatcher", "dispatch.trip.review", { tripId: f.trip.id }),
      denied(403),
    );
    await assert.rejects(
      () => f.call("dispatcher", "dispatch.trip.end", f.body()),
      denied(403),
    );
    await f.db.query("UPDATE users SET branch_id='lagos' WHERE id=$1", [
      f.actors.dispatcher.id,
    ]);
    await f.db.query(
      "INSERT INTO staff_privilege_overrides(user_id,privilege,effect,changed_by,role_at_change,branch_at_change) VALUES($1,'dispatch.manage','deny',$2,'manager','lagos')",
      [f.actors.dispatcher.id, f.actors.owner.id],
    );
    await assert.rejects(
      () => f.call("dispatcher", "dispatch.trip.end", f.body()),
      (e: any) => e.code === "PRIVILEGE_REVOKED",
    );
    for (const extra of [
      { version: 999 },
      { endOdometer: 99 },
      { endOdometer: 10000001 },
    ])
      await assert.rejects(() =>
        f.call("owner", "dispatch.trip.end", f.body(extra)),
      );
    const before = await f.current();
    for (const extra of [
      { vehicleId: f.first.id, startOdometer: 1 },
      { vehicleId: id(), startOdometer: 1 },
      { vehicleId: f.second.id, startOdometer: -1 },
      { vehicleId: f.second.id, startOdometer: 1, locationConsent: true },
    ])
      await assert.rejects(() =>
        f.call("owner", "dispatch.trip.change", f.body(extra)),
      );
    await f.db.query(
      "UPDATE driver_vehicles SET lpg_suitable=false WHERE id=$1",
      [f.second.id],
    );
    await assert.rejects(
      () =>
        f.call(
          "owner",
          "dispatch.trip.change",
          f.body({ vehicleId: f.second.id, startOdometer: 1 }),
        ),
      denied(409),
    );
    assert.deepEqual(await f.current(), before);
    process.env.NODE_ENV = "production";
    process.env.EASYGAS_FIELD_OPERATIONS_ENABLED = "false";
    assert.equal(
      (await f.call("owner", "dispatch.trip.options")).writesEnabled,
      false,
    );
    await assert.rejects(
      () => f.call("owner", "dispatch.trip.end", f.body()),
      denied(503),
    );
  } finally {
    process.env = env;
    await f.db.close?.();
  }
});

test(
  "TC-PG: concurrent end/change and replacement claims serialize; stale replacement never strands the driver or closes the old trip",
  {
    skip:
      process.env.EASYGAS_ENABLE_LOCAL_PG_TESTS === "yes" &&
      process.env.EASYGAS_TEST_POSTGRES_URL
        ? false
        : "Explicit disposable PostgreSQL required; PGlite is not concurrency evidence",
  },
  async () => {
    const url = new URL(process.env.EASYGAS_TEST_POSTGRES_URL!);
    assert.ok(
      ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) &&
        url.pathname.startsWith("/easygas_test") &&
        !process.env.DATABASE_URL,
    );
    const schema = "easygas_test_" + id().replaceAll("-", ""),
      admin = new Pool({ connectionString: url.toString(), max: 1 });
    await admin.query(`CREATE SCHEMA ${schema}`);
    const pool = new Pool({
      connectionString: url.toString(),
      max: 6,
      options: `-c search_path=${schema},pg_catalog -c lock_timeout=5000`,
    });
    const db: DB = {
      query: async (q, p) => (await pool.query(q, p)) as any,
      exec: (q) => pool.query(q),
      transaction: async (fn) => {
        const tx = await pool.connect();
        try {
          await tx.query("BEGIN");
          const r = await fn({
            query: async (q, p) => (await tx.query(q, p)) as any,
            exec: (q) => tx.query(q),
          });
          await tx.query("COMMIT");
          return r;
        } catch (e) {
          await tx.query("ROLLBACK");
          throw e;
        } finally {
          tx.release();
        }
      },
    };
    try {
      const f = await setup(db);
      const req = f.body({ vehicleId: f.second.id, startOdometer: 500 });
      const race = await Promise.allSettled([
        f.call("owner", "dispatch.trip.change", req),
        f.call("dispatcher", "dispatch.trip.end", f.body()),
      ]);
      assert.equal(race.filter((r) => r.status === "fulfilled").length, 1);
      assert.equal(
        (race.find((r) => r.status === "rejected") as PromiseRejectedResult)
          .reason.status,
        409,
      );
      const active = (
        await db.query("SELECT * FROM driver_trips WHERE ended_at IS NULL")
      ).rows;
      if (active.length)
        await f.call("owner", "dispatch.trip.end", {
          tripId: active[0].id,
          version: active[0].version,
          endOdometer: 10000,
          operationKey: id(),
        });
      const old = await f.call("owner", "dispatch.vehicle.assign", {
        driverId: f.actors.driver.id,
        vehicleId: f.first.id,
        startOdometer: 200,
        makeAvailable: false,
        operationKey: id(),
      });
      const other = id();
      await db.query(
        "INSERT INTO users(id,name,email,password_hash,role,branch_id) SELECT $1,'Synthetic competing driver',$2,password_hash,'driver','lagos' FROM users WHERE id=$3",
        [other, other + "@tc.test", f.actors.driver.id],
      );
      const claim = await Promise.allSettled([
        f.call("owner", "dispatch.trip.change", {
          tripId: old.id,
          version: 1,
          endOdometer: 220,
          vehicleId: f.second.id,
          startOdometer: 600,
          operationKey: id(),
        }),
        f.call("owner", "dispatch.vehicle.assign", {
          driverId: other,
          vehicleId: f.second.id,
          startOdometer: 700,
          makeAvailable: false,
          operationKey: id(),
        }),
      ]);
      assert.equal(claim.filter((r) => r.status === "fulfilled").length, 1);
      assert.equal(
        (claim.find((r) => r.status === "rejected") as PromiseRejectedResult)
          .reason.status,
        409,
      );
      const own = (
        await db.query(
          "SELECT * FROM driver_trips WHERE driver_id=$1 AND ended_at IS NULL",
          [f.actors.driver.id],
        )
      ).rows;
      assert.equal(own.length, 1);
      assert.equal(
        (
          await db.query(
            "SELECT id FROM driver_trips WHERE vehicle_id=$1 AND ended_at IS NULL",
            [f.second.id],
          )
        ).rows.length,
        1,
      );
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  },
);
