// Isolated synthetic booking requests only. No provider contact, payment or service fulfilment.
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fixture } from "../tests/helpers/service-fixture";
import { id } from "../apps/web/lib/auth";
if (process.env.DATABASE_URL || process.env.NODE_ENV === "production")
  throw new Error("Local synthetic QA only");
const dir = await mkdtemp(join(tmpdir(), "easygas-service-request-"));
const f = await fixture(join(dir, "db"));
try {
  await f.db.query(
    "UPDATE users SET name='Avery Morgan',email='customer@service-qa.example.test',verified=true WHERE id=$1",
    [f.actors.customer.id],
  );
  const services = (
    await f.db.query(
      "SELECT * FROM service_catalogue WHERE branch_id='lagos' ORDER BY id",
    )
  ).rows;
  for (const s of services) {
    if (s.checklist_version === 0) {
      const q = await f.call("service_manager", "services.checklist.propose", {
        serviceId: s.id,
        branchId: "lagos",
        version: 1,
        checks: f.checks,
        reason: "Synthetic QA checklist approval",
      });
      for (const role of ["owner", "safety_officer"])
        await f.call(role, "approval.decide", {
          id: q.id,
          decision: "approve",
          reason: "Independent synthetic checklist review",
        });
    }
    const current = (
      await f.db.query(
        "SELECT * FROM service_catalogue WHERE id=$1 AND branch_id='lagos'",
        [s.id],
      )
    ).rows[0];
    const proposal = await f.call("service_manager", "services.propose", {
      serviceId: s.id,
      branchId: "lagos",
      version: current.version,
      config: {
        ...current.config,
        active: true,
        zones: ["Victoria Island", "Ikoyi"],
        pricingModel: "fixed",
        priceKobo: 1500000,
        calloutKobo: 0,
        durationMinutes: 60,
        cancellationHours: 0,
        description: current.config.description,
        safety: "The provider will assess your equipment before work begins.",
        inclusions: "Equipment assessment and the agreed service work.",
        exclusions: "Replacement parts are quoted separately when needed.",
        preparation: "Keep the equipment accessible for the visit.",
      },
      reason: "Synthetic customer booking QA configuration",
    });
    await f.call("owner", "approval.decide", {
      id: proposal.id,
      decision: "approve",
      reason: "Independent synthetic catalogue approval",
    });
  }
  const cat = await f.call("customer", "services.catalogue");
  const profile = await f.call("customer", "account.profile");
  const vi = profile.deliveryLocations.find(
    (l: any) => l.name === "Victoria Island",
  );
  if (vi)
    await f.call("customer", "address.save", {
      label: "Home",
      street: "27 Synthetic Avenue, Victoria Island",
      building: "27",
      locationId: vi.id,
      phone: "08012345678",
      isDefault: true,
    });
  for (let n = 0; n < 9; n++) {
    const service = cat[n % cat.length];
    const { slotId, ...input } = f.input();
    const b = await f.call("customer", "booking.create", {
      ...input,
      serviceId: service.id,
      serviceVersion: service.version,
      preferredStart: new Date(Date.now() + (n + 2) * 86400000).toISOString(),
      idempotencyKey: id(),
    });
    if (n === 8) {
      const current = (await f.call("customer", "bookings", { id: b.id }))[0];
      await f.call("customer", "booking.cancel", {
        bookingId: b.id,
        version: current.version,
        reason: "Synthetic cancellation before service scheduling",
      });
    }
  }
  await f.db.query(
    "UPDATE users SET technician_available=false WHERE role='technician'",
  );
  await writeFile(
    ".data/customer-service-booking-qa.json",
    JSON.stringify({
      db: join(dir, "db"),
      email: "customer@service-qa.example.test",
      password: "Services-fixture-only-123!",
    }),
    { mode: 0o600 },
  );
  console.log(
    "Created isolated service-booking fixture; all technicians unavailable. Configuration in ignored .data/customer-service-booking-qa.json",
  );
} finally {
  await f.db.close?.();
}
