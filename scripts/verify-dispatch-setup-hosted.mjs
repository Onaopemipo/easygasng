// Dedicated client-demo read-only setup acceptance; own temporary authentication only, no business writes.
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
const exec = promisify(execFile),
  stage = process.argv[2],
  dir = ".data/dispatch-setup-release/",
  out = "docs/dispatch-setup/evidence/",
  origin = "https://easygas-client-demo.vercel.app";
assert.ok(["before", "candidate", "stable", "cleanup"].includes(stage));
const state = JSON.parse(await fs.readFile(dir + "state.json", "utf8"));
assert.equal(state.projectId, "prj_cFSaJuN9r4x93RLov1LLVO3cdVA2");
assert.equal(state.orgId, "team_fSpg4LlHLQsMVao9qUVmd20h");
const base = stage === "candidate" ? state.candidateUrl : origin;
if (stage === "candidate")
  assert.match(
    base,
    /^https:\/\/easygas-client-demo-[a-z0-9]+-onaopemipos-projects\.vercel\.app$/,
  );
const roles = [
  "owner",
  "manager",
  "finance",
  "driver",
  "technician",
  "customer",
  "commercial",
];
let session = { tokens: {} };
try {
  session = JSON.parse(await fs.readFile(dir + "sessions.json", "utf8"));
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
const result = {
  stage,
  base,
  sourceCommit: state.sourceCommit,
  deploymentId: state.deploymentId,
  status: "RUNNING",
  businessWrites: 0,
  checks: [],
};
function pass(id, detail) {
  result.checks.push({ id, status: "PASS", detail });
  console.log("✔ " + id + ": " + detail);
}
async function transport(route, options) {
  if (stage !== "candidate")
    return fetch(base + route, {
      ...options,
      signal: AbortSignal.timeout(30000),
    });
  const temp = await fs.mkdtemp(
    path.join(os.tmpdir(), "easygas-feedback-http-"),
  );
  try {
    const output = path.join(temp, "response"),
      config = path.join(temp, "request.cfg"),
      lines = [
        "silent",
        "show-error",
        "max-time = 30",
        "request = " + JSON.stringify(options.method),
        "output = " + JSON.stringify(output),
        'write-out = "%{http_code}"',
      ];
    for (const [k, v] of Object.entries(options.headers))
      lines.push("header = " + JSON.stringify(k + ": " + v));
    if (options.body) {
      const input = path.join(temp, "body.json");
      await fs.writeFile(input, options.body, { mode: 0o600 });
      lines.push("data-binary = " + JSON.stringify("@" + input));
    }
    await fs.writeFile(config, lines.join("\n") + "\n", { mode: 0o600 });
    const r = await exec(
      "vercel",
      [
        "curl",
        route,
        "--deployment",
        base,
        "--scope",
        "onaopemipos-projects",
        "--",
        "--config",
        config,
      ],
      { cwd: state.sourceDirectory, timeout: 60000, maxBuffer: 10000 },
    );
    const status = Number(r.stdout.trim().match(/(\d{3})$/)?.[1]),
      body = await fs.readFile(output, "utf8");
    return { status, text: async () => body };
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
}
async function call(role, action, body) {
  const r = await transport("/api/" + action, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      origin,
      "content-type": "application/json",
      "x-easygas-client": "native",
      ...(session.tokens[role]
        ? { authorization: "Bearer " + session.tokens[role] }
        : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: r.status, data: JSON.parse(await r.text()) };
}
async function ok(role, action, body) {
  const r = await call(role, action, body);
  assert.equal(r.status, 200, role + " " + action);
  return r.data;
}
const hash = (v) =>
  createHash("sha256").update(JSON.stringify(v)).digest("hex");
async function snapshot() {
  const orders = await ok("owner", "orders"),
    inventory = await ok("owner", "inventory"),
    fleet = await ok("owner", "fleet.summary");
  const drivers = await ok("owner", "drivers.workspace");
  return {
    ordersHash: hash(orders),
    orderCount: orders.length,
    inventoryHash: hash(inventory),
    vehiclesHash: hash(fleet.vehicles),
    tripsHash: hash(
      fleet.trips.map((t) => ({
        id: t.id,
        driver_id: t.driver_id,
        vehicle_id: t.vehicle_id,
        branch_id: t.branch_id,
        ended_at: t.ended_at,
        start_odometer: t.start_odometer,
        end_odometer: t.end_odometer,
      })),
    ),
    driversHash: hash(drivers.drivers),
  };
}

try {
  if (stage === "cleanup") {
    for (const role of Object.keys(session.tokens)) {
      assert.equal((await call(role, "logout", {})).status, 200);
      delete session.tokens[role];
    }
    await fs.writeFile(dir + "sessions.json", JSON.stringify(session), {
      mode: 0o600,
    });
    pass("DSH-CLEANUP", "Only the seven verifier-created sessions revoked");
  } else {
    if (stage === "before") {
      const creds = JSON.parse(
        await fs.readFile(".data/demo-test-logins-20261110.json", "utf8"),
      );
      assert.equal(creds.project, "easygas-client-demo");
      for (const role of roles) {
        const a = creds.accounts.find((a) => a.role === role);
        assert.ok(a?.password);
        if (!session.tokens[role]) {
          const login = await call("", "login", {
            email: a.email,
            password: a.password,
          });
          assert.equal(login.status, 200);
          session.tokens[role] = login.data.token;
          await fs.writeFile(dir + "sessions.json", JSON.stringify(session), {
            mode: 0o600,
          });
        }
        assert.equal((await ok(role, "me")).user.role, role);
      }
      pass(
        "DSH-SESSIONS",
        "Seven fresh verifier-owned role sessions; no identity or permission changes",
      );
    }
    assert.deepEqual(await ok("", "status"), {
      status: "ready",
      scope: "demo",
    });
    assert.equal(
      (await ok("owner", "production.readiness")).recommendation,
      "NO-GO",
    );
    pass(
      "DSH-READY",
      "Existing demo ready and original production NO-GO retained",
    );
    const before = await snapshot();
    if (stage === "before") {
      await fs.writeFile(
        dir + "before.json",
        JSON.stringify(before, null, 2) + "\n",
      );
      pass(
        "DSH-BASELINE",
        "Current order/inventory/vehicle/trip/driver snapshots recorded before deployment",
      );
    } else {
      const owner = await ok("owner", "dispatch.setup"),
        manager = await ok("manager", "dispatch.setup");
      assert.ok(owner.branches.length);
      assert.equal(owner.canRegisterVehicle, true);
      assert.equal(manager.canRegisterVehicle, false);
      assert.ok(manager.branches.length <= 1);
      assert.equal(manager.branch?.id, manager.branches[0]?.id);
      for (const role of roles.filter((r) => !["owner", "manager"].includes(r)))
        assert.equal((await call(role, "dispatch.setup")).status, 403, role);
      assert.equal((await call("", "dispatch.setup")).status, 401);
      assert.equal(
        (
          await call(
            "manager",
            "dispatch.setup?branch=synthetic-foreign-branch",
          )
        ).status,
        403,
      );
      assert.equal(
        (await call("owner", "dispatch.setup?branch=synthetic-missing-branch"))
          .status,
        404,
      );
      assert.equal(
        (await call("owner", "dispatch.setup?unexpected=value")).status,
        400,
      );
      pass(
        "DSH-ROLES",
        "Owner/manager setup reads succeed; five lower roles, anonymous, foreign/missing branch and malformed scope fail closed",
      );
      const branches = owner.branches;
      const chosen =
        owner.branch ?? branches.find((b) => b.active) ?? branches[0];
      const setup = await ok(
        "owner",
        "dispatch.setup?branch=" + encodeURIComponent(chosen.id),
      );
      assert.equal(setup.branch.id, chosen.id);
      assert.ok(setup.counts && setup.checks);
      assert.equal(typeof setup.checks.assignmentEnabled, "boolean");
      result.branchCount = branches.length;
      result.setupCounts = setup.counts;
      result.setupChecks = setup.checks;
      pass(
        "DSH-SETUP",
        "Selected branch canonical counts and prerequisite flags returned by the deployed read-only action",
      );
      const orders = await ok("owner", "orders");
      const order = orders.find((o) => o.status === "preparing");
      assert.ok(
        order,
        "Existing preparing order required; no business mutation permitted",
      );
      const candidates = await ok(
        "owner",
        "dispatch.candidates?orderId=" + order.id,
      );
      assert.equal(candidates.orderId, order.id);
      assert.equal(candidates.automaticAssignmentEnabled, false);
      result.candidateCounts = {
        ready: candidates.candidates.filter((d) => d.readiness.ready === true)
          .length,
        blocked: candidates.candidates.filter((d) => d.readiness.ready !== true)
          .length,
      };
      pass(
        "DSH-ASSIGNMENT",
        "Existing order-specific candidate API still provides authoritative eligibility; no assignment submitted",
      );
    }
    const after = await snapshot();
    assert.deepEqual(after, before);
    if (stage !== "before")
      assert.deepEqual(
        after,
        JSON.parse(await fs.readFile(dir + "before.json", "utf8")),
      );
    result.snapshot = after;
    pass(
      "DSH-PRESERVE",
      "Current order/inventory/vehicle/trip/driver business snapshots unchanged across setup checks and rollout",
    );
  }
  result.status = "PASS";
} catch (e) {
  result.status = "FAIL";
  result.failure = e.message;
  process.exitCode = 1;
  console.error(e.message);
} finally {
  result.completedAt = new Date().toISOString();
  await fs.writeFile(
    out + stage + "-hosted.json",
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(
    `ℹ tests ${result.checks.length}\nℹ pass ${result.checks.length}\nℹ fail ${result.status === "PASS" ? 0 : 1}\nℹ skipped 0`,
  );
}
