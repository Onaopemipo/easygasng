import { consolidatedRole } from "../packages/business-rules/src/staff-roles";
import { test } from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { migrate, one, type DB } from "../apps/web/lib/db";
import { dispatch } from "../apps/web/lib/service";
import { id, hashPassword, issueSession } from "../apps/web/lib/auth";
const configured =
  Boolean(process.env.EASYGAS_TEST_POSTGRES_URL) &&
  process.env.EASYGAS_ENABLE_LOCAL_PG_TESTS === "yes";
test(
  "multi-connection PostgreSQL: independent approvals and duplicate activation",
  {
    skip: !configured
      ? "No explicitly enabled disposable local PostgreSQL test database."
      : false,
  },
  async () => {
    const url = new URL(process.env.EASYGAS_TEST_POSTGRES_URL!);
    if (
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
      !url.pathname.startsWith("/easygas_test")
    )
      throw new Error("Only a local database named easygas_test… may be used.");
    if (process.env.DATABASE_URL)
      throw new Error(
        "Unset DATABASE_URL; this harness must not provision a managed database.",
      );
    const schema = "easygas_test_" + id().replaceAll("-", "");
    const admin = new Pool({ connectionString: url.toString(), max: 1 });
    await admin.query(`CREATE SCHEMA ${schema}`);
    const pool = new Pool({
      connectionString: url.toString(),
      max: 6,
      options: `-c search_path=${schema},pg_catalog`,
    });
    const db: DB = {
      query: async (q, p) => (await pool.query(q, p)) as any,
      exec: async (q) => pool.query(q),
      transaction: async (fn) => {
        const c = await pool.connect();
        try {
          await c.query("BEGIN");
          const result = await fn({
            query: async (q, p) => (await c.query(q, p)) as any,
            exec: async (q) => c.query(q),
          });
          await c.query("COMMIT");
          return result;
        } catch (e) {
          await c.query("ROLLBACK");
          throw e;
        } finally {
          c.release();
        }
      },
    };
    try {
      await migrate(db);
      const tokens: Record<string, string> = {};
      for (const role of ["owner", "manager", "customer"]) {
        const uid = id();
        await db.query(
          "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES ($1,$2,$3,$4,$5,'lagos')",
          [
            uid,
            role,
            uid + "@example.test",
            hashPassword("Concurrency-fixture-only-123!"),
            consolidatedRole(role),
          ],
        );
        tokens[role] = await issueSession(db, uid);
      }
      const call = (role: string, a: string, input: any = {}) =>
        dispatch(a, tokens[role], input, db);
      await call("owner", "reauth", {
        password: "Concurrency-fixture-only-123!",
      });
      const requests = await Promise.all(
        [190000, 195000].map((value) =>
          call("manager", "setting.propose", {
            key: "gas.price_per_kg",
            scope: "lagos",
            value,
            version: 1,
            reason: "Concurrent independent gas price review",
          }),
        ),
      );
      const results = await Promise.allSettled(
        requests.map((r) =>
          call("owner", "approval.decide", {
            id: r.id,
            decision: "approve",
            reason: "Independent owner review",
          }),
        ),
      );
      assert.equal(results.filter((r) => r.status === "fulfilled").length, 2);
      assert.equal(
        Number(
          (await one(
            db,
            "SELECT count(*) AS n FROM change_requests WHERE key='gas.price_per_kg' AND status='active'",
          ))!.n,
        ),
        1,
      );
      assert.equal(
        (await one(
          db,
          "SELECT version FROM settings WHERE key='gas.price_per_kg' AND scope='lagos'",
        ))!.version,
        2,
      );
      const active = await one(
        db,
        "SELECT id FROM change_requests WHERE key='gas.price_per_kg' AND status='active'",
      );
      await Promise.all([
        call("owner", "approval.activate", { id: active!.id }),
        call("owner", "approval.activate", { id: active!.id }),
      ]);
      assert.equal(
        (await one(
          db,
          "SELECT count(*)::int n FROM setting_versions WHERE request_id=$1",
          [active!.id],
        ))!.n,
        1,
      );
      await call("manager", "reauth", {
        password: "Concurrency-fixture-only-123!",
      });
      await call("manager", "inventory.receipt", {
        branchId: "lagos",
        productId: "hose",
        quantity: 10,
        unitCostKobo: 10000,
        reference: "PG-RECEIPT-001",
        reason: "Synthetic concurrent stock receipt",
        evidence: "Disposable PostgreSQL receiving evidence",
        receivedDate: new Date().toISOString().slice(0, 10),
        receivingPassed: true,
      });
      const adjustments = await Promise.all(
        [1, 2].map((i) =>
          call("manager", "inventory.adjust", {
            branchId: "lagos",
            productId: "hose",
            quantity: -6,
            reference: "PG-ADJUST-" + i,
            reason: "Synthetic competing correction",
            evidence: "Disposable PostgreSQL count evidence",
          }),
        ),
      );
      await Promise.all(
        adjustments.map((r) =>
          call("owner", "approval.decide", {
            id: r.requestId,
            decision: "approve",
            reason: "Independent synthetic review",
          }),
        ),
      );
      assert.equal(
        Number(
          (await one(
            db,
            "SELECT quantity FROM inventory WHERE branch_id='lagos' AND product_id='hose'",
          ))!.quantity,
        ),
        4,
      );
      assert.equal(
        Number(
          (await one(
            db,
            "SELECT count(*) AS n FROM stock_movements WHERE reference LIKE 'operation:%' AND product_id='hose'",
          ))!.n,
        ),
        1,
      );
      await db.query(
        "UPDATE settings SET value='true' WHERE key IN ('delivery.enabled','payment.cod')",
      );
      await db.query(
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
      await db.query(
        "UPDATE delivery_locations SET coverage='Synthetic fully reviewed test coverage boundary'",
      );
      await db.query("UPDATE gas_stock SET grams=6000");
      const lines = [{ capacityKg: 6, kg: 6 }],
        q = await dispatch("gas.quote", null, { lines }, db);
      const input = {
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
      };
      const orders = await Promise.allSettled([
        call("customer", "checkout", { ...input, idempotencyKey: id() }),
        call("customer", "checkout", { ...input, idempotencyKey: id() }),
      ]);
      assert.equal(orders.filter((r) => r.status === "fulfilled").length, 1);
      assert.equal(
        Number(
          (await one(
            db,
            "SELECT reserved_grams FROM gas_stock WHERE branch_id='lagos'",
          ))!.reserved_grams,
        ),
        6000,
      );
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  },
);
