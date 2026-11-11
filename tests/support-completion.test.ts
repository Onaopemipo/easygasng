import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import sharp from "sharp";
import {
  createDatabase,
  localSchemaRevision,
  migrate,
  one,
  type DB,
} from "../apps/web/lib/db";
import { hashPassword, id, issueSession } from "../apps/web/lib/auth";
import { dispatch } from "../apps/web/lib/service";
import { supportDueAt } from "../apps/web/lib/support-sla";
import { POST as upload } from "../apps/web/app/api/media/route";
import { GET as download } from "../apps/web/app/api/media/[id]/route";
import { GET as read } from "../apps/web/app/api/[action]/route";
const globals = globalThis as any;
const origin = "http://localhost:3003";
const password = "Support-local-test-only-123!";
let db: DB;
let requestId: string;
let photo: Buffer;
const tokens: Record<string, string> = {};
const users: Record<string, string> = {};
const policy = {
  responseMinutes: 60,
  resolutionMinutes: 120,
  weekdays: [1, 2, 3, 4, 5],
  startHour: 9,
  endHour: 17,
};
const call = (role: string, action: string, data = {}) =>
  dispatch(action, tokens[role], data, db);
const readApi = (role: string, action: string, query: string) =>
  read(
    new NextRequest(`${origin}/api/${action}?${query}`, {
      headers: { authorization: `Bearer ${tokens[role]}` },
    }),
    { params: Promise.resolve({ action }) },
  );

before(async () => {
  process.env.EASYGAS_BACKGROUND_JOBS = "false";
  process.env.APP_URL = origin;
  db = await createDatabase("memory://");
  await migrate(db);
  globals.easygasDb = Promise.resolve(db);
  globals.easygasLocalVersion = localSchemaRevision;
  await db.query(
    "INSERT INTO branches(id,name) VALUES ('support-test-branch','Support test branch')",
  );
  const hash = hashPassword(password);
  for (const [name, role, branch] of [
    ["owner", "owner", "lagos"],
    ["manager", "manager", "lagos"],
    ["otherManager", "manager", "support-test-branch"],
    ["readOnly", "inventory", "lagos"],
    ["customer", "customer", "lagos"],
    ["other", "customer", "lagos"],
    ["driver", "driver", "lagos"],
  ]) {
    users[name] = id();
    await db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,$2,$3,$4,$5,$6)",
      [
        users[name],
        name,
        `${name}@support-fixture.invalid`,
        hash,
        role,
        branch,
      ],
    );
    tokens[name] = await issueSession(db, users[name]);
  }
  await db.query(
    "INSERT INTO staff_privilege_overrides(user_id,privilege,effect,changed_by,role_at_change,branch_at_change) VALUES($1,'support.view','grant',$2,'inventory','lagos')",
    [users.readOnly, users.owner],
  );
  photo = await sharp({
    create: { width: 12, height: 12, channels: 3, background: "green" },
  })
    .png()
    .toBuffer();
  requestId = (
    await call("customer", "support.create", {
      subject: "Older stove question",
      message: "I have a question about my stove.",
    })
  ).id;
});
after(async () => {
  await db?.close?.();
  delete globals.easygasDb;
});

