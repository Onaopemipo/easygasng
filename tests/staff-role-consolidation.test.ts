import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  accountRoles,
  staffRoles,
} from "../packages/business-rules/src/staff-roles";
import { createDatabase, migrate, one, type DB } from "../apps/web/lib/db";
import { hashPassword, id, issueSession } from "../apps/web/lib/auth";
import { dispatch } from "../apps/web/lib/service";

const password = "Staff-roles-fixture-123!";
const passwordHash = hashPassword(password);

async function addAccount(
  db: DB,
  role: string,
  branch: string | null = "lagos",
) {
  const userId = id();
  await db.query(
    "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,$2,$3,$4,$5,$6)",
    [userId, role, userId + "@staff-roles.test", passwordHash, role, branch],
  );
  return { id: userId, token: await issueSession(db, userId) };
}

test("STAFF-ROLE01–03: legacy identities upgrade atomically with overrides, session renewal and approval history", async () => {
  const db = await createDatabase(
    process.env.EASYGAS_ROLE_TEST_POSTGRES ? undefined : "memory://",
  );
  try {
    await migrate(db);
    await db.exec(`
      ALTER TABLE users DROP CONSTRAINT users_role_check;
      ALTER TABLE users ADD CONSTRAINT users_role_check CHECK(role IN
        ('owner','manager','sales','inventory','dispatcher','driver','finance','customer','commercial','administrator','service_manager','technician','safety_officer'));
      DELETE FROM schema_migrations WHERE version='078';
      UPDATE setting_definitions SET approve_roles='["owner","safety_officer"]', required_roles='["owner","safety_officer"]'
      WHERE value_type='checklist';
      INSERT INTO branches(id,name) VALUES('staff-role-other','Synthetic second branch');
    `);
    const accounts = new Map();
    const expected = {
      owner: "owner",
      administrator: "owner",
      safety_officer: "owner",
      finance: "finance",
      inventory: "finance",
      manager: "manager",
      sales: "manager",
      dispatcher: "manager",
      service_manager: "manager",
      driver: "driver",
      technician: "technician",
      customer: "customer",
      commercial: "commercial",
    };
    for (const role of Object.keys(expected))
      accounts.set(
        role,
        await addAccount(
          db,
          role,
          role === "administrator" ? "staff-role-other" : "lagos",
        ),
      );
    const owner = accounts.get("owner"),
      sales = accounts.get("sales");
    const requestId = id(),
      checklistKey = "checklist.cooker-servicing";
    await db.query(
      `INSERT INTO change_requests(id,key,scope,requester_id,previous_value,proposed_value,base_version,reason,risk,status,effective_at,expires_at,requester_role,policy_snapshot)
      VALUES($1,$2,'lagos',$3,'[]','[]',1,'Synthetic open request',4,'partially_approved',now(),now()+interval '1 day','service_manager','{"required_roles":["owner","safety_officer"]}')`,
      [requestId, checklistKey, accounts.get("service_manager").id],
    );
    await db.query(
      `INSERT INTO approval_decisions(id,request_id,revision,approver_id,role,decision,reason,verified_at)
      VALUES($1,$2,1,$3,'safety_officer','approve','Historical decision',now())`,
      [id(), requestId, accounts.get("safety_officer").id],
    );
    await db.query(
      `INSERT INTO staff_privilege_overrides(user_id,privilege,effect,changed_by,role_at_change,branch_at_change,invalidated_at) VALUES
      ($1,'customers.view','grant',$2,'sales','lagos',NULL),
      ($1,'orders.view','deny',$2,'sales','lagos',NULL),
      ($1,'catalogue.manage','grant',$2,'sales','lagos',now())`,
      [sales.id, owner.id],
    );
    await migrate(db);
    for (const [before, after] of Object.entries(expected)) {
      const account = accounts.get(before);
      assert.equal(
        (await one(db, "SELECT role FROM users WHERE id=$1", [account.id]))
          ?.role,
        after,
      );
      assert.equal(
        Boolean(
          (
            await one(db, "SELECT revoked_at FROM sessions WHERE user_id=$1", [
              account.id,
            ])
          )?.revoked_at,
        ),
        ["owner", "manager", "finance"].includes(after),
      );
    }
    assert.deepEqual(
      (
        await db.query("SELECT DISTINCT role FROM users ORDER BY role")
      ).rows.map((r) => r.role),
      [...accountRoles].sort(),
    );
    await assert.rejects(addAccount(db, "administrator"), { code: "23514" });
    const stored = await one(
      db,
      "SELECT status,policy_snapshot,failure_reason FROM change_requests WHERE id=$1",
      [requestId],
    );
    assert.equal(stored?.status, "superseded");
    assert.match(stored?.failure_reason, /fresh request/);
    assert.deepEqual(stored?.policy_snapshot.required_roles, [
      "owner",
      "safety_officer",
    ]);
    assert.equal(
      (
        await one(
          db,
          "SELECT role FROM approval_decisions WHERE request_id=$1",
          [requestId],
        )
      )?.role,
      "safety_officer",
    );
    assert.deepEqual(
      (
        await one(
          db,
          "SELECT required_roles FROM setting_definitions WHERE key=$1",
          [checklistKey],
        )
      )?.required_roles,
      ["owner"],
    );
    assert.equal(
      (
        await one(
          db,
          "SELECT detail FROM audit_events WHERE target=$1 AND action='staff.role_consolidated'",
          [sales.id],
        )
      )?.detail.previousRole,
      "sales",
    );
    const overrides = (
      await db.query(
        "SELECT privilege,effect,role_at_change,invalidated_at FROM staff_privilege_overrides WHERE user_id=$1 ORDER BY privilege",
        [sales.id],
      )
    ).rows;
    assert.ok(overrides[0].invalidated_at);
    assert.equal(overrides[1].role_at_change, "manager");
    assert.equal(overrides[1].invalidated_at, null);
    assert.equal(overrides[2].effect, "deny");
    const admin = accounts.get("administrator");
    await assert.rejects(
      dispatch("navigation.access", admin.token, {}, db),
      /sign in|session/i,
    );
    const freshAdminSession = await issueSession(db, admin.id);
    assert.equal(
      (await dispatch("navigation.access", freshAdminSession, {}, db)).user
        .role,
      "owner",
    );
    assert.ok(
      (await dispatch("staff", freshAdminSession, {}, db)).some(
        (row: any) => row.branch_id === "lagos",
      ),
    );
  } finally {
    await db.close?.();
  }
});

