import { inventoryQualification } from "./inventory-business";
import { z } from "zod";
import { type SQL, one } from "./db";
import { type Actor, allow, recentVerification, id, AppError } from "./auth";
import { audit, notify } from "./governance";
import { receiveStock } from "./operations";
const uuid = z.string().uuid(),
  reason = z.string().trim().min(10).max(2000),
  scope = z.string().min(1).max(100);
async function ticket(tx: SQL, user: Actor, ticketId: string) {
  const t = await one(
    tx,
    "SELECT * FROM support_requests WHERE id=$1 FOR UPDATE",
    [ticketId],
  );
  if (!t) throw new AppError(404, "Support request not found.");
  if (["customer", "commercial"].includes(user.role)) {
    if (t.customer_id !== user.id)
      throw new AppError(404, "Support request not found.");
  } else allow(user, ["owner", "manager", "sales"], t.branch_id);
  return t;
}
export async function workspaceAction(
  tx: SQL,
  action: string,
  user: Actor,
  input: unknown,
): Promise<any> {
  if (action === "support.list") {
    const customer = ["customer", "commercial"].includes(user.role);
    if (!customer) allow(user, ["owner", "manager", "sales"]);
    const rows = (
      await tx.query(
        `SELECT s.*,u.name AS customer_name,a.name AS assignee FROM support_requests s JOIN users u ON u.id=s.customer_id LEFT JOIN users a ON a.id=s.assignee_id WHERE ${customer ? "s.customer_id=$1" : user.role === "owner" ? "true" : "s.branch_id=$1"} ORDER BY s.updated_at DESC LIMIT 100`,
        customer ? [user.id] : user.role === "owner" ? [] : [user.branch_id],
      )
    ).rows;
    for (const row of rows)
      row.messages = (
        await tx.query(
          `SELECT m.id,m.body,m.internal,m.created_at,u.name AS author FROM support_messages m JOIN users u ON u.id=m.author_id WHERE m.request_id=$1 ${customer ? "AND m.internal=false" : ""} ORDER BY m.created_at`,
          [row.id],
        )
      ).rows;
    return rows;
  }
  if (action === "support.reply") {
    const d = z
        .object({
          id: uuid,
          body: reason,
          internal: z.boolean().default(false),
        })
        .strict()
        .parse(input),
      t = await ticket(tx, user, d.id);
    if (d.internal && ["customer", "commercial"].includes(user.role))
      throw new AppError(403, "Internal notes are for staff.");
    if (t.status === "closed")
      throw new AppError(409, "Reopen the request before replying.");
    await tx.query(
      "INSERT INTO support_messages(id,request_id,author_id,body,internal) VALUES ($1,$2,$3,$4,$5)",
      [id(), t.id, user.id, d.body, d.internal],
    );
    await tx.query("UPDATE support_requests SET updated_at=now() WHERE id=$1", [
      t.id,
    ]);
    if (!d.internal && user.id !== t.customer_id)
      await notify(
        tx,
        t.customer_id,
        "Support reply",
        `A reply is available for “${t.subject}”.`,
        t.id,
      );
    await audit(
      tx,
      user,
      d.internal ? "support.internal_note" : "support.reply",
      t.id,
    );
    return { ok: true };
  }
  if (action === "support.update") {
    const d = z
        .object({
          id: uuid,
          status: z.enum(["open", "in_progress", "resolved", "closed"]),
          assigneeId: uuid.optional(),
        })
        .strict()
        .parse(input),
      t = await ticket(tx, user, d.id);
    allow(user, ["owner", "manager", "sales"], t.branch_id);
    if (
      d.assigneeId &&
      !(await one(
        tx,
        "SELECT id FROM users WHERE id=$1 AND active=true AND (branch_id=$2 OR role='owner') AND role IN ('owner','manager','sales')",
        [d.assigneeId, t.branch_id],
      ))
    )
      throw new AppError(
        400,
        "Choose an active support staff member in this branch.",
      );
    await tx.query(
      "UPDATE support_requests SET status=$1,assignee_id=COALESCE($2,assignee_id),updated_at=now() WHERE id=$3",
      [d.status, d.assigneeId ?? null, t.id],
    );
    await audit(tx, user, "support.status_changed", t.id, "success", {
      status: d.status,
    });
    await notify(
      tx,
      t.customer_id,
      "Support update",
      `“${t.subject}” is ${d.status.replaceAll("_", " ")}.`,
      t.id,
    );
    return { ok: true };
  }
  if (action === "product.save" || action === "product.import") {
    if (action === "product.import") {
      allow(user, ["owner"]);
      recentVerification(user);
    }
    allow(user, ["owner", "manager", "inventory"]);
    const d = z
      .object({
        id: z.string().regex(/^[a-z0-9][a-z0-9-]{1,79}$/),
        name: z.string().trim().min(3).max(100),
        description: z.string().trim().min(10).max(2000),
        category: z.string().trim().min(2).max(80),
        sizeKg: z.number().positive().max(100).nullable(),
        asset: z.enum(["cylinder", "burner", "hose", "regulator", "kit"]),
        safety: reason,
      })
      .strict()
      .parse(input);
    if (
      !(await one(
        tx,
        "SELECT name FROM product_categories WHERE name=$1 AND active=true",
        [d.category],
      ))
    )
      throw new AppError(400, "Choose an active product category.");
    if (
      d.category === "Gas refills" &&
      (d.sizeKg === null || d.asset !== "cylinder")
    )
      throw new AppError(
        400,
        "Refill products require a cylinder size and illustration.",
      );
    const exists = await one(tx, "SELECT id FROM products WHERE id=$1", [d.id]);
    if (action === "product.import" && exists)
      throw new AppError(
        409,
        "Product already exists. Import cannot replace existing products.",
      );
    if (!exists && user.role !== "owner")
      throw new AppError(
        403,
        "Only the owner can create products shared between branches.",
      );
    if (exists && user.role !== "owner")
      throw new AppError(
        403,
        "Shared product content requires the business owner. Branch prices use approvals.",
      );
    const saved = await tx.query(
      `INSERT INTO products(id,sku,name,description,category,size_kg,asset,safety) VALUES ($1,$1,$2,$3,$4,$5,$6,$7) ${action === "product.import" ? "ON CONFLICT DO NOTHING" : "ON CONFLICT(id) DO UPDATE SET name=$2,description=$3,category=$4,size_kg=$5,asset=$6,safety=$7"} RETURNING id`,
      [d.id, d.name, d.description, d.category, d.sizeKg, d.asset, d.safety],
    );
    if (!saved.rows.length)
      throw new AppError(
        409,
        "Product identifier or SKU already exists. Import stopped without replacing it.",
      );
    for (const b of (
      await tx.query("SELECT id FROM branches WHERE active=true")
    ).rows)
      await tx.query(
        "INSERT INTO inventory(branch_id,product_id) VALUES ($1,$2) ON CONFLICT DO NOTHING",
        [b.id, d.id],
      );
    if (!exists)
      for (const [prefix, label, type, risk, value] of [
        ["price", "Selling price", "money", 3, null],
        ["publish", "Available for sale", "boolean", 2, false],
      ] as const) {
        await tx.query(
          "INSERT INTO setting_definitions(key,label,category,description,owner_role,risk,value_type,propose_roles,approve_roles,view_roles,required_roles,minimum,maximum) VALUES ($1,$2,'Products',$3,'owner',$4,$5,$6,$7,$8,'[]',1,1000000000)",
          [
            `${prefix}.${d.id}`,
            `${d.name} — ${label}`,
            "Branch catalogue approval",
            risk,
            type,
            JSON.stringify(["owner", "manager", "inventory"]),
            JSON.stringify(risk === 3 ? ["owner"] : ["owner", "manager"]),
            JSON.stringify(["owner", "manager", "inventory", "sales"]),
          ],
        );
        for (const b of (
          await tx.query("SELECT id FROM branches WHERE active=true")
        ).rows)
          await tx.query(
            "INSERT INTO settings(key,scope,value) VALUES ($1,$2,$3)",
            [`${prefix}.${d.id}`, b.id, JSON.stringify(value)],
          );
      }
    await audit(tx, user, exists ? "product.updated" : "product.created", d.id);
    return { ok: true };
  }
  if (action === "purchasing") {
    allow(user, ["owner", "manager", "inventory", "finance"]);
    const global = user.role === "owner";
    return {
      permissions: {
        canApprove: user.role === "owner",
        canReceive: ["owner", "manager", "inventory"].includes(user.role),
        userId: user.id,
      },
      suppliers: (
        await tx.query(
          `SELECT * FROM suppliers WHERE ${global ? "true" : "branch_id=$1"} ORDER BY name`,
          global ? [] : [user.branch_id],
        )
      ).rows,
      orders: (
        await tx.query(
          `SELECT po.*,s.name AS supplier,COALESCE(p.name,'Bulk gas') AS product FROM purchase_orders po JOIN suppliers s ON s.id=po.supplier_id LEFT JOIN products p ON p.id=po.product_id WHERE ${global ? "true" : "po.branch_id=$1"} ORDER BY po.created_at DESC LIMIT 100`,
          global ? [] : [user.branch_id],
        )
      ).rows.map((row) => {
        if (!["owner", "finance"].includes(user.role)) {
          const { unit_cost_kobo, ...safe } = row;
          return safe;
        }
        return row;
      }),
    };
  }
  if (action === "supplier.create") {
    const d = z
      .object({
        branchId: scope,
        name: z.string().min(3).max(100),
        contact: z.string().min(5).max(250),
      })
      .strict()
      .parse(input);
    allow(user, ["owner", "manager", "inventory"], d.branchId);
    const sid = id();
    await tx.query(
      "INSERT INTO suppliers(id,branch_id,name,contact) VALUES ($1,$2,$3,$4)",
      [sid, d.branchId, d.name, d.contact],
    );
    await audit(tx, user, "supplier.created", sid);
    return { id: sid };
  }
  if (action === "purchase.create") {
    const d = z
      .object({
        supplierId: uuid,
        productId: z.string().max(100),
        quantity: z.number().int().min(1).max(100000),
        unitCostKobo: z.number().int().positive().max(100000000),
      })
      .strict()
      .parse(input);
    const s = await one(
      tx,
      "SELECT * FROM suppliers WHERE id=$1 AND active=true",
      [d.supplierId],
    );
    if (!s) throw new AppError(404, "Supplier not found.");
    allow(user, ["owner", "manager", "inventory"], s.branch_id);
    if (
      !(await one(
        tx,
        "SELECT product_id FROM inventory WHERE branch_id=$1 AND product_id=$2",
        [s.branch_id, d.productId],
      ))
    )
      throw new AppError(400, "Choose a product stocked by this branch.");
    const pid = id();
    await tx.query(
      "INSERT INTO purchase_orders(id,branch_id,supplier_id,product_id,quantity,unit_cost_kobo,requested_by) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [
        pid,
        s.branch_id,
        s.id,
        d.productId,
        d.quantity,
        d.unitCostKobo,
        user.id,
      ],
    );
    await audit(tx, user, "purchase.created", pid);
    return { id: pid };
  }
  if (action === "purchase.update") {
    const d = z
      .object({
        id: uuid,
        status: z.enum(["approved", "received", "cancelled"]),
        invoiceReference: z.string().trim().min(3).max(100).optional(),
      })
      .strict()
      .parse(input);
    const p = await one(
      tx,
      "SELECT * FROM purchase_orders WHERE id=$1 FOR UPDATE",
      [d.id],
    );
    if (!p) throw new AppError(404, "Purchase order not found.");
    if (d.status === "approved") {
      allow(user, ["owner", "manager", "finance"], p.branch_id);
      recentVerification(user);
      if (p.requested_by === user.id)
        throw new AppError(
          403,
          "A different authorised colleague must approve the purchase.",
        );
      if (p.status !== "draft")
        throw new AppError(409, "Only draft purchases can be approved.");
      await tx.query(
        "UPDATE purchase_orders SET status='approved',approved_by=$1 WHERE id=$2",
        [user.id, p.id],
      );
    }
    if (d.status === "cancelled") {
      allow(user, ["owner", "manager"], p.branch_id);
      if (!["draft", "approved"].includes(p.status))
        throw new AppError(409, "Received purchases cannot be cancelled.");
      await tx.query(
        "UPDATE purchase_orders SET status='cancelled' WHERE id=$1",
        [p.id],
      );
    }
    if (d.status === "received") {
      allow(user, ["owner", "manager", "inventory"], p.branch_id);
      if (p.status === "received") return { ok: true };
      if (p.status !== "approved" || !d.invoiceReference)
        throw new AppError(
          409,
          "Approve the purchase and enter its supplier invoice reference first.",
        );
      const approver = await one(
        tx,
        "SELECT active,role,branch_id FROM users WHERE id=$1",
        [p.approved_by],
      );
      if (
        !approver?.active ||
        !["owner", "manager", "finance"].includes(approver.role) ||
        (approver.role !== "owner" && approver.branch_id !== p.branch_id)
      )
        throw new AppError(
          409,
          "The purchase approver no longer has authority.",
        );
      await receiveStock(tx, user, {
        branchId: p.branch_id,
        productId: p.product_id,
        quantity: p.quantity,
        reference: `purchase:${p.id}`,
        reason: `Supplier invoice ${d.invoiceReference}`,
      });
      await tx.query(
        "UPDATE purchase_orders SET status='received',received_by=$1,invoice_reference=$2 WHERE id=$3",
        [user.id, d.invoiceReference, p.id],
      );
    }
    await audit(tx, user, `purchase.${d.status}`, p.id);
    return { ok: true };
  }
  if (action === "cylinder.inspect") {
    const d = z
        .object({
          id: uuid,
          passed: z.boolean(),
          notes: reason,
          nextDue: z.iso.date(),
        })
        .strict()
        .parse(input),
      c = await one(tx, "SELECT * FROM cylinders WHERE id=$1 FOR UPDATE", [
        d.id,
      ]);
    if (!c) throw new AppError(404, "Cylinder not found.");
    allow(user, ["owner", "manager", "inventory"], c.branch_id);
    if (
      Date.parse(d.nextDue) <= Date.now() ||
      Date.parse(d.nextDue) > Date.now() + 10 * 366 * 86400000
    )
      throw new AppError(
        400,
        "Enter the next documented inspection date within ten years.",
      );
    if (d.passed) {
      recentVerification(user);
      await inventoryQualification(
        tx,
        user.id,
        c.branch_id,
        "cylinder_inspection",
      );
    }
    // Passing inspection does not assert that a cylinder is full or issue a certificate.
    const status = d.passed ? "empty" : "quarantined";
    await tx.query(
      "INSERT INTO cylinder_inspections(id,cylinder_id,inspector_id,passed,notes,next_due) VALUES ($1,$2,$3,$4,$5,$6)",
      [id(), c.id, user.id, d.passed, d.notes, d.nextDue],
    );
    await tx.query("UPDATE cylinders SET status=$1,test_due=$2 WHERE id=$3", [
      status,
      d.nextDue,
      c.id,
    ]);
    await tx.query(
      "INSERT INTO cylinder_events(id,cylinder_id,actor_id,previous_status,status,reason) VALUES ($1,$2,$3,$4,$5,$6)",
      [id(), c.id, user.id, c.status, status, d.notes],
    );
    await audit(tx, user, "cylinder.inspected", c.id);
    return { ok: true };
  }
  if (action === "cylinder.custody") {
    const d = z
        .object({ id: uuid, customerId: uuid.nullable(), reason })
        .strict()
        .parse(input),
      c = await one(tx, "SELECT * FROM cylinders WHERE id=$1 FOR UPDATE", [
        d.id,
      ]);
    if (!c) throw new AppError(404, "Cylinder not found.");
    allow(user, ["owner", "manager", "inventory"], c.branch_id);
    if (
      d.customerId &&
      (c.status !== "filled" || Date.parse(c.test_due) <= Date.now())
    )
      throw new AppError(
        409,
        "Only a filled cylinder with a current inspection can be issued.",
      );
    if (
      d.customerId &&
      !(await one(
        tx,
        "SELECT id FROM users WHERE id=$1 AND active=true AND role IN ('customer','commercial')",
        [d.customerId],
      ))
    )
      throw new AppError(400, "Choose an active customer.");
    if (c.customer_id && d.customerId && c.customer_id !== d.customerId)
      throw new AppError(
        409,
        "Record the existing customer's return before issuing this cylinder again.",
      );
    if (
      await one(
        tx,
        "SELECT id FROM cylinder_allocations WHERE cylinder_id=$1 AND state IN ('reserved','issued') UNION ALL SELECT id FROM vehicle_product_serials WHERE cylinder_id=$1 AND state IN ('loaded','reserved')",
        [c.id],
      )
    )
      throw new AppError(
        409,
        "This cylinder belongs to an allocated sale; use the sale return workflow.",
      );
    await tx.query("UPDATE cylinders SET customer_id=$1 WHERE id=$2", [
      d.customerId,
      c.id,
    ]);
    await tx.query(
      "INSERT INTO cylinder_events(id,cylinder_id,actor_id,previous_status,status,reason) VALUES ($1,$2,$3,$4,$4,$5)",
      [
        id(),
        c.id,
        user.id,
        c.status,
        `${d.reason}; custody ${c.customer_id ?? "branch"} → ${d.customerId ?? "branch"}`,
      ],
    );
    await audit(tx, user, "cylinder.custody_changed", c.id);
    return { ok: true };
  }
  if (action === "cylinder.fill") {
    const d = z.object({ id: uuid, reason }).strict().parse(input),
      c = await one(tx, "SELECT * FROM cylinders WHERE id=$1 FOR UPDATE", [
        d.id,
      ]);
    if (!c) throw new AppError(404, "Cylinder not found.");
    allow(user, ["owner", "manager", "inventory"], c.branch_id);
    if (c.status !== "empty" || Date.parse(c.test_due) <= Date.now())
      throw new AppError(
        409,
        "A cylinder must be empty and have a current inspection before filling.",
      );
    await tx.query("UPDATE cylinders SET status='filled' WHERE id=$1", [c.id]);
    await tx.query(
      "INSERT INTO cylinder_events(id,cylinder_id,actor_id,previous_status,status,reason) VALUES ($1,$2,$3,'empty','filled',$4)",
      [id(), c.id, user.id, d.reason],
    );
    await audit(tx, user, "cylinder.filled", c.id);
    return { ok: true };
  }
  if (action === "branches") {
    allow(user, ["owner", "manager", "inventory", "finance"]);
    return (await tx.query("SELECT * FROM branches ORDER BY name")).rows;
  }
  if (action === "branch.create") {
    allow(user, ["owner"]);
    recentVerification(user);
    const d = z
      .object({
        id: z.string().regex(/^[a-z][a-z0-9-]{1,40}$/),
        name: z.string().min(3).max(100),
      })
      .strict()
      .parse(input);
    if (await one(tx, "SELECT id FROM branches WHERE id=$1", [d.id]))
      throw new AppError(409, "Branch identifier already exists.");
    await tx.query("INSERT INTO branches(id,name) VALUES ($1,$2)", [
      d.id,
      d.name,
    ]);
    await tx.query(
      "INSERT INTO inventory(branch_id,product_id) SELECT $1,id FROM products",
      [d.id],
    );
    // New branches are explicitly disabled and unpriced; no selling configuration is copied.
    await tx.query(
      "INSERT INTO settings(key,scope,value) SELECT key,$1,CASE WHEN key LIKE 'price.%' THEN 'null'::jsonb WHEN key='inventory.valuation' THEN '\"unconfigured\"'::jsonb WHEN key LIKE 'publish.%' OR key IN ('delivery.enabled','payment.cod','payment.integration','wallet.enabled','loyalty.enabled','subscription.enabled') THEN 'false'::jsonb ELSE value END FROM settings WHERE scope='lagos' AND key NOT LIKE 'inventory.operation.%'",
      [d.id],
    );
    await tx.query(
      "INSERT INTO gas_stock(branch_id) VALUES($1) ON CONFLICT DO NOTHING",
      [d.id],
    );
    await audit(tx, user, "branch.created", d.id);
    return { ok: true };
  }
  if (action === "transfers") {
    allow(user, ["owner", "manager", "inventory"]);
    return (
      await tx.query(
        `SELECT * FROM stock_transfers WHERE ${user.role === "owner" ? "true" : "source_branch=$1 OR destination_branch=$1"} ORDER BY created_at DESC LIMIT 100`,
        user.role === "owner" ? [] : [user.branch_id],
      )
    ).rows;
  }
  if (action === "transfer.create") {
    const d = z
      .object({
        sourceBranch: scope,
        destinationBranch: scope,
        productId: z.string().max(100),
        quantity: z.number().int().min(1).max(100000),
      })
      .strict()
      .parse(input);
    allow(user, ["owner", "manager", "inventory"], d.sourceBranch);
    if (d.sourceBranch === d.destinationBranch)
      throw new AppError(400, "Choose a different destination branch.");
    if (
      !(await one(tx, "SELECT id FROM branches WHERE id=$1 AND active=true", [
        d.destinationBranch,
      ]))
    )
      throw new AppError(400, "Choose an active destination branch.");
    await tx.query(
      "SELECT id FROM branches WHERE id IN ($1,$2) ORDER BY id FOR UPDATE",
      [d.sourceBranch, d.destinationBranch],
    );
    const inv = await one(
      tx,
      "UPDATE inventory SET quantity=quantity-$1 WHERE branch_id=$2 AND product_id=$3 AND quantity-reserved>=$1 RETURNING product_id",
      [d.quantity, d.sourceBranch, d.productId],
    );
    if (!inv) throw new AppError(409, "Insufficient unreserved source stock.");
    const tid = id();
    await tx.query(
      "INSERT INTO stock_transfers(id,source_branch,destination_branch,product_id,quantity,requested_by) VALUES ($1,$2,$3,$4,$5,$6)",
      [
        tid,
        d.sourceBranch,
        d.destinationBranch,
        d.productId,
        d.quantity,
        user.id,
      ],
    );
    await tx.query(
      "INSERT INTO stock_movements(id,branch_id,product_id,quantity,kind,reason,actor_id,reference) VALUES ($1,$2,$3,$4,'transfer_out','Branch transfer',$5,$6)",
      [id(), d.sourceBranch, d.productId, -d.quantity, user.id, `${tid}:out`],
    );
    await audit(tx, user, "stock.transfer_dispatched", tid);
    return { id: tid };
  }
  if (action === "transfer.receive") {
    const d = z.object({ id: uuid }).strict().parse(input),
      t = await one(
        tx,
        "SELECT * FROM stock_transfers WHERE id=$1 FOR UPDATE",
        [d.id],
      );
    if (!t) throw new AppError(404, "Transfer not found.");
    allow(user, ["owner", "manager", "inventory"], t.destination_branch);
    if (t.requested_by === user.id)
      throw new AppError(
        403,
        "A different receiving colleague must confirm receipt.",
      );
    if (t.status === "received") return { ok: true };
    await receiveStock(tx, user, {
      branchId: t.destination_branch,
      productId: t.product_id,
      quantity: t.quantity,
      reference: `${t.id}:in`,
      reason: `Transfer from ${t.source_branch}`,
    });
    await tx.query(
      "UPDATE stock_transfers SET status='received',received_by=$1 WHERE id=$2",
      [user.id, t.id],
    );
    await audit(tx, user, "stock.transfer_received", t.id);
    return { ok: true };
  }
  return undefined;
}
