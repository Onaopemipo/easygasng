import { fixture } from "./order-tracking-fixture";
import { id } from "../../apps/web/lib/auth";
import { type DB } from "../../apps/web/lib/db";
export async function bulkFixture(database?: DB) {
  const f = await fixture(database);
  process.env.EASYGAS_BULK_LPG_ENABLED = "true";
  await f.db.query("UPDATE users SET role='safety_officer' WHERE id=$1", [
    f.actors.dispatcher.id,
  ]);
  await f.db.query(
    "UPDATE sessions SET verified_at=now() WHERE user_id IN ($1,$2,$3)",
    [f.actors.owner.id, f.actors.inventory.id, f.actors.dispatcher.id],
  );
  for (const [who, code, reviewer] of [
    ["owner", "bulk_lpg_metering", "dispatcher"],
    ["inventory", "bulk_lpg_loading", "owner"],
    ["driver", "bulk_lpg_dispensing", "owner"],
  ])
    await f.call(reviewer, "technician.qualify", {
      userId: f.actors[who].id,
      code,
      evidence: "Synthetic documented qualification evidence only",
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });
  const vehicle = await f.call("owner", "fleet.vehicle.create", {
    branchId: "lagos",
    label: "Synthetic bulk vehicle",
    capacityGrams: 20000,
    lpgSuitable: true,
    operationKey: id(),
  });
  const trip = await f.call("driver", "trip.start", {
    vehicleId: vehicle.id,
    startOdometer: 10,
    locationConsent: false,
    operationKey: id(),
  });
  const meter = await f.call("owner", "bulk.meter.register", {
    vehicleId: vehicle.id,
    serial: id(),
    calibrationReference: "Synthetic mass meter certificate",
    calibrationExpiresAt: new Date(Date.now() + 86400000).toISOString(),
    operationKey: id(),
  });
  const order = await f.make();
  await f.db.query(
    "UPDATE orders SET status='assigned',driver_id=$1 WHERE id=$2",
    [f.actors.driver.id, order.id],
  );
  const cylinder = id();
  await f.db.query(
    "INSERT INTO cylinders(id,branch_id,serial,size_kg,ownership,status,test_due,customer_id) VALUES($1,'lagos',$1,6,'customer','empty',current_date+365,$2)",
    [cylinder, f.actors.customer.id],
  );
  await f.db.query(
    "INSERT INTO order_gas_lines(id,order_id,capacity_grams,grams,unit_price_kobo,subtotal_kobo,cylinder_id,inspected_by,inspection_note,inspected_at,allowable_grams,pricing_version) VALUES($1,$2,6000,6000,180000,1080000,$3,$4,'Synthetic inspection',now(),6000,1)",
    [id(), order.id, cylinder, f.actors.owner.id],
  );
  await f.db.query(
    "INSERT INTO gas_stock(branch_id,grams,reserved_grams) VALUES('lagos',20000,6000) ON CONFLICT(branch_id) DO UPDATE SET grams=20000,reserved_grams=6000",
  );
  const issue = (extra: any = {}) =>
    f.call("inventory", "bulk.load.issue", {
      tripId: trip.id,
      meterId: meter.id,
      grams: 10000,
      meterReadingGrams: 100000,
      orderIds: [order.id],
      reason: "Synthetic measured mass load",
      operationKey: id(),
      ...extra,
    });
  const balance = async () =>
    (
      await f.db.query(
        "SELECT grams,reserved_grams FROM gas_stock WHERE branch_id='lagos'",
      )
    ).rows[0];
  return { ...f, vehicle, trip, meter, order, issue, balance };
}
