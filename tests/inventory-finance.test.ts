import { test } from "node:test";
import assert from "node:assert/strict";
import { createDatabase, migrate, one } from "../apps/web/lib/db";
import { id, hashPassword, issueSession } from "../apps/web/lib/auth";
import { dispatch } from "../apps/web/lib/service";
async function fixture() {
  const db = await createDatabase("memory://");
  await migrate(db);
  const users: Record<string, any> = {};
  for (const role of [
    "owner",
    "manager",
    "inventory",
    "sales",
    "finance",
    "driver",
    "administrator",
  ]) {
    const uid = id();
    await db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,$2,$3,$4,$5,'lagos')",
      [
        uid,
        role,
        uid + "@example.test",
        hashPassword("Inventory-fixture-only-123!"),
        role,
      ],
    );
    users[role] = { id: uid, token: await issueSession(db, uid) };
  }
  const call = (role: string, action: string, data: any = {}) =>
    dispatch(action, users[role].token, data, db);
  for (const role of ["owner", "manager", "finance", "inventory"])
    await call(role, "reauth", { password: "Inventory-fixture-only-123!" });
  return { db, users, call };
}
test("F,N: operational dashboard and sales inventory must not expose financial metrics or costs", async () => {
  const f = await fixture();
  try {
    const rows = await f.call("sales", "inventory");
    assert.ok(rows.length);
    assert.equal("price_kobo" in rows[0], true);
    assert.equal("unit_cost_kobo" in rows[0], false);
    const d = await f.call("inventory", "dashboard");
    assert.equal(d.revenueKobo, null);
    assert.equal("walletLiabilityKobo" in d, false);
    await assert.rejects(
      () => f.call("sales", "finance.summary"),
      /permission/,
    );
  } finally {
    await f.db.close?.();
  }
});
async function approve(
  f: Awaited<ReturnType<typeof fixture>>,
  requestId: string,
) {
  return f.call("owner", "approval.decide", {
    id: requestId,
    decision: "approve",
    reason: "Independent review of synthetic stock evidence",
  });
}
const stock = {
  branchId: "lagos",
  productId: "hose",
  quantity: 10,
  reference: "TEST-INVENTORY-RECEIPT",
  reason: "Synthetic supplier delivery verified",
  evidence: "Fixture receiving checklist and invoice",
  receivedDate: "2026-10-29",
  receivingPassed: true,
  unitCostKobo: 10000,
};
test("A–E,M: governed corrections preserve reservations, stale counts fail and movements cannot be altered", async () => {
  const f = await fixture();
  try {
    await f.call("inventory", "inventory.receipt", stock);
    await f.call("inventory", "inventory.receipt", stock);
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT quantity FROM inventory WHERE product_id='hose' AND branch_id='lagos'",
        ))!.quantity,
      ),
      10,
    );
    await assert.rejects(
      () =>
        f.call("inventory", "inventory.receipt", { ...stock, quantity: 11 }),
      /different/,
    );
    await assert.rejects(
      () =>
        f.call("sales", "inventory.adjust", {
          branchId: "lagos",
          productId: "hose",
          quantity: -2,
          reference: "UNAUTH-ADJUST",
          reason: "Unauthorized correction",
          evidence: "No valid stock evidence",
        }),
      /permission/,
    );
    const request = {
      branchId: "lagos",
      productId: "hose",
      quantity: -2,
      reference: "APPROVED-ADJUST",
      reason: "Verified damaged physical stock",
      evidence: "Synthetic count sheet verification",
    };
    const r = await f.call("inventory", "inventory.adjust", request);
    await assert.rejects(
      () =>
        f.call("inventory", "approval.decide", {
          id: r.requestId,
          decision: "approve",
          reason: "Attempt self approval",
        }),
      /permission|own|independent|authority/,
    );
    await approve(f, r.requestId);
    await f.call("owner", "approval.activate", { id: r.requestId });
    await f.call("inventory", "inventory.adjust", request);
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT quantity FROM inventory WHERE product_id='hose' AND branch_id='lagos'",
        ))!.quantity,
      ),
      8,
    );
    const stale = await f.call("inventory", "inventory.stocktake", {
      ...request,
      quantity: 7,
      reference: "STALE-STOCKTAKE",
    });
    await f.call("inventory", "inventory.receipt", {
      ...stock,
      quantity: 1,
      reference: "AFTER-COUNT-RECEIPT",
    });
    await approve(f, stale.requestId);
    assert.equal(
      (await one(f.db, "SELECT status FROM change_requests WHERE id=$1", [
        stale.requestId,
      ]))!.status,
      "failed",
    );
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT quantity FROM inventory WHERE product_id='hose' AND branch_id='lagos'",
        ))!.quantity,
      ),
      9,
    );
    await assert.rejects(
      () =>
        f.db.query(
          "UPDATE stock_movements SET quantity=999 WHERE reference=$1",
          [stock.reference],
        ),
      /append|immutable/i,
    );
    await assert.rejects(
      () =>
        f.db.query("DELETE FROM stock_receipts WHERE reference=$1", [
          stock.reference,
        ]),
      /append|immutable/i,
    );
    const taken = await f.call("inventory", "inventory.quarantine", {
      ...request,
      quantity: 2,
      reference: "PROTECTIVE-QUARANTINE",
    });
    assert.ok(taken.id);
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT quantity FROM inventory WHERE product_id='hose' AND branch_id='lagos'",
        ))!.quantity,
      ),
      7,
    );
    const snapshot = await f.call("inventory", "business.snapshot");
    assert.equal(snapshot.overview.heldUnits, 2);
    assert.equal(snapshot.finance.verifiedCompletedRevenueKobo, undefined);
    assert.ok(snapshot.alerts.length);
    const { inventoryExceptions } = await import(
      "../apps/web/lib/inventory-monitoring"
    );
    await f.db.transaction(inventoryExceptions);
    const incident = await one(
      f.db,
      "SELECT id FROM operational_incidents WHERE category='stocktake_variance'",
    );
    assert.ok(incident);
    await f.call("owner", "business.incident.assign", {
      id: incident!.id,
      reviewerId: f.users.manager.id,
      reason: "Assign qualified operational review of count evidence",
    });
    await f.call("owner", "incident.update", {
      id: incident!.id,
      status: "acknowledged",
      note: "Synthetic investigation preserves count and immutable evidence",
    });
    const countBefore = Number(
      (await one(f.db, "SELECT count(*) AS n FROM operational_incidents"))!.n,
    );
    await f.db.transaction(inventoryExceptions);
    assert.equal(
      Number(
        (await one(f.db, "SELECT count(*) AS n FROM operational_incidents"))!.n,
      ),
      countBefore,
    );

    await assert.rejects(
      () => f.call("manager", "business.snapshot", { branchId: "other" }),
      /another branch/,
    );
  } finally {
    await f.db.close?.();
  }
});
test("G,H,L,N,O: branch tampering, protected exports, suspended accounts and forged permissions fail closed", async () => {
  const f = await fixture();
  try {
    await f.db.query(
      "INSERT INTO branches(id,name) VALUES('other','Other isolated branch')",
    );
    for (const role of ["sales", "inventory", "manager"]) {
      await assert.rejects(
        () => f.call(role, "business.snapshot", { branchId: "other" }),
        /another branch/,
      );
      await assert.rejects(
        () => f.call(role, "business.report", { report: "profit" }),
        /permission/,
      );
      await assert.rejects(
        () =>
          f.call(role, "business.export", {
            report: "payments",
            branchId: "other",
            format: "csv",
          }),
        /another branch|permission/,
      );
    }
    await assert.rejects(() =>
      f.call("sales", "business.snapshot", { role: "owner" }),
    );
    await f.db.query("UPDATE users SET active=false WHERE id=$1", [
      f.users.manager.id,
    ]);
    await assert.rejects(
      () => f.call("manager", "business.snapshot"),
      /session|sign in/,
    );
    await assert.rejects(() =>
      f.call("sales", "setting.propose", {
        key: "staff.access",
        scope: "lagos",
        value: { userId: f.users.sales.id, role: "owner", branchId: "lagos" },
        version: 1,
        reason: "Attempt self promotion",
      }),
    );
    assert.equal(
      (await one(f.db, "SELECT role FROM users WHERE id=$1", [
        f.users.sales.id,
      ]))!.role,
      "sales",
    );
    assert.ok(
      Number(
        (await one(
          f.db,
          "SELECT count(*) AS n FROM audit_events WHERE outcome='denied'",
        ))!.n,
      ) > 0,
    );
  } finally {
    await f.db.close?.();
  }
});
test("I,J,P: expenses require independent approval, real payment evidence and append-only reversal", async () => {
  const f = await fixture();
  try {
    const expense = {
      branchId: "lagos",
      categoryId: "fuel",
      amountKobo: 500000,
      date: "2026-10-29",
      payee: "Synthetic QA fuel supplier",
      description: "Documented delivery vehicle fuel expense",
      method: "cash",
      evidence: "Synthetic receipt FUEL-001",
      reference: "EXPENSE-FUEL-001",
    };
    const e = await f.call("finance", "expense.create", expense),
      replay = await f.call("finance", "expense.create", {
        ...expense,
        reference: "EXPENSE-FUEL-002",
      });
    assert.equal(replay.id, e.id);
    await assert.rejects(
      () =>
        f.call("finance", "approval.decide", {
          id: e.requestId,
          decision: "approve",
          reason: "Self approved expense",
        }),
      /own|permission|independent|authority/,
    );
    await assert.rejects(
      () =>
        f.call("finance", "expense.record", {
          id: e.id,
          reference: "RECORD-BEFORE-APPROVAL",
          reason: "Attempt premature posting",
        }),
      /independently/,
    );
    await approve(f, e.requestId);
    await f.call("finance", "expense.record", {
      id: e.id,
      reference: "RECORDED-FUEL-001",
      reason: "Approved actual expense recording",
    });
    await assert.rejects(
      () =>
        f.call("finance", "expense.pay", {
          id: e.id,
          reference: "PAID-FUEL-001",
          reason: "Self payment verification attempt",
        }),
      /different finance/,
    );
    const payment = {
      id: e.id,
      reference: "PAID-FUEL-001",
      reason: "Independent review of actual signed cash receipt",
    };
    await f.call("owner", "expense.pay", payment);
    await f.call("owner", "expense.pay", payment);
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT count(*) AS n FROM expense_events WHERE expense_id=$1 AND kind='paid'",
          [e.id],
        ))!.n,
      ),
      1,
    );
    const before = await f.call("owner", "business.snapshot");
    assert.equal(before.finance.recordedExpensesKobo, 500000);
    assert.equal(before.finance.netProfitKobo, null);
    const reversal = await f.call("finance", "expense.reverse", {
      id: e.id,
      reference: "REVERSE-FUEL-001",
      reason: "Verified duplicate supplier charge was corrected",
    });
    await approve(f, reversal.requestId);
    await f.call("owner", "approval.activate", { id: reversal.requestId });
    assert.equal(
      (await one(f.db, "SELECT status FROM expenses WHERE id=$1", [e.id]))!
        .status,
      "reversed",
    );
    assert.equal(
      (await f.call("owner", "business.snapshot")).finance.recordedExpensesKobo,
      0,
    );
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT count(*) AS n FROM expense_events WHERE expense_id=$1",
          [e.id],
        ))!.n,
      ),
      3,
    );
    for (const report of [
      "expenses",
      "payments",
      "gas",
      "services",
      "valuation",
      "profit",
      "wallet",
      "loyalty",
      "audit",
    ]) {
      const r = await f.call("owner", "business.export", {
        report,
        format: "csv",
      });
      assert.ok(Array.isArray(r.rows));
    }
    assert.equal(
      Number(
        (await one(f.db, "SELECT count(*) AS n FROM verified_payments"))!.n,
      ),
      0,
    );
  } finally {
    await f.db.close?.();
  }
});
test("controlled transfers reserve, dispatch, partially receive and quarantine damage without duplicate effects", async () => {
  const f = await fixture();
  try {
    await f.call("inventory", "inventory.receipt", stock);
    await f.call("owner", "branch.create", {
      id: "destination",
      name: "Synthetic receiving branch",
    });
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT grams FROM gas_stock WHERE branch_id='destination'",
        ))!.grams,
      ),
      0,
    );
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT count(*) AS n FROM settings WHERE scope='destination' AND key LIKE 'inventory.operation.%'",
        ))!.n,
      ),
      0,
    );
    assert.equal(
      (await one(
        f.db,
        "SELECT value FROM settings WHERE scope='destination' AND key='inventory.valuation'",
      ))!.value,
      "unconfigured",
    );
    const uid = id();
    await f.db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,'Receiving fixture',$2,$3,'inventory','destination')",
      [uid, uid + "@example.test", hashPassword("Inventory-fixture-only-123!")],
    );
    f.users.receiver = { id: uid, token: await issueSession(f.db, uid) };
    await f.call("receiver", "reauth", {
      password: "Inventory-fixture-only-123!",
    });
    const t = await f.call("inventory", "transfer.create", {
      sourceBranch: "lagos",
      destinationBranch: "destination",
      productId: "hose",
      quantity: 6,
      reference: "TRANSFER-TEST-001",
      reason: "Synthetic branch replenishment request",
    });
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT reserved FROM inventory WHERE product_id='hose' AND branch_id='lagos'",
        ))!.reserved,
      ),
      0,
    );
    await approve(f, t.requestId);
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT reserved FROM inventory WHERE product_id='hose' AND branch_id='lagos'",
        ))!.reserved,
      ),
      6,
    );
    await f.call("inventory", "transfer.dispatch", {
      id: t.id,
      reason: "Synthetic dispatch count verified",
    });
    await f.call("inventory", "transfer.dispatch", {
      id: t.id,
      reason: "Synthetic dispatch count verified",
    });
    await assert.rejects(
      () =>
        f.call("inventory", "transfer.receive", {
          id: t.id,
          quantity: 3,
          reference: "BAD-CROSS-RECEIPT",
          reason: "Attempt source receiving",
        }),
      /another branch/,
    );
    const r = {
      id: t.id,
      quantity: 3,
      damaged: 1,
      reference: "TRANSFER-RECEIPT-001",
      reason: "Three eligible units and one damaged unit physically received",
    };
    await f.call("receiver", "transfer.receive", r);
    await f.call("receiver", "transfer.receive", r);
    assert.equal(
      (await one(f.db, "SELECT status FROM stock_transfers WHERE id=$1", [
        t.id,
      ]))!.status,
      "partial",
    );
    await f.call("receiver", "transfer.receive", {
      id: t.id,
      quantity: 2,
      reference: "TRANSFER-RECEIPT-002",
      reason: "Remaining good units physically verified",
    });
    const tr = await one(f.db, "SELECT * FROM stock_transfers WHERE id=$1", [
      t.id,
    ]);
    assert.equal(tr!.status, "discrepancy");
    assert.equal(Number(tr!.received_quantity), 5);
    assert.equal(Number(tr!.damaged_quantity), 1);
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT quantity FROM inventory WHERE product_id='hose' AND branch_id='destination'",
        ))!.quantity,
      ),
      5,
    );
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT quantity FROM inventory WHERE product_id='hose' AND branch_id='lagos'",
        ))!.quantity,
      ),
      4,
    );
    await assert.rejects(
      () =>
        f.call("receiver", "transfer.receive", {
          id: t.id,
          quantity: 1,
          reference: "TRANSFER-RECEIPT-003",
          reason: "Attempt excess receiving",
        }),
      /exceeds/,
    );
  } finally {
    await f.db.close?.();
  }
});
test("supplier purchases do not add stock; independently approved partial receipts cannot overreceive", async () => {
  const f = await fixture();
  try {
    const s = await f.call("inventory", "supplier.create", {
      branchId: "lagos",
      name: "Synthetic supplier",
      contact: "Fixture contact only",
    });
    const p = await f.call("inventory", "purchase.create", {
      supplierId: s.id,
      productId: "hose",
      quantity: 10,
      unitCostKobo: 10000,
      reference: "PARTIAL-PURCHASE-001",
    });
    const r = {
      ...stock,
      quantity: 4,
      supplierId: s.id,
      purchaseId: p.id,
      reference: "PARTIAL-INVOICE-001",
    };
    await assert.rejects(
      () => f.call("inventory", "inventory.receipt", r),
      /independently approved/,
    );
    await approve(f, p.requestId);
    await f.call("inventory", "inventory.receipt", r);
    await f.call("inventory", "inventory.receipt", r);
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT received_quantity FROM purchase_orders WHERE id=$1",
          [p.id],
        ))!.received_quantity,
      ),
      4,
    );
    await assert.rejects(
      () =>
        f.call("inventory", "inventory.receipt", {
          ...r,
          quantity: 7,
          reference: "PARTIAL-EXCESS-001",
        }),
      /exceeds/,
    );
    await f.call("inventory", "inventory.receipt", {
      ...r,
      quantity: 6,
      reference: "PARTIAL-INVOICE-002",
    });
    assert.equal(
      (await one(f.db, "SELECT status FROM purchase_orders WHERE id=$1", [
        p.id,
      ]))!.status,
      "received",
    );
    const operationalPurchases = await f.call("inventory", "purchasing");
    assert.equal("unit_cost_kobo" in operationalPurchases.orders[0], false);
    assert.equal(operationalPurchases.permissions.canApprove, false);
    const snapshot = await f.call("sales", "business.snapshot");
    assert.deepEqual(snapshot.receipts, []);
    assert.deepEqual(snapshot.purchases, []);
  } finally {
    await f.db.close?.();
  }
});
test("report availability schedules deduplicate, recheck roles and never claim external delivery", async () => {
  const f = await fixture();
  try {
    const r = await f.call("finance", "report.schedule", {
      branchId: "lagos",
      report: "expenses",
      frequency: "daily",
    });
    await f.db.query(
      "UPDATE report_schedules SET next_run=now()-interval '1 second' WHERE id=$1",
      [r.id],
    );
    const { runReportSchedules } = await import(
      "../apps/web/lib/business-reporting"
    );
    await f.db.transaction(runReportSchedules);
    await f.db.transaction(runReportSchedules);
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT count(*) AS n FROM report_deliveries WHERE schedule_id=$1",
          [r.id],
        ))!.n,
      ),
      1,
    );
    assert.equal(
      (await one(
        f.db,
        "SELECT status FROM report_deliveries WHERE schedule_id=$1",
        [r.id],
      ))!.status,
      "available_in_app",
    );
    const delivered = await one(
      f.db,
      "SELECT id FROM report_deliveries WHERE schedule_id=$1",
      [r.id],
    );
    assert.ok(
      Array.isArray(
        (await f.call("finance", "report.delivery", { id: delivered!.id }))
          .rows,
      ),
    );
    await assert.rejects(
      () => f.call("owner", "report.delivery", { id: delivered!.id }),
      /not found/,
    );
    await f.db.query("UPDATE users SET role='sales' WHERE id=$1", [
      f.users.finance.id,
    ]);
    await f.db.query(
      "UPDATE report_schedules SET next_run=now()-interval '2 seconds' WHERE id=$1",
      [r.id],
    );
    await f.db.transaction(runReportSchedules);
    assert.equal(
      (await one(f.db, "SELECT active FROM report_schedules WHERE id=$1", [
        r.id,
      ]))!.active,
      false,
    );
  } finally {
    await f.db.close?.();
  }
});
test("K: quarantine release requires current independently documented qualifications; failed qualifications do not change custody", async () => {
  const f = await fixture();
  try {
    const cid = id();
    await f.db.query(
      "INSERT INTO cylinders(id,branch_id,serial,size_kg,ownership,status,test_due) VALUES($1,'lagos',$2,6,'company','quarantined',CURRENT_DATE+30)",
      [cid, "QA-" + cid],
    );
    const inspection = {
      id: cid,
      passed: true,
      notes: "Synthetic documented successful inspection",
      nextDue: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    };
    await assert.rejects(
      () => f.call("inventory", "cylinder.inspect", inspection),
      /qualification/,
    );
    assert.equal(
      (await one(f.db, "SELECT status FROM cylinders WHERE id=$1", [cid]))!
        .status,
      "quarantined",
    );
    await f.call("owner", "technician.qualify", {
      userId: f.users.inventory.id,
      code: "cylinder_inspection",
      evidence: "Synthetic independently reviewed inspector credential",
      expiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
    });
    await f.call("inventory", "cylinder.inspect", inspection);
    assert.equal(
      (await one(f.db, "SELECT status FROM cylinders WHERE id=$1", [cid]))!
        .status,
      "empty",
    );
    await f.call("inventory", "inventory.receipt", stock);
    const held = await f.call("inventory", "inventory.quarantine", {
      branchId: "lagos",
      productId: "hose",
      quantity: 2,
      reference: "HELD-SAFETY-001",
      reason: "Physical damage investigated",
      evidence: "Synthetic condition evidence",
    });
    const release = {
      branchId: "lagos",
      productId: "hose",
      quantity: 1,
      holdId: held.id,
      reference: "RELEASE-SAFETY-001",
      reason: "Qualified documented condition checks",
      evidence: "Synthetic postrepair condition report",
    };
    await assert.rejects(
      () => f.call("inventory", "inventory.release", release),
      /qualification/,
    );
    await f.call("owner", "technician.qualify", {
      userId: f.users.inventory.id,
      code: "inventory_safety",
      evidence: "Synthetic independently checked stock safety qualification",
      expiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
    });
    const r = await f.call("inventory", "inventory.release", release);
    await approve(f, r.requestId);
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT quantity FROM inventory WHERE branch_id='lagos' AND product_id='hose'",
        ))!.quantity,
      ),
      9,
    );
  } finally {
    await f.db.close?.();
  }
});
test("valuation uses an approved method and complete acquisition movements, never selling prices", async () => {
  const f = await fixture();
  try {
    await f.call("inventory", "inventory.receipt", stock);
    assert.equal(
      (await f.call("owner", "business.snapshot")).finance.inventoryValueKobo,
      null,
    );
    const r = await f.call("finance", "setting.propose", {
      key: "inventory.valuation",
      scope: "lagos",
      value: "weighted_average",
      version: 1,
      reason: "Synthetic finance valuation method review",
    });
    await approve(f, r.id);
    const s = await f.call("owner", "business.snapshot"),
      hose = s.valuation.rows.find((r: any) => r.product_id === "hose");
    assert.equal(hose.value_kobo, 100000);
    await f.call("inventory", "inventory.receipt", {
      ...stock,
      quantity: 10,
      unitCostKobo: 20000,
      reference: "SECOND-COST-BATCH",
    });
    const s2 = await f.call("owner", "business.snapshot");
    assert.equal(
      s2.valuation.rows.find((r: any) => r.product_id === "hose").value_kobo,
      300000,
    );
    await f.call("inventory", "inventory.receive", {
      productId: "hose",
      branchId: "lagos",
      quantity: 1,
      reference: "LEGACY-UNCOSTED-RECEIPT",
      reason: "Synthetic receipt with missing acquisition cost",
    });
    assert.equal(
      (await f.call("owner", "business.snapshot")).valuation.rows.find(
        (r: any) => r.product_id === "hose",
      ).value_kobo,
      null,
    );
  } finally {
    await f.db.close?.();
  }
});
test("E: competing corrections cannot apply stale snapshots or lose updates in serialized PGlite", async () => {
  const f = await fixture();
  try {
    await f.call("inventory", "inventory.receipt", stock);
    const requests = await Promise.all(
      [1, 2].map((i) =>
        f.call("inventory", "inventory.adjust", {
          branchId: "lagos",
          productId: "hose",
          quantity: -6,
          reference: "COMPETING-STOCK-" + i,
          reason: "Synthetic competing physical correction",
          evidence: "Independent fixture count sheet",
        }),
      ),
    );
    await Promise.all(requests.map((r) => approve(f, r.requestId)));
    const statuses = (
      await f.db.query(
        "SELECT status FROM change_requests WHERE id=ANY($1::text[])",
        [requests.map((r) => r.requestId)],
      )
    ).rows.map((r) => r.status);
    assert.deepEqual(statuses.sort(), ["active", "failed"]);
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT quantity FROM inventory WHERE branch_id='lagos' AND product_id='hose'",
        ))!.quantity,
      ),
      4,
    );
  } finally {
    await f.db.close?.();
  }
});
test("stocktake sessions snapshot categories, generate scoped count sheets, reconcile all counts and reject intervening movements", async () => {
  const f = await fixture();
  try {
    await f.call("inventory", "inventory.receipt", stock);
    const session = await f.call("inventory", "inventory.stocktake.create", {
      branchId: "lagos",
      reference: "COUNT-SHEET-TEST-001",
      reason: "Synthetic periodic physical count",
      category: "Accessories",
      includeGas: false,
    });
    const current = (
      await f.call("inventory", "business.snapshot")
    ).stocktakes.find((s: any) => s.id === session.id);
    assert.ok(current.snapshot.length >= 2);
    const sheet = await f.call("inventory", "inventory.stocktake.sheet", {
      id: session.id,
    });
    assert.ok(sheet.rows.every((r: any) => r.actual_count === ""));
    const counts = current.snapshot.map((r: any) => ({
      productId: r.productId,
      gas: r.gas,
      counted: r.productId === "hose" ? 9 : r.quantity,
      reason: "Verified physical count variance",
      evidence: "Synthetic signed count sheet",
    }));
    await f.call("inventory", "inventory.stocktake.submit", {
      id: session.id,
      counts,
    });
    await f.call("inventory", "inventory.stocktake.submit", {
      id: session.id,
      counts,
    });
    const op = await one(
      f.db,
      "SELECT request_id FROM inventory_operations WHERE payload->>'stocktakeId'=$1",
      [session.id],
    );
    await approve(f, op!.request_id);
    assert.equal(
      (await one(f.db, "SELECT status FROM stocktakes WHERE id=$1", [
        session.id,
      ]))!.status,
      "closed",
    );
    const report = await f.call("inventory", "business.report", {
      report: "stocktakes",
    });
    assert.equal(
      Number(report.rows.find((r: any) => r.product_id === "hose").counted),
      9,
    );
    assert.equal(
      Number(
        report.rows.find((r: any) => r.product_id === "regulator").counted,
      ),
      0,
    );
    const completed = (
      await f.call("inventory", "business.snapshot")
    ).stocktakes.find((s: any) => s.id === session.id);
    assert.equal(completed.counts.length, current.snapshot.length);
    const second = await f.call("inventory", "inventory.stocktake.create", {
      branchId: "lagos",
      reference: "COUNT-SHEET-TEST-002",
      reason: "Synthetic stale count session",
      category: "Accessories",
      includeGas: false,
    });
    const snap = (
      await f.call("inventory", "business.snapshot")
    ).stocktakes.find((s: any) => s.id === second.id);
    await f.call("inventory", "inventory.receipt", {
      ...stock,
      quantity: 1,
      reference: "MOVEMENT-DURING-COUNT",
    });
    await assert.rejects(
      () =>
        f.call("inventory", "inventory.stocktake.submit", {
          id: second.id,
          counts: snap.snapshot.map((r: any) => ({
            productId: r.productId,
            gas: r.gas,
            counted: r.quantity,
            reason: "Synthetic counted stock",
            evidence: "Fixture count evidence",
          })),
        }),
      /Stock moved/,
    );
    await assert.rejects(
      () => f.call("sales", "inventory.stocktake.sheet", { id: session.id }),
      /permission/,
    );
  } finally {
    await f.db.close?.();
  }
});
