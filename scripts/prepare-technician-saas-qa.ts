import { mkdtemp, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fixture, begin } from "../tests/helpers/service-fixture";
import { id, hashPassword } from "../apps/web/lib/auth";
const dir = await mkdtemp(join(tmpdir(), "easygas-technician-saas-"));
const f = await fixture(join(dir, "db"));
try {
  for (const [role, actor] of Object.entries(f.actors))
    await f.db.query("UPDATE users SET name=$1,email=$2 WHERE id=$3", [
      "QA " + role,
      role + "@technician-saas.example.test",
      actor.id,
    ]);
  const active = await begin(f);
  // Disposable fixture only: make the already assigned assessment a current-day appointment.
  await f.db.query(
    "UPDATE service_slots SET starts_at=now()-interval '20 minutes',ends_at=now()+interval '40 minutes' WHERE id=(SELECT slot_id FROM service_bookings WHERE id=$1)",
    [active.id],
  );
  for (let i = 1; i <= 23; i++) {
    const slot = await f.createSlot(i * 2),
      b = await f.call("customer", "booking.create", f.input(slot.id));
    for (const status of ["confirmed", "assigned"])
      await f.call("service_manager", "booking.transition", {
        bookingId: b.id,
        status,
        reason: "Isolated synthetic browser assignment",
      });
  }
  const slot = await f.createSlot(60),
    closed = await f.call("customer", "booking.create", f.input(slot.id));
  await f.call("customer", "booking.cancel", {
    bookingId: closed.id,
    reason: "Synthetic history cancellation fixture",
  });
  const empty = id();
  await f.db.query(
    "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,'QA empty technician','empty@technician-saas.example.test',$2,'technician','lagos')",
    [empty, hashPassword("Services-fixture-only-123!")],
  );
  await mkdir(".data", { recursive: true });
  await writeFile(
    ".data/technician-saas-qa.json",
    JSON.stringify({
      dir,
      db: join(dir, "db"),
      activeId: active.id,
      activeReference: active.reference,
      closedId: closed.id,
      email: "technician@technician-saas.example.test",
      password: "Services-fixture-only-123!",
    }),
  );
  console.log(
    "Prepared disposable technician fixture; private location recorded in .data/technician-saas-qa.json. No hosted or original business database changed.",
  );
} finally {
  await f.db.close();
}