test("STAFF-ROLE04–06: branch isolation, qualified checklist review and independent financial approvals", async () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (process.env.EASYGAS_ROLE_TEST_POSTGRES) delete process.env.DATABASE_URL;
  const db = await createDatabase("memory://");
  const original = process.env.EASYGAS_OWNER_AUTO_APPROVAL;
  process.env.EASYGAS_OWNER_AUTO_APPROVAL = "true";
  try {
    await migrate(db);
    await db.query(
      "INSERT INTO branches(id,name) VALUES('other','Synthetic other branch')",
    );
    const owner = await addAccount(db, "owner"),
      reviewer = await addAccount(db, "owner");
    const finance = await addAccount(db, "finance"),
      manager = await addAccount(db, "manager");
    const driver = await addAccount(db, "driver"),
      technician = await addAccount(db, "technician");
    const customer = await addAccount(db, "customer");
    const call = (actor: { token: string }, action: string, body: any = {}) =>
      dispatch(action, actor.token, body, db);
    for (const staff of [owner, reviewer, finance, manager])
      await call(staff, "reauth", { password });
    assert.equal(staffRoles.length, 5);
    for (const action of ["pos", "services.manage", "dispatch.centre"])
      await call(
        manager,
        action,
        action === "services.manage" ? { branchId: "lagos" } : {},
      );
    await call(finance, "inventory.workspace");
    await assert.rejects(
      call(finance, "inventory.workspace", { branchId: "other" }),
      /branch/i,
    );
    await assert.rejects(
      call(manager, "settings", { scope: "other" }),
      /branch/i,
    );
    for (const field of [driver, technician, customer])
      await assert.rejects(call(field, "audit"), /permission|session/i);
    for (const [branch, action] of [
      ["lagos", "inventory.received"],
      ["other", "inventory.received"],
      ["lagos", "staff.role_consolidated"],
    ])
      await db.query(
        "INSERT INTO audit_events(id,action,target,outcome,detail) VALUES($1,$2,'role-scope-fixture','success',$3)",
        [id(), action, JSON.stringify({ branch })],
      );
    assert.equal(
      (await call(finance, "audit", { view: "paged", q: "role-scope-fixture" }))
        .total,
      1,
    );
    assert.equal(
      (await call(owner, "audit", { view: "paged", q: "role-scope-fixture" }))
        .total,
      3,
    );
    const access = {
      userId: customer.id,
      role: "administrator",
      branchId: "lagos",
      reason: "Synthetic staff assignment for verification",
    };
    await assert.rejects(
      call(owner, "staff.access.request", access),
      /invalid|role|expected/i,
    );
    const request = await call(owner, "staff.access.request", {
      ...access,
      role: "manager",
    });
    assert.equal(request.status, "pending_approval");
    await assert.rejects(
      call(owner, "approval.owner_apply", {
        id: request.id,
        reason: access.reason,
      }),
      /independent/i,
    );
    await call(reviewer, "approval.decide", {
      id: request.id,
      decision: "approve",
      reason: access.reason,
    });
    assert.equal(
      (await one(db, "SELECT role FROM users WHERE id=$1", [customer.id]))
        ?.role,
      "customer",
    );
    await call(finance, "approval.decide", {
      id: request.id,
      decision: "approve",
      reason: access.reason,
    });
    assert.equal(
      (await one(db, "SELECT role FROM users WHERE id=$1", [customer.id]))
        ?.role,
      "manager",
    );

    const expense = await call(owner, "expense.create", {
      branchId: "lagos",
      categoryId: "fuel",
      amountKobo: 500000,
      date: "2026-10-29",
      payee: "Synthetic fuel supplier",
      description: "Expense used to verify independent review",
      method: "cash",
      evidence: "Synthetic receipt STAFF-ROLE05",
      reference: "EXPENSE-STAFF-ROLE05",
    });
    const expenseDecision = {
      id: expense.requestId,
      reason: "Independent fixture review",
    };
    assert.equal(
      (await one(db, "SELECT status FROM change_requests WHERE id=$1", [
        expense.requestId,
      ]))?.status,
      "pending_approval",
    );
    await assert.rejects(call(owner, "approval.owner_apply", expenseDecision), /independent/i);
    await call(reviewer, "approval.decide", {
      ...expenseDecision,
      decision: "approve",
    });

    const checklist = await call(owner, "services.checklist.propose", {
      serviceId: "cooker-servicing",
      branchId: "lagos",
      version: 1,
      checks: [
        {
          id: "test_check",
          label: "Synthetic safety checklist step",
          required: true,
        },
      ],
      reason: "Verify checklist review after consolidation",
    });
    assert.equal(checklist.status, "partially_approved");
    const decision = {
      id: checklist.id,
      decision: "approve",
      reason: "Independent fixture review",
    };
    await assert.rejects(
      call(reviewer, "approval.decide", decision),
      /qualification/i,
    );
    const qualification = {
      userId: reviewer.id,
      code: "safety_review",
      evidence: "Synthetic independent certificate",
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    };
    await assert.rejects(
      call(reviewer, "technician.qualify", qualification),
      /independent/i,
    );
    await call(owner, "technician.qualify", qualification);
    assert.equal(
      (await call(reviewer, "approval.decide", decision)).status,
      "active",
    );
  } finally {
    if (databaseUrl !== undefined) process.env.DATABASE_URL = databaseUrl;
    if (original === undefined) delete process.env.EASYGAS_OWNER_AUTO_APPROVAL;
    else process.env.EASYGAS_OWNER_AUTO_APPROVAL = original;
    await db.close?.();
  }
});
