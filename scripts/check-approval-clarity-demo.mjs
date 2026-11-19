import test from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { client, hash } from "./demo-role-acceptance-client.mjs";
const path = ".data/approval-clarity-baseline.json";
const evidence = "docs/approval-clarity/evidence/";
async function snapshot(c) {
  const approvals = await c.ok("owner", "approvals");
  const settings = await c.ok("owner", "settings?scope=lagos");
  return {
    requests: approvals.map((r) => ({
      id: r.id,
      key: r.key,
      status: r.status,
      revision: r.revision,
      base_version: r.base_version,
      proposed_value: r.proposed_value,
      previous_value: r.previous_value,
      decisions: r.decisions,
    })),
    policy: settings
      .filter((r) => r.key === "loyalty.policy")
      .map((r) => ({ key: r.key, version: r.version, value: r.value })),
    orders: await c.ok("owner", "orders"),
    ledger: await c.ok("finance", "finance.ledger"),
    inventory: await c.ok("inventory", "inventory"),
    gas: (await c.ok("inventory", "inventory.workspace")).gas,
    wallet: await c.ok("customer", "wallet"),
  };
}
if (process.argv.includes("--baseline")) {
  const c = await client(),
    before = await snapshot(c);
  await writeFile(path, JSON.stringify(before), { mode: 0o600 });
  await writeFile(
    evidence + "business-before.json",
    JSON.stringify(
      Object.fromEntries(
        Object.entries(before).map(([k, v]) => [k + "Hash", hash(v)]),
      ),
      null,
      2,
    ) + "\n",
  );
  console.log(
    "Baseline recorded using normal product reads; no business mutation.",
  );
} else
  test("APC-DEPLOY: hosted owner action and dual progress are correct while existing requests, policy and business records stay unchanged", async () => {
    const c = await client(),
      before = JSON.parse(await readFile(path, "utf8")),
      after = await snapshot(c);
    assert.deepEqual(after, before);
    const rows = await c.ok("owner", "approvals"),
      r = rows.find((r) => r.id === "155d9564-e6c0-493b-92cd-9ce7eb9e11f8");
    assert.ok(r);
    assert.equal(r.status, "pending_approval");
    assert.equal(r.can_owner_apply, true);
    assert.equal(r.approval_progress.mode, "owner");
    assert.equal(r.approval_progress.approved, 0);
    assert.equal(r.approval_progress.required, 1);
    assert.equal(r.decisions.length, 0);
    const dual = rows.find(
      (r) =>
        r.risk === 4 &&
        r.status === "pending_approval" &&
        !r.owner_auto_approval,
    );
    assert.ok(dual);
    assert.equal(dual.approval_progress.mode, "independent");
    assert.equal(dual.approval_progress.required, 2);
    await writeFile(
      evidence + "hosted-readback.json",
      JSON.stringify(
        {
          checkedAt: new Date().toISOString(),
          namedRequest: {
            id: r.id,
            status: r.status,
            can_owner_apply: r.can_owner_apply,
            progress: r.approval_progress,
            decisions: r.decisions.length,
          },
          dualRequest: {
            id: dual.id,
            key: dual.key,
            progress: dual.approval_progress,
          },
          businessUnchanged: true,
          hashes: Object.fromEntries(
            Object.entries(after).map(([k, v]) => [k + "Hash", hash(v)]),
          ),
        },
        null,
        2,
      ) + "\n",
    );
  });
