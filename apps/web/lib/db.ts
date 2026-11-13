import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import { verifiedDatabaseConfig } from "./database-tls";
import { readFile, mkdir, open, unlink } from "node:fs/promises";
import { readFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import { seed } from "./seed";
export type Row = Record<string, any>;
export interface SQL {
  query<T extends Row = Row>(
    text: string,
    params?: any[],
  ): Promise<{ rows: T[] }>;
  exec(text: string): Promise<unknown>;
}
export interface DB extends SQL {
  snapshot?: () => Promise<Uint8Array>;
  close?: () => Promise<void>;
  transaction<T>(fn: (tx: SQL) => Promise<T>): Promise<T>;
}
const globalDb = globalThis as unknown as {
  easygasDb?: Promise<DB>;
  easygasLocalMigration?: Promise<void>;
  easygasLocalVersion?: number;
};
export const root = path.resolve(
  process.cwd(),
  process.cwd().endsWith("/apps/web") ? "../.." : ".",
);
export async function createDatabase(dataDir?: string): Promise<DB> {
  let db: DB;
  if (process.env.DATABASE_URL && !dataDir) {
    const pool = new Pool({
      ...(process.env.NODE_ENV === "production"
        ? verifiedDatabaseConfig(process.env)
        : { connectionString: process.env.DATABASE_URL }),
      max: 10,
      connectionTimeoutMillis: 5000,
      options:
        "-c search_path=easygas_private,pg_catalog -c statement_timeout=15000 -c lock_timeout=5000",
    });
    const wrap = (client: any): SQL => ({
      query: (q, p) => client.query(q, p),
      exec: (q) => client.query(q),
    });
    db = {
      ...wrap(pool),
      close: () => pool.end(),
      transaction: async (fn) => {
        for (let attempt = 0; ; attempt++) {
          const client = await pool.connect();
          try {
            await client.query("BEGIN");
            const result = await fn(wrap(client));
            await client.query("COMMIT");
            return result;
          } catch (e: any) {
            await client.query("ROLLBACK");
            // Only definite transaction aborts are retried. Never retry an uncertain
            // network/COMMIT result, or perform external I/O in this callback.
            if (!["40P01", "40001"].includes(e.code) || attempt >= 2) throw e;
            await new Promise((resolve) =>
              setTimeout(resolve, 25 * (attempt + 1)),
            );
          } finally {
            client.release();
          }
        }
      },
    };
  } else {
    if (process.env.NODE_ENV === "production" && !dataDir)
      throw new Error("DATABASE_URL is required in production");
    const dir =
      dataDir ??
      process.env.EASYGAS_DATA_DIR ??
      path.join(root, ".data/postgres");
    if (dir !== "memory://") {
      await mkdir(dir, { recursive: true });
      const lockPath = dir + ".lock";
      try {
        const existing = Number(await readFile(lockPath, "utf8"));
        if (!Number.isSafeInteger(existing) || existing <= 0)
          throw new Error("The local database lock needs operator review.");
        try {
          process.kill(existing, 0);
          throw new Error(
            "The local database is already in use. Stop the development server before running a database command.",
          );
        } catch (error: any) {
          if (error.code !== "ESRCH") throw error;
        }
        await unlink(lockPath);
      } catch (error: any) {
        if (error.code !== "ENOENT") throw error;
      }
      const lock = await open(lockPath, "wx", 0o600);
      await lock.writeFile(String(process.pid));
      await lock.close();
      process.once("exit", () => {
        try {
          if (readFileSync(lockPath, "utf8") === String(process.pid))
            unlinkSync(lockPath);
        } catch {}
      });
    }
    const pg = await PGlite.create(dir);
    db = {
      snapshot: async () =>
        new Uint8Array(await (await pg.dumpDataDir()).arrayBuffer()),
      close: () => pg.close(),
      query: async (q, p) => pg.query(q, p),
      exec: (q) => pg.exec(q),
      transaction: (fn) =>
        pg.transaction(async (tx) =>
          fn({
            query: async (q, p) => tx.query(q, p),
            exec: (q) => tx.exec(q),
          }),
        ),
    };
  }
  return db;
}
export async function migrate(db: DB) {
  if (process.env.DATABASE_URL)
    await db.exec("CREATE SCHEMA IF NOT EXISTS easygas_private");
  await db.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations(version text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now())",
  );
  await db.transaction(async (tx) => {
    // Serialize migration runners on PostgreSQL; PGlite already serializes transactions.
    await tx.query("LOCK TABLE schema_migrations IN EXCLUSIVE MODE");
    if (
      !(await tx.query("SELECT 1 FROM schema_migrations WHERE version='001'"))
        .rows.length
    ) {
      await tx.exec(
        await readFile(
          path.join(root, "database/migrations/001_initial.sql"),
          "utf8",
        ),
      );
      await seed(tx);
      await tx.query("INSERT INTO schema_migrations(version) VALUES ('001')");
    }
    if (
      !(await tx.query("SELECT 1 FROM schema_migrations WHERE version='002'"))
        .rows.length
    ) {
      await tx.exec(
        await readFile(
          path.join(root, "database/migrations/002_delivery_confirmation.sql"),
          "utf8",
        ),
      );
      await tx.query("INSERT INTO schema_migrations(version) VALUES ('002')");
    }
    if (
      !(await tx.query("SELECT 1 FROM schema_migrations WHERE version='004'"))
        .rows.length
    ) {
      await tx.exec(
        await readFile(
          path.join(root, "database/migrations/004_operations.sql"),
          "utf8",
        ),
      );
      await tx.query("INSERT INTO schema_migrations(version) VALUES ('004')");
    }
    if (
      !(await tx.query("SELECT 1 FROM schema_migrations WHERE version='005'"))
        .rows.length
    ) {
      await tx.exec(
        await readFile(
          path.join(root, "database/migrations/005_commerce.sql"),
          "utf8",
        ),
      );
      await tx.query("INSERT INTO schema_migrations(version) VALUES ('005')");
    }
    if (
      !(await tx.query("SELECT 1 FROM schema_migrations WHERE version='007'"))
        .rows.length
    ) {
      await tx.exec(
        await readFile(
          path.join(root, "database/migrations/007_scheduling.sql"),
          "utf8",
        ),
      );
      await tx.query("INSERT INTO schema_migrations(version) VALUES ('007')");
    }
    if (
      !(await tx.query("SELECT 1 FROM schema_migrations WHERE version='009'"))
        .rows.length
    ) {
      await tx.exec(
        await readFile(
          path.join(root, "database/migrations/009_delegation.sql"),
          "utf8",
        ),
      );
      await tx.query("INSERT INTO schema_migrations(version) VALUES ('009')");
    }
    if (
      !(await tx.query("SELECT 1 FROM schema_migrations WHERE version='011'"))
        .rows.length
    ) {
      await tx.exec(
        await readFile(
          path.join(root, "database/migrations/011_requested_catalogue.sql"),
          "utf8",
        ),
      );
      await tx.query("INSERT INTO schema_migrations(version) VALUES ('011')");
    }
    if (
      !(await tx.query("SELECT 1 FROM schema_migrations WHERE version='012'"))
        .rows.length
    ) {
      await tx.exec(
        await readFile(
          path.join(root, "database/migrations/012_integrity.sql"),
          "utf8",
        ),
      );
      await tx.query("INSERT INTO schema_migrations(version) VALUES ('012')");
    }

    if (
      !(await tx.query("SELECT 1 FROM schema_migrations WHERE version='014'"))
        .rows.length
    ) {
      await tx.exec(
        await readFile(
          path.join(root, "database/migrations/014_professional_services.sql"),
          "utf8",
        ),
      );
      await tx.query("INSERT INTO schema_migrations(version) VALUES ('014')");
    }

    if (
      !(await tx.query("SELECT 1 FROM schema_migrations WHERE version='016'"))
        .rows.length
    ) {
      await tx.exec(
        await readFile(
          path.join(root, "database/migrations/016_catalogue_media.sql"),
          "utf8",
        ),
      );
      await tx.query("INSERT INTO schema_migrations(version) VALUES ('016')");
    }
    if (
      !(await tx.query("SELECT 1 FROM schema_migrations WHERE version='018'"))
        .rows.length
    ) {
      await tx.exec(
        await readFile(
          path.join(root, "database/migrations/018_service_governance.sql"),
          "utf8",
        ),
      );
      await tx.query("INSERT INTO schema_migrations(version) VALUES ('018')");
    }
    if (
      !(await tx.query("SELECT 1 FROM schema_migrations WHERE version='020'"))
        .rows.length
    ) {
      await tx.exec(
        await readFile(
          path.join(root, "database/migrations/020_bundles.sql"),
          "utf8",
        ),
      );
      await tx.query("INSERT INTO schema_migrations(version) VALUES ('020')");
    }
    if (
      !(await tx.query("SELECT 1 FROM schema_migrations WHERE version='023'"))
        .rows.length
    ) {
      await tx.exec(
        await readFile(
          path.join(
            root,
            "database/migrations/023_shared_approvals_gas_delivery.sql",
          ),
          "utf8",
        ),
      );
      await tx.query("INSERT INTO schema_migrations(version) VALUES ('023')");
    }
    if (
      process.env.DATABASE_URL &&
      !(await tx.query("SELECT 1 FROM schema_migrations WHERE version='003'"))
        .rows.length
    ) {
      await tx.exec(
        await readFile(
          path.join(root, "database/policies/server-access.sql"),
          "utf8",
        ),
      );
      await tx.query("INSERT INTO schema_migrations(version) VALUES ('003')");
    }
    if (
      process.env.DATABASE_URL &&
      !(await tx.query("SELECT 1 FROM schema_migrations WHERE version='006'"))
        .rows.length
    ) {
      await tx.exec(
        await readFile(
          path.join(root, "database/policies/operations-access.sql"),
          "utf8",
        ),
      );
      await tx.query("INSERT INTO schema_migrations(version) VALUES ('006')");
    }
    if (
      process.env.DATABASE_URL &&
      !(await tx.query("SELECT 1 FROM schema_migrations WHERE version='008'"))
        .rows.length
    ) {
      await tx.exec(
        await readFile(
          path.join(root, "database/policies/scheduling-access.sql"),
          "utf8",
        ),
      );
      await tx.query("INSERT INTO schema_migrations(version) VALUES ('008')");
    }
    if (
      process.env.DATABASE_URL &&
      !(await tx.query("SELECT 1 FROM schema_migrations WHERE version='010'"))
        .rows.length
    ) {
      await tx.exec(
        await readFile(
          path.join(root, "database/policies/delegation-access.sql"),
          "utf8",
        ),
      );
      await tx.query("INSERT INTO schema_migrations(version) VALUES ('010')");
    }
    if (
      process.env.DATABASE_URL &&
      !(await tx.query("SELECT 1 FROM schema_migrations WHERE version='013'"))
        .rows.length
    ) {
      await tx.exec(
        await readFile(
          path.join(root, "database/policies/integrity-access.sql"),
          "utf8",
        ),
      );
      await tx.query("INSERT INTO schema_migrations(version) VALUES ('013')");
    }
    if (
      process.env.DATABASE_URL &&
      !(await tx.query("SELECT 1 FROM schema_migrations WHERE version='015'"))
        .rows.length
    ) {
      await tx.exec(
        await readFile(
          path.join(root, "database/policies/services-access.sql"),
          "utf8",
        ),
      );
      await tx.query("INSERT INTO schema_migrations(version) VALUES ('015')");
    }
    if (
      process.env.DATABASE_URL &&
      !(await tx.query("SELECT 1 FROM schema_migrations WHERE version='017'"))
        .rows.length
    ) {
      await tx.exec(
        await readFile(
          path.join(root, "database/policies/catalogue-access.sql"),
          "utf8",
        ),
      );
      await tx.query("INSERT INTO schema_migrations(version) VALUES ('017')");
    }

    if (
      process.env.DATABASE_URL &&
      !(await tx.query("SELECT 1 FROM schema_migrations WHERE version='019'"))
        .rows.length
    ) {
      await tx.exec(
        await readFile(
          path.join(root, "database/policies/service-governance-access.sql"),
          "utf8",
        ),
      );
      await tx.query("INSERT INTO schema_migrations(version) VALUES ('019')");
    }
    if (
      process.env.DATABASE_URL &&
      !(await tx.query("SELECT 1 FROM schema_migrations WHERE version='021'"))
        .rows.length
    ) {
      await tx.exec(
        await readFile(
          path.join(root, "database/policies/bundles-access.sql"),
          "utf8",
        ),
      );
      await tx.query("INSERT INTO schema_migrations(version) VALUES ('021')");
    }
    if (
      process.env.DATABASE_URL &&
      !(await tx.query("SELECT 1 FROM schema_migrations WHERE version='022'"))
        .rows.length
    ) {
      await tx.exec(
        await readFile(
          path.join(root, "database/policies/staff-access.sql"),
          "utf8",
        ),
      );
      await tx.query("INSERT INTO schema_migrations(version) VALUES ('022')");
    }
    if (
      process.env.DATABASE_URL &&
      !(await tx.query("SELECT 1 FROM schema_migrations WHERE version='024'"))
        .rows.length
    ) {
      await tx.exec(
        await readFile(
          path.join(root, "database/policies/approval-gas-delivery-access.sql"),
          "utf8",
        ),
      );
      await tx.query("INSERT INTO schema_migrations(version) VALUES ('024')");
    }
    if (
      !(await tx.query("SELECT 1 FROM schema_migrations WHERE version='025'"))
        .rows.length
    ) {
      await tx.exec(
        await readFile(
          path.join(
            root,
            "database/migrations/025_gas_reporting_snapshots.sql",
          ),
          "utf8",
        ),
      );
      await tx.query("INSERT INTO schema_migrations(version) VALUES ('025')");
    }
    if (
      !(await tx.query("SELECT 1 FROM schema_migrations WHERE version='027'"))
        .rows.length
    ) {
      await tx.exec(
        await readFile(
          path.join(
            root,
            "database/migrations/027_cylinder_maintenance_draft.sql",
          ),
          "utf8",
        ),
      );
      await tx.query("INSERT INTO schema_migrations(version) VALUES ('027')");
    }
    for (const [version, file] of [
      ["028", "database/migrations/028_inventory_finance.sql"],
      ["029", "database/policies/inventory-finance-access.sql"],
      ["030", "database/migrations/030_stocktake_sessions.sql"],
      ["031", "database/policies/stocktake-session-access.sql"],
      ["032", "database/migrations/032_customer_refill_feedback.sql"],
      ["033", "database/migrations/033_service_booking_recovery.sql"],
      ["034", "database/migrations/034_homepage_testimonials.sql"],
      ["035", "database/migrations/035_homepage_editorial_content.sql"],
      ["036", "database/migrations/036_testimonial_media_consent.sql"],
      ["037", "database/policies/testimonial-access.sql"],
      ["038", "database/migrations/038_address_default_compatibility.sql"],
      ["039", "database/policies/address-default-access.sql"],
      ["040", "database/migrations/040_order_tracking.sql"],
      ["041", "database/migrations/041_tracking_audit_hardening.sql"],
      ["042", "database/migrations/042_tracking_support.sql"],
      ["043", "database/migrations/043_easyrewards.sql"],
      ["044", "database/migrations/044_rewards_completion.sql"],
      ["045", "database/migrations/045_rewards_recovery.sql"],
      ["046", "database/migrations/046_rewards_runtime_policy.sql"],
      ["047", "database/migrations/047_assisted_customer_identity.sql"],
      ["048", "database/migrations/048_issued_order_invoices.sql"],
      ["049", "database/migrations/049_invoice_access_hardening.sql"],
      ["050", "database/migrations/050_operations_completion.sql"],
      ["051", "database/migrations/051_proof_retention.sql"],
      ["052", "database/migrations/052_driver_workspace.sql"],
      ["053", "database/migrations/053_technician_work_authorisation.sql"],
      ["054", "database/migrations/054_technician_session_scope.sql"],
      ["055", "database/migrations/055_service_proof.sql"],
      ["056", "database/migrations/056_service_assignment_response.sql"],
      ["057", "database/migrations/057_paystack_sandbox.sql"],
      ["058", "database/migrations/058_bulk_lpg_custody.sql"],
      ["059", "database/migrations/059_bulk_recovery_operation.sql"],
      ["060", "database/migrations/060_doorstep_execution.sql"],
      ["061", "database/migrations/061_service_invoices.sql"],
      ["062", "database/migrations/062_service_invoice_drafts.sql"],
      ["063", "database/migrations/063_dispatch_routing.sql"],
      ["064", "database/migrations/064_doorstep_cylinders.sql"],
      ["065", "database/migrations/065_invoice_excess.sql"],
      ["066", "database/migrations/066_vehicle_products.sql"],
      ["067", "database/migrations/067_vehicle_product_guards.sql"],
      ["068", "database/migrations/068_service_exception_settlements.sql"],
      ["069", "database/migrations/069_service_material_recovery.sql"],
      ["070", "database/migrations/070_driver_contact.sql"],
      ["071", "database/migrations/071_wallet_bank_transfers.sql"],
      ["072", "database/migrations/072_document_identity.sql"],
      ["073", "database/migrations/073_order_card_payment.sql"],
      ["074", "database/migrations/074_order_additions.sql"],
      ["075", "database/migrations/075_staff_privileges.sql"],
      ["076", "database/migrations/076_support_completion.sql"],
      ["077", "database/migrations/077_temporary_passwords.sql"],
      ["078", "database/migrations/078_staff_role_consolidation.sql"],
    ]) {
      if (
        version === "044" &&
        !(await one(
          tx,
          "SELECT version FROM schema_migrations WHERE version='043c'",
        ))
      ) {
        const tables = await one(
          tx,
          "SELECT to_regclass('reward_order_discounts') AS discounts,to_regclass('reward_referrals') AS referrals",
        );
        if (!tables?.discounts && !tables?.referrals) {
          await tx.exec(
            await readFile(
              path.join(
                root,
                "database/migrations/043c_early_rewards_compatibility.sql",
              ),
              "utf8",
            ),
          );
        } else if (!tables.discounts || !tables.referrals) {
          throw new Error(
            "Inconsistent EasyRewards schema requires an operator-reviewed compatibility repair.",
          );
        }
        await tx.query("INSERT INTO schema_migrations(version) VALUES('043c')");
      }
      if (
        (!["029", "031", "037", "039"].includes(version) ||
          process.env.DATABASE_URL) &&
        !(
          await tx.query("SELECT 1 FROM schema_migrations WHERE version=$1", [
            version,
          ])
        ).rows.length
      ) {
        await tx.exec(await readFile(path.join(root, file), "utf8"));
        await tx.query("INSERT INTO schema_migrations(version) VALUES($1)", [
          version,
        ]);
      }
    }
  });
}
export const localSchemaRevision = 78;
export async function getDb() {
  const db = await (globalDb.easygasDb ??= createDatabase());
  // Apply local upgrades once after development hot reload, on the existing DB connection.
  // Managed/production databases always require an explicit migration command.
  if (
    process.env.NODE_ENV !== "production" &&
    !process.env.DATABASE_URL &&
    globalDb.easygasLocalVersion !== localSchemaRevision
  ) {
    if (!globalDb.easygasLocalMigration)
      globalDb.easygasLocalMigration = migrate(db)
        .then(() => {
          globalDb.easygasLocalVersion = localSchemaRevision;
        })
        .finally(() => {
          globalDb.easygasLocalMigration = undefined;
        });
    await globalDb.easygasLocalMigration;
  }
  const { startMaintenance } = await import("./maintenance");
  startMaintenance(db);
  return db;
}
export async function one<T extends Row = Row>(
  tx: SQL,
  q: string,
  p: any[] = [],
): Promise<T | undefined> {
  return (await tx.query<T>(q, p)).rows[0];
}