test("SUPPORT-C01: list scans all scoped pages; search reaches beyond 100 requests", async () => {
  await db.query(
    `INSERT INTO support_requests(id,customer_id,subject,message,branch_id,updated_at)
    SELECT gen_random_uuid()::text,$1,'Newer request '||n,'Fixture request description','lagos',now()+n*interval '1 second' FROM generate_series(1,101) n`,
    [users.customer],
  );
  const first = await (
    await readApi("customer", "support.list", "view=paged&page=1")
  ).json();
  const readOnly = await (
    await readApi("readOnly", "support.list", "view=paged")
  ).json();
  assert.equal(readOnly.total, 102);
  assert.equal(readOnly.canManage, false);
  await assert.rejects(
    call("readOnly", "support.reply", {
      id: requestId,
      body: "Read-only staff must not reply.",
    }),
    /permission/,
  );
  assert.equal(first.total, 102);
  assert.equal(first.rows.length, 20);
  assert.equal(first.pages, 6);
  assert.equal(
    first.rows.some((row: any) => row.id === requestId || row.messages),
    false,
  );
  const last = await (
    await readApi("customer", "support.list", "view=paged&page=6")
  ).json();
  assert.equal(last.rows.length, 2);
  assert.ok(last.rows.some((row: any) => row.id === requestId));
  const result = await (
    await readApi("customer", "support.list", "view=paged&search=older%20stove")
  ).json();
  assert.deepEqual(
    result.rows.map((row: any) => row.id),
    [requestId],
  );
  assert.equal(
    (await (await readApi("otherManager", "support.list", "view=paged")).json())
      .total,
    0,
  );
  assert.equal(
    (await readApi("other", "support.detail", `id=${requestId}`)).status,
    404,
  );
  assert.equal(
    (await readApi("otherManager", "support.detail", `id=${requestId}`)).status,
    403,
  );
  assert.equal(
    (await readApi("driver", "support.detail", `id=${requestId}`)).status,
    403,
  );
});

test("SUPPORT-C02: immutable reply idempotency, message pagination and private-note isolation", async () => {
  await db.query(
    `INSERT INTO support_messages(id,request_id,author_id,body,internal,created_at)
    SELECT gen_random_uuid()::text,$1,$2,'Customer fixture reply '||n,false,now()-n*interval '1 second' FROM generate_series(1,31) n`,
    [requestId, users.customer],
  );
  const key = id();
  const reply = {
    id: requestId,
    body: "This is a public staff response.",
    operationId: key,
  };
  await call("manager", "support.reply", {
    id: requestId,
    body: "Staff-only notes must stay private.",
    internal: true,
    operationId: id(),
  });
  assert.equal(
    (
      await one(
        db,
        "SELECT first_response_at FROM support_requests WHERE id=$1",
        [requestId],
      )
    )?.first_response_at,
    null,
  );
  await call("manager", "support.reply", reply);
  assert.equal((await call("manager", "support.reply", reply)).replay, true);
  await assert.rejects(
    call("manager", "support.reply", {
      ...reply,
      body: "Different body for the same key",
    }),
    /already sent/,
  );
  const first = await call("customer", "support.detail", { id: requestId });
  const second = await call("customer", "support.detail", {
    id: requestId,
    page: 2,
  });
  assert.equal(first.messageTotal, 32);
  assert.equal(first.messages.length, 30);
  assert.equal(second.messages.length, 2);
  assert.equal(second.messages.at(-1).body, reply.body);
  assert.ok(!JSON.stringify([first, second]).includes("Staff-only notes"));
  assert.equal(
    (await call("manager", "support.detail", { id: requestId })).messageTotal,
    33,
  );
  await assert.rejects(
    call("manager", "support.update", {
      id: requestId,
      status: "resolved",
      version: 1,
    }),
    /changed/,
  );
});

