import fs from "node:fs/promises";
import assert from "node:assert/strict";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash, randomUUID } from "node:crypto";
const exec = promisify(execFile),
  mode = process.argv[2],
  root = ".data/admin-single-approval/release/",
  out = "docs/admin-single-approval/evidence/";
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
 const passwords={};
 for(const role of ["owner","finance","manager"]){const cells=credentials.split("\n").find(line=>line.includes(role+".qa-ac7e0495@demo.easygas.invalid")).split("|").map(x=>x.trim().replaceAll("`",""));const r=await call("","login",{identifier:cells[2],password:cells[3]});assert.equal(r.status,200);sessions[role]=r.data.token;passwords[role]=cells[3];}
 const before=await snapshot(),customers=await ok("owner","customers.manage"),rewards=await ok("owner","rewards.report"),settings=await ok("owner","settings?scope=lagos"),requests=await ok("owner","approvals");
 assert(settings.length>20);for(const s of settings)assert.equal(s.owner_auto_approval,s.propose_roles.length>0,s.key);
 for(const r of requests.filter(r=>r.status==='pending_approval'))assert.equal(r.approval_progress.required,1,r.id);
 pass('ASA-H-POLICY','Every mutable setting advertises one Admin authority; locked definitions remain locked; pending progress requires one Admin.');
 const ownPrivilege=settings.find(s=>s.key==='security.permissions');
 await ok('owner','reauth',{password:passwords.owner});
 const me=await ok('owner','me');
 const uid=me.user?.id??me.id;
 assert(uid);
 const self=await call('owner','setting.propose',{key:'security.permissions',scope:'lagos',version:ownPrivilege.version,value:{userId:uid,role:'owner',branchId:'lagos'},reason:'Synthetic denied self privilege probe'});assert.equal(self.status,403);
 assert.equal((await call('','approval.decide',{id:randomUUID(),decision:'approve',reason:''})).status,401);
 assert.equal((await call('manager','approval.owner_apply',{id:randomUUID(),reason:'Synthetic denied Admin authority probe'})).status,403);
 pass('ASA-H-GUARDS','Unauthenticated decisions, staff Admin impersonation and Admin self privilege changes fail closed.');
 if(mode==='candidate'){
  const key='business.hours',s=settings.find(s=>s.key===key);
  assert(s&&s.propose_roles.includes('owner'));
  assert(!requests.some(r=>r.key===key&&['pending_approval','draft','approved','scheduled'].includes(r.status)),'Do not invalidate existing opening-hours requests');
  const reason='Synthetic demo acceptance: same opening hours; verify one Admin approval with audit';
  const input={key,scope:'lagos',version:s.version,value:s.value,reason};
  const applied=await ok('owner','setting.propose',input);assert.equal(applied.status,'active');report.businessWrites=1;
  const afterSettings=await ok('owner','settings?scope=lagos'),after=afterSettings.find(x=>x.key===key);assert.equal(after.version,s.version+1);assert.deepEqual(after.value,s.value);
  const audit=await ok('owner','audit?view=paged&q='+encodeURIComponent(applied.id)+'&pageSize=100');
  const rows=audit.rows??audit.items??audit;
  assert(Array.isArray(rows));assert.equal(rows.filter(x=>x.action==='approval.owner_auto_approved'&&x.target===applied.id).length,1);
  const stale=await call('owner','setting.propose',input);assert.equal(stale.status,409);
  const final=await ok('owner','settings?scope=lagos');assert.equal(final.find(x=>x.key===key).version,s.version+1);
  assert.deepEqual(settings.filter(x=>x.key!==key),final.filter(x=>x.key!==key));
  report.oneAdminAcceptance={requestId:applied.id,key,valueUnchanged:true,beforeVersion:s.version,afterVersion:after.version,adminAuditProofs:1,additionalColleagueApprovals:0,staleReplayStatus:stale.status};
  pass('ASA-H-APPLY','One Admin submission applied unchanged opening hours with exactly one Admin audit proof; stale replay rejected and no second version created.');
 }else{
  const candidate=JSON.parse(await fs.readFile(out+'candidate-hosted.json','utf8'));assert.equal(candidate.status,'PASS');const s=settings.find(x=>x.key===candidate.oneAdminAcceptance.key);assert.equal(s.version,candidate.oneAdminAcceptance.afterVersion);const audit=await ok('owner','audit?view=paged&q='+encodeURIComponent(candidate.oneAdminAcceptance.requestId)+'&pageSize=100');assert.equal(audit.rows.filter(x=>x.action==='approval.owner_auto_approved'&&x.target===candidate.oneAdminAcceptance.requestId).length,1);report.oneAdminAcceptance=candidate.oneAdminAcceptance;
  pass('ASA-H-READBACK','Stable demo reads the exact candidate Admin-authorised setting version and immutable request proof.');
 }
 assert.equal(settings.find(s=>s.key==='payment.cod').value,false);
 assert.deepEqual(before,await snapshot());assert.equal(hash(rewards),hash(await ok('owner','rewards.report')));assert.equal(hash(customers.customers),hash((await ok('owner','customers.manage')).customers));
 report.preservation=before;report.customerAndRewardsPreserved=true;report.codEnabled=false;
 pass('ASA-H-PRESERVE','Orders, bookings, stock, finance ledger, fleet, LPG custody, customers and reward balances unchanged; COD remains off.');
 report.status='PASS';report.deploymentId=release.deployment.id;
} finally {for(const role of Object.keys(sessions))await ok(role,'logout',{});report.sessionsRevoked=Object.keys(sessions).length;await fs.writeFile(out+mode+'-hosted.json',JSON.stringify(report,null,2)+'\n');}
