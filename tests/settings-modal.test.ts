import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import SettingForm from "../apps/web/components/setting-change-form";
import {
  settingAmount,
  settingSubmission,
  settingEditorTabs,
  settingApprovalCopy,
  settingChangeRows,
} from "../packages/business-rules/src/setting-editor";
import { createDatabase, migrate, one } from "../apps/web/lib/db";
import { dispatch } from "../apps/web/lib/service";
import { hashPassword, id, issueSession } from "../apps/web/lib/auth";

test("SMOD-CONTRACTS: exact currency, Lagos scheduling and draft/revision API contracts", () => {
  const setting = {
    key: "delivery.fee",
    scope: "lagos",
    version: 12,
    value_type: "money",
    minimum: 0,
    maximum: 100000000,
  };
  assert.equal(settingAmount("1800.29"), 180029);
  assert.equal(settingAmount("0.01"), 1);
  for (const value of ["", "1.001", "-2", "1e3", "NaN", "90071992547410"])
    assert.throws(() => settingAmount(value));
  assert.throws(() => settingAmount("20", 0, 100));
  const proposal = settingSubmission(
    setting,
    "1800.29",
    "  Synthetic fee review  ",
    "2026-11-21",
    true,
  );
  assert.deepEqual(proposal, {
    action: "setting.propose",
    body: {
      key: setting.key,
      scope: "lagos",
      version: 12,
      value: 180029,
      reason: "Synthetic fee review",
      draft: true,
      effectiveAt: "2026-11-21T00:00:00+01:00",
    },
  });
  assert.equal(
    settingSubmission(setting, "1", "Valid reason", "", false, "request")
      .action,
    "approval.edit",
  );
  assert.equal(
    settingSubmission(setting, "1", "Valid reason", "", false, "request", true)
      .action,
    "approval.revise",
  );
  assert.throws(() => settingSubmission(setting, "1", "  x  ", "", false));
  assert.throws(() =>
    settingSubmission(setting, "1", "Valid reason", "2026-02-30", false),
  );
  assert.deepEqual(
    settingEditorTabs("payment_gateway").map((t) => t.id),
    ["checkout", "fees", "wallet"],
  );
  assert.deepEqual(
    settingEditorTabs("rewards_policy").map((t) => t.id),
    ["points", "services", "offers"],
  );
  assert.equal(settingApprovalCopy({ risk: 4 }).label, "2 approvals required");
  assert.equal(
    settingApprovalCopy({ risk: 4, owner_auto_approval: true }).label,
    "Automatic approval",
  );
  assert.deepEqual(
    settingChangeRows(
      { fee: { fixed: 100 }, enabled: false },
      { fee: { fixed: 200 }, enabled: false },
    ),
    [{ path: "fee.fixed", before: 100, after: 200 }],
  );
});
test("SMOD-RENDER: staff editor exposes readable selection and review without raw account IDs or inline verification", () => {
  const html = renderToStaticMarkup(
    React.createElement(SettingForm, {
      setting: {
        label: "Staff permission change",
        key: "security.permissions",
        scope: "lagos",
        version: 1,
        risk: 4,
        value_type: "access",
        value: { userId: "", role: "customer", branchId: "lagos" },
      },
      onDone() {},
    }),
  );
  for (const label of [
    "Account email",
    "Assigned role",
    "Assigned branch",
    "Review change",
    "Save draft",
    "Schedule for later",
    "2 approvals required",
    "Reason for change",
  ])
    assert.ok(html.includes(label), label);
  for (const text of [
    "Existing account ID",
    "Current password",
    "Request a setting change",
    "User Id: Not configured",
  ])
    assert.ok(!html.includes(text), text);
  assert.equal((html.match(/class="sc-footer"/g) || []).length, 1);
});
test("SMOD-SECURITY: scoped lookup, verification, self access, stale versions and inactive drafts remain server-enforced", async () => {
  const db = await createDatabase("memory://");
  await migrate(db);
  try {
    const actors: Record<string, any> = {},
      password = "Synthetic-settings-only-123!";
    await db.query(
      "INSERT INTO branches(id,name) VALUES('qa-other','Synthetic other branch')",
    );
    for (const role of [
      "owner",
      "manager",
      "finance",
      "driver",
      "technician",
      "customer",
      "other",
      "inactive",
    ]) {
      const uid = id(),
        email = role + "@settings.example.test";
      await db.query(
        "INSERT INTO users(id,name,email,password_hash,role,branch_id,active) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [
          uid,
          "Synthetic " + role,
          email,
          hashPassword(password),
          ["other", "inactive"].includes(role) ? "driver" : role,
          role === "other" ? "qa-other" : "lagos",
          role !== "inactive",
        ],
      );
      actors[role] = {
        id: uid,
        email,
        token: role === "inactive" ? null : await issueSession(db, uid),
      };
    }
    const call = (role: string, action: string, input: any = {}) =>
      dispatch(action, actors[role].token, input, db);
    for (const query of [
      { email: actors.driver.email },
      { userId: actors.driver.id },
    ])
      assert.equal(
        (await call("manager", "staff.lookup", query)).id,
        actors.driver.id,
      );
    assert.equal(
      (await call("owner", "staff.lookup", { userId: actors.other.id })).id,
      actors.other.id,
    );
    for (const query of [
      { email: actors.other.email },
      { userId: actors.other.id },
    ])
      await assert.rejects(
        () => call("manager", "staff.lookup", query),
        /No eligible account/,
      );
    for (const role of ["finance", "driver", "technician", "customer"])
      await assert.rejects(() =>
        call(role, "staff.lookup", { userId: actors.driver.id }),
      );
    for (const query of [
      {},
      { userId: actors.driver.id, email: actors.driver.email },
      { userId: "invalid" },
      { email: actors.driver.email, role: "owner" },
    ])
      await assert.rejects(() => call("owner", "staff.lookup", query));
    const current = await one(
      db,
      "SELECT * FROM settings WHERE key='security.permissions' AND scope='lagos'",
    );
    const submission = (target = actors.driver.id, extra: any = {}) => ({
      key: "security.permissions",
      scope: "lagos",
      version: current!.version,
      value: { userId: target, role: "manager", branchId: "lagos" },
      reason: "Synthetic access review only",
      ...extra,
    });
    await db.query("UPDATE sessions SET verified_at=NULL WHERE user_id=$1", [
      actors.owner.id,
    ]);

    await call("owner", "reauth", { password });
    await call("manager", "reauth", { password });
    await assert.rejects(
      () => call("owner", "setting.propose", submission(actors.owner.id)),
      /own privileges/,
    );
    await assert.rejects(
      () => call("owner", "setting.propose", submission(actors.inactive.id)),
      /active|inactive/i,
    );
    await assert.rejects(
      () => call("manager", "setting.propose", submission(actors.other.id)),
      /branch/i,
    );
    await assert.rejects(
      () =>
        call(
          "owner",
          "setting.propose",
          submission(actors.driver.id, { version: 999 }),
        ),
      { code: "VERSION_CONFLICT" },
    );
    const draft = await call(
      "owner",
      "setting.propose",
      submission(actors.driver.id, { draft: true }),
    );
    assert.equal(draft.status, "draft");
    assert.equal(
      (await one(db, "SELECT role FROM users WHERE id=$1", [actors.driver.id]))!
        .role,
      "driver",
    );
    assert.equal(
      (await one(
        db,
        "SELECT version FROM settings WHERE key='security.permissions' AND scope='lagos'",
      ))!.version,
      current!.version,
    );
    const request = await call("manager", "setting.propose", submission());
    assert.equal(request.status, "pending_approval");
    await db.query("UPDATE sessions SET verified_at=NULL WHERE user_id=$1", [
      actors.owner.id,
    ]);
    await assert.rejects(
      () =>
        call("owner", "approval.decide", {
          id: request.id,
          decision: "approve",
          reason: "Synthetic identity check",
        }),
      { code: "REAUTH_REQUIRED" },
    );
    await assert.rejects(() =>
      call("manager", "approval.decide", {
        id: request.id,
        decision: "approve",
        reason: "Synthetic self approval attempt",
      }),
    );
    assert.equal(
      (await one(db, "SELECT role FROM users WHERE id=$1", [actors.driver.id]))!
        .role,
      "driver",
    );
  } finally {
    await db.close?.();
  }
});
