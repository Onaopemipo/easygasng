import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers/service-fixture";
import { one } from "../apps/web/lib/db";
import { id } from "../apps/web/lib/auth";
import {
  staffPrivileges,
  privilegeForAction,
} from "../packages/business-rules/src/staff-privileges";
const password = "Services-fixture-only-123!";
async function setup() {
  const f = await fixture();
  await f.call("administrator", "reauth", { password });
  const view = (role = "owner", target = "inventory") =>
    f.call(role, "staff.privileges", { userId: f.actors[target].id });
  const save = async (
    role: string,
    target: string,
    privilege: string,
    effect = "grant",
    extra: any = {},
  ) =>
    f.call(role, "staff.privileges.save", {
      userId: f.actors[target].id,
      version: (await view(role, target)).version,
      changes: [{ privilege, effect }],
      reason: "Synthetic privilege management verification",
      ...extra,
    });
  return { ...f, view, save };
}
process.env.EASYGAS_MESSAGE_ENCRYPTION_KEY ??= "7".repeat(64);

test("STAFF-PRIV01: per-user grant, deny and role default work end to end without changing roles; existing sessions recheck every request", async () => {
  const f = await setup();
  try {
    const uid = f.actors.inventory.id;
    await assert.rejects(
      () => f.call("inventory", "customers.manage"),
      /permission/,
    );
    let r = await f.view();
    assert.equal(r.version, 0);
    assert.equal(
      r.privileges.find((p: any) => p.id === "customers.view").effective,
      false,
    );
    await f.save("owner", "inventory", "customers.view");
    assert.ok((await f.call("inventory", "customers.manage")).customers);
    assert.ok(
      (await f.call("inventory", "navigation.access")).allowed.includes(
        "customers",
      ),
    );
    assert.equal(
      (await one(f.db, "SELECT role FROM users WHERE id=$1", [uid]))!.role,
      "finance",
    );
    await assert.rejects(
      () =>
        f.call("inventory", "customers.create", {
          name: "Ungrantable edit",
          email: id() + "@example.test",
          branchId: "lagos",
        }),
      /permission/,
    );
    await f.save("owner", "inventory", "customers.edit");
    const customer = await f.call("inventory", "customers.create", {
      name: "Privilege created fixture",
      email: id() + "@example.test",
      branchId: "lagos",
    });
    assert.ok(customer.id);
    await assert.rejects(
      () =>
        f.call("inventory", "customers.create", {
          name: "Cross branch forbidden",
          email: id() + "@example.test",
          branchId: "other",
        }),
      /branch/,
    );
    await f.save("owner", "inventory", "customers.view", "deny");
    await assert.rejects(
      () => f.call("inventory", "customers.manage"),
      /revoked/,
    );
    assert.ok(
      !(await f.call("inventory", "navigation.access")).allowed.includes(
        "customers",
      ),
    );
    await f.save("owner", "inventory", "customers.view", "default");
    await assert.rejects(
      () => f.call("inventory", "customers.manage"),
      /permission/,
    );
    // An inherited role privilege can be removed and restored in an already active session.
    await f.save("owner", "inventory", "products.view", "deny");
    await assert.rejects(
      () => f.call("inventory", "products.manage"),
      /revoked/,
    );
    await f.save("owner", "inventory", "products.view", "default");
    assert.ok((await f.call("inventory", "products.manage")).products);
    const audit = (await f.view()).history;
    assert.ok(audit.length >= 6);
    assert.ok(
      audit.every(
        (r: any) => r.detail.reason && r.detail.before && r.detail.changes,
      ),
    );
  } finally {
    await f.db.close?.();
  }
});
test("STAFF-PRIV02: privilege changes require fresh administrative identity and reject self escalation, forged fields, stale versions and protected-role grants", async () => {
  const f = await setup();
  try {
    await assert.rejects(() => f.view("finance"), /Only the Business Owner/);
    await assert.rejects(() => f.view("customer"), /Only the Business Owner/);
    await assert.rejects(() => f.view("owner", "owner"), /own access/);
    await assert.rejects(
      () => f.save("owner", "service_manager", "finance.manage"),
      /requires an approved role/,
    );
    await assert.rejects(
      () => f.save("owner", "technician", "customers.view"),
      /requires an approved role/,
    );
    await assert.rejects(
      () => f.save("owner", "customer", "customers.view"),
      /requires an approved role/,
    );
    await f.save("administrator", "inventory", "reports.view");
    assert.ok((await f.view("administrator", "owner")).privileges.length);
    await f.save("administrator", "inventory", "customers.view");
    assert.ok((await f.call("inventory", "customers.manage")).customers);
    const old = (await f.view()).version;
    await f.save("owner", "inventory", "customers.view", "deny");
    await assert.rejects(
      () =>
        f.save("owner", "inventory", "customers.view", "grant", {
          version: old,
        }),
      /changed since/,
    );
    await assert.rejects(
      () => f.save("owner", "inventory", "not.real"),
      /recognised/,
    );
    await assert.rejects(
      () =>
        f.save("owner", "inventory", "customers.view", "grant", {
          role: "owner",
        }),
      /Unrecognized|unrecognized/,
    );
    await f.db.query("UPDATE sessions SET verified_at=NULL WHERE user_id=$1", [
      f.actors.owner.id,
    ]);
    await assert.rejects(() => f.view(), /Verify your password/);
    await f.call("owner", "reauth", { password });
    await f.db.query("UPDATE users SET branch_id=NULL WHERE id=$1", [
      f.actors.inventory.id,
    ]);
    await assert.rejects(
      () => f.save("owner", "inventory", "customers.view"),
      /requires an approved role|active branch/,
    );
  } finally {
    await f.db.close?.();
  }
});
test("STAFF-PRIV03: merged administrators can edit cross-branch users; protected approval, qualification and runtime session boundaries remain intact", async () => {
  const f = await setup();
  try {
    await f.db.query(
      "INSERT INTO branches(id,name) VALUES('other','Other fixture')",
    );
    await f.db.query("UPDATE users SET branch_id='other' WHERE id=$1", [
      f.actors.inventory.id,
    ]);
    assert.ok((await f.view("administrator")).privileges.length);
    await f.db.query("UPDATE users SET branch_id='lagos' WHERE id=$1", [
      f.actors.inventory.id,
    ]);
    await f.save("owner", "inventory", "reports.view");
    await assert.rejects(() => f.call("inventory", "business.report", { report: "audit" }), /permission/);
    await assert.rejects(
      () =>
        f.call("inventory", "technician.qualify", {
          userId: f.actors.inventory.id,
          code: "safety_review",
          evidence: "Self granted evidence",
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        }),
      /permission|authori|own/i,
    );
    // Manager authority cannot be inherited into an owner-only operation.
    await assert.rejects(
      () =>
        f.call("inventory", "branch.create", { name: "No owner escalation" }),
      /permission/,
    );
    await f.save("owner", "finance", "finance.view", "deny");
    await assert.rejects(() => f.call("finance", "credits"), /revoked/);
    const actionNames = staffPrivileges.flatMap((p) => [...p.actions]);
    assert.equal(actionNames.length, new Set(actionNames).size);
    assert.equal(privilegeForAction("staff.privileges.save"), undefined);
  } finally {
    await f.db.close?.();
  }
});

