import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createDatabase } from "../apps/web/lib/db";
import { dispatch } from "../apps/web/lib/service";
import { hashPassword, id, issueSession } from "../apps/web/lib/auth";
const sql = await readFile(
  "scripts/seed-hosted-ledger-cross-branch.sql",
  "utf8",
);
const fixture = {
  branch: "qa-ledger-cross-branch",
  customer: "637fe876-4424-4d52-8c70-141078af81ec",
  payment: "d9c2340e-845e-4eec-84bd-b9316386f0af",
};
test("HLED-X-SEED: synthetic seed is atomic, idempotent, inert, append-only and rejects altered collisions without granting access", async () => {
  const db = await createDatabase("memory://");
  try {
    await db.exec(await readFile("database/bootstrap.sql", "utf8"));
    await db.exec("SET search_path TO easygas_private,pg_catalog");
    const tokens: Record<string, string> = {};
    for (const role of ["owner", "finance"]) {
      const uid = id();
      await db.query(
        "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,'Demo QA Ledger',$2,$3,$4,'lagos')",
        [
          uid,
          role === "owner"
            ? "owner.qa-ac7e0495@ledger.example.test"
            : "finance@ledger.example.test",
          hashPassword("Synthetic-local-ledger-only!"),
          role,
        ],
      );
      tokens[role] = await issueSession(db, uid);
    }
    const before = JSON.stringify(
      (await db.query("SELECT id,role,branch_id FROM users ORDER BY id")).rows,
    );
    await db.exec(
      "SET search_path TO public,pg_catalog; SET ROLE easygas_server",
    );
    await db.exec(sql);
    await db.exec(sql);
    await db.exec("SET search_path TO easygas_private,pg_catalog");
    assert.equal(
      Number(
        (await db.query("SELECT count(*) n FROM verified_payments")).rows[0].n,
      ),
      1,
    );
    assert.equal(
      Number(
        (
          await db.query(
            "SELECT count(*) n FROM audit_events WHERE action='demo.synthetic_ledger_fixture_created'",
          )
        ).rows[0].n,
      ),
      1,
    );
    const p = (
      await db.query(
        "SELECT b.active AS branch_active,u.active AS user_active,o.status,p.amount_kobo FROM verified_payments p JOIN orders o ON o.id=p.order_id JOIN users u ON u.id=o.customer_id JOIN branches b ON b.id=o.branch_id WHERE p.id=$1",
        [fixture.payment],
      )
    ).rows[0];
    assert.equal(p.branch_active, false);
    assert.equal(p.user_active, false);
    assert.equal(p.status, "cancelled");
    assert.equal(Number(p.amount_kobo), 1);
    assert.equal(
      JSON.stringify(
        (
          await db.query(
            "SELECT id,role,branch_id FROM users WHERE id<>$1 ORDER BY id",
            [fixture.customer],
          )
        ).rows,
      ),
      before,
    );
    const owner: any = await dispatch(
        "finance.ledger",
        tokens.owner,
        { limit: 1 },
        db,
      ),
      finance: any = await dispatch(
        "finance.ledger",
        tokens.finance,
        { limit: 1 },
        db,
      );
    assert.equal(owner.rows[0].id, fixture.payment);
    assert.deepEqual(finance.rows, []);
    await assert.rejects(
      () =>
        dispatch(
          "finance.ledger",
          tokens.finance,
          { after: fixture.payment },
          db,
        ),
      /valid report cursor/,
    );
    await assert.rejects(() =>
      db.query("UPDATE verified_payments SET amount_kobo=2 WHERE id=$1", [
        fixture.payment,
      ]),
    );
    await db.exec("RESET ROLE");
    await db.query("UPDATE branches SET active=true WHERE id=$1", [
      fixture.branch,
    ]);
    await db.exec("SET ROLE easygas_server");
    await assert.rejects(() => db.exec(sql), /collision|altered fixture/);
    await db.exec(
      "ROLLBACK; RESET ROLE; SET search_path TO easygas_private,pg_catalog",
    );
    assert.equal(
      (
        await db.query("SELECT active FROM branches WHERE id=$1", [
          fixture.branch,
        ])
      ).rows[0].active,
      true,
    );
    assert.equal(
      Number(
        (await db.query("SELECT count(*) n FROM verified_payments")).rows[0].n,
      ),
      1,
    );
  } finally {
    await db.close?.();
  }
});
test("HLED-X-TARGET: absent dedicated QA identity aborts before creating any synthetic branch or payment", async () => {
  const db = await createDatabase("memory://");
  try {
    await db.exec(await readFile("database/bootstrap.sql", "utf8"));
    await db.exec(
      "SET search_path TO easygas_private,pg_catalog; SET ROLE easygas_server",
    );
    await assert.rejects(() => db.exec(sql));
    await db.exec(
      "ROLLBACK; RESET ROLE; SET search_path TO easygas_private,pg_catalog",
    );
    assert.equal(
      Number(
        (
          await db.query("SELECT count(*) n FROM branches WHERE id=$1", [
            fixture.branch,
          ])
        ).rows[0].n,
      ),
      0,
    );
    assert.equal(
      Number(
        (await db.query("SELECT count(*) n FROM verified_payments")).rows[0].n,
      ),
      0,
    );
  } finally {
    await db.close?.();
  }
});

