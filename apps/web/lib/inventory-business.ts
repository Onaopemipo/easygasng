import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import { one, type SQL, type Row } from "./db";
import {
  allow,
  recentVerification,
  AppError,
  id,
  digest,
  type Actor,
} from "./auth";
import { propose, decide, audit, ownerAutoApprovalEnabled, autoApproveOwnerRequest } from "./governance";
import { grams } from "../../../packages/business-rules/src/gas-pricing";
import { applyBulkRecovery } from "./bulk-lpg-recovery";
const reason = z.string().trim().min(5).max(1000),
  reference = z.string().trim().min(5).max(100),
  branch = z.string().min(1).max(100);
const amount = z.number().int().positive().max(10000000000);
const item = {
  productId: z.string().min(1).max(100).optional(),
  gas: z.boolean().default(false),
};
const writers = ["owner", "manager", "inventory"];
export function validateInventoryValue(d: Row, value: unknown) {
  if (d.value_type === "inventory_operation")
    z.object({ operationId: z.string().uuid() }).strict().parse(value);
  if (d.value_type === "inventory_valuation")
    z.enum(["unconfigured", "weighted_average"]).parse(value);
}
async function activeBranch(tx: SQL, b: string) {
  if (
    !(await one(
      tx,
      "SELECT id FROM branches WHERE id=$1 AND active=true FOR UPDATE",
      [b],
    ))
  )
    throw new AppError(409, "Choose an active branch.");
}
async function product(tx: SQL, gas: boolean, p?: string) {
  if (gas) {
    if (p)
      throw new AppError(400, "Bulk gas has no physical product identifier.");
    return;
  }
  const r = await one(
    tx,
    "SELECT * FROM products WHERE id=$1 AND archived=false",
    [p],
  );
  if (!r || r.category === "Gas refills")
    throw new AppError(
      400,
      "Choose a physical product; bulk gas uses kilograms.",
    );
  return r;
}
function quantity(gas: boolean, q: number) {
  if (!Number.isFinite(q) || q <= 0)
    throw new AppError(400, "Enter a positive quantity.");
  const n = gas ? grams(q) : q;
  if (!Number.isSafeInteger(n) || n > 1000000000)
    throw new AppError(
      400,
      "Use whole physical units or gas with at most three decimal places.",
    );
  return n;
}
export async function inventoryQualification(
  tx: SQL,
  userId: string,
  b: string,
  code: string,
) {
  const q = await one(
    tx,
    "SELECT q.id FROM technician_qualifications q JOIN users u ON u.id=q.user_id JOIN users v ON v.id=q.verified_by WHERE q.user_id=$1 AND q.code=$2 AND q.expires_at>now() AND u.active=true AND (u.role='owner' OR u.branch_id=$3) AND v.active=true AND v.role IN ('owner','safety_officer') AND (v.role='owner' OR v.branch_id=$3) AND q.user_id<>q.verified_by",
    [userId, code, b],
  );
  if (!q)
    throw new AppError(
      403,
      "A current independently verified " +
        code +
        " qualification is required.",
    );
}
export async function stockBalance(
  tx: SQL,
  b: string,
  gas: boolean,
  p?: string,
  lock = false,
) {
  const r = await one(
    tx,
    gas
      ? `SELECT grams AS quantity,reserved_grams AS reserved FROM gas_stock WHERE branch_id=$1 ${lock ? "FOR UPDATE" : ""}`
      : `SELECT quantity,reserved FROM inventory WHERE branch_id=$1 AND product_id=$2 ${lock ? "FOR UPDATE" : ""}`,
    gas ? [b] : [b, p],
  );
  if (!r) throw new AppError(404, "Stock record not found.");
  return { quantity: Number(r.quantity), reserved: Number(r.reserved) };
}
export async function moveStock(
  tx: SQL,
  user: Actor,
  b: string,
  gas: boolean,
  p: string | undefined,
  n: number,
  kind: string,
  ref: string,
  why: string,
) {
  const updated = await one(
    tx,
    gas
      ? "UPDATE gas_stock SET grams=grams+$1 WHERE branch_id=$2 AND grams+$1>=reserved_grams RETURNING branch_id"
      : "UPDATE inventory SET quantity=quantity+$1 WHERE branch_id=$2 AND product_id=$3 AND quantity+$1>=reserved RETURNING branch_id",
    gas ? [n, b] : [n, b, p],
  );
  if (!updated)
    throw new AppError(
      409,
      "Insufficient unreserved stock; reload and review.",
    );
  await tx.query(
    gas
      ? "INSERT INTO gas_stock_movements(id,branch_id,grams,kind,reference,actor_id,reason) VALUES($1,$2,$3,$4,$5,$6,$7)"
      : "INSERT INTO stock_movements(id,branch_id,product_id,quantity,kind,reference,actor_id,reason) VALUES($1,$2,$8,$3,$4,$5,$6,$7)",
    gas
      ? [id(), b, n, kind, ref, user.id, why]
      : [id(), b, n, kind, ref, user.id, why, p],
  );
}
export async function requestOperation(
  tx: SQL,
  user: Actor,
  kind: string,
  b: string,
  payload: Row,
  ref: string,
  why: string,
  draft = false,
) {
  // Serialize references across branches before creating request metadata.
  await tx.query("SELECT id FROM branches ORDER BY id FOR UPDATE");
  const existing = await one(
    tx,
    "SELECT * FROM inventory_operations WHERE reference=$1",
    [ref],
  );
  if (existing) {
    allow(
      user,
      kind.startsWith("expense") ? ["owner", "finance"] : writers,
      existing.branch_id,
    );
    if (
      existing.requested_by !== user.id ||
      !isDeepStrictEqual(existing.payload, payload) ||
      existing.kind !== kind ||
      existing.branch_id !== b
    )
      throw new AppError(
        409,
        "This operation reference already has different details.",
      );
    return { id: existing.id, requestId: existing.request_id, duplicate: true };
  }
  const oid = id(),
    key = "inventory.operation." + oid;
  const finance = kind.startsWith("expense"),
    roles = finance
      ? ["owner", "finance"]
      : kind === "purchase"
        ? ["owner", "manager", "inventory"]
        : writers;
  // Conservative owner-only independent approval. No financial/quantity limits are invented.
  await tx.query(
    "INSERT INTO setting_definitions(key,label,category,description,owner_role,risk,value_type,propose_roles,approve_roles,view_roles,required_roles,additional_verification) VALUES($1,$2,$3,$4,'owner',3,'inventory_operation',$5,'[\"owner\"]',$6,'[]',true)",
    [
      key,
      kind + " · " + ref,
      finance ? "Finance Operations" : "Inventory Operations",
      "One-time independently approved business operation; payload/evidence retained in protected operation metadata.",
      JSON.stringify(roles),
      JSON.stringify([...new Set([...roles, "owner"])]),
    ],
  );
  await tx.query("INSERT INTO settings(key,scope,value) VALUES($1,$2,'null')", [
    key,
    b,
  ]);
  await tx.query(
    "INSERT INTO inventory_operations(id,branch_id,kind,reference,payload,requested_by) VALUES($1,$2,$3,$4,$5,$6)",
    [oid, b, kind, ref, JSON.stringify(payload), user.id],
  );
  let req = await propose(tx, user, {
    key,
    scope: b,
    value: { operationId: oid },
    version: 1,
    reason: why,
    draft,
  }, { deferOwnerActivation: true });
  await tx.query("UPDATE inventory_operations SET request_id=$1 WHERE id=$2", [
    req.id,
    oid,
  ]);
  if (!draft && ownerAutoApprovalEnabled() && user.role === "owner")
    req = await autoApproveOwnerRequest(tx, user, req.id) as typeof req;
  await audit(tx, user, "inventory.operation_requested", oid, "success", {
    kind,
    branch: b,
    reference: ref,
    requestId: req.id,
    role: user.role,
  });
  return {
    id: oid,
    requestId: req.id,
    state: req.state,
    message: draft
      ? "Draft saved. Submit it in the Approval Centre."
      : req.state === "ACTIVE" ? "Automatically approved and applied under Business Owner authority."
      : req.state === "FAILED" ? "Owner-approved, but activation is blocked. Review the cause in the Approval Centre; no partial stock or money change was applied."
      : "Submitted for independent owner approval. Stock and money are unchanged.",
  };
}
export async function applyInventoryOperation(tx: SQL, user: Actor, r: Row) {
  if (!r.key.startsWith("inventory.operation.")) return;
  const op = await one(
    tx,
    "SELECT * FROM inventory_operations WHERE id=$1 FOR UPDATE",
    [r.proposed_value.operationId],
  );
  if (
    !op ||
    op.request_id !== r.id ||
    op.branch_id !== r.scope ||
    r.key !== "inventory.operation." + op.id ||
    r.rollback_of
  )
    throw new AppError(
      409,
      "This approval does not match its one-time business operation.",
    );
  if (op.applied_at)
    throw new AppError(409, "This operation was already applied.");
  const p = op.payload,
    b = op.branch_id;
  if (op.kind === "bulk_return_recovery") {
    await applyBulkRecovery(tx, user, op);
  } else if (
    ["adjustment", "stocktake", "quarantine", "return_release"].includes(
      op.kind,
    )
  ) {
    await product(tx, p.gas, p.productId);
    const current = await stockBalance(tx, b, p.gas, p.productId, true);
    if (current.quantity !== p.before || current.reserved !== p.reserved)
      throw new AppError(
        409,
        "Stock changed since the count/request. Submit a new verified request.",
      );
    if (op.kind === "return_release") {
      await inventoryQualification(tx, op.requested_by, b, "inventory_safety");
      const hold = await one(
        tx,
        "SELECT * FROM stock_holds WHERE id=$1 FOR UPDATE",
        [p.holdId],
      );
      if (
        !hold ||
        hold.branch_id !== b ||
        hold.gas !== p.gas ||
        hold.product_id !== (p.productId ?? null) ||
        Number(hold.quantity) - Number(hold.released) < p.delta
      )
        throw new AppError(
          409,
          "Returned stock is no longer available for release.",
        );
      // Serialized cylinders must always use documented inspection/custody, never generic release.
      const pr = await product(tx, p.gas, p.productId);
      if (pr?.asset === "cylinder")
        throw new AppError(
          409,
          "Use the qualified serialized cylinder inspection workflow.",
        );
      await tx.query(
        "UPDATE stock_holds SET released=released+$1 WHERE id=$2",
        [p.delta, hold.id],
      );
    }
    await moveStock(
      tx,
      user,
      b,
      p.gas,
      p.productId,
      p.delta,
      op.kind === "quarantine"
        ? "quarantine"
        : op.kind === "return_release"
          ? "return_release"
          : "adjustment",
      "operation:" + op.id,
      p.reason,
    );
    if (op.kind === "quarantine")
      await tx.query(
        "INSERT INTO stock_holds(id,branch_id,product_id,gas,quantity,kind,reference,reason,evidence,actor_id) VALUES($1,$2,$3,$4,$5,'quarantine',$6,$7,$8,$9)",
        [
          id(),
          b,
          p.productId ?? null,
          p.gas,
          -p.delta,
          "quarantine:" + op.id,
          p.reason,
          p.evidence,
          user.id,
        ],
      );
  }
  if (op.kind === "hold_disposition") {
    const hold = await one(
      tx,
      "SELECT * FROM stock_holds WHERE id=$1 FOR UPDATE",
      [p.holdId],
    );
    if (
      !hold ||
      hold.branch_id !== b ||
      Number(hold.quantity) - Number(hold.released) < p.quantity
    )
      throw new AppError(
        409,
        "Held stock is no longer available for this disposition.",
      );
    const pr = await product(tx, hold.gas, hold.product_id ?? undefined);
    if (pr?.asset === "cylinder")
      throw new AppError(
        409,
        "Serialized cylinders require the custody return procedure.",
      );
    await tx.query("UPDATE stock_holds SET released=released+$1 WHERE id=$2", [
      p.quantity,
      hold.id,
    ]);
    await moveStock(
      tx,
      user,
      b,
      hold.gas,
      hold.product_id ?? undefined,
      0,
      hold.gas ? "adjustment" : p.disposition,
      "disposition:" + op.id,
      p.reason,
    );
  }
  if (op.kind === "threshold") {
    if (p.gas)
      await tx.query(
        "UPDATE gas_stock SET threshold_grams=$1 WHERE branch_id=$2",
        [p.threshold, b],
      );
    else
      await tx.query(
        "UPDATE inventory SET threshold=$1 WHERE branch_id=$2 AND product_id=$3",
        [p.threshold, b, p.productId],
      );
  }
  if (op.kind === "purchase") {
    const po = await one(
      tx,
      "SELECT * FROM purchase_orders WHERE id=$1 AND status='draft' FOR UPDATE",
      [p.purchaseId],
    );
    if (!po || po.branch_id !== b)
      throw new AppError(409, "Purchase is no longer eligible.");
    await tx.query(
      "UPDATE purchase_orders SET status='approved',approved_by=$1 WHERE id=$2",
      [user.id, po.id],
    );
  }
  if (op.kind === "transfer") {
    const t = await one(
      tx,
      "SELECT * FROM stock_transfers WHERE id=$1 AND status='requested' FOR UPDATE",
      [p.transferId],
    );
    if (!t) throw new AppError(409, "Transfer is no longer eligible.");
    await tx.query(
      "SELECT id FROM branches WHERE id IN ($1,$2) AND active=true ORDER BY id FOR UPDATE",
      [t.source_branch, t.destination_branch],
    );
    if (
      !(await one(tx, "SELECT id FROM branches WHERE id=$1 AND active=true", [
        t.destination_branch,
      ]))
    )
      throw new AppError(409, "Destination branch is inactive.");
    const c = await stockBalance(tx, b, t.gas, t.product_id, true);
    if (c.quantity - c.reserved < t.quantity)
      throw new AppError(409, "Insufficient unreserved source stock.");
    await tx.query(
      t.gas
        ? "UPDATE gas_stock SET reserved_grams=reserved_grams+$1 WHERE branch_id=$2"
        : "UPDATE inventory SET reserved=reserved+$1 WHERE branch_id=$2 AND product_id=$3",
      t.gas ? [t.quantity, b] : [t.quantity, b, t.product_id],
    );
    await tx.query("UPDATE stock_transfers SET status='reserved' WHERE id=$1", [
      t.id,
    ]);
  }
  if (op.kind === "expense") {
    const e = await one(
      tx,
      "SELECT * FROM expenses WHERE id=$1 AND status IN ('draft','pending_approval') FOR UPDATE",
      [p.expenseId],
    );
    if (!e || e.branch_id !== b)
      throw new AppError(409, "Expense is no longer eligible.");
    await tx.query("UPDATE expenses SET status='approved' WHERE id=$1", [e.id]);
  }
  if (op.kind === "expense_reversal") {
    const e = await one(tx, "SELECT * FROM expenses WHERE id=$1 FOR UPDATE", [
      p.expenseId,
    ]);
    if (!e || !["recorded", "paid"].includes(e.status))
      throw new AppError(409, "Only a recorded expense can be reversed.");
    await tx.query(
      "INSERT INTO expense_events(id,expense_id,kind,amount_kobo,reference,actor_id,reason) VALUES($1,$2,'reversed',$3,$4,$5,$6)",
      [id(), e.id, e.amount_kobo, "reversal:" + op.id, user.id, p.reason],
    );
    await tx.query("UPDATE expenses SET status='reversed' WHERE id=$1", [e.id]);
  }
  await tx.query(
    "UPDATE inventory_operations SET applied_at=now() WHERE id=$1",
    [op.id],
  );
  if (p.stocktakeId)
    await tx.query(
      "UPDATE stocktakes SET status='closed' WHERE id=$1 AND status='submitted' AND NOT EXISTS(SELECT 1 FROM stocktake_counts c JOIN inventory_operations o ON o.id=c.operation_id WHERE c.stocktake_id=$1 AND o.applied_at IS NULL)",
      [p.stocktakeId],
    );
  await audit(tx, user, "inventory.operation_applied", op.id, "success", {
    kind: op.kind,
    branch: b,
    requestId: r.id,
    reference: op.reference,
    role: user.role,
    before: p.before,
    delta: p.delta,
    after: p.before === undefined ? undefined : p.before + p.delta,
    reason: r.reason,
  });
}
async function receipt(tx: SQL, user: Actor, d: any) {
  allow(user, writers, d.branchId);
  await activeBranch(tx, d.branchId);
  await product(tx, d.gas, d.productId);
  const q = quantity(d.gas, d.quantity);
  const old = await one(tx, "SELECT * FROM stock_receipts WHERE reference=$1", [
    d.reference,
  ]);
  if (old) {
    if (
      old.branch_id !== d.branchId ||
      old.product_id !== (d.productId ?? null) ||
      old.gas !== d.gas ||
      Number(old.quantity) !== q ||
      Number(old.unit_cost_kobo ?? -1) !== (d.unitCostKobo ?? -1) ||
      old.purchase_id !== (d.purchaseId ?? null) ||
      old.supplier_id !== (d.supplierId ?? null)
    )
      throw new AppError(409, "Receipt reference has different details.");
    return { id: old.id, duplicate: true };
  }
  if (d.supplierId) {
    const s = await one(
      tx,
      "SELECT * FROM suppliers WHERE id=$1 AND branch_id=$2 AND active=true",
      [d.supplierId, d.branchId],
    );
    if (!s)
      throw new AppError(400, "Choose an active supplier in this branch.");
  }
  if (d.purchaseId) {
    const po = await one(
      tx,
      "SELECT * FROM purchase_orders WHERE id=$1 FOR UPDATE",
      [d.purchaseId],
    );
    const auth = po
      ? await one(tx, "SELECT active,role,branch_id FROM users WHERE id=$1", [
          po.approved_by,
        ])
      : null;
    const req = po?.approval_request_id
      ? await one(tx, "SELECT status FROM change_requests WHERE id=$1", [
          po.approval_request_id,
        ])
      : null;
    if (
      !po ||
      po.branch_id !== d.branchId ||
      po.gas !== d.gas ||
      po.product_id !== (d.productId ?? null) ||
      po.supplier_id !== d.supplierId ||
      !["approved", "received"].includes(po.status) ||
      !auth?.active ||
      !["owner", "manager", "finance"].includes(auth.role) ||
      (auth.role !== "owner" && auth.branch_id !== po.branch_id) ||
      (req && req.status !== "active") ||
      Number(po.unit_cost_kobo) !== d.unitCostKobo
    )
      throw new AppError(
        409,
        "Receive only an independently approved matching purchase with current approver authority.",
      );
    if (Number(po.received_quantity) + q > Number(po.quantity))
      throw new AppError(
        409,
        "Receipt exceeds the remaining approved purchase quantity.",
      );
    await tx.query(
      "UPDATE purchase_orders SET received_quantity=received_quantity+$1,status=CASE WHEN received_quantity+$1=quantity THEN 'received' ELSE 'approved' END,received_by=$2,invoice_reference=$3 WHERE id=$4",
      [q, user.id, d.reference, po.id],
    );
  }
  if (d.receivingPassed !== true)
    throw new AppError(
      409,
      "Receiving checks must pass; record rejected stock as a quarantined return.",
    );
  if (d.gas)
    await tx.query(
      "INSERT INTO gas_stock(branch_id) VALUES($1) ON CONFLICT DO NOTHING",
      [d.branchId],
    );
  await stockBalance(tx, d.branchId, d.gas, d.productId, true);
  await moveStock(
    tx,
    user,
    d.branchId,
    d.gas,
    d.productId,
    q,
    "received",
    d.reference,
    d.reason,
  );
  const rid = id();
  await tx.query(
    "INSERT INTO stock_receipts(id,branch_id,product_id,gas,quantity,unit_cost_kobo,supplier_id,purchase_id,reference,reason,evidence,received_date,actor_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)",
    [
      rid,
      d.branchId,
      d.productId ?? null,
      d.gas,
      q,
      d.unitCostKobo ?? null,
      d.supplierId ?? null,
      d.purchaseId ?? null,
      d.reference,
      d.reason,
      d.evidence,
      d.receivedDate,
      user.id,
    ],
  );
  await audit(tx, user, "inventory.received", rid, "success", {
    branch: d.branchId,
    quantity: q,
    unit: d.gas ? "grams" : "units",
    reference: d.reference,
    role: user.role,
  });
  return {
    id: rid,
    message:
      "Verified receipt recorded once. Serialised cylinders still require eligibility and custody checks.",
  };
}
export async function inventoryBusiness(
  tx: SQL,
  action: string,
  user: Actor,
  input: unknown,
): Promise<any> {
  if (action === "inventory.stocktake.create") {
    const d = z
      .object({
        branchId: branch,
        reference,
        reason,
        category: z.string().min(1).max(100).optional(),
        includeGas: z.boolean().default(true),
      })
      .strict()
      .parse(input);
    allow(user, writers, d.branchId);
    await activeBranch(tx, d.branchId);
    const previous = await one(
      tx,
      "SELECT * FROM stocktakes WHERE reference=$1",
      [d.reference],
    );
    if (previous) {
      if (
        previous.branch_id !== d.branchId ||
        previous.created_by !== user.id ||
        previous.reason !== d.reason
      )
        throw new AppError(409, "Stocktake reference already exists.");
      return previous;
    }
    const rows = (
      await tx.query(
        "SELECT p.id AS productId,p.name,false AS gas,i.quantity,i.reserved FROM inventory i JOIN products p ON p.id=i.product_id WHERE i.branch_id=$1 AND p.category<>'Gas refills' AND p.archived=false AND ($2::text IS NULL OR p.category=$2) ORDER BY p.id FOR UPDATE OF i",
        [d.branchId, d.category ?? null],
      )
    ).rows.map((r) => ({
      productId: r.productid,
      name: r.name,
      gas: false,
      quantity: Number(r.quantity),
      reserved: Number(r.reserved),
    }));
    if (d.includeGas) {
      const g = await stockBalance(tx, d.branchId, true, undefined, true);
      rows.push({
        productId: undefined,
        name: "Bulk gas",
        gas: true,
        quantity: g.quantity,
        reserved: g.reserved,
      });
    }
    if (!rows.length)
      throw new AppError(400, "No stock records match this count.");
    const sid = id();
    await tx.query(
      "INSERT INTO stocktakes(id,branch_id,reference,reason,snapshot,created_by) VALUES($1,$2,$3,$4,$5,$6)",
      [sid, d.branchId, d.reference, d.reason, JSON.stringify(rows), user.id],
    );
    await audit(tx, user, "inventory.stocktake_created", sid, "success", {
      branch: d.branchId,
      reference: d.reference,
      lines: rows.length,
    });
    return {
      id: sid,
      message:
        "Count session created. Use its count sheet and record every selected item.",
    };
  }
  if (action === "inventory.stocktake.sheet") {
    const d = z.object({ id: z.string().uuid() }).strict().parse(input),
      s = await one(tx, "SELECT * FROM stocktakes WHERE id=$1", [d.id]);
    if (!s) throw new AppError(404, "Stocktake not found.");
    allow(user, writers, s.branch_id);
    await audit(tx, user, "inventory.count_sheet_exported", s.id, "success", {
      branch: s.branch_id,
    });
    return {
      rows: s.snapshot.map((r: any) => ({
        product: r.name,
        sku: r.productId ?? "bulk-gas",
        unit: r.gas ? "kg" : "units",
        recorded: r.quantity / (r.gas ? 1000 : 1),
        actual_count: "",
        notes: "",
      })),
      reference: s.reference,
    };
  }
  if (action === "inventory.stocktake.submit") {
    const d = z
        .object({
          id: z.string().uuid(),
          counts: z
            .array(
              z
                .object({
                  ...item,
                  counted: z.number().min(0),
                  reason,
                  evidence: reason,
                })
                .strict(),
            )
            .min(1)
            .max(1000),
        })
        .strict()
        .parse(input),
      s = await one(tx, "SELECT * FROM stocktakes WHERE id=$1 FOR UPDATE", [
        d.id,
      ]);
    if (!s) throw new AppError(404, "Stocktake not found.");
    allow(user, writers, s.branch_id);
    recentVerification(user);
    await activeBranch(tx, s.branch_id);
    const hash = digest(JSON.stringify(d.counts));
    if (s.status !== "open") {
      if (s.counts_hash !== hash)
        throw new AppError(
          409,
          "This stocktake already has different submitted counts.",
        );
      return { id: s.id, duplicate: true };
    }
    if (d.counts.length !== s.snapshot.length)
      throw new AppError(400, "Count every selected stock item exactly once.");
    const used = new Set<string>();
    let variances = 0;
    for (const count of d.counts) {
      const key = count.gas ? "__gas" : count.productId;
      if (!key || used.has(key))
        throw new AppError(400, "Each stock item must be counted once.");
      used.add(key);
      const original = s.snapshot.find(
        (r: any) => r.gas === count.gas && r.productId === count.productId,
      );
      if (!original)
        throw new AppError(400, "This item is outside the stocktake scope.");
      const c = await stockBalance(
        tx,
        s.branch_id,
        count.gas,
        count.productId,
        true,
      );
      if (c.quantity !== original.quantity || c.reserved !== original.reserved)
        throw new AppError(
          409,
          "Stock moved during counting. Create a new count session or reconcile the intervening movements.",
        );
      const counted =
          count.counted === 0 ? 0 : quantity(count.gas, count.counted),
        delta = counted - c.quantity;
      if (counted < c.reserved)
        throw new AppError(
          409,
          "Count is below active reservations. Resolve the original reservations before submitting.",
        );
      let oid = null;
      if (delta) {
        const r = await requestOperation(
          tx,
          user,
          "stocktake",
          s.branch_id,
          {
            stocktakeId: s.id,
            gas: count.gas,
            productId: count.productId ?? null,
            before: c.quantity,
            reserved: c.reserved,
            delta,
            reason: count.reason,
            evidence: count.evidence,
          },
          "stocktake:" + s.id + ":" + key,
          count.reason,
        );
        oid = r.id;
        variances++;
      }
      await tx.query(
        "INSERT INTO stocktake_counts(id,stocktake_id,product_id,gas,expected,counted,reason,evidence,operation_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
        [
          id(),
          s.id,
          count.productId ?? null,
          count.gas,
          c.quantity,
          counted,
          count.reason,
          count.evidence,
          oid,
        ],
      );
    }
    await tx.query(
      "UPDATE stocktakes SET status=$1,counts_hash=$2 WHERE id=$3",
      [variances ? "submitted" : "closed", hash, s.id],
    );
    await audit(tx, user, "inventory.stocktake_submitted", s.id, "success", {
      branch: s.branch_id,
      variances,
    });
    return {
      id: s.id,
      message:
        variances +
        " variance request(s) submitted for independent owner approval.",
    };
  }
  if (action === "inventory.receipt")
    return receipt(
      tx,
      user,
      z
        .object({
          branchId: branch,
          ...item,
          quantity: z.number().positive(),
          unitCostKobo: z.number().int().min(0).max(1000000000).optional(),
          supplierId: z.string().uuid().optional(),
          purchaseId: z.string().uuid().optional(),
          reference,
          reason,
          evidence: reason,
          receivedDate: z.iso.date(),
          receivingPassed: z.boolean(),
        })
        .strict()
        .parse(input),
    );
  if (
    [
      "inventory.adjust",
      "inventory.stocktake",
      "inventory.quarantine",
      "inventory.threshold",
      "inventory.release",
    ].includes(action)
  ) {
    const d = z
      .object({
        branchId: branch,
        ...item,
        quantity: z.number().optional(),
        reason,
        evidence: reason,
        reference,
        holdId: z.string().uuid().optional(),
        draft: z.boolean().default(false),
      })
      .strict()
      .parse(input);
    allow(user, writers, d.branchId);
    recentVerification(user);
    await activeBranch(tx, d.branchId);
    await product(tx, d.gas, d.productId);
    if (action === "inventory.quarantine") {
      const old = await one(
        tx,
        "SELECT * FROM stock_holds WHERE reference=$1",
        [d.reference],
      );
      if (old) {
        const requested =
          d.quantity === undefined
            ? NaN
            : quantity(d.gas, Math.abs(d.quantity));
        if (
          old.branch_id !== d.branchId ||
          old.product_id !== (d.productId ?? null) ||
          old.gas !== d.gas ||
          Number(old.quantity) !== requested ||
          old.reason !== d.reason ||
          old.evidence !== d.evidence
        )
          throw new AppError(
            409,
            "Quarantine reference has different details.",
          );
        return { id: old.id, duplicate: true };
      }
    }
    const previousOp = await one(
      tx,
      "SELECT * FROM inventory_operations WHERE reference=$1",
      [d.reference],
    );
    if (previousOp) {
      const old = previousOp.payload;
      const requested = old.requestedQuantity;
      if (
        previousOp.kind !==
          (
            {
              "inventory.adjust": "adjustment",
              "inventory.stocktake": "stocktake",
              "inventory.threshold": "threshold",
              "inventory.release": "return_release",
            } as Record<string, string>
          )[action] ||
        previousOp.requested_by !== user.id ||
        previousOp.branch_id !== d.branchId ||
        old.productId !== (d.productId ?? undefined) ||
        old.gas !== d.gas ||
        requested !== d.quantity ||
        old.reason !== d.reason ||
        old.evidence !== d.evidence ||
        old.holdId !== d.holdId
      )
        throw new AppError(
          409,
          "This operation reference already has different details.",
        );
      return {
        id: previousOp.id,
        requestId: previousOp.request_id,
        duplicate: true,
      };
    }
    const c = await stockBalance(tx, d.branchId, d.gas, d.productId, true);
    let delta = 0,
      kind =
        action === "inventory.stocktake"
          ? "stocktake"
          : action === "inventory.quarantine"
            ? "quarantine"
            : action === "inventory.release"
              ? "return_release"
              : action === "inventory.threshold"
                ? "threshold"
                : "adjustment";
    const q = d.quantity ?? NaN;
    if (!Number.isFinite(q)) throw new AppError(400, "Record the quantity.");
    if (kind === "stocktake") {
      if (q < 0) throw new AppError(400, "Count cannot be negative.");
      delta = (q === 0 ? 0 : quantity(d.gas, q)) - c.quantity;
    } else if (kind === "threshold") {
      if (q < 0) throw new AppError(400, "Threshold cannot be negative.");
    } else {
      delta = (q < 0 ? -1 : 1) * quantity(d.gas, Math.abs(q));
      if (kind === "quarantine") delta = -Math.abs(delta);
      if (kind === "return_release" && (!d.holdId || delta <= 0))
        throw new AppError(
          400,
          "Choose a held return and positive verified release quantity.",
        );
    }
    if (kind === "return_release")
      await inventoryQualification(tx, user.id, d.branchId, "inventory_safety");
    if (
      kind !== "threshold" &&
      (c.quantity + delta < c.reserved || delta === 0)
    )
      throw new AppError(
        409,
        "Adjustment must change stock without consuming active reservations.",
      );
    const payload = {
      requestedQuantity: d.quantity,
      gas: d.gas,
      productId: d.productId,
      before: c.quantity,
      reserved: c.reserved,
      delta,
      threshold:
        kind === "threshold" ? (q === 0 ? 0 : quantity(d.gas, q)) : undefined,
      holdId: d.holdId,
      reason: d.reason,
      evidence: d.evidence,
    };
    if (kind === "quarantine") {
      const previous = await one(
        tx,
        "SELECT * FROM stock_holds WHERE reference=$1",
        [d.reference],
      );
      if (previous) {
        if (
          previous.branch_id !== d.branchId ||
          previous.product_id !== (d.productId ?? null) ||
          previous.gas !== d.gas ||
          Number(previous.quantity) !== -delta
        )
          throw new AppError(
            409,
            "Quarantine reference has different details.",
          );
        return { id: previous.id, duplicate: true };
      }
      await moveStock(
        tx,
        user,
        d.branchId,
        d.gas,
        d.productId,
        delta,
        "quarantine",
        d.reference,
        d.reason,
      );
      const hid = id();
      await tx.query(
        "INSERT INTO stock_holds(id,branch_id,product_id,gas,quantity,kind,reference,reason,evidence,actor_id) VALUES($1,$2,$3,$4,$5,'quarantine',$6,$7,$8,$9)",
        [
          hid,
          d.branchId,
          d.productId ?? null,
          d.gas,
          -delta,
          d.reference,
          d.reason,
          d.evidence,
          user.id,
        ],
      );
      await audit(tx, user, "inventory.protective_quarantine", hid, "success", {
        branch: d.branchId,
        before: c.quantity,
        after: c.quantity + delta,
        reason: d.reason,
        role: user.role,
      });
      return {
        id: hid,
        message:
          "Unsafe unreserved stock removed from sale immediately. Release requires independent review.",
      };
    }
    // JSON normalisation makes strict replay equality stable across PostgreSQL jsonb ordering.
    return requestOperation(
      tx,
      user,
      kind,
      d.branchId,
      JSON.parse(JSON.stringify(payload)),
      d.reference,
      d.reason,
      d.draft,
    );
  }
  if (action === "inventory.return") {
    const d = z
      .object({
        branchId: branch,
        ...item,
        quantity: z.number().positive(),
        kind: z.enum([
          "customer",
          "supplier",
          "cancelled_order",
          "technician",
          "cylinder",
        ]),
        reference,
        reason,
        evidence: reason,
      })
      .strict()
      .parse(input);
    allow(user, writers, d.branchId);
    await activeBranch(tx, d.branchId);
    await product(tx, d.gas, d.productId);
    const q = quantity(d.gas, d.quantity);
    const prior = await one(
      tx,
      "SELECT * FROM stock_holds WHERE reference=$1",
      [d.reference],
    );
    if (prior) {
      if (
        prior.branch_id !== d.branchId ||
        prior.product_id !== (d.productId ?? null) ||
        prior.gas !== d.gas ||
        Number(prior.quantity) !== q ||
        prior.kind !== d.kind
      )
        throw new AppError(409, "Return reference has different details.");
      return { id: prior.id, duplicate: true };
    }
    if (d.kind === "supplier")
      throw new AppError(
        409,
        "Supplier returns must first remove saleable stock through an approved negative adjustment/quarantine; never add a supplier return to stock.",
      );
    if (d.kind === "cancelled_order")
      throw new AppError(
        409,
        "Cancellation releases reservations through the order workflow. Record only actual recovered physical stock as a customer return.",
      );
    if (d.kind === "technician")
      throw new AppError(
        409,
        "Use the existing service material reconciliation to prevent double returns.",
      );
    const hid = id();
    await tx.query(
      "INSERT INTO stock_holds(id,branch_id,product_id,gas,quantity,kind,reference,reason,evidence,actor_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
      [
        hid,
        d.branchId,
        d.productId ?? null,
        d.gas,
        q,
        d.kind,
        d.reference,
        d.reason,
        d.evidence,
        user.id,
      ],
    );
    await audit(tx, user, "inventory.return_quarantined", hid, "success", {
      branch: d.branchId,
      reference: d.reference,
      role: user.role,
    });
    return {
      id: hid,
      message: "Return held for condition checks. Saleable stock is unchanged.",
    };
  }
  if (action === "inventory.disposition") {
    const d = z
      .object({
        holdId: z.string().uuid(),
        quantity: z.number().positive(),
        disposition: z.enum(["supplier_return", "write_off"]),
        reference,
        reason,
        evidence: reason,
      })
      .strict()
      .parse(input);
    const h = await one(
      tx,
      "SELECT * FROM stock_holds WHERE id=$1 FOR UPDATE",
      [d.holdId],
    );
    if (!h) throw new AppError(404, "Held stock not found.");
    allow(user, writers, h.branch_id);
    recentVerification(user);
    await activeBranch(tx, h.branch_id);
    const q = quantity(h.gas, d.quantity);
    if (Number(h.quantity) - Number(h.released) < q)
      throw new AppError(409, "Disposition exceeds held stock.");
    return requestOperation(
      tx,
      user,
      "hold_disposition",
      h.branch_id,
      {
        holdId: h.id,
        quantity: q,
        disposition: d.disposition,
        reason: d.reason,
        evidence: d.evidence,
      },
      d.reference,
      d.reason,
    );
  }
  if (action === "supplier.update") {
    const d = z
      .object({
        id: z.string().uuid(),
        name: z.string().min(3).max(100),
        contact: z.string().min(5).max(250),
        active: z.boolean(),
      })
      .strict()
      .parse(input);
    const s = await one(tx, "SELECT * FROM suppliers WHERE id=$1 FOR UPDATE", [
      d.id,
    ]);
    if (!s) throw new AppError(404, "Supplier not found.");
    allow(user, ["owner", "manager"], s.branch_id);
    await tx.query(
      "UPDATE suppliers SET name=$1,contact=$2,active=$3 WHERE id=$4",
      [d.name, d.contact, d.active, s.id],
    );
    await audit(tx, user, "supplier.updated", s.id, "success", {
      branch: s.branch_id,
      active: d.active,
    });
    return { ok: true };
  }
  if (action === "purchase.create") {
    const d = z
      .object({
        supplierId: z.string().uuid(),
        ...item,
        quantity: z.number().positive(),
        unitCostKobo: amount,
        reference: reference.optional(),
        reason: reason.default("Purchase request for independent approval"),
      })
      .strict()
      .parse(input);
    const s = await one(
      tx,
      "SELECT * FROM suppliers WHERE id=$1 AND active=true",
      [d.supplierId],
    );
    if (!s) throw new AppError(404, "Supplier not found.");
    allow(user, writers, s.branch_id);
    await activeBranch(tx, s.branch_id);
    await product(tx, d.gas, d.productId);
    const q = quantity(d.gas, d.quantity);
    if (!d.gas && q > 100000)
      throw new AppError(
        400,
        "Physical purchase quantity exceeds 100,000 units.",
      );
    const pid = id(),
      ref = d.reference ?? "purchase:" + pid;
    const prev = await one(
      tx,
      "SELECT o.payload,p.* FROM inventory_operations o JOIN purchase_orders p ON p.id=o.payload->>'purchaseId' WHERE o.reference=$1",
      [ref],
    );
    if (prev) {
      if (
        prev.requested_by !== user.id ||
        prev.supplier_id !== s.id ||
        prev.product_id !== (d.productId ?? null) ||
        prev.gas !== d.gas ||
        Number(prev.quantity) !== q ||
        Number(prev.unit_cost_kobo) !== d.unitCostKobo
      )
        throw new AppError(409, "Purchase reference has different details.");
      return { id: prev.id, duplicate: true };
    }
    await tx.query(
      "INSERT INTO purchase_orders(id,branch_id,supplier_id,product_id,gas,quantity,unit_cost_kobo,requested_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
      [
        pid,
        s.branch_id,
        s.id,
        d.productId ?? null,
        d.gas,
        q,
        d.unitCostKobo,
        user.id,
      ],
    );
    const req = await requestOperation(
      tx,
      user,
      "purchase",
      s.branch_id,
      {
        purchaseId: pid,
        supplierId: s.id,
        productId: d.productId ?? null,
        gas: d.gas,
        quantity: q,
        unitCostKobo: d.unitCostKobo,
      },
      ref,
      d.reason,
    );
    await tx.query(
      "UPDATE purchase_orders SET approval_request_id=$1 WHERE id=$2",
      [req.requestId, pid],
    );
    return { ...req, id: pid };
  }
  if (action === "purchase.update") {
    const d = z
      .object({
        id: z.string().uuid(),
        status: z.enum(["approved", "received", "cancelled"]),
        invoiceReference: z.string().min(3).max(100).optional(),
      })
      .strict()
      .parse(input);
    const p = await one(
      tx,
      "SELECT * FROM purchase_orders WHERE id=$1 FOR UPDATE",
      [d.id],
    );
    if (!p) throw new AppError(404, "Purchase not found.");
    allow(user, writers.concat("finance"), p.branch_id);
    if (d.status === "approved") {
      if (!p.approval_request_id)
        throw new AppError(
          409,
          "Legacy purchase needs a new governed request.",
        );
      return decide(
        tx,
        user,
        p.approval_request_id,
        "approve",
        "Independent purchase approval",
      );
    }
    if (d.status === "cancelled")
      throw new AppError(
        409,
        "Cancel its pending approval in the Approval Centre. Approved purchases need an explicit reviewed supplier cancellation.",
      );
    if (p.status === "received") return { ok: true };
    if (!d.invoiceReference)
      throw new AppError(400, "Record the supplier invoice.");
    return receipt(tx, user, {
      branchId: p.branch_id,
      productId: p.product_id ?? undefined,
      gas: p.gas,
      quantity:
        (Number(p.quantity) - Number(p.received_quantity)) / (p.gas ? 1000 : 1),
      unitCostKobo: Number(p.unit_cost_kobo),
      supplierId: p.supplier_id,
      purchaseId: p.id,
      reference: "purchase:" + p.id,
      reason: "Supplier invoice " + d.invoiceReference,
      evidence: "Supplier invoice " + d.invoiceReference,
      receivedDate: new Date().toISOString().slice(0, 10),
      receivingPassed: true,
    });
  }
  if (action === "transfer.create") {
    const d = z
      .object({
        sourceBranch: branch,
        destinationBranch: branch,
        ...item,
        quantity: z.number().positive(),
        reference: reference.optional(),
        reason: reason.default("Interbranch stock transfer for review"),
      })
      .strict()
      .parse(input);
    allow(user, writers, d.sourceBranch);
    await tx.query(
      "SELECT id FROM branches WHERE id IN ($1,$2) ORDER BY id FOR UPDATE",
      [d.sourceBranch, d.destinationBranch],
    );
    await activeBranch(tx, d.sourceBranch);
    await activeBranch(tx, d.destinationBranch);
    if (d.sourceBranch === d.destinationBranch)
      throw new AppError(400, "Choose a different destination.");
    const pr = await product(tx, d.gas, d.productId);
    if (pr?.asset === "cylinder")
      throw new AppError(
        409,
        "Serialized cylinder transfers require an approved serial-by-serial custody procedure; generic unit transfer is disabled.",
      );
    const q = quantity(d.gas, d.quantity),
      c = await stockBalance(tx, d.sourceBranch, d.gas, d.productId, true);
    await stockBalance(tx, d.destinationBranch, d.gas, d.productId);
    if (c.quantity - c.reserved < q)
      throw new AppError(409, "Insufficient unreserved source stock.");
    const tid = id(),
      ref = d.reference ?? "transfer:" + tid,
      old = await one(
        tx,
        "SELECT t.* FROM inventory_operations o JOIN stock_transfers t ON t.id=o.payload->>'transferId' WHERE o.reference=$1",
        [ref],
      );
    if (old) {
      if (
        old.requested_by !== user.id ||
        old.source_branch !== d.sourceBranch ||
        old.destination_branch !== d.destinationBranch ||
        old.product_id !== (d.productId ?? null) ||
        old.gas !== d.gas ||
        Number(old.quantity) !== q
      )
        throw new AppError(409, "Transfer reference has different details.");
      return { id: old.id, duplicate: true };
    }
    await tx.query(
      "INSERT INTO stock_transfers(id,source_branch,destination_branch,product_id,gas,quantity,requested_by,status) VALUES($1,$2,$3,$4,$5,$6,$7,'requested')",
      [
        tid,
        d.sourceBranch,
        d.destinationBranch,
        d.productId ?? null,
        d.gas,
        q,
        user.id,
      ],
    );
    const r = await requestOperation(
      tx,
      user,
      "transfer",
      d.sourceBranch,
      {
        transferId: tid,
        source: d.sourceBranch,
        destination: d.destinationBranch,
        productId: d.productId ?? null,
        gas: d.gas,
        quantity: q,
      },
      ref,
      d.reason,
    );
    await tx.query(
      "UPDATE stock_transfers SET approval_request_id=$1 WHERE id=$2",
      [r.requestId, tid],
    );
    return { ...r, id: tid };
  }
  if (
    ["transfer.dispatch", "transfer.receive", "transfer.cancel"].includes(
      action,
    )
  ) {
    const d = z
      .object({
        id: z.string().uuid(),
        quantity: z.number().min(0).optional(),
        damaged: z.number().min(0).default(0),
        reference: reference.optional(),
        reason: reason.default("Documented interbranch receiving confirmation"),
      })
      .strict()
      .parse(input);
    const t = await one(
      tx,
      "SELECT * FROM stock_transfers WHERE id=$1 FOR UPDATE",
      [d.id],
    );
    if (!t) throw new AppError(404, "Transfer not found.");
    allow(
      user,
      writers,
      action === "transfer.receive" ? t.destination_branch : t.source_branch,
    );
    recentVerification(user);
    await tx.query(
      "SELECT id FROM branches WHERE id IN ($1,$2) ORDER BY id FOR UPDATE",
      [t.source_branch, t.destination_branch],
    );
    if (action === "transfer.cancel") {
      if (!["requested", "reserved"].includes(t.status))
        throw new AppError(
          409,
          "Dispatched stock requires physical receiving/reconciliation.",
        );
      if (t.status === "reserved")
        await tx.query(
          t.gas
            ? "UPDATE gas_stock SET reserved_grams=reserved_grams-$1 WHERE branch_id=$2"
            : "UPDATE inventory SET reserved=reserved-$1 WHERE branch_id=$2 AND product_id=$3",
          t.gas
            ? [t.quantity, t.source_branch]
            : [t.quantity, t.source_branch, t.product_id],
        );
      await tx.query(
        "UPDATE stock_transfers SET status='cancelled' WHERE id=$1",
        [t.id],
      );
      await audit(tx, user, "stock.transfer_cancelled", t.id, "success", {
        branch: t.source_branch,
        reason: d.reason,
      });
      return { ok: true };
    }
    await activeBranch(
      tx,
      action === "transfer.receive" ? t.destination_branch : t.source_branch,
    );
    if (action === "transfer.dispatch") {
      if (
        ["in_transit", "partial", "received", "discrepancy"].includes(t.status)
      )
        return { ok: true, duplicate: true };
      if (t.status !== "reserved")
        throw new AppError(
          409,
          "Transfer must be approved and reserved before dispatch.",
        );
      const cr = await one(
        tx,
        "SELECT r.status,u.active,u.role,u.branch_id FROM change_requests r JOIN users u ON u.id=r.requester_id WHERE r.id=$1",
        [t.approval_request_id],
      );
      if (
        !cr ||
        cr.status !== "active" ||
        !cr.active ||
        (cr.role !== "owner" && cr.branch_id !== t.source_branch)
      )
        throw new AppError(
          409,
          "Transfer approval/requester is no longer valid.",
        );
      const a = await one(
        tx,
        "SELECT u.id FROM approval_decisions d JOIN users u ON u.id=d.approver_id WHERE d.request_id=$1 AND d.decision='approve' AND u.active=true AND u.role='owner'",
        [t.approval_request_id],
      );
      if (!a)
        throw new AppError(
          409,
          "Independent transfer approver no longer has authority.",
        );
      await stockBalance(tx, t.source_branch, t.gas, t.product_id, true);
      await tx.query(
        t.gas
          ? "UPDATE gas_stock SET reserved_grams=reserved_grams-$1 WHERE branch_id=$2"
          : "UPDATE inventory SET reserved=reserved-$1 WHERE branch_id=$2 AND product_id=$3",
        t.gas
          ? [t.quantity, t.source_branch]
          : [t.quantity, t.source_branch, t.product_id],
      );
      await moveStock(
        tx,
        user,
        t.source_branch,
        t.gas,
        t.product_id,
        -Number(t.quantity),
        "transfer_out",
        t.id + ":out",
        d.reason,
      );
      await tx.query(
        "UPDATE stock_transfers SET status='in_transit',dispatched_by=$1 WHERE id=$2",
        [user.id, t.id],
      );
      await audit(tx, user, "stock.transfer_dispatched", t.id, "success", {
        branch: t.source_branch,
        reason: d.reason,
      });
      return { ok: true };
    }
    if (t.requested_by === user.id || t.dispatched_by === user.id)
      throw new AppError(
        403,
        "A different receiving colleague must confirm receipt.",
      );
    const ref = d.reference ?? t.id + ":in",
      previous = await one(
        tx,
        "SELECT * FROM transfer_receipts WHERE reference=$1",
        [ref],
      );
    if (previous) {
      if (
        previous.transfer_id !== t.id ||
        (d.quantity !== undefined &&
          Number(previous.quantity) !==
            (d.quantity === 0 ? 0 : quantity(t.gas, d.quantity))) ||
        Number(previous.damaged) !==
          (d.damaged === 0 ? 0 : quantity(t.gas, d.damaged))
      )
        throw new AppError(409, "Receipt reference has different details.");
      return { ok: true, duplicate: true };
    }
    if (!["in_transit", "partial", "discrepancy"].includes(t.status))
      throw new AppError(409, "Only dispatched transfers can be received.");
    const received =
        d.quantity === undefined
          ? Number(t.quantity) -
            Number(t.received_quantity) -
            Number(t.damaged_quantity)
          : d.quantity === 0
            ? 0
            : quantity(t.gas, d.quantity),
      damaged = d.damaged === 0 ? 0 : quantity(t.gas, d.damaged);
    const accounted =
      Number(t.received_quantity) +
      Number(t.damaged_quantity) +
      received +
      damaged;
    if (received + damaged <= 0 || accounted > Number(t.quantity))
      throw new AppError(
        409,
        "Receipt exceeds the outstanding transfer quantity.",
      );
    if (received)
      await moveStock(
        tx,
        user,
        t.destination_branch,
        t.gas,
        t.product_id,
        received,
        "transfer_in",
        ref,
        d.reason,
      );
    if (damaged)
      await tx.query(
        "INSERT INTO stock_holds(id,branch_id,product_id,gas,quantity,kind,reference,reason,evidence,actor_id) VALUES($1,$2,$3,$4,$5,'transfer_damage',$6,$7,$7,$8)",
        [
          id(),
          t.destination_branch,
          t.product_id,
          t.gas,
          damaged,
          ref + ":damaged",
          d.reason,
          user.id,
        ],
      );
    await tx.query(
      "INSERT INTO transfer_receipts(id,transfer_id,quantity,damaged,reference,reason,actor_id) VALUES($1,$2,$3,$4,$5,$6,$7)",
      [id(), t.id, received, damaged, ref, d.reason, user.id],
    );
    await tx.query(
      "UPDATE stock_transfers SET received_quantity=received_quantity+$1,damaged_quantity=damaged_quantity+$2,received_by=$3,status=$4 WHERE id=$5",
      [
        received,
        damaged,
        user.id,
        accounted === Number(t.quantity)
          ? Number(t.damaged_quantity) + damaged
            ? "discrepancy"
            : "received"
          : "partial",
        t.id,
      ],
    );
    await audit(tx, user, "stock.transfer_received", t.id, "success", {
      branch: t.destination_branch,
      received,
      damaged,
      remaining: Number(t.quantity) - accounted,
      reference: ref,
    });
    return { ok: true };
  }
  if (action === "expense.create") {
    const d = z
      .object({
        branchId: branch,
        categoryId: branch,
        amountKobo: amount,
        date: z.iso.date(),
        payee: z.string().trim().min(2).max(150),
        description: reason,
        method: z.enum(["cash", "bank_record", "other"]),
        evidence: reason,
        reference,
        draft: z.boolean().default(false),
      })
      .strict()
      .parse(input);
    allow(user, ["owner", "finance"], d.branchId);
    recentVerification(user);
    await activeBranch(tx, d.branchId);
    if (
      !(await one(
        tx,
        "SELECT id FROM expense_categories WHERE id=$1 AND active=true",
        [d.categoryId],
      ))
    )
      throw new AppError(400, "Choose an active expense category.");
    const fingerprint = digest(
      JSON.stringify([
        d.branchId,
        d.categoryId,
        d.amountKobo,
        d.date,
        d.payee.toLowerCase(),
        d.description.toLowerCase(),
      ]),
    );
    const old = await one(
      tx,
      "SELECT * FROM expenses WHERE reference=$1 OR fingerprint=$2",
      [d.reference, fingerprint],
    );
    if (old) {
      if (
        old.branch_id !== d.branchId ||
        old.fingerprint !== fingerprint ||
        old.requested_by !== user.id
      )
        throw new AppError(
          409,
          "A matching expense/reference already exists. Review it before recording another.",
        );
      return {
        id: old.id,
        requestId: old.approval_request_id,
        duplicate: true,
        message: "Matching expense already exists; no duplicate posting.",
      };
    }
    const eid = id();
    await tx.query(
      "INSERT INTO expenses(id,branch_id,category_id,amount_kobo,expense_date,payee,description,method,evidence,reference,fingerprint,requested_by,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)",
      [
        eid,
        d.branchId,
        d.categoryId,
        d.amountKobo,
        d.date,
        d.payee,
        d.description,
        d.method,
        d.evidence,
        d.reference,
        fingerprint,
        user.id,
        d.draft ? "draft" : "pending_approval",
      ],
    );
    const r = await requestOperation(
      tx,
      user,
      "expense",
      d.branchId,
      {
        expenseId: eid,
        category: d.categoryId,
        amountKobo: d.amountKobo,
        date: d.date,
        payee: d.payee,
        description: d.description,
        evidence: d.evidence,
      },
      "expense:" + d.reference,
      d.description,
      d.draft,
    );
    await tx.query("UPDATE expenses SET approval_request_id=$1 WHERE id=$2", [
      r.requestId,
      eid,
    ]);
    return { ...r, id: eid };
  }
  if (["expense.record", "expense.pay", "expense.reverse"].includes(action)) {
    const d = z
      .object({ id: z.string().uuid(), reference, reason })
      .strict()
      .parse(input);
    const e = await one(tx, "SELECT * FROM expenses WHERE id=$1 FOR UPDATE", [
      d.id,
    ]);
    if (!e) throw new AppError(404, "Expense not found.");
    allow(user, ["owner", "finance"], e.branch_id);
    recentVerification(user);
    if (action === "expense.reverse")
      return requestOperation(
        tx,
        user,
        "expense_reversal",
        e.branch_id,
        { expenseId: e.id, reason: d.reason },
        d.reference,
        d.reason,
      );
    const kind = action === "expense.record" ? "recorded" : "paid",
      old = await one(
        tx,
        "SELECT * FROM expense_events WHERE expense_id=$1 AND kind=$2",
        [e.id, kind],
      );
    if (old) {
      if (old.reference !== d.reference)
        throw new AppError(
          409,
          "This expense already has a " + kind + " event.",
        );
      return { ok: true, duplicate: true };
    }
    if (e.status !== (kind === "recorded" ? "approved" : "recorded"))
      throw new AppError(
        409,
        "Expense must be independently approved, then recorded before payment evidence.",
      );
    if (kind === "paid" && e.requested_by === user.id)
      throw new AppError(
        403,
        "A different finance colleague must verify actual payment evidence.",
      );
    const approval = await one(
      tx,
      "SELECT r.status FROM change_requests r WHERE r.id=$1",
      [e.approval_request_id],
    );
    const valid = await one(
      tx,
      "SELECT u.id FROM approval_decisions d JOIN users u ON u.id=d.approver_id WHERE d.request_id=$1 AND d.decision='approve' AND u.active=true AND u.role='owner'",
      [e.approval_request_id],
    );
    if (approval?.status !== "active" || !valid)
      throw new AppError(
        409,
        "Expense approval authority must still be valid.",
      );
    await tx.query(
      "INSERT INTO expense_events(id,expense_id,kind,amount_kobo,reference,actor_id,reason) VALUES($1,$2,$3,$4,$5,$6,$7)",
      [id(), e.id, kind, e.amount_kobo, d.reference, user.id, d.reason],
    );
    await tx.query("UPDATE expenses SET status=$1 WHERE id=$2", [kind, e.id]);
    await audit(tx, user, "expense." + kind, e.id, "success", {
      branch: e.branch_id,
      reference: d.reference,
      reason: d.reason,
      role: user.role,
    });
    return {
      ok: true,
      message:
        kind === "paid"
          ? "Actual payment evidence recorded. No payment provider was invoked."
          : "Approved expense recorded. Payment is separate.",
    };
  }
  return undefined;
}
