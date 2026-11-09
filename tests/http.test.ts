import { before, test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { createDatabase, migrate, type DB } from "../apps/web/lib/db";
import { id, hashPassword, issueSession } from "../apps/web/lib/auth";
import { GET, POST } from "../apps/web/app/api/[action]/route";
let db: DB, salesToken: string;
before(async () => {
  db = await createDatabase("memory://");
  await migrate(db);
  (globalThis as any).easygasDb = Promise.resolve(db);
  const uid = id();
  await db.query(
    "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES ($1,'HTTP Test Sales',$2,$3,'sales','lagos')",
    [uid, `${uid}@example.test`, hashPassword("Http-test-only-123!")],
  );
  salesToken = await issueSession(db, uid);
});
const context = (action: string) => ({ params: Promise.resolve({ action }) });
test("direct URL API refuses unauthenticated financial settings", async () => {
  const response = await GET(
    new NextRequest(
      "http://localhost:3000/api/setting.history?key=payment.settlement&scope=lagos",
    ),
    context("setting.history"),
  );
  assert.equal(response.status, 401);
});
test("web cookie and mobile bearer requests enforce identical restricted-setting rules", async () => {
  for (const headers of [
    { cookie: `easygas_session=${salesToken}` },
    { authorization: `Bearer ${salesToken}`, "x-easygas-client": "native" },
  ] as Record<string, string>[]) {
    const response = await GET(
      new NextRequest(
        "http://localhost:3000/api/setting.history?key=payment.settlement&scope=lagos",
        { headers },
      ),
      context("setting.history"),
    );
    assert.equal(response.status, 403);
    assert.ok(!(await response.text()).includes("account:"));
  }
});
test("mobile bearer tokens cannot approve fabricated requests or impersonate privileged identities", async () => {
  const response = await POST(
    new NextRequest("http://localhost:3000/api/approval.decide", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${salesToken}`,
        "x-easygas-client": "native",
      },
      body: JSON.stringify({
        id: id(),
        decision: "approve",
        reason: "",
        approverId: id(),
        role: "owner",
      }),
    }),
    context("approval.decide"),
  );
  assert.equal(response.status, 400);
});
test("cross-origin mutation is refused before processing credentials", async () => {
  const response = await POST(
    new NextRequest("http://localhost:3000/api/login", {
      method: "POST",
      headers: {
        origin: "https://other.example",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: "nobody@example.test",
        password: "Test-password-123!",
      }),
    }),
    context("login"),
  );
  assert.equal(response.status, 403);
});
test("JSON is mandatory and GET cannot mutate state", async () => {
  const response = await POST(
    new NextRequest("http://localhost:3000/api/login", {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: "test",
    }),
    context("login"),
  );
  assert.equal(response.status, 415);
  assert.equal(
    (
      await GET(
        new NextRequest("http://localhost:3000/api/approval.decide"),
        context("approval.decide"),
      )
    ).status,
    405,
  );
});
test("native sign-in returns an opaque token, web sign-in keeps it in an HttpOnly cookie", async () => {
  const uid = id(),
    email = `${uid}@example.test`;
  await db.query(
    "INSERT INTO users(id,name,email,password_hash,role) VALUES ($1,'HTTP Test Customer',$2,$3,'customer')",
    [uid, email, hashPassword("Http-test-only-123!")],
  );
  for (const native of [false, true]) {
    const response = await POST(
      new NextRequest("http://localhost:3000/api/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(native ? { "x-easygas-client": "native" } : {}),
        },
        body: JSON.stringify({ email, password: "Http-test-only-123!" }),
      }),
      context("login"),
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(typeof body.token, native ? "string" : "undefined");
    assert.match(response.headers.get("set-cookie") ?? "", /HttpOnly/i);
    assert.equal(body.role, "customer");
  }
});
test("oversized JSON bodies and malformed origin values are refused", async () => {
  const large = await POST(
    new NextRequest("http://localhost:3000/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: "x".repeat(40000) }),
    }),
    context("login"),
  );
  assert.equal(large.status, 413);
  const origin = await POST(
    new NextRequest("http://localhost:3000/api/login", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "null" },
      body: "{}",
    }),
    context("login"),
  );
  assert.equal(origin.status, 403);
});
test("aggregate authentication budget persists across identities and resets after its window", async () => {
  const { digest } = await import("../apps/web/lib/auth");
  const bucket = digest("http-auth:login");
  await db.query(
    "INSERT INTO auth_attempts(key,attempts,reset_at) VALUES ($1,40,now()+interval '1 minute') ON CONFLICT(key) DO UPDATE SET attempts=40,reset_at=now()+interval '1 minute'",
    [bucket],
  );
  const request = () =>
    new NextRequest("http://localhost:3000/api/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "different-budget-identity@example.test",
        password: "Http-test-only-123!",
      }),
    });
  assert.equal((await POST(request(), context("login"))).status, 429);
  await db.query(
    "UPDATE auth_attempts SET reset_at=now()-interval '1 second' WHERE key=$1",
    [bucket],
  );
  assert.equal((await POST(request(), context("login"))).status, 401);
  assert.equal(
    (
      await db.query("SELECT attempts FROM auth_attempts WHERE key=$1", [
        bucket,
      ])
    ).rows[0].attempts,
    1,
  );
});
test("G,H: live subscriptions reject forged branch scope, deduplicate committed snapshots and terminate after suspension", async () => {
  const { GET: liveGET } = await import(
    "../apps/web/app/api/business-live/route"
  );
  const scoped = await liveGET(
    new NextRequest(
      "http://localhost:3000/api/business-live?branchId=another-branch",
      { headers: { cookie: `easygas_session=${salesToken}` } },
    ),
  );
  assert.equal(scoped.status, 403);
  const missing = await liveGET(
    new NextRequest("http://localhost:3000/api/business-live"),
  );
  assert.equal(missing.status, 401);
  const abort = new AbortController();
  const res = await liveGET(
    new NextRequest("http://localhost:3000/api/business-live", {
      headers: { cookie: `easygas_session=${salesToken}` },
      signal: abort.signal,
    }),
  );
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("cache-control"), "no-store, no-transform");
  const reader = res.body!.getReader();
  const first = new TextDecoder().decode((await reader.read()).value);
  assert.ok(first.includes("event: snapshot"));
  assert.ok(!first.includes("walletLiabilityKobo"));
  assert.ok(!first.includes("unit_cost_kobo"));
  const heartbeat = new TextDecoder().decode((await reader.read()).value);
  assert.ok(heartbeat.includes("event: heartbeat"));
  assert.ok(!heartbeat.includes("event: snapshot"));
  await db.query(
    "UPDATE users SET active=false WHERE id=(SELECT user_id FROM sessions WHERE id=$1)",
    [(await import("../apps/web/lib/auth")).digest(salesToken)],
  );
  const next = new TextDecoder().decode((await reader.read()).value);
  assert.ok(next.includes("event: revoked"));
  assert.equal((await reader.read()).done, true);
  abort.abort();
  await db.query(
    "UPDATE users SET active=true WHERE id=(SELECT user_id FROM sessions WHERE id=$1)",
    [(await import("../apps/web/lib/auth")).digest(salesToken)],
  );
});
