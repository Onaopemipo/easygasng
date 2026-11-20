import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createDatabase } from "../apps/web/lib/db";
import { dispatch } from "../apps/web/lib/service";
import { id, hashPassword, issueSession } from "../apps/web/lib/auth";
import {
  ledgerPath,
  ledgerFingerprint,
  readVerifiedLedger,
} from "../scripts/lib/hosted-ledger.mjs";

const row = (n: number) => ({
  id: String(n).padStart(8, "0") + "-0000-4000-8000-000000000000",
  reference: "synthetic-" + n,
  amount_kobo: "10000",
  method: "wallet",
  created_at: "2026-11-20T00:00:00.000Z",
  order_reference: "synthetic",
  booking_reference: null,
  branch_id: "lagos",
});
const response = (rows: any[], hasMore = false, nextCursor: any = null) => ({
  status: 200,
  cacheControl: "no-store",
  body: { rows, hasMore, nextCursor },
});
test("HLED-TOOL: correct endpoint follows every cursor, fingerprints reporting fields and accepts empty terminal pages", async () => {
  assert.equal(
    ledgerPath(1, row(1).id),
    "finance.ledger?limit=1&after=" + row(1).id,
  );
  for (const limit of [0, 501, 1.5]) assert.throws(() => ledgerPath(limit));
  const paths: string[] = [];
  const ledger = await readVerifiedLedger(
    async (path: string) => {
      paths.push(path);
      return paths.length === 1
        ? response([row(1)], true, row(1).id)
        : response([row(2)]);
    },
    { limit: 1 },
  );
  assert.deepEqual(paths, [ledgerPath(1), ledgerPath(1, row(1).id)]);
  assert.equal(ledger.count, 2);
  assert.equal(ledger.sha256, ledgerFingerprint([row(1), row(2)]));
  assert.equal((await readVerifiedLedger(async () => response([]))).count, 0);
});
test("HLED-TOOL-NEG: failed, cached, malformed, duplicate, unordered and nonadvancing pages fail acceptance", async () => {
  for (const bad of [
    { ...response([]), status: 403 },
    { ...response([]), cacheControl: "public" },
    response([row(1), row(2)]),
    response([], true, row(1).id),
    response([row(1)], true, row(2).id),
    response([{ ...row(1), secret: "never allowed" }]),
    response([{ ...row(1), amount_kobo: "1.5" }]),
    response([{ ...row(1), created_at: "bad" }]),
    { ...response([]), body: { rows: [], hasMore: "false", nextCursor: null } },
    response([], false, row(1).id),
  ])
    await assert.rejects(() =>
      readVerifiedLedger(async () => bad, { limit: 1 }),
    );
  let n = 0;
  await assert.rejects(
    () =>
      readVerifiedLedger(
        async () =>
          ++n === 1 ? response([row(1)], true, row(1).id) : response([row(1)]),
        { limit: 1 },
      ),
    /repeated/,
  );
  n = 0;
  await assert.rejects(
    () =>
      readVerifiedLedger(
        async () =>
          ++n === 1 ? response([row(2)], true, row(2).id) : response([row(1)]),
        { limit: 1 },
      ),
    /tie ordering/,
  );
  await assert.rejects(
    () =>
      readVerifiedLedger(async () => response([row(1)], true, row(1).id), {
        limit: 1,
        maxPages: 1,
      }),
    /bounded/,
  );
});

