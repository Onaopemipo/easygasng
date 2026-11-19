// Authorised synthetic client-demo acceptance. Uses existing product HTTP APIs only.
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { randomUUID, createHash } from "node:crypto";
export const origin = "https://easygas-client-demo.vercel.app";
export const label = "DEMO-QA-ROLE-20261119";
export const evidenceRoot = "docs/deployment/evidence/20261119-role-acceptance";
const statePath = ".data/role-acceptance-20261119.json";
export const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export async function client() {
  await mkdir(evidenceRoot, { recursive: true });
  const manifest = JSON.parse(await readFile(".data/demo-test-logins-20261110.json", "utf8"));
  assert.equal(manifest.project, "easygas-client-demo");
  let state;
  try { state = JSON.parse(await readFile(statePath, "utf8")); }
  catch { state = { origin, label, tokens: {}, keys: {}, orders: {}, checks: [], calls: [] }; }
  assert.equal(state.origin, origin); assert.equal(state.label, label);
  const save = () => writeFile(statePath, JSON.stringify(state, null, 2), { mode: 0o600 });
  const key = (name) => state.keys[name] ??= randomUUID();
  async function request(role, action, body) {
    const started = Date.now();
    const response = await fetch(origin + "/api/" + action, {
      method: body === undefined ? "GET" : "POST", signal: AbortSignal.timeout(60000),
      headers: { "content-type": "application/json", "x-easygas-client": "native", origin,
        ...(state.tokens[role] ? { authorization: "Bearer " + state.tokens[role] } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    let data; try { data = await response.json(); } catch { data = { error: "Non-JSON response" }; }
    state.calls.push({ role, action, status: response.status, durationMs: Date.now() - started });
    await save();
    return { status: response.status, data };
  }
  async function login(role) {
    const a = manifest.accounts.find((a) => a.role === role); assert.ok(a, role);
    const action = role === "driver" ? "driver.login" : role === "technician" ? "technician.login" : "login";
    const r = await request(role, action, { identifier: a.email, password: a.password });
    assert.equal(r.status, 200, role + " login"); assert.ok(r.data.token, role + " token");
    state.tokens[role] = r.data.token; await save();
  }
  async function call(role, action, body) {
    if (role && !state.tokens[role]) await login(role);
    let r = await request(role, action, body);
    if (role && r.status === 401) { await login(role); r = await request(role, action, body); }
    return r;
  }
  async function ok(role, action, body) {
    const r = await call(role, action, body);
    assert.equal(r.status, 200, `${role} ${action}: HTTP ${r.status} ${r.data.error ?? ""}`);
    return r.data;
  }
  async function reauth(role) {
    const a = manifest.accounts.find((a) => a.role === role);
    return ok(role, "reauth", { password: a.password });
  }
  const check = async (id, detail) => { state.checks.push({ id, passed: true, detail, at: new Date().toISOString() }); await save(); };
  assert.deepEqual(await ok("", "status"), { status: "ready", scope: "demo" });
  return { state, save, key, call, ok, reauth, check, manifest, login };
}
