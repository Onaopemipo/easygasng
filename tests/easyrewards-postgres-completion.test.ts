import test from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { id } from "../apps/web/lib/auth";
import { type DB, one } from "../apps/web/lib/db";
import { rewardsFixture } from "./helpers/rewards-fixture";
import { processRewards, rewardBalance } from "../apps/web/lib/rewards";
import { execFileSync } from "node:child_process";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { encryptBackup, decryptBackup } from "../apps/web/lib/backups";
const enabled =
  process.env.EASYGAS_ENABLE_LOCAL_PG_TESTS === "yes" &&
  !!process.env.EASYGAS_TEST_POSTGRES_URL;
test(
  "ER-PG36: real PostgreSQL duplicate workers/refund approvals, encrypted backup and isolated restore preserve committed effects",
  {
    skip: enabled
      ? false
      : "Explicitly enabled disposable local PostgreSQL is required.",
  },
  async () => {
    const url = new URL(process.env.EASYGAS_TEST_POSTGRES_URL!);
    if (
      !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
      !url.pathname.startsWith("/easygas_test") ||
      process.env.DATABASE_URL
    )
      throw new Error("Disposable local database only.");
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
        const c = await pool.connect();
        try {
          await c.query("BEGIN");
          const r = await fn({
            query: async (q, p) => (await c.query(q, p)) as any,
            exec: (q) => c.query(q),
          });
          await c.query("COMMIT");
          return r;
        } catch (e) {
          await c.query("ROLLBACK");
          throw e;
        } finally {
          c.release();
        }
      },
    };
    const oldI = process.env.EASYGAS_REWARDS_ISSUANCE_ENABLED,
      oldR = process.env.EASYGAS_REWARDS_REDEMPTION_ENABLED;
    process.env.EASYGAS_REWARDS_ISSUANCE_ENABLED = "true";
    process.env.EASYGAS_REWARDS_REDEMPTION_ENABLED = "true";
    let restoreName: string | undefined, temp: string | undefined;
    try {
      const f = await rewardsFixture(db);
      await f.approve();
      const o = await f.fulfilled();
      await f.call("finance", "cash.reconcile", {
        id: (await one(
          db,
          "SELECT id FROM cash_collections WHERE order_id=$1",
          [o.id],
        ))!.id,
      });
      await Promise.all([
        db.transaction(processRewards),
        db.transaction(processRewards),
      ]);
      assert.equal(await rewardBalance(db, f.actors.customer.id), 35);
      assert.equal(
        Number(
          (await one(
            db,
            "SELECT count(*) n FROM reward_entries WHERE reference=$1",
            [`order:${o.id}`],
          ))!.n,
        ),
        1,
      );
      const request = {
        orderId: o.id,
        lines: [{ source: "product:hose", quantity: 1 }],
        reason: "Synthetic PostgreSQL partial refund request",
        acceptWalletCredit: true,
        idempotencyKey: id(),
      };
      const requests = await Promise.all([
        f.call("customer", "refund.request", request),
        f.call("customer", "refund.request", request),
      ]);
      assert.equal(requests[0].id, requests[1].id);
      const decision = {
        id: requests[0].id,
        decision: "approved",
        reason: "Independent concurrent approval of source payment",
      };
      await Promise.all([
        f.call("finance", "credit.decide", decision),
        f.call("finance", "credit.decide", decision),
      ]);
      assert.equal(await rewardBalance(db, f.actors.customer.id), 0);
      assert.equal(
        Number(
          (await one(db, "SELECT count(*) n FROM reward_refund_allocations"))!
            .n,
        ),
        1,
      );
      // Real pg_dump -> authenticated encryption -> isolated pg_restore. No existing DB is overwritten.
      const bin =
        process.env.EASYGAS_PG_BIN ?? "";
      temp = await mkdtemp(path.join(os.tmpdir(), "easygas-rewards-restore-"));
      const dump = path.join(temp, "source.dump"),
        decrypted = path.join(temp, "restored.dump");
      execFileSync(
        path.join(bin, "pg_dump"),
        [
          "--dbname",
          url.toString(),
          "--schema",
          schema,
          "--format=custom",
          "--file",
          dump,
        ],
        { stdio: "pipe" },
      );
      const encrypted = encryptBackup(
        await readFile(dump),
        "Synthetic-PG-restore-only-123!",
      );
      await writeFile(path.join(temp, "backup.enc"), encrypted, {
        mode: 0o600,
      });
      await writeFile(
        decrypted,
        decryptBackup(encrypted, "Synthetic-PG-restore-only-123!"),
        { mode: 0o600 },
      );
      restoreName = "easygas_test_restore_" + id().replaceAll("-", "");
      await admin.query(`CREATE DATABASE ${restoreName}`);
      const restoreUrl = new URL(url);
      restoreUrl.pathname = "/" + restoreName;
      execFileSync(
        path.join(bin, "pg_restore"),
        ["--dbname", restoreUrl.toString(), "--exit-on-error", decrypted],
        { stdio: "pipe" },
      );
      const restored = new Pool({
        connectionString: restoreUrl.toString(),
        max: 1,
        options: `-c search_path=${schema},pg_catalog`,
      });
      try {
        assert.equal(
          Number(
            (
              await restored.query(
                "SELECT sum(points) n FROM reward_entries WHERE customer_id=$1",
                [f.actors.customer.id],
              )
            ).rows[0].n,
          ),
          0,
        );
        assert.equal(
          (
            await restored.query(
              "SELECT count(*)::int n FROM reward_refund_allocations",
            )
          ).rows[0].n,
          1,
        );
        assert.equal(
          (
            await restored.query(
              "SELECT status FROM reward_jobs WHERE order_id=$1",
              [o.id],
            )
          ).rows[0].status,
          "completed",
        );
        await assert.rejects(
          () => restored.query("DELETE FROM reward_entries"),
          /Append-only/,
        );
      } finally {
        await restored.end();
      }
    } finally {
      if (oldI === undefined)
        delete process.env.EASYGAS_REWARDS_ISSUANCE_ENABLED;
      else process.env.EASYGAS_REWARDS_ISSUANCE_ENABLED = oldI;
      if (oldR === undefined)
        delete process.env.EASYGAS_REWARDS_REDEMPTION_ENABLED;
      else process.env.EASYGAS_REWARDS_REDEMPTION_ENABLED = oldR;
      await pool.end();
      if (restoreName) await admin.query(`DROP DATABASE ${restoreName}`);
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
      if (temp) await rm(temp, { recursive: true, force: true });
    }
  },
);

