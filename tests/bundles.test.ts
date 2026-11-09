import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers/service-fixture";
import { one } from "../apps/web/lib/db";
import { id } from "../apps/web/lib/auth";
test("independently governed bundles calculate service-only savings and atomically snapshot linked fulfilments", async () => {
  const f = await fixture();
  await f.db.query("UPDATE settings SET value='100000' WHERE key='delivery.fee'");
  await f.db.query("UPDATE delivery_locations SET coverage='Synthetic coverage verified for regression fixtures only'");
  try {
    await f.db.query(
      "UPDATE settings SET value='true' WHERE key IN ('delivery.enabled','payment.cod') AND scope='lagos'",
    );
    await f.db.query(
      "UPDATE inventory SET price_kobo=900000,published=true,quantity=4 WHERE product_id='hose' AND branch_id='lagos'",
    );
    const b = await f.call("owner", "bundle.create", {
      name: "Synthetic refill and service",
      branchId: "lagos",
    });
    const config = {
      active: true,
      products: [{ productId: "hose", quantity: 1 }],
      serviceId: "cooker-servicing",
      serviceDiscountPercent: 10,
      description: "Synthetic fixture bundle for verified calculations",
    };
    const change = await f.call("service_manager", "bundle.propose", {
      id: b.id,
      version: 1,
      config,
      reason: "Fixture independently approved bundle",
    });
    await assert.rejects(
      () =>
        f.call("service_manager", "approval.decide", {
          id: change.id,
          decision: "approve",
          reason: "Self approval denied",
        }),
      /permission|own|independent|authority/i,
    );
    await f.call("owner", "approval.decide", {
      id: change.id,
      decision: "approve",
      reason: "Independent bundle approval",
    });
    const offers = await f.call("customer", "bundles");
    assert.equal(offers[0].discountKobo, 10000);
    assert.equal(offers[0].servicePriceKobo, 90000);
    assert.equal(offers[0].productTotalKobo, 900000);
    assert.equal(offers[0].totalKobo, 1010000);
    const products = {
      items: [{ productId: "hose", quantity: 1 }],
      address: {
        name: "Synthetic customer",
        street: "12 Fixture Avenue",
        zone: "Lekki",
        phone: "08012345678",
      },
      date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      window: "14:00–18:00",
      paymentMethod: "cash_on_delivery",
      idempotencyKey: id(),
    };
    const request = {
      bundleId: b.id,
      bundleVersion: 2,
      bundleTotalKobo: 1010000,
      idempotencyKey: id(),
      products,
      appointments: [f.input()],
    };
    await assert.rejects(
      () =>
        f.call("customer", "checkout.mixed", {
          ...request,
          products: {
            ...products,
            items: [{ productId: "hose", quantity: 2 }],
          },
        }),
      /quantities exactly/,
    );
    assert.equal((await one(f.db, "SELECT count(*)::int n FROM orders"))!.n, 0);
    const result = await f.call("customer", "checkout.mixed", request);
    const booking = await one(
      f.db,
      "SELECT snapshot FROM service_bookings WHERE id=$1",
      [result.bookings[0].id],
    );
    assert.equal(booking!.snapshot.priceKobo, 90000);
    assert.equal(booking!.snapshot.bundleDiscountKobo, 10000);
    assert.equal(
      (await f.call("customer", "checkout.mixed", request)).replayed,
      true,
    );
    const linked = await one(
      f.db,
      "SELECT bundle_snapshot FROM commerce_checkouts WHERE id=$1",
      [result.id],
    );
    assert.equal(linked!.bundle_snapshot.version, 2);
    for (const status of ["confirmed", "assigned"])
      await f.call("service_manager", "booking.transition", {
        bookingId: result.bookings[0].id,
        status,
        reason: "Fixture authorised confirmation",
      });
    await f.call("technician", "booking.transition", {
      bookingId: result.bookings[0].id,
      status: "en_route",
      reason: "Fixture travel update",
    });
    await assert.rejects(
      () =>
        f.call("technician", "booking.transition", {
          bookingId: result.bookings[0].id,
          status: "in_progress",
          reason: "Attempt work before product delivery",
        }),
      /delivered first/,
    );
    await f.db.query(
      "UPDATE service_bundles SET config=jsonb_set(config,'{serviceDiscountPercent}','20') WHERE id=$1",
      [b.id],
    );
    assert.equal(
      (await one(f.db, "SELECT snapshot FROM service_bookings WHERE id=$1", [
        result.bookings[0].id,
      ]))!.snapshot.bundleDiscountKobo,
      10000,
    );
  } finally {
    await f.db.close?.();
  }
});