test("HLED-X-HOSTED: retained foreign-branch fixture is visible only to owner, rejects finance cursors and spoofing, and preserves prior records across all seven roles", async () => {
  const root = "docs/hosted-ledger-acceptance/cross-branch/evidence/";
  const load = async (name: string) =>
    JSON.parse(await readFile(root + name, "utf8"));
  const [baseline, r, all, seed] = await Promise.all(
    [
      "baseline-results.json",
      "verify-results.json",
      "hosted-results.json",
      "provisioning.json",
    ].map(load),
  );
  for (const value of [baseline, r, all, seed])
    assert.equal(value.status, "PASS");
  assert.equal(r.origin, "https://easygas-client-demo.vercel.app");
  assert.deepEqual(r.fixture, baseline.fixture);
  assert.equal(baseline.owner.count, 10);
  assert.equal(r.owner.count, baseline.owner.count + 1);
  assert.equal(r.finance.count, baseline.finance.count);
  assert.equal(r.finance.sha256, baseline.finance.sha256);
  assert.deepEqual(r.identities, baseline.identities);
  assert.equal(r.finance.branch, "lagos");
  assert.equal(r.checks.length, 13);
  assert.ok(r.checks.every((c: any) => c.status === "PASS"));
  for (const name of [
    "HLED-X-OWNER",
    "HLED-X-FINANCE",
    "HLED-X-NONDISCLOSURE",
    "HLED-X-OWNER-CURSOR",
    "HLED-X-ORDER",
    "HLED-X-INERT",
    "HLED-X-PRESERVATION",
  ])
    assert.ok(r.checks.some((c: any) => c.id === name));
  assert.deepEqual(
    r.checks
      .filter((c: any) => c.id === "HLED-X-CURSOR")
      .map((c: any) => [c.limit, c.statusCode, c.noRows]),
    [
      [1, 400, true],
      [500, 400, true],
    ],
  );
  assert.deepEqual(
    r.checks
      .filter((c: any) => c.id === "HLED-X-SPOOF")
      .map((c: any) => [c.parameter, c.statusCode]),
    [
      ["branchId", 400],
      ["branch_id", 400],
      ["role", 400],
      ["id", 400],
    ],
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(r.preservation).filter(([k]) => k !== "business"),
    ),
    {
      existingLedgerCount: 10,
      existingLedgerUnchanged: true,
      existingBusinessUnchanged: true,
      identitiesAndBranchesUnchanged: true,
      exactlyOneSyntheticPayment: true,
    },
  );
  assert.equal(r.financialWrites, 0);
  assert.ok(r.sessionsRevoked.every((s: any) => s.status === 200));
  assert.equal(r.sessionsRevoked.length, 2);
  assert.equal(all.roles.length, 7);
  assert.equal(all.checks.length, 30);
  assert.ok(all.checks.every((c: any) => c.status === "PASS"));
  assert.equal(all.hostedCrossBranch.status, "PASS");
  assert.equal(all.hostedCrossBranch.foreignCursorRejected, true);
  assert.equal(all.owner.count, r.owner.count);
  assert.equal(all.owner.sha256, r.owner.sha256);
  assert.equal(all.finance.sha256, r.finance.sha256);
  assert.equal(
    all.checks.filter(
      (c: any) => c.id === "HLED-ROLE-DENIED" && c.statusCode === 403,
    ).length,
    5,
  );
  assert.equal(all.sessionsRevoked.length, 9);
  assert.ok(all.sessionsRevoked.every((s: any) => s.status === 200));
  assert.equal(all.financialWrites, 0);
  assert.deepEqual(all.preservation.before, all.preservation.after);
  assert.equal(seed.neonProjectId, "silent-sun-90759854");
  assert.equal(seed.transaction.existingRowsPreserved, true);
  assert.equal(seed.transaction.schemaOrGrantChanges, false);
  assert.equal(seed.readback.branchActive, false);
  assert.equal(seed.readback.customerActive, false);
  assert.equal(seed.readback.orderStatus, "cancelled");
  assert.equal(seed.readback.amountKobo, 1);
  assert.equal(seed.readback.syntheticAudit, true);
  const { createHash } = await import("node:crypto");
  assert.equal(
    seed.transaction.mutationSqlSha256,
    createHash("sha256")
      .update(sql.split("\nCOMMIT;")[0] + "\nCOMMIT;")
      .digest("hex"),
  );
  await readFile(seed.proof);
});
