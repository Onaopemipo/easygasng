import { z } from "zod";
import { allow, AppError, id, recentVerification, type Actor } from "./auth";
import { one, type SQL } from "./db";
import { inventoryQualification } from "./inventory-business";
import { audit } from "./governance";
import { verifyGasDispatch } from "./gas-delivery";
import { invoiceBalance } from "./invoice-corrections";
import { requestBulkRecovery } from "./bulk-lpg-recovery";
const mass = z.number().int().nonnegative().max(1_000_000_000);
async function event(
  tx: SQL,
  user: Actor,
  loadId: string,
  kind: string,
  detail: unknown,
  orderId?: string,
) {
  await tx.query(
    "INSERT INTO bulk_lpg_events(id,load_id,order_id,kind,actor_id,detail) VALUES($1,$2,$3,$4,$5,$6)",
    [id(), loadId, orderId ?? null, kind, user.id, JSON.stringify(detail)],
  );
  await audit(tx, user, "bulk." + kind, loadId);
}
export async function bulkLPG(
  tx: SQL,
  user: Actor,
  action: string,
  input: unknown,
): Promise<any> {
  if (action === "bulk.summary") {
    allow(user, ["owner", "manager", "dispatcher", "inventory", "driver"]);
    const loads = (
      await tx.query(
        "SELECT l.*,t.driver_id,t.vehicle_id,v.label FROM bulk_lpg_loads l JOIN driver_trips t ON t.id=l.trip_id JOIN driver_vehicles v ON v.id=t.vehicle_id WHERE ($1::boolean OR l.branch_id=$2) AND ($3::boolean OR t.driver_id=$4) ORDER BY l.created_at DESC LIMIT 100",
        [
          user.role === "owner",
          user.branch_id,
          user.role !== "driver",
          user.id,
        ],
      )
    ).rows;
    for (const load of loads) {
      load.amendments = (
        await tx.query(
          "SELECT m.*,(SELECT to_jsonb(pe)||jsonb_build_object('note_state',pn.state,'lines',(SELECT COALESCE(jsonb_agg(to_jsonb(pl)),'[]'::jsonb) FROM doorstep_product_lines pl WHERE pl.amendment_id=pe.amendment_id)) FROM doorstep_product_execution pe JOIN invoice_notes pn ON pn.id=pe.note_id WHERE pe.amendment_id=m.id) AS product_execution,CASE WHEN e.amendment_id IS NOT NULL THEN to_jsonb(e)||jsonb_build_object('cylinder_lines',(SELECT COALESCE(jsonb_agg(to_jsonb(cl) ORDER BY cl.position),'[]'::jsonb) FROM doorstep_cylinder_lines cl WHERE cl.amendment_id=e.amendment_id),'load_version',l.version,'note_state',n.state) END AS execution FROM doorstep_amendments m JOIN bulk_lpg_allocations a ON a.order_id=m.order_id AND a.load_id=$1 LEFT JOIN doorstep_execution e ON e.amendment_id=m.id LEFT JOIN bulk_lpg_loads l ON l.id=e.load_id LEFT JOIN invoice_notes n ON n.id=e.note_id WHERE m.state='consented' AND (e.amendment_id IS NULL OR (e.load_id=$1 AND e.state='reserved'))",
          [load.id],
        )
      ).rows;
      load.allocations = (
        await tx.query(
          "SELECT a.*,o.reference,o.total_kobo,o.payment_method FROM bulk_lpg_allocations a JOIN orders o ON o.id=a.order_id WHERE a.load_id=$1",
          [load.id],
        )
      ).rows;
      load.events = (
        await tx.query(
          "SELECT kind,CASE WHEN $2::boolean AND kind='return.recovered' THEN jsonb_build_object('observedGrams',detail->'observedGrams','expectedGrams',detail->'expectedGrams','delta',detail->'delta','reason',detail->'reason') ELSE detail END AS detail,created_at FROM bulk_lpg_events WHERE load_id=$1 ORDER BY created_at,id",
          [load.id, user.role === "driver"],
        )
      ).rows;
    }
    return {
      loads,
      meters:
        user.role === "owner"
          ? (
              await tx.query(
                "SELECT m.*,v.label FROM bulk_lpg_meters m JOIN driver_vehicles v ON v.id=m.vehicle_id ORDER BY m.created_at DESC LIMIT 100",
              )
            ).rows
          : [],
      enabled: process.env.EASYGAS_BULK_LPG_ENABLED === "true",
      doorstepEnabled:
        process.env.EASYGAS_DOORSTEP_ENABLED === "true" &&
        (process.env.NODE_ENV !== "production" ||
          process.env.EASYGAS_FIELD_OPERATIONS_ENABLED === "true"),
      unit: "grams",
      balanceBasis:
        "Branch-owned mass inclusive of vehicle custody; not additional inventory",
    };
  }
  if (process.env.EASYGAS_BULK_LPG_ENABLED !== "true")
    throw new AppError(
      503,
      "Bulk LPG custody requires operational release approval.",
    );
  if (action === "bulk.recovery.request")
    return requestBulkRecovery(tx, user, input);
  if (["bulk.meter.recalibrate", "bulk.meter.retire"].includes(action)) {
    allow(user, ["owner"]);
    recentVerification(user);
    const d = z
      .object({
        meterId: z.string().uuid(),
        expectedCalibrationExpiresAt: z.iso.datetime(),
        expectedCalibrationReference: z.string().min(1).max(300),
        calibrationReference: z.string().trim().min(10).max(300).optional(),
        calibrationExpiresAt: z.iso.datetime().optional(),
        reason: z.string().trim().min(10).max(500),
      })
      .strict()
      .parse(input);
    const initial = await one(
      tx,
      "SELECT vehicle_id FROM bulk_lpg_meters WHERE id=$1",
      [d.meterId],
    );
    if (!initial) throw new AppError(404, "Meter not found.");
    // Match load issuance lock order. No certificate replacement during custody.
    const vehicle = await one(
      tx,
      "SELECT * FROM driver_vehicles WHERE id=$1 FOR UPDATE",
      [initial.vehicle_id],
    );
    const meter = await one(
      tx,
      "SELECT * FROM bulk_lpg_meters WHERE id=$1 FOR UPDATE",
      [d.meterId],
    );
    await inventoryQualification(
      tx,
      user.id,
      vehicle!.branch_id,
      "bulk_lpg_metering",
    );
    if (
      !meter!.active ||
      new Date(meter!.calibration_expires_at).getTime() !==
        Date.parse(d.expectedCalibrationExpiresAt) ||
      meter!.calibration_reference !== d.expectedCalibrationReference
    )
      throw new AppError(
        409,
        "Meter changed or retired. Refresh before continuing.",
      );
    if (action === "bulk.meter.recalibrate") {
      if (
        !vehicle!.active ||
        !vehicle!.lpg_suitable ||
        !d.calibrationReference ||
        !d.calibrationExpiresAt ||
        Date.parse(d.calibrationExpiresAt) <= Date.now()
      )
        throw new AppError(
          409,
          "New calibration evidence, future expiry and suitable active vehicle required.",
        );
      if (
        await one(
          tx,
          "SELECT id FROM bulk_lpg_loads WHERE meter_id=$1 AND state<>'reconciled' LIMIT 1",
          [meter!.id],
        )
      )
        throw new AppError(
          409,
          "Reconcile existing meter custody before replacing calibration evidence.",
        );
      await tx.query(
        "UPDATE bulk_lpg_meters SET calibration_reference=$1,calibration_expires_at=$2 WHERE id=$3",
        [d.calibrationReference, d.calibrationExpiresAt, meter!.id],
      );
    } else {
      // Emergency retirement must remain possible during an active load. It stops
      // further dispensing but never releases physical custody or erases evidence.
      await tx.query("UPDATE bulk_lpg_meters SET active=false WHERE id=$1", [
        meter!.id,
      ]);
    }
    await audit(tx, user, action, meter!.id, "success", {
      reason: d.reason,
      previous: {
        calibrationReference: meter!.calibration_reference,
        calibrationExpiresAt: meter!.calibration_expires_at,
        active: meter!.active,
      },
      next:
        action === "bulk.meter.retire"
          ? { active: false }
          : {
              calibrationReference: d.calibrationReference,
              calibrationExpiresAt: d.calibrationExpiresAt,
            },
    });
    return {
      ok: true,
      message:
        action === "bulk.meter.retire"
          ? "Meter retired. Existing load custody and return obligations remain."
          : "Calibration evidence updated; previous certificate retained in audit history.",
    };
  }
  if (action === "bulk.meter.register") {
    allow(user, ["owner"]);
    recentVerification(user);
    const d = z
      .object({
        vehicleId: z.string().uuid(),
        serial: z.string().trim().min(3).max(100),
        calibrationReference: z.string().trim().min(10).max(300),
        calibrationExpiresAt: z.iso.datetime(),
      })
      .strict()
      .parse(input);
    const v = await one(
      tx,
      "SELECT * FROM driver_vehicles WHERE id=$1 AND active=true FOR UPDATE",
      [d.vehicleId],
    );
    if (
      !v ||
      !v.lpg_suitable ||
      Date.parse(d.calibrationExpiresAt) <= Date.now()
    )
      throw new AppError(
        409,
        "Current calibration and suitable vehicle required.",
      );
    await inventoryQualification(tx, user.id, v.branch_id, "bulk_lpg_metering");
    const mid = id();
    await tx.query(
      "INSERT INTO bulk_lpg_meters(id,vehicle_id,serial,calibration_reference,calibration_expires_at,recorded_by) VALUES($1,$2,$3,$4,$5,$6)",
      [
        mid,
        v.id,
        d.serial,
        d.calibrationReference,
        d.calibrationExpiresAt,
        user.id,
      ],
    );
    await audit(tx, user, action, mid);
    return { id: mid };
  }
  if (action === "bulk.load.issue") {
    allow(user, ["owner", "inventory"]);
    recentVerification(user);
    const d = z
      .object({
        tripId: z.string().uuid(),
        meterId: z.string().uuid(),
        grams: mass.refine((n) => n > 0),
        meterReadingGrams: mass,
        orderIds: z.array(z.string().uuid()).max(100).default([]),
        reason: z.string().trim().min(10).max(500),
      })
      .strict()
      .parse(input);
    if (new Set(d.orderIds).size !== d.orderIds.length)
      throw new AppError(400, "Duplicate load order.");
    // Canonical orders lock first, consistently with fulfilment and cancellation.
    const orders = [];
    for (const oid of [...d.orderIds].sort()) {
      const o = await one(tx, "SELECT * FROM orders WHERE id=$1 FOR UPDATE", [
        oid,
      ]);
      if (!o) throw new AppError(404, "Load order not found.");
      orders.push(o);
    }
    const trip = await one(
      tx,
      "SELECT t.*,v.capacity_grams,v.active,v.lpg_suitable FROM driver_trips t JOIN driver_vehicles v ON v.id=t.vehicle_id AND v.branch_id=t.branch_id JOIN branches b ON b.id=t.branch_id AND b.active=true JOIN users u ON u.id=t.driver_id AND u.role='driver' AND u.active=true AND u.branch_id=t.branch_id WHERE t.id=$1 FOR UPDATE OF t,v",
      [d.tripId],
    );
    if (
      !trip ||
      trip.ended_at ||
      !trip.active ||
      !trip.lpg_suitable ||
      d.grams > Number(trip.capacity_grams) ||
      trip.driver_id === user.id
    )
      throw new AppError(
        409,
        "Active suitable trip, capacity and independent driver required.",
      );
    allow(user, ["owner", "inventory"], trip.branch_id);
    await inventoryQualification(
      tx,
      user.id,
      trip.branch_id,
      "bulk_lpg_loading",
    );
    const meter = await one(
      tx,
      "SELECT * FROM bulk_lpg_meters WHERE id=$1 AND vehicle_id=$2 AND active=true AND calibration_expires_at>now() FOR UPDATE",
      [d.meterId, trip.vehicle_id],
    );
    if (!meter)
      throw new AppError(
        409,
        "A current calibrated mass meter on this vehicle is required.",
      );
    let allocated = 0;
    const quantities: number[] = [];
    for (const order of orders) {
      allow(user, ["owner", "inventory"], order.branch_id);
      if (
        order.branch_id !== trip.branch_id ||
        order.driver_id !== trip.driver_id ||
        order.status !== "assigned"
      )
        throw new AppError(
          409,
          "Only current assigned gas orders for this trip may be loaded.",
        );
      const n = Number(
        (await one(
          tx,
          "SELECT COALESCE(sum(grams),0) AS n FROM order_gas_lines WHERE order_id=$1",
          [order.id],
        ))!.n,
      );
      if (
        !n ||
        (await one(
          tx,
          "SELECT id FROM gas_stock_movements WHERE reference IN ($1,$2)",
          [order.id + ":released", order.id + ":fulfilled"],
        ))
      )
        throw new AppError(409, "Current reserved gas lines required.");
      const prior = await one(
        tx,
        "SELECT * FROM bulk_lpg_allocations WHERE order_id=$1 FOR UPDATE",
        [order.id],
      );
      if (
        prior &&
        (!["released", "returned"].includes(prior.state) ||
          Number(prior.dispensed_grams))
      )
        throw new AppError(409, "Order gas already has vehicle custody.");
      allocated += n;
      quantities.push(n);
    }
    if (allocated > d.grams)
      throw new AppError(
        409,
        "Measured load is less than allocated order gas.",
      );
    const buffer = d.grams - allocated;
    const stock = await one(
      tx,
      "SELECT * FROM gas_stock WHERE branch_id=$1 FOR UPDATE",
      [trip.branch_id],
    );
    if (
      !stock ||
      Number(stock.reserved_grams) < allocated ||
      Number(stock.grams) - Number(stock.reserved_grams) < buffer
    )
      throw new AppError(
        409,
        "Insufficient canonical unreserved LPG for vehicle buffer.",
      );
    const lid = id();
    await tx.query(
      "INSERT INTO bulk_lpg_loads(id,trip_id,meter_id,branch_id,loaded_grams,buffer_grams,meter_reading_grams,issued_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
      [
        lid,
        trip.id,
        meter.id,
        trip.branch_id,
        d.grams,
        buffer,
        d.meterReadingGrams,
        user.id,
      ],
    );
    for (let i = 0; i < orders.length; i++)
      await tx.query(
        "INSERT INTO bulk_lpg_allocations(order_id,load_id,grams) VALUES($1,$2,$3) ON CONFLICT(order_id) DO UPDATE SET load_id=excluded.load_id,grams=excluded.grams,dispensed_grams=0,state='allocated'",
        [orders[i].id, lid, quantities[i]],
      );
    await tx.query(
      "UPDATE gas_stock SET reserved_grams=reserved_grams+$1 WHERE branch_id=$2",
      [buffer, trip.branch_id],
    );
    if (buffer)
      await tx.query(
        "INSERT INTO gas_stock_movements(id,branch_id,grams,kind,reference,actor_id,reason) VALUES($1,$2,$3,'reserved',$4,$5,$6)",
        [id(), trip.branch_id, buffer, `bulk:${lid}:buffer`, user.id, d.reason],
      );
    await event(tx, user, lid, "load.issued", {
      ...d,
      allocatedGrams: allocated,
      bufferGrams: buffer,
    });
    return { id: lid, version: 1, bufferGrams: buffer };
  }
  const d = z
    .object({
      loadId: z.string().uuid(),
      version: z.number().int().positive(),
      orderId: z.string().uuid().optional(),
      meterReadingGrams: mass.optional(),
      returnGrams: mass.optional(),
      amountKobo: z.number().int().positive().max(1000000000).optional(),
      reason: z.string().trim().min(10).max(500),
    })
    .strict()
    .parse(input);
  let order;
  if (["bulk.dispense", "bulk.collection.record"].includes(action)) {
    if (!d.orderId) throw new AppError(400, "Choose the reserved order.");
    order = await one(tx, "SELECT * FROM orders WHERE id=$1 FOR UPDATE", [
      d.orderId,
    ]);
    if (!order) throw new AppError(404, "Order not found.");
  }
  const load = await one(
    tx,
    "SELECT l.*,t.driver_id,t.ended_at,t.vehicle_id FROM bulk_lpg_loads l JOIN driver_trips t ON t.id=l.trip_id WHERE l.id=$1 FOR UPDATE OF l,t",
    [d.loadId],
  );
  if (!load) throw new AppError(404, "Load not found.");
  allow(user, ["owner", "inventory", "driver"], load.branch_id);
  if (user.role === "driver" && load.driver_id !== user.id)
    throw new AppError(404, "Load not found.");
  if (load.ended_at || Number(load.version) !== d.version)
    throw new AppError(409, "Trip or load changed. Refresh before continuing.");
  if (
    [
      "bulk.load.acknowledge",
      "bulk.dispense",
      "bulk.collection.record",
    ].includes(action) &&
    !(await one(
      tx,
      "SELECT v.id FROM driver_vehicles v JOIN branches b ON b.id=v.branch_id AND b.active=true WHERE v.id=$1 AND v.branch_id=$2 AND v.active=true AND v.lpg_suitable=true AND v.capacity_grams>=$3",
      [load.vehicle_id, load.branch_id, Number(load.loaded_grams)],
    ))
  )
    throw new AppError(
      409,
      "Active branch and suitable vehicle capacity must remain valid for dispensing custody.",
    );
  if (action === "bulk.load.acknowledge") {
    allow(user, ["driver"], load.branch_id);
    if (
      load.state !== "issued" ||
      load.issued_by === user.id ||
      d.returnGrams !== Number(load.loaded_grams) ||
      d.meterReadingGrams !== Number(load.meter_reading_grams)
    )
      throw new AppError(
        409,
        "Independent measured mass and meter acknowledgement of the issued load required.",
      );
    await inventoryQualification(
      tx,
      user.id,
      load.branch_id,
      "bulk_lpg_dispensing",
    );
    await tx.query(
      "UPDATE bulk_lpg_loads SET acknowledged_by=$1,state='active',version=version+1 WHERE id=$2",
      [user.id, load.id],
    );
  } else if (action === "bulk.collection.record") {
    allow(user, ["driver"], load.branch_id);
    const allocation = await one(
      tx,
      "SELECT order_id FROM bulk_lpg_allocations WHERE order_id=$1 AND load_id=$2 AND state='allocated'",
      [order!.id, load.id],
    );
    const attempt = await one(
      tx,
      "SELECT * FROM delivery_attempts WHERE order_id=$1 ORDER BY assignment_version DESC LIMIT 1 FOR UPDATE",
      [order!.id],
    );
    if (
      load.state !== "active" ||
      load.acknowledged_by !== user.id ||
      order!.driver_id !== user.id ||
      order!.branch_id !== load.branch_id ||
      order!.status !== "out_for_delivery" ||
      !allocation ||
      attempt?.driver_id !== user.id ||
      attempt?.state !== "arrived"
    )
      throw new AppError(
        409,
        "Current arrived delivery and acknowledged allocated custody required.",
      );
    if (
      order!.payment_method !== "cash_on_delivery" ||
      d.amountKobo !== Number(order!.total_kobo)
    )
      throw new AppError(
        409,
        "Record only the full cash amount actually collected for this cash-on-delivery order.",
      );
    const invoice = await one(
      tx,
      "SELECT * FROM customer_invoices WHERE order_id=$1",
      [order!.id],
    );
    const obligation = invoice ? await invoiceBalance(tx, invoice) : null;
    if (
      !obligation ||
      obligation.voided ||
      obligation.totalKobo !== Number(order!.total_kobo)
    )
      throw new AppError(
        409,
        "Corrected invoice collections require finance review; do not substitute the original order amount.",
      );
    const prior = await one(
      tx,
      "SELECT * FROM cash_collections WHERE order_id=$1 FOR UPDATE",
      [order!.id],
    );
    if (
      prior &&
      (prior.collector_id !== user.id ||
        Number(prior.amount_kobo) !== d.amountKobo)
    )
      throw new AppError(
        409,
        "A different collection already exists. Contact finance.",
      );
    if (prior?.verified_at)
      return {
        ok: true,
        message: "Previously recorded cash is already independently verified.",
      };
    if (
      obligation.paidKobo > 0 ||
      obligation.amountDueKobo !== Number(order!.total_kobo)
    )
      throw new AppError(
        409,
        "Existing or partial payment requires finance review. Do not collect the original invoice amount again.",
      );
    if (!prior)
      await tx.query(
        "INSERT INTO cash_collections(id,order_id,collector_id,amount_kobo) VALUES($1,$2,$3,$4)",
        [id(), order!.id, user.id, d.amountKobo],
      );
    await event(
      tx,
      user,
      load.id,
      "collection.recorded",
      {
        amountKobo: d.amountKobo,
        independentlyVerified: false,
        reason: d.reason,
      },
      order!.id,
    );
    return {
      ok: true,
      message:
        "Actual cash collection recorded. Independent finance reconciliation is required before dispensing.",
    };
  } else if (action === "bulk.dispense") {
    allow(user, ["driver"], load.branch_id);
    if (
      load.state !== "active" ||
      load.acknowledged_by !== user.id ||
      order!.driver_id !== user.id ||
      order!.branch_id !== load.branch_id ||
      order!.status !== "out_for_delivery"
    )
      throw new AppError(
        409,
        "Active acknowledged custody and current delivery required.",
      );
    await inventoryQualification(
      tx,
      user.id,
      load.branch_id,
      "bulk_lpg_dispensing",
    );
    if (
      !(await one(
        tx,
        "SELECT id FROM bulk_lpg_meters WHERE id=$1 AND vehicle_id=$2 AND active=true AND calibration_expires_at>now() FOR SHARE",
        [load.meter_id, load.vehicle_id],
      ))
    )
      throw new AppError(409, "Meter calibration is not current.");
    const attempt = await one(
      tx,
      "SELECT * FROM delivery_attempts WHERE order_id=$1 ORDER BY assignment_version DESC LIMIT 1 FOR UPDATE",
      [order!.id],
    );
    if (
      !attempt ||
      attempt.driver_id !== user.id ||
      attempt.state !== "arrived"
    )
      throw new AppError(
        409,
        "Record arrival on the current delivery attempt before dispensing.",
      );
    const paid = Number(
      (await one(
        tx,
        "SELECT COALESCE(sum(amount_kobo),0) AS n FROM verified_payments WHERE order_id=$1",
        [order!.id],
      ))!.n,
    );
    const invoice = await one(
      tx,
      "SELECT * FROM customer_invoices WHERE order_id=$1",
      [order!.id],
    );
    const obligation = invoice ? await invoiceBalance(tx, invoice) : null;
    if (!obligation || obligation.voided || obligation.amountDueKobo > 0)
      throw new AppError(
        409,
        "A current issued invoice and independently verified corrected balance are required before dispensing.",
      );
    if (
      order!.payment_status !== "verified" ||
      paid < Number(order!.total_kobo) ||
      (await one(
        tx,
        "SELECT id FROM credit_requests WHERE order_id=$1 AND status='approved' AND kind='refund'",
        [order!.id],
      ))
    )
      throw new AppError(
        409,
        "Independently verified full principal without refund required before dispensing.",
      );
    await verifyGasDispatch(tx, order!.id);
    const allocation = await one(
      tx,
      "SELECT * FROM bulk_lpg_allocations WHERE order_id=$1 AND load_id=$2 FOR UPDATE",
      [order!.id, load.id],
    );
    const delta =
      (d.meterReadingGrams ?? -1) - Number(load.meter_reading_grams);
    if (
      !allocation ||
      allocation.state !== "allocated" ||
      delta !== Number(allocation.grams) ||
      delta <= 0 ||
      Number(load.dispensed_grams) + delta >
        Number(load.loaded_grams) - Number(load.buffer_grams)
    )
      throw new AppError(
        409,
        "Meter delta must equal the complete reserved allocation; buffer is not authorised for sale.",
      );
    await tx.query(
      "UPDATE bulk_lpg_allocations SET state='dispensed',dispensed_grams=grams WHERE order_id=$1",
      [order!.id],
    );
    await tx.query(
      "UPDATE bulk_lpg_loads SET dispensed_grams=dispensed_grams+$1,meter_reading_grams=$2,version=version+1 WHERE id=$3",
      [delta, d.meterReadingGrams, load.id],
    );
  } else if (action === "bulk.return.declare") {
    allow(user, ["driver"], load.branch_id);
    if (
      await one(
        tx,
        "SELECT amendment_id FROM doorstep_execution WHERE load_id=$1 AND state='reserved' LIMIT 1",
        [load.id],
      )
    )
      throw new AppError(
        409,
        "Resolve supplementary custody and invoice obligations before returning the load.",
      );
    if (
      !["issued", "active"].includes(load.state) ||
      d.returnGrams === undefined
    )
      throw new AppError(
        409,
        "Declare the physically measured remaining load.",
      );
    await tx.query(
      "UPDATE bulk_lpg_loads SET state='returning',declared_return_grams=$1,version=version+1 WHERE id=$2",
      [d.returnGrams, load.id],
    );
  } else if (action === "bulk.return.receive") {
    allow(user, ["owner", "inventory"], load.branch_id);
    recentVerification(user);
    await inventoryQualification(
      tx,
      user.id,
      load.branch_id,
      "bulk_lpg_loading",
    );
    if (
      load.state !== "returning" ||
      user.id === load.driver_id ||
      d.returnGrams === undefined
    )
      throw new AppError(
        409,
        "Independent receipt of a declared return required.",
      );
    const expected = Number(load.loaded_grams) - Number(load.dispensed_grams);
    const matches =
      d.returnGrams === expected &&
      Number(load.declared_return_grams) === expected;
    if (matches) {
      const stock = await one(
        tx,
        "UPDATE gas_stock SET reserved_grams=reserved_grams-$1 WHERE branch_id=$2 AND reserved_grams>=$1 RETURNING branch_id",
        [Number(load.buffer_grams), load.branch_id],
      );
      if (!stock)
        throw new AppError(
          409,
          "Vehicle buffer reservation cannot be reconciled.",
        );
      if (Number(load.buffer_grams))
        await tx.query(
          "INSERT INTO gas_stock_movements(id,branch_id,grams,kind,reference,actor_id,reason) VALUES($1,$2,$3,'released',$4,$5,$6)",
          [
            id(),
            load.branch_id,
            -Number(load.buffer_grams),
            `bulk:${load.id}:return`,
            user.id,
            d.reason,
          ],
        );
      await tx.query(
        "UPDATE bulk_lpg_allocations SET state='returned' WHERE load_id=$1 AND state='allocated'",
        [load.id],
      );
    }
    await tx.query(
      "UPDATE bulk_lpg_loads SET state=$1,received_by=$2,version=version+1 WHERE id=$3",
      [matches ? "reconciled" : "held", user.id, load.id],
    );
    await event(
      tx,
      user,
      load.id,
      matches ? "return.received" : "return.discrepancy",
      {
        expectedGrams: expected,
        observedGrams: d.returnGrams,
        declaredGrams: Number(load.declared_return_grams),
        reason: d.reason,
      },
    );
    return {
      ok: matches,
      state: matches ? "reconciled" : "held",
      version: d.version + 1,
      message: matches
        ? "Measured return received and buffer reservation released."
        : "Discrepancy recorded. Stock remains reserved and trip closure is held for independent review.",
    };
  } else throw new AppError(400, "Unknown bulk custody action.");
  await event(tx, user, load.id, action.slice(5), d, d.orderId);
  return { ok: true, version: d.version + 1 };
}
