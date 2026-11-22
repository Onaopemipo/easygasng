import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers/order-tracking-fixture";
import { id, issueSession, AppError } from "../apps/web/lib/auth";
import { one, type DB } from "../apps/web/lib/db";
import { Pool } from "pg";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { reviewedRoleAcceptanceSourceHash } from "../scripts/lib/reviewed-role-acceptance-source.mjs";
test("DUPTRIP-SOURCE: reviewed trip and phone-dialog corrections retain historical and native baselines and rejects tampered incoming proof", async () => {
  const review = JSON.parse(
    await readFile(
      "docs/role-order-acceptance-20261121/reviewed-source-changes.json",
      "utf8",
    ),
  );
  for (const [file, baseline] of Object.entries(review.baseline)) {
    assert.equal(
      await reviewedRoleAcceptanceSourceHash(file, baseline),
      createHash("sha256")
        .update(await readFile(file))
        .digest("hex"),
    );
    await assert.rejects(
      () => reviewedRoleAcceptanceSourceHash(file, "0".repeat(64)),
      /historical role-acceptance baseline/,
    );
  }
  assert.equal(
    await reviewedRoleAcceptanceSourceHash(
      "apps/mobile/unreviewed-surface.tsx",
      "unchanged-native",
    ),
    "unchanged-native",
  );
});
async function setup(database?: DB) {
  const f = await fixture(database);
  await f.call("owner", "reauth", { password: "Tracking-fixture-only-123!" });
  const vehicle = await f.call("owner", "fleet.vehicle.create", {
    branchId: "lagos",
    label: "SYNTHETIC TRIP CONFLICT VEHICLE",
    capacityGrams: 30000,
    lpgSuitable: true,
    operationKey: id(),
  });
  const other = id();
  await f.db.query(
    "INSERT INTO users(id,name,email,password_hash,role,branch_id,driver_available) SELECT $1,'Synthetic other driver',$2,password_hash,'driver','lagos',true FROM users WHERE id=$3",
    [other, other + "@trip.invalid", f.actors.driver.id],
  );
  f.actors.other = { id: other, token: await issueSession(f.db, other) };
  return { ...f, vehicle };
}
test("DUPTRIP-ACTIVE: a second driver trip has an actionable409 and preserves the original trip and idempotent replay", async () => {
  const f = await setup();
  try {
    const input = {
      vehicleId: f.vehicle.id,
      startOdometer: 1000,
      locationConsent: false,
      operationKey: id(),
    };
    const trip = await f.call("driver", "trip.start", input);
    assert.ok(trip.id);
    assert.equal((await f.call("driver", "trip.start", input)).id, trip.id);
    await assert.rejects(
      f.call("driver", "trip.start", { ...input, operationKey: id() }),
      (e: any) =>
        e instanceof AppError &&
        e.status === 409 &&
        /already have an active duty trip.*Manage trip/i.test(e.message),
    );
    const rows = (await f.db.query("SELECT * FROM driver_trips")).rows;
    assert.equal(rows.length, 1);
    assert.equal(rows[0].id, trip.id);
    assert.equal(rows[0].location_consent, false);
    await assert.rejects(
      f.call("driver", "trip.start", { ...input, startOdometer: 1001 }),
      (e: any) => e.status === 409,
    );
  } finally {
    await f.db.close?.();
  }
});
test(
  "DUPTRIP-CONCURRENT: independent PostgreSQL starts serialize both driver and vehicle conflicts",
  {
    skip:
      process.env.EASYGAS_ENABLE_LOCAL_PG_TESTS === "yes" &&
      process.env.EASYGAS_TEST_POSTGRES_URL
        ? false
        : "Disposable local PostgreSQL not explicitly enabled; PGlite is not concurrency evidence.",
  },
  async () => {
    const url = new URL(process.env.EASYGAS_TEST_POSTGRES_URL!);
    assert.ok(
      ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) &&
        url.pathname.startsWith("/easygas_test") &&
        !process.env.DATABASE_URL,
    );
    const schema = "easygas_test_" + id().replaceAll("-", "");
    const admin = new Pool({ connectionString: url.toString(), max: 1 });
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
          const value = await fn({
            query: async (q, p) => (await tx.query(q, p)) as any,
            exec: (q) => tx.query(q),
          });
          await tx.query("COMMIT");
          return value;
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
      const second = await f.call("owner", "fleet.vehicle.create", {
        branchId: "lagos",
        label: "SYNTHETIC SECOND TRIP VEHICLE",
        capacityGrams: 30000,
        lpgSuitable: true,
        operationKey: id(),
      });
      const race = await Promise.allSettled(
        [f.vehicle.id, second.id].map((vehicleId) =>
          f.call("driver", "trip.start", {
            vehicleId,
            startOdometer: 1000,
            locationConsent: false,
            operationKey: id(),
          }),
        ),
      );
      assert.equal(race.filter((r) => r.status === "fulfilled").length, 1);
      const denied = race.find(
        (r) => r.status === "rejected",
      ) as PromiseRejectedResult;
      assert.ok(
        denied.reason instanceof AppError && denied.reason.status === 409,
      );
      const first = await one(
        db,
        "SELECT id FROM driver_trips WHERE ended_at IS NULL",
      );
      assert.ok(first);
      await f.call("driver", "trip.end", {
        tripId: first.id,
        endOdometer: 1000,
        operationKey: id(),
      });
      const vehicleRace = await Promise.allSettled(
        ["driver", "other"].map((role) =>
          f.call(role, "trip.start", {
            vehicleId: f.vehicle.id,
            startOdometer: 1000,
            locationConsent: false,
            operationKey: id(),
          }),
        ),
      );
      assert.equal(
        vehicleRace.filter((r) => r.status === "fulfilled").length,
        1,
      );
      const otherDenied = vehicleRace.find(
        (r) => r.status === "rejected",
      ) as PromiseRejectedResult;
      assert.ok(
        otherDenied.reason instanceof AppError &&
          otherDenied.reason.status === 409,
      );
      assert.equal(
        Number(
          (
            await one(
              db,
              "SELECT count(*) AS n FROM driver_trips WHERE ended_at IS NULL",
            )
          )?.n,
        ),
        1,
      );
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  },
);
test("DUPTRIP-VEHICLE: a vehicle already on another active trip gives409 without exposing the other driver or changing custody", async () => {
  const f = await setup();
  try {
    const trip = await f.call("driver", "trip.start", {
      vehicleId: f.vehicle.id,
      startOdometer: 1000,
      locationConsent: false,
      operationKey: id(),
    });
    await assert.rejects(
      f.call("other", "trip.start", {
        vehicleId: f.vehicle.id,
        startOdometer: 1000,
        locationConsent: false,
        operationKey: id(),
      }),
      (e: any) =>
        e instanceof AppError &&
        e.status === 409 &&
        /vehicle is already on an active duty trip.*another vehicle/i.test(
          e.message,
        ) &&
        !e.message.includes(f.actors.driver.id),
    );
    assert.equal(
      (await one(f.db, "SELECT count(*) AS n FROM driver_trips"))?.n,
      1,
    );
    assert.equal((await one(f.db, "SELECT id FROM driver_trips"))?.id, trip.id);
    await f.call("driver", "trip.end", {
      tripId: trip.id,
      endOdometer: 1000,
      operationKey: id(),
    });
    const next = await f.call("other", "trip.start", {
      vehicleId: f.vehicle.id,
      startOdometer: 1000,
      locationConsent: false,
      operationKey: id(),
    });
    assert.notEqual(next.id, trip.id);
  } finally {
    await f.db.close?.();
  }
});
