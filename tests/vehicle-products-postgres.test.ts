import test from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { type DB } from "../apps/web/lib/db";
import { id, actor } from "../apps/web/lib/auth";
import {
  vehicleFixture,
  restoreVehicleEnv,
} from "./helpers/vehicle-products-fixture";
import { vehicleProducts } from "../apps/web/lib/vehicle-products";
const enabled =
  process.env.EASYGAS_ENABLE_LOCAL_PG_TESTS === "yes" &&
  !!process.env.EASYGAS_TEST_POSTGRES_URL;
test(
  "MANIFEST-PG01: independent connections serialize physical capacity and replay; forced abort preserves custody and canonical reservations",
  { skip: enabled ? false : "Disposable PostgreSQL required" },
  async () => {
    const url = new URL(process.env.EASYGAS_TEST_POSTGRES_URL!);
    if (
      !["127.0.0.1", "localhost"].includes(url.hostname) ||
      !url.pathname.startsWith("/easygas_test") ||
      process.env.DATABASE_URL
    )
      throw Error("Disposable local PostgreSQL only");
    const schema = "easygas_test_manifest_" + id().replaceAll("-", ""),
      admin = new Pool({ connectionString: String(url), max: 1 });
    await admin.query(`CREATE SCHEMA ${schema}`);
    const pool = new Pool({
      connectionString: String(url),
      max: 6,
      options: `-c search_path=${schema},pg_catalog -c statement_timeout=15000 -c lock_timeout=5000`,
    });
    const db: DB = {
      query: (q, p) => pool.query(q, p),
      exec: (q) => pool.query(q),
      transaction: async (fn) => {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const value = await fn({
            query: (q, p) => client.query(q, p),
            exec: (q) => client.query(q),
          });
          await client.query("COMMIT");
          return value;
        } catch (e) {
          await client.query("ROLLBACK");
          throw e;
        } finally {
          client.release();
        }
      },
    };
    const env = { ...process.env };
    try {
      const f = await vehicleFixture(db);
      await db.query(
        "UPDATE driver_vehicles SET physical_capacity_grams=2000 WHERE id=$1",
        [f.vehicle.id],
      );
      const input = {
        tripId: f.trip.id,
        productId: "hose",
        quantity: 3,
        unitWeightGrams: 500,
        evidence: "Synthetic weighed actual stock",
        reason: "Synthetic physical vehicle stock test",
      };
      await assert.rejects(
        () =>
          db.transaction(async (tx) => {
            const user = await actor(tx, f.actors.inventory.token);
            await vehicleProducts(tx, user!, "manifest.issue", input);
            throw Error("Forced fixture abort");
          }),
        /Forced fixture abort/,
      );
      assert.equal(
        (await db.query("SELECT id FROM vehicle_product_loads")).rows.length,
        0,
      );
      assert.equal(
        Number(
          (
            await db.query(
              "SELECT reserved FROM inventory WHERE branch_id='lagos' AND product_id='hose'",
            )
          ).rows[0].reserved,
        ),
        1,
      );
      const competing = await Promise.allSettled([
        f.run("inventory", "manifest.issue", input),
        f.run("inventory", "manifest.issue", input),
      ]);
      assert.equal(competing.filter((r) => r.status === "fulfilled").length, 1);
      assert.equal(competing.filter((r) => r.status === "rejected").length, 1);
      const load = (
        competing.find(
          (r) => r.status === "fulfilled",
        ) as PromiseFulfilledResult<any>
      ).value;
      const ack = {
        manifestId: load.id,
        version: 1,
        quantity: 3,
        serialIds: [],
        evidence: input.evidence,
        reason: input.reason,
        operationKey: id(),
      };
      const receipts = await Promise.all([
        f.call("driver", "manifest.acknowledge", ack),
        f.call("driver", "manifest.acknowledge", ack),
      ]);
      assert.equal(receipts[0].ok, true);
      assert.equal(receipts[1].ok, true);
      assert.equal(receipts.filter((r) => r.replayed === true).length, 1);
      assert.equal(
        (
          await db.query(
            "SELECT id FROM vehicle_product_events WHERE kind='manifest.acknowledged'",
          )
        ).rows.length,
        1,
      );
      assert.equal(
        Number(
          (
            await db.query(
              "SELECT reserved FROM inventory WHERE branch_id='lagos' AND product_id='hose'",
            )
          ).rows[0].reserved,
        ),
        4,
      );
      for (const table of [
        "vehicle_product_loads",
        "vehicle_product_serials",
        "vehicle_product_events",
        "doorstep_product_execution",
        "doorstep_product_lines",
        "doorstep_cylinder_lines",
        "service_exception_settlements",
        "service_settlement_consents",
        "service_material_recovery_history",
      ]) {
        const row = (
          await db.query(
            "SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid=$1::regclass",
            [table],
          )
        ).rows[0];
        assert.ok(row.relrowsecurity && row.relforcerowsecurity, table);
      }
    } finally {
      restoreVehicleEnv(env);
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  },
);
