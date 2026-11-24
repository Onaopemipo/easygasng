import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers/order-tracking-fixture";
import { id } from "../apps/web/lib/auth";

test("DS-DATA: canonical setup distinguishes empty configuration, available drivers, suitable vehicles and active trips without guessing order readiness", async () => {
  const f = await fixture();
  try {
    let r = await f.call("owner", "dispatch.setup", { branch: "lagos" });
    assert.equal(r.branch.id, "lagos");
    assert.equal(r.checks.branchActive, true);
    assert.equal(r.counts.availableDrivers, 1);
    assert.equal(r.checks.vehiclesApproved, false);
    assert.equal(r.checks.activeTrips, false);
    assert.equal(r.checks.coverageConfigured, true);
    assert.equal(r.checks.deliveryWindows, true);
    await f.db.query("UPDATE sessions SET verified_at=now() WHERE user_id=$1", [f.actors.owner.id]);
    const v = await f.call("owner", "fleet.vehicle.create", { branchId: "lagos", label: "Synthetic setup van", capacityGrams: 20000, lpgSuitable: true, operationKey: id() });
    await f.call("driver", "trip.start", { vehicleId: v.id, startOdometer: 1, locationConsent: false, operationKey: id() });
    r = await f.call("owner", "dispatch.setup", { branch: "lagos" });
    assert.equal(r.checks.vehiclesApproved, true);
    assert.equal(r.counts.driversOnTrips, 1);
    await f.db.query("UPDATE driver_vehicles SET branch_id='lagos',lpg_suitable=false WHERE id=$1", [v.id]);
    r = await f.call("owner", "dispatch.setup", { branch: "lagos" });
    assert.equal(r.checks.activeTrips, false);
    assert.equal(r.checks.vehiclesApproved, false);
    await f.db.exec("UPDATE settings SET value='0' WHERE key='delivery.capacity'; UPDATE settings SET value='[]' WHERE key='delivery.windows'; UPDATE delivery_locations SET coverage=''; UPDATE branches SET active=false WHERE id='lagos';");
    r = await f.call("owner", "dispatch.setup", { branch: "lagos" });
    for (const key of ["branchActive", "deliveryCapacity", "deliveryWindows", "coverageConfigured"]) assert.equal(r.checks[key], false, key);
  } finally { await f.db.close?.(); }
});

test("DS-SCOPE: wrong roles and foreign branch denied; owner chooses among branches; privilege and release controls stay authoritative", async () => {
  const f = await fixture(), env = { ...process.env };
  try {
    await f.db.query("INSERT INTO branches(id,name) VALUES('setup-private','Synthetic private branch')");
    await f.db.query("INSERT INTO driver_vehicles(id,branch_id,label,capacity_grams,lpg_suitable) VALUES($1,'setup-private','Private vehicle',10000,true)", [id()]);
    const owner = await f.call("owner", "dispatch.setup");
    assert.equal(owner.branch, null); assert.equal(owner.checks, null); assert.equal(owner.branches.length, 2);
    const manager = await f.call("dispatcher", "dispatch.setup");
    assert.deepEqual(manager.branches.map((b: any) => b.id), ["lagos"]);
    assert.equal(manager.counts.vehicles, 0); assert.equal(manager.canRegisterVehicle, false);
    await assert.rejects(() => f.call("dispatcher", "dispatch.setup", { branch: "setup-private" }), (e: any) => e.status === 403);
    await assert.rejects(() => f.call("owner", "dispatch.setup", { branch: "missing" }), (e: any) => e.status === 404);
    for (const role of ["driver", "customer", "commercial", "inventory"]) await assert.rejects(() => f.call(role, "dispatch.setup"), (e: any) => e.status === 403);
    await f.db.query("INSERT INTO staff_privilege_overrides(user_id,privilege,effect,changed_by,role_at_change,branch_at_change) VALUES($1,'staff.manage','deny',$2,'manager','lagos')", [f.actors.dispatcher.id, f.actors.owner.id]);
    assert.equal((await f.call("dispatcher", "dispatch.setup")).canReviewDrivers, false);
    await f.db.query("INSERT INTO staff_privilege_overrides(user_id,privilege,effect,changed_by,role_at_change,branch_at_change) VALUES($1,'dispatch.manage','deny',$2,'manager','lagos')", [f.actors.dispatcher.id, f.actors.owner.id]);
    await assert.rejects(() => f.call("dispatcher", "dispatch.setup"), (e: any) => e.status === 403 && e.code === "PRIVILEGE_REVOKED");
    process.env.EASYGAS_TRACKING_MUTATIONS_ENABLED = "false";
    assert.equal((await f.call("owner", "dispatch.setup", { branch: "lagos" })).checks.assignmentEnabled, false);
  } finally { process.env = env; await f.db.close?.(); }
});

test("DS-READ: repeated setup reads do not change business records or start trips", async () => {
  const f = await fixture();
  try {
    const snapshot = async () => JSON.stringify(await Promise.all(["branches", "users", "driver_vehicles", "driver_trips", "orders", "inventory", "settings", "delivery_locations"].map((table) => f.db.query("SELECT * FROM " + table + " ORDER BY 1"))));
    const before = await snapshot();
    await f.call("owner", "dispatch.setup", { branch: "lagos" }); await f.call("dispatcher", "dispatch.setup");
    assert.equal(await snapshot(), before);
  } finally { await f.db.close?.(); }
});
