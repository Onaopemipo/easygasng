import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerHooks } from "node:module";
import { fixture } from "./helpers/service-fixture";
import { id } from "../apps/web/lib/auth";
import { dispatch } from "../apps/web/lib/service";
import { one } from "../apps/web/lib/db";
import { serviceInvoiceSource } from "../apps/web/lib/service-invoice-source";
registerHooks({
  load(url, context, next) {
    if (url.endsWith(".css"))
      return {
        format: "module",
        shortCircuit: true,
        source: "export default {}",
      };
    return next(url, context);
  },
});
const { BookingSummaries, bookingMatches } = await import(
  "../apps/web/components/customer-bookings"
);
const { ServiceRequestLauncher, CustomerServiceCatalogue } = await import(
  "../apps/web/components/service-request"
);
const { BookingCard } = await import("../apps/web/components/professional-services");
function request(f: Awaited<ReturnType<typeof fixture>>, extra = {}) {
  const { slotId, ...input } = f.input();
  return {
    ...input,
    preferredStart: new Date(Date.now() + 7 * 86400000).toISOString(),
    ...extra,
  };
}
const sample = {
  id: "owned",
  reference: "EGS-SYNTHETIC",
  status: "pending_confirmation",
  schedule_pending: true,
  starts_at: "2030-01-01T09:00:00Z",
  snapshot: { name: "Cooker servicing" },
  address: {
    street: "Private full street",
    zone: "Ikoyi",
    phone: "08012345678",
  },
  billing: { dueKobo: 120000 },
  equipment: { concerns: "Private equipment concern" },
  events: [],
};
test("CSBK-UI01: compact booking summaries label preferred times without mounting contact, payment or reports", () => {
  const html = renderToStaticMarkup(
    React.createElement(BookingSummaries, { rows: [sample], open() {} }),
  );
  assert.match(html, /Preferred visit/);
  assert.match(html, /Awaiting confirmation/);
  assert.match(html, /EGS-SYNTHETIC/);
  assert.doesNotMatch(
    html,
    /08012345678|Private full street|Private equipment concern|<form|Pay now/,
  );
  assert.equal(bookingMatches(sample, "Upcoming", "cooker"), true);
  assert.equal(bookingMatches(sample, "Completed", ""), false);
  assert.equal(
    bookingMatches({ ...sample, status: "failed" }, "Cancelled", ""),
    true,
  );
  assert.equal(bookingMatches(sample, "Upcoming", "unknown"), false);
});
test("CSBK-UI02: service launcher offers booking without loading technician availability or an expanded form", () => {
  const html = renderToStaticMarkup(
    React.createElement(ServiceRequestLauncher, {
      service: { id: "cooker", config: {} },
      customerId: "synthetic",
      done() {},
    }),
  );
  assert.match(html, /Book service/);
  assert.match(html, /arrange a provider/);
  assert.doesNotMatch(html, /No qualified|<form|Recheck availability/);
});
test("CSBK-API01: requests are accepted with no available technician, reserve no capacity, notify coordination and recover without duplication", async () => {
  const f = await fixture();
  try {
    await f.db.query(
      "UPDATE users SET technician_available=false WHERE role='technician'",
    );
    await f.db.query(
      "UPDATE technician_qualifications SET expires_at=now()-interval '1 day' WHERE user_id=$1",
      [f.actors.technician.id],
    );
    const input = request(f);
    const [a, b] = await Promise.all([
      f.call("customer", "booking.create", input),
      f.call("customer", "booking.create", input),
    ]);
    assert.equal(a.id, b.id);
    const row = await one(f.db, "SELECT * FROM service_bookings WHERE id=$1", [
      a.id,
    ]);
    const slot = await one(f.db, "SELECT * FROM service_slots WHERE id=$1", [
      row!.slot_id,
    ]);
    assert.equal(row!.technician_id, null);
    assert.equal(row!.status, "pending_confirmation");
    assert.equal(slot!.request_only, true);
    assert.equal(slot!.blocked, true);
    assert.equal(slot!.technician_id, null);
    assert.equal(
      (
        await f.call("customer", "booking.recover", {
          key: input.idempotencyKey,
        })
      ).id,
      a.id,
    );
    assert.equal(
      (await f.call("customer", "bookings"))[0].schedule_pending,
      true,
    );
    assert.equal(
      (await one(
        f.db,
        "SELECT count(*)::int n FROM service_slots WHERE request_only",
      ))!.n,
      1,
    );
    assert.equal(
      (
        await f.call("customer", "services.slots", {
          serviceId: input.serviceId,
          branchId: input.branchId,
        })
      ).length,
      0,
    );
    assert.ok(
      (await one(
        f.db,
        "SELECT count(*)::int n FROM notifications WHERE title='Service request needs scheduling'",
      ))!.n > 0,
    );
    assert.equal(await serviceInvoiceSource(f.db, row!), null);
    await assert.rejects(
      f.call("finance", "invoice.service.issue", { bookingId: a.id }),
    );
    // Another customer can request the same preference: these are not reserved slots.
    await f.call("commercial", "booking.create", {
      ...input,
      idempotencyKey: id(),
    });
    assert.equal(
      (await one(
        f.db,
        "SELECT count(*)::int n FROM service_slots WHERE request_only",
      ))!.n,
      2,
    );
  } finally {
    await f.db.close?.();
  }
});
test("CSBK-API02: unassigned requests reject invalid time, coverage, stale pricing, inactive service, mixed slot inputs and foreign follow-ups without orphan rows", async () => {
  const f = await fixture();
  try {
    const good = request(f);
    for (const invalid of [
      { preferredStart: new Date(Date.now() - 86400000).toISOString() },
      { preferredStart: new Date(Date.now() + 181 * 86400000).toISOString() },
      { serviceVersion: 99 },
      { address: { ...good.address, zone: "Outside coverage" } },
      { slotId: f.input().slotId },
      { followupId: id() },
    ])
      await assert.rejects(
        f.call("customer", "booking.create", {
          ...good,
          ...invalid,
          idempotencyKey: id(),
        }),
      );
    await assert.rejects(f.call("technician", "booking.create", good));
    await f.db.query(
      "UPDATE service_catalogue SET config=jsonb_set(config,'{active}','false') WHERE id=$1 AND branch_id=$2",
      [good.serviceId, good.branchId],
    );
    await assert.rejects(f.call("customer", "booking.create", good));
    assert.equal(
      (await one(
        f.db,
        "SELECT count(*)::int n FROM service_slots WHERE request_only",
      ))!.n,
      0,
    );
    assert.equal(
      (await one(f.db, "SELECT count(*)::int n FROM service_bookings"))!.n,
      0,
    );
  } finally {
    await f.db.close?.();
  }
});
test("CSBK-API03: ownership and actual qualified assignment remain mandatory before confirming or progressing a request", async () => {
  const f = await fixture();
  try {
    const input = request(f),
      created = await f.call("customer", "booking.create", input);
    const b = (await f.call("customer", "bookings"))[0];
    assert.deepEqual(await f.call("commercial", "bookings", { id: b.id }), []);
    assert.deepEqual(await f.call("technician", "bookings"), []);
    await assert.rejects(
      f.call("owner", "booking.transition", {
        bookingId: b.id,
        status: "confirmed",
        reason: "Cannot confirm an unallocated request",
      }),
      /provider|qualified/,
    );
    await assert.rejects(
      f.call("customer", "booking.reschedule", {
        bookingId: b.id,
        slotId: (await one(
          f.db,
          "SELECT slot_id FROM service_bookings WHERE id=$1",
          [b.id],
        ))!.slot_id,
        version: b.version,
        reason: "Request slots cannot be reserved",
      }),
      /no longer available/,
    );
    await f.call("owner", "booking.reschedule", {
      bookingId: b.id,
      slotId: f.input().slotId,
      version: b.version,
      reason: "Allocate qualified appointment after coordination",
    });
    let allocated = (await f.call("owner", "bookings", { id: b.id }))[0];
    assert.equal(allocated.schedule_pending, false);
    assert.equal(allocated.technician_id, f.actors.technician.id);
    await f.call("owner", "booking.transition", {
      bookingId: b.id,
      status: "confirmed",
      reason: "Confirm the allocated qualified appointment",
    });
    assert.equal(
      (await f.call("customer", "bookings", { id: b.id }))[0].status,
      "confirmed",
    );
    assert.ok(
      await serviceInvoiceSource(
        f.db,
        (await one(f.db, "SELECT * FROM service_bookings WHERE id=$1", [
          created.id,
        ])) as any,
      ),
    );
  } finally {
    await f.db.close?.();
  }
});

