import test from "node:test";
import assert from "node:assert/strict";
import { fixture, begin } from "./helpers/service-fixture";
import { id } from "../apps/web/lib/auth";
import {
  technicianCount,
  technicianDate,
  technicianGreeting,
  technicianReviewLabel,
  technicianTerminal,
} from "../packages/business-rules/src/technician-presentation";

test("TEC-DATA: daily overview, next appointment, active/upcoming lists and terminal history derive from owned canonical records", async () => {
  const f = await fixture();
  try {
    const booking = await begin(f);
    let snap = await f.call("technician", "technician.snapshot");
    assert.equal(snap.nextAppointment.id, booking.id);
    assert.equal(snap.summary.in_progress, 1);
    assert.equal(snap.summary.upcoming, 0);
    assert.equal(snap.summary.completed_today, 0);
    assert.equal(snap.today.total, 0);
    await f.db.query(
      "UPDATE service_slots SET starts_at=now()-interval '10 minutes',ends_at=now()+interval '50 minutes' WHERE id=(SELECT slot_id FROM service_bookings WHERE id=$1)",
      [booking.id],
    );
    snap = await f.call("technician", "technician.snapshot");
    assert.equal(snap.today.total, 1);
    assert.equal(snap.today.completed, 0);
    assert.equal(snap.today.rows[0].id, booking.id);
    await f.db.query(
      "UPDATE service_bookings SET status='completed' WHERE id=$1",
      [booking.id],
    );
    snap = await f.call("technician", "technician.snapshot");
    assert.equal(
      snap.summary.completed_today,
      null,
      "unknown terminal time must never become today's zero/completion",
    );
    assert.equal(snap.nextAppointment, null);
    assert.equal(
      (await f.call("technician", "technician.jobs", { filter: "active" }))
        .total,
      0,
    );
    assert.equal(
      (await f.call("technician", "technician.jobs", { filter: "past" }))
        .rows[0].id,
      booking.id,
    );
    await f.db.query(
      "INSERT INTO service_booking_events(id,booking_id,actor_id,status,note) VALUES($1,$2,$3,'completed','Synthetic terminal fixture')",
      [id(), booking.id, f.actors.technician.id],
    );
    snap = await f.call("technician", "technician.snapshot");
    assert.equal(snap.summary.completed_today, 1);
    assert.equal(snap.today.completed, 1);
    const slot = await f.createSlot(3),
      second = await f.call("customer", "booking.create", f.input(slot.id));
    for (const status of ["confirmed", "assigned"])
      await f.call("service_manager", "booking.transition", {
        bookingId: second.id,
        status,
        reason: "Synthetic approved assignment",
      });
    snap = await f.call("technician", "technician.snapshot");
    assert.equal(snap.summary.upcoming, 1);
    assert.equal(snap.nextAppointment.id, second.id);
    assert.equal(
      (await f.call("technician", "technician.jobs", { filter: "upcoming" }))
        .total,
      1,
    );
    await f.db.query(
      "UPDATE service_bookings SET assignment_response='declined' WHERE id=$1",
      [second.id],
    );
    snap = await f.call("technician", "technician.snapshot");
    assert.equal(snap.summary.upcoming, 0);
    assert.equal(snap.nextAppointment, null);
  } finally {
    await f.db.close();
  }
});

