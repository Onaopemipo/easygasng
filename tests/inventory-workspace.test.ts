import { consolidatedRole } from "../packages/business-rules/src/staff-roles";
import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers/order-tracking-fixture";
import { dispatch } from "../apps/web/lib/service";
import { id, hashPassword, issueSession } from "../apps/web/lib/auth";
async function actor(f: any, role: string, branch = "lagos") {
  const uid = id();
  await f.db.query(
    "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,$2,$3,$4,$5,$6)",
    [
      uid,
      "Isolated " + role,
      uid + "@inventory.example.test",
      hashPassword("Inventory-read-tests-123!"),
      consolidatedRole(role),
      branch,
    ],
  );
  return issueSession(f.db, uid);
}
test("INV-011–012: stock read separates gas and units and does not subtract quarantined quantities twice", async () => {
  const f = await fixture();
  try {
    await f.db.exec(
      "UPDATE inventory SET quantity=0,reserved=0; UPDATE inventory SET quantity=10,reserved=3 WHERE product_id='hose'; UPDATE gas_stock SET grams=25300,reserved_grams=300",
    );
    for (const gas of [false, true])
      await f.db.query(
        "INSERT INTO stock_holds(id,branch_id,product_id,gas,quantity,kind,reference,reason,evidence,actor_id) VALUES($1,'lagos',$2,$3,$4,'quarantine',$5,'Synthetic isolated hold','Isolated fixture evidence',$6)",
        [
          id(),
          gas ? null : "hose",
          gas,
          gas ? 200 : 2,
          id(),
          f.actors.owner.id,
        ],
      );
    const d = await f.call("owner", "inventory.workspace");
    const r = d.rows.find((r: any) => r.product_id === "hose");
    assert.equal(Number(r.on_hand), 12);
    assert.equal(Number(r.available), 7);
    assert.equal(Number(r.held), 2);
    assert.equal(Number(d.summary.physical), 12);
    assert.equal(Number(d.summary.gas_available), 25000);
    assert.equal(Number(d.gas[0].on_hand), 25500);
    assert.equal(d.valuation.totalKobo, null);
    assert.equal(
      d.rows.some((r: any) => r.category === "Gas refills"),
      false,
    );
    const gasOnly = await f.call("owner", "inventory.workspace", {
      category: "gas",
    });
    assert.equal(gasOnly.total, 1);
    assert.ok(gasOnly.rows.every((r: any) => r.unit === "grams"));
    const held = await f.call("owner", "inventory.workspace", {
      status: "held",
    });
    assert.equal(held.total, 2);
    const n = await f.call("owner", "navigation");
    assert.equal(Number(d.summary.alerts), n.counters.inventory);
  } finally {
    await f.db.close?.();
  }
});
test("INV-006: server paging, literal search, states and exports use the same authorised filters", async () => {
  const f = await fixture();
  try {
    for (let i = 0; i < 25; i++) {
      const p = "isolated-" + i;
      await f.db.query(
        "INSERT INTO products(id,name,description,category,asset,sku) VALUES($1,$2,'Isolated fixture','Accessories','hose',$1)",
        [p, "=Synthetic stock " + String(i).padStart(2, "0")],
      );
      await f.db.query(
        "INSERT INTO inventory(branch_id,product_id,quantity) VALUES('lagos',$1,$2)",
        [p, i],
      );
    }
    const a = await f.call("owner", "inventory.workspace", {
        q: "Synthetic stock",
      }),
      b = await f.call("owner", "inventory.workspace", {
        q: "Synthetic stock",
        page: 2,
      });
    assert.equal(a.total, 25);
    assert.equal(a.rows.length, 20);
    assert.equal(b.rows.length, 5);
    assert.equal(
      a.rows.some((r: any) =>
        b.rows.some((s: any) => s.product_id === r.product_id),
      ),
      false,
    );
    const csv = await f.call("owner", "inventory.export", {
      q: "Synthetic stock",
      status: "out",
    });
    assert.equal(csv.count, 1);
    assert.ok(csv.csv.includes("'=Synthetic stock 00"));
    assert.equal(csv.csv.includes("unit_cost"), false);
    for (const q of ["%_", "x%' OR 1=1 --"])
      assert.equal(
        (await f.call("owner", "inventory.workspace", { q })).total,
        0,
      );
    await assert.rejects(() =>
      f.call("owner", "inventory.workspace", { page: 10001 }),
    );
    await assert.rejects(() =>
      f.call("owner", "inventory.workspace", {
        sort: "name; DROP TABLE inventory",
      }),
    );
  } finally {
    await f.db.close?.();
  }
});
test("INV-030,051,052: roles, revoked sessions and branch IDOR fail closed without exposing acquisition costs", async () => {
  const f = await fixture();
  try {
    await f.db.query(
      "INSERT INTO branches(id,name) VALUES('inventory-other','Other isolated branch')",
    );
    const manager = await actor(f, "manager", "inventory-other"),
      driver = await actor(f, "driver");
    await assert.rejects(() =>
      dispatch("inventory.workspace", manager, { branchId: "lagos" }, f.db),
    );
    await assert.rejects(() =>
      dispatch("inventory.export", manager, { branchId: "lagos" }, f.db),
    );
    await assert.rejects(() => f.call("customer", "inventory.workspace"));
    await assert.rejects(() => dispatch("inventory.export", driver, {}, f.db));
    const d = await dispatch("inventory.workspace", manager, {}, f.db);
    assert.equal(d.scope, "inventory-other");
    assert.equal(d.rows.length, 0);
    assert.equal(d.valuation.totalKobo, null);
    assert.equal(JSON.stringify(d).includes("unit_cost_kobo"), false);
    // Revoke by canonical user; opaque tokens are not session IDs.
    await f.db.query(
      "UPDATE users SET active=false WHERE role='manager' AND branch_id='inventory-other'",
    );
    await assert.rejects(() =>
      dispatch("inventory.workspace", manager, {}, f.db),
    );
  } finally {
    await f.db.close?.();
  }
});
test("INV-026,043: paginated movement history preserves references, quantities and original ledger rows", async () => {
  const f = await fixture();
  try {
    await f.db.query(
      "INSERT INTO stock_movements(id,branch_id,product_id,quantity,kind,reason,reference,actor_id) VALUES($1,'lagos','hose',4,'received','Synthetic history fixture','HISTORY-ISOLATED',$2)",
      [id(), f.actors.owner.id],
    );
    const h = await f.call("owner", "inventory.movements", {
      q: "HISTORY-ISOLATED",
    });
    assert.equal(h.total, 1);
    assert.equal(h.rows[0].reference, "HISTORY-ISOLATED");
    assert.equal(Number(h.rows[0].quantity), 4);
    assert.equal(h.rows[0].actor, "owner");
    await assert.rejects(() =>
      f.db.exec(
        "UPDATE stock_movements SET quantity=99 WHERE reference='HISTORY-ISOLATED'",
      ),
    );
    await assert.rejects(() =>
      f.call("owner", "inventory.movements", {
        from: "2026-12-01",
        to: "2026-01-01",
      }),
    );
  } finally {
    await f.db.close?.();
  }
});
test("INV-027–028: complete approved acquisition basis produces reconciled category values, never retail prices", async () => {
  const f = await fixture();
  try {
    await f.db.exec(
      "UPDATE inventory SET quantity=0,reserved=0; UPDATE gas_stock SET grams=0,reserved_grams=0; UPDATE settings SET value='\"weighted_average\"' WHERE key='inventory.valuation'",
    );
    await f.call("owner", "reauth", { password: "Tracking-fixture-only-123!" });
    await f.call("owner", "inventory.receipt", {
      branchId: "lagos",
      productId: "hose",
      quantity: 10,
      reference: "INV-VALUATION-ISOLATED",
      reason: "Verified isolated acquisition receipt",
      evidence: "Synthetic acquisition evidence",
      receivingPassed: true,
      receivedDate: new Date().toISOString().slice(0, 10),
      unitCostKobo: 10000,
    });
    const d = await f.call("owner", "inventory.workspace");
    assert.equal(d.valuation.totalKobo, 100000);
    assert.equal(
      d.valuation.categories.reduce((s: number, r: any) => s + r.value, 0),
      100000,
    );
    assert.ok(
      d.valuation.categories.some(
        (r: any) => r.name === "Accessories" && r.value === 100000,
      ),
    );
    const limited = await f.call("dispatcher", "inventory.workspace");
    assert.equal(limited.valuation.totalKobo, null);
    assert.deepEqual(limited.valuation.categories, []);
  } finally {
    await f.db.close?.();
  }
});
