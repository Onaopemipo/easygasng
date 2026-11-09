import {serviceProof} from "./helpers/service-fixture";
import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import sharp from "sharp";
import { fixture, begin , authoriseWork } from "./helpers/service-fixture";
import { one } from "../apps/web/lib/db";
import { id } from "../apps/web/lib/auth";
import { prepareImage } from "../apps/web/lib/media";
import { POST as upload } from "../apps/web/app/api/media/route";
import { GET as image } from "../apps/web/app/api/media/[id]/route";
import { serviceReportHtml } from "../packages/business-rules/src/service-report";
test("mixed checkout is atomic across product reservations, technician availability and replay", async () => {
  const f = await fixture();
  await f.db.query(
    "UPDATE settings SET value='100000' WHERE key='delivery.fee'",
  );
  await f.db.query(
    "UPDATE delivery_locations SET coverage='Synthetic coverage verified for regression fixtures only'",
  );
  try {
    await f.db.query(
      "UPDATE settings SET value='true' WHERE key IN ('delivery.enabled','payment.cod') AND scope='lagos'",
    );
    await f.db.query(
      "UPDATE inventory SET price_kobo=750000,published=true,quantity=3 WHERE branch_id='lagos' AND product_id='hose'",
    );
    const payload = {
      idempotencyKey: id(),
      appointments: [f.input()],
      products: {
        items: [{ productId: "hose", quantity: 1 }],
        address: {
          name: "Test customer",
          street: "12 Fixture Avenue",
          zone: "Lekki",
          phone: "08012345678",
        },
        date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        window: "14:00–18:00",
        paymentMethod: "cash_on_delivery",
        idempotencyKey: id(),
      },
    };
    const result = await f.call("customer", "checkout.mixed", payload);
    assert.ok(result.order.id);
    assert.equal(result.bookings.length, 1);
    assert.equal(
      (await f.call("customer", "checkout.mixed", payload)).replayed,
      true,
    );
    assert.equal(
      (
        await f.call("customer", "checkout.mixed", {
          ...payload,
          products: { ...payload.products, source: "MOBILE" },
        })
      ).replayed,
      true,
    );
    assert.equal(
      (await one(f.db, "SELECT order_source FROM orders WHERE id=$1", [
        result.order.id,
      ]))!.order_source,
      "WEB",
    );
    const invalid = {
      ...payload,
      idempotencyKey: id(),
      products: { ...payload.products, idempotencyKey: id() },
      appointments: [{ ...f.input(), idempotencyKey: id() }],
    };
    await assert.rejects(
      () => f.call("customer", "checkout.mixed", invalid),
      /already booked/,
    );
    assert.equal((await one(f.db, "SELECT count(*)::int n FROM orders"))!.n, 1);
    assert.equal(
      (await one(f.db, "SELECT count(*)::int n FROM commerce_checkouts"))!.n,
      1,
    );
    assert.equal(
      (await one(
        f.db,
        "SELECT reserved FROM inventory WHERE branch_id='lagos' AND product_id='hose'",
      ))!.reserved,
      1,
    );
  } finally {
    await f.db.close?.();
  }
});
test("managed categories, variant metadata and archiving cannot bypass approved prices or compatibility review", async () => {
  const f = await fixture();
  try {
    await f.call("owner", "category.save", {
      name: "Gas Gauges",
      active: true,
    });
    await f.call("owner", "product.save", {
      id: "fixture-gauge",
      name: "Fixture Gauge",
      description: "Synthetic gauge with no claimed compatibility",
      category: "Gas Gauges",
      sizeKg: null,
      asset: "regulator",
      safety: "Qualified assessment required before installation.",
    });
    const metadata = {
      id: "fixture-gauge",
      sku: "FIXTURE-GAUGE",
      parentId: "regulator",
      archived: false,
      brand: "Fixture",
      model: "Test",
      specifications: "No compatibility assertion",
      warranty: "Fixture terms",
      installationRequired: true,
      compatibility: "professional_confirmation",
      compatibilityEvidence: "",
    };
    await f.call("owner", "product.metadata", metadata);
    await assert.rejects(
      () =>
        f.call("owner", "product.metadata", {
          ...metadata,
          compatibility: "verified",
        }),
      /independently reviewed/,
    );
    const p = await one(
      f.db,
      "SELECT * FROM inventory WHERE product_id='fixture-gauge' AND branch_id='lagos'",
    );
    assert.equal(p!.published, false);
    assert.equal(p!.price_kobo, null);
    await f.call("owner", "product.metadata", { ...metadata, archived: true });
    assert.ok(
      !(await f.call("customer", "catalogue")).products.some(
        (p: any) => p.id === "fixture-gauge",
      ),
    );
  } finally {
    await f.db.close?.();
  }
});
test("image validation rejects active/invalid formats and keeps booking photographs private and report evidence locked", async () => {
  const f = await fixture();
  try {
    process.env.EASYGAS_BACKGROUND_JOBS = "false";
    (globalThis as any).easygasDb = Promise.resolve(f.db);
    (globalThis as any).easygasLocalVersion = 16;
    const b = await begin(f);
    await assert.rejects(
      () =>
        prepareImage(
          new TextEncoder().encode(
            '<svg xmlns="http://www.w3.org/2000/svg"><script>bad()</script></svg>',
          ),
        ),
      /still PNG|decoded safely/,
    );
    const bytes = await sharp({
      create: { width: 8, height: 8, channels: 3, background: "#008000" },
    })
      .png()
      .toBuffer();
    const fd = new FormData();
    fd.set("bookingId", b.id);
    fd.set("photoConsent","on");
    fd.set("alt", "Synthetic service photograph");
    fd.set(
      "image",
      new File([new Uint8Array(bytes)], "test.png", { type: "image/png" }),
    );
    const req = new NextRequest("http://localhost:3003/api/media", {
      method: "POST",
      headers: { authorization: "Bearer " + f.actors.customer.token },
      body: fd,
    });
    const response = await upload(req);
    assert.equal(response.status, 200);
    const saved = await response.json();
    const ctx = { params: Promise.resolve({ id: saved.id }) };
    const outsider = await image(
      new NextRequest("http://localhost:3003/api/media/" + saved.id, {
        headers: { authorization: "Bearer " + f.actors.commercial.token },
      }),
      ctx,
    );
    assert.equal(outsider.status, 404);
    const own = await image(
      new NextRequest("http://localhost:3003/api/media/" + saved.id, {
        headers: { authorization: "Bearer " + f.actors.customer.token },
      }),
      ctx,
    );
    assert.equal(own.status, 200);
    assert.equal(own.headers.get("cache-control"), "private, no-store");
    assert.equal(own.headers.get("content-type"), "image/webp");
    await authoriseWork(f,b.id);
    await serviceProof(f,b.id);
    await f.call("technician", "booking.report", {
      bookingId: b.id,
      outcome: "success",
      responses: [
        {
          id: "equipment_check",
          passed: true,
          notes: "Approved fixture evidence",
        },
      ],
      findings: "Fixture report findings",
      workPerformed: "Fixture assessed work",
      recommendations: "",
    });
    const locked = new FormData();
    locked.set("bookingId", b.id);
    locked.set("photoConsent","on");
    locked.set("alt", "Attempt late evidence change");
    locked.set(
      "image",
      new File([new Uint8Array(bytes)], "test.png", { type: "image/png" }),
    );
    assert.equal(
      (
        await upload(
          new NextRequest("http://localhost:3003/api/media", {
            method: "POST",
            headers: { authorization: "Bearer " + f.actors.customer.token },
            body: locked,
          }),
        )
      ).status,
      409,
    );
  } finally {
    await f.db.close?.();
    delete (globalThis as any).easygasDb;
  }
});
test("downloadable report escapes customer-controlled markup and distinguishes unsafe outcomes from certification", () => {
  const html = serviceReportHtml({
    reference: "TEST",
    outcome: "unsafe",
    findings: "<script>bad()</script>",
    responses: [],
    materials: [],
    invoiceTotalKobo: 0,
  });
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(html.includes("unsafe"));
  assert.ok(html.includes("not independent regulatory certification"));
});
test("reviewed recommendations count real events, never claim unknown compatibility and disappear for unavailable products", async () => {
  const f = await fixture();
  try {
    await f.db.query(
      "UPDATE inventory SET quantity=5,price_kobo=5000,published=true WHERE product_id='regulator' AND branch_id='lagos'",
    );
    const r = await f.call("owner", "recommendation.propose", {
      branchId: "lagos",
      productId: "regulator",
      serviceId: "cooker-servicing",
      relation: "assessment",
      evidence:
        "Offer professional assessment without asserting equipment compatibility.",
    });
    await assert.rejects(
      () =>
        f.call("owner", "recommendation.approve", { id: r.id, active: true }),
      /independent/,
    );
    await f.call("safety_officer", "recommendation.approve", {
      id: r.id,
      active: true,
    });
    const rows = await f.call("customer", "recommendations", {
      productId: "regulator",
    });
    assert.equal(rows.length, 1);
    assert.ok(rows[0].message.includes("must be confirmed"));
    for (let i = 0; i < 2; i++)
      await f.call("customer", "recommendation.event", {
        ruleId: r.id,
        kind: "displayed",
      });
    const b = await f.call("customer", "booking.create", {
      ...f.input(),
      recommendationId: r.id,
    });
    assert.equal(
      (await one(
        f.db,
        "SELECT count(*)::int n FROM recommendation_events WHERE rule_id=$1 AND kind='booked'",
        [r.id],
      ))!.n,
      1,
    );
    assert.equal(
      (await one(
        f.db,
        "SELECT count(*)::int n FROM recommendation_events WHERE rule_id=$1 AND kind='displayed'",
        [r.id],
      ))!.n,
      1,
    );
    assert.equal(
      (await one(f.db, "SELECT sum(reserved)::int n FROM inventory"))!.n,
      0,
    );
    await f.db.query(
      "UPDATE inventory SET quantity=0 WHERE product_id='regulator' AND branch_id='lagos'",
    );
    assert.deepEqual(
      await f.call("customer", "recommendations", { productId: "regulator" }),
      [],
    );
    assert.ok(b.id);
  } finally {
    await f.db.close?.();
  }
});
test("finance reports separate service receipts, pending cash, liabilities and unknown profit without truncating ledger pagination", async () => {
  const f = await fixture();
  try {
    const b = await begin(f);
    await f.call("technician", "booking.cash.record", {
      bookingId: b.id,
      amountKobo: 120000,
      reference: "FINANCE-REPORT-FIXTURE",
    });
    let summary = await f.call("finance", "finance.summary");
    assert.equal(summary.serviceRevenueKobo, 0);
    assert.equal(summary.unverifiedCashKobo, 120000);
    const c = await one(
      f.db,
      "SELECT id FROM service_cash_collections WHERE booking_id=$1",
      [b.id],
    );
    await f.call("finance", "booking.cash.verify", {
      bookingId: b.id,
      collectionId: c!.id,
    });
    await authoriseWork(f,b.id);
    await serviceProof(f,b.id);
    await f.call("technician", "booking.report", {
      bookingId: b.id,
      outcome: "success",
      responses: [
        {
          id: "equipment_check",
          passed: true,
          notes: "Fixture completed inspection",
        },
      ],
      findings: "Fixture verified findings",
      workPerformed: "Fixture service work",
      recommendations: "",
    });
    await f.call("customer", "booking.acknowledge", {
      bookingId: b.id,
      accepted: true,
      notes: "Customer acknowledged fixture service",
    });

    summary = await f.call("owner", "finance.summary");
    assert.equal(summary.serviceRevenueKobo, 120000);
    assert.equal(summary.profitKobo, null);
    const ledger = await f.call("finance", "finance.ledger", { limit: 1 });
    assert.equal(ledger.rows.length, 1);
    assert.equal(ledger.rows[0].booking_reference, b.reference);
    assert.equal(ledger.hasMore, false);
    await assert.rejects(
      () => f.call("customer", "finance.summary"),
      /permission/,
    );
  } finally {
    await f.db.close?.();
  }
});
