import { access } from "node:fs/promises";
import path from "node:path";
import { fixture } from "../tests/helpers/service-fixture";
import { id } from "../apps/web/lib/auth";
const dir = path.resolve(".data/service-booking-browser-qa-20261030");
try {
  await access(dir);
  throw new Error("QA directory already exists; refusing to overwrite.");
} catch (e: any) {
  if (e.code !== "ENOENT") throw e;
}
const f = await fixture(dir);
try {
  for (const [role, a] of Object.entries(f.actors))
    await f.db.query("UPDATE users SET name=$1,email=$2 WHERE id=$3", [
      "QA " + role,
      role + "@bookings-qa.example.test",
      a.id,
    ]);
  const s = (await f.call("customer", "services.catalogue"))[0];
  const config = { ...s.config, zones: ["Lekki"] };
  const p = await f.call("service_manager", "services.propose", {
    serviceId: s.id,
    branchId: "lagos",
    version: s.version,
    config,
    reason: "Isolated browser fixture coverage configuration",
  });
  await f.call("owner", "approval.decide", {
    id: p.id,
    decision: "approve",
    reason: "Independent synthetic browser fixture approval",
  });
  const input = (slotId?: string) => {
    const r = f.input(slotId);
    return {
      ...r,
      serviceVersion: 3,
      address: { ...r.address, zone: "Lekki" },
    };
  };
  const completed = await f.call("customer", "booking.create", input());
  async function start(bid: string) {
    for (const status of ["confirmed", "assigned"])
      await f.call("service_manager", "booking.transition", {
        bookingId: bid,
        status,
        reason: "Synthetic browser fixture authorised transition",
      });
    for (const status of ["en_route", "in_progress"])
      await f.call("technician", "booking.transition", {
        bookingId: bid,
        status,
        reason: "Synthetic browser fixture technician arrival",
      });
  }
  await start(completed.id);
  await f.call("technician", "booking.report", {
    bookingId: completed.id,
    outcome: "success",
    responses: [
      {
        id: "equipment_check",
        passed: true,
        notes: "Synthetic browser fixture inspection evidence",
      },
    ],
    findings: "Synthetic service findings for browser verification",
    workPerformed: "Synthetic approved service work for browser verification",
    recommendations: "No additional synthetic follow-up required",
  });
  await f.call("customer", "booking.acknowledge", {
    bookingId: completed.id,
    accepted: true,
    notes: "Synthetic customer report acknowledgement",
  });
  const pending = await f.createSlot(3);
  await f.call("customer", "booking.create", input(pending.id));
  const cancelledSlot = await f.createSlot(6),
    cancelled = await f.call(
      "customer",
      "booking.create",
      input(cancelledSlot.id),
    );
  await f.call("customer", "booking.cancel", {
    bookingId: cancelled.id,
    reason: "Synthetic customer cancellation for browser history",
  });
  const actionSlot = await f.createSlot(9),
    action = await f.call("customer", "booking.create", input(actionSlot.id));
  await start(action.id);
  await f.call("technician", "booking.quote", {
    bookingId: action.id,
    labourKobo: 150000,
    lines: [],
    notes: "Synthetic customer quotation awaiting decision",
  });
  await f.createSlot(12);
  await f.createSlot(15);
  await f.db.query(
    "INSERT INTO account_addresses(id,customer_id,label,street,zone,phone,location_id,is_default) VALUES($1,$2,'QA Home','12 Synthetic Street','Lekki','08012345678',(SELECT id FROM delivery_locations WHERE name='Lekki' LIMIT 1),true)",
    [id(), f.actors.customer.id],
  );
  console.log(
    "Prepared isolated booking QA dataset. Synthetic [role]@bookings-qa.example.test accounts use Services-fixture-only-123!",
  );
} finally {
  await f.db.close?.();
}
