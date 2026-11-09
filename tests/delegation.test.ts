import { test } from "node:test";
import assert from "node:assert/strict";
import { createDatabase, migrate, one } from "../apps/web/lib/db";
import { dispatch } from "../apps/web/lib/service";
import { id, hashPassword, issueSession } from "../apps/web/lib/auth";
async function fixture() {
  const db = await createDatabase("memory://");
  await migrate(db);
  const ids: Record<string, string> = {},
    tokens: Record<string, string> = {},
    password = "Delegation-test-only-123!";
  for (const name of ["owner", "reviewer", "manager", "dispatcher"]) {
    ids[name] = id();
    await db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES ($1,$2,$3,$4,$5,'lagos')",
      [
        ids[name],
        `Test ${name}`,
        `${name}@delegation.test`,
        hashPassword(password),
        name === "reviewer" ? "owner" : name,
      ],
    );
    tokens[name] = await issueSession(db, ids[name]);
  }
  const call = (name: string, action: string, input: any = {}) =>
    dispatch(action, tokens[name], input, db);
  for (const n of Object.keys(ids)) await call(n, "reauth", { password });
  const grant = () =>
    call("owner", "delegation.request", {
      delegateId: ids.dispatcher,
      key: "delivery.capacity",
      scope: "lagos",
      maximumValue: 100,
      startsAt: new Date(Date.now() - 1000).toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      reason: "Temporary bounded test approval coverage",
    });
  return { db, ids, tokens, call, grant };
}
test("limited delegation requires independent owner review and cannot approve grantor requests or exceed its ceiling", async () => {
  const f = await fixture(),
    grant = await f.grant();
  await assert.rejects(
    () =>
      f.call("owner", "delegation.decide", {
        id: grant.id,
        decision: "approved",
        reason: "Trying to approve my own delegation",
      }),
    /separate business owner/,
  );
  await f.call("reviewer", "delegation.decide", {
    id: grant.id,
    decision: "approved",
    reason: "Independent review of bounded authority",
  });
  const own = await f.call("owner", "setting.propose", {
    key: "delivery.capacity",
    scope: "lagos",
    value: 80,
    version: 1,
    reason: "Grantor request must stay independent",
  });
  await assert.rejects(
    () =>
      f.call("dispatcher", "approval.decide", {
        id: own.id,
        decision: "approve",
        reason: "",
      }),
    /no current approval authority/,
  );
  const tooHigh = await f.call("manager", "setting.propose", {
    key: "delivery.capacity",
    scope: "lagos",
    value: 101,
    version: 1,
    reason: "Above delegated authority ceiling",
  });
  await assert.rejects(
    () =>
      f.call("dispatcher", "approval.decide", {
        id: tooHigh.id,
        decision: "approve",
        reason: "",
      }),
    /no current approval authority/,
  );
  const valid = await f.call("manager", "setting.propose", {
    key: "delivery.capacity",
    scope: "lagos",
    value: 90,
    version: 1,
    reason: "Within documented delegated limits",
  });
  assert.equal(
    (await f.call("dispatcher", "approvals")).find(
      (r: any) => r.id === valid.id,
    ).can_approve,
    true,
  );
  await f.call("dispatcher", "approval.decide", {
    id: valid.id,
    decision: "approve",
    reason: "",
  });
  assert.equal(
    (await one(
      f.db,
      "SELECT value FROM settings WHERE key='delivery.capacity' AND scope='lagos'",
    ))!.value,
    90,
  );
  assert.equal(
    (await one(
      f.db,
      "SELECT delegation_id FROM approval_decisions WHERE request_id=$1",
      [valid.id],
    ))!.delegation_id,
    grant.id,
  );
  await f.db.close?.();
});
test("revoked delegation invalidates scheduled approval before activation", async () => {
  const f = await fixture(),
    grant = await f.grant();
  await f.call("reviewer", "delegation.decide", {
    id: grant.id,
    decision: "approved",
    reason: "Independent temporary coverage review",
  });
  const request = await f.call("manager", "setting.propose", {
    key: "delivery.capacity",
    scope: "lagos",
    value: 80,
    version: 1,
    reason: "Schedule within delegated limit",
    effectiveAt: new Date(Date.now() + 60000).toISOString(),
  });
  await f.call("dispatcher", "approval.decide", {
    id: request.id,
    decision: "approve",
    reason: "",
  });
  await f.call("owner", "delegation.revoke", {
    id: grant.id,
    reason: "Temporary coverage is no longer required",
  });
  await f.db.query(
    "UPDATE change_requests SET effective_at=now()-interval '1 minute' WHERE id=$1",
    [request.id],
  );
  const run = await f.call("owner", "jobs.run");
  assert.equal(run.failed, 1);
  assert.equal(
    (await one(
      f.db,
      "SELECT value FROM settings WHERE key='delivery.capacity' AND scope='lagos'",
    ))!.value,
    50,
  );
  await f.db.close?.();
});
test("financial and security settings cannot be delegated through the limited grant workflow", async () => {
  const f = await fixture();
  for (const key of [
    "payment.settlement",
    "security.permissions",
    "price.hose",
  ])
    await assert.rejects(
      () =>
        f.call("owner", "delegation.request", {
          delegateId: f.ids.dispatcher,
          key,
          scope: "lagos",
          maximumValue: 100,
          startsAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          reason: "Attempted prohibited authority delegation",
        }),
      /cannot be delegated/,
    );
  await assert.rejects(() => f.call("dispatcher", "delegation.request", {}));
  await f.db.close?.();
});
