// Disposable synthetic setup only. Operational transitions below use real service actions.
import { fixture } from "./order-tracking-fixture";
import { id, issueSession, actor } from "../../apps/web/lib/auth";
import { one } from "../../apps/web/lib/db";
import { attachDeliveryPhoto } from "../../apps/web/lib/delivery-photos";
export async function dispatchJourneyFixture() {
  const f = await fixture();
  process.env.EASYGAS_BULK_LPG_ENABLED = "true";
  process.env.EASYGAS_DOORSTEP_ENABLED = "true";
  const reviewer = id();
  await f.db.query(
    "INSERT INTO users(id,name,email,password_hash,role,branch_id) SELECT $1,'Synthetic independent reviewer',$2,password_hash,'owner','lagos' FROM users WHERE id=$3",
    [reviewer, reviewer + "@journey.example.test", f.actors.owner.id],
  );
  f.actors.reviewer = {
    id: reviewer,
    token: await issueSession(f.db, reviewer),
  };
  for (const who of ["owner", "dispatcher", "inventory", "reviewer"])
    await f.call(who, "reauth", { password: "Tracking-fixture-only-123!" });
  await f.call("driver", "driver.restrict");
  await f.db.query(
    "INSERT INTO wallet_entries(id,customer_id,amount_kobo,kind,reference) VALUES($1,$2,10000000,'test_fixture',$1)",
    [id(), f.actors.customer.id],
  );
  await f.db.exec(
    "INSERT INTO gas_stock(branch_id,grams,reserved_grams) VALUES('lagos',100000,0) ON CONFLICT(branch_id) DO UPDATE SET grams=100000,reserved_grams=0",
  );
  for (const [who, code, by] of [
    ["owner", "bulk_lpg_metering", "reviewer"],
    ["inventory", "bulk_lpg_loading", "owner"],
    ["driver", "bulk_lpg_dispensing", "owner"],
    ["inventory", "cylinder_inspection", "owner"],
    ["inventory", "inventory_safety", "owner"],
  ])
    await f.call(by, "technician.qualify", {
      userId: f.actors[who].id,
      code,
      evidence: "Synthetic independently checked fixture qualification only",
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });
  const policy = await f.call("owner", "setting.propose", {
    key: "gas.quantity_policy",
    scope: "lagos",
    version: 1,
    value: {
      minimumKg: 1,
      maximumKg: 50,
      incrementKg: 1,
      precision: 0,
      capacitiesKg: [6, 12.5],
    },
    reason: "Synthetic independently approved journey quantity policy",
  });
  await f.call("reviewer", "approval.decide", {
    id: policy.id,
    decision: "approve",
    reason: "Synthetic independent quantity policy review",
  });
  await f.db.exec(
    "UPDATE settings SET value='true' WHERE key='wallet.enabled' AND scope='lagos'",
  );
  const run = (who: string, action: string, input: any = {}) =>
    f.call(who, action, { ...input, operationKey: input.operationKey ?? id() });
  const vehicle = await run("owner", "fleet.vehicle.create", {
    branchId: "lagos",
    label: "SYNTHETIC JOURNEY VAN",
    capacityGrams: 30000,
    physicalCapacityGrams: 20000,
    lpgSuitable: true,
  });
  const meter = await run("owner", "bulk.meter.register", {
    vehicleId: vehicle.id,
    serial: "SYNTHETIC-" + id(),
    calibrationReference: "Synthetic fixture calibration only",
    calibrationExpiresAt: new Date(Date.now() + 86400000).toISOString(),
  });
  const start = () =>
    run("owner", "dispatch.vehicle.assign", {
      driverId: f.actors.driver.id,
      vehicleId: vehicle.id,
      startOdometer: 100,
      makeAvailable: true,
    });
  const trip = async () =>
    one(
      f.db,
      "SELECT * FROM driver_trips WHERE driver_id=$1 AND ended_at IS NULL",
      [f.actors.driver.id],
    );
  const end = async () => {
    const t = await trip();
    return run("dispatcher", "dispatch.trip.end", {
      tripId: t!.id,
      version: Number(t!.version),
      endOdometer: 125,
    });
  };
  const make = async (
    gas = false,
    paymentMethod = "wallet",
    date = new Date(Date.now() + 86400000).toISOString().slice(0, 10),
  ) => {
    const lines = [{ capacityKg: 6, kg: 6 }];
    const quote = gas
      ? await f.call("customer", "gas.quote", { lines, locationId: "lekki" })
      : null;
    return f.call("customer", "checkout", {
      items: gas ? [] : [{ productId: "hose", quantity: 1 }],
      ...(gas
        ? {
            gasLines: lines,
            pricing: {
              priceVersion: quote.priceVersion,
              feeVersion: quote.feeVersion,
              policyVersion: quote.policyVersion,
              totalKobo: quote.subtotalKobo + quote.deliveryKobo,
            },
          }
        : {}),
      address: {
        locationId: "lekki",
        name: "Synthetic journey customer",
        phone: "08012345678",
        street: "12 Synthetic Journey Street",
        zone: "Lekki",
      },
      date,
      window: "14:00–18:00",
      paymentMethod,
      idempotencyKey: id(),
    });
  };
  const prepare = async (o: any) => {
    let current = await f.snapshot(o.id);
    if (current.gas_lines.length) {
      const line = current.gas_lines[0],
        due = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
      const c = await run("inventory", "gas.cylinder.intake", {
        lineId: line.id,
        serial: "SYNTHETIC-CUSTOMER-" + id(),
        sizeKg: 6,
        testDue: due,
        reason: "Synthetic customer cylinder intake only",
      });
      await run("inventory", "cylinder.inspect", {
        id: c.id,
        passed: true,
        nextDue: due,
        notes: "Synthetic documented physical inspection fixture only",
      });
      await run("inventory", "gas.inspection.record", {
        lineId: line.id,
        cylinderId: c.id,
        allowableKg: 6,
        reason: "Synthetic independently inspected safe fill allowance",
      });
    }
    await f.transition(o, "accepted", "dispatcher");
    await f.transition(o, "preparing", "dispatcher");
    await f.call("dispatcher", "delivery.coverage.confirm", {
      orderId: o.id,
      reason: "Synthetic street confirmed against fixture delivery coverage",
    });
    await f.call("inventory", "invoice.issue", { orderId: o.id });
    return f.snapshot(o.id);
  };
  const assign = async (o: any) =>
    run("dispatcher", "dispatch.assign", {
      orderId: o.id,
      driverId: f.actors.driver.id,
      version: Number((await f.snapshot(o.id)).tracking_version),
      reason: "Synthetic independent Dispatch assignment",
    });
  const ack = async (o: any) =>
    run("driver", "dispatch.respond", {
      orderId: o.id,
      version: Number((await f.snapshot(o.id)).tracking_version),
      decision: "acknowledged",
      reason: "Synthetic driver accepts current assignment",
    });
  const arrive = async (o: any) => {
    await f.pickup(o);
    await f.transition(o, "out_for_delivery", "driver");
    return run("driver", "delivery.arrived", {
      orderId: o.id,
      version: Number((await f.snapshot(o.id)).tracking_version),
      reason: "Synthetic simulated arrival; no real travel or GPS",
    });
  };
  const proof = async (
    o: any,
    bytes = "Synthetic consented current-attempt proof",
  ) =>
    f.db.transaction(async (tx) =>
      attachDeliveryPhoto(
        tx,
        (await actor(tx, f.actors.driver.token))!,
        o.id,
        Buffer.from(bytes),
        "Synthetic journey proof only",
        true,
      ),
    );
  const complete = async (o: any) => {
    const owned = (await f.call("customer", "orders", { id: o.id }))[0];
    return run("driver", "driver.complete", {
      orderId: o.id,
      version: Number((await f.snapshot(o.id)).tracking_version),
      code: owned.confirmation_code,
      handover: true,
    });
  };
  return {
    ...f,
    run,
    vehicle,
    meter,
    start,
    trip,
    end,
    make,
    prepare,
    assign,
    ack,
    arrive,
    proof,
    complete,
  };
}
