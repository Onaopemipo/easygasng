import test from "node:test";
import assert from "node:assert/strict";
import { fixture, begin } from "./helpers/service-fixture";
import { id } from "../apps/web/lib/auth";
import {
  technicianRange,
  lagosDate,
  historyGroup,
  technicianStatus,
} from "../packages/business-rules/src/technician-mobile";
test("TF-DATA: technician summary and paged jobs are scoped, uncapped and honest about unknown history", async () => {
  const f = await fixture();
  try {
    const b = await begin(f);
    let s = await f.call("technician", "technician.snapshot");
    assert.equal(s.summary.total, 1);
    assert.equal(s.summary.rating, null);
    assert.equal(s.summary.ratingCount, 0);
    await f.db.query(
      `INSERT INTO service_bookings(id,reference,service_id,branch_id,customer_id,slot_id,technician_id,snapshot,checklist,checklist_version,address,equipment,notes,status,idempotency_key,request_hash) SELECT 'test-copy-'||n,'TEST-COPY-'||n,service_id,branch_id,customer_id,slot_id,technician_id,snapshot,checklist,checklist_version,address,equipment,notes,'completed','test-copy-'||n,request_hash FROM service_bookings CROSS JOIN generate_series(1,105) n WHERE id=$1`,
      [b.id],
    );
    s = await f.call("technician", "technician.snapshot");
    assert.equal(s.summary.total, 106);
    assert.equal(s.summary.completed, 105);
    assert.equal(s.summary.completed_month, null);
    const all = await f.call("technician", "technician.jobs");
    assert.equal(all.total, 106);
    assert.equal(all.rows.length, 20);
    assert.equal(all.hasMore, true);
    const last = await f.call("technician", "technician.jobs", { page: 6 });
    assert.equal(last.rows.length, 6);
    assert.equal(last.hasMore, false);
    assert.equal(
      (await f.call("technician", "technician.jobs", { q: "TEST-COPY-105" }))
        .total,
      1,
    );
    assert.equal(
      (await f.call("technician", "technician.jobs", { q: "%' OR 1=1 --" }))
        .total,
      0,
    );
    assert.equal(
      (await f.call("technician", "technician.jobs", { intent: "photo" }))
        .total,
      0,
    );
    assert.equal(
      (await f.call("technician", "bookings", { id: b.id }))[0].id,
      b.id,
    );
    await assert.rejects(() =>
      f.call("technician", "technician.jobs", { technicianId: id() }),
    );
    await assert.rejects(
      () => f.call("customer", "technician.jobs"),
      /permission|allowed|authoris|access/i,
    );
    await assert.rejects(() =>
      f.call("technician", "technician.jobs", {
        from: "2026-12-01",
        to: "2026-01-01",
      }),
    );
    await f.db.query(
      "INSERT INTO service_feedback(id,booking_id,customer_id,rating,body) VALUES($1,$2,$3,4,$4)",
      [
        id(),
        "test-copy-1",
        f.actors.customer.id,
        "Synthetic verified-customer feedback",
      ],
    );
    await f.db.query(
      "INSERT INTO notifications(id,user_id,title,body) SELECT 'tf-note-'||n,$1,'Fixture','Synthetic' FROM generate_series(1,35)n",
      [f.actors.technician.id],
    );
    s = await f.call("technician", "technician.snapshot");
    assert.equal(s.summary.rating, 4);
    assert.equal(s.summary.ratingCount, 1);
    assert.ok(s.unreadNotifications >= 35);
    await f.db.query(
      "INSERT INTO service_booking_events(id,booking_id,actor_id,status,note) SELECT 'tf-event-'||n,'test-copy-'||n,$1,'completed','Synthetic terminal event' FROM generate_series(1,105)n",
      [f.actors.technician.id],
    );
    assert.equal(
      (await f.call("technician", "technician.snapshot")).summary
        .completed_month,
      105,
    );
    await f.db.query(
      "INSERT INTO branches(id,name) VALUES('tf-other','Synthetic other branch')",
    );
    await f.db.query("UPDATE users SET branch_id='tf-other' WHERE id=$1", [
      f.actors.technician.id,
    ]);
    assert.equal((await f.call("technician", "technician.jobs")).total, 0);
    assert.equal(
      (await f.call("technician", "technician.snapshot")).summary.total,
      0,
    );
    await f.db.query("UPDATE users SET branch_id='lagos' WHERE id=$1", [
      f.actors.technician.id,
    ]);
    await f.db.query(
      "UPDATE service_bookings SET technician_id=$1 WHERE id=$2",
      [f.actors.owner.id, b.id],
    );
    assert.equal(
      (await f.call("technician", "bookings", { id: b.id })).length,
      0,
    );
    assert.equal(
      (await f.call("technician", "technician.jobs", { filter: "in_progress" }))
        .total,
      0,
    );
  } finally {
    await f.db.close();
  }
});
test("TF-TIME: Lagos periods, missing history and assessment labels never fabricate completion", () => {
  const now = new Date("2026-11-05T23:30:00Z");
  assert.equal(lagosDate(now), "2026-11-06");
  assert.deepEqual(technicianRange("7", now), {
    from: "2026-10-31",
    to: "2026-11-06",
    days: 7,
  });
  assert.equal(technicianRange("month", now).days, 6);
  assert.equal(historyGroup({}, now), "Historical event date unavailable");
  assert.match(
    historyGroup({ history_at: "2026-11-05T23:10:00Z" }, now),
    /^Today/,
  );
  assert.equal(
    technicianStatus({ status: "in_progress", work_phase: "assessment" }),
    "Assessment in progress",
  );
  assert.equal(
    technicianStatus({ status: "assigned", assignment_response: "declined" }),
    "Declined · awaiting operations",
  );
});
