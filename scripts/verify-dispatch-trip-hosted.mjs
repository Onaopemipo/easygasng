// Dedicated client-demo read-only setup acceptance; own temporary authentication only, no business writes.
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash, randomUUID } from "node:crypto";
const exec = promisify(execFile),
  stage = process.argv[2],
  dir = ".data/dispatch-trip-release/",
  out = "docs/dispatch-trip/evidence/",
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
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "easygas-trip-http-"));
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
    pass("TCH-CLEANUP", "Only the seven verifier-created sessions revoked");
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
        "TCH-SESSIONS",
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
      "TCH-READY",
      "Existing demo ready and original production NO-GO retained",
    );
    const before = await snapshot();
    if (stage === "before") {
      await fs.writeFile(
        dir + "before.json",
        JSON.stringify(before, null, 2) + "\n",
      );
      pass(
        "TCH-BASELINE",
        "Current order/inventory/vehicle/trip/driver snapshots recorded before deployment",
      );
    } else {
      const setup = await ok("manager", "dispatch.setup");
      const owner = await ok("owner", "dispatch.trip.options");
      const manager = await ok("manager", "dispatch.trip.options");
      assert.ok(owner.branches.length);
      assert.ok(manager.branches.length <= 1);
      assert.ok(manager.trips.every((t) => t.branch_id === setup.branch.id));
      assert.ok(manager.vehicles.every((v) => v.branch_id === setup.branch.id));
      const missing = "00000000-0000-4000-8000-000000000099";
      const fleet = await ok("owner", "fleet.summary");
      assert.ok(!fleet.trips.some((t) => t.id === missing));
      const observed = fleet.trips[0];
      assert.ok(
        observed,
        "Retained historical trip needed for read-only review",
      );
      const review = await ok(
        "owner",
        "dispatch.trip.review?tripId=" + observed.id,
      );
      assert.equal(review.trip.id, observed.id);
      assert.equal(
        review.reconciliation.clear,
        review.reconciliation.blockers.length === 0,
      );
      const managed = fleet.trips.find((t) => t.branch_id === setup.branch.id);
      if (managed)
        assert.equal(
          (await ok("manager", "dispatch.trip.review?tripId=" + managed.id))
            .trip.id,
          managed.id,
        );
      for (const role of roles.filter(
        (r) => !["owner", "manager"].includes(r),
      )) {
        for (const action of [
          "dispatch.trip.options",
          "dispatch.trip.review?tripId=" + observed.id,
        ])
          assert.equal((await call(role, action)).status, 403);
        for (const action of ["dispatch.trip.end", "dispatch.trip.change"])
          assert.equal((await call(role, action, {})).status, 403);
      }
      assert.equal((await call("", "dispatch.trip.options")).status, 401);
      assert.equal(
        (await call("", "dispatch.trip.review?tripId=" + observed.id)).status,
        401,
      );
      for (const action of ["dispatch.trip.end", "dispatch.trip.change"])
        assert.equal((await call("", action, {})).status, 401);
      assert.equal(
        (await call("owner", "dispatch.trip.options?unexpected=value")).status,
        400,
      );
      assert.equal(
        (await call("owner", "dispatch.trip.review?tripId=invalid")).status,
        400,
      );
      assert.equal(
        (await call("owner", "dispatch.trip.review?tripId=" + missing)).status,
        404,
      );
      pass(
        "TCH-ROLES",
        "Owner/manager scoped trip options and retained-trip review succeed; five lower roles, anonymous and malformed/missing trips fail closed",
      );
      const credentials = JSON.parse(
        await fs.readFile(".data/demo-test-logins-20261110.json", "utf8"),
      );
      for (const role of ["owner", "manager"]) {
        if (stage === "candidate")
          for (const action of ["dispatch.trip.end", "dispatch.trip.change"]) {
            const denied = await call(role, action, {});
            assert.equal(denied.status, 403);
            assert.equal(denied.data.code, "REAUTH_REQUIRED");
          }
        await ok(role, "reauth", {
          password: credentials.accounts.find((a) => a.role === role).password,
        });
        for (const action of ["dispatch.trip.end", "dispatch.trip.change"]) {
          const body = {
            tripId: missing,
            version: 0,
            endOdometer: 0,
            operationKey: randomUUID(),
            ...(action.endsWith("change")
              ? {
                  vehicleId: "00000000-0000-4000-8000-000000000098",
                  startOdometer: 0,
                }
              : {}),
          };
          assert.equal(
            (await call(role, action, body)).status,
            404,
            role + " " + action,
          );
        }
      }
      pass(
        "TCH-GUARDS",
        "Fresh-password guard enforced; verified requests reference only an asserted missing trip and roll back404. No actual hosted trip ended or changed",
      );
      result.tripOptions = {
        ownerTrips: owner.trips.length,
        managerTrips: manager.trips.length,
        ownerAvailableVehicles: owner.vehicles.length,
        writesEnabled: owner.writesEnabled,
      };
      const orders = await ok("owner", "orders"),
        order = orders.find((o) => o.status === "preparing");
      assert.ok(order);
      const candidates = await ok(
        "owner",
        "dispatch.candidates?orderId=" + order.id,
      );
      assert.equal(candidates.orderId, order.id);
      assert.equal(candidates.automaticAssignmentEnabled, false);
      pass(
        "TCH-ASSIGNMENT",
        "Order-specific canonical driver eligibility remains available; no assignment or business write submitted",
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
      "TCH-PRESERVE",
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
