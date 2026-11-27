import test from "node:test";
import assert from "node:assert/strict";
import {
  deliveryAreaBounds,
  deliveryPinAreaError,
  validDeliveryMapBounds,
} from "../packages/business-rules/src/delivery-pin-area";
import { deliveryAddressKey } from "../packages/business-rules/src/delivery-pin";
import { locationConfig } from "../apps/web/lib/gas-delivery-config";
import { fixture } from "./helpers/order-tracking-fixture";
import { phonePaymentFixture } from "./helpers/phone-order-payment-fixture";
import { id } from "../apps/web/lib/auth";
const outside = { latitude: -27.63705, longitude: 152.85417 },
  inside = { latitude: 6.43, longitude: 3.42 };
const pin = (point: any, street: string, zone: string) => ({
  ...point,
  confirmed: true,
  addressKey: deliveryAddressKey(street, zone),
});
test("PIN-GEO geographic guards reject overseas/wrong area/invalid/unknown coverage, preserve inclusive edges and governed custom overrides", () => {
  assert.match(
    deliveryPinAreaError(outside, "Victoria Island"),
    /outside Victoria Island/,
  );
  assert.match(
    deliveryPinAreaError(
      { latitude: 6.47, longitude: 3.56 },
      "Victoria Island",
    ),
    /outside/,
  );
  assert.equal(deliveryPinAreaError(inside, "Victoria Island"), "");
  for (const area of ["Lagos Island", "Victoria Island", "Lekki", "Ajah"]) {
    const b = deliveryAreaBounds(area)!;
    assert.equal(
      deliveryPinAreaError({ latitude: b.north, longitude: b.east }, area),
      "",
    );
    assert.match(deliveryPinAreaError(outside, area), /outside/);
  }
  for (const x of [
    null,
    {},
    { latitude: NaN, longitude: 3 },
    { latitude: 6, longitude: Infinity },
  ])
    assert.match(deliveryPinAreaError(x, "Lekki"), /valid/);
  assert.match(deliveryPinAreaError(inside, "New area"), /not configured/);
  assert.equal(deliveryAreaBounds({ name: "Lekki", city: "Abuja" }), null);
  assert.equal(
    deliveryAreaBounds({
      name: "Lekki",
      map_bounds: { south: 1, north: 0, west: 1, east: 2 },
    }),
    null,
  );
  const bounds = { south: 1, north: 2, west: 3, east: 4 };
  assert.ok(validDeliveryMapBounds(bounds));
  assert.equal(
    deliveryPinAreaError(
      { latitude: 1.5, longitude: 3.5 },
      { name: "New area", map_bounds: bounds },
    ),
    "",
  );
  const config = {
    name: "New area",
    city: "Lagos",
    state: "Lagos",
    country: "Nigeria",
    branchId: "lagos",
    active: true,
    visible: true,
    archived: false,
    displayOrder: 0,
    mapBounds: bounds,
  };
  assert.ok(locationConfig.safeParse(config).success);
  assert.equal(
    locationConfig.safeParse({ ...config, mapBounds: { ...bounds, north: 0 } })
      .success,
    false,
  );
});
test("PIN-API checkout rejects mismatched coordinates and forged location names before reserving stock or creating a destination; valid correction succeeds", async () => {
  const f = await fixture();
  try {
    const street = "27 Synthetic Street",
      zone = "Victoria Island";
    const input = {
      items: [{ productId: "hose", quantity: 1 }],
      address: {
        name: "Synthetic customer",
        phone: "08012345678",
        street,
        zone,
        locationId: "victoria-island",
        deliveryPin: pin(outside, street, zone),
      },
      date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      window: "14:00–18:00",
      paymentMethod: "cash_on_delivery",
      idempotencyKey: id(),
    };
    const snapshot = async () => ({
      inventory: (
        await f.db.query(
          "SELECT * FROM inventory ORDER BY product_id,branch_id",
        )
      ).rows,
      orders: (await f.db.query("SELECT count(*) n FROM orders")).rows,
      destinations: (
        await f.db.query("SELECT count(*) n FROM dispatch_destinations")
      ).rows,
    });
    const before = await snapshot();
    await assert.rejects(
      () => f.call("customer", "checkout", input),
      /outside Victoria Island/,
    );
    assert.deepEqual(await snapshot(), before);
    // A caller cannot use a Lekki-looking zone with another location ID or invented client bounds.
    await assert.rejects(
      () =>
        f.call("customer", "checkout", {
          ...input,
          address: {
            ...input.address,
            zone: "Lekki",
            deliveryPin: pin(
              { latitude: 6.45, longitude: 3.5 },
              street,
              "Lekki",
            ),
          },
        }),
      /current delivery address/,
    );
    assert.deepEqual(await snapshot(), before);
    const made = await f.call("customer", "checkout", {
      ...input,
      address: { ...input.address, deliveryPin: pin(inside, street, zone) },
    });
    assert.ok(made.id);
    assert.equal(
      Number(
        (
          await f.db.query(
            "SELECT count(*) n FROM dispatch_destinations WHERE order_id=$1",
            [made.id],
          )
        ).rows[0].n,
      ),
      1,
    );
    // Canonical settings override defaults; no schema or permissions expansion.
    await f.db.query(
      "UPDATE settings SET value=value || $1::jsonb WHERE key='location.victoria-island'",
      [
        JSON.stringify({
          mapBounds: { south: 6.44, north: 6.46, west: 3.4, east: 3.45 },
        }),
      ],
    );
    await assert.rejects(
      () =>
        f.call("customer", "checkout", {
          ...input,
          idempotencyKey: id(),
          address: { ...input.address, deliveryPin: pin(inside, street, zone) },
        }),
      /outside Victoria Island/,
    );
  } finally {
    await f.db.close?.();
  }
});
test("PIN-PHONE private order profile rejects outside area without profile/payment/destination writes; customer correction is accepted", async () => {
  const f = await phonePaymentFixture();
  try {
    const p = await f.makePhone(true),
      a = p.o.address;
    await f.http("view", { linkId: p.linkId, token: p.token });
    const before = (
      await f.db.query(
        "SELECT address,payment_status FROM orders WHERE id=$1",
        [p.o.id],
      )
    ).rows;
    const bad = await f.confirm(p, {
      deliveryPin: pin(outside, a.street, a.zone),
    });
    assert.equal(bad.status, 400);
    assert.match(JSON.stringify(bad.body), /outside/);
    assert.deepEqual(
      (
        await f.db.query(
          "SELECT address,payment_status FROM orders WHERE id=$1",
          [p.o.id],
        )
      ).rows,
      before,
    );
    assert.equal(
      Number(
        (
          await f.db.query(
            "SELECT count(*) n FROM dispatch_destinations WHERE order_id=$1",
            [p.o.id],
          )
        ).rows[0].n,
      ),
      0,
    );
    const good = await f.confirm(p, {
      deliveryPin: pin({ latitude: 6.45, longitude: 3.46 }, a.street, a.zone),
    });
    assert.equal(good.status, 200, JSON.stringify(good.body));
    assert.equal(good.body.profileConfirmed, true);
  } finally {
    await f.db.close?.();
  }
});

