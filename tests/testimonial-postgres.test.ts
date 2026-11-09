import test from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";
import { migrate, one, type DB } from "../apps/web/lib/db";
import { fixture } from "./helpers/service-fixture";
import { id } from "../apps/web/lib/auth";
import { dispatch } from "../apps/web/lib/service";
const enabled =
  process.env.EASYGAS_ENABLE_LOCAL_PG_TESTS === "yes" &&
  !!process.env.EASYGAS_TEST_POSTGRES_URL;
test(
  "TM-PG: independent PostgreSQL connections prevent duplicate/stale moderation and consent withdrawal wins publication races",
  {
    skip: enabled
      ? false
      : "No explicitly enabled disposable local PostgreSQL server; serialized PGlite does not prove multi-connection moderation.",
  },
  async () => {
    const url = new URL(process.env.EASYGAS_TEST_POSTGRES_URL!);
    if (
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
      !url.pathname.startsWith("/easygas_test") ||
      process.env.DATABASE_URL
    )
      throw new Error(
        "Only an isolated local easygas_test database with DATABASE_URL unset is permitted.",
      );
    const schema = "easygas_test_" + id().replaceAll("-", ""),
      admin = new Pool({ connectionString: url.toString(), max: 1 });
    await admin.query(`CREATE SCHEMA ${schema}`);
    const pool = new Pool({
      connectionString: url.toString(),
      max: 6,
      options: `-c search_path=${schema},pg_catalog -c statement_timeout=15000 -c lock_timeout=5000`,
    });
    const db: DB = {
      query: async (q, p) => (await pool.query(q, p)) as any,
      exec: (q) => pool.query(q),
      transaction: async (fn) => {
        const c = await pool.connect();
        try {
          await c.query("BEGIN");
          const result = await fn({
            query: async (q, p) => (await c.query(q, p)) as any,
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
    try {
      await migrate(db);
      const f = await fixture(db);
      const content = {
        rating: 1,
        body: "Synthetic concurrent PostgreSQL feedback for isolated testing only.",
        nameStyle: "custom",
        displayName: "Synthetic PG Customer",
        consent: true,
      };
      async function purchase() {
        const oid = id();
        await db.query(
          "INSERT INTO orders(id,reference,customer_id,branch_id,status,payment_status,delivery_code_hash,delivery_code_expires_at,payment_method,subtotal_kobo,delivery_kobo,total_kobo,address,delivery_date,delivery_window,idempotency_key,request_hash) VALUES($1,$1,$2,'lagos','delivered','verified','synthetic',now()+interval '1 day','cash',1000,0,1000,'{}','2026-11-01','QA',$1,'synthetic')",
          [oid, f.actors.customer.id],
        );
        await db.query(
          "INSERT INTO verified_payments(id,order_id,reference,amount_kobo,method,verified_by) VALUES($1,$2,$1,1000,'cash',$3)",
          [id(), oid, f.actors.finance.id],
        );
        return oid;
      }
      const request = { orderId: await purchase(), content };
      const duplicates = await Promise.allSettled([
        f.call("customer", "testimonial.create", request),
        f.call("customer", "testimonial.create", request),
      ]);
      assert.equal(
        duplicates.filter((r) => r.status === "fulfilled").length,
        1,
      );
      let a = (
        duplicates.find(
          (r) => r.status === "fulfilled",
        ) as PromiseFulfilledResult<any>
      ).value;
      a = await f.call("customer", "testimonial.transition", {
        id: a.id,
        revision: a.revision,
        status: "PENDING_REVIEW",
      });
      const decisions = await Promise.allSettled(
        ["APPROVED", "REJECTED"].map((status) =>
          f.call("owner", "testimonial.transition", {
            id: a.id,
            revision: a.revision,
            status,
            reason: "Synthetic simultaneous moderation decision",
          }),
        ),
      );
      assert.equal(decisions.filter((r) => r.status === "fulfilled").length, 1);
      let b = await f.call("customer", "testimonial.create", {
        orderId: await purchase(),
        content,
      });
      b = await f.call("customer", "testimonial.transition", {
        id: b.id,
        revision: b.revision,
        status: "PENDING_REVIEW",
      });
      b = await f.call("owner", "testimonial.transition", {
        id: b.id,
        revision: b.revision,
        status: "APPROVED",
        reason: "Synthetic independent approval",
      });
      const race = await Promise.allSettled([
        f.call("owner", "testimonial.transition", {
          id: b.id,
          revision: b.revision,
          status: "PUBLISHED",
          reason: "Synthetic publication race",
        }),
        f.call("customer", "testimonial.transition", {
          id: b.id,
          revision: b.revision,
          status: "WITHDRAWN",
        }),
      ]);
      assert.equal(race[1].status, "fulfilled");
      assert.equal(
        (
          await one(
            db,
            "SELECT status FROM customer_testimonials WHERE id=$1",
            [b.id],
          )
        )?.status,
        "WITHDRAWN",
      );
      assert.equal(
        Number(
          (
            await one(
              db,
              "SELECT count(*) AS n FROM testimonial_events WHERE testimonial_id=$1 AND to_status='WITHDRAWN'",
              [b.id],
            )
          )?.n,
        ),
        1,
      );
      let c = await f.call("customer", "testimonial.create", {
        orderId: await purchase(),
        content,
      });
      c = await f.call("customer", "testimonial.transition", {
        id: c.id,
        revision: c.revision,
        status: "PENDING_REVIEW",
      });
      const editRace = await Promise.allSettled([
        f.call("customer", "testimonial.edit", {
          id: c.id,
          revision: c.revision,
          content: {
            ...content,
            body: "Synthetic corrected customer feedback requiring a fresh review.",
          },
        }),
        f.call("owner", "testimonial.transition", {
          id: c.id,
          revision: c.revision,
          status: "APPROVED",
          reason: "Synthetic concurrent customer edit review",
        }),
      ]);
      assert.equal(editRace.filter((r) => r.status === "fulfilled").length, 1);
      const current = await one(
        db,
        "SELECT * FROM customer_testimonials WHERE id=$1",
        [c.id],
      );
      assert.ok(
        current?.status === "DRAFT"
          ? current.reviewed_version === null
          : current?.reviewed_version === current?.current_version,
      );
      assert.deepEqual(await dispatch("testimonials.public", null, {}, db), []);
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA ${schema} CASCADE`);
      await admin.end();
    }
  },
);
