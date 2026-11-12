import test from "node:test";
import assert from "node:assert/strict";
import { fixture, begin, authoriseWork } from "./helpers/service-fixture";
import { id } from "../apps/web/lib/auth";
import { technicianSessionPermission } from "../apps/web/lib/technician-session";
test("TECH-T26 unpaid work start fails at backend and changes no booking state", async () => {
  const f = await fixture();
  try {
    const b = await begin(f);
    const before = (await f.call("technician", "bookings"))[0];
    await assert.rejects(
      () =>
        f.call("technician", "booking.work.start", {
          bookingId: b.id,
          version: before.version,
          reason: "Attempt unpaid chargeable start",
          operationKey: id(),
        }),
      /Verified payment/,
    );
    await assert.rejects(
      () =>
        f.call("technician", "booking.report", {
          bookingId: b.id,
          outcome: "success",
          responses: [
            {
              id: "equipment_check",
              passed: true,
              notes: "Inspection evidence recorded",
            },
          ],
          findings: "Documented assessment only",
          workPerformed: "Attempt unapproved chargeable work",
          recommendations: "",
        }),
      /Verified payment/,
    );
    await assert.rejects(
      () =>
        f.call("technician", "service.material.usage", {
          bookingId: b.id,
          materialId: id(),
          used: 1,
          damaged: 0,
        }),
      /Verified payment/,
    );
    const after = (await f.call("technician", "bookings"))[0];
    assert.equal(after.version, before.version);
    assert.equal(after.work_phase, "assessment");
    await authoriseWork(f, b.id);
    assert.equal(
      (await f.call("technician", "bookings"))[0].work_phase,
      "authorised",
    );
  } finally {
    await f.db.close?.();
  }
});
test("TECH-T21 quotation needs independent owner decision, customer approval and verified payment", async () => {
  const f = await fixture();
  try {
    const b = await begin(f);
    const q = await f.call("technician", "booking.quote", {
      bookingId: b.id,
      labourKobo: 100000,
      lines: [],
      notes: "Isolated assessment scope",
    });
    const start = async () => {
      const current = (await f.call("technician", "bookings"))[0];
      return f.call("technician", "booking.work.start", {
        bookingId: b.id,
        version: current.version,
        reason: "Request scoped service work",
        operationKey: id(),
      });
    };
    await assert.rejects(start, /Customer approval/);
    await assert.rejects(
      () =>
        f.call("technician", "booking.quote.decide", {
          bookingId: b.id,
          quoteId: q.id,
          approved: true,
        }),
      /Only the customer/,
    );
    await f.call("customer", "booking.quote.decide", {
      bookingId: b.id,
      quoteId: q.id,
      approved: true,
    });
    await assert.rejects(start, /Independent business approval/);
    await authoriseWork(f, b.id);
    assert.equal(
      (await f.call("technician", "bookings"))[0].work_phase,
      "authorised",
    );
    const revision = await f.call("technician", "booking.quote", {
      bookingId: b.id,
      labourKobo: 150000,
      lines: [],
      notes: "Additional scope requires new approvals",
    });
    assert.ok(revision.id);
    await assert.rejects(start, /Customer approval/);
  } finally {
    await f.db.close?.();
  }
});
test("TECH-T02 technician capability excludes finance, approvals, delivery and unrestricted stock", () => {
  const u: any = { technician_service_only: true };
  for (const a of [
    "approval.decide",
    "booking.cash.record",
    "booking.cash.verify",
    "delivery.complete",
    "checkout",
    "wallet",
    "inventory.adjust",
  ])
    assert.throws(
      () => technicianSessionPermission(u, a, {}),
      /limited to assigned/,
    );
  assert.throws(
    () =>
      technicianSessionPermission(u, "booking.transition", {
        status: "completed",
      }),
    /visit progression/,
  );
});
test("TECH-T08 restricted session enforces assignment scope and cannot collect or fake payments", async () => {
  const f = await fixture();
  try {
    await begin(f);
    await f.call("technician", "technician.restrict");
    await assert.rejects(
      () =>
        f.call("technician", "booking.cash.record", {
          bookingId: id(),
          amountKobo: 100,
          reference: "FAKE-PAYMENT",
        }),
      /limited to assigned/,
    );
    assert.equal((await f.call("technician", "bookings")).length, 1);
    await assert.rejects(
      () => f.call("customer", "technician.restrict"),
      /permission/,
    );
  } finally {
    await f.db.close?.();
  }
});
test("TECH-T04 suspended, wrong-branch and expired-qualification actors cannot authorise paid work", async () => {
  const f = await fixture();
  try {
    const b = await begin(f);
    await authoriseWork(f, b.id);
    const current = (await f.call("technician", "bookings"))[0];
    const request = {
      bookingId: b.id,
      version: current.version,
      reason: "Attempt after eligibility changed",
      operationKey: id(),
    };
    await f.db.query(
      "INSERT INTO branches(id,name) VALUES('tech-test-other','Isolated other branch')",
    );
    await f.db.query(
      "UPDATE users SET branch_id='tech-test-other' WHERE id=$1",
      [f.actors.technician.id],
    );
    await assert.rejects(
      () => f.call("technician", "booking.work.start", request),
      /branch|permission/,
    );
    await f.db.query("UPDATE users SET branch_id='lagos' WHERE id=$1", [
      f.actors.technician.id,
    ]);
    await f.db.query(
      "UPDATE technician_qualifications SET expires_at=now()-interval '1 hour' WHERE user_id=$1",
      [f.actors.technician.id],
    );
    await assert.rejects(
      () => f.call("technician", "booking.work.start", request),
      /qualification/,
    );
    await f.db.query("UPDATE users SET active=false WHERE id=$1", [
      f.actors.technician.id,
    ]);
    await assert.rejects(() => f.call("technician", "bookings"), /expired/);
  } finally {
    await f.db.close?.();
  }
});
test("TECH-T40 successful report requires current consented private proof; retries retain one image", async () => {
  const f = await fixture();
  try {
    const b = await begin(f);
    await authoriseWork(f, b.id);
    const report = {
      bookingId: b.id,
      outcome: "success",
      responses: [
        {
          id: "equipment_check",
          passed: true,
          notes: "Actual fixture inspection evidence",
        },
      ],
      findings: "Synthetic findings documented",
      workPerformed: "Synthetic authorised completed work",
      recommendations: "",
    };
    await assert.rejects(
      () => f.call("technician", "booking.report", report),
      /consented proof/,
    );
    const { serviceProof } = await import("./helpers/service-fixture");
    await serviceProof(f, b.id);
    await serviceProof(f, b.id);
    const photos = await f.db.query(
      "SELECT id FROM media_assets WHERE booking_id=$1",
      [b.id],
    );
    assert.equal(photos.rows.length, 1);
    await f.call("technician", "booking.report", report);
    assert.equal(
      (await f.call("customer", "bookings"))[0].status,
      "awaiting_acknowledgement",
    );
  } finally {
    await f.db.close?.();
  }
});
test("TECH-T09 assignment response is versioned, idempotent and required before restricted visit progression", async () => {
  const f = await fixture();
  try {
    const b = await f.call("customer", "booking.create", f.input());
    for (const status of ["confirmed", "assigned"])
      await f.call("service_manager", "booking.transition", {
        bookingId: b.id,
        status,
        reason: "Operations assigns the actual service visit",
      });
    await f.call("technician", "technician.restrict");
    await assert.rejects(
      () =>
        f.call("technician", "booking.transition", {
          bookingId: b.id,
          status: "en_route",
          reason: "Attempt before acknowledging assignment",
        }),
      /Acknowledge/,
    );
    let current = (await f.call("technician", "bookings"))[0];
    await assert.rejects(
      () =>
        f.call("technician", "booking.assignment.respond", {
          bookingId: b.id,
          version: current.version - 1,
          decision: "acknowledged",
          reason: "Stale assignment response",
          operationKey: id(),
        }),
      /Refresh/,
    );
    const request = {
      bookingId: b.id,
      version: current.version,
      decision: "acknowledged",
      reason: "Reviewed assigned service and appointment",
      operationKey: id(),
    };
    await f.call("technician", "booking.assignment.respond", request);
    await f.call("technician", "booking.assignment.respond", request);
    await f.call("technician", "booking.transition", {
      bookingId: b.id,
      status: "en_route",
      reason: "Proceeding to the accepted assessment",
    });
    current = (await f.call("technician", "bookings"))[0];
    assert.equal(current.assignment_response, "acknowledged");
    assert.equal(current.status, "en_route");
  } finally {
    await f.db.close?.();
  }
});

test("SBV-002: a restricted session can browse the public catalogue while management remains protected", async () => {
  const f = await fixture();
  try {
    await f.call("technician", "technician.restrict");
    const catalogue = await f.call("technician", "services.catalogue");
    assert.ok(catalogue.length > 0);
    assert.deepEqual(catalogue, await f.call("owner", "services.catalogue"));
    await assert.rejects(
      () => f.call("technician", "services.manage"),
      /limited to assigned technician/,
    );
    assert.ok((await f.call("owner", "services.manage")).services.length > 0);
  } finally {
    await f.db.close?.();
  }
});
