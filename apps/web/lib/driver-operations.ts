import { vehiclePayload } from "./vehicle-manifest-schema";
import {
  confirmDispatchDestination,
  validateRouteEstimate,
} from "./dispatch-routing";
import { vehicleReady } from "./fleet-constraints";
import { z } from "zod";
import { one, type SQL } from "./db";
import { allow, AppError, id, recentVerification, type Actor } from "./auth";
import { audit, notify, propose } from "./governance";
import {
  recentTripFix,
  tripLocationEvidence,
  tripMetrics,
} from "../../../packages/business-rules/src/trip-metrics";
import { canonicalRequest } from "./business-operation";
import { implausibleRiderSegment } from "../../../packages/business-rules/src/rider-location";
import { transitionOrder } from "./operations";
import { fulfilmentReady, beginAttempt } from "./order-tracking";
const uid = z.string().uuid();
export async function driverOperations(
  tx: SQL,
  user: Actor,
  action: string,
  input: unknown,
): Promise<any> {
  if (action === "dispatch.destination.confirm")
    return confirmDispatchDestination(tx, user, input);
  if (action === "fleet.vehicle.payload.request") {
    const d = vehiclePayload
      .extend({ reason: z.string().trim().min(10).max(1000) })
      .parse(input);
    allow(user, ["owner", "inventory"]);
    recentVerification(user);
    const v = await one(
      tx,
      "SELECT * FROM driver_vehicles WHERE id=$1 AND active=true",
      [d.vehicleId],
    );
    if (!v) throw new AppError(404, "Vehicle not found.");
    allow(user, ["owner", "inventory"], v.branch_id);
    const key = "vehicle_payload." + v.id;
    await tx.query(
      "INSERT INTO setting_definitions(key,label,category,description,owner_role,risk,value_type,propose_roles,approve_roles,view_roles,required_roles,additional_verification) VALUES($1,$2,'Delivery','Measured/certified physical product payload capacity. Cannot be reduced below actual vehicle stock.','owner',3,'vehicle_payload','[\"owner\",\"inventory\"]','[\"owner\",\"safety_officer\"]','[\"owner\",\"inventory\",\"safety_officer\"]','[\"safety_officer\"]',true) ON CONFLICT(key) DO NOTHING",
      [key, v.label + " physical payload"],
    );
    await tx.query(
      "INSERT INTO settings(key,scope,value) VALUES($1,$2,'null'::jsonb) ON CONFLICT DO NOTHING",
      [key, v.branch_id],
    );
    const setting = await one(
      tx,
      "SELECT version FROM settings WHERE key=$1 AND scope=$2",
      [key, v.branch_id],
    );
    const { reason, ...value } = d;
    return propose(tx, user, {
      key,
      scope: v.branch_id,
      version: setting!.version,
      value,
      reason,
    });
  }
  if (action === "fleet.vehicle.create") {
    allow(user, ["owner"]);
    recentVerification(user);
    const d = z
      .object({
        branchId: z.string(),
        label: z.string().trim().min(3).max(100),
        capacityGrams: z.number().int().positive().max(10000000),
        lpgSuitable: z.boolean(),
        estimatedLitresPer100km: z.number().positive().max(100).optional(),
        physicalCapacityGrams: z
          .number()
          .int()
          .positive()
          .max(10000000)
          .optional(),
      })
      .strict()
      .parse(input);
    allow(user, ["owner"], d.branchId);
    if (
      !(await one(tx, "SELECT id FROM branches WHERE id=$1 AND active=true", [
        d.branchId,
      ]))
    )
      throw new AppError(400, "Choose an active branch.");
    const vid = id();
    await tx.query(
      "INSERT INTO driver_vehicles(id,branch_id,label,capacity_grams,lpg_suitable,estimated_litres_per_100km,physical_capacity_grams) VALUES($1,$2,$3,$4,$5,$6,$7)",
      [
        vid,
        d.branchId,
        d.label,
        d.capacityGrams,
        d.lpgSuitable,
        d.estimatedLitresPer100km ?? null,
        d.physicalCapacityGrams ?? null,
      ],
    );
    await audit(tx, user, action, vid);
    return { id: vid };
  }
  if (action === "trip.start") {
    allow(user, ["driver"]);
    const d = z
      .object({
        vehicleId: uid,
        startOdometer: z.number().nonnegative().max(10000000),
        locationConsent: z.boolean(),
      })
      .strict()
      .parse(input);
    const v = await one(
      tx,
      "SELECT v.* FROM driver_vehicles v JOIN branches b ON b.id=v.branch_id AND b.active=true WHERE v.id=$1 AND v.active=true FOR UPDATE OF v",
      [d.vehicleId],
    );
    if (!v || v.branch_id !== user.branch_id || !v.lpg_suitable)
      throw new AppError(
        409,
        "An active suitable vehicle in your branch is required.",
      );
    const tid = id();
    await tx.query(
      "INSERT INTO driver_trips(id,driver_id,vehicle_id,branch_id,start_odometer,location_consent) VALUES($1,$2,$3,$4,$5,$6)",
      [tid, user.id, v.id, user.branch_id, d.startOdometer, d.locationConsent],
    );
    await audit(tx, user, action, tid);
    return { id: tid };
  }
  if (action === "fleet.summary") {
    allow(user, ["owner", "manager", "dispatcher", "finance", "driver"]);
    const vehicles = (
      await tx.query(
        "SELECT * FROM driver_vehicles WHERE ($1::boolean OR branch_id=$2)",
        [user.role === "owner", user.branch_id],
      )
    ).rows;
    const trips = (
      await tx.query(
        "SELECT t.*,v.label,v.estimated_litres_per_100km FROM driver_trips t JOIN driver_vehicles v ON v.id=t.vehicle_id WHERE ($1::boolean OR t.branch_id=$2) AND ($3::boolean OR t.driver_id=$4) ORDER BY t.started_at DESC LIMIT 100",
        [
          user.role === "owner",
          user.branch_id,
          user.role !== "driver",
          user.id,
        ],
      )
    ).rows;
    for (const t of trips) {
      const e = (
        await tx.query(
          "SELECT * FROM trip_events WHERE trip_id=$1 ORDER BY sequence",
          [t.id],
        )
      ).rows;
      t.nextSequence =
        e.reduce((n, e) => Math.max(n, Number(e.sequence)), 0) + 1;
      const gps = e
        .filter((e) => e.kind === "gps")
        .map((e) => ({
          ...e.payload,
          recordedAt: new Date(e.recorded_at).toISOString(),
          receivedAt: new Date(e.created_at).toISOString(),
        }));
      t.location = tripLocationEvidence(
        gps,
        Date.now(),
        t.location_consent === true,
        Boolean(t.ended_at),
      );
      t.metrics = tripMetrics(
        gps,
        Number(t.start_odometer),
        t.end_odometer === null ? null : Number(t.end_odometer),
        t.estimated_litres_per_100km === null
          ? null
          : Number(t.estimated_litres_per_100km),
      );
      t.fuelPurchases = e
        .filter((e) => e.kind === "fuel")
        .map((e) => e.payload);
      t.connectivity = recentTripFix(
        gps,
        Date.now(),
        t.location_consent === true,
        Boolean(t.ended_at),
      )
        ? "recent_location"
        : "location_unavailable";
    }
    return {
      vehicles,
      trips,
      branches: (
        await tx.query(
          "SELECT id,name,active FROM branches WHERE ($1::boolean OR id=$2)",
          [user.role === "owner", user.branch_id],
        )
      ).rows,
    };
  }
  if (action === "dispatch.board") {
    allow(user, ["owner", "manager", "dispatcher"]);
    const orders = (
      await tx.query(
        "SELECT o.id,o.reference,o.branch_id,o.address,o.delivery_date,o.delivery_window,o.status,o.driver_id,o.tracking_version,((SELECT COALESCE(sum(g.grams),0) FROM order_gas_lines g WHERE g.order_id=o.id)+(SELECT COALESCE(sum(i.quantity*i.gas_grams_per_unit),0) FROM order_items i WHERE i.order_id=o.id AND i.gas_grams_per_unit IS NOT NULL)) AS gas_grams FROM orders o WHERE ($1::boolean OR o.branch_id=$2) AND o.status IN ('accepted','preparing','assigned','out_for_delivery') GROUP BY o.id ORDER BY o.delivery_date,o.delivery_window,o.created_at",
        [user.role === "owner", user.branch_id],
      )
    ).rows;
    const drivers = (
      await tx.query(
        "SELECT u.id,u.name,u.branch_id,u.driver_available,t.id AS trip_id,t.vehicle_id,v.capacity_grams,v.lpg_suitable,(SELECT COALESCE(sum(l.buffer_grams+(SELECT COALESCE(sum(e.grams-(SELECT COALESCE(sum(cl.grams),0) FROM doorstep_cylinder_lines cl WHERE cl.amendment_id=e.amendment_id AND cl.state='dispensed')),0) FROM doorstep_execution e WHERE e.load_id=l.id AND e.state='reserved')),0) FROM bulk_lpg_loads l WHERE l.trip_id=t.id AND l.state<>'reconciled') AS supplementary_custody_grams FROM users u LEFT JOIN driver_trips t ON t.driver_id=u.id AND t.ended_at IS NULL LEFT JOIN driver_vehicles v ON v.id=t.vehicle_id AND v.active=true WHERE u.role='driver' AND u.active=true AND ($1::boolean OR u.branch_id=$2)",
        [user.role === "owner", user.branch_id],
      )
    ).rows;
    for (const o of orders) {
      o.destination = await one(
        tx,
        "SELECT id,revision,latitude,longitude FROM dispatch_destinations WHERE order_id=$1 ORDER BY revision DESC LIMIT 1",
        [o.id],
      );
      o.routeEstimates = (
        await tx.query(
          "SELECT id,driver_id,metres,seconds,operating_kobo,plan,expires_at FROM dispatch_route_estimates WHERE order_id=$1 AND expires_at>now() ORDER BY created_at DESC LIMIT 24",
          [o.id],
        )
      ).rows;
      o.area = o.address?.zone ?? o.address?.area ?? "Unresolved address";
      o.recommendations = drivers
        .filter(
          (d) => d.branch_id === o.branch_id && d.driver_available && d.trip_id && d.lpg_suitable,
        )
        .map((d) => {
          const load = orders
            .filter((other) => other.driver_id === d.id && other.id !== o.id)
            .reduce((s, x) => s + Number(x.gas_grams), 0);
          return {
            driverId: d.id,
            name: d.name,
            remainingGrams: Math.max(
              0,
              Number(d.capacity_grams) -
                load -
                Number(d.supplementary_custody_grams),
            ),
            supplementaryCustodyGrams: Number(d.supplementary_custody_grams),
            eligible:
              load +
                Number(o.gas_grams) +
                Number(d.supplementary_custody_grams) <=
              Number(d.capacity_grams),
            reason:
              "Active branch trip, suitable vehicle, assigned gas demand and extra vehicle LPG custody included; conservative capacity estimate, not a proximity or route-time promise. Final assignment revalidates all fulfilment controls.",
          };
        })
        .sort((a, b) => b.remainingGrams - a.remainingGrams);
    }
    return { orders, drivers, autoAssignmentEnabled: false };
  }
  if (["dispatch.assign", "dispatch.reassign"].includes(action)) {
    allow(user, ["owner", "manager", "dispatcher"]);
    const d = z
      .object({
        orderId: uid,
        driverId: uid,
        version: z.number().int().nonnegative(),
        reason: z.string().min(10).max(500),
        routeEstimateId: uid.optional(),
      })
      .strict()
      .parse(input);
    const o = await one(tx, "SELECT * FROM orders WHERE id=$1 FOR UPDATE", [
      d.orderId,
    ]);
    if (!o) throw new AppError(404, "Order not found.");
    allow(user, ["owner", "manager", "dispatcher"], o.branch_id);
    const driver = await one(
      tx,
      "SELECT * FROM users WHERE id=$1 AND role='driver' AND active=true FOR UPDATE",
      [d.driverId],
    );
    if (!driver || driver.branch_id !== o.branch_id)
      throw new AppError(409, "Driver branch is ineligible.");
    if (!driver.driver_available) throw new AppError(409, "Driver availability is off; choose an available driver.");
    await vehicleReady(tx, driver.id, o.id, o.branch_id);
    if (d.routeEstimateId)
      await validateRouteEstimate(tx, user, d.routeEstimateId, o.id, driver.id);
    await audit(tx, user, "dispatch.routing_basis", o.id, "success", {
      driverId: driver.id,
      routeEstimateId: d.routeEstimateId ?? null,
      routingMode: d.routeEstimateId ? "road_estimate" : "manual",
      reason: d.reason,
    });
    if (action === "dispatch.reassign") {
      if (
        o.status !== "assigned" ||
        o.driver_id === driver.id ||
        Number(o.tracking_version) !== d.version
      )
        throw new AppError(
          409,
          "Only a current unpicked assignment can be reassigned to a different driver.",
        );
      const prior = await one(
        tx,
        "SELECT * FROM delivery_attempts WHERE order_id=$1 ORDER BY assignment_version DESC LIMIT 1 FOR UPDATE",
        [o.id],
      );
      if (!prior || prior.state !== "assigned" || prior.picked_up_at)
        throw new AppError(
          409,
          "Receive and inspect held goods before reassignment.",
        );
      await fulfilmentReady(tx, { ...o, driver_id: driver.id });
      await tx.query(
        "UPDATE delivery_attempts SET state='returned',completed_at=now() WHERE id=$1",
        [prior.id],
      );
      await tx.query(
        "INSERT INTO delivery_evidence(id,attempt_id,actor_id,kind,detail) VALUES($1,$2,$3,'rescheduled',$4)",
        [
          id(),
          prior.id,
          user.id,
          JSON.stringify({ reason: d.reason, supersededBeforePickup: true }),
        ],
      );
      await beginAttempt(tx, o, driver.id);
      await tx.query(
        "UPDATE delivery_attempts SET requires_ack=true WHERE order_id=$1 AND state='assigned'",
        [o.id],
      );
      await tx.query("UPDATE orders SET driver_id=$1 WHERE id=$2", [
        driver.id,
        o.id,
      ]);
      await tx.query(
        "INSERT INTO order_events(id,order_id,status,actor_id,note) VALUES($1,$2,'assigned',$3,$4)",
        [id(), o.id, user.id, d.reason],
      );
      await notify(
        tx,
        prior.driver_id,
        "Assignment changed",
        "Dispatch reassigned a visit. Previous assignment access has been revoked.",
        o.id,
      );
      await notify(
        tx,
        driver.id,
        "Delivery assigned",
        "A delivery assignment requires your acknowledgement.",
        o.id,
      );
      await audit(tx, user, action, o.id, "success", {
        reason: d.reason,
        previousDriver: prior.driver_id,
        driverId: driver.id,
      });
      return { ok: true };
    }
    await fulfilmentReady(tx, o);
    const result = await transitionOrder(tx, user, {
      id: o.id,
      status: "assigned",
      driverId: driver.id,
      note: d.reason,
      version: d.version,
    });
    await tx.query(
      "UPDATE delivery_attempts SET requires_ack=true WHERE order_id=$1 AND state='assigned'",
      [o.id],
    );
    return result;
  }
  if (action === "dispatch.respond") {
    allow(user, ["driver"]);
    const d = z
      .object({
        orderId: uid,
        version: z.number().int().nonnegative(),
        decision: z.enum(["acknowledged", "rejected"]),
        reason: z.string().min(5).max(500),
      })
      .strict()
      .parse(input);
    const o = await one(tx, "SELECT * FROM orders WHERE id=$1 FOR UPDATE", [
      d.orderId,
    ]);
    if (!o || o.driver_id !== user.id || o.branch_id !== user.branch_id)
      throw new AppError(404, "Assignment not found.");
    if (o.status !== "assigned" || Number(o.tracking_version) !== d.version)
      throw new AppError(409, "Assignment changed.");
    const a = await one(
      tx,
      "SELECT * FROM delivery_attempts WHERE order_id=$1 AND state='assigned' ORDER BY assignment_version DESC LIMIT 1 FOR UPDATE",
      [o.id],
    );
    if (!a || a.driver_id !== user.id)
      throw new AppError(409, "Assignment changed.");
    const branch = await one(tx, "SELECT id FROM branches WHERE id=$1 AND active=true FOR UPDATE", [o.branch_id]);
    if (!branch) throw new AppError(409, "Assignment branch is inactive.");
    if (new Date(o.delivery_code_expires_at).getTime() <= Date.now())
      throw new AppError(409, "Assignment authorisation expired; dispatch must renew it.");
    const priorResponse = await one(
      tx,
      "SELECT decision,reason FROM dispatch_responses WHERE attempt_id=$1",
      [a.id],
    );
    if (priorResponse) {
      if (
        priorResponse.decision === d.decision &&
        priorResponse.reason === d.reason
      )
        return { ok: true, replayed: true };
      throw new AppError(
        409,
        "This assignment response is already recorded. Dispatch must review a changed decision.",
      );
    }
    await tx.query(
      "INSERT INTO dispatch_responses(id,attempt_id,driver_id,decision,reason) VALUES($1,$2,$3,$4,$5)",
      [id(), a.id, user.id, d.decision, d.reason],
    );
    const dispatchers = (
      await tx.query(
        "SELECT id FROM users WHERE active=true AND (role='owner' OR (role='dispatcher' AND branch_id=$1))",
        [o.branch_id],
      )
    ).rows;
    for (const dispatcher of dispatchers)
      await notify(
        tx,
        dispatcher.id,
        "Driver assignment response",
        `A driver ${d.decision} the assigned visit. Review dispatch for details.`,
        o.id,
      );
    await audit(tx, user, action, o.id, "success", {
      decision: d.decision,
      reason: d.reason,
    });
    return { ok: true };
  }
  const d = z
    .object({
      tripId: uid,
      endOdometer: z.number().nonnegative().max(10000000).optional(),
      events: z
        .array(
          z
            .object({
              id: uid,
              sequence: z.number().int().positive().max(2147483647),
              kind: z.enum(["gps", "fuel", "status"]),
              recordedAt: z.iso.datetime(),
              payload: z.record(z.string(), z.unknown()),
            })
            .strict(),
        )
        .max(50)
        .optional(),
    })
    .strict()
    .parse(input);
  const t = await one(tx, "SELECT * FROM driver_trips WHERE id=$1 FOR UPDATE", [
    d.tripId,
  ]);
  if (!t) throw new AppError(404, "Trip not found.");
  allow(user, ["driver"], t.branch_id);
  if (t.driver_id !== user.id) throw new AppError(404, "Trip not found.");
  if (action === "trip.location.revoke") {
    if (t.location_consent && !t.ended_at) {
      await tx.query(
        "UPDATE driver_trips SET location_consent=false,version=version+1 WHERE id=$1",
        [t.id],
      );
      await audit(tx, user, action, t.id);
    }
    return { ok: true, stopLocation: true };
  }
  if (action === "trip.end") {
    if (d.endOdometer === undefined || d.endOdometer < Number(t.start_odometer))
      throw new AppError(400, "End odometer must be at least the start.");
    if (t.ended_at) throw new AppError(409, "Trip already ended.");
    if (
      await one(
        tx,
        "SELECT id FROM vehicle_product_loads WHERE trip_id=$1 AND state<>'reconciled' LIMIT 1",
        [t.id],
      )
    )
      throw new AppError(
        409,
        "Return and reconcile all vehicle product manifests before ending the trip.",
      );
    if (
      await one(
        tx,
        "SELECT id FROM bulk_lpg_loads WHERE trip_id=$1 AND state<>'reconciled'",
        [t.id],
      )
    )
      throw new AppError(
        409,
        "Receive and reconcile all bulk LPG custody before ending the trip.",
      );
    const active = await one(
      tx,
      "SELECT id FROM orders WHERE driver_id=$1 AND status='out_for_delivery' LIMIT 1",
      [user.id],
    );
    if (active)
      throw new AppError(
        409,
        "Resolve active delivery custody before ending the trip.",
      );
    await tx.query(
      "UPDATE driver_trips SET ended_at=now(),end_odometer=$1,location_consent=false,version=version+1 WHERE id=$2",
      [d.endOdometer, t.id],
    );
    await audit(tx, user, action, t.id);
    return { ok: true, stopLocation: true };
  }
  if (action !== "trip.sync" || !d.events)
    throw new AppError(400, "Trip events required.");
  const results = [];
  for (const e of d.events) {
    const prior = await one(tx, "SELECT * FROM trip_events WHERE id=$1", [
      e.id,
    ]);
    if (prior) {
      if (
        prior.trip_id !== t.id ||
        prior.sequence !== e.sequence ||
        prior.kind !== e.kind ||
        new Date(prior.recorded_at).getTime() !== Date.parse(e.recordedAt) ||
        prior.actor_id !== user.id ||
        canonicalRequest(prior.payload) !== canonicalRequest(e.payload)
      )
        throw new AppError(409, "Event replay conflict.");
      results.push({ id: e.id, replayed: true });
      continue;
    }
    const at = Date.parse(e.recordedAt);
    if (
      at < new Date(t.started_at).getTime() ||
      at > Date.now() + 60000 ||
      (t.ended_at && at > new Date(t.ended_at).getTime())
    )
      throw new AppError(
        409,
        "Event timestamp is outside the authorised trip.",
      );
    let payload: any;
    if (e.kind === "gps") {
      if (!t.location_consent || t.ended_at)
        throw new AppError(
          409,
          "Location capture is no longer authorised. Review pending points; never continue off duty.",
        );
      payload = z
        .object({
          lat: z.number().min(-90).max(90),
          lng: z.number().min(-180).max(180),
          accuracy: z.number().min(0).max(10000),
        })
        .strict()
        .parse(e.payload);
      if (payload.accuracy <= 100) {
        const nearby = await tx.query(
          `(SELECT recorded_at,payload FROM trip_events
            WHERE trip_id=$1 AND actor_id=$2 AND kind='gps' AND recorded_at BETWEEN $3::timestamptz-interval '5 minutes' AND $3::timestamptz
              AND (payload->>'accuracy')::numeric BETWEEN 0 AND 100
            ORDER BY recorded_at DESC,sequence DESC LIMIT 1)
           UNION ALL
           (SELECT recorded_at,payload FROM trip_events
            WHERE trip_id=$1 AND actor_id=$2 AND kind='gps' AND recorded_at>$3::timestamptz AND recorded_at<=$3::timestamptz+interval '5 minutes'
              AND (payload->>'accuracy')::numeric BETWEEN 0 AND 100
            ORDER BY recorded_at,sequence LIMIT 1)`,
          [t.id, user.id, e.recordedAt],
        );
        if (nearby.rows.some((point) => implausibleRiderSegment(
          { ...point.payload, recordedAt: new Date(point.recorded_at).toISOString() },
          { ...payload, recordedAt: e.recordedAt },
        ))) throw new AppError(409, "This GPS observation needs review because it conflicts with nearby recorded locations.");
      }
    } else if (e.kind === "fuel")
      payload = z
        .object({
          litres: z.number().positive().max(1000),
          costKobo: z.number().int().positive().max(100000000),
          receipt: z.string().trim().min(5).max(500),
        })
        .strict()
        .parse(e.payload);
    else
      payload = z
        .object({ note: z.string().trim().min(5).max(500) })
        .strict()
        .parse(e.payload);
    await tx.query(
      "INSERT INTO trip_events(id,trip_id,sequence,kind,recorded_at,payload,actor_id) VALUES($1,$2,$3,$4,$5,$6,$7)",
      [
        e.id,
        t.id,
        e.sequence,
        e.kind,
        e.recordedAt,
        JSON.stringify(payload),
        user.id,
      ],
    );
    results.push({ id: e.id, accepted: true });
  }
  return { results, authoritativeDeliveryCompleted: false };
}
