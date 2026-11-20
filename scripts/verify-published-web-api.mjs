import { readVerifiedLedger } from "./lib/hosted-ledger.mjs";
import {
  settingsCategories,
  settingsGroups,
  settingsDisplay,
  settingsApprovalBadge,
} from "../packages/business-rules/src/settings-categories.ts";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import os from "node:os";
const exec = promisify(execFile);
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const dir = ".data/web-api-publication/",
  stage = process.argv[2],
  base = process.argv[3] || "https://easygas-client-demo.vercel.app",
  origin = "https://easygas-client-demo.vercel.app",
  roles = [
    "owner",
    "manager",
    "finance",
    "driver",
    "technician",
    "customer",
    "commercial",
  ];
assert.ok(
  ["before", "candidate", "stable"].includes(stage),
  "Choose before, candidate or stable verification",
);
const linked = JSON.parse(await fs.readFile(".vercel/project.json", "utf8"));
assert.equal(linked.projectId, "prj_cFSaJuN9r4x93RLov1LLVO3cdVA2");
assert.equal(linked.orgId, "team_fSpg4LlHLQsMVao9qUVmd20h");
await fs.mkdir(dir, { recursive: true });
const identity =
  stage === "before"
    ? { url: "" }
    : JSON.parse(
        await fs.readFile(
          "docs/deployment/20261121-web-api-publication/evidence/candidate-identity.json",
          "utf8",
        ),
      );
assert.equal(
  base,
  stage === "candidate" ? "https://" + identity.url : origin,
  "Credentials may only be sent to this verified demo deployment",
);
const staff = (
  await fs.readFile(".data/demo-staff-logins-qa-ac7e0495.md", "utf8")
)
  .split("\n")
  .filter((x) => x.startsWith("|") && x.includes("@"))
  .map((x) => x.split("|").map((x) => x.trim().replaceAll("`", "")));
const labels = {
  owner: "Admin / Business Owner",
  manager: "Branch Manager / Sales Rep / Dispatcher / Service Manager",
  finance: "Finance / Auditor / Inventory",
  driver: "Delivery Driver",
  technician: "Service Technician",
};
const publicAccounts = JSON.parse(
  await fs.readFile(".data/demo-test-logins-20261110.json", "utf8"),
).accounts;
const credentials = roles.map((role) => {
  if (labels[role]) {
    const a = staff.find((x) => x[1] === labels[role]);
    assert.ok(a);
    return { role, email: a[2], password: a[3] };
  }
  const a = publicAccounts.find((x) => x.role === role);
  assert.ok(a);
  return { ...a, role };
});
const checks = [],
  tokens = {};