test("CSBK-API04: preferred-time changes remain unassigned, versioned and noncollectible without technician availability", async () => {
  const f = await fixture();
  try {
    await f.db.query(
      "UPDATE users SET technician_available=false WHERE id=$1",
      [f.actors.technician.id],
    );
    const created = await f.call("customer", "booking.create", request(f));
    const before = (
      await f.call("customer", "bookings", { id: created.id })
    )[0];
    const preferredStart = new Date(Date.now() + 9 * 86400000).toISOString();
    const change = {
      bookingId: created.id,
      version: before.version,
      preferredStart,
      reason: "Customer preferred visit date changed",
    };
    await f.call("customer", "booking.reschedule", change);
    const after = (await f.call("customer", "bookings", { id: created.id }))[0];
    assert.equal(after.schedule_pending, true);
    assert.equal(after.billing.dueKobo, null);
    assert.equal(new Date(after.starts_at).toISOString(), preferredStart);
    await assert.rejects(
      f.call("customer", "booking.reschedule", {
        ...change,
        preferredStart: new Date(Date.now() + 10 * 86400000).toISOString(),
      }),
      /Refresh/,
    );
    await assert.rejects(
      f.call("commercial", "booking.reschedule", {
        ...change,
        version: after.version,
      }),
      /not found|permission/i,
    );
    await f.db.query(
      "UPDATE service_slots SET starts_at=now()-interval '2 days',ends_at=now()-interval '1 day' WHERE id=(SELECT slot_id FROM service_bookings WHERE id=$1)",
      [created.id],
    );
    await f.call("customer", "booking.cancel", {
      bookingId: created.id,
      version: after.version,
      reason: "Withdraw an unconfirmed request after the preferred day",
    });
    const cancelled = (await f.call("customer", "bookings", { id: created.id }))[0];
    assert.equal(cancelled.status, "cancelled");
    const cancelledView = renderToStaticMarkup(React.createElement(BookingCard, {
      booking: cancelled, user: {...f.actors.customer, role: "customer"}, done: () => {}, compact: true,
    }));
    assert.doesNotMatch(cancelledView, /arranging a provider|Financial exception review/);
  } finally {
    await f.db.close?.();
  }
});

