import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers/service-fixture";
import { id } from "../apps/web/lib/auth";
import { lagosAppointment } from "../packages/business-rules/src/technicians-availability";
import { readFile } from "node:fs/promises";
test("TAV-READ: scoped authoritative directory includes inactive staff, filters, paging and honest schedule states", async () => {
  const f = await fixture();
  try {
    let d = await f.call("owner", "technicians.workspace");
    assert.equal(d.summary.total, 1);
    assert.equal(d.summary.active, 1);
    assert.equal(d.summary.availableToday, 0);
    assert.equal(d.people[0].id, f.actors.technician.id);
    assert.equal(d.people[0].qualifications[0].verified, true);
    assert.equal(d.schedule.length, 1);
    assert.equal(d.schedule[0].bookings, 0);
    assert.equal(d.schedule[0].eligible, true);
    assert.equal(d.permissions.invite, true);
    assert.ok(
      d.verificationTargets.some((p) => p.id === f.actors.safety_officer.id),
    );
    assert.match(d.people[0].qualifications[0].evidence!, /Synthetic/);
    assert.equal(
      (await f.call("finance", "technicians.workspace")).people[0]
        .qualifications[0].evidence,
      null,
    );
    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Lagos",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(d.schedule[0].starts_at));
    assert.equal(
      (await f.call("owner", "technicians.workspace", { date })).summary
        .availableToday,
      1,
    );
    await f.db.query("UPDATE users SET active=false WHERE id=$1", [
      f.actors.technician.id,
    ]);
    d = await f.call("owner", "technicians.workspace", { status: "inactive" });
    assert.equal(d.summary.total, 1);
    assert.equal(d.summary.active, 0);
    assert.equal(d.total, 1);
    assert.equal(d.schedule[0].eligible, false);
    assert.equal(
      (
        await f.call("owner", "technicians.workspace", {
          q: "no such employee",
        })
      ).total,
      0,
    );
    assert.equal(
      (
        await f.call("owner", "technicians.workspace", {
          q: f.actors.technician.id,
        })
      ).total,
      1,
    );
    assert.equal(
      (await f.call("owner", "technicians.workspace", { q: "lpg_service" }))
        .total,
      1,
    );
    assert.equal(
      (await f.call("owner", "technicians.workspace", { page: 2 })).people
        .length,
      0,
    );
    assert.equal(
      (
        await f.call("owner", "technicians.workspace", {
          qualification: "missing",
        })
      ).total,
      0,
    );
  } finally {
    await f.db.close?.();
  }
});
test("TAV-SCOPE: field technicians and customers cannot use management APIs, branch tampering and invalid filters fail closed", async () => {
  const f = await fixture();
  try {
    for (const role of ["technician", "customer", "administrator"])
      await assert.rejects(
        () => f.call(role, "technicians.workspace"),
        /permission|authori|allowed|access/i,
      );
    await assert.rejects(
      () =>
        f.call("service_manager", "technicians.workspace", {
          branchId: "other",
        }),
      /authorised branch/,
    );
    await assert.rejects(() =>
      f.call("owner", "technicians.workspace", { page: 0 }),
    );
    const d = await f.call("safety_officer", "technicians.workspace");
    assert.equal(d.permissions.verify, true);
    assert.equal(d.permissions.schedule, false);
    assert.equal(d.permissions.invite, false);
    assert.ok(!("email" in d.people[0]));
    await f.db.query(
      "INSERT INTO branches(id,name) VALUES('other','Other fixture branch')",
    );
    const other = id();
    await f.db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) SELECT $1,'Other fixture technician',$2,password_hash,'technician','other' FROM users WHERE id=$3",
      [other, other + "@example.test", f.actors.technician.id],
    );
    assert.equal(
      (await f.call("owner", "technicians.workspace", { branchId: "" })).summary
        .total,
      2,
    );
    assert.equal(
      (await f.call("service_manager", "technicians.workspace")).summary.total,
      1,
    );
    assert.equal(
      (await f.call("owner", "technicians.workspace", { branchId: "other" }))
        .people[0].id,
      other,
    );
  } finally {
    await f.db.close?.();
  }
});
test("TAV-SCHEDULE: overlap, unavailable technician, self verification, revoked qualifications and booked blocking cannot bypass backend", async () => {
  const f = await fixture();
  try {
    const existing = (await f.call("owner", "technicians.workspace"))
      .schedule[0];
    const create = {
      serviceId: existing.service_id,
      branchId: "lagos",
      technicianId: existing.technician_id,
      startsAt: new Date(existing.starts_at).toISOString(),
      endsAt: new Date(existing.ends_at).toISOString(),
    };
    await assert.rejects(
      () => f.call("service_manager", "services.slot.create", create),
      /overlap/,
    );
    const adjacent = {
      ...create,
      startsAt: new Date(existing.ends_at).toISOString(),
      endsAt: new Date(
        new Date(existing.ends_at).getTime() + 3600000,
      ).toISOString(),
      operationKey: id(),
    };
    const a = await f.call("service_manager", "services.slot.create", adjacent);
    assert.equal(
      (await f.call("service_manager", "services.slot.create", adjacent)).id,
      a.id,
    );
    await f.db.query(
      "UPDATE users SET technician_available=false WHERE id=$1",
      [f.actors.technician.id],
    );
    await assert.rejects(() => f.createSlot(4), /not available/);
    await assert.rejects(
      () => f.call("customer", "booking.create", f.input()),
      /not available/,
    );
    await f.db.query("UPDATE users SET technician_available=true WHERE id=$1", [
      f.actors.technician.id,
    ]);
    await assert.rejects(
      () =>
        f.call("safety_officer", "technician.qualify", {
          userId: f.actors.safety_officer.id,
          code: "lpg_service",
          evidence: "Self verification is prohibited",
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
        }),
      /independent/,
    );
    const b = await f.call("customer", "booking.create", f.input());
    assert.ok(b.id);
    await assert.rejects(
      () =>
        f.call("service_manager", "services.slot.block", {
          id: existing.id,
          blocked: true,
          reason: "Blocked without cancelling customer",
        }),
      /Reschedule/,
    );
    const q = (await f.call("owner", "technicians.workspace")).people[0]
      .qualifications[0];
    await f.call("owner", "technician.revoke", {
      id: q.id,
      reason: "Qualification no longer valid",
    });
    await assert.rejects(() => f.createSlot(8), /qualification/);
    assert.equal(
      (
        await f.call("owner", "technicians.workspace", {
          qualification: "expired",
        })
      ).total,
      1,
    );
  } finally {
    await f.db.close?.();
  }
});
test("TAV-TIME: Lagos conversion is device-independent and rejects invalid dates; navigation and field shell are preserved", async () => {
  assert.equal(
    lagosAppointment("2026-11-11T09:00"),
    "2026-11-11T08:00:00.000Z",
  );
  assert.throws(() => lagosAppointment("2026-02-30T09:00"));
  assert.throws(() => lagosAppointment("tomorrow"));
  const ui = await readFile(
    "apps/web/components/technicians-availability.tsx",
    "utf8",
  );
  for (const id of [
    "bookings",
    "services",
    "technicians",
    "quotations",
    "incidents",
  ])
    assert.ok(ui.includes(id));
  assert.ok(ui.includes("Modal"));
  assert.ok(ui.includes("No technicians match"));
  assert.ok(!ui.includes("Adebayo Musa"));
  const app = await readFile("apps/mobile/App.tsx", "utf8");
  assert.ok(
    app.indexOf('if (user?.role === "technician")') <
      app.indexOf("const customerView"),
  );
});