const record = (name, detail = {}) => {
  checks.push({ name, result: "PASS", ...detail });
  console.log("PASS " + name);
};
async function transport(route, opts = {}) {
  if (stage !== "candidate") return fetch(base + route, opts);
  const temp = await fs.mkdtemp(
    path.join(os.tmpdir(), "easygas-protected-request-"),
  );
  try {
    const output = path.join(temp, "body"),
      config = path.join(temp, "curl.cfg"),
      responseHeaders = path.join(temp, "headers"),
      state = JSON.parse(await fs.readFile(dir + "state.json", "utf8"));
    const lines = [
      "silent",
      "dump-header = " + JSON.stringify(responseHeaders),
      "show-error",
      "output = " + JSON.stringify(output),
      'write-out = "%{http_code}"',
      "request = " + JSON.stringify(opts.method || "GET"),
      "connect-timeout = 10",
      "max-time = 30",
    ];
    for (const [key, value] of Object.entries(opts.headers || {}))
      lines.push("header = " + JSON.stringify(key + ": " + value));
    if (opts.body !== undefined) {
      const body = path.join(temp, "request.json");
      await fs.writeFile(body, opts.body, { mode: 0o600 });
      lines.push("data-binary = " + JSON.stringify("@" + body));
    }
    await fs.writeFile(config, lines.join("\n") + "\n", { mode: 0o600 });
    let r;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        r = await exec(
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
          { cwd: state.sourceDirectory, timeout: 60000, maxBuffer: 200000 },
        );
        break;
      } catch (error) {
        if (attempt || (opts.method && opts.method !== "GET")) throw error;
        console.log("RETRY read-only CLI transport after connection failure");
      }
    }
    assert.ok(r, "CLI transport completed");
    const match = r.stdout.trim().match(/(\d{3})$/);
    if (!match)
      throw Error("Protected CLI response did not include an HTTP status");
    const content = await fs.readFile(output, "utf8");
    const headerText = await fs.readFile(responseHeaders, "utf8");
    const cacheControl = headerText
      .split(/\r?\n/)
      .filter((x) => /^cache-control:/i.test(x))
      .at(-1)
      ?.split(":")
      .slice(1)
      .join(":")
      .trim();
    return {
      status: Number(match[1]),
      text: async () => content,
      cacheControl,
    };
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
}
async function call(role, action, data, method) {
  const r = await transport("/api/" + action, {
    method: method || (data === undefined ? "GET" : "POST"),
    headers: {
      "content-type": "application/json",
      "x-easygas-client": "native",
      origin,
      ...(tokens[role] ? { authorization: "Bearer " + tokens[role] } : {}),
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  let body;
  const raw = await r.text();
  try {
    body = JSON.parse(raw);
  } catch {
    throw Error(action + " returned non-JSON HTTP " + r.status);
  }
  return {
    status: r.status,
    body,
    cacheControl: r.cacheControl ?? r.headers?.get("cache-control"),
  };
}
async function ok(role, action, data) {
  const r = await call(role, action, data);
  assert.equal(
    r.status,
    200,
    action + ": " + r.status + " " + (r.body.error || ""),
  );
  return r.body;
}
const canonical = (v) =>
  Array.isArray(v)
    ? v.map(canonical)
    : v && typeof v === "object"
      ? Object.fromEntries(
          Object.entries(v)
            .filter(
              ([k]) =>
                ![
                  "checkedAt",
                  "asOf",
                  "generatedAt",
                  "observedAt",
                  "serverTime",
                ].includes(k),
            )
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => [k, canonical(v)]),
        )
      : v;
const hash = (v) =>
  createHash("sha256")
    .update(JSON.stringify(canonical(v)))
    .digest("hex");
const authorityFields = [
  "key",
  "category",
  "label",
  "description",
  "owner_role",
  "risk",
  "value_type",
  "view_roles",
  "propose_roles",
  "approve_roles",
  "required_roles",
  "additional_verification",
  "minimum",
  "maximum",
  "scope",
  "version",
];
const authority = (d) =>
  Object.fromEntries(
    authorityFields.filter((k) => d[k] !== undefined).map((k) => [k, d[k]]),
  );
async function snapshot() {
  const [
    settings,
    requests,
    people,
    orders,
    inventory,
    ledger,
    policies,
    readiness,
  ] = await Promise.all([
    ok("owner", "settings?scope=lagos"),
    ok("owner", "approvals"),
    ok("owner", "staff.manage"),
    ok("owner", "orders"),
    ok("owner", "inventory"),
    readVerifiedLedger(async (path) => {
      const r = await call("owner", path);
      return { status: r.status, body: r.body, cacheControl: r.cacheControl };
    }),
    ok("", "policies"),
    ok("owner", "production.readiness"),
  ]);
  assert.equal(readiness.recommendation, "NO-GO");
  const projected = orders
    .map((o) =>
      Object.fromEntries(
        [
          "id",
          "reference",
          "status",
          "payment_status",
          "total_kobo",
          "tracking_version",
          "driver_id",
        ]
          .filter((k) => o[k] !== undefined)
          .map((k) => [k, o[k]]),
      ),
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  return {
    definitions: {
      count: settings.length,
      sha256: hash(
        settings.map((d) => ({
          ...authority(d),
          owner_auto_approval: d.owner_auto_approval,
        })),
      ),
    },
    settings: {
      count: settings.length,
      sha256: hash(
        settings.map(({ key, scope, value, version }) => ({
          key,
          scope,
          value,
          version,
        })),
      ),
    },
    requests: {
      count: requests.length,
      sha256: hash(
        requests.map(
          ({
            id,
            key,
            scope,
            status,
            proposed_value,
            base_version,
            revision,
          }) => ({
            id,
            key,
            scope,
            status,
            proposed_value,
            base_version,
            revision,
          }),
        ),
      ),
    },
    staff: {
      sha256: hash(
        people.people.map(({ id, role, branch_id, active }) => ({
          id,
          role,
          branch_id,
          active,
        })),
      ),
    },
    orders: { count: orders.length, sha256: hash(projected) },
    inventory: { count: inventory.length, sha256: hash(inventory) },
    ledger: { count: ledger.count, sha256: ledger.sha256 },
    policies: { sha256: hash(policies) },
    readiness: {
      recommendation: readiness.recommendation,
      gatesSha256: hash(readiness.gates),
    },
  };
}
const state = JSON.parse(await fs.readFile(dir + "state.json", "utf8"));
const result = {
  stage,
  base,
  sourceCommit: state.sourceCommit,
  deploymentId: stage === "before" ? state.beforeDeployment : identity.id,
  startedAt: new Date().toISOString(),
  checks,
  financialWrites: 0,
  businessMutations: 0,
  method:
    "Existing labelled QA sessions; read-only business operations. Protected candidate uses authenticated Vercel CLI without disabling deployment protection; temporary own sessions revoked.",
};
try {
  const home = await transport("/");
  assert.equal(home.status, 200);
  const html = await home.text();
  assert.match(html, /Client demo/);
  assert.match(html, /noindex/);
  record("Client-demo identity, synthetic notice and no-index metadata");
  assert.equal(
    (await call("", "staff.lookup?userId=00000000-0000-4000-8000-000000000000"))
      .status,
    401,
  );
  record("Anonymous staff lookup denied");
  const actors = {};
  const logins = await Promise.allSettled(
    (stage === "before" ? ["owner"] : roles).map(async (role) => {
      const account = credentials.find((a) => a.role === role);
      const login = await call("", "login", {
        email: account.email,
        password: account.password,
      });
      assert.equal(login.status, 200, role + " login");
      assert.equal(login.body.role, role);
      tokens[role] = login.body.token;
      assert.ok(tokens[role]);
      const me = await ok(role, "me");
      assert.equal(me.user.email, account.email);
      actors[role] = me.user;
      record(role + " existing sign-in and own identity");
    }),
  );
  for (const result of logins)
    if (result.status === "rejected") throw result.reason;
  const snap = await snapshot();
  record(
    "Settings, approval requests, staff roles and operational state snapshot",
    snap,
  );
  if (stage === "before")
    await fs.writeFile(
      dir + "before-snapshot.json",
      JSON.stringify(snap, null, 2) + "\n",
      { mode: 0o600 },
    );
  else {
    const before = JSON.parse(
      await fs.readFile(dir + "before-snapshot.json", "utf8"),
    );
    assert.deepEqual(snap, before);
    record(
      "Pre-check business configuration, requests, staff and NO-GO gates unchanged",
    );
    for (const role of ["owner", "manager"]) {
      const email = encodeURIComponent(
        credentials.find((a) => a.role === "manager").email,
      );
      const byEmail = await ok(role, "staff.lookup?email=" + email);
      const byId = await ok(role, "staff.lookup?userId=" + byEmail.id);
      assert.equal(byEmail.id, byId.id);
      assert.equal(byEmail.name, byId.name);
      assert.ok(byId.active);
      record(role + " existing account resolves by email and saved-request ID");
    }
    for (const role of ["owner", "finance"]) {
      const setting = (await ok(role, "settings?scope=lagos")).find(
        (s) => s.key === "payment.gateway",
      );
      assert.ok(setting);
      assert.equal(setting.value.environment, "test");
      assert.equal(setting.value_type, "payment_gateway");
      assert.equal(setting.owner_auto_approval, false);
      assert.equal(setting.risk, 4);
      assert.ok(setting.value.fee);
      assert.ok(setting.value.channels.length);
      record(
        role +
          " gateway policy readable with protected approvals and sandbox boundary",
        { version: setting.version, feeVersion: setting.value.fee.version },
      );
    }
    for (const role of ["driver", "technician", "customer", "commercial"]) {
      assert.equal((await call(role, "settings?scope=lagos")).status, 403);
      record(role + " denied governed settings");
    }
    for (const role of ["owner", "manager", "finance"]) {
      const definitions = await ok(role, "settings?scope=lagos");
      const expected =
        role === "manager"
          ? ["payment.cod", "wallet.enabled"]
          : [
              "payment.cod",
              "payment.gateway",
              "payment.integration",
              "payment.settlement",
              "wallet.enabled",
              "wallet.maximum",
            ];
      const related = definitions.filter((d) => expected.includes(d.key));
      assert.deepEqual(related.map((d) => d.key).sort(), expected);
      for (const d of related) assert.ok(d.view_roles.includes(role));
      if (role === "manager")
        assert.ok(
          !definitions.some((d) =>
            [
              "payment.gateway",
              "payment.integration",
              "payment.settlement",
              "wallet.maximum",
            ].includes(d.key),
          ),
        );
      record(
        role +
          " payment-setting visibility and canonical definitions preserved",
        { keys: expected },
      );
    }
    const audited = JSON.parse(
      await fs.readFile(
        "docs/admin-settings-audit/evidence/definition-audit.json",
        "utf8",
      ),
    ).definitions;
    for (const role of ["owner", "manager", "finance"]) {
      const rows = await ok(role, "settings?scope=lagos"),
        expected = audited.filter((d) => d.view_roles.includes(role));
      assert.deepEqual(
        rows.map((d) => d.key).sort(),
        expected.map((d) => d.key).sort(),
        role + " complete keyset",
      );
      for (const d of rows) {
        const old = audited.find((x) => x.key === d.key);
        assert.deepEqual(
          authority(d),
          authority(old),
          d.key + " canonical authority",
        );
        const display = settingsDisplay(d);
        const { label, description, ...source } = d;
        const { label: dl, description: dd, ...presented } = display;
        assert.deepEqual(presented, source, d.key + " presentation metadata");
      }
      const grouped = settingsCategories(rows).flatMap((c) =>
        settingsGroups(rows, c, "").flatMap((g) => g.settings),
      );
      assert.equal(grouped.length, rows.length);
      assert.equal(new Set(grouped.map((d) => d.key)).size, rows.length);
      const badges = {};
      for (const d of rows) {
        const badge = settingsApprovalBadge(d, role).label;
        const expected = !d.propose_roles.includes(role)
          ? d.propose_roles.length
            ? "View only"
            : "Read only"
          : d.owner_auto_approval
            ? "Automatic approval"
            : d.risk === 1
              ? "Routine change"
              : d.risk === 4
                ? "2 approvals required"
                : "Approval required";
        assert.equal(badge, expected, d.key + " approval wording");
        badges[badge] = (badges[badge] || 0) + 1;
      }
      record(
        role +
          " entire settings inventory mapped once with unchanged canonical authority",
        { settings: rows.length, categories: settingsCategories(rows), badges },
      );
    }
    const target = actors.manager.id;
    for (const role of [
      "finance",
      "driver",
      "technician",
      "customer",
      "commercial",
    ]) {
      assert.equal(
        (await call(role, "staff.lookup?userId=" + target)).status,
        403,
      );
      record(role + " denied staff lookup");
    }
    for (const query of [
      "staff.lookup",
      "staff.lookup?userId=invalid",
      "staff.lookup?userId=" +
        target +
        "&email=" +
        encodeURIComponent(credentials.find((a) => a.role === "manager").email),
      "staff.lookup?userId=" + target + "&role=owner",
    ])
      assert.equal(
        (await call("owner", query)).status,
        400,
        query.split("?")[0] + " strict schema",
      );
    record("Missing, malformed, ambiguous and forged lookup inputs rejected");
    assert.equal(
      (
        await call(
          "owner",
          "staff.lookup?userId=00000000-0000-4000-8000-000000000000",
        )
      ).status,
      404,
    );
    record("Unknown existing-account ID returns no record");
    assert.equal(
      (await call("owner", "setting.propose", undefined, "GET")).status,
      405,
    );
    record("Setting mutation rejected over GET");
    const financeLedger = await readVerifiedLedger(async (path) => {
      const r = await call("finance", path);
      return { status: r.status, body: r.body, cacheControl: r.cacheControl };
    });
    assert.equal(financeLedger.count, 10);
    assert.ok(
      financeLedger.rows.every((r) => r.branch_id === actors.finance.branchId),
    );
    const foreign = await call(
      "finance",
      "finance.ledger?after=d9c2340e-845e-4eec-84bd-b9316386f0af",
    );
    assert.equal(foreign.status, 400);
    assert.ok(!("rows" in foreign.body));
    for (const role of [
      "manager",
      "driver",
      "technician",
      "customer",
      "commercial",
    ])
      assert.equal((await call(role, "finance.ledger?limit=1")).status, 403);
    record(
      "Full ledger retains 11 owner / 10 finance entries; foreign cursor and five other roles denied",
      { ownerRows: snap.ledger.count, financeRows: financeLedger.count },
    );
    for (const role of roles.filter((r) => r !== "owner"))
      assert.equal((await call(role, "production.readiness")).status, 403);
    record("Owner-only release readiness and NO-GO boundary retained");
    const final = await snapshot();
    assert.deepEqual(final, before);
    record(
      "Post-check settings, approvals, staff, orders, inventory, ledger, policies and NO-GO gates unchanged",
    );
  }
  result.snapshot = snap;
  result.status = "PASS";
} catch (error) {
  result.status = "FAIL";
  result.failure = error.message;
  process.exitCode = 1;
} finally {
  result.sessionsRevoked = [];
  for (const role of Object.keys(tokens)) {
    try {
      const r = await call(role, "logout", {});
      result.sessionsRevoked.push({ role, status: r.status });
      if (r.status !== 200) process.exitCode = 1;
    } catch {
      result.sessionsRevoked.push({ role, status: "FAILED" });
      process.exitCode = 1;
    }
  }
  if (!result.sessionsRevoked.every((r) => r.status === 200)) {
    result.status = "FAIL";
    result.failure = "Temporary session cleanup not confirmed";
  }
  result.finishedAt = new Date().toISOString();
  await fs.writeFile(
    "docs/deployment/20261121-web-api-publication/evidence/" +
      stage +
      "-hosted.json",
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      stage,
      status: result.status,
      checks: checks.length,
      sessionsRevoked: result.sessionsRevoked.every((r) => r.status === 200),
    }),
  );
  if (result.failure) console.error(result.failure);
}
