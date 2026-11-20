import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import os from "node:os";
const exec = promisify(execFile);
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const dir = ".data/native-web-release/",
  stage = process.argv[2],
  base = process.argv[3] || "https://easygas-client-demo.vercel.app",
  origin = "https://easygas-client-demo.vercel.app",
  roles = ["owner", "manager", "finance", "driver", "technician", "customer"];
assert.ok(
  ["before", "candidate", "stable"].includes(stage),
  "Choose before, candidate or stable verification",
);
const linked = JSON.parse(await fs.readFile(".vercel/project.json", "utf8"));
assert.equal(linked.projectId, "prj_cFSaJuN9r4x93RLov1LLVO3cdVA2");
assert.equal(linked.orgId, "team_fSpg4LlHLQsMVao9qUVmd20h");
const identity = JSON.parse(
  await fs.readFile(
    "docs/native-workflows/evidence/web-release/candidate-identity.json",
    "utf8",
  ),
);
assert.equal(
  base,
  stage === "candidate" ? "https://" + identity.url : origin,
  "Credentials may only be sent to this verified demo deployment",
);
const guide = await fs.readFile(".data/vercel-client-demo-accounts.md", "utf8"),
  table = guide
    .split("\n")
    .filter((line) => line.startsWith("|"))
    .map((line) =>
      line
        .split("|")
        .map((s) => s.trim().replace(/^`|`$/g, ""))
        .filter(Boolean),
    );
const credentials = roles.map((role) => {
  const cells = table.find((c) => c[0] === role);
  assert.ok(
    cells?.length === 3 && cells[1].includes("@") && cells[2],
    role + " canonical demo account",
  );
  return { role, email: cells[1], password: cells[2] };
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
      state = JSON.parse(await fs.readFile(dir + "state.json", "utf8"));
    const lines = [
      "silent",
      "show-error",
      "output = " + JSON.stringify(output),
      'write-out = "%{http_code}"',
      "request = " + JSON.stringify(opts.method || "GET"),
    ];
    for (const [key, value] of Object.entries(opts.headers || {}))
      lines.push("header = " + JSON.stringify(key + ": " + value));
    if (opts.body !== undefined) {
      const body = path.join(temp, "request.json");
      await fs.writeFile(body, opts.body, { mode: 0o600 });
      lines.push("data-binary = " + JSON.stringify("@" + body));
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
      { cwd: state.sourceDirectory, timeout: 60000, maxBuffer: 200000 },
    );
    const match = r.stdout.trim().match(/(\d{3})$/);
    if (!match)
      throw Error("Protected CLI response did not include an HTTP status");
    const content = await fs.readFile(output, "utf8");
    return { status: Number(match[1]), text: async () => content };
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
  return { status: r.status, body };
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
async function snapshot() {
  const orders = await ok("owner", "orders"),
    inventory = await ok("owner", "inventory"),
    ledger = await ok("owner", "finance.ledger"),
    policies = await ok("", "policies"),
    readiness = await ok("owner", "production.readiness");
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
    orders: { count: orders.length, sha256: hash(projected) },
    inventory: { count: inventory.length, sha256: hash(inventory) },
    ledger: { sha256: hash(ledger) },
    policies: { sha256: hash(policies) },
    readiness: {
      recommendation: readiness.recommendation,
      gatesSha256: hash(readiness.gates),
    },
  };
}
try {
  const home = await transport("/");
  assert.equal(home.status, 200);
  const html = await home.text();
  assert.ok(
    /Client demo/.test(html),
    "Expected demo HTML; deployment protection is verified separately",
  );
  assert.match(html, /noindex/);
  record("Public homepage, synthetic-data notice and no-index metadata");
  assert.match(await (await transport("/robots.txt")).text(), /Disallow: \/\s/);
  record("Robots excludes public indexing");
  assert.equal((await call("", "me")).status, 401);
  record("Anonymous session denied");
  for (const role of stage === "before" ? ["owner"] : roles) {
    const account = credentials.find((a) => a.role === role);
    assert.ok(account, role + " credential");
    const r = await call("", "login", {
      email: account.email,
      password: account.password,
    });
    assert.equal(r.status, 200, role + " login " + r.status);
    assert.equal(r.body.role, role);
    tokens[role] = r.body.token;
    assert.ok(tokens[role]);
    const me = await ok(role, "me");
    assert.equal(me.user.role, role);
    assert.equal(me.user.email, account.email);
    record(role + " existing sign-in and own identity");
  }
  const snap = await snapshot();
  record("Read-only business snapshot and production NO-GO", snap);
  if (stage !== "before") {
    const before = JSON.parse(
      await fs.readFile(dir + "before-snapshot.json", "utf8"),
    );
    assert.deepEqual(snap, before);
    record(
      "Orders, inventory, ledger, published policies and release gates unchanged",
    );
    for (const role of roles.filter((r) => r !== "owner")) {
      assert.equal((await call(role, "production.readiness")).status, 403);
      assert.equal(
        (
          await call(role, "readiness.review", {
            gateId: 2147483647,
            evidence:
              "Synthetic QA only invalid-gate release check; no acceptance decision.",
            reason: "Verify denied access without creating a review record.",
          })
        ).status,
        403,
      );
      record(role + " denied owner readiness read/write");
    }
    assert.equal((await call("", "readiness.review", {})).status, 401);
    assert.equal(
      (await call("owner", "readiness.review", undefined, "GET")).status,
      405,
    );
    record("Readiness review authentication and mutation-method boundaries");
    assert.equal((await call("owner", "readiness.review", {})).status, 403);
    record("Readiness review requires recent verification");
    await ok("owner", "reauth", {
      password: credentials.find((a) => a.role === "owner").password,
    });
    const invalid = await call("owner", "readiness.review", {
      gateId: 2147483647,
      evidence:
        "Synthetic QA only invalid-gate release check; no acceptance decision.",
      reason: "Verify deployed handler without creating a review record.",
    });
    assert.equal(invalid.status, 404);
    assert.equal(invalid.body.error, "Release gate not found.");
    record(
      "New deployed readiness handler validates gate without creating a review",
    );
    assert.equal((await call("owner", "readiness.review", {})).status, 400);
    record("Malformed review rejected by strict schema");
    const r = await ok("owner", "production.readiness");
    assert.ok(Array.isArray(r.reviews));
    assert.equal(r.recommendation, "NO-GO");
    assert.equal(hash(r.gates), snap.readiness.gatesSha256);
    const final = await snapshot();
    assert.deepEqual(final, before);
    record("Post-verification state unchanged; NO-GO retained");
  }
  if (stage === "before")
    await fs.writeFile(
      dir + "before-snapshot.json",
      JSON.stringify(snap, null, 2) + "\n",
      { mode: 0o600 },
    );
  await fs.writeFile(
    "docs/native-workflows/evidence/web-release/" + stage + "-hosted.json",
    JSON.stringify(
      {
        date: new Date().toISOString(),
        base,
        stage,
        method:
          stage === "candidate"
            ? "Authenticated Vercel CLI Deployment Protection access plus native-bearer HTTPS to the verified candidate; protection remains enabled. No database connection, seed, business mutation or valid evidence-review submission."
            : "Actual native-bearer HTTPS requests using existing dedicated demo accounts from the canonical private guide; no database connection, seed, business mutation or valid evidence-review submission.",
        checks,
        snapshot: snap,
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  for (const role of Object.keys(tokens))
    await call(role, "logout", {}).catch(() => {});
}