test("STAFF-PRIV04: restricted database runtime can grant, revoke and reset privileges with append-only audited history", async () => {
  const { readFile } = await import("node:fs/promises");
  const { createDatabase } = await import("../apps/web/lib/db");
  const db = await createDatabase("memory://");
  try {
    await db.exec(await readFile("database/bootstrap.sql", "utf8"));
    await db.exec(
      "SET search_path TO easygas_private,pg_catalog; SET ROLE easygas_server",
    );
    const f = await fixture(db);
    const uid = f.actors.inventory.id;
    let version = 0;
    for (const effect of ["grant", "deny", "default"]) {
      await f.call("owner", "staff.privileges.save", {
        userId: uid,
        version: version++,
        changes: [{ privilege: "customers.view", effect }],
        reason: "Restricted runtime privilege verification",
      });
    }
    assert.equal(
      (await one(
        db,
        "SELECT version FROM staff_privilege_versions WHERE user_id=$1",
        [uid],
      ))!.version,
      3,
    );
    assert.equal(
      (
        await db.query(
          "SELECT * FROM staff_privilege_overrides WHERE user_id=$1",
          [uid],
        )
      ).rows.length,
      0,
    );
    assert.equal(
      Number(
        (await one(
          db,
          "SELECT count(*) n FROM audit_events WHERE action='staff.privileges.changed' AND target=$1",
          [uid],
        ))!.n,
      ),
      3,
    );
    await assert.rejects(
      () =>
        db.query("UPDATE audit_events SET outcome='changed' WHERE target=$1", [
          uid,
        ]),
      /Append-only|permission/,
    );
  } finally {
    await db.close?.();
  }
});
test("STAFF-PRIV05: privilege endpoints require authenticated read/write methods and reject unverified HTTP mutations", async () => {
  const { NextRequest } = await import("next/server");
  const { GET, POST } = await import("../apps/web/app/api/[action]/route");
  const f = await setup();
  (globalThis as any).easygasDb = Promise.resolve(f.db);
  try {
    const ctx = (action: string) => ({ params: Promise.resolve({ action }) });
    const uid = f.actors.inventory.id;
    const get = (role?: string) =>
      GET(
        new NextRequest(
          "http://localhost:3003/api/staff.privileges?userId=" + uid,
          {
            headers: role
              ? { authorization: "Bearer " + f.actors[role].token }
              : {},
          },
        ),
        ctx("staff.privileges"),
      );
    assert.equal((await get()).status, 401);
    assert.equal((await get("customer")).status, 403);
    assert.equal((await get("owner")).status, 200);
    const post = (role: string, body: any) =>
      POST(
        new NextRequest("http://localhost:3003/api/staff.privileges.save", {
          method: "POST",
          headers: {
            "x-easygas-client": "native",
            "content-type": "application/json",
            authorization: "Bearer " + f.actors[role].token,
          },
          body: JSON.stringify(body),
        }),
        ctx("staff.privileges.save"),
      );
    const body = {
      userId: uid,
      version: 0,
      changes: [{ privilege: "customers.view", effect: "grant" }],
      reason: "HTTP privilege verification",
    };
    assert.equal((await post("owner", body)).status, 200);
    assert.equal((await post("owner", body)).status, 409);
    await f.db.query("UPDATE sessions SET verified_at=NULL WHERE user_id=$1", [
      f.actors.administrator.id,
    ]);
    assert.equal(
      (await post("administrator", { ...body, version: 1 })).status,
      403,
    );
    assert.equal(
      (
        await GET(
          new NextRequest("http://localhost:3003/api/staff.privileges.save"),
          ctx("staff.privileges.save"),
        )
      ).status,
      405,
    );
  } finally {
    delete (globalThis as any).easygasDb;
    await f.db.close?.();
  }
});