test("TEC-SEC: overview and filters reject identity/role/branch tampering; qualifications require independent active verifier", async () => {
  const f = await fixture();
  try {
    const b = await begin(f);
    await assert.rejects(() => f.call("customer", "technician.snapshot"));
    await assert.rejects(() =>
      f.call("technician", "technician.jobs", {
        filter: "active",
        technicianId: f.actors.owner.id,
      }),
    );
    const second = id();
    await f.db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) SELECT $1,'Other technician',$2,password_hash,'technician','lagos' FROM users WHERE id=$3",
      [second, second + "@example.test", f.actors.technician.id],
    );
    await f.db.query(
      "UPDATE service_bookings SET technician_id=$1 WHERE id=$2",
      [second, b.id],
    );
    const snap = await f.call("technician", "technician.snapshot");
    assert.equal(snap.nextAppointment, null);
    assert.equal(snap.summary.total, 0);
    assert.equal(snap.today.total, 0);
    assert.equal(
      (await f.call("technician", "bookings", { id: b.id })).length,
      0,
    );
    await assert.rejects(() =>
      f.call("technician", "booking.assignment.respond", {
        bookingId: b.id,
        version: 1,
        decision: "acknowledged",
        reason: "Unauthorised foreign assignment",
      }),
    );
    const qualified = (
      await f.call("technician", "technician.snapshot")
    ).qualifications.find((q: any) => q.code === "lpg_service");
    assert.equal(qualified.verified, true);
    await f.db.query("UPDATE users SET active=false WHERE id=$1", [
      f.actors.owner.id,
    ]);
    assert.equal(
      (await f.call("technician", "technician.snapshot")).qualifications.find(
        (q: any) => q.code === "lpg_service",
      ).verified,
      false,
    );
    await f.db.query("UPDATE branches SET active=false WHERE id='lagos'");
    await assert.rejects(
      () => f.call("technician", "technician.snapshot"),
      /branch/i,
    );
    await assert.rejects(
      () => f.call("technician", "technician.jobs", { filter: "active" }),
      /branch/i,
    );
  } finally {
    await f.db.close();
  }
});

test("TEC-PRESENT: review labels never authorise work, unknown counts stay unknown and dates use Lagos", () => {
  assert.equal(technicianGreeting("2026-11-18T23:30:00Z"), "Good morning");
  assert.match(technicianDate("2026-11-18T23:30:00Z", true), /19 Nov 2026/);
  assert.equal(technicianDate(null), "Date unavailable");
  for (const value of [null, undefined, -1, NaN, "0"])
    assert.equal(technicianCount(value), "—");
  assert.equal(technicianCount(0), "0");
  assert.equal(
    technicianReviewLabel({
      status: "assigned",
      assignment_response: "pending",
    }),
    "Review assignment",
  );
  assert.equal(
    technicianReviewLabel({ status: "in_progress", work_phase: "assessment" }),
    "Review assessment",
  );
  assert.equal(
    technicianReviewLabel({ status: "completed" }),
    "View service record",
  );
  assert.equal(technicianTerminal("awaiting_acknowledgement"), false);
  for (const status of ["completed", "failed", "cancelled"])
    assert.equal(technicianTerminal(status), true);
});

test("TEC-CONFIG: nested technician shell resolves real local plugins and preserves local-only runtime guard",async()=>{
 const {createRequire}=await import("node:module");
 const {existsSync}=await import("node:fs");
 const require=createRequire(import.meta.url);
 const key=require.resolve("../apps/mobile/technician/app.config.js");
 const oldProfile=process.env.EAS_BUILD_PROFILE,oldOrigin=process.env.EXPO_PUBLIC_API_URL;
 try {
  process.env.EAS_BUILD_PROFILE="local-demo";process.env.EXPO_PUBLIC_API_URL="http://127.0.0.1:3104";
  delete require.cache[key];const config=require(key);
  assert.equal(config.extra.technicianOnly,true);assert.equal(config.ios.bundleIdentifier,"com.easygasng.technician.local");
  for(const entry of config.plugins){const name=Array.isArray(entry)?entry[0]:entry;if(name.includes("/plugins/")){assert.ok(name.startsWith("/"));assert.ok(existsSync(name+".js")||existsSync(name));}}
  process.env.EAS_BUILD_PROFILE="production";delete require.cache[key];assert.throws(()=>require(key),/local-only/);
 } finally {if(oldProfile===undefined)delete process.env.EAS_BUILD_PROFILE;else process.env.EAS_BUILD_PROFILE=oldProfile;if(oldOrigin===undefined)delete process.env.EXPO_PUBLIC_API_URL;else process.env.EXPO_PUBLIC_API_URL=oldOrigin;delete require.cache[key];}
});