test("PIN-ADDRESS saved address cannot retain an overseas pin, while a corrected pin saves under canonical current coverage", async () => {
  const f = await fixture();
  try {
    const street = "27 Synthetic Street",
      zone = "Victoria Island",
      input = {
        label: "Synthetic home",
        street,
        zone,
        locationId: "victoria-island",
        phone: "08012345678",
        deliveryPin: pin(outside, street, zone),
      };
    await assert.rejects(
      () => f.call("customer", "address.save", input),
      /outside Victoria Island/,
    );
    assert.equal(
      Number(
        (
          await f.db.query(
            "SELECT count(*) n FROM account_addresses WHERE customer_id=$1",
            [f.actors.customer.id],
          )
        ).rows[0].n,
      ),
      0,
    );
    await f.call("customer", "address.save", {
      ...input,
      deliveryPin: pin(inside, street, zone),
    });
    assert.equal(
      Number(
        (
          await f.db.query(
            "SELECT count(*) n FROM account_addresses WHERE customer_id=$1",
            [f.actors.customer.id],
          )
        ).rows[0].n,
      ),
      1,
    );
  } finally {
    await f.db.close?.();
  }
});
test("PIN-RUNTIME current area lookup and rejects run under existing restricted server grants", async () => {
  const { createDatabase } = await import("../apps/web/lib/db");
  const { readFile } = await import("node:fs/promises");
  const { validateCustomerDeliveryPin } = await import(
    "../apps/web/lib/customer-delivery-pin"
  );
  const db = await createDatabase("memory://");
  try {
    await db.exec(await readFile("database/bootstrap.sql", "utf8"));
    await db.exec("SET search_path TO easygas_private,pg_catalog");
    const f = await fixture(db);
    await db.exec(
      "SET search_path TO easygas_private,pg_catalog; SET ROLE easygas_server",
    );
    const street = "27 Synthetic Street",
      zone = "Victoria Island";
    await assert.rejects(
      () =>
        validateCustomerDeliveryPin(db, {
          street,
          zone,
          deliveryPin: pin(outside, street, zone),
        }),
      /outside Victoria Island/,
    );
    await validateCustomerDeliveryPin(db, {
      street,
      zone,
      deliveryPin: pin(inside, street, zone),
    });
  } finally {
    await db.exec("RESET ROLE");
    await db.close?.();
  }
});
test("PIN-GOVERNANCE custom map bounds use the existing single Admin approval, audit and public catalogue; customers cannot change them", async () => {
  const f = await fixture(),
    old = process.env.EASYGAS_OWNER_AUTO_APPROVAL;
  process.env.EASYGAS_OWNER_AUTO_APPROVAL = "true";
  try {
    const current = (
      await f.db.query(
        "SELECT value,version FROM settings WHERE key='location.victoria-island' AND scope='lagos'",
      )
    ).rows[0];
    const bounds = { south: 6.4, north: 6.46, west: 3.4, east: 3.45 },
      input = {
        key: "location.victoria-island",
        scope: "lagos",
        version: current.version,
        value: { ...current.value, mapBounds: bounds },
        reason: "Synthetic approved map boundary",
      };
    await assert.rejects(() => f.call("customer", "setting.propose", input));
    await f.call("owner", "reauth", { password: "Tracking-fixture-only-123!" });
    const result = await f.call("owner", "setting.propose", input);
    assert.equal(result.status, "active");
    const config = await f.call("customer", "gas.catalogue");
    assert.deepEqual(
      config.locations.find((a: any) => a.id === "victoria-island").map_bounds,
      bounds,
    );
    assert.equal(
      Number(
        (
          await f.db.query(
            "SELECT count(*) n FROM audit_events WHERE target=$1 AND action='approval.owner_auto_approved'",
            [result.id],
          )
        ).rows[0].n,
      ),
      1,
    );
    assert.equal(
      Number(
        (
          await f.db.query(
            "SELECT count(*) n FROM approval_decisions WHERE request_id=$1",
            [result.id],
          )
        ).rows[0].n,
      ),
      0,
    );
  } finally {
    if (old === undefined) delete process.env.EASYGAS_OWNER_AUTO_APPROVAL;
    else process.env.EASYGAS_OWNER_AUTO_APPROVAL = old;
    await f.db.close?.();
  }
});
