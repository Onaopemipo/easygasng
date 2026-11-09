import test from "node:test";
import assert from "node:assert/strict";
import { fixture, begin, authoriseWork } from "./helpers/service-fixture";
import { id } from "../apps/web/lib/auth";
const mutate = (f: any, role: string, action: string, input: any) =>
  f.call(role, action, { ...input, operationKey: id() });
test("SVC-CANCEL01: late pre-work cancellation uses existing independent finance approval and preserves money", async () => {
  const f = await fixture();
  try {
    const b = await begin(f);
    let current = (await f.call("owner", "bookings", { id: b.id }))[0];
    const input = {
      bookingId: b.id,
      version: current.version,
      reason: "Synthetic customer requests cancellation before chargeable work",
    };
    await assert.rejects(
      () => mutate(f, "customer", "booking.cancel.request_review", input),
      /permission/,
    );
    await assert.rejects(
      () => mutate(f, "owner", "booking.cancel.execute_review", input),
      /finance approval/,
    );
    const r = await mutate(f, "owner", "booking.cancel.request_review", input);
    await assert.rejects(
      () =>
        f.call("owner", "approval.decide", {
          id: r.id,
          decision: "approve",
          reason: "Attempted self approval",
        }),
      /own|independent|self/i,
    );
    await f.call("finance", "approval.decide", {
      id: r.id,
      decision: "approve",
      reason: "Independent synthetic cancellation review",
    });
    const before = (
      await f.db.query("SELECT * FROM verified_payments WHERE booking_id=$1", [
        b.id,
      ])
    ).rows;
    await mutate(f, "owner", "booking.cancel.execute_review", input);
    current = (await f.call("owner", "bookings", { id: b.id }))[0];
    assert.equal(current.status, "cancelled");
    assert.deepEqual(
      (
        await f.db.query(
          "SELECT * FROM verified_payments WHERE booking_id=$1",
          [b.id],
        )
      ).rows,
      before,
    );
    assert.equal(
      (
        await f.db.query(
          "SELECT * FROM service_booking_events WHERE booking_id=$1 AND status='cancelled'",
          [b.id],
        )
      ).rows.length,
      1,
    );
    await assert.rejects(
      () => mutate(f, "owner", "booking.cancel.execute_review", input),
      /changed/,
    );
  } finally {
    await f.db.close?.();
  }
});
test("SVC-CANCEL02: changed booking and chargeable work invalidate pre-work cancellation authority", async () => {
  const f = await fixture();
  try {
    const b = await begin(f);
    let current = (await f.call("owner", "bookings", { id: b.id }))[0];
    const input = {
      bookingId: b.id,
      version: current.version,
      reason: "Synthetic pre-work review tied to original revision",
    };
    const r = await mutate(f, "owner", "booking.cancel.request_review", input);
    await f.call("finance", "approval.decide", {
      id: r.id,
      decision: "approve",
      reason: "Independent synthetic cancellation review",
    });
    await authoriseWork(f, b.id);
    await assert.rejects(
      () => mutate(f, "owner", "booking.cancel.execute_review", input),
      /changed/,
    );
    current = (await f.call("owner", "bookings", { id: b.id }))[0];
    await assert.rejects(
      () =>
        mutate(f, "owner", "booking.cancel.request_review", {
          ...input,
          version: current.version,
        }),
      /Chargeable/,
    );
  } finally {
    await f.db.close?.();
  }
});
