import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fixture } from "./helpers/order-tracking-fixture";
import { id, hashPassword, issueSession, digest } from "../apps/web/lib/auth";
import { reviewedSensitiveVerificationSourceHash } from "../scripts/lib/reviewed-sensitive-verification-source.mjs";
const password = "Tracking-fixture-only-123!";
test("SVERIFY-ROLES: all seven canonical roles retain recent-password, permission, branch, expiry, idempotency and throttling controls", async () => {
  const f = await fixture();
  const technician = id();
  await f.db.query(
    "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,'Synthetic technician',$2,$3,'technician','lagos')",
    [technician, technician + "@fixture.test", hashPassword(password)],
  );
  f.actors.technician = {
    id: technician,
    token: await issueSession(f.db, technician),
  };
  const roles = [
    "owner",
    "dispatcher",
    "inventory",
    "driver",
    "technician",
    "customer",
    "commercial",
  ];
  const actions = [
    { action: "fleet.vehicle.create", allowed: ["owner"] },
    { action: "branch.create", allowed: ["owner"] },
    { action: "readiness.review", allowed: ["owner"] },
    { action: "staff.edit", allowed: ["owner", "dispatcher"] },
    { action: "rewards.export", allowed: ["owner", "dispatcher", "inventory"] },
    {
      action: "gas.stock.receive",
      allowed: ["owner", "inventory"],
      body: {
        branchId: "lagos",
        grams: 100,
        reference: "SYNTHETIC-GUARD",
        reason: "Synthetic QA only",
      },
    },
  ];
  try {
    for (const role of roles) {
      for (const sample of actions)
        await assert.rejects(
          () =>
            f.call(role, sample.action, {
              ...sample.body,
              ...(sample.action === "gas.stock.receive"
                ? {}
                : { operationKey: id() }),
            }),
          (e: any) =>
            e.status === 403 &&
            e.code ===
              (sample.allowed.includes(role) ? "REAUTH_REQUIRED" : "FORBIDDEN"),
          role + " " + sample.action,
        );
      await assert.rejects(
        () => f.call(role, "account.export", {}),
        (e: any) => e.code === "REAUTH_REQUIRED",
      );
      await assert.rejects(
        () => f.call(role, "reauth", { password: "incorrect" }),
        (e: any) => e.code === "REAUTH_INVALID",
      );
      await f.call(role, "reauth", { password });
      const exported = await f.call(role, "account.export", {});
      assert.ok(exported);
      // Reauth never grants a new role, including to a driver or technician.
      if (role !== "owner")
        await assert.rejects(
          () => f.call(role, "fleet.vehicle.create", { operationKey: id() }),
          (e: any) => e.code === "FORBIDDEN",
        );
      await f.db.query(
        "UPDATE sessions SET verified_at=now()-interval '6 minutes' WHERE user_id=$1",
        [f.actors[role].id],
      );
      await assert.rejects(
        () => f.call(role, "account.export", {}),
        (e: any) => e.code === "REAUTH_REQUIRED",
      );
    }
    await f.call("inventory", "reauth", { password });
    await assert.rejects(
      () =>
        f.call("inventory", "gas.stock.receive", {
          branchId: "other-branch",
          grams: 100,
          reference: "SYNTHETIC-GUARD",
          reason: "Synthetic QA only",
        }),
      (e: any) => e.code === "BRANCH_FORBIDDEN",
    );
    await f.call("owner", "reauth", { password });
    await assert.rejects(() =>
      f.call("owner", "fleet.vehicle.create", { operationKey: id() }),
    );
    const key = id(),
      body = {
        branchId: "lagos",
        label: "Synthetic guard acceptance only",
        capacityGrams: 2000,
        lpgSuitable: false,
        operationKey: key,
      };
    const made = await f.call("owner", "fleet.vehicle.create", body);
    assert.equal(
      (await f.call("owner", "fleet.vehicle.create", body)).id,
      made.id,
    );
    await assert.rejects(
      () =>
        f.call("owner", "fleet.vehicle.create", {
          ...body,
          label: "Changed request",
        }),
      (e: any) => e.code === "IDEMPOTENCY_CONFLICT",
    );
    for (let i = 0; i < 5; i++)
      await assert.rejects(() =>
        f.call("customer", "reauth", { password: "incorrect" }),
      );
    await assert.rejects(
      () => f.call("customer", "reauth", { password }),
      (e: any) => e.status === 429,
    );
  } finally {
    await f.db.close?.();
  }
});
test("SVERIFY-AUDIT: retained guard inventory covers server sites and all browser transports; historical source and opaque session context remain fail closed", async () => {
  const inventory = JSON.parse(
    await readFile("docs/sensitive-action-verification/inventory.json", "utf8"),
  );
  assert.equal(inventory.guardSites.length, 77);
  assert.equal(new Set(inventory.guardSites.map((r: any) => r.file)).size, 34);
  for (const row of inventory.guardSites) {
    const lines = (await readFile(row.file, "utf8")).split("\n");
    assert.match(lines[row.line - 1], /recentVerification\(user\)/);
  }
  const review = JSON.parse(
    await readFile(
      "docs/sensitive-action-verification/reviewed-source-changes.json",
      "utf8",
    ),
  );
  for (const file of Object.keys(review.files)) {
    assert.equal(
      await reviewedSensitiveVerificationSourceHash(
        file,
        review.baseline[file],
      ),
      createHash("sha256")
        .update(await readFile(file))
        .digest("hex"),
    );
    await assert.rejects(
      () => reviewedSensitiveVerificationSourceHash(file, "0".repeat(64)),
      /historical baseline/,
    );
  }
  assert.equal(
    await reviewedSensitiveVerificationSourceHash(
      "apps/mobile/App.tsx",
      "untouched",
    ),
    "untouched",
  );
  const route = await readFile("apps/web/app/api/[action]/route.ts", "utf8");
  assert.equal(
    (route.match(/digest\("verification:" \+ sessionToken\)/g) ?? []).length,
    3,
  );
  const token = "synthetic-private-token";
  const context = digest("verification:" + token);
  assert.notEqual(context, token);
  assert.notEqual(context, digest(token));
  const transport = await readFile("apps/web/components/ui.tsx", "utf8");
  assert.match(
    transport,
    /rejection.verificationContext !== verificationContext/,
  );
});
