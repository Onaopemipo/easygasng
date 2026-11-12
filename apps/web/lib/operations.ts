import { deliveryCoveragePending, hasConfirmedDeliveryCoverage } from "../../../packages/business-rules/src/delivery-coverage";
import { paystackAvailability } from "./payments/runtime";
import { gatewayPolicy } from "./payments/policy";
import { applyRewardDiscount, restoreOrderDiscount } from "./rewards";
import { fulfilmentReady, beginAttempt } from "./order-tracking";
import { gasQuote, gasReservation, verifyGasDispatch } from "./gas-delivery";
import { allocateCylinders } from "./cylinder-allocation";
import { z } from "zod";
import { randomInt } from "node:crypto";
import { digest, id, allow, AppError, type Actor } from "./auth";
import { one, type SQL } from "./db";
import { audit, notify } from "./governance";
import { orderTransitions } from "../../../packages/business-rules/src/forecast";
export const checkoutSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            productId: z.string().max(100),
            quantity: z.number().int().min(1).max(20),
          })
          .strict(),
      )
      .min(0)
      .max(30),
    gasLines: z
      .array(
        z
          .object({
            capacityKg: z.number().positive().max(1000),
            kg: z.number().positive().max(1000),
          })
          .strict(),
      )
      .max(20)
      .optional(),
    pricing: z
      .object({
        priceVersion: z.number().int(),
        feeVersion: z.number().int(),
        policyVersion: z.number().int(),
        totalKobo: z.number().int().positive(),
      })
      .strict()
      .optional(),
    address: z
      .object({
        locationId: z.string().max(100).optional(),
        building: z.string().max(100).optional(),
        landmark: z.string().max(250).optional(),
        directions: z.string().max(500).optional(),
        name: z.string().min(2).max(100),
        phone: z
          .string()
          .regex(
            /^(?:\+234|0)[789][01]\d{8}$/,
            "Enter a valid Nigerian mobile number.",
          ),
        street: z.string().min(8).max(250),
        zone: z.string().min(2).max(100),
      })
      .strict(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    window: z.string().max(100),
    instructions: z.string().max(500).default(""),
    rewardOfferId: z
      .string()
      .regex(/^[a-z0-9-]{2,60}$/)
      .optional(),
    rewardPoints: z.number().int().min(1).max(1000000).optional(),
    paymentMethod: z.enum(["cash_on_delivery", "wallet", "card"]).optional(),
    source: z.enum(["WEB", "MOBILE"]).default("WEB"),
    idempotencyKey: z.string().uuid(),
  })
  .strict();
