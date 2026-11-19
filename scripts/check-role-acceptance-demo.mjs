import test from "node:test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { client, hash, evidenceRoot, label } from "./demo-role-acceptance-client.mjs";
const phase = process.argv[2] ?? "preflight";
const note = (text) => `${label}: ${text}. Synthetic QA only; no real goods, funds, travel or certification.`;
async function gasInput(c, name, method = "cash_on_delivery", kg = 0.5) {
  const capacityKg = Math.max(6, kg);
  const q = await c.ok("customer", "gas.quote", { locationId: "victoria-island", items: [], lines: [{ capacityKg, kg }] });
  return {
    items: [], gasLines: [{ capacityKg, kg }],
    pricing: { priceVersion: q.priceVersion, feeVersion: q.feeVersion, policyVersion: q.policyVersion, totalKobo: q.subtotalKobo + q.deliveryKobo },
    address: { locationId: "victoria-island", name: "Synthetic role acceptance customer", phone: "08000000000", street: `${label} — synthetic QA address`, zone: "Victoria Island" },
    date: new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date()),
    window: "14:00–18:00", instructions: note(name), paymentMethod: method, idempotencyKey: c.key("checkout:" + name),
  };
}
async function makeGas(c, name, method = "cash_on_delivery", kg = 0.5) {
  if (c.state.orders[name]) return c.state.orders[name];
  const stockBefore = (await c.ok("inventory", "inventory.workspace")).gas;
  const input = await gasInput(c, name, method, kg); await c.save();
  const order = await c.ok("customer", "checkout", input);
  c.state.orders[name] = { id: order.id, reference: order.reference, input, stockBefore }; await c.save();
  return c.state.orders[name];
}
async function makeProduct(c, name, quantity = 1, method = "cash_on_delivery") {
  if (c.state.orders[name]) return c.state.orders[name];
  const input = await gasInput(c, name, method);
  input.items = [{ productId: "cylinder-empty-6", quantity }];
  delete input.gasLines; delete input.pricing;
  const stockBefore = await c.ok("inventory", "inventory"); await c.save();
  const order = await c.ok("customer", "checkout", input);
  c.state.orders[name] = { id: order.id, reference: order.reference, input, stockBefore }; await c.save();
  return c.state.orders[name];
}
async function snapshot(c, name, role = "owner") {
  const o = c.state.orders[name]; assert.ok(o, name);
  assert.ok(!c.state.baseline.orders.data.some((old) => old.id === o.id), "Only run-owned orders may mutate");
  const rows = await c.ok(role, "orders?id=" + o.id); assert.equal(rows.length, 1); return rows[0];
}
if (phase === "product-prepare") test("ROLEACC-PRODUCT-PREP: synthetic serial registration, customer COD checkout, sales preparation and independent dispatch use normal product controls", async () => {
  const c = await client(); c.state.serials ??= {};
  if (!c.state.catalogueDefect) {
    const advertised = c.state.baseline.catalogue.data.products.find((p) => p.id === "cylinder-empty-6");
    const invalid = await gasInput(c, "no-eligible-empty-cylinder");
    invalid.items = [{ productId: "cylinder-empty-6", quantity: 1 }]; delete invalid.gasLines; delete invalid.pricing;
    const rejected = await reject(c, "customer", "checkout", invalid, [409], /inspected empty cylinders/);
    c.state.catalogueDefect = { advertisedAvailable: advertised.available, eligibleCompanySerials: 0, rejected, issue: "Catalogue advertised aggregate inventory despite no eligible serialised stock" };
    await writeFile(evidenceRoot + "/catalogue-hosted-before.json", JSON.stringify(c.state.catalogueDefect, null, 2) + "\n"); await c.save();
  }
  for (const suffix of ["A", "B", "C"]) {
    const serial = label + "-PRODUCT-" + suffix;
    let existing = (await c.ok("inventory", "cylinders")).find((r) => r.serial === serial);
    if (!existing) {
      await c.ok("inventory", "cylinder.create", { serial, sizeKg: 6, ownership: "company", status: "empty", testDue: "2027-02-19", branchId: "lagos" });
      existing = (await c.ok("inventory", "cylinders")).find((r) => r.serial === serial); assert.ok(existing);
    }
    c.state.serials[suffix] = existing.id; await c.save();
  }
  if (!c.state.trip) {
    const baseline = c.state.baseline.driver.data.profile;
    c.state.driverWasAvailable = baseline.driver_available;
    if (!baseline.driver_available) await c.ok("driver", "driver.availability", { available: true, operationKey: c.key("driver.available") });
    const vehicle = c.state.baseline.fleet.data.vehicles.find((v) => v.active && v.lpg_suitable);
    const trip = await c.ok("driver", "trip.start", { vehicleId: vehicle.id, startOdometer: 1000, locationConsent: false, operationKey: c.key("trip.start") });
    c.state.trip = { id: trip.id, vehicleId: vehicle.id }; await c.save();
  }
  await makeProduct(c, "product-cod", 2);
  let o = await snapshot(c, "product-cod");
  if (o.status === "placed") await transition(c, "product-cod", "accepted", "sales");
  o = await snapshot(c, "product-cod");
  if (o.status === "accepted") await transition(c, "product-cod", "preparing", "sales");
  o = await snapshot(c, "product-cod");
  if (o.status === "preparing") {
    await c.ok("sales", "delivery.coverage.confirm", { orderId: o.id, reason: note("QA-only address coverage in configured demo area") });
    const assign = { orderId: o.id, driverId: c.state.roles.driver.id, version: Number(o.tracking_version), reason: note("Independent dispatcher manual assignment of synthetic product manifest"), operationKey: c.key("assign:product-cod") };
    c.state.operations["assign:product-cod"] = assign; await c.save(); await c.ok("dispatcher", "dispatch.assign", assign);
  }
  o = await snapshot(c, "product-cod"); assert.equal(o.status, "assigned");
  await c.reauth("finance");
  const invoice = await c.ok("finance", "invoice.issue", { orderId: o.id }); assert.ok(invoice.invoice);
  await c.check("ROLEACC-PRODUCT-PREP", `${o.reference}:2 new QA serials reserved, sales accepted/prepared, separate dispatcher assigned, finance issued invoice; no original order mutated`);
  await writeFile(evidenceRoot + "/product-prepared.json", JSON.stringify({ order: { id: o.id, reference: o.reference, status: o.status, totalKobo: o.total_kobo, payment: o.payment_status }, serialIds: c.state.serials, trip: c.state.trip, checks: c.state.checks }, null, 2) + "\n");
});
if (phase === "product-handover-guards") test("ROLEACC-HANDOVER-GUARDS: restricted driver cash, stale progression, false handover, wrong code and cross-account completion are rejected", async () => {
  const c = await client(), o = await snapshot(c, "product-cod"), rows = [];
  assert.equal(o.status, "out_for_delivery"); assert.equal(o.attempt.state, "arrived");
  const customer = await snapshot(c, "product-cod", "customer");
  assert.match(customer.confirmation_code, /^\d{6}$/);
  const wrongCode = customer.confirmation_code === "000000" ? "111111" : "000000";
  const input = { orderId: o.id, version: Number(o.tracking_version), code: wrongCode, handover: true };
  rows.push(await reject(c, "driver", "driver.complete", { ...input, operationKey: c.key("driver-unverified-cod") }, [409], /Payment needs authorised operations review/));
  rows.push(await reject(c, "driver", "invoice.issue", { orderId: o.id }, [403]));
  rows.push(await reject(c, "finance", "delivery.complete", { ...input, collectedKobo: Number(o.total_kobo), operationKey: c.key("finance-cannot-handover") }, [403]));
  rows.push(await reject(c, "commercial", "order.transition", { id: o.id, status: "cancelled", version: Number(o.tracking_version), note: note("Another customer cannot cancel"), operationKey: c.key("other-customer-cancel") }, [403]));
  rows.push(await reject(c, "driver", "delivery.arrived", { orderId: o.id, version: Number(o.tracking_version) - 1, reason: note("Stale arrival must fail"), operationKey: c.key("stale-arrival") }, [409], /changed/));
  rows.push(await reject(c, "owner", "delivery.complete", { ...input, collectedKobo: Number(o.total_kobo), handover: false, operationKey: c.key("missing-handover-attestation") }, [400], /handover/));
  rows.push(await reject(c, "owner", "delivery.complete", { ...input, collectedKobo: Number(o.total_kobo), operationKey: c.key("incorrect-handover-code") }, [400, 403], /code/i));
  const unchanged = await snapshot(c, "product-cod");
  assert.equal(unchanged.status, "out_for_delivery"); assert.equal(unchanged.payment_status, "unpaid");
  assert.equal(unchanged.tracking_version, o.tracking_version);
  const photos = await c.ok("driver", "delivery.photos?orderId=" + o.id); assert.equal(photos.photos.length, 1);
  await writeFile(".data/role-acceptance-handover.json", JSON.stringify({ orderId: o.id, reference: o.reference, code: customer.confirmation_code, amountNaira: Number(o.total_kobo) / 100, version: Number(o.tracking_version) }), { mode: 0o600 });
  await writeFile(evidenceRoot + "/handover-guards.json", JSON.stringify({ orderId: o.id, reference: o.reference, rejected: rows, statusUnchanged: true, paymentUnchanged: true, retainedProofCount: photos.photos.length }, null, 2) + "\n");
  await c.check("ROLEACC-HANDOVER-GUARDS", "Wrong role/customer, stale version, no handover and wrong code rejected; driver COD policy preserved; current arrived order and unpaid status unchanged");
});
if (phase === "cash-guards") test("ROLEACC-CASH-GUARDS: collected cash is not verified and the collector cannot reconcile their own collection", async () => {
  const c = await client(), o = await snapshot(c, "product-cod");
  assert.equal(o.status, "delivered"); assert.equal(o.payment_status, "collected");
  const collection = (await c.ok("finance", "cash.collections")).find((r) => r.reference === o.reference); assert.ok(collection && !collection.verified_at);
  await c.reauth("owner");
  const denied = await reject(c, "owner", "cash.reconcile", { id: collection.id }, [403], /independent finance approver/);
  const refund = await reject(c, "customer", "refund.request", { orderId: o.id, reason: note("Unverified collection cannot be refunded"), acceptWalletCredit: true, idempotencyKey: c.key("refund-unverified-cash") }, [409], /verified payments/);
  assert.equal((await snapshot(c, "product-cod")).payment_status, "collected");
  c.state.cashCollection = collection.id; await c.save();
  await writeFile(evidenceRoot + "/cash-guards.json", JSON.stringify({ reference: o.reference, collectionId: collection.id, denied, refund, payment: "collected/unverified" }, null, 2) + "\n");
  await c.check("ROLEACC-CASH-GUARDS", "Collector self-reconciliation403 and refund-before-verification409; actual synthetic collection remains unverified until independent finance");
});
async function reject(c, role, action, body, statuses, message) {
  const r = await c.call(role, action, body);
  assert.ok(statuses.includes(r.status), `${role} ${action} expected ${statuses}, got ${r.status}: ${r.data.error ?? ""}`);
  if (message) assert.match(r.data.error, message);
  return { role, action, status: r.status, message: r.data.error, code: r.data.code };
}
async function transition(c, name, status, role, extra = {}) {
  const o = await snapshot(c, name);
  const operationName = `transition:${name}:${status}`;
  c.state.operations ??= {};
  c.state.operations[operationName] ??= { id: o.id, status, note: note(name + " " + status), version: Number(o.tracking_version), operationKey: c.key(operationName), ...extra };
  await c.save();
  return c.ok(role, "order.transition", c.state.operations[operationName]);
}
if (phase === "preflight") test("ROLEACC-PREFLIGHT: authenticated demo roles, original records and operational prerequisites are inventoried before mutations", async () => {
  const c = await client(), { state, ok, save } = c;
  const payment = await ok("owner", "payments/paystack/configuration");
  assert.equal(payment.environment, "test"); assert.equal(payment.available, true);
  const roles = {};
  for (const role of ["owner", "sales", "dispatcher", "finance", "inventory", "driver", "customer", "commercial", "technician"]) {
    const me = await ok(role, "me"); roles[role] = { id: me.user.id, canonicalRole: me.user.role, branch: me.user.branch_id };
    if (!["customer", "commercial"].includes(role)) roles[role].navigation = (await ok(role, "navigation.access")).allowed;
  }
  const data = {};
  for (const [name, role, action] of [
    ["orders", "owner", "orders"], ["ledger", "owner", "finance.ledger"],
    ["catalogue", "customer", "catalogue"], ["customer", "customer", "me"],
    ["wallet", "customer", "wallet"], ["commercialWallet", "commercial", "wallet"],
    ["fleet", "owner", "fleet.summary"], ["bulk", "owner", "bulk.summary"],
    ["staff", "owner", "staff"], ["inventory", "inventory", "inventory.workspace"],
    ["driver", "driver", "driver.snapshot"], ["dispatch", "dispatcher", "dispatch.centre"],
    ["credits", "finance", "credits"],
  ]) {
    const r = await c.call(role, action); data[name] = r;
  }
  assert.equal(data.orders.status, 200); assert.equal(data.ledger.status, 200);
  if (!state.baseline) { state.baseline = data; state.roles = roles; await save(); }
  const summary = {
    recordedAt: new Date().toISOString(), roles, reads: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, { status: v.status, keys: Object.keys(v.data ?? {}) }])),
    baseline: { orderIds: data.orders.data.map((o) => o.id), orderHash: hash(data.orders.data), ledgerHash: hash(data.ledger.data), walletKobo: data.wallet.data.balanceKobo },
    products: data.catalogue.data.products?.map((p) => ({ id: p.id, name: p.name, category: p.category, available: p.available, priceKobo: p.price_kobo })),
    fleet: data.fleet.data.vehicles?.map((v) => ({ id: v.id, label: v.label, active: v.active, lpgSuitable: v.lpg_suitable })),
    activeTrips: data.fleet.data.trips?.filter((t) => !t.ended_at).map((t) => ({ id: t.id, driverId: t.driver_id, vehicleId: t.vehicle_id })),
    meters: data.bulk.data.meters?.map((m) => ({ id: m.id, serial: m.serial, validUntil: m.valid_until, calibrationExpiresAt: m.calibration_expires_at, status: m.status })),
    qualifications: data.staff.data?.users?.map((u) => ({ id: u.id, role: u.role, qualifications: u.qualifications })) ?? null,
  };
  await writeFile(evidenceRoot + "/preflight.json", JSON.stringify(summary, null, 2) + "\n");
  console.log(JSON.stringify(summary, null, 2));
  await c.check("ROLEACC-PREFLIGHT", "Existing demo/no real payment;9 labelled accounts authenticated, original orders/ledger/stock snapshots retained privately before new scenarios");
});
if (phase === "preexceptions") {
  const c = await client(), results = [];
  test("ROLEACC-ACCESS: customer, commercial, driver and technician cannot read or operate another account's protected order or finance", async () => {
    const other = c.state.baseline.orders.data.find((o) => o.customer_id !== c.state.roles.customer.id);
    for (const role of ["customer", "commercial"]) {
      assert.deepEqual(await c.ok(role, "orders?id=" + other.id), []);
      results.push(await reject(c, role, "invoice.order", { orderId: other.id }, [403, 404]));
      results.push(await reject(c, role, "navigation.access", undefined, [403]));
    }
    for (const role of ["sales", "dispatcher", "driver", "technician"])
      results.push(await reject(c, role, "finance.ledger", undefined, [403]));
    const driver = await c.ok("driver", "orders");
    assert.ok(driver.every((o) => o.driver_id === c.state.roles.driver.id && !o.confirmation_code && !o.delivery_code_hash));
    await c.check("ROLEACC-ACCESS", "Own-account orders only; independent labelled operational accounts cannot access finance; driver scope excludes handover secrets");
  });
  test("ROLEACC-PAYMENT: insufficient wallet and tampered pricing do not create an order, debit the wallet or consume gas", async () => {
    const before = { orders: await c.ok("customer", "orders"), wallet: await c.ok("customer", "wallet"), stock: (await c.ok("inventory", "inventory.workspace")).gas };
    const input = await gasInput(c, "unfunded-wallet-large", "wallet", 50);
    assert.ok(before.wallet.balanceKobo < input.pricing.totalKobo, "Controlled insufficient balance");
    results.push(await reject(c, "customer", "checkout", input, [409], /Insufficient wallet/));
    results.push(await reject(c, "customer", "checkout", { ...input, idempotencyKey: c.key("tampered-checkout"), pricing: { ...input.pricing, totalKobo: input.pricing.totalKobo - 1 } }, [409]));
    assert.deepEqual(await c.ok("customer", "orders"), before.orders);
    assert.deepEqual(await c.ok("customer", "wallet"), before.wallet);
    assert.deepEqual((await c.ok("inventory", "inventory.workspace")).gas, before.stock);
    await c.check("ROLEACC-PAYMENT", "Insufficient balance and quote tampering rejected transactionally; orders, wallet and gas summary unchanged");
  });
  test("ROLEACC-CANCEL: unpaid card checkout stays unpaid and customer cancellation releases reservation exactly once", async () => {
    const stock = c.state.orders["abandoned-card"]?.stockBefore ?? c.state.baseline.inventory.data.gas;
    const made = await makeGas(c, "abandoned-card", "card");
    const order = await snapshot(c, "abandoned-card");
    assert.equal(order.payment_status, "unpaid");
    await transition(c, "abandoned-card", "cancelled", "customer");
    const replay = await transition(c, "abandoned-card", "cancelled", "customer"); assert.ok(replay);
    assert.equal((await snapshot(c, "abandoned-card")).status, "cancelled");
    assert.deepEqual((await c.ok("inventory", "inventory.workspace")).gas, stock);
    await c.check("ROLEACC-CANCEL", `${made.reference}: abandoned unpaid card order cancelled by its owner; reservation restored; cancellation replay has no extra effect`);
  });
  test("ROLEACC-FUND: explicit synthetic purchase-credit receipt needs a different reauthenticated finance approver and posts once", async () => {
    await c.reauth("owner"); await c.reauth("finance");
    const request = await c.ok("owner", "credit.request", { branchId: "lagos", customerId: c.state.roles.customer.id, amountKobo: 5000000, receiptReference: label + "-SYNTHETIC-CREDIT", reason: note("Simulated test-only purchase credit; no actual cash receipt") });
    c.state.funding = request.id; await c.save();
    results.push(await reject(c, "owner", "credit.decide", { id: request.id, decision: "approved", reason: note("Independent-approval negative check") }, [403], /different finance approver/));
    const decision = { id: request.id, decision: "approved", reason: note("Independent finance review of explicitly simulated test credit") };
    await c.ok("finance", "credit.decide", decision); await c.ok("finance", "credit.decide", decision);
    const wallet = await c.ok("customer", "wallet"); assert.equal(wallet.balanceKobo, 5000000);
    await c.check("ROLEACC-FUND", "₦50,000 explicitly synthetic QA credit approved independently; self-approval denied and decision replay posted one credit");
    await writeFile(evidenceRoot + "/preexceptions.json", JSON.stringify({ results, fundingRequest: request.id, labelledOrders: c.state.orders, checks: c.state.checks }, (key, value) => key === "input" ? undefined : value, 2) + "\n");
  });
}
