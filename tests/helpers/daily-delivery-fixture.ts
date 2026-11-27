import { fixture } from "./order-tracking-fixture";
import { id } from "../../apps/web/lib/auth";
import { one } from "../../apps/web/lib/db";
export async function setup(
  database?: import("../../apps/web/lib/db").DB,
  base?: Awaited<ReturnType<typeof fixture>>,
) {
  process.env.EASYGAS_BACKGROUND_JOBS = "false";
  process.env.EASYGAS_FIELD_OPERATIONS_ENABLED = "true";
  process.env.EASYGAS_BULK_LPG_ENABLED = "true";
  process.env.EASYGAS_TRACKING_MUTATIONS_ENABLED = "true";
  const f = base ?? (await fixture(database));
  await f.call("owner", "reauth", { password: "Tracking-fixture-only-123!" });
  await f.call("dispatcher", "reauth", {
    password: "Tracking-fixture-only-123!",
  });
  await f.call("driver", "driver.restrict");
  await f.db.query(
    "UPDATE settings SET value=$1 WHERE key='gas.quantity_policy'",
    [
      JSON.stringify({
        minimumKg: 0.001,
        maximumKg: 50,
        incrementKg: 0.001,
        precision: 3,
        capacitiesKg: [6, 12.5, 50],
      }),
    ],
  );
  await f.db.exec(
    "UPDATE settings SET value='true' WHERE key='wallet.enabled'; UPDATE settings SET value=jsonb_set(value,'{requiresAddressConfirmation}','false') WHERE key LIKE 'location.%'; INSERT INTO gas_stock(branch_id,grams,reserved_grams) VALUES('lagos',500000,0) ON CONFLICT(branch_id) DO UPDATE SET grams=500000,reserved_grams=0;",
  );
  await f.db.query(
    "INSERT INTO wallet_entries(id,customer_id,amount_kobo,kind,reference) VALUES($1,$2,100000000,'fixture',$1)",
    [id(), f.actors.customer.id],
  );
  const v = await f.call("owner", "fleet.vehicle.create", {
    branchId: "lagos",
    label: "SANDBOX daily vehicle",
    capacityGrams: 200000,
    lpgSuitable: true,
    operationKey: id(),
  });
  const run = (who: string, action: string, input: any = {}) =>
    f.call(who, action, { ...input, operationKey: id() });
  const start = () =>
    run("owner", "daily.start", {
      driverId: f.actors.driver.id,
      vehicleId: v.id,
      openingKg: 100,
      startOdometer: 10,
    });
  const make = async (kg = 6) => {
    const lines = [{ capacityKg: kg <= 6 ? 6 : 50, kg }],
      q = await f.call("customer", "gas.quote", { lines, locationId: "lekki" });
    return f.call("customer", "checkout", {
      items: [],
      gasLines: lines,
      pricing: {
        priceVersion: q.priceVersion,
        feeVersion: q.feeVersion,
        policyVersion: q.policyVersion,
        totalKobo: q.subtotalKobo + q.deliveryKobo,
      },
      address: {
        name: "SANDBOX customer",
        phone: "08012345678",
        street: "12 Synthetic Street",
        zone: "Lekki",
      },
      date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      window: "14:00–18:00",
      paymentMethod: "wallet",
      idempotencyKey: id(),
    });
  };
  const assign = async (o: any) => {
    for (const s of ["accepted", "preparing", "assigned"])
      await f.transition(o, s);
    await run("driver", "dispatch.respond", {
      orderId: o.id,
      version: (await f.snapshot(o.id)).tracking_version,
      decision: "acknowledged",
    });
    return f.snapshot(o.id);
  };
  const arrive = async (o: any) => {
    const current = await f.snapshot(o.id);
    await run("driver", "driver.depart", {
      orderId: o.id,
      version: current.tracking_version,
      manifest: current.manifest,
    });
    await run("driver", "delivery.arrived", {
      orderId: o.id,
      version: (await f.snapshot(o.id)).tracking_version,
      reason: "Driver confirms actual arrival",
    });
    return f.snapshot(o.id);
  };
  const summary = async () => (await f.call("owner", "daily.summary")).runs[0];
  return { ...f, v, run, start, make, assign, arrive, summary };
}