test("HLED-ISOLATION: restricted dispatcher isolates branch cursors, preserves tied payments and source records, and denies all five nonfinance roles", async () => {
  const db = await createDatabase("memory://");
  try {
    await db.exec(await readFile("database/bootstrap.sql", "utf8"));
    await db.exec("SET search_path TO easygas_private,pg_catalog");
    const ids: Record<string, string> = {},
      tokens: Record<string, string> = {};
    for (const role of [
      "owner",
      "finance",
      "manager",
      "driver",
      "technician",
      "customer",
      "commercial",
    ]) {
      ids[role] = id();
      await db.query(
        "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,$2,$3,$4,$2,'lagos')",
        [
          ids[role],
          role,
          ids[role] + "@ledger.example.test",
          hashPassword("Synthetic-ledger-only-123!"),
        ],
      );
      tokens[role] = await issueSession(db, ids[role]);
    }
    await db.query(
      "INSERT INTO branches(id,name) VALUES('other','Synthetic other branch')",
    );
    for (const [index, branch] of ["lagos", "other", "lagos"].entries()) {
      const orderId = id();
      await db.query(
        "INSERT INTO orders(id,reference,customer_id,branch_id,payment_method,subtotal_kobo,delivery_kobo,total_kobo,address,delivery_date,delivery_window,idempotency_key,request_hash,delivery_code_hash,delivery_code_expires_at) VALUES($1,$1,$2,$3,'wallet',10000,0,10000,'{}','2026-11-20','synthetic',$1,'synthetic','synthetic',now())",
        [orderId, ids.customer, branch],
      );
      await db.query(
        "INSERT INTO verified_payments(id,order_id,reference,amount_kobo,method,verified_by,created_at) VALUES($1,$2,$1,10000,'wallet',$3,'2026-11-20T00:00:00Z')",
        [row(index + 1).id, orderId, ids.owner],
      );
    }
    const source = async () => {
      const data: Record<string, any> = {};
      for (const table of [
        "verified_payments",
        "orders",
        "wallet_entries",
        "credit_requests",
        "inventory",
      ])
        data[table] = (
          await db.query(
            `SELECT to_jsonb(t) AS data FROM ${table} t ORDER BY to_jsonb(t)::text`,
          )
        ).rows;
      return JSON.stringify(data);
    };
    const before = await source();
    await db.exec("SET ROLE easygas_server");
    const call = (role: string, input: any = {}) =>
      dispatch("finance.ledger", tokens[role], input, db);
    const read = (role: string, limit: number) =>
      readVerifiedLedger(
        async (path: string) => {
          const params = Object.fromEntries(
            new URLSearchParams(path.split("?")[1]),
          );
          return {
            status: 200,
            cacheControl: "no-store",
            body: await call(role, params),
          };
        },
        { limit },
      );
    const owner = await read("owner", 1),
      finance = await read("finance", 1);
    assert.deepEqual(
      owner.rows.map((r: any) => r.id),
      [row(1).id, row(2).id, row(3).id],
    );
    assert.deepEqual(
      finance.rows.map((r: any) => r.id),
      [row(1).id, row(3).id],
    );
    assert.equal((await read("owner", 500)).sha256, owner.sha256);
    await assert.rejects(
      () => call("finance", { after: row(2).id }),
      /valid report cursor/,
    );
    await assert.rejects(
      () => call("owner", { after: row(99).id }),
      /valid report cursor/,
    );
    assert.deepEqual((await call("owner", { after: row(3).id })).rows, []);
    for (const role of [
      "manager",
      "driver",
      "technician",
      "customer",
      "commercial",
    ])
      for (const input of [{ limit: 1 }, { after: "malformed" }])
        await assert.rejects(() => call(role, input), /permission/);
    for (const input of [
      { branchId: "other" },
      { role: "owner" },
      { limit: 0 },
      { limit: 501 },
      { after: "malformed" },
    ])
      await assert.rejects(() => call("finance", input));
    await db.exec("RESET ROLE");
    assert.equal(await source(), before);
    assert.ok(
      Number(
        (
          await db.query(
            "SELECT count(*) AS n FROM audit_events WHERE action='finance.ledger_viewed'",
          )
        ).rows[0].n,
      ) > 0,
    );
    assert.ok(
      Number(
        (
          await db.query(
            "SELECT count(*) AS n FROM audit_events WHERE outcome='denied'",
          )
        ).rows[0].n,
      ) > 0,
    );
  } finally {
    await db.close?.();
  }
});
