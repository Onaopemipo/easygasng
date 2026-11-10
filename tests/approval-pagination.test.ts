import test from "node:test";
import assert from "node:assert/strict";
import { createDatabase, migrate } from "../apps/web/lib/db";
import { id, hashPassword, issueSession } from "../apps/web/lib/auth";
import { dispatch } from "../apps/web/lib/service";
test("APPROVAL-PAGE01: server pagination covers more than 200 records with stable ordering, filtering, totals and bounded pages", async () => {
  const db = await createDatabase("memory://");
  await migrate(db);
  try {
    const owner = id();
    await db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,'Pagination owner',$2,$3,'owner','lagos')",
      [owner, owner + "@example.test", hashPassword("Fixture-only-123!")],
    );
    const token = await issueSession(db, owner);
    const call = (input: any) =>
      dispatch("approvals", token, { view: "paged", ...input }, db);
    // Synthetic isolated requests only; no settings or financial records are applied.
    await db.query(
      `INSERT INTO change_requests(id,key,scope,requester_id,previous_value,proposed_value,base_version,reason,risk,status,effective_at,expires_at,created_at)
 SELECT 'page-'||lpad(n::text,4,'0'),'gas.price_per_kg','lagos',$1,'180000','180500',1,'Pagination fixture',CASE WHEN n%2=0 THEN 4 ELSE 3 END,CASE WHEN n%2=0 THEN 'pending_approval' ELSE 'active' END,now(),now()+interval '1 day','2026-01-01'::timestamptz FROM generate_series(1,205) n`,
      [owner],
    );
    const first = await call({});
    assert.equal(first.total, 205);
    assert.equal(first.rows.length, 10);
    assert.equal(first.summary.total, 205);
    assert.equal(first.summary.pending, 102);
    assert.equal(first.summary.active, 103);
    assert.equal(first.rows[0].id, "page-0205");
    const all: string[] = [];
    for (let page = 1; page <= 5; page++) {
      const r = await call({ page, pageSize: 50 });
      all.push(...r.rows.map((x: any) => x.id));
    }
    assert.equal(all.length, 205);
    assert.equal(new Set(all).size, 205);
    assert.equal((await call({ pageSize: 20 })).rows.length, 20);
    const end = await call({ page: 999 });
    assert.equal(end.page, 21);
    assert.equal(end.rows.length, 5);
    const pending = await call({ filter: "pending" });
    assert.equal(pending.total, 102);
    assert.ok(pending.rows.every((r: any) => r.status === "pending_approval"));
    assert.equal(pending.summary.total, 205);
    assert.equal((await call({ filter: "high" })).total, 102);
    const found = await call({ q: "page-0001" });
    assert.equal(found.total, 1);
    assert.equal(found.rows[0].id, "page-0001");
    assert.equal((await call({ q: "Pagination owner" })).total, 205);
    assert.equal((await call({ q: "Gas price" })).total, 205);
    const empty = await call({ q: "no matching records", page: 5 });
    assert.equal(empty.page, 1);
    assert.equal(empty.total, 0);
    assert.deepEqual(empty.rows, []);
    for (const input of [
      { page: 0 },
      { pageSize: 200 },
      { filter: "invalid" },
      { q: "x".repeat(101) },
    ])
      await assert.rejects(() => call(input));
    const legacy = await dispatch("approvals", token, {}, db);
    assert.ok(Array.isArray(legacy));
    assert.equal(legacy.length, 200);
  } finally {
    await db.close?.();
  }
});
test("APPROVAL-SCOPE01: pagination and summary enforce branch and view permissions; field roles cannot read requests", async () => {
  const db = await createDatabase("memory://");
  await migrate(db);
  try {
    const tokens: Record<string, string> = {},
      ids: Record<string, string> = {};
    for (const role of ["owner", "finance", "customer", "technician"]) {
      const uid = id();
      ids[role] = uid;
      await db.query(
        "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,$2,$3,$4,$2,'lagos')",
        [uid, role, uid + "@example.test", hashPassword("Fixture-only-123!")],
      );
      tokens[role] = await issueSession(db, uid);
    }
    await db.query(
      `INSERT INTO change_requests(id,key,scope,requester_id,previous_value,proposed_value,base_version,reason,risk,status,effective_at,expires_at)
 VALUES('visible','payment.gateway','lagos',$1,'{}','{}',1,'Fixture',4,'pending_approval',now(),now()+interval '1 day'),('cross-branch','payment.gateway','other',$1,'{}','{}',1,'Fixture',4,'pending_approval',now(),now()+interval '1 day'),('hidden','gas.price_per_kg','lagos',$1,'1','2',1,'Fixture',3,'draft',now(),now()+interval '1 day')`,
      [ids.owner],
    );
    await db.query(
      `UPDATE setting_definitions SET view_roles='["owner"]' WHERE key='gas.price_per_kg'`,
    );
    const r = await dispatch(
      "approvals",
      tokens.finance,
      { view: "paged" },
      db,
    );
    assert.equal(r.total, 1);
    assert.equal(r.summary.total, 1);
    assert.equal(r.rows[0].id, "visible");
    for (const role of ["customer", "technician"])
      await assert.rejects(
        () => dispatch("approvals", tokens[role], { view: "paged" }, db),
        /permission|authori|access/i,
      );
  } finally {
    await db.close?.();
  }
});

test('APPROVAL-HTTP01: paginated approvals require authentication and are read only over HTTP',async()=>{
 const {NextRequest}=await import('next/server');const {GET,POST}=await import('../apps/web/app/api/[action]/route');
 const db=await createDatabase('memory://');await migrate(db);(globalThis as any).easygasDb=Promise.resolve(db);
 try{const uid=id();await db.query("INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,'HTTP owner',$2,$3,'owner','lagos')",[uid,uid+'@example.test',hashPassword('Fixture-only-123!')]);const token=await issueSession(db,uid),ctx={params:Promise.resolve({action:'approvals'})};
 const get=(query:string,auth=true)=>GET(new NextRequest('http://localhost:3003/api/approvals?'+query,{headers:auth?{authorization:'Bearer '+token}:{}}),ctx);
 assert.equal((await get('view=paged',false)).status,401);const response=await get('view=paged&pageSize=10');assert.equal(response.status,200);const body=await response.json();assert.ok(body);
 assert.equal((await get('view=paged&pageSize=500')).status,400);
 assert.equal((await POST(new NextRequest('http://localhost:3003/api/approvals',{method:'POST',headers:{'x-easygas-client':'native','content-type':'application/json',authorization:'Bearer '+token},body:'{}'}),ctx)).status,405);
 }finally{delete (globalThis as any).easygasDb;await db.close?.();}
});
