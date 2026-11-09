import {serviceProof} from "./helpers/service-fixture";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createDatabase, migrate, one } from "../apps/web/lib/db";
import { dispatch } from "../apps/web/lib/service";
import { id, hashPassword, issueSession } from "../apps/web/lib/auth";
import { fixture, begin, authoriseWork } from "./helpers/service-fixture";
test("service drafts are not sellable; checklist and price activation require independent qualified approval", async () => {
  const db = await createDatabase("memory://");
  try {
    await migrate(db);
    assert.deepEqual(await dispatch("services.catalogue", null, {}, db), []);
    assert.equal(
      (await one(db, "SELECT count(*)::int n FROM service_catalogue"))!.n,
      5,
    );
    assert.equal(
      (await one(db, "SELECT count(*)::int n FROM service_slots"))!.n,
      0,
    );
  } finally {
    await db.close?.();
  }
  const f = await fixture();
  try {
    const s = await f.call("customer", "services.catalogue");
    assert.equal(s.length, 1);
    assert.equal(s[0].version, 2);
    await assert.rejects(
      () =>
        f.call("administrator", "services.propose", {
          serviceId: s[0].id,
          branchId: "lagos",
          version: 2,
          config: s[0].config,
          reason: "Unauthorised change",
        }),
      /permission/,
    );
    await f.db.query(
      "UPDATE technician_qualifications SET expires_at=now()-interval '1 day' WHERE user_id=$1",
      [f.actors.safety_officer.id],
    );
    const p = await f.call("service_manager", "services.checklist.propose", {
      serviceId: s[0].id,
      branchId: "lagos",
      version: 2,
      checks: f.checks,
      reason: "Test revoked reviewer",
    });
    await assert.rejects(
      () =>
        f.call("safety_officer", "approval.decide", {
          id: p.id,
          decision: "approve",
          reason: "Invalid reviewer",
        }),
      /qualification/,
    );
  } finally {
    await f.db.close?.();
  }
});
test("booking is customer-owned, replay-safe and overlapping technician appointments cannot both reserve", async () => {
  const f = await fixture();
  try {
    const second = await f.createSlot(0.5);
    const input = f.input();
    const results = await Promise.allSettled([
      f.call("customer", "booking.create", input),
      f.call("commercial", "booking.create", f.input(second.id)),
    ]);
    assert.equal(results.filter((x) => x.status === "fulfilled").length, 1);
    const fulfilled = results.find(
      (x) => x.status === "fulfilled",
    ) as PromiseFulfilledResult<any>;
    const owner = (await one(
      f.db,
      "SELECT customer_id FROM service_bookings WHERE id=$1",
      [fulfilled.value.id],
    ))!.customer_id;
    const other = owner === f.actors.customer.id ? "commercial" : "customer";
    assert.deepEqual(await f.call(other, "bookings"), []);
    await assert.rejects(
      () =>
        f.call(other, "booking.cancel", {
          bookingId: fulfilled.value.id,
          reason: "Cross-customer access",
        }),
      /not found/,
    );
    assert.equal(
      (await one(f.db, "SELECT count(*)::int n FROM service_bookings"))!.n,
      1,
    );
    if (owner === f.actors.customer.id) {
      assert.equal(
        (await f.call("customer", "booking.create", input)).replayed,
        true,
      );
      await assert.rejects(
        () =>
          f.call("customer", "booking.create", {
            ...input,
            notes: "Different body",
          }),
        /reference reused/,
      );
    }
  } finally {
    await f.db.close?.();
  }
});
test("qualification expiry, stale service versions and out-of-area addresses reject booking without side effects", async () => {
  const f = await fixture();
  try {
    await assert.rejects(
      () =>
        f.call("customer", "booking.create", {
          ...f.input(),
          serviceVersion: 1,
        }),
      /changed/,
    );
    const outside = f.input();
    outside.address.zone = "Unsupported";
    await assert.rejects(
      () => f.call("customer", "booking.create", outside),
      /outside/,
    );
    await f.db.query(
      "UPDATE technician_qualifications SET expires_at=now()+interval '1 day' WHERE user_id=$1",
      [f.actors.technician.id],
    );
    await assert.rejects(
      () => f.call("customer", "booking.create", f.input()),
      /qualification/,
    );
    assert.equal(
      (await one(f.db, "SELECT count(*)::int n FROM service_bookings"))!.n,
      0,
    );
  } finally {
    await f.db.close?.();
  }
});
test("quotation revisions preserve price history; only latest customer approval reserves materials", async () => {
  const f = await fixture();
  try {
    const b = await begin(f);
    await f.db.query(
      "UPDATE inventory SET quantity=10,price_kobo=5000,published=true WHERE branch_id='lagos' AND product_id='hose'",
    );
    const q1 = await f.call("technician", "booking.quote", {
      bookingId: b.id,
      labourKobo: 100000,
      lines: [],
      notes: "First assessment quotation",
    });
    const q2 = await f.call("technician", "booking.quote", {
      bookingId: b.id,
      labourKobo: 150000,
      lines: [{ productId: "hose", quantity: 2 }],
      notes: "Revised full scope with materials",
    });
    await assert.rejects(
      () =>
        f.call("customer", "booking.quote.decide", {
          bookingId: b.id,
          quoteId: q1.id,
          approved: true,
        }),
      /latest/,
    );
    await assert.rejects(
      () =>
        f.call("service_manager", "booking.quote.decide", {
          bookingId: b.id,
          quoteId: q2.id,
          approved: true,
        }),
      /Only the customer/,
    );
    await f.call("customer", "booking.quote.decide", {
      bookingId: b.id,
      quoteId: q2.id,
      approved: true,
    });
    await f.call("customer", "booking.quote.decide", {
      bookingId: b.id,
      quoteId: q2.id,
      approved: true,
    });
    assert.equal(
      (await one(
        f.db,
        "SELECT reserved FROM inventory WHERE branch_id='lagos' AND product_id='hose'",
      ))!.reserved,
      2,
    );
    assert.equal(
      (await one(f.db, "SELECT count(*)::int n FROM service_quotes"))!.n,
      2,
    );
    await assert.rejects(
      () => f.db.query("UPDATE service_quotes SET total_kobo=1"),
      /Append-only/,
    );
  } finally {
    await f.db.close?.();
  }
});
test("approved service work reconciles material issue/use/return, report, customer acknowledgement and independent cash exactly once", async () => {
  const f = await fixture();
  try {
    const b = await begin(f);
    await f.db.query(
      "UPDATE inventory SET quantity=10,price_kobo=5000,published=true WHERE branch_id='lagos' AND product_id='hose'",
    );
    const q = await f.call("technician", "booking.quote", {
      bookingId: b.id,
      labourKobo: 150000,
      lines: [{ productId: "hose", quantity: 2 }],
      notes: "Approved assessment and replacement materials",
    });
    await f.call("customer", "booking.quote.decide", {
      bookingId: b.id,
      quoteId: q.id,
      approved: true,
    });
    await authoriseWork(f,b.id);
    const m = await one(
      f.db,
      "SELECT * FROM service_materials WHERE booking_id=$1",
      [b.id],
    );
    await f.call("inventory", "service.material.issue", {
      bookingId: b.id,
      materialId: m!.id,
      unitCostKobo: 3000,
    });
    await f.call("inventory", "service.material.issue", {
      bookingId: b.id,
      materialId: m!.id,
      unitCostKobo: 3000,
    });
    await f.call("technician", "service.material.usage", {
      bookingId: b.id,
      materialId: m!.id,
      used: 1,
      damaged: 0,
    });
    await assert.rejects(
      () =>
        f.call("inventory", "service.material.return", {
          bookingId: b.id,
          materialId: m!.id,
          returned: 2,
          reason: "Wrong returned quantity",
        }),
      /exact unused/,
    );
    await f.call("inventory", "service.material.return", {
      bookingId: b.id,
      materialId: m!.id,
      returned: 1,
      reason: "Unused material received and checked",
    });
    assert.equal(
      (await one(
        f.db,
        "SELECT quantity FROM inventory WHERE branch_id='lagos' AND product_id='hose'",
      ))!.quantity,
      9,
    );
    const report = {
      bookingId: b.id,
      outcome: "success",
      responses: [
        {
          id: "equipment_check",
          passed: true,
          notes: "Synthetic approved inspection record",
        },
      ],
      findings: "Documented fixture findings",
      workPerformed: "Documented fixture work",
      recommendations: "No additional fixture work",
    };
    await serviceProof(f,b.id);
    await f.call("technician", "booking.report", report);
    await f.call("customer", "booking.acknowledge", {
      bookingId: b.id,
      accepted: true,
      notes: "Customer acknowledged actual documented scope",
    });
    const rows = await f.call("customer", "bookings");
    assert.equal(rows[0].billing.totalKobo, 175000);
    assert.equal(rows[0].status, "completed");
    await assert.rejects(
      () => f.call("technician", "booking.report", report),
      /in progress|rewritten/,
    );
    let collection = await one(
      f.db,
      "SELECT id FROM service_cash_collections WHERE booking_id=$1",
      [b.id],
    );
    await f.call("finance", "booking.cash.verify", {
      bookingId: b.id,
      collectionId: collection!.id,
    });
    await f.call("finance", "booking.cash.verify", {
      bookingId: b.id,
      collectionId: collection!.id,
    });
    assert.equal(
      (await one(
        f.db,
        "SELECT count(*)::int n FROM verified_payments WHERE booking_id=$1",
        [b.id],
      ))!.n,
      1,
    );
    assert.equal((await f.call("customer", "bookings"))[0].billing.dueKobo, 0);
    await f.call("customer", "booking.feedback", {
      bookingId: b.id,
      rating: 5,
      body: "Verified fixture feedback",
    });
    assert.equal(
      (
        await f.call("customer", "booking.feedback", {
          bookingId: b.id,
          rating: 5,
          body: "Verified fixture feedback",
        })
      ).replayed,
      true,
    );
    await assert.rejects(
      () =>
        f.call("customer", "booking.feedback", {
          bookingId: b.id,
          rating: 1,
          body: "Changed retry must not replace history",
        }),
      /already recorded/,
    );
    await assert.rejects(
      () => f.db.query("DELETE FROM service_reports"),
      /Append-only/,
    );
  } finally {
    await f.db.close?.();
  }
});
test("unsafe inspection cannot become safety clearance or customer-acknowledged success", async () => {
  const f = await fixture();
  try {
    const b = await begin(f);
    const report = {
      bookingId: b.id,
      outcome: "success",
      responses: [
        {
          id: "equipment_check",
          passed: false,
          notes: "Synthetic failed inspection finding",
        },
      ],
      findings: "Fixture unsafe finding",
      workPerformed: "Assessment only, no unsafe repair",
      recommendations: "Qualified follow-up required",
    };
    await assert.rejects(
      () => f.call("technician", "booking.report", report),
      /successful safety clearance/,
    );
    assert.equal(
      (await one(f.db, "SELECT count(*)::int n FROM service_reports"))!.n,
      0,
    );
    await serviceProof(f,b.id);
    await f.call("technician", "booking.report", {
      ...report,
      outcome: "unsafe",
    });
    await assert.rejects(
      () =>
        f.call("customer", "booking.acknowledge", {
          bookingId: b.id,
          accepted: true,
          notes: "Cannot override unsafe finding",
        }),
      /successful documented/,
    );
    assert.equal((await f.call("customer", "bookings"))[0].status, "failed");
    assert.equal((await f.call("owner", "incidents"))[0].severity, "critical");
  } finally {
    await f.db.close?.();
  }
});
test("service deposit uses existing wallet ledger and cancellation refund requires separate finance approval", async () => {
  const f = await fixture();
  try {
    await f.db.query(
      "UPDATE settings SET value='true' WHERE key='wallet.enabled' AND scope='lagos'",
    );
    const credit = await f.call("finance", "credit.request", {
      customerId: f.actors.customer.id,
      branchId: "lagos",
      amountKobo: 500000,
      receiptReference: "SERVICE-FUNDING-FIXTURE",
      reason: "Synthetic independently verified cash funding",
    });
    await f.call("owner", "credit.decide", {
      id: credit.id,
      decision: "approved",
      reason: "Independent verification of synthetic receipt",
    });
    const b = await f.call("customer", "booking.create", f.input());
    const pay = { bookingId: b.id, amountKobo: 50000, idempotencyKey: id() };
    await f.call("customer", "booking.wallet.pay", pay);
    await f.call("customer", "booking.wallet.pay", pay);
    assert.equal((await f.call("customer", "wallet")).balanceKobo, 450000);
    await f.call("customer", "booking.cancel", {
      bookingId: b.id,
      reason: "Eligible customer cancellation",
    });
    const refund = await f.call("customer", "booking.refund.request", {
      bookingId: b.id,
      acceptWalletCredit: true,
      reason: "Refund approved cancelled appointment deposit",
    });
    await f.call("finance", "credit.decide", {
      id: refund.id,
      decision: "approved",
      reason: "Independent deposit refund review",
    });
    await f.call("finance", "credit.decide", {
      id: refund.id,
      decision: "approved",
      reason: "Replay independent review",
    });
    assert.equal((await f.call("customer", "wallet")).balanceKobo, 500000);
    assert.equal(
      (await one(
        f.db,
        "SELECT count(*)::int n FROM wallet_entries WHERE kind='refund'",
      ))!.n,
      1,
    );
  } finally {
    await f.db.close?.();
  }
});
