import { doorstepProducts } from "./doorstep-products";
import { z } from "zod";
import { allow, AppError, id, type Actor } from "./auth";
import { one, type SQL } from "./db";
import { gasQuote } from "./gas-delivery";
import { audit } from "./governance";
import { doorstepEnabled, doorstepExecution } from "./doorstep-execution";
export async function doorstepAmendments(
  tx: SQL,
  user: Actor,
  action: string,
  input: unknown,
) {
  if (action.startsWith("doorstep.products."))
    return doorstepProducts(tx, user, action, input);
  if (
    [
      "doorstep.prepare",
      "doorstep.collection.report",
      "doorstep.collection.verify",
      "doorstep.dispense",
      "doorstep.cancel",
    ].includes(action)
  )
    return doorstepExecution(tx, user, action, input);
  const d = z
    .object({
      orderId: z.string().uuid(),
      version: z.number().int().nonnegative().optional(),
      amendmentId: z.string().uuid().optional(),
      consent: z.boolean().optional(),
      lines: z
        .array(
          z
            .object({
              capacityKg: z.number().positive(),
              kg: z.number().positive(),
            })
            .strict(),
        )
        .max(10)
        .optional(),
      items: z
        .array(
          z
            .object({
              productId: z.string(),
              quantity: z.number().int().positive().max(20),
            })
            .strict(),
        )
        .max(20)
        .optional(),
    })
    .strict()
    .parse(input);
  const o = await one(tx, "SELECT * FROM orders WHERE id=$1 FOR UPDATE", [
    d.orderId,
  ]);
  if (!o) throw new AppError(404, "Order not found.");
  const customer = ["customer", "commercial"].includes(user.role);
  if (customer) {
    if (o.customer_id !== user.id) throw new AppError(404, "Order not found.");
  } else {
    allow(
      user,
      ["owner", "manager", "dispatcher", "driver", "inventory", "finance"],
      o.branch_id,
    );
    if (user.role === "driver" && o.driver_id !== user.id)
      throw new AppError(404, "Order not found.");
  }
  if (action === "doorstep.list")
    return {
      amendments: (
        await tx.query(
          "SELECT m.*,(SELECT to_jsonb(pe)||jsonb_build_object('note_state',pn.state,'lines',(SELECT COALESCE(jsonb_agg(to_jsonb(pl)),'[]'::jsonb) FROM doorstep_product_lines pl WHERE pl.amendment_id=pe.amendment_id)) FROM doorstep_product_execution pe JOIN invoice_notes pn ON pn.id=pe.note_id WHERE pe.amendment_id=m.id) AS product_execution,CASE WHEN e.amendment_id IS NOT NULL THEN to_jsonb(e)||jsonb_build_object('cylinder_lines',(SELECT COALESCE(jsonb_agg(to_jsonb(cl) ORDER BY cl.position),'[]'::jsonb) FROM doorstep_cylinder_lines cl WHERE cl.amendment_id=e.amendment_id),'load_version',l.version,'meter_reading_grams',l.meter_reading_grams,'note_state',n.state) END AS execution FROM doorstep_amendments m LEFT JOIN doorstep_execution e ON e.amendment_id=m.id LEFT JOIN bulk_lpg_loads l ON l.id=e.load_id LEFT JOIN invoice_notes n ON n.id=e.note_id WHERE m.order_id=$1 ORDER BY m.created_at DESC",
          [o.id],
        )
      ).rows,
      commitEnabled: doorstepEnabled(),
      reason: doorstepEnabled()
        ? "Gas execution requires inspected cylinder, reserved vehicle buffer, independent invoice approval and verified settlement. Each gas cylinder needs its own inspected line and meter delta. Physical products require their separate manifest controls."
        : "Operational approval is required before enabling supplementary execution.",
    };
  if (o.status !== "out_for_delivery")
    throw new AppError(409, "Amendments require an active delivery visit.");
  const a = await one(
    tx,
    "SELECT * FROM delivery_attempts WHERE order_id=$1 AND state IN ('picked_up','arrived') ORDER BY assignment_version DESC LIMIT 1 FOR UPDATE",
    [o.id],
  );
  if (!a || a.driver_id !== o.driver_id)
    throw new AppError(409, "Current verified pickup required.");
  if (action === "doorstep.propose") {
    allow(user, ["driver"], o.branch_id);
    if (d.version !== Number(o.tracking_version))
      throw new AppError(409, "Order changed. Refresh before proposing.");
    if (!(d.lines?.length || d.items?.length))
      throw new AppError(400, "Add at least one item.");
    if (d.lines?.length && d.items?.length)
      throw new AppError(
        400,
        "Propose gas cylinders and physical products separately for distinct consent and custody on this same one-fee visit.",
      );
    if (
      d.items &&
      new Set(d.items.map((i) => i.productId)).size !== d.items.length
    )
      throw new AppError(
        400,
        "Combine repeated physical products into one quantity.",
      );
    const quote = await gasQuote(tx, d.lines ?? [], o.branch_id, d.items ?? []);
    // Quote is not a reservation: preserve original order and one-fee visit. Never represent branch stock as van stock.
    const aid = id();
    await tx.query(
      "INSERT INTO doorstep_amendments(id,order_id,attempt_id,driver_id,order_version,proposal,price_snapshot) VALUES($1,$2,$3,$4,$5,$6,$7)",
      [
        aid,
        o.id,
        a.id,
        user.id,
        o.tracking_version,
        JSON.stringify({ lines: d.lines ?? [], items: d.items ?? [] }),
        JSON.stringify({
          quote,
          additionalDeliveryKobo: 0,
          vanStockVerified: false,
          executable: false,
        }),
      ],
    );
    await audit(tx, user, action, aid);
    return {
      id: aid,
      state: "proposed",
      additionalDeliveryKobo: 0,
      committed: false,
    };
  }
  if (action === "doorstep.consent") {
    if (!customer)
      throw new AppError(403, "Consent must be recorded by the customer.");
    if (!d.amendmentId || d.consent === undefined)
      throw new AppError(400, "Choose the amendment and decision.");
    const m = await one(
      tx,
      "SELECT * FROM doorstep_amendments WHERE id=$1 AND order_id=$2 AND state='proposed' FOR UPDATE",
      [d.amendmentId, o.id],
    );
    if (
      !m ||
      m.attempt_id !== a.id ||
      m.order_version !== Number(o.tracking_version)
    )
      throw new AppError(409, "Proposal changed or assignment expired.");
    await tx.query(
      "UPDATE doorstep_amendments SET state=$1,customer_consent_at=now() WHERE id=$2",
      [d.consent ? "consented" : "rejected", m.id],
    );
    await audit(tx, user, action, m.id);
    return { ok: true, committed: false };
  }
  throw new AppError(
    409,
    "Amendment commit is not enabled; stock, custody and collection must not be bypassed.",
  );
}
