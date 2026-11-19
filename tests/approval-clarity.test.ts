import test from "node:test";
import assert from "node:assert/strict";
import { createDatabase, migrate, one } from "../apps/web/lib/db";
import { hashPassword, id, issueSession } from "../apps/web/lib/auth";
import { dispatch } from "../apps/web/lib/service";
import { approvalStatusLabel } from "../packages/business-rules/src/approval-progress";

async function fixture() {
  const db = await createDatabase("memory://");
  await migrate(db);
  const accounts: Record<string, { id: string; token: string }> = {};
  const password = "Approval-fixture-only-123!";
  for (const name of ["owner", "reviewer", "finance", "manager"]) {
    const uid = id(),
      role = name === "reviewer" ? "owner" : name;
    await db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,$2,$3,$4,$5,'lagos')",
      [uid, name, uid + "@test.invalid", hashPassword(password), role],
    );
    accounts[name] = { id: uid, token: await issueSession(db, uid) };
  }
  const call = (name: string, action: string, input: any = {}) =>
    dispatch(action, accounts[name].token, input, db);
  for (const name of Object.keys(accounts))
    await call(name, "reauth", { password });
  const setting = (key: string) =>
    one(db, "SELECT * FROM settings WHERE key=$1 AND scope='lagos'", [key]);
  const propose = async (key: string, extras: any = {}) =>
    call("owner", "setting.propose", {
      key,
      scope: "lagos",
      version: (await setting(key))!.version,
      value: (await setting(key))!.value,
      reason: "Synthetic owner business decision",
      ...extras,
    });
  const row = async (rid: string) =>
    (await call("owner", "approvals")).find((r: any) => r.id === rid);
  return { db, accounts, call, setting, propose, row, password };
}
async function withPolicy(fn: () => Promise<void>) {
  const old = process.env.EASYGAS_OWNER_AUTO_APPROVAL;
  process.env.EASYGAS_OWNER_AUTO_APPROVAL = "true";
  try {
    await fn();
  } finally {
    if (old === undefined) delete process.env.EASYGAS_OWNER_AUTO_APPROVAL;
    else process.env.EASYGAS_OWNER_AUTO_APPROVAL = old;
  }
}

test("APC-OWNER: existing EasyRewards request stays pending until its sole owner explicitly verifies and applies it once", () =>
  withPolicy(async () => {
    const f = await fixture();
    try {
      process.env.EASYGAS_OWNER_AUTO_APPROVAL = "false";
      const r = await f.propose("loyalty.policy");
      process.env.EASYGAS_OWNER_AUTO_APPROVAL = "true";
      const pending = await f.row(r.id);
      assert.equal(pending.status, "pending_approval");
      assert.equal(pending.can_owner_apply, true);
      assert.equal(
        approvalStatusLabel(pending),
        "Awaiting owner approval · 0/1",
      );
      assert.equal((await f.setting("loyalty.policy"))!.version, 1);
      await f.db.query(
        "UPDATE sessions SET verified_at=NULL WHERE user_id=$1",
        [f.accounts.owner.id],
      );
      await assert.rejects(
        () =>
          f.call("owner", "approval.owner_apply", {
            id: r.id,
            reason: "Verify before approval",
          }),
        /verif/i,
      );
      await f.call("owner", "reauth", { password: f.password });
      assert.equal(
        (
          await f.call("owner", "approval.owner_apply", {
            id: r.id,
            reason: "Explicit sole owner authorisation",
          })
        ).status,
        "active",
      );
      const applied = await f.row(r.id);
      assert.equal(applied.approval_progress.approved, 1);
      assert.equal(applied.approval_progress.owner_approved, true);
      assert.equal(applied.decisions.length, 0); // Owner authority is audited, not an invented colleague decision.
      await f.call("owner", "approval.owner_apply", {
        id: r.id,
        reason: "Retry identical authorisation",
      });
      assert.equal((await f.setting("loyalty.policy"))!.version, 2);
      assert.equal(
        Number(
          (await one(
            f.db,
            "SELECT count(*) n FROM audit_events WHERE target=$1 AND action='approval.owner_auto_approved'",
            [r.id],
          ))!.n,
        ),
        1,
      );
    } finally {
      await f.db.close?.();
    }
  }));

