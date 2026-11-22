import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { fixture } from "./helpers/order-tracking-fixture";
import { id } from "../apps/web/lib/auth";
import { vehicleReady } from "../apps/web/lib/fleet-constraints";
import { AssignmentRequirementError } from "../apps/web/lib/assignment-requirement-error";
import { DriverAssignmentChoices } from "../apps/web/components/driver-assignment";
import { assignmentIssue } from "../packages/business-rules/src/assignment-requirements";
import {readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {reviewedAssignmentSourceHash} from "../scripts/lib/reviewed-assignment-source.mjs";

test("DASSIGN-SOURCE: historical proofs accept only the explicit six-file web continuation and reject changed baselines", async () => {
  const review=JSON.parse(await readFile('docs/driver-assignment/reviewed-source-changes.json','utf8'));
  for(const [file, baseline] of Object.entries(review.baseline)) {
    assert.equal(await reviewedAssignmentSourceHash(file,baseline),createHash('sha256').update(await readFile(file)).digest('hex'));
    await assert.rejects(()=>reviewedAssignmentSourceHash(file,'0'.repeat(64)),/historical assignment baseline/);
  }
  assert.equal(await reviewedAssignmentSourceHash('apps/mobile/unreviewed-surface.tsx','retained-native-proof'),'retained-native-proof');
  for(const [file, hash] of Object.entries(review.addedFiles)) assert.equal(createHash('sha256').update(await readFile(file)).digest('hex'),hash);
});

async function setup() {
  const f = await fixture();
  await f.db.query("UPDATE sessions SET verified_at=now() WHERE user_id=$1", [
    f.actors.owner.id,
  ]);
  const order = await f.make();
  await f.transition(order, "accepted");
  await f.transition(order, "preparing");
  const read = () =>
    f.call("owner", "dispatch.candidates", { orderId: order.id });
  const vehicle = async () =>
    f.call("owner", "fleet.vehicle.create", {
      branchId: "lagos",
      label: "Synthetic assignment vehicle",
      capacityGrams: 10000,
      lpgSuitable: true,
      operationKey: id(),
    });
  const start = async (vehicleId: string) =>
    f.call("driver", "trip.start", {
      vehicleId,
      startOdometer: 10,
      locationConsent: false,
      operationKey: id(),
    });
  const codes = (r: any) =>
    r.candidates
      .find((d: any) => d.id === f.actors.driver.id)
      .readiness.issues.map((i: any) => i.code);
  return { ...f, order, read, vehicle, start, codes };
}

test("DASSIGN-EXACT: missing trip, inactive account, availability, unsuitable/inactive/wrong-branch vehicle and trip have distinct resolutions", async () => {
  const f = await setup();
  try {
    let result = await f.read();
    assert.deepEqual(f.codes(result), ["DRIVER_TRIP_REQUIRED"]);
    const issue = result.candidates[0].readiness.issues[0];
    assert.match(issue.resolution, /Home → Start trip/);
    assert.equal(issue.responsible, "Driver");
    await f.db.query(
      "UPDATE users SET active=false,driver_available=false WHERE id=$1",
      [f.actors.driver.id],
    );
    assert.deepEqual(f.codes(await f.read()), [
      "DRIVER_INACTIVE",
      "DRIVER_UNAVAILABLE",
      "DRIVER_TRIP_REQUIRED",
    ]);
    await f.db.query(
      "UPDATE users SET active=true,driver_available=true WHERE id=$1",
      [f.actors.driver.id],
    );
    const v = await f.vehicle();
    const t = await f.start(v.id);
    await f.db.query(
      "INSERT INTO branches(id,name) VALUES('assignment-other','Synthetic other branch')",
    );
    for (const [sql, value, code] of [
      [
        "UPDATE driver_vehicles SET active=$1 WHERE id=$2",
        false,
        "VEHICLE_INACTIVE",
      ],
      [
        "UPDATE driver_vehicles SET lpg_suitable=$1 WHERE id=$2",
        false,
        "VEHICLE_LPG_UNVERIFIED",
      ],
      [
        "UPDATE driver_vehicles SET branch_id=$1 WHERE id=$2",
        "assignment-other",
        "VEHICLE_BRANCH_MISMATCH",
      ],
      [
        "UPDATE driver_trips SET branch_id=$1 WHERE id=$2",
        "assignment-other",
        "TRIP_BRANCH_MISMATCH",
      ],
    ] as const) {
      await f.db.query(sql, [
        value,
        sql.includes("driver_trips") ? t.id : v.id,
      ]);
      result = await f.read();
      assert.ok(f.codes(result).includes(code));
      const i = result.candidates[0].readiness.issues.find(
        (i: any) => i.code === code,
      );
      assert.ok(i.resolution.length > 30 && i.responsible);
      await assert.rejects(
        () =>
          f.db.transaction((tx) =>
            vehicleReady(tx, f.actors.driver.id, f.order.id, "lagos"),
          ),
        (e: any) =>
          e instanceof AssignmentRequirementError &&
          e.issues.some((i: any) => i.code === code) &&
          e.code === code,
      );
      await f.db.query(
        "UPDATE driver_vehicles SET active=true,lpg_suitable=true,branch_id='lagos' WHERE id=$1",
        [v.id],
      );
      await f.db.query(
        "UPDATE driver_trips SET branch_id='lagos' WHERE id=$1",
        [t.id],
      );
    }
    assert.equal((await f.read()).candidates[0].readiness.ready, true);
    await f.call("driver", "trip.end", {
      tripId: t.id,
      endOdometer: 11,
      operationKey: id(),
    });
    assert.deepEqual(f.codes(await f.read()), ["DRIVER_TRIP_REQUIRED"]);
  } finally {
    await f.db.close?.();
  }
});

test("DASSIGN-NEG: readiness probes preserve business state and deny other roles and branches; final assignment rechecks changed eligibility", async () => {
  const env = { ...process.env };
  process.env.EASYGAS_FIELD_OPERATIONS_ENABLED = "true";
  const f = await setup();
  try {
    const snap = async () =>
      JSON.stringify(
        await Promise.all([
          f.db.query("SELECT * FROM orders WHERE id=$1", [f.order.id]),
          f.db.query("SELECT * FROM delivery_attempts WHERE order_id=$1", [
            f.order.id,
          ]),
          f.db.query("SELECT * FROM driver_trips ORDER BY id"),
          f.db.query("SELECT * FROM inventory ORDER BY product_id,branch_id"),
        ]),
      );
    const before = await snap();
    await f.read();
    await f.read();
    assert.equal(await snap(), before);
    for (const role of ["driver", "inventory", "customer", "commercial"])
      await assert.rejects(
        () => f.call(role, "dispatch.candidates", { orderId: f.order.id }),
        (e: any) => e.status === 403,
      );
    await f.db.query(
      "INSERT INTO branches(id,name) VALUES('assignment-foreign','Private foreign branch')",
    );
    await f.db.query(
      "UPDATE users SET branch_id='assignment-foreign' WHERE id=$1",
      [f.actors.dispatcher.id],
    );
    await assert.rejects(
      () =>
        f.call("dispatcher", "dispatch.candidates", { orderId: f.order.id }),
      (e: any) => e.status === 403,
    );
    await f.db.query("UPDATE users SET branch_id='lagos' WHERE id=$1", [
      f.actors.dispatcher.id,
    ]);
    const manager = await f.call("dispatcher", "dispatch.candidates", {
      orderId: f.order.id,
    });
    assert.equal(manager.canReviewVehicles, false);
    const v = await f.vehicle();
    await f.start(v.id);
    const ready = await f.read();
    assert.equal(ready.candidates[0].readiness.ready, true);
    await f.db.query("UPDATE driver_vehicles SET active=false WHERE id=$1", [
      v.id,
    ]);
    await assert.rejects(
      () =>
        f.call("owner", "dispatch.assign", {
          orderId: f.order.id,
          driverId: f.actors.driver.id,
          version: ready.version,
          reason: "Synthetic stale eligibility guard",
          operationKey: id(),
        }),
      (e: any) => e.code === "VEHICLE_INACTIVE",
    );
    await assert.rejects(
      () => f.transition(f.order, "assigned"),
      (e: any) => e.code === "VEHICLE_INACTIVE",
    );
    assert.equal((await f.snapshot(f.order.id)).driver_id, null);
    assert.equal(
      (
        await f.db.query("SELECT id FROM delivery_attempts WHERE order_id=$1", [
          f.order.id,
        ])
      ).rows.length,
      0,
    );
    await f.db.query("UPDATE driver_vehicles SET active=true WHERE id=$1", [
      v.id,
    ]);
    await f.transition(f.order, "assigned");
    assert.equal((await f.snapshot(f.order.id)).driver_id, f.actors.driver.id);
  } finally {
    process.env = env;
    await f.db.close?.();
  }
});

test("DASSIGN-CAPACITY: exact demand and approved limit are shown without allocating stock or ignoring extra vehicle custody", async () => {
  const f = await setup();
  try {
    const v = await f.vehicle();
    await f.start(v.id);
    await f.db.query(
      "INSERT INTO order_gas_lines(id,order_id,capacity_grams,grams,unit_price_kobo,subtotal_kobo,pricing_version) VALUES($1,$2,12500,12000,180000,2160000,1)",
      [id(), f.order.id],
    );
    const result = await f.read();
    const issue = result.candidates[0].readiness.issues[0];
    assert.equal(issue.code, "VEHICLE_CAPACITY_EXCEEDED");
    assert.match(issue.title, /12 kg required, 10 kg approved/);
    assert.match(issue.resolution, /extra physical LPG custody/);
    assert.match(issue.resolution, /Do not increase the approved capacity/);
    assert.equal(
      (
        await f.db.query(
          "SELECT capacity_grams FROM driver_vehicles WHERE id=$1",
          [v.id],
        )
      ).rows[0].capacity_grams,
      10000,
    );
  } finally {
    await f.db.close?.();
  }
});

test("DASSIGN-UI: actual shared cards show exact blockers, responsible next steps, scoped help and disabled blocked drivers", () => {
  const data: any = {
    orderId: id(),
    reference: "Synthetic order",
    version: 1,
    branch: { id: "lagos", name: "Lagos" },
    checkedAt: "2026-11-21T08:00:00Z",
    writesEnabled: true,
    canReviewVehicles: true,
    canReviewDrivers: true,
    candidates: [
      {
        id: "blocked",
        name: "Synthetic blocked driver",
        readiness: {
          ready: false,
          reasons: [],
          issues: [assignmentIssue("DRIVER_TRIP_REQUIRED")],
        },
      },
      {
        id: "ready",
        name: "Synthetic eligible driver",
        readiness: { ready: true, reasons: [], issues: [] },
      },
    ],
  };
  const render = (d = data, error = "") =>
    renderToStaticMarkup(
      React.createElement(DriverAssignmentChoices, {
        data: d,
        error,
        loading: false,
        selected: "",
        onSelect() {},
        onRefresh() {},
      }),
    );
  const html = render();
  assert.match(html, /Fulfilment branch: Lagos/);
  assert.match(html, /1\/2 eligible/);
  assert.match(html, /Driver has no active vehicle trip/);
  assert.match(html, /Home → Start trip/);
  assert.match(html, /driver-fleet/);
  assert.match(html, /<input(?=[^>]*value="blocked")(?=[^>]*disabled="")[^>]*>/);
  assert.doesNotMatch(html, /<input[^>]*disabled[^>]*value="ready"/);
  assert.doesNotMatch(
    render({ ...data, canReviewVehicles: false }),
    /href="\/admin\/deliveries#driver-fleet"/,
  );
  assert.match(
    render(null, "Eligibility unavailable"),
    /Eligibility unavailable/,
  );
  assert.doesNotMatch(
    render(null, "Eligibility unavailable"),
    /Eligible at last check/,
  );
});
