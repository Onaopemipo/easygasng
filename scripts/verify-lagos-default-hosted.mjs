import fs from "node:fs/promises";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash, randomUUID } from "node:crypto";
const exec = promisify(execFile),
  mode = process.argv[2],
  root = ".data/lagos-default/release/",
  out = "docs/lagos-default/evidence/";
assert(["candidate", "stable"].includes(mode));
const release = JSON.parse(await fs.readFile(root + "deploy.json", "utf8"));
const base =
  mode === "stable"
    ? "https://easygas-client-demo.vercel.app"
    : release.deployment.url;
const credentials = await fs.readFile(
  ".data/demo-staff-logins-qa-ac7e0495.md",
  "utf8",
);
const sessions = {};
const report = { mode, base, checks: [], businessWrites: 0, status: "RUNNING" };
const pass = (id, detail) => {
  report.checks.push({ id, status: "PASS", detail });
  console.log("PASS " + id + ": " + detail);
};
async function transport(route, options) {
  if (mode === "stable")
    return fetch(base + route, {
      ...options,
      signal: AbortSignal.timeout(45000),
    });
  const tmp = await fs.mkdtemp(
    path.join(os.tmpdir(), "easygas-order-lpg-probe-"),
  );
  try {
    const output = path.join(tmp, "response"),
      config = path.join(tmp, "request.cfg");
    const lines = [
      "silent",
      "show-error",
      "max-time = 45",
      "request = " + JSON.stringify(options.method),
      "output = " + JSON.stringify(output),
      'write-out = "%{http_code}"',
    ];
    for (const [k, v] of Object.entries(options.headers))
      lines.push("header = " + JSON.stringify(k + ": " + v));
    if (options.body) {
      await fs.writeFile(path.join(tmp, "body"), options.body, { mode: 0o600 });
      lines.push(
        "data-binary = " + JSON.stringify("@" + path.join(tmp, "body")),
      );
    }
    await fs.writeFile(config, lines.join("\n") + "\n", { mode: 0o600 });
    const result = await exec(
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
      { cwd: path.resolve(root + "source"), timeout: 60000, maxBuffer: 10000 },
    );
    const body = await fs.readFile(output, "utf8");
    return {
      status: Number(result.stdout.trim().match(/(\d{3})$/)?.[1]),
      text: async () => body,
    };
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
}
async function call(role, action, input) {
  const r = await transport("/api/" + action, {
    method: input === undefined ? "GET" : "POST",
    headers: {
      origin: "https://easygas-client-demo.vercel.app",
      "content-type": "application/json",
      "x-easygas-client": "native",
      ...(sessions[role] ? { authorization: "Bearer " + sessions[role] } : {}),
    },
    ...(input === undefined ? {} : { body: JSON.stringify(input) }),
  });
  return { status: r.status, data: JSON.parse(await r.text()) };
}
async function ok(role, action, input) {
  const r = await call(role, action, input);
  assert.equal(r.status, 200, role + " " + action + ": " + r.status);
  return r.data;
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
                  "driver_last_seen_at",
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
  const result = {};
  for (const action of [
    "orders",
    "bookings",
    "inventory",
    "finance.ledger",
    "fleet.summary",
    "bulk.summary",
  ]) {
    const data = await ok("owner", action);
    result[action] = hash(
      action === "fleet.summary"
        ? {
            vehicles: data.vehicles,
            trips: data.trips.map((t) =>
              Object.fromEntries(
                ["id", "driver_id", "vehicle_id", "ended_at", "version"].map(
                  (k) => [k, t[k]],
                ),
              ),
            ),
          }
        : data,
    );
  }
  return result;
}
try {
 for(const role of ["owner","finance","manager"]){const cells=credentials.split("\n").find(line=>line.includes(role+".qa-ac7e0495@demo.easygas.invalid")).split("|").map(x=>x.trim().replaceAll("`",""));const r=await call("","login",{identifier:cells[2],password:cells[3]});assert.equal(r.status,200);sessions[role]=r.data.token;}
 const before=await snapshot(),all=await ok("owner","customers.manage"),limited=await ok("manager","customers.manage");
 assert.equal(all.canChangeBranch,true);assert.equal(limited.canChangeBranch,false);assert(all.branches.some(b=>b.id==="lagos"));assert(all.customers.every(c=>c.branch_id!==null));
 const ref="EGC-F67BF504D0CE49B8A9C4ADD61A1EA5D6",c=all.customers.find(c=>c.public_customer_id===ref);assert(c);assert.equal(c.branch_id,"lagos");
 pass("LAG-H-DEFAULT","All existing customer branches are assigned; GY is Lagos; Admin edit capability and active Lagos are advertised.");
 const rewards=await ok("owner","rewards.report"),settings=await ok("owner","settings?scope=lagos"),approvals=await ok("owner","approvals");assert.equal(settings.find(x=>x.key==="payment.cod").value,false);
 const target={id:c.id,name:c.name,branchId:"unknown-default-branch"};
 assert.equal((await call("","customers.update",target)).status,401);assert.equal((await call("finance","customers.update",target)).status,403);assert.equal((await call("manager","customers.update",target)).status,403);assert.equal((await call("owner","customers.update",target)).status,400);
 for(const branchId of ["",null])assert.equal((await call("owner","customers.update",{...target,branchId})).status,400);
 pass("LAG-H-EDIT-GUARDS","Unauthenticated, Finance, Manager transfer, invalid/empty/null destination requests are rejected without moving a customer.");
 const fresh=await ok("owner","rewards.customers?scope=lagos&query="+ref);assert.equal(fresh.customers[0].branch_id,"lagos");
 assert.equal((await call("","register",{name:"Synthetic denied sign-up",email:randomUUID()+"@default.invalid",password:"Synthetic-invalid-branch-123!",branchId:"unknown-default-branch",role:"owner"})).status,400);
 pass("LAG-H-LOOKUP","Rewards lookup resolves GY in Lagos without initial branch setup; public sign-up rejects forged branch/role input.");
 assert.deepEqual(before,await snapshot());assert.equal(hash(rewards),hash(await ok("owner","rewards.report")));assert.equal(hash(settings),hash(await ok("owner","settings?scope=lagos")));assert.equal(hash(approvals),hash(await ok("owner","approvals")));assert.equal(hash(all.customers),hash((await ok("owner","customers.manage")).customers));
 report.customer={publicReference:ref,branchBefore:c.branch_id,branchAfter:"lagos"};report.preservation=before;report.rewardsHash=hash(rewards);report.settingsHash=hash(settings);
 pass("LAG-H-PRESERVE","Customer identities/branches, rewards, orders, bookings, stock, finance ledger, fleet, LPG custody, approvals and settings unchanged by acceptance probes; COD remains off.");
 report.status="PASS";report.deploymentId=release.deployment.id;
} finally {for(const role of Object.keys(sessions))await ok(role,"logout",{});report.sessionsRevoked=Object.keys(sessions).length;await fs.writeFile(out+mode+"-hosted.json",JSON.stringify(report,null,2)+"\n");}