test("APC-PROGRESS: dual-review progress counts only current valid decisions and preserves mandatory roles", () =>
  withPolicy(async () => {
    const f = await fixture();
    try {
      const r = await f.propose("payment.gateway");
      assert.equal(
        approvalStatusLabel(await f.row(r.id)),
        "Awaiting approvals · 0/2",
      );
      await f.call("reviewer", "approval.decide", {
        id: r.id,
        decision: "approve",
        reason: "Independent synthetic review",
      });
      assert.equal(
        approvalStatusLabel(await f.row(r.id)),
        "Awaiting approvals · 1/2",
      );
      await f.db.query("UPDATE users SET active=false WHERE id=$1", [
        f.accounts.reviewer.id,
      ]);
      assert.equal((await f.row(r.id)).approval_progress.approved, 0);
      await f.db.query("UPDATE users SET active=true WHERE id=$1", [
        f.accounts.reviewer.id,
      ]);
      await f.call("finance", "approval.decide", {
        id: r.id,
        decision: "request_changes",
        reason: "Revise and independently review a new version",
      });
      await f.call("owner", "approval.revise", {
        id: r.id,
        value: (await f.setting("payment.gateway"))!.value,
        reason: "Revised synthetic gateway request",
      });
      await f.call("owner", "approval.submit", {
        id: r.id,
        reason: "Submit revised request for fresh review",
      });
      assert.equal((await f.row(r.id)).approval_progress.approved, 0);
      await f.call("reviewer", "approval.decide", {
        id: r.id,
        decision: "approve",
        reason: "Review the new revision independently",
      });
      await assert.rejects(
        () =>
          f.call("reviewer", "approval.decide", {
            id: r.id,
            decision: "approve",
            reason: "Duplicate must not count",
          }),
        /already/,
      );
      assert.equal(
        (await f.row(r.id)).approval_progress.missing_roles.includes("finance"),
        true,
      );
      await f.call("finance", "approval.decide", {
        id: r.id,
        decision: "approve",
        reason: "Independent finance review",
      });
      const done = await f.row(r.id);
      assert.equal(done.status, "active");
      assert.equal(done.approval_progress.approved, 2);
      assert.equal(done.approval_progress.complete, true);
    } finally {
      await f.db.close?.();
    }
  }));

test("APC-SECURITY: owner authority cannot be borrowed, used for restricted payment changes, or applied after expiry/version conflict", () =>
  withPolicy(async () => {
    const f = await fixture();
    try {
      const gateway = await f.propose("payment.gateway");
      await assert.rejects(
        () =>
          f.call("owner", "approval.owner_apply", {
            id: gateway.id,
            reason: "Restricted control stays independent",
          }),
        /independent/,
      );
      await assert.rejects(
        () =>
          f.call("owner", "approval.decide", {
            id: gateway.id,
            decision: "approve",
            reason: "Self-review remains blocked",
          }),
        /independent/,
      );
      process.env.EASYGAS_OWNER_AUTO_APPROVAL = "false";
      const old = await f.propose("loyalty.policy");
      const expired = await f.propose("loyalty.policy");
      process.env.EASYGAS_OWNER_AUTO_APPROVAL = "true";
      for (const role of ["finance", "manager", "reviewer"])
        await assert.rejects(
          () =>
            f.call(role, "approval.owner_apply", {
              id: old.id,
              reason: "Cannot borrow owner authority",
            }),
          /Owner|own/,
        );
      await f.db.query(
        "UPDATE change_requests SET expires_at=now()-interval '1 second' WHERE id=$1",
        [expired.id],
      );
      await assert.rejects(
        () =>
          f.call("owner", "approval.owner_apply", {
            id: expired.id,
            reason: "Expired authority remains blocked",
          }),
        /expired/,
      );
      await f.propose("loyalty.policy"); // A new verified owner submission uses the existing audited auto-approval policy.
      assert.equal(
        (
          await f.call("owner", "approval.owner_apply", {
            id: old.id,
            reason: "Do not overwrite the current version",
          })
        ).status,
        "superseded",
      );
      for (const key of [
        "payment.gateway",
        "security.permissions",
        "loyalty.adjustment",
      ])
        assert.equal(
          (await f.call("owner", "settings", { scope: "lagos" })).find(
            (r: any) => r.key === key,
          ).owner_auto_approval,
          false,
        );
    } finally {
      await f.db.close?.();
    }
  }));

test("APC-LABELS: approval labels distinguish owner, dual-review and missing required roles without inventing progress", () => {
  assert.equal(
    approvalStatusLabel({ status: "pending_approval" }),
    "Awaiting approvals",
  );
  assert.equal(
    approvalStatusLabel({
      status: "partially_approved",
      approval_progress: {
        mode: "independent",
        approved: 2,
        required: 2,
        complete: false,
      },
    }),
    "Awaiting required review · 2/2",
  );
  assert.equal(approvalStatusLabel({ status: "active" }), "active");
});
