import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fixture } from "./helpers/service-fixture";
import { one } from "../apps/web/lib/db";
import { dispatch } from "../apps/web/lib/service";
import { digest, id } from "../apps/web/lib/auth";
const password = "Services-fixture-only-123!";

test("WEB-A02: technician help uses the public contact destination while customer conversations remain protected", async () => {
  const source = await readFile(
    "apps/web/components/technician-workspace.tsx",
    "utf8",
  );
  assert.match(
    source,
    /<Link href="\/contact">\s*<Headphones \/>\s*Contact support/,
  );
  assert.doesNotMatch(source, /<Link href="\/support">/);
  const f = await fixture();
  try {
    await assert.rejects(f.call("technician", "support.list"), /permission/);
    await assert.rejects(
      f.call("technician", "drivers.workspace"),
      /permission/,
    );
  } finally {
    await f.db.close?.();
  }
});

test("WEB-A03: verification guidance routes to the actual resend control and tokens retain purpose expiry and replay guards", async () => {
  const source = await readFile("apps/web/components/workflows.tsx", "utf8");
  assert.match(source, /mode === "verify"\s*\? "Open the verification link/);
  assert.match(
    source,
    /href="\/account-settings">Request a new verification email/,
  );
  const f = await fixture();
  try {
    const userId = f.actors.customer.id;
    const add = async (token: string, purpose: string, expiry: string) =>
      f.db.query(
        "INSERT INTO account_challenges(id,user_id,purpose,token_hash,expires_at) VALUES($1,$2,$3,$4,$5)",
        [id(), userId, purpose, digest(token), expiry],
      );
    await add(
      "a".repeat(64),
      "verify",
      new Date(Date.now() - 60000).toISOString(),
    );
    await add(
      "b".repeat(64),
      "reset",
      new Date(Date.now() + 60000).toISOString(),
    );
    await add(
      "c".repeat(64),
      "verify",
      new Date(Date.now() + 60000).toISOString(),
    );
    for (const token of ["a".repeat(64), "b".repeat(64), "d".repeat(64)])
      await assert.rejects(
        dispatch("account.verify", null, { token }, f.db),
        /expired|already been used/,
      );
    const result = await dispatch(
      "account.verify",
      null,
      { token: "c".repeat(64) },
      f.db,
    );
    assert.equal(result.ok, true);
    await assert.rejects(
      dispatch("account.verify", null, { token: "c".repeat(64) }, f.db),
      /already been used/,
    );
  } finally {
    await f.db.close?.();
  }
});

test("WEB-A01 and WEB-A06: sole-owner policy UI reflects existing authority without widening access or financial approval", async () => {
  const previous = process.env.EASYGAS_OWNER_AUTO_APPROVAL;
  process.env.EASYGAS_OWNER_AUTO_APPROVAL = "true";
  const f = await fixture();
  try {
    await f.call("owner", "reauth", { password });
    const policies = await f.call("owner", "policies.manage");
    assert.equal(policies.length, 9);
    assert.ok(policies.every((r: any) => r.owner_auto_approval === true));
    for (const actor of ["customer", "technician", "service_manager", "finance"])
      await assert.rejects(f.call(actor, "policies.manage"), /permission/);
    const proposal = await f.call("owner", "setting.propose", {
      key: "legal.privacy",
      scope: "lagos",
      version: 1,
      value: {
        title: "Synthetic demo privacy",
        content:
          "Synthetic QA only. No real policy or certification claim. ".repeat(
            4,
          ),
        published: true,
        effectiveAt: new Date(Date.now() - 1000).toISOString(),
      },
      reason: "Synthetic existing owner policy acceptance",
    });
    assert.equal(proposal.status, "active");
    assert.equal((await f.call("customer", "policies")).length, 1);
    const d = await one(
      f.db,
      "SELECT value,version FROM settings WHERE key='payment.gateway' AND scope='lagos'",
    );
    const financial = await f.call("owner", "setting.propose", {
      key: "payment.gateway",
      scope: "lagos",
      version: d!.version,
      value: d!.value,
      reason: "Synthetic financial control remains independent",
    });
    assert.equal(financial.status, "pending_approval");
    await assert.rejects(
      f.call("owner", "approval.owner_apply", {
        id: financial.id,
        reason: "Must not bypass financial independence",
      }),
      /independent/,
    );
    process.env.EASYGAS_OWNER_AUTO_APPROVAL = "false";
    assert.ok(
      (await f.call("owner", "policies.manage")).every(
        (r: any) => !r.owner_auto_approval,
      ),
    );
  } finally {
    await f.db.close?.();
    if (previous === undefined) delete process.env.EASYGAS_OWNER_AUTO_APPROVAL;
    else process.env.EASYGAS_OWNER_AUTO_APPROVAL = previous;
  }
});

test("WEB-A05: readiness supports one business owner and reports sandbox payments truthfully without releasing production", async () => {
  const f = await fixture();
  try {
    await f.db.query(
      "UPDATE users SET active=false WHERE role='owner' AND id<>$1",
      [f.actors.owner.id],
    );
    let ready = await f.call("owner", "production.readiness");
    assert.equal(ready.recommendation, "NO-GO");
    const business = ready.gates.find((g: any) => g.id === 7);
    assert.equal(business.status, "unverified");
    assert.match(business.evidence, /One business owner is supported/);
    await f.db.query(
      "UPDATE settings SET value=jsonb_set(value,'{enabled}','true'::jsonb) WHERE key='payment.gateway' AND scope='lagos'",
    );
    ready = await f.call("owner", "production.readiness");
    assert.equal(ready.recommendation, "NO-GO");
    assert.match(
      ready.gates.find((g: any) => g.id === 11).evidence,
      /sandbox\/test/,
    );
    assert.equal(ready.gates.find((g: any) => g.id === 8).status, "blocked");
    await assert.rejects(
      f.call("technician", "production.readiness"),
      /permission/,
    );
  } finally {
    await f.db.close?.();
  }
});

test("WEB-A04 and WEB-A07: expired meters and missing valuation are explained without inventing safe equipment or zero profit", async () => {
  const safety = await readFile(
    "apps/web/components/operations-completion.tsx",
    "utf8",
  );
  assert.match(safety, /Calibration expired\. This meter cannot be used/);
  const dashboard = await readFile(
    "apps/web/components/admin-overview.tsx",
    "utf8",
  );
  assert.match(dashboard, /Cost evidence incomplete · not zero profit/);
  const inventory = await readFile(
    "apps/web/components/inventory-workspace.tsx",
    "utf8",
  );
  assert.match(inventory, /Cost evidence incomplete · not zero value/);
});
