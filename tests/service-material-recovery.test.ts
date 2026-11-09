import test from "node:test";
import assert from "node:assert/strict";
import { fixture, begin, authoriseWork } from "./helpers/service-fixture";
import { id } from "../apps/web/lib/auth";
const mutate = (f: any, role: string, action: string, input: any) =>
  f.call(role, action, { ...input, operationKey: id() });
test("SVC-REC01: expired work authority stops new use but independent recovery reconciles actual issued/used/damaged/returned stock exactly once", async () => {
  const f = await fixture();
  const clock = Date.now;
  try {
    const b = await begin(f);
    await f.db.query(
      "UPDATE inventory SET quantity=10,price_kobo=5000,published=true WHERE product_id='hose' AND branch_id='lagos'",
    );
    const q = await mutate(f, "technician", "booking.quote", {
      bookingId: b.id,
      labourKobo: 10000,
      validUntil: new Date(Date.now() + 60000).toISOString(),
      lines: [{ productId: "hose", quantity: 3 }],
      notes: "Synthetic current authorised work and materials",
    });
    await mutate(f, "customer", "booking.quote.decide", {
      bookingId: b.id,
      quoteId: q.id,
      approved: true,
    });
    await authoriseWork(f, b.id);
    const m = (
      await f.db.query("SELECT * FROM service_materials WHERE booking_id=$1", [
        b.id,
      ])
    ).rows[0];
    await mutate(f, "inventory", "service.material.issue", {
      bookingId: b.id,
      materialId: m.id,
      unitCostKobo: 25000,
    });
    Date.now = () => clock() + 120000;
    await assert.rejects(
      () =>
        mutate(f, "technician", "service.material.usage", {
          bookingId: b.id,
          materialId: m.id,
          used: 1,
          damaged: 1,
        }),
      /expired/,
    );
    await f.call("owner", "technician.qualify", {
      userId: f.actors.inventory.id,
      code: "inventory_safety",
      evidence:
        "Synthetic independently verified inventory recovery qualification",
      expiresAt: new Date(clock() + 86400000).toISOString(),
    });
    await f.call("inventory", "reauth", {
      password: "Services-fixture-only-123!",
    });
    const current = (await f.call("owner", "bookings", { id: b.id }))[0],
      input = {
        bookingId: b.id,
        materialId: m.id,
        version: current.version,
        used: 1,
        damaged: 1,
        missing: 0,
        returned: 1,
        damagedReturned: 1,
        evidence: "Actual synthetic physical count and returned damaged unit",
        reason: "Reconcile stopped-work custody without authorising new work",
      };
    await assert.rejects(
      () => mutate(f, "technician", "service.material.recovery.request", input),
      /permission/,
    );
    await assert.rejects(
      () => mutate(f, "inventory", "service.material.recovery.execute", input),
      /owner and finance/,
    );
    const review = await mutate(
      f,
      "inventory",
      "service.material.recovery.request",
      input,
    );
    await f.call("owner", "approval.decide", {
      id: review.id,
      decision: "approve",
      reason: "Independent owner actual custody review",
    });
    await f.call("finance", "approval.decide", {
      id: review.id,
      decision: "approve",
      reason: "Independent finance actual custody review",
    });
    const operation = { ...input, operationKey: id() };
    await f.call("inventory", "service.material.recovery.execute", operation);
    await f.call("inventory", "service.material.recovery.execute", operation);
    const stock = (
      await f.db.query(
        "SELECT quantity FROM inventory WHERE product_id='hose' AND branch_id='lagos'",
      )
    ).rows[0];
    assert.equal(Number(stock.quantity), 8);
    const recovery = (
      await f.db.query(
        "SELECT * FROM service_material_recovery_history WHERE material_id=$1",
        [m.id],
      )
    ).rows[0];
    assert.equal(recovery.detail.returned, 1);
    assert.equal(recovery.detail.damagedReturned, 1);
    await assert.rejects(
      () =>
        f.db.query(
          "DELETE FROM service_material_recovery_history WHERE id=$1",
          [recovery.id],
        ),
      /immutable|append|deleted|modified/i,
    );
    await mutate(f, "technician", "booking.report", {
      bookingId: b.id,
      outcome: "unable",
      responses: [
        {
          id: "equipment_check",
          passed: false,
          notes: "Stopped work could not complete safely",
        },
      ],
      findings: "Synthetic actual findings",
      workPerformed: "Synthetic actual stopped work",
      recommendations: "Supervisor review required",
    });
    const report = (
      await f.db.query("SELECT body FROM service_reports WHERE booking_id=$1", [
        b.id,
      ])
    ).rows[0];
    assert.equal(report.body.invoiceTotalKobo, 35000);
  } finally {
    Date.now = clock;
    await f.db.close?.();
  }
});