test("SUPPORT-C03: authenticated image upload, private reads, validation, replay and limits", async () => {
  async function put(
    role: string,
    internal: boolean,
    bytes: Uint8Array = photo,
    type = "image/png",
    from = origin,
  ) {
    const body = new FormData();
    body.set("requestId", requestId);
    body.set("alt", "Photo of the fixture appliance");
    body.set("internal", String(internal));
    body.set(
      "image",
      new Blob([new Uint8Array(bytes)], { type }),
      "fixture.png",
    );
    return upload(
      new NextRequest(origin + "/api/media", {
        method: "POST",
        headers: { origin: from, authorization: `Bearer ${tokens[role]}` },
        body,
      }),
    );
  }
  const get = (role: string, image: string) =>
    download(
      new NextRequest(`${origin}/api/media/${image}`, {
        headers: role ? { authorization: `Bearer ${tokens[role]}` } : {},
      }),
      { params: Promise.resolve({ id: image }) },
    );
  const response = await put("customer", false);
  assert.equal(response.status, 200, await response.clone().text());
  const { id: image } = await response.json();
  assert.deepEqual(await (await put("customer", false)).json(), {
    id: image,
    replay: true,
  });
  const privateImage = (await (await put("manager", true)).json()).id;
  const allowed = await get("customer", image);
  assert.equal(allowed.status, 200);
  assert.equal(allowed.headers.get("cache-control"), "private, no-store");
  assert.equal(
    (await sharp(Buffer.from(await allowed.arrayBuffer())).metadata()).format,
    "webp",
  );
  assert.equal((await get("manager", privateImage)).status, 200);
  assert.equal((await get("customer", privateImage)).status, 404);
  assert.equal((await get("other", image)).status, 404);
  assert.equal((await get("otherManager", image)).status, 403);
  assert.equal((await get("", image)).status, 401);
  assert.equal((await put("customer", true)).status, 403);
  assert.equal((await put("other", false)).status, 404);
  assert.equal((await put("otherManager", false)).status, 403);
  assert.equal(
    (await put("customer", false, photo, "image/png", "https://wrong.example"))
      .status,
    403,
  );
  assert.equal((await put("customer", false, new Uint8Array(100))).status, 400);
  assert.equal(
    (await put("customer", false, photo, "image/svg+xml")).status,
    415,
  );
  assert.equal(
    (await put("customer", false, new Uint8Array(3 * 1024 * 1024 + 1))).status,
    413,
  );
  assert.deepEqual(
    (
      await call("customer", "support.detail", { id: requestId })
    ).attachments.map((a: any) => a.id),
    [image],
  );
  await db.query(
    `INSERT INTO support_attachments(id,request_id,owner_id,alt,mime,data,sha256) SELECT gen_random_uuid()::text,$1,$2,'Fixture evidence','image/webp',$3,'fixture'||n FROM generate_series(1,18) n`,
    [requestId, users.customer, photo],
  );
  assert.equal((await put("manager", false)).status, 409);
  await call("manager", "support.update", { id: requestId, status: "closed" });
  assert.equal((await put("customer", false)).status, 409);
});

test("SUPPORT-C04: Lagos work windows, governed SLA policy, snapshots and one-time escalation", async () => {
  assert.equal(
    supportDueAt(new Date("2026-11-13T15:45:00Z"), 60, policy).toISOString(),
    "2026-11-16T08:45:00.000Z",
  );
  await assert.rejects(
    call("customer", "support.sla.save", { branch: "lagos", policy }),
    /permission/,
  );
  await assert.rejects(
    call("manager", "support.sla.save", { branch: "lagos", policy }),
    /password/i,
  );
  await call("manager", "reauth", { password });
  await assert.rejects(
    call("manager", "support.sla.save", {
      branch: "support-test-branch",
      policy,
    }),
    /another branch/,
  );
  await call("manager", "support.sla.save", { branch: "lagos", policy });
  const ticket = (
    await call("customer", "support.create", {
      subject: "SLA test request",
      message: "Ticket fixture for SLA verification.",
    })
  ).id;
  const detail = await call("manager", "support.detail", { id: ticket });
  assert.deepEqual(detail.sla_policy, policy);
  assert.equal(detail.sla.response, "pending");
  await call("manager", "support.sla.save", {
    branch: "lagos",
    policy: { ...policy, responseMinutes: 90 },
  });
  assert.deepEqual(
    (await call("manager", "support.detail", { id: ticket })).sla_policy,
    policy,
  );
  await db.query(
    "UPDATE support_requests SET response_due_at=now()-interval '1 hour',resolution_due_at=now()-interval '1 minute' WHERE id=$1",
    [ticket],
  );
  assert.equal(
    (await call("manager", "support.detail", { id: ticket })).sla.response,
    "overdue",
  );
  assert.equal((await call("otherManager", "support.sla.scan")).checked, 0);
  assert.equal((await call("manager", "support.sla.scan")).checked, 1);
  assert.equal((await call("manager", "support.sla.scan")).checked, 0);
  assert.equal(
    Number(
      (
        await one(
          db,
          "SELECT count(*) AS n FROM support_sla_notices WHERE request_id=$1",
          [ticket],
        )
      )?.n,
    ),
    2,
  );
  await call("manager", "support.reply", {
    id: ticket,
    body: "Reply after the response target.",
  });
  await call("manager", "support.update", { id: ticket, status: "resolved" });
  assert.deepEqual(
    (await call("manager", "support.detail", { id: ticket })).sla,
    { response: "late", resolution: "late" },
  );
});