test("CSBK-UI03: catalogue keeps customer booking in a dialog and public sign-in retains the requested service", () => {
  const catalogue = [
    {
      id: "cooker-servicing",
      name: "Cooker servicing",
      config: {
        priceKobo: 1500000,
        pricingModel: "starting",
        description: "Qualified equipment care and assessment.",
        durationMinutes: 60,
      },
    },
  ];
  const customer = renderToStaticMarkup(
    React.createElement(CustomerServiceCatalogue, {
      catalogue,
      customerId: "synthetic",
    }),
  );
  assert.match(customer, /Book service/);
  assert.match(customer, /From ₦15,000/);
  assert.doesNotMatch(
    customer,
    /<form|sign in|<svg[^>]*viewBox="0 0 300 220"/i,
  );
  const guest = renderToStaticMarkup(
    React.createElement(CustomerServiceCatalogue, { catalogue }),
  );
  assert.match(guest, /login\?returnTo=%2Fservices%2Fcooker-servicing/);
});
test("CSBK-API05: lost commit acknowledgement recovers one owned preferred-time request and one preference record", async () => {
  const f = await fixture();
  try {
    const input = { ...request(f), operationKey: id() };
    let fired = false;
    const interrupted = {
      ...f.db,
      transaction: async (fn: any) => {
        const value = await f.db.transaction(fn);
        if (!fired) {
          fired = true;
          throw Object.assign(
            new Error("Injected lost commit acknowledgement"),
            { code: "ECONNRESET" },
          );
        }
        return value;
      },
    };
    await assert.rejects(
      dispatch("booking.create", f.actors.customer.token, input, interrupted),
      /lost commit/,
    );
    const recovered = await f.call("customer", "booking.recover", {
      key: input.idempotencyKey,
    });
    assert.equal(recovered.status, "COMMITTED");
    const retried = await f.call("customer", "booking.create", input);
    assert.equal(retried.id, recovered.id);
    assert.equal(
      (await one(
        f.db,
        "SELECT count(*)::int n FROM service_slots WHERE request_only",
      ))!.n,
      1,
    );
    assert.equal(
      (await one(f.db, "SELECT count(*)::int n FROM service_bookings"))!.n,
      1,
    );
    assert.equal(
      (
        await f.call("commercial", "booking.recover", {
          key: input.idempotencyKey,
        })
      ).status,
      "NOT_FOUND",
    );
  } finally {
    await f.db.close?.();
  }
});
