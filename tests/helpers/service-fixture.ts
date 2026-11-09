import { createDatabase, migrate, one, type DB } from "../../apps/web/lib/db";
import { dispatch } from "../../apps/web/lib/service";
import { id, hashPassword, issueSession } from "../../apps/web/lib/auth";
const password = "Services-fixture-only-123!";
export async function fixture(dataDir: string | DB = "memory://") {
  const db =
    typeof dataDir === "string" ? await createDatabase(dataDir) : dataDir;
  if (typeof dataDir === "string") await migrate(db);
  const actors: Record<string, any> = {};
  for (const role of [
    "owner",
    "service_manager",
    "technician",
    "safety_officer",
    "inventory",
    "finance",
    "customer",
    "commercial",
    "administrator",
  ]) {
    const uid = id();
    await db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES ($1,$2,$3,$4,$5,'lagos')",
      [uid, role, `${uid}@example.test`, hashPassword(password), role],
    );
    actors[role] = { id: uid, token: await issueSession(db, uid) };
  }
  const call = (role: string, action: string, input: any = {}) =>
    dispatch(action, actors[role].token, input, db);
  for (const role of ["owner", "safety_officer", "finance"])
    await call(role, "reauth", { password });
  const expiresAt = new Date(Date.now() + 365 * 86400000).toISOString();
  await call("owner", "technician.qualify", {
    userId: actors.safety_officer.id,
    code: "safety_review",
    evidence: "Synthetic independently reviewed qualification evidence",
    expiresAt,
  });
  await call("owner", "technician.qualify", {
    userId: actors.technician.id,
    code: "lpg_service",
    evidence: "Synthetic independently verified service certificate",
    expiresAt,
  });
  const checks = [
    {
      id: "equipment_check",
      label: "Approved fixture inspection step",
      required: true,
    },
  ];
  const proposal = await call("service_manager", "services.checklist.propose", {
    serviceId: "cooker-servicing",
    branchId: "lagos",
    version: 1,
    checks,
    reason: "Test qualified checklist review",
  });
  for (const role of ["owner", "safety_officer"])
    await call(role, "approval.decide", {
      id: proposal.id,
      decision: "approve",
      reason: "Independent checklist review",
    });
  const s = await one(
    db,
    "SELECT * FROM service_catalogue WHERE id='cooker-servicing' AND branch_id='lagos'",
  );
  const config = {
    ...s!.config,
    active: true,
    pricingModel: "fixed",
    priceKobo: 100000,
    calloutKobo: 20000,
    zones: ["Ikoyi"],
    cancellationHours: 0,
  };
  const change = await call("service_manager", "services.propose", {
    serviceId: s!.id,
    branchId: "lagos",
    version: 1,
    config,
    reason: "Test business-approved service configuration",
  });
  await call("owner", "approval.decide", {
    id: change.id,
    decision: "approve",
    reason: "Independent business approval",
  });
  const start = new Date(Date.now() + 3 * 86400000);
  const createSlot = (offset = 0) =>
    call("service_manager", "services.slot.create", {
      serviceId: s!.id,
      branchId: "lagos",
      technicianId: actors.technician.id,
      startsAt: new Date(+start + offset * 3600000).toISOString(),
      endsAt: new Date(+start + (offset + 1) * 3600000).toISOString(),
    });
  const slot = await createSlot();
  const input = (slotId = slot.id) => ({
    serviceId: s!.id,
    branchId: "lagos",
    serviceVersion: 2,
    slotId,
    address: {
      street: "12 Synthetic Avenue",
      zone: "Ikoyi",
      phone: "08012345678",
    },
    equipment: {
      brand: "Test",
      type: "Cooker",
      burners: 2,
      newEquipment: false,
      supplyPresent: true,
      concerns: "Synthetic fixture assessment request",
    },
    notes: "Fixture only",
    idempotencyKey: id(),
  });
  return { db, actors, call, input, createSlot, checks };
}
export async function begin(f: Awaited<ReturnType<typeof fixture>>) {
  const b = await f.call("customer", "booking.create", f.input());
  for (const status of ["confirmed", "assigned"])
    await f.call("service_manager", "booking.transition", {
      bookingId: b.id,
      status,
      reason: "Test appointment confirmation",
    });
  for (const status of ["en_route", "in_progress"])
    await f.call("technician", "booking.transition", {
      bookingId: b.id,
      status,
      reason: "Test technician arrival",
    });
  return b;
}

// Explicit pre-work authorisation fixture: real approval and verified payment APIs.
export async function authoriseWork(
  f: Awaited<ReturnType<typeof fixture>>,
  bookingId: string,
) {
  let b = (await f.call("technician", "bookings")).find(
    (x: any) => x.id === bookingId,
  );
  const q = b.quotes[0];
  if (q) {
    await f.call("technician", "reauth", { password });
    const r = await f.call("technician", "booking.quote.request_review", {
      bookingId,
      quoteId: q.id,
      reason: "Independent synthetic quotation review",
    });
    await f.call("owner", "approval.decide", {
      id: r.id,
      decision: "approve",
      reason: "Independent owner review of scope and charges",
    });
  }
  b = (await f.call("customer", "bookings")).find(
    (x: any) => x.id === bookingId,
  );
  if (b.billing.dueKobo > 0) {
    await f.call("technician", "booking.cash.record", {
      bookingId,
      amountKobo: b.billing.dueKobo,
      reference: "PREWORK-" + id(),
    });
    const c = await one(
      f.db,
      "SELECT id FROM service_cash_collections WHERE booking_id=$1 AND verified_at IS NULL",
      [bookingId],
    );
    await f.call("finance", "booking.cash.verify", {
      bookingId,
      collectionId: c!.id,
    });
  }
  b = (await f.call("technician", "bookings")).find(
    (x: any) => x.id === bookingId,
  );
  await f.call("technician", "booking.work.start", {
    bookingId,
    version: b.version,
    reason: "Verified scope and payment before physical work",
  });
}

export async function serviceProof(
  f: Awaited<ReturnType<typeof fixture>>,
  bookingId: string,
) {
  if (
    await one(f.db, "SELECT id FROM service_reports WHERE booking_id=$1", [
      bookingId,
    ])
  )
    return;
  const { attachServicePhoto } = await import(
    "../../apps/web/lib/service-photos"
  );
  const { actor } = await import("../../apps/web/lib/auth");
  const sharp = (await import("sharp")).default;
  const raw = await sharp({
    create: { width: 8, height: 8, channels: 3, background: "#008000" },
  })
    .png()
    .toBuffer();
  await f.db.transaction(async (tx) =>
    attachServicePhoto(
      tx,
      await actor(tx, f.actors.technician.token),
      bookingId,
      raw,
      "Isolated synthetic service evidence only",
      true,
    ),
  );
}