export async function settingValue(tx: SQL, key: string, scope = "lagos") {
  return (
    await one(tx, "SELECT value FROM settings WHERE key=$1 AND scope=$2", [
      key,
      scope,
    ])
  )?.value;
}
export async function checkout(
  tx: SQL,
  user: Actor,
  input: z.infer<typeof checkoutSchema>,
  assisted?: { customerId: string; reason: string },
) {
  allow(user, ["customer", "commercial", "owner", "sales", "manager"]);
  const customerId = assisted?.customerId ?? user.id;
  if (assisted) {
    allow(user, ["owner", "manager", "sales"]);
    if (
      (input.paymentMethod ?? "cash_on_delivery") !== "cash_on_delivery" ||
      input.rewardOfferId ||
      input.rewardPoints
    )
      throw new AppError(
        403,
        "Assisted orders cannot spend customer credit or rewards without customer authorisation.",
      );
    const customer = await one(
      tx,
      "SELECT id FROM users WHERE id=$1 AND active=true AND role IN ('customer','commercial') AND ($2::boolean OR branch_id=$3 OR EXISTS(SELECT 1 FROM orders WHERE customer_id=users.id AND branch_id=$3))",
      [customerId, user.role === "owner", user.branch_id],
    );
    if (!customer)
      throw new AppError(404, "Customer unavailable in your branch.");
  }
  const hash = digest(
    JSON.stringify({
      ...input,
      idempotencyKey: undefined,
      source: undefined,
      assisted: assisted ? { ...assisted, actorId: user.id } : undefined,
    }),
  );
  const prior = await one(
    tx,
    "SELECT * FROM orders WHERE customer_id=$1 AND idempotency_key=$2",
    [customerId, input.idempotencyKey],
  );
  if (prior) {
    if (assisted) allow(user, ["owner", "manager", "sales"], prior.branch_id);
    if (prior.request_hash !== hash)
      throw new AppError(
        409,
        "This checkout reference was already used for another cart.",
      );
    return prior;
  }
  const candidate = await one(
    tx,
    "SELECT id,branch_id FROM delivery_locations WHERE (($1::text IS NOT NULL AND id=$1) OR ($1::text IS NULL AND lower(name)=lower($2))) AND active=true AND visible=true AND archived=false",
    [input.address.locationId ?? null, input.address.zone],
  );
  if (!candidate)
    throw new AppError(400, "Choose an active supported delivery location.");
  const branchId = candidate.branch_id;
  // Bind legacy query literals to the approved fulfilment branch without interpolating SQL values.
  const baseTx = tx;
  tx = {
    exec: (q) => baseTx.exec(q),
    query: async (q, p = []) => {
      if (q.includes("'lagos'")) {
        q = q.replaceAll("'lagos'", "$" + (p.length + 1));
        p = [...p, branchId];
      }
      return baseTx.query(q, p);
    },
  };
  if (!["customer", "commercial", "owner"].includes(user.role))
    allow(user, ["sales", "manager"], branchId);
  // A shared branch row lock serializes reservations and duplicate checkouts, including empty inventories.
  const branch = await one(
    tx,
    "SELECT id FROM branches WHERE id='lagos' AND active=true FOR UPDATE",
  );
  if (!branch) throw new AppError(409, "This branch is not accepting orders.");
  const repeated = await one(
    tx,
    "SELECT * FROM orders WHERE customer_id=$1 AND idempotency_key=$2",
    [customerId, input.idempotencyKey],
  );
  if (repeated) {
    if (repeated.request_hash !== hash)
      throw new AppError(409, "This checkout reference was already used.");
    return repeated;
  }
  if (!(await settingValue(tx, "delivery.enabled", branchId)))
    throw new AppError(
      409,
      "Online ordering is being prepared. Please check back when delivery is enabled.",
    );
  const method = input.paymentMethod ?? "cash_on_delivery";
  if (method === "card") {
    allow(user, ["customer", "commercial"]);
    const policy = gatewayPolicy.safeParse(await settingValue(tx, "payment.gateway", branchId));
    const availability = await paystackAvailability(tx, branchId);
    if (!policy.success || !availability.available || !policy.data.channels.includes("card"))
      throw new AppError(409, "Credit / debit card checkout is currently unavailable.");
  }
  if (
    method === "wallet" &&
    !(await settingValue(tx, "wallet.enabled", branchId))
  )
    throw new AppError(409, "Purchase credit spending is not enabled.");
  if (
    method === "cash_on_delivery" &&
    !(await settingValue(tx, "payment.cod", branchId))
  )
    throw new AppError(
      409,
      "No supported payment method is currently available.",
    );
  // Lock configuration in a deterministic order before location or stock rows.
  await tx.query(
    "SELECT key FROM settings WHERE scope='lagos' AND key IN ('delivery.fee','gas.price_per_kg','gas.quantity_policy') ORDER BY key FOR UPDATE",
  );
  const location = await one(
    tx,
    "SELECT * FROM delivery_locations WHERE branch_id='lagos' AND active=true AND visible=true AND archived=false AND (($1::text IS NOT NULL AND id=$1) OR ($1::text IS NULL AND lower(name)=lower($2))) FOR UPDATE",
    [input.address.locationId ?? null, input.address.zone],
  );
  if (!location)
    throw new AppError(400, "Choose an active supported delivery location.");
  if (!hasConfirmedDeliveryCoverage(location.coverage))
    throw new AppError(
      409,
      deliveryCoveragePending,
      "DELIVERY_COVERAGE_PENDING",
    );
  input.address = {
    ...input.address,
    locationId: location.id,
    zone: location.name,
  };
  const gasLines = [...(input.gasLines ?? [])];
  const physicalItems = [];
  for (const item of input.items) {
    const p = await one(
      tx,
      "SELECT category,size_kg FROM products WHERE id=$1",
      [item.productId],
    );
    if (p?.category === "Gas refills") {
      for (let n = 0; n < item.quantity; n++)
        gasLines.push({ capacityKg: Number(p.size_kg), kg: Number(p.size_kg) });
    } else physicalItems.push(item);
  }
  if (!physicalItems.length && !gasLines.length)
    throw new AppError(400, "Choose gas or a physical product.");
  if (gasLines.length > 20)
    throw new AppError(400, "Use at most twenty cylinders per order.");
  const gas = gasLines.length ? await gasQuote(tx, gasLines, branchId) : null;
  if (gas && !input.pricing)
    throw new AppError(
      409,
      "Review and accept the current gas quotation before confirming.",
      "PRICE_REVIEW_REQUIRED",
    );
  if (
    gas &&
    (input.pricing!.priceVersion !== gas.priceVersion ||
      input.pricing!.feeVersion !== gas.feeVersion ||
      input.pricing!.policyVersion !== gas.policyVersion)
  )
    throw new AppError(
      409,
      "Pricing or quantity rules changed. Review the revised quotation.",
      "PRICE_CHANGED",
    );
  const windows = String(await settingValue(tx, "delivery.windows", branchId))
    .split(",")
    .map((s) => s.trim());
  if (!windows.includes(input.window))
    throw new AppError(400, "Choose an available delivery window.");
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const day = new Date(input.date + "T00:00:00+01:00");
  if (
    !Number.isFinite(day.getTime()) ||
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Lagos",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(day) !== input.date ||
    input.date < today ||
    day.getTime() > Date.now() + 30 * 86400000
  )
    throw new AppError(400, "Choose a delivery date within the next 30 days.");
  if (input.date === today) {
    const end = input.window.split(/[–-]/)[1]?.match(/^(\d{2}):(\d{2})$/);
    const time = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Africa/Lagos",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .format(new Date())
      .split(":")
      .map(Number);
    if (!end || time[0] * 60 + time[1] >= Number(end[1]) * 60 + Number(end[2]))
      throw new AppError(
        400,
        "That delivery window has ended. Choose a later window or date.",
      );
  }
  const capacity = Number(
    (await settingValue(tx, "delivery.capacity", branchId)) ?? 50,
  );
  const booked = Number(
    (await one(
      tx,
      "SELECT count(*) AS n FROM orders WHERE branch_id='lagos' AND delivery_date=$1 AND delivery_window=$2 AND status NOT IN ('cancelled','delivery_failed')",
      [input.date, input.window],
    ))!.n,
  );
  if (booked >= capacity)
    throw new AppError(
      409,
      "This delivery window is fully booked. Choose another window or date.",
    );
  const seen = new Set<string>();
  let subtotal = gas?.subtotalKobo ?? 0;
  const items = [];
  for (const item of [...physicalItems].sort((a, b) =>
    a.productId.localeCompare(b.productId),
  )) {
    if (seen.has(item.productId))
      throw new AppError(400, "Combine duplicate products before checkout.");
    seen.add(item.productId);
    const p = await one(
      tx,
      "SELECT p.*,i.price_kobo,i.published,i.quantity-i.reserved AS available FROM products p JOIN inventory i ON i.product_id=p.id WHERE p.id=$1 AND i.branch_id='lagos' FOR UPDATE OF i",
      [item.productId],
    );
    if (
      !p ||
      p.archived ||
      !p.published ||
      !p.price_kobo ||
      p.available < item.quantity ||
      !(await one(
        tx,
        "SELECT name FROM product_categories WHERE name=$1 AND active=true",
        [p.category],
      ))
    )
      throw new AppError(
        409,
        `${p?.name ?? "This product"} is currently unavailable.`,
      );
    const unit = Number(p.price_kobo);
    subtotal += unit * item.quantity;
    items.push({ ...item, name: p.name, unit });
  }
  const fee = Number(await settingValue(tx, "delivery.fee", branchId));
  if (!Number.isSafeInteger(subtotal) || !Number.isSafeInteger(fee) || fee < 0)
    throw new AppError(409, "Pricing is unavailable.");
  if (
    input.pricing &&
    ((input.pricing.feeVersion !== gas?.feeVersion && gas) ||
      input.pricing.totalKobo !== subtotal + fee)
  )
    throw new AppError(
      409,
      "The quotation changed. Review and accept the revised total.",
      "PRICE_CHANGED",
    );
  if (gas) {
    const requested = gas.lines.reduce((n, g) => n + g.grams, 0);
    const reserved = await one(
      tx,
      "UPDATE gas_stock SET reserved_grams=reserved_grams+$1 WHERE branch_id='lagos' AND grams-reserved_grams>=$1 RETURNING branch_id",
      [requested],
    );
    if (!reserved)
      throw new AppError(
        409,
        "Insufficient verified gas stock for this order.",
      );
  }
  const code = String(randomInt(100000, 1000000));
  const orderId = id(),
    ref = `EG-${new Date().getFullYear()}-${randomSuffix()}`;
  const order = await one(
    tx,
    "INSERT INTO orders(delivery_code_hash,delivery_code_expires_at,id,reference,customer_id,branch_id,payment_method,subtotal_kobo,delivery_kobo,total_kobo,address,delivery_date,delivery_window,instructions,idempotency_key,request_hash,order_source,assisted_by,assisted_reason) VALUES ($13,$14,$1,$2,$3,'lagos',$15,$4,$5,$6,$7,$8,$9,$10,$11,$12,$16,$17,$18) RETURNING *",
    [
      orderId,
      ref,
      customerId,
      subtotal,
      fee,
      subtotal + fee,
      JSON.stringify(input.address),
      input.date,
      input.window,
      input.instructions,
      input.idempotencyKey,
      hash,
      digest(code),
      new Date(day.getTime() + 48 * 60 * 60 * 1000),
      method,
      assisted ? "PHONE_ASSISTED" : input.source,
      assisted ? user.id : null,
      assisted?.reason ?? null,
    ],
  );
  await tx.query(
    "UPDATE orders SET location_id=$1,location_snapshot=$2,pricing_snapshot=$3 WHERE id=$4",
    [
      location.id,
      JSON.stringify({
        id: location.id,
        name: location.name,
        city: location.city,
        state: location.state,
        version: location.version,
      }),
      JSON.stringify({
        gasPriceKobo: gas?.priceKobo,
        gasPriceVersion: gas?.priceVersion,
        feeKobo: fee,
        feeVersion: gas?.feeVersion,
      }),
      orderId,
    ],
  );
  if (gas) {
    const policy = await one(
      tx,
      "SELECT value FROM settings WHERE key=$1 AND scope=$2",
      ["location." + location.id, branchId],
    );
    if (policy?.value?.requiresAddressConfirmation !== false)
      await tx.query(
        "UPDATE orders SET operational_review='Confirm the actual street address against the approved delivery coverage before dispatch.' WHERE id=$1",
        [orderId],
      );
  }
  if (gas) {
    for (const g of gas.lines)
      await tx.query(
        "INSERT INTO order_gas_lines(id,order_id,capacity_grams,grams,unit_price_kobo,subtotal_kobo,pricing_version) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [
          id(),
          orderId,
          g.capacityGrams,
          g.grams,
          gas.priceKobo,
          g.subtotalKobo,
          gas.priceVersion,
        ],
      );
    await tx.query(
      "INSERT INTO gas_stock_movements(id,branch_id,grams,kind,reference,actor_id,reason) VALUES ($1,'lagos',$2,'reserved',$3,$4,$5)",
      [
        id(),
        gas.lines.reduce((n, g) => n + g.grams, 0),
        `${orderId}:reserved`,
        user.id,
        ref,
      ],
    );
  }
  await allocateCylinders(tx, user, branchId, items, { orderId });
  for (const item of items) {
    await tx.query(
      "INSERT INTO order_items(order_id,product_id,name,quantity,unit_price_kobo) VALUES ($1,$2,$3,$4,$5)",
      [orderId, item.productId, item.name, item.quantity, item.unit],
    );
    await tx.query(
      "UPDATE inventory SET reserved=reserved+$1 WHERE branch_id='lagos' AND product_id=$2",
      [item.quantity, item.productId],
    );
    await tx.query(
      "INSERT INTO stock_movements(id,branch_id,product_id,quantity,kind,reason,actor_id,reference) VALUES ($1,'lagos',$2,$3,'reserved',$4,$5,$6)",
      [
        id(),
        item.productId,
        item.quantity,
        ref,
        user.id,
        `${orderId}:reserve:${item.productId}`,
      ],
    );
  }
  await tx.query(
    "INSERT INTO order_events(id,order_id,status,actor_id,note) VALUES ($1,$2,'placed',$3,'Order placed; payment remains unverified.')",
    [id(), orderId, user.id],
  );
  await audit(
    tx,
    user,
    assisted ? "order.phone_assisted" : "order.placed",
    orderId,
    "success",
    {
      customerId,
      source: assisted ? "PHONE_ASSISTED" : input.source,
      reason: assisted?.reason,
    },
  );
  if (input.rewardOfferId && !input.rewardPoints)
    throw new AppError(400, "Choose the points required by this offer.");
  const discount = input.rewardPoints
    ? await applyRewardDiscount(
        tx,
        user,
        orderId,
        input.rewardPoints,
        input.rewardOfferId,
      )
    : 0;
  if (discount) {
    order!.reward_discount_kobo = discount;
    order!.total_kobo = subtotal + fee - discount;
  }
  if (method === "wallet") {
    await tx.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [user.id]);
    const balance = Number(
      (await one(
        tx,
        "SELECT COALESCE(sum(amount_kobo),0) AS n FROM wallet_entries WHERE customer_id=$1",
        [user.id],
      ))!.n,
    );
    if (balance < subtotal + fee - discount)
      throw new AppError(
        409,
        "Insufficient purchase credit. Choose another payment method.",
      );
    await tx.query(
      "INSERT INTO wallet_entries(id,customer_id,amount_kobo,kind,reference) VALUES ($1,$2,$3,'order_payment',$4)",
      [id(), user.id, -(subtotal + fee - discount), `order:${orderId}`],
    );
    await tx.query(
      "INSERT INTO verified_payments(id,order_id,reference,amount_kobo,method,verified_by) VALUES ($1,$2,$3,$4,'wallet',$5)",
      [id(), orderId, `wallet:${orderId}`, subtotal + fee - discount, user.id],
    );
    await tx.query("UPDATE orders SET payment_status='verified' WHERE id=$1", [
      orderId,
    ]);
    order!.payment_status = "verified";
  }
  await notify(
    tx,
    customerId,
    "Delivery confirmation code",
    `Your delivery confirmation code is ${code}. Share it only after receiving all items.`,
    orderId,
  );
  await notify(
    tx,
    customerId,
    "Order placed",
    `${ref} has been received. ${method === "wallet" ? "Paid using purchase credit." : method === "card" ? "Card payment is required before dispatch. Complete secure checkout from My Orders." : "Payment is due on delivery."}`,
    orderId,
  );
  return order;
}
function randomSuffix() {
  return id().slice(0, 8).toUpperCase();
}
export async function transitionOrder(
  tx: SQL,
  user: Actor,
  input: {
    id: string;
    status: string;
    note: string;
    driverId?: string;
    version?: number;
    failureReason?: string;
  },
) {
  const o = await one(tx, "SELECT * FROM orders WHERE id=$1 FOR UPDATE", [
    input.id,
  ]);
  if (!o) throw new AppError(404, "Order not found.");
  if (["customer", "commercial"].includes(user.role)) {
    if (
      o.customer_id !== user.id ||
      input.status !== "cancelled" ||
      o.status !== "placed"
    )
      throw new AppError(
        403,
        "You can only cancel your own newly placed orders.",
      );
  } else {
    allow(user, ["owner", "manager", "dispatcher", "driver"], o.branch_id);
    if (
      user.role === "driver" &&
      (o.driver_id !== user.id ||
        !["out_for_delivery", "delivery_failed"].includes(input.status))
    )
      throw new AppError(403, "You can only update your assigned deliveries.");
  }
  if (
    input.version !== undefined &&
    Number(o.tracking_version) !== input.version
  )
    throw new AppError(409, "This order changed. Refresh before retrying.");
  if (input.status !== "cancelled") {
    const branch = await one(
      tx,
      "SELECT active FROM branches WHERE id=$1 FOR UPDATE",
      [o.branch_id],
    );
    if (!branch?.active)
      throw new AppError(409, "This fulfilment branch is not active.");
  }
  if (!orderTransitions[o.status]?.includes(input.status))
    throw new AppError(409, "This order status transition is not allowed.");
  if (input.status === "delivered")
    throw new AppError(
      409,
      "Use delivery confirmation with the customer code to complete this order.",
    );
  if (["assigned", "out_for_delivery"].includes(input.status))
    await fulfilmentReady(
      tx,
      input.status === "assigned" ? { ...o, driver_id: input.driverId } : o,
    );
  if (input.status === "assigned") {
    await tx.query("SELECT id FROM branches WHERE id=$1 FOR UPDATE", [
      o.branch_id,
    ]);
    const capacity = Number(
      await settingValue(tx, "delivery.capacity", o.branch_id),
    );
    const booked = Number(
      (await one(
        tx,
        "SELECT count(*) AS n FROM orders WHERE branch_id=$1 AND delivery_date=$2 AND delivery_window=$3 AND id<>$4 AND status NOT IN ('cancelled','delivery_failed')",
        [o.branch_id, o.delivery_date, o.delivery_window, o.id],
      ))!.n,
    );
    if (booked >= capacity)
      throw new AppError(
        409,
        "This delivery window is fully booked. Rebook the delivery before assigning it.",
      );
    if (!input.driverId) throw new AppError(400, "Choose an eligible driver.");
    const driver = await one(
      tx,
      "SELECT id FROM users WHERE id=$1 AND role='driver' AND active=true AND branch_id=$2",
      [input.driverId, o.branch_id],
    );
    if (!driver) throw new AppError(400, "Driver unavailable in this branch.");
    await beginAttempt(tx, o, input.driverId);
    await tx.query("UPDATE orders SET driver_id=$1 WHERE id=$2", [
      driver.id,
      o.id,
    ]);
  }
  const attempt = await one(
    tx,
    "SELECT * FROM delivery_attempts WHERE order_id=$1 ORDER BY assignment_version DESC LIMIT 1 FOR UPDATE",
    [o.id],
  );
  if (
    input.status === "out_for_delivery" &&
    (!attempt || attempt.state !== "picked_up")
  )
    throw new AppError(
      409,
      "Confirm the complete pickup manifest before dispatch.",
    );
  if (input.status === "delivery_failed" && attempt) {
    await tx.query(
      "UPDATE delivery_attempts SET state='failed',completed_at=now() WHERE id=$1",
      [attempt.id],
    );
    await tx.query(
      "INSERT INTO delivery_evidence(id,attempt_id,actor_id,kind,detail) VALUES($1,$2,$3,'failed',$4)",
      [
        id(),
        attempt.id,
        user.id,
        JSON.stringify({
          reason: input.note,
          category: input.failureReason ?? "unspecified_legacy",
          severity:
            input.failureReason === "damaged_unsafe_cylinder"
              ? "critical"
              : "medium",
          customerSafeMessage:
            "Dispatch is reviewing the unsuccessful delivery and will confirm the next step.",
          owner: "dispatch",
          nextAction:
            "Dispatch review; receive any held goods before reassignment",
        }),
      ],
    );
  }
  if (input.status === "delivery_failed" && attempt) {
    const incidentId = id();
    await tx.query(
      "INSERT INTO operational_incidents(id,branch_id,severity,category,target,detail,owner_role) VALUES($1,$2,$5,'delivery_failure',$3,$4,'dispatcher') ON CONFLICT(category,target) DO NOTHING",
      [
        incidentId,
        o.branch_id,
        attempt.id,
        `Order ${o.reference} [${input.failureReason ?? "unspecified_legacy"}]: ${input.note}. Next step: dispatch review; physically reconcile held goods before reassignment.`,
        input.failureReason === "damaged_unsafe_cylinder"
          ? "critical"
          : "medium",
      ],
    );
  }
  if (input.status === "cancelled") {
    if (attempt?.picked_up_at && attempt.state !== "returned")
      throw new AppError(
        409,
        "Physically receive and inspect the held goods before cancellation.",
      );
    await gasReservation(tx, user, o.id, "released");
    await tx.query("SELECT id FROM branches WHERE id=$1 FOR UPDATE", [
      o.branch_id,
    ]);
    const items = (
      await tx.query(
        "SELECT * FROM order_items WHERE order_id=$1 ORDER BY product_id",
        [o.id],
      )
    ).rows;
    for (const item of items) {
      await tx.query(
        "UPDATE inventory SET reserved=reserved-$1 WHERE branch_id=$2 AND product_id=$3",
        [item.quantity, o.branch_id, item.product_id],
      );
      await tx.query(
        "INSERT INTO stock_movements(id,branch_id,product_id,quantity,kind,reason,actor_id,reference) VALUES ($1,$2,$3,$4,'released',$5,$6,$7)",
        [
          id(),
          o.branch_id,
          item.product_id,
          item.quantity,
          input.note,
          user.id,
          `${o.id}:release:${item.product_id}`,
        ],
      );
    }
    await tx.query(
      "UPDATE cylinder_allocations SET state='released' WHERE order_id=$1 AND state='reserved'",
      [o.id],
    );
    await restoreOrderDiscount(tx, o.id);
    if (o.payment_method === "wallet" && o.payment_status === "verified") {
      await tx.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [
        o.customer_id,
      ]);
      await tx.query(
        "INSERT INTO wallet_entries(id,customer_id,amount_kobo,kind,reference) VALUES ($1,$2,$3,'cancelled_order',$4) ON CONFLICT(reference) DO NOTHING",
        [id(), o.customer_id, o.total_kobo, `cancellation:${o.id}`],
      );
      await tx.query(
        "UPDATE orders SET payment_status='refunded' WHERE id=$1",
        [o.id],
      );
    }
  }
  await tx.query("UPDATE orders SET status=$1 WHERE id=$2", [
    input.status,
    o.id,
  ]);
  await tx.query(
    "INSERT INTO order_events(id,order_id,status,actor_id,note) VALUES ($1,$2,$3,$4,$5)",
    [id(), o.id, input.status, user.id, input.note],
  );
  await audit(tx, user, "order.status_changed", o.id, "success", {
    from: o.status,
    to: input.status,
  });
  return { ok: true };
}
export async function receiveStock(
  tx: SQL,
  user: Actor,
  input: {
    productId: string;
    quantity: number;
    reason: string;
    reference: string;
    branchId: string;
  },
) {
  allow(user, ["owner", "manager", "inventory"], input.branchId);
  await tx.query("SELECT id FROM branches WHERE id=$1 FOR UPDATE", [
    input.branchId,
  ]);
  const eligibleProduct = await one(
    tx,
    "SELECT category FROM products WHERE id=$1 AND archived=false",
    [input.productId],
  );
  if (!eligibleProduct || eligibleProduct.category === "Gas refills")
    throw new AppError(
      400,
      "Use the bulk gas kilogram receipt workflow for gas; choose an active physical product.",
    );
  if (
    !(await one(tx, "SELECT id FROM branches WHERE id=$1 AND active=true", [
      input.branchId,
    ]))
  )
    throw new AppError(409, "The receiving branch is inactive.");
  const prior = await one(
    tx,
    "SELECT * FROM stock_movements WHERE reference=$1",
    [input.reference],
  );
  if (prior) {
    if (
      prior.branch_id !== input.branchId ||
      prior.product_id !== input.productId ||
      prior.quantity !== input.quantity
    )
      throw new AppError(
        409,
        "This receipt reference already exists with different details.",
      );
    return { ok: true };
  }
  const row = await one(
    tx,
    "UPDATE inventory SET quantity=quantity+$1 WHERE branch_id=$2 AND product_id=$3 RETURNING *",
    [input.quantity, input.branchId, input.productId],
  );
  if (!row) throw new AppError(404, "Product inventory not found.");
  await tx.query(
    "INSERT INTO stock_movements(id,branch_id,product_id,quantity,kind,reason,actor_id,reference) VALUES ($1,$2,$3,$4,'received',$5,$6,$7)",
    [
      id(),
      input.branchId,
      input.productId,
      input.quantity,
      input.reason,
      user.id,
      input.reference,
    ],
  );
  await audit(tx, user, "inventory.received", input.productId, "success", {
    quantity: input.quantity,
    branch: input.branchId,
  });
  return { ok: true };
}
