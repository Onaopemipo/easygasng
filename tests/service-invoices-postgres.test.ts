import test from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { migrate, type DB } from "../apps/web/lib/db";
import { fixture, begin } from "./helpers/service-fixture";
import { id, actor } from "../apps/web/lib/auth";
import { serviceInvoiceAction } from "../apps/web/lib/service-invoices";
const enabled =
  process.env.EASYGAS_ENABLE_LOCAL_PG_TESTS === "yes" &&
  !!process.env.EASYGAS_TEST_POSTGRES_URL;
test(
  "SINV-PG01: independent connections issue one immutable service invoice, replay one request and rollback aborted issue",
  { skip: enabled ? false : "Disposable PostgreSQL required" },
  async () => {
    const url = new URL(process.env.EASYGAS_TEST_POSTGRES_URL!);
    if (
      !["127.0.0.1", "localhost"].includes(url.hostname) ||
      !url.pathname.startsWith("/easygas_test") ||
      process.env.DATABASE_URL
    )
      throw new Error("Disposable local PostgreSQL only");
    const schema = "easygas_test_sinv_" + id().replaceAll("-", "");
    const admin = new Pool({ connectionString: String(url), max: 1 });
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
        const c = await pool.connect();
        try {
          await c.query("BEGIN");
          const result = await fn({
            query: (q, p) => c.query(q, p),
            exec: (q) => c.query(q),
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
    const previous = process.env.EASYGAS_MESSAGE_ENCRYPTION_KEY;
    process.env.EASYGAS_MESSAGE_ENCRYPTION_KEY = "e".repeat(64);
    try {
      await migrate(db);
      const f = await fixture(db);
      const draftBooking = await begin(f);

      const draftInput = {
        bookingId: draftBooking.id,
        expectedRevision: 0,
        dueDate: "2026-12-20",
        customerNote: "Synthetic concurrent draft",
        reason: "Independent connection draft test",
      };
      const saves = await Promise.allSettled([
        f.call("finance", "invoice.service.draft.save", {
          ...draftInput,
          operationKey: id(),
        }),
        f.call("owner", "invoice.service.draft.save", {
          ...draftInput,
          operationKey: id(),
        }),
      ]);
      assert.equal(saves.filter((r) => r.status === "fulfilled").length, 1);
      assert.equal(
        (
          saves.find(
            (r) => r.status === "fulfilled",
          ) as PromiseFulfilledResult<any>
        ).value.savedRevision.due_date,
        "2026-12-20",
      );
      assert.equal(
        saves.filter(
          (r) =>
            r.status === "rejected" && /Draft changed/.test(String(r.reason)),
        ).length,
        1,
      );
      await assert.rejects(
        () =>
          db.transaction(async (tx) => {
            const u = await actor(tx, f.actors.finance.token);
            await serviceInvoiceAction(tx, u, "invoice.service.draft.save", {
              ...draftInput,
              expectedRevision: 1,
            });
            throw new Error("Synthetic draft save abort");
          }),
        /Synthetic draft save abort/,
      );
      assert.equal(
        Number(
          (
            await db.query(
              "SELECT count(*) n FROM service_invoice_drafts WHERE booking_id=$1",
              [draftBooking.id],
            )
          ).rows[0].n,
        ),
        1,
      );
      const draftRls = (
        await db.query(
          "SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid='service_invoice_drafts'::regclass",
        )
      ).rows[0];
      assert.equal(draftRls.relrowsecurity, true);
      assert.equal(draftRls.relforcerowsecurity, true);
      await f.db.query(
        "UPDATE service_bookings SET status='cancelled' WHERE id=$1",
        [draftBooking.id],
      );
      const b = await begin(f);
      await assert.rejects(
        () =>
          db.transaction(async (tx) => {
            const u = await actor(tx, f.actors.finance.token);
            await serviceInvoiceAction(tx, u, "invoice.service.issue", {
              bookingId: b.id,
            });
            throw new Error(
              "Synthetic abort after immutable snapshot and audit",
            );
          }),
        /Synthetic abort/,
      );
      assert.equal(
        Number(
          (await db.query("SELECT count(*) n FROM customer_invoices")).rows[0]
            .n,
        ),
        0,
      );
      const issued = await Promise.all([
        f.call("finance", "invoice.service.issue", { bookingId: b.id }),
        f.call("owner", "invoice.service.issue", { bookingId: b.id }),
      ]);
      assert.equal(issued[0].invoice.id, issued[1].invoice.id);
      assert.equal(
        Number(
          (await db.query("SELECT count(*) n FROM customer_invoices")).rows[0]
            .n,
        ),
        1,
      );
      const request = { bookingId: b.id, operationKey: id() };
      const results = await Promise.all([
        f.call("finance", "invoice.request.create", request),
        f.call("finance", "invoice.request.create", request),
      ]);
      assert.equal(results[0].requestId, results[1].requestId);
      assert.equal(
        Number(
          (await db.query("SELECT count(*) n FROM invoice_payment_requests"))
            .rows[0].n,
        ),
        1,
      );
      await assert.rejects(
        () =>
          db.query("DELETE FROM customer_invoices WHERE booking_id=$1", [b.id]),
        /immutable/,
      );
      const rls = (
        await db.query(
          "SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid='customer_invoices'::regclass",
        )
      ).rows[0];
      assert.equal(rls.relrowsecurity, true);
      assert.equal(rls.relforcerowsecurity, true);
    } finally {
      if (previous === undefined)
        delete process.env.EASYGAS_MESSAGE_ENCRYPTION_KEY;
      else process.env.EASYGAS_MESSAGE_ENCRYPTION_KEY = previous;
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  },
);