test(
  "SUPPORT-C05: concurrent reply and attachment retries commit one record each in PostgreSQL",
  {
    skip:
      process.env.EASYGAS_ENABLE_LOCAL_PG_TESTS !== "yes" ||
      !process.env.EASYGAS_TEST_POSTGRES_URL,
  },
  async () => {
    const url = new URL(process.env.EASYGAS_TEST_POSTGRES_URL!);
    assert.ok(
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
        url.pathname.startsWith("/easygas_test") &&
        !process.env.DATABASE_URL,
    );
    const { Pool } = await import("pg");
    const { actor } = await import("../apps/web/lib/auth");
    const { attachSupportImage } = await import("../apps/web/lib/support-desk");
    const schema = "easygas_test_" + id().replaceAll("-", "");
    const admin = new Pool({ connectionString: url.toString(), max: 1 });
    const pool = new Pool({
      connectionString: url.toString(),
      options: `-c search_path=${schema},pg_catalog`,
      max: 4,
    });
    const pg: DB = {
      query: async (q, p) => (await pool.query(q, p)) as any,
      exec: (q) => pool.query(q),
      transaction: async (fn) => {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const result = await fn({
            query: async (q, p) => (await client.query(q, p)) as any,
            exec: (q) => client.query(q),
          });
          await client.query("COMMIT");
          return result;
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        } finally {
          client.release();
        }
      },
    };
    try {
      await admin.query(`CREATE SCHEMA ${schema}`);
      await migrate(pg);
      const customerId = id();
      await pg.query(
        "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,'Support fixture','support-pg@local.invalid',$2,'customer','lagos')",
        [customerId, hashPassword(password)],
      );
      const token = await issueSession(pg, customerId);
      const { id: ticketId } = await dispatch(
        "support.create",
        token,
        {
          subject: "Concurrent support fixture",
          message: "Used to check duplicate retry protection.",
        },
        pg,
      );
      const reply = {
        id: ticketId,
        body: "A retried support reply.",
        operationId: id(),
      };
      const results = await Promise.all([
        dispatch("support.reply", token, reply, pg),
        dispatch("support.reply", token, reply, pg),
      ]);
      assert.equal(results.filter((r) => r.replay).length, 1);
      const save = () =>
        pg.transaction(async (tx) =>
          attachSupportImage(tx, await actor(tx, token), {
            requestId: ticketId,
            alt: "Concurrent image retry",
            internal: false,
            bytes: photo,
          }),
        );
      const attachments = await Promise.all([save(), save()]);
      assert.equal(attachments[0].id, attachments[1].id);
      assert.equal(attachments.filter((a) => a.replay).length, 1);
      const detail = await dispatch(
        "support.detail",
        token,
        { id: ticketId },
        pg,
      );
      assert.equal(detail.messageTotal, 1);
      assert.equal(detail.attachments.length, 1);
    } finally {
      await pool.end();
      await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      await admin.end();
    }
  },
);