test(
  "ER-PGSEC: migrated private schema works under the restricted runtime role and rejects public ledger access",
  {
    skip: enabled
      ? false
      : "Explicitly enabled disposable local PostgreSQL is required.",
  },
  async () => {
    const url = new URL(process.env.EASYGAS_TEST_POSTGRES_URL!);
    if (
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
      !url.pathname.startsWith("/easygas_test") ||
      process.env.DATABASE_URL
    )
      throw new Error("Disposable local database only.");
    const admin = new Pool({ connectionString: url.toString(), max: 1 }),
      name = "easygas_test_runtime_" + id().replaceAll("-", "");
    await admin.query(`CREATE DATABASE ${name}`);
    const runtimeUrl = new URL(url);
    runtimeUrl.pathname = "/" + name;
    const publicRole = "easygas_test_public_" + id().replaceAll("-", "");
    const pool = new Pool({
      connectionString: runtimeUrl.toString(),
      max: 4,
      options: "-c search_path=easygas_private,pg_catalog",
    });
    await pool.query("CREATE SCHEMA easygas_private");
    const raw: DB = {
      query: async (q, p) => (await pool.query(q, p)) as any,
      exec: (q) => pool.query(q),
      transaction: async (fn) => {
        const c = await pool.connect();
        try {
          await c.query("BEGIN");
          const r = await fn({
            query: async (q, p) => (await c.query(q, p)) as any,
            exec: (q) => c.query(q),
          });
          await c.query("COMMIT");
          return r;
        } catch (e) {
          await c.query("ROLLBACK");
          throw e;
        } finally {
          c.release();
        }
      },
    };
    const oldI = process.env.EASYGAS_REWARDS_ISSUANCE_ENABLED,
      oldR = process.env.EASYGAS_REWARDS_REDEMPTION_ENABLED;
    try {
      process.env.DATABASE_URL = runtimeUrl.toString();
      const f = await rewardsFixture(raw);
      delete process.env.DATABASE_URL;
      await f.approve();
      process.env.EASYGAS_REWARDS_ISSUANCE_ENABLED = "true";
      process.env.EASYGAS_REWARDS_REDEMPTION_ENABLED = "true";
      const o = await f.fulfilled();
      await f.call("finance", "cash.reconcile", {
        id: (await one(
          raw,
          "SELECT id FROM cash_collections WHERE order_id=$1",
          [o.id],
        ))!.id,
      });
      const trusted: DB = {
        ...raw,
        transaction: (fn) =>
          raw.transaction(async (tx) => {
            await tx.exec("SET LOCAL ROLE easygas_server");
            return fn(tx);
          }),
      };
      await trusted.transaction(processRewards);
      const { dispatch } = await import("../apps/web/lib/service");
      const summary = await dispatch(
        "rewards.summary",
        f.actors.customer.token,
        {},
        trusted,
      );
      assert.equal(summary.points, 35);
      assert.equal(summary.entries.length, 1);
      const report = await dispatch(
        "rewards.report",
        f.actors.finance.token,
        {},
        trusted,
      );
      assert.equal(report.ledger[0].net_points, "35");
      const c = await pool.connect();
      try {
        await c.query("BEGIN");
        await c.query("SET LOCAL ROLE easygas_server");
        await assert.rejects(
          () => c.query("UPDATE reward_entry_details SET detail='{}'"),
          /permission|Append-only/i,
        );
        await c.query("ROLLBACK");
      } finally {
        c.release();
      }
      const roles = (
        await pool.query(
          "SELECT rolbypassrls,rolcanlogin FROM pg_roles WHERE rolname='easygas_server'",
        )
      ).rows[0];
      assert.equal(roles.rolbypassrls, false);
      assert.equal(roles.rolcanlogin, false);
      await pool.query(`CREATE ROLE ${publicRole} NOLOGIN`);
      await pool.query(
        `GRANT USAGE ON SCHEMA easygas_private TO ${publicRole}`,
      );
      await pool.query(
        `GRANT SELECT ON easygas_private.reward_entry_details TO ${publicRole}`,
      );
      const publicClient = await pool.connect();
      try {
        await publicClient.query("BEGIN");
        await publicClient.query(`SET LOCAL ROLE ${publicRole}`);
        assert.equal(
          (
            await publicClient.query(
              "SELECT count(*)::int n FROM reward_entry_details",
            )
          ).rows[0].n,
          0,
        );
        await assert.rejects(
          () =>
            publicClient.query(
              "INSERT INTO reward_entries(id,customer_id,points,reference) VALUES($1,$2,$3,$4)",
              ["forged", "forged", 100, "forged"],
            ),
          /permission/i,
        );
        await publicClient.query("ROLLBACK");
      } finally {
        publicClient.release();
      }
    } finally {
      delete process.env.DATABASE_URL;
      if (oldI === undefined)
        delete process.env.EASYGAS_REWARDS_ISSUANCE_ENABLED;
      else process.env.EASYGAS_REWARDS_ISSUANCE_ENABLED = oldI;
      if (oldR === undefined)
        delete process.env.EASYGAS_REWARDS_REDEMPTION_ENABLED;
      else process.env.EASYGAS_REWARDS_REDEMPTION_ENABLED = oldR;
      await pool.end();
      await admin.query(`DROP DATABASE ${name}`);
      await admin.query(`DROP ROLE IF EXISTS ${publicRole}`);
      await admin.end();
    }
  },
);
