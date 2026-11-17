import { test } from "node:test";
import assert from "node:assert/strict";
import { createDatabase, migrate, one } from "../apps/web/lib/db";
import { dispatch } from "../apps/web/lib/service";
import { hashPassword, id, issueSession } from "../apps/web/lib/auth";

test("ADM-INC-01: the incident register browses older records and preserves scoped counts and filters", async () => {
  const db = await createDatabase("memory://");
  try {
    await migrate(db);
    await db.query(
      "INSERT INTO branches(id,name) VALUES ('qa-incidents','QA second branch')",
    );
    const tokens = new Map<string, string>();
    for (const role of ["owner", "manager", "finance", "customer"]) {
      const user = id();
      await db.query(
        "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,$2,$3,$4,$2,'lagos')",
        [
          user,
          role,
          `${role}-incidents@example.test`,
          hashPassword("Incidents-only-test!"),
        ],
      );
      tokens.set(role, await issueSession(db, user));
    }
    const list = (role: string, query = {}) =>
      dispatch(
        "incidents",
        tokens.get(role)!,
        { view: "workspace", ...query },
        db,
      );
    const write = (
      role: string,
      target: string,
      status = "resolved",
      note = "Synthetic response evidence",
    ) =>
      dispatch(
        "incident.update",
        tokens.get(role)!,
        { id: target, status, note },
        db,
      );
    const insert = async (
      branch: string | null,
      category: string,
      detail: string,
      status = "open",
      severity = "high",
    ) => {
      const incident = id();
      await db.query(
        "INSERT INTO operational_incidents(id,branch_id,severity,category,target,detail,owner_role,status,created_at) VALUES($1,$2,$3,$4,$1,$5,'owner',$6,'2000-01-01')",
        [incident, branch, severity, category, detail, status],
      );
      return incident;
    };
    const older = await insert(
      "lagos",
      "delivery_help",
      "older record with 100% literal text",
      "resolved",
      "low",
    );
    await db.query(`INSERT INTO operational_incidents(id,branch_id,severity,category,target,detail,owner_role)
      SELECT 'example-'||n,'lagos','high','qa_register','example-'||n,'Synthetic newer row','owner'
      FROM generate_series(1,101) AS n`);
    const other = await insert(
      "qa-incidents",
      "delivery_help",
      "other branch secret marker",
    );
    const global = await insert(
      null,
      "operation_failure",
      "business-wide marker",
    );
    const safety = await insert(
      "lagos",
      "service_safety",
      "requires safety review",
    );
    const dispute = await insert(
      "lagos",
      "service_dispute",
      "requires verification",
    );

    const owner = await list("owner");
    assert.equal(owner.counts.all, 106);
    assert.equal(owner.total, 106);
    const pagination = await list("owner", { page: "999" });
    assert.equal(pagination.page, 9);
    assert.ok(pagination.rows.some((r: { id: string }) => r.id === older));
    assert.equal(pagination.rows.length, 10);
    assert.equal((await list("owner", { q: "%" })).total, 1);
    const filtered = await list("manager", {
      status: "resolved",
      severity: "low",
      q: "DELIVERY HELP",
    });
    assert.equal(filtered.total, 1);
    assert.equal(filtered.rows[0].id, older);
    assert.equal(filtered.rows[0].branch_name, "Lagos");
    assert.deepEqual(filtered.counts, {
      all: 104,
      open: 103,
      acknowledged: 0,
      resolved: 1,
    });
    assert.equal(
      (await list("manager", { q: "secret marker" })).total,
      0,
      "branch search isolation",
    );
    assert.equal((await list("finance")).canManage, false);
    assert.equal(
      (await list("finance", { q: "business-wide marker" })).total,
      0,
    );
    await assert.rejects(() => list("customer"), /permission/);
    await assert.rejects(() => list("owner", { page: "0" }));
    assert.equal(
      (await dispatch("incidents", tokens.get("owner")!, {}, db)).length,
      100,
    );

    await assert.rejects(() => write("manager", other), /another branch/);
    await assert.rejects(
      () => write("manager", global),
      /business-wide incident/,
    );
    await assert.rejects(() => write("finance", older), /permission/);
    await assert.rejects(
      () => write("manager", safety),
      /authorised safety review/,
    );
    await assert.rejects(() => write("owner", dispute), /Verify your password/);
    await assert.rejects(
      () => write("owner", older, "resolved", "   "),
      /Too small/,
    );
    assert.equal(
      (await one(db, "SELECT count(*)::int n FROM incident_events"))!.n,
      0,
    );
    await write("manager", safety, "acknowledged");
    await write("owner", safety);
    await dispatch(
      "reauth",
      tokens.get("owner")!,
      { password: "Incidents-only-test!" },
      db,
    );
    await write("owner", dispute);
    assert.equal((await list("manager", { status: "resolved" })).total, 3);
    assert.equal(
      (await one(
        db,
        "SELECT count(*)::int n FROM incident_events WHERE incident_id=$1",
        [safety],
      ))!.n,
      2,
    );
    assert.equal(
      (await one(db, "SELECT note FROM incident_events WHERE incident_id=$1", [
        dispute,
      ]))!.note,
      "Synthetic response evidence",
    );
  } finally {
    await db.close?.();
  }
});