test("STAFF-PRIV06: invalid batches roll back all changes, cached outcomes obey revocation, and field-only sessions cannot administer privileges", async () => {
  const f = await setup();
  try {
    const userId = f.actors.inventory.id;
    await assert.rejects(
      () =>
        f.call("owner", "staff.privileges.save", {
          userId,
          version: 0,
          changes: [
            { privilege: "customers.view", effect: "grant" },
            { privilege: "unknown.operation", effect: "grant" },
          ],
          reason: "Invalid batch must remain atomic",
        }),
      /recognised/,
    );
    assert.equal((await f.view()).version, 0);
    assert.equal(
      (
        await f.db.query(
          "SELECT * FROM staff_privilege_overrides WHERE user_id=$1",
          [userId],
        )
      ).rows.length,
      0,
    );
    const key = id();
    await f.db.query(
      "INSERT INTO business_operation_results(operation_key,actor_id,action,request_hash,actor_role,actor_branch,result,committed_at) VALUES($1,$2,'customers.create','synthetic','inventory','lagos','{\"id\":\"synthetic-result\"}',now())",
      [key, userId],
    );
    await f.save("owner", "inventory", "customers.edit", "deny");
    await assert.rejects(
      () => f.call("inventory", "booking.operation", { key }),
      /revoked/,
    );
    await f.db.query(
      "UPDATE sessions SET technician_service_only=true WHERE user_id=$1",
      [f.actors.administrator.id],
    );
    await assert.rejects(
      () => f.view("administrator"),
      /limited to assigned technician/,
    );
  } finally {
    await f.db.close?.();
  }
});

test("STAFF-PRIV07: role or branch changes invalidate additional grants while explicit revocations remain enforced", async () => {
  const f = await setup();
  try {
    await f.save("owner", "inventory", "customers.view");
    assert.ok((await f.call("inventory", "customers.manage")).customers);
    await f.db.query(
      "INSERT INTO branches(id,name) VALUES('grant-new-branch','Grant test branch')",
    );
    await f.db.query(
      "UPDATE users SET branch_id='grant-new-branch' WHERE id=$1",
      [f.actors.inventory.id],
    );
    await assert.rejects(
      () => f.call("inventory", "customers.manage"),
      /permission/,
    );
    assert.equal(
      (await f.view()).privileges.find((p: any) => p.id === "customers.view")
        .stale,
      true,
    );
    await f.save("owner", "inventory", "customers.view");
    assert.ok((await f.call("inventory", "customers.manage")).customers);
    await f.db.query("UPDATE users SET role='manager' WHERE id=$1", [
      f.actors.inventory.id,
    ]);
    assert.ok((await f.call("inventory", "customers.manage")).customers);
    await f.save("owner", "inventory", "customers.view", "deny");
    await f.db.query(
      "UPDATE users SET role='manager',branch_id='lagos' WHERE id=$1",
      [f.actors.inventory.id],
    );
    await assert.rejects(
      () => f.call("inventory", "customers.manage"),
      /revoked/,
    );
  } finally {
    await f.db.close?.();
  }
});

test('STAFF-PRIV08: reverting an identity change cannot silently reactivate an old grant, and identity changes invalidate an open editor revision',async()=>{
 const f=await setup();try{await f.save('owner','inventory','customers.view');const old=(await f.view()).version;await f.db.query("UPDATE users SET role='manager' WHERE id=$1",[f.actors.inventory.id]);await f.db.query("UPDATE users SET role='finance' WHERE id=$1",[f.actors.inventory.id]);await assert.rejects(()=>f.call('inventory','customers.manage'),/permission/);assert.equal((await f.view()).privileges.find((p:any)=>p.id==='customers.view').stale,true);await assert.rejects(()=>f.save('owner','inventory','customers.view','grant',{version:old}),/changed since/);await f.save('owner','inventory','customers.view');assert.ok((await f.call('inventory','customers.manage')).customers);
 }finally{await f.db.close?.();}
});
