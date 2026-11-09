import test from "node:test";
import assert from "node:assert/strict";
import {
  deliveryDeadline,
  routePlan,
} from "../packages/business-rules/src/dispatch-routing";
import {
  roadLegs,
  estimateDispatchRoute,
  validateRouteEstimate,
} from "../apps/web/lib/dispatch-routing";
import { dispatchRoutingPolicy } from "../apps/web/lib/dispatch-routing-schema";
import { fixture } from "./helpers/order-tracking-fixture";
import { actor, id, hashPassword, issueSession } from "../apps/web/lib/auth";
const policy = {
  enabled: true,
  fuelKoboPerLitre: 100000,
  operatingKoboPerKm: 20000,
  stopMinutes: 10,
  maxSnapMetres: 100,
};
const reply = () =>
  new Response(
    JSON.stringify({
      code: "Ok",
      waypoints: [{ distance: 0 }, { distance: 1 }],
      routes: [{ legs: [{ distance: 5000, duration: 600 }] }],
    }),
  );
test("ROUTE-01: Lagos deadlines, stop allowance and explicit whole-route cost", () => {
  assert.equal(
    new Date(deliveryDeadline("2026-11-09", "14:00–18:00")).toISOString(),
    "2026-11-09T17:00:00.000Z",
  );
  for (const [d, w] of [
    ["2026-02-30", "14:00–18:00"],
    ["2026-11-09", "24:00–25:00"],
    ["2026-11-09", "afternoon"],
    ["2026-11-09", "18:00–14:00"],
  ])
    assert.throws(() => deliveryDeadline(d, w));
  const p = routePlan(
    [
      { id: "a", deadline: 1000000 },
      { id: "b", deadline: 1300000 },
    ],
    [
      { distance: 5000, duration: 600 },
      { distance: 5000, duration: 600 },
    ],
    0,
    policy,
    10,
  );
  assert.equal(p.operatingKobo, 300000);
  assert.equal(p.visits[1].arrivalAt, "1970-01-01T00:30:00.000Z");
  assert.equal(p.lateStops, 1);
  assert.throws(() =>
    dispatchRoutingPolicy.parse({ ...policy, fuelKoboPerLitre: null }),
  );
  assert.throws(() =>
    routePlan(
      [{ id: "a", deadline: 1 }],
      [{ distance: NaN, duration: 3 }],
      0,
      policy,
      10,
    ),
  );
});
test("ROUTE-02: configured HTTPS OSRM contract, OFF flag and bounded invalid responses", async () => {
  const old = process.env.EASYGAS_ROAD_ROUTING_ENABLED,
    origin = process.env.EASYGAS_OSRM_ORIGIN;
  const pts = [
    { lat: 6.4, lng: 3.4 },
    { lat: 6.41, lng: 3.41 },
  ];
  let calls = 0;
  const transport = (async (url: any, options: any) => {
    calls++;
    assert.match(String(url), /3.4,6.4;3.41,6.41/);
    assert.equal(options.redirect, "error");
    return reply();
  }) as typeof fetch;
  try {
    process.env.EASYGAS_ROAD_ROUTING_ENABLED = "false";
    await assert.rejects(() => roadLegs(pts, 100, transport), /disabled/);
    assert.equal(calls, 0);
    process.env.EASYGAS_ROAD_ROUTING_ENABLED = "true";
    process.env.EASYGAS_OSRM_ORIGIN = "http://localhost";
    await assert.rejects(() => roadLegs(pts, 100, transport), /HTTPS/);
    process.env.EASYGAS_OSRM_ORIGIN = "https://routing.example.test";
    assert.equal((await roadLegs(pts, 100, transport))[0].distance, 5000);
    for (const value of [
      null,
      { code: "Ok", waypoints: [null, null], routes: [{ legs: [null] }] },
      { code: "NoRoute" },
      {
        code: "Ok",
        waypoints: [{ distance: 999 }, { distance: 0 }],
        routes: [{ legs: [{ distance: 2, duration: 1 }] }],
      },
    ])
      await assert.rejects(
        () =>
          roadLegs(
            pts,
            100,
            (async () => new Response(JSON.stringify(value))) as typeof fetch,
          ),
        /acceptable|Invalid routing response/,
      );
    await assert.rejects(
      () =>
        roadLegs(
          pts,
          100,
          (async () => new Response("x".repeat(65537))) as typeof fetch,
        ),
      /Invalid/,
    );
    await assert.rejects(
      () =>
        roadLegs(pts, 100, (async () => {
          throw Error("secret provider error");
        }) as typeof fetch),
      /unavailable/,
    );
  } finally {
    if (old === undefined) delete process.env.EASYGAS_ROAD_ROUTING_ENABLED;
    else process.env.EASYGAS_ROAD_ROUTING_ENABLED = old;
    if (origin === undefined) delete process.env.EASYGAS_OSRM_ORIGIN;
    else process.env.EASYGAS_OSRM_ORIGIN = origin;
  }
});
test("ROUTE-03: authorised destination revisions and stale-context rejection using canonical orders/trips", async () => {
  const f = await fixture();
  const { db } = f;
  const old = process.env.EASYGAS_ROAD_ROUTING_ENABLED,
    origin = process.env.EASYGAS_OSRM_ORIGIN;
  try {
    await f.call("owner", "reauth", { password: "Tracking-fixture-only-123!" });
    const o = await f.make();
    await f.transition(o, "accepted");
    const current = await f.snapshot(o.id);
    const vehicle = id(),
      trip = id();
    await db.query(
      "INSERT INTO driver_vehicles(id,branch_id,label,capacity_grams,lpg_suitable,estimated_litres_per_100km) VALUES($1,'lagos','Synthetic routing vehicle',20000,true,10)",
      [vehicle],
    );
    await db.query(
      "INSERT INTO driver_trips(id,driver_id,vehicle_id,branch_id,start_odometer,location_consent) VALUES($1,$2,$3,'lagos',0,true)",
      [trip, f.actors.driver.id, vehicle],
    );
    const input = {
      orderId: o.id,
      version: Number(current.tracking_version),
      revision: 0,
      latitude: 6.41,
      longitude: 3.41,
      evidence: "Synthetic coordinate verification only",
      operationKey: id(),
    };
    await assert.rejects(
      () => f.call("customer", "dispatch.destination.confirm", input),
      /permission/,
    );
    await f.call("owner", "dispatch.destination.confirm", input);
    await f.call("owner", "dispatch.destination.confirm", input);
    assert.equal(
      (await db.query("SELECT * FROM dispatch_destinations")).rows.length,
      1,
    );
    await assert.rejects(
      () =>
        f.call("owner", "dispatch.destination.confirm", {
          ...input,
          operationKey: id(),
        }),
      /changed/,
    );
    const estimateInput = {
      orderId: o.id,
      driverId: f.actors.driver.id,
      operationKey: id(),
    };
    await assert.rejects(
      () => estimateDispatchRoute(db, f.actors.owner.token, estimateInput),
      /approved/,
    );
    const financeId = id();
    await db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,'Synthetic finance',$2,$3,'finance','lagos')",
      [
        financeId,
        `${financeId}@example.test`,
        hashPassword("Tracking-fixture-only-123!"),
      ],
    );
    f.actors.finance = {
      id: financeId,
      token: await issueSession(db, financeId),
    };
    await f.call("finance", "reauth", {
      password: "Tracking-fixture-only-123!",
    });
    const change = await f.call("owner", "setting.propose", {
      key: "dispatch.routing",
      scope: "lagos",
      version: 1,
      value: policy,
      reason: "Synthetic road operating rates for tests only",
    });
    await assert.rejects(
      () =>
        f.call("owner", "approval.decide", {
          id: change.id,
          decision: "approve",
          reason: "Attempted self approval",
        }),
      /own|independent|self/i,
    );
    await f.call("finance", "approval.decide", {
      id: change.id,
      decision: "approve",
      reason: "Independent synthetic operating-rate review",
    });
    await assert.rejects(
      () => estimateDispatchRoute(db, f.actors.owner.token, estimateInput),
      /GPS/,
    );
    await db.query(
      "INSERT INTO trip_events(id,trip_id,sequence,kind,recorded_at,payload,actor_id) VALUES($1,$2,1,'gps',now(),$3,$4)",
      [
        id(),
        trip,
        JSON.stringify({ lat: 6.4, lng: 3.4, accuracy: 5 }),
        f.actors.driver.id,
      ],
    );
    process.env.EASYGAS_ROAD_ROUTING_ENABLED = "true";
    process.env.EASYGAS_OSRM_ORIGIN = "https://routing.example.test";
    await assert.rejects(
      () => estimateDispatchRoute(db, f.actors.customer.token, estimateInput),
      /permission/,
    );
    const e = await estimateDispatchRoute(
      db,
      f.actors.owner.token,
      estimateInput,
      (async () => reply()) as typeof fetch,
    );
    assert.equal(e.operatingKobo, 150000);
    const replay = await estimateDispatchRoute(
      db,
      f.actors.owner.token,
      estimateInput,
      (async () => {
        throw Error("Replay must not call provider");
      }) as typeof fetch,
    );
    assert.equal(replay.id, e.id);
    assert.equal(replay.replayed, true);
    await assert.rejects(
      () =>
        estimateDispatchRoute(
          db,
          f.actors.owner.token,
          { ...estimateInput, operationKey: id() },
          (async () => {
            await db.query(
              "UPDATE driver_trips SET version=version+1 WHERE id=$1",
              [trip],
            );
            return reply();
          }) as typeof fetch,
        ),
      /changed during routing/,
    );
    assert.equal(
      (await db.query("SELECT * FROM dispatch_route_estimates")).rows.length,
      1,
    );
    await db.query("UPDATE driver_trips SET version=version-1 WHERE id=$1", [
      trip,
    ]);
    const owner = await actor(db, f.actors.owner.token);
    await validateRouteEstimate(db, owner, e.id, o.id, f.actors.driver.id);
    await db.query(
      'UPDATE orders SET address=address || \'{"street":"Changed synthetic address"}\'::jsonb WHERE id=$1',
      [o.id],
    );
    await assert.rejects(
      () => validateRouteEstimate(db, owner, e.id, o.id, f.actors.driver.id),
      /destination/,
    );
    await assert.rejects(
      () => db.query("DELETE FROM dispatch_destinations"),
      /immutable|mutation|append|modified|deleted/i,
    );
    assert.equal(
      (await f.snapshot(o.id)).delivery_fee_kobo,
      current.delivery_fee_kobo,
    );
  } finally {
    await db.close?.();
    if (old === undefined) delete process.env.EASYGAS_ROAD_ROUTING_ENABLED;
    else process.env.EASYGAS_ROAD_ROUTING_ENABLED = old;
    if (origin === undefined) delete process.env.EASYGAS_OSRM_ORIGIN;
    else process.env.EASYGAS_OSRM_ORIGIN = origin;
  }
});
