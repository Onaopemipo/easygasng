import { z } from "zod";
import { one, type SQL, type DB } from "./db";
import {
  actor,
  allow,
  AppError,
  digest,
  id,
  recentVerification,
  type Actor,
} from "./auth";
import {
  canonicalRequest,
  requiredBusinessOperation,
} from "./business-operation";
import { audit } from "./governance";
import { driverSessionPermission } from "./driver-workspace";
import { technicianSessionPermission } from "./technician-session";
import { dispatchRoutingPolicy } from "./dispatch-routing-schema";
import {
  deliveryDeadline,
  routePlan,
} from "../../../packages/business-rules/src/dispatch-routing";
import { recentTripFix } from "../../../packages/business-rules/src/trip-metrics";
const uid = z.string().uuid();
const hash = (v: unknown) => digest(canonicalRequest(v));
export async function confirmDispatchDestination(
  tx: SQL,
  user: Actor,
  input: unknown,
) {
  allow(user, ["owner", "manager", "dispatcher"]);
  recentVerification(user);
  const d = z
    .object({
      orderId: uid,
      version: z.number().int().nonnegative(),
      revision: z.number().int().nonnegative(),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      evidence: z.string().trim().min(10).max(500),
    })
    .strict()
    .parse(input);
  const o = await one(tx, "SELECT * FROM orders WHERE id=$1 FOR UPDATE", [
    d.orderId,
  ]);
  if (!o) throw new AppError(404, "Order not found.");
  allow(user, ["owner", "manager", "dispatcher"], o.branch_id);
  const prior = await one(
    tx,
    "SELECT revision FROM dispatch_destinations WHERE order_id=$1 ORDER BY revision DESC LIMIT 1",
    [o.id],
  );
  if (
    Number(o.tracking_version) !== d.version ||
    Number(prior?.revision ?? 0) !== d.revision ||
    !["accepted", "preparing", "assigned", "out_for_delivery"].includes(
      o.status,
    )
  )
    throw new AppError(
      409,
      "Order or destination changed. Refresh before confirming.",
    );
  const destinationId = id();
  await tx.query(
    "INSERT INTO dispatch_destinations(id,order_id,branch_id,revision,address_hash,latitude,longitude,evidence,confirmed_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
    [
      destinationId,
      o.id,
      o.branch_id,
      d.revision + 1,
      hash(o.address),
      d.latitude,
      d.longitude,
      d.evidence,
      user.id,
    ],
  );
  await audit(tx, user, "dispatch.destination.confirm", o.id, "success", {
    destinationId,
    revision: d.revision + 1,
  });
  return { id: destinationId, revision: d.revision + 1 };
}
export async function routingContext(
  tx: SQL,
  user: Actor,
  orderId: string,
  driverId: string,
) {
  allow(user, ["owner", "manager", "dispatcher"]);
  const o = await one(tx, "SELECT * FROM orders WHERE id=$1", [orderId]);
  if (!o) throw new AppError(404, "Order not found.");
  allow(user, ["owner", "manager", "dispatcher"], o.branch_id);
  if (
    !["accepted", "preparing", "assigned", "out_for_delivery"].includes(
      o.status,
    )
  )
    throw new AppError(409, "Order cannot be planned.");
  const setting = await one(
    tx,
    "SELECT value,version FROM settings WHERE key='dispatch.routing' AND scope=$1 FOR SHARE",
    [o.branch_id],
  );
  const policy = dispatchRoutingPolicy.parse(setting?.value);
  if (!policy.enabled)
    throw new AppError(
      409,
      "Road routing requires an approved enabled dispatch policy.",
    );
  const trip = await one(
    tx,
    "SELECT t.*,v.estimated_litres_per_100km,v.capacity_grams FROM driver_trips t JOIN driver_vehicles v ON v.id=t.vehicle_id AND v.active=true AND v.lpg_suitable=true JOIN users u ON u.id=t.driver_id AND u.active=true AND u.role='driver' AND u.branch_id=t.branch_id JOIN branches b ON b.id=t.branch_id AND b.active=true WHERE t.driver_id=$1 AND t.branch_id=$2 AND t.ended_at IS NULL FOR SHARE OF t,v,u,b",
    [driverId, o.branch_id],
  );
  if (!trip || !(Number(trip.estimated_litres_per_100km) > 0))
    throw new AppError(
      409,
      "An active suitable trip and explicit vehicle fuel rate are required.",
    );
  const gps = await one(
    tx,
    "SELECT id,payload,recorded_at FROM trip_events WHERE trip_id=$1 AND kind='gps' ORDER BY recorded_at DESC,created_at DESC LIMIT 1",
    [trip.id],
  );
  const fix =
    gps &&
    recentTripFix(
      [{ ...gps.payload, recordedAt: new Date(gps.recorded_at).toISOString() }],
      Date.now(),
      trip.location_consent === true,
      false,
    );
  if (!fix)
    throw new AppError(
      409,
      "Recent consented driver GPS with acceptable accuracy is required.",
    );
  const orders = (
    await tx.query(
      "SELECT id,address,tracking_version,delivery_date::text AS delivery_date,delivery_window,status,driver_id FROM orders WHERE id=$1 OR (driver_id=$2 AND status IN ('assigned','out_for_delivery')) ORDER BY id LIMIT 25 FOR SHARE",
      [o.id, driverId],
    )
  ).rows;
  if (orders.length > 24)
    throw new AppError(409, "Route exceeds the 24-stop planning limit.");
  const stops = [];
  for (const order of orders) {
    const pin = await one(
      tx,
      "SELECT * FROM dispatch_destinations WHERE order_id=$1 ORDER BY revision DESC LIMIT 1",
      [order.id],
    );
    if (!pin || pin.address_hash !== hash(order.address))
      throw new AppError(
        409,
        "Confirm current destination coordinates for every assigned stop before routing.",
      );
    let deadline: number;
    try {
      deadline = deliveryDeadline(order.delivery_date, order.delivery_window);
    } catch {
      throw new AppError(
        409,
        "Every planned stop needs a valid dated numeric delivery window.",
      );
    }
    stops.push({
      id: order.id,
      version: order.tracking_version,
      status: order.status,
      driverId: order.driver_id,
      addressHash: pin.address_hash,
      pinId: pin.id,
      lat: Number(pin.latitude),
      lng: Number(pin.longitude),
      deadline,
    });
  }
  stops.sort((a, b) => a.deadline - b.deadline || a.id.localeCompare(b.id));
  const basis = {
    tripId: trip.id,
    tripVersion: trip.version,
    vehicleId: trip.vehicle_id,
    rate: Number(trip.estimated_litres_per_100km),
    policyVersion: setting!.version,
    policy,
    gpsId: gps!.id,
    recordedAt: fix.recordedAt,
    stops,
  };
  return {
    ...basis,
    contextHash: hash(basis),
    origin: { lat: fix.lat, lng: fix.lng },
    branchId: o.branch_id,
    expiresAt: new Date(Date.parse(fix.recordedAt) + 120000).toISOString(),
  };
}
// Only a trusted deployment operator supplies this fixed processor origin. Never accept a URL from the client.
export async function roadLegs(
  points: { lat: number; lng: number }[],
  maxSnapMetres: number,
  transport: typeof fetch = fetch,
) {
  if (process.env.EASYGAS_ROAD_ROUTING_ENABLED !== "true")
    throw new AppError(503, "Road-routing processor is disabled.");
  let origin: URL;
  try {
    origin = new URL(process.env.EASYGAS_OSRM_ORIGIN ?? "");
  } catch {
    throw new AppError(503, "Configure the trusted routing processor.");
  }
  if (
    origin.protocol !== "https:" ||
    origin.username ||
    origin.password ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash
  )
    throw new AppError(
      503,
      "Routing requires a fixed HTTPS origin without credentials or paths.",
    );
  if (
    points.length < 2 ||
    points.length > 25 ||
    points.some(
      (p) =>
        !Number.isFinite(p.lat) ||
        Math.abs(p.lat) > 90 ||
        !Number.isFinite(p.lng) ||
        Math.abs(p.lng) > 180,
    )
  )
    throw new AppError(400, "Invalid routing coordinates.");
  let response: Response;
  try {
    response = await transport(
      new URL(
        `/route/v1/driving/${points.map((p) => `${p.lng},${p.lat}`).join(";")}?overview=false&steps=false`,
        origin,
      ),
      {
        signal: AbortSignal.timeout(3000),
        redirect: "error",
        cache: "no-store",
      },
    );
  } catch {
    throw new AppError(
      503,
      "Road-routing processor unavailable. No road estimate was invented.",
    );
  }
  if (!response.ok)
    throw new AppError(503, "Road-routing processor rejected the request.");
  // Stream with a hard bound instead of buffering an untrusted response body.
  const reader = response.body?.getReader();
  if (!reader) throw new AppError(503, "Empty routing response.");
  let text = "",
    bytes = 0;
  const decoder = new TextDecoder();
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.length;
      if (bytes > 65536) {
        await reader.cancel();
        throw new Error("oversize");
      }
      text += decoder.decode(part.value, { stream: true });
    }
    text += decoder.decode();
  } catch {
    throw new AppError(503, "Invalid routing response.");
  }
  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    throw new AppError(503, "Invalid routing response.");
  }
  if (!body || typeof body !== "object")
    throw new AppError(503, "Invalid routing response.");
  const legs = body.routes?.[0]?.legs;
  if (
    body.code !== "Ok" ||
    !Array.isArray(legs) ||
    legs.length !== points.length - 1 ||
    !Array.isArray(body.waypoints) ||
    body.waypoints.length !== points.length ||
    body.waypoints.some(
      (w: any) =>
        !w ||
        typeof w !== "object" ||
        !Number.isFinite(w.distance) ||
        w.distance < 0 ||
        w.distance > maxSnapMetres,
    ) ||
    legs.some(
      (l: any) =>
        !l ||
        typeof l !== "object" ||
        ![l.distance, l.duration].every(
          (n: any) => typeof n === "number" && Number.isFinite(n) && n >= 0,
        ) ||
        l.distance > 2000000 ||
        l.duration > 604800,
    )
  )
    throw new AppError(
      503,
      "Routing returned no acceptable road path or destination snap.",
    );
  return legs.map((l: any) => ({ distance: l.distance, duration: l.duration }));
}
export async function validateRouteEstimate(
  tx: SQL,
  user: Actor,
  estimateId: string,
  orderId: string,
  driverId: string,
) {
  const e = await one(
    tx,
    "SELECT * FROM dispatch_route_estimates WHERE id=$1 AND order_id=$2 AND driver_id=$3",
    [estimateId, orderId, driverId],
  );
  if (!e || new Date(e.expires_at).getTime() <= Date.now())
    throw new AppError(409, "Route estimate expired. Calculate a fresh plan.");
  const c = await routingContext(tx, user, orderId, driverId);
  if (c.contextHash !== e.context_hash)
    throw new AppError(409, "Route context changed. Calculate a fresh plan.");
  return e;
}
// External I/O is deliberately between transactions; commit re-authenticates and revalidates the complete basis.
export async function estimateDispatchRoute(
  db: DB,
  token: string | null,
  input: unknown,
  transport: typeof fetch = fetch,
) {
  const d = z
    .object({ orderId: uid, driverId: uid, operationKey: uid })
    .strict()
    .parse(input);
  const authenticate = async (tx: SQL) => {
    const u = await actor(tx, token);
    driverSessionPermission(u, "dispatch.route.estimate", input);
    technicianSessionPermission(u, "dispatch.route.estimate", input);
    allow(u, ["owner", "manager", "dispatcher"]);
    return u;
  };
  const prepared = await db.transaction(async (tx) => {
    const u = await authenticate(tx);
    const prior = await one(
      tx,
      "SELECT operation_key FROM business_operation_results WHERE operation_key=$1 AND committed_at IS NOT NULL",
      [d.operationKey],
    );
    if (prior)
      return {
        replay: await requiredBusinessOperation(
          tx,
          u,
          "dispatch.route.estimate",
          d,
          async () => {
            throw new AppError(409, "Operation changed.");
          },
        ),
      };
    return {
      userId: u.id,
      context: await routingContext(tx, u, d.orderId, d.driverId),
    };
  });
  if ("replay" in prepared) return prepared.replay;
  const c = prepared.context!;
  const legs = await roadLegs(
    [c.origin, ...c.stops],
    c.policy.maxSnapMetres!,
    transport,
  );
  const plan = routePlan(
    c.stops,
    legs,
    Date.now(),
    {
      stopMinutes: c.policy.stopMinutes!,
      fuelKoboPerLitre: c.policy.fuelKoboPerLitre!,
      operatingKoboPerKm: c.policy.operatingKoboPerKm!,
    },
    c.rate,
  );
  return db.transaction(async (tx) => {
    const u = await authenticate(tx);
    if (u.id !== prepared.userId) throw new AppError(409, "Session changed.");
    return requiredBusinessOperation(
      tx,
      u,
      "dispatch.route.estimate",
      d,
      async () => {
        const fresh = await routingContext(tx, u, d.orderId, d.driverId);
        if (
          fresh.contextHash !== c.contextHash ||
          Date.parse(c.expiresAt) <= Date.now()
        )
          throw new AppError(
            409,
            "Dispatch changed during routing. Recalculate.",
          );
        const estimateId = id();
        await tx.query(
          "INSERT INTO dispatch_route_estimates(id,order_id,driver_id,branch_id,trip_id,context_hash,policy_version,provider,metres,seconds,operating_kobo,plan,expires_at,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,'osrm',$8,$9,$10,$11,$12,$13)",
          [
            estimateId,
            d.orderId,
            d.driverId,
            c.branchId,
            c.tripId,
            c.contextHash,
            c.policyVersion,
            plan.metres,
            plan.seconds,
            plan.operatingKobo,
            JSON.stringify(plan),
            c.expiresAt,
            u.id,
          ],
        );
        await audit(tx, u, "dispatch.route.estimate", d.orderId, "success", {
          estimateId,
          driverId: d.driverId,
        });
        return { id: estimateId, ...plan, expiresAt: c.expiresAt };
      },
    );
  });
}
