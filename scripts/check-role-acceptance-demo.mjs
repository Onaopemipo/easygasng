import test from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
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
if (phase === "fix-readback") test("ROLEACC-FIX-HTTP: deployed catalogue matches eligible serials and scoped cash review preserves all orders, ledger and stock", async () => {
  const c = await client();
  const data = { orders: await c.ok("owner", "orders"), ledger: await c.ok("finance", "finance.ledger"), inventory: await c.ok("inventory", "inventory"), gas: (await c.ok("inventory", "inventory.workspace")).gas };
  for (const [name, value] of Object.entries(data)) assert.deepEqual(value, c.state.fixBaseline[name], name + " unchanged by deployment");
  const products = (await c.ok("customer", "catalogue")).products;
  assert.equal(products.find((p) => p.id === "cylinder-empty-6").available, 1);
  for (const product of products.filter((p) => p.category === "Empty cylinders" && p.id !== "cylinder-empty-6")) assert.equal(product.available, 0);
  const collections = await c.ok("finance", "cash.collections");
  assert.equal(collections.find((r) => r.id === c.state.cashCollection).collector_id, c.state.roles.owner.id);
  await reject(c, "customer", "cash.collections", undefined, [403]);
  const beforeIds = new Set(c.state.baseline.orders.data.map((o) => o.id));
  assert.deepEqual(data.orders.filter((o) => beforeIds.has(o.id)), c.state.baseline.orders.data);
  await writeFile(evidenceRoot + "/fix-hosted-after.json", JSON.stringify({ ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k + "Hash", hash(v)])), advertisedEmptyCylinders: products.filter((p) => p.category === "Empty cylinders").map((p) => ({ id: p.id, available: p.available })), protectedOriginalOrders: beforeIds.size }, null, 2) + "\n");
  await c.check("ROLEACC-FIX-HTTP", "After promotion, serial-aware availability and independent cash collector context work; all current10orders/ledger/stock and8original orders unchanged by code deployment");
});
if (phase === "product-verified") test("ROLEACC-COD: supervised COD delivery and independent finance verification post one settlement; rejected partial refund leaves wallet and stock unchanged", async () => {
  const c = await client(), o = await snapshot(c, "product-cod");
  assert.equal(o.status, "delivered"); assert.equal(o.payment_status, "verified");
  const invoice = (await c.ok("customer", "invoice.order", { orderId: o.id })).invoice;
  assert.equal(invoice.status, "paid"); assert.equal(Number(invoice.paidKobo), 5700000); assert.equal(invoice.amountDueKobo, 0);
  const wallet = await c.ok("customer", "wallet"), stock = await c.ok("inventory", "inventory"), ledger = await c.ok("finance", "finance.ledger");
  const replayCheckout = await c.ok("customer", "checkout", c.state.orders["product-cod"].input); assert.equal(replayCheckout.id, o.id);
  await reject(c, "customer", "checkout", { ...c.state.orders["product-cod"].input, items: [{ productId: "cylinder-empty-6", quantity: 1 }] }, [409], /already used/);
  await c.reauth("finance"); await c.ok("finance", "cash.reconcile", { id: c.state.cashCollection });
  const handover = JSON.parse(await (await import("node:fs/promises")).readFile(".data/role-acceptance-handover.json", "utf8"));
  await c.ok("owner", "delivery.complete", { orderId: o.id, version: handover.version, code: handover.code, collectedKobo: 5700000, handover: true, operationKey: c.key("semantic-delivery-replay") });
  assert.deepEqual(await c.ok("finance", "finance.ledger"), ledger);
  assert.deepEqual(await c.ok("inventory", "inventory"), stock); assert.deepEqual(await c.ok("customer", "wallet"), wallet);
  const source = (await c.ok("customer", "refund.lines?orderId=" + o.id))[0]; assert.equal(Number(source.remaining), 2);
  const request = { orderId: o.id, lines: [{ source: source.source, quantity: 1 }], reason: note("Synthetic rejected partial refund acceptance case"), acceptWalletCredit: true, idempotencyKey: c.key("refund-rejected") };
  const made = await c.ok("customer", "refund.request", request);
  assert.equal((await c.ok("customer", "refund.request", request)).id, made.id);
  const pendingConflict = await reject(c, "customer", "refund.request", { ...request, idempotencyKey: c.key("second-pending-refund") }, [409], /awaiting independent review/);
  const keyConflict = await reject(c, "customer", "refund.request", { ...request, lines: [{ source: source.source, quantity: 2 }] }, [409], /conflicts/);
  await c.ok("finance", "credit.decide", { id: made.id, decision: "rejected", reason: note("Independent rejection of the labelled test refund") });
  await c.ok("finance", "credit.decide", { id: made.id, decision: "rejected", reason: note("Independent rejection of the labelled test refund") });
  const changedDecision = await reject(c, "finance", "credit.decide", { id: made.id, decision: "approved", reason: note("A rejected decision cannot be overwritten") }, [409], /already been decided/);
  assert.deepEqual(await c.ok("customer", "wallet"), wallet); assert.deepEqual(await c.ok("inventory", "inventory"), stock);
  c.state.walletBeforeRefund = wallet; c.state.productPaidStock = stock; c.state.originalProductInvoice = invoice; c.state.refundRejected = made.id; c.state.refundSource = source.source; await c.save();
  await writeFile(evidenceRoot + "/cod-refund-rejected.json", JSON.stringify({ reference: o.reference, status: o.status, payment: "verified", invoice: invoice.invoice_number, settledKobo: invoice.paidKobo, amountDueKobo: invoice.amountDueKobo, rejectedRefund: made.id, pendingConflict, keyConflict, changedDecision, walletUnchanged: true, stockUnchangedByReplayAndRejection: true }, null, 2) + "\n");
  await c.check("ROLEACC-COD", "₦57,000 COD settled independently once; checkout/cash/delivery replay has no extra posting; pending/key/changed-decision refund conflicts rejected; rejected refund leaves money/stock unchanged");
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
if (phase === "renew-safety") test("ROLEACC-QA-RENEWAL: explicitly approved two-hour synthetic qualifications and existing sandbox meter renew independently through product APIs", async () => {
  const c = await client();
  c.state.qaRenewal ??= { approvedBy: "User explicitly approved two-hour demo-only renewals in this chat", startedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 2 * 3600000).toISOString(), qualifications: [] };
  const renewal = c.state.qaRenewal; assert.ok(Date.parse(renewal.expiresAt) > Date.now()); await c.save();
  await c.login("administrator");
  const admin = (await c.ok("administrator", "me")).user; assert.equal(admin.role, "owner");
  c.state.roles.administrator = { id: admin.id, canonicalRole: admin.role }; await c.save();
  const targets = [["finance", "cylinder_inspection", "owner"], ["inventory", "bulk_lpg_loading", "owner"], ["driver", "bulk_lpg_dispensing", "owner"], ["owner", "bulk_lpg_metering", "administrator"]];
  for (const [target, code, verifier] of targets) {
    const userId = c.state.roles[target].id;
    if (renewal.qualifications.some(q => q.userId === userId && q.code === code)) continue;
    await c.reauth(verifier);
    const input = { userId, code, expiresAt: renewal.expiresAt, evidence: note("User-approved two-hour demo-only simulated " + code + "; synthetic QA only, not a real safety certification"), operationKey: c.key("qualify:" + target + ":" + code) };
    await c.save(); await c.ok(verifier, "technician.qualify", input);
    renewal.qualifications.push({ userId, code, verifiedBy: c.state.roles[verifier].id, expiresAt: renewal.expiresAt }); await c.save();
  }
  if (!renewal.meter) {
    const summary = await c.ok("owner", "bulk.summary");
    const meter = summary.meters.find(m => m.id === "95fd7658-9c52-48d5-92d4-e5e9482ad783"); assert.ok(meter);
    assert.equal(meter.vehicle_id, c.state.trip.vehicleId);
    await c.reauth("owner");
    const input = { meterId: meter.id, expectedCalibrationExpiresAt: new Date(meter.calibration_expires_at).toISOString(), expectedCalibrationReference: meter.calibration_reference,
      calibrationReference: label + "-SYNTHETIC-QA-ONLY-2H", calibrationExpiresAt: renewal.expiresAt, reason: note("User-approved two-hour demo-only sandbox meter renewal; no real calibration claim"), operationKey: c.key("meter.renew") };
    await c.save(); await c.ok("owner", "bulk.meter.recalibrate", input);
    renewal.meter = { id: meter.id, previousExpiry: meter.calibration_expires_at, expiresAt: renewal.expiresAt, reference: input.calibrationReference }; await c.save();
  }
  const q = (await c.ok("owner", "services.manage")).qualifications;
  for (const expected of renewal.qualifications) {
    const actual = q.find(r => r.user_id === expected.userId && r.code === expected.code); assert.ok(actual); assert.equal(Date.parse(actual.expires_at), Date.parse(renewal.expiresAt)); assert.notEqual(actual.user_id, actual.verified_by);
  }
  await writeFile(evidenceRoot + "/qa-renewal.json", JSON.stringify(renewal, null, 2) + "\n");
  await c.check("ROLEACC-QA-RENEWAL", "Explicitly approved2h labelled QA-only qualifications independently verified; existing sandbox meter renewed; unchanged production controls and no actual safety certification");
});
async function operation(c, role, action, name, body) {
  c.state.operations ??= {}; c.state.operations[name] ??= { ...body, operationKey: c.key(name) }; await c.save(); return c.ok(role, action, c.state.operations[name]);
}
async function assignPrepared(c, name) {
  let o = await snapshot(c, name);
  if (o.status === "placed") await transition(c, name, "accepted", "sales");
  o = await snapshot(c, name); if (o.status === "accepted") await transition(c, name, "preparing", "sales");
  o = await snapshot(c, name);
  if (o.status === "preparing") {
    await c.ok("sales", "delivery.coverage.confirm", { orderId: o.id, reason: note("Configured demo coverage verified for synthetic address only") });
    await operation(c, "dispatcher", "dispatch.assign", "assign:" + name, { orderId: o.id, driverId: c.state.roles.driver.id, version: Number(o.tracking_version), reason: note("Separate dispatcher assignment " + name) });
  }
  o = await snapshot(c, name); assert.equal(o.status, "assigned"); return o;
}
if (phase === "gas-prepare") test("ROLEACC-GAS-PREP: fresh wallet gas checkout, qualified cylinder inspection, sales preparation, invoice and independent dispatch/custody issuance use normal controls", async () => {
  const c = await client(); assert.ok(Date.parse(c.state.qaRenewal.expiresAt) > Date.now());
  await makeGas(c, "gas-wallet", "wallet", 6); let o = await snapshot(c, "gas-wallet");
  assert.equal(o.payment_status, "verified"); assert.equal(Number(o.total_kobo), 1580000);
  const line = o.gas_lines[0]; await c.reauth("finance");
  if (!c.state.gasCylinder) {
    const cid = await operation(c, "finance", "gas.cylinder.intake", "gas.cylinder.intake", { lineId: line.id, serial: label + "-CUSTOMER-6KG", sizeKg: 6, testDue: "2027-02-19", reason: note("Synthetic QA customer-cylinder intake; no real cylinder received") });
    c.state.gasCylinder = cid.id; await c.save();
  }
  await operation(c, "finance", "cylinder.inspect", "gas.cylinder.inspect", { id: c.state.gasCylinder, passed: true, nextDue: "2027-02-19", notes: note("Synthetic QA-only inspection under user-approved temporary qualification; not a physical safety certificate") });
  await operation(c, "finance", "gas.inspection.record", "gas.inspection.record", { lineId: line.id, cylinderId: c.state.gasCylinder, allowableKg: 6, reason: note("Simulated eligible capacity/residual gas; synthetic QA only") });
  await c.ok("finance", "invoice.issue", { orderId: o.id });
  o = await assignPrepared(c, "gas-wallet");
  const beforeLoad = await reject(c, "driver", "delivery.pickup", { orderId: o.id, version: Number(o.tracking_version), manifest: o.manifest, reason: note("Cannot pickup without acknowledgement and LPG custody"), operationKey: c.key("gas.early.pickup") }, [409]);
  await c.reauth("inventory");
  if (!c.state.gasLoad) {
    const load = await operation(c, "inventory", "bulk.load.issue", "gas.load.issue", { tripId: c.state.trip.id, meterId: c.state.qaRenewal.meter.id, grams: 6000, meterReadingGrams: 1000000, orderIds: [o.id], reason: note("Synthetic QA-only measured load6kg; no physical gas loading or meter observation") });
    c.state.gasLoad = { id: load.id, startReading: 1000000, grams: 6000 }; await c.save();
  }
  await writeFile(evidenceRoot + "/gas-prepared.json", JSON.stringify({ reference: o.reference, orderId: o.id, cylinderId: c.state.gasCylinder, load: c.state.gasLoad, totalKobo: o.total_kobo, payment: o.payment_status, beforeLoad, qualificationExpiry: c.state.qaRenewal.expiresAt }, null, 2) + "\n");
  await c.check("ROLEACC-GAS-PREP", "Fresh6kg wallet order paid1580000kobo; registered/qualified inspected customer cylinder, sales preparation, independent dispatch/invoice/load; premature pickup rejected");
});
if (phase === "refund-fix-readback") test("ROLEACC-REFUND-FIX-HTTP: refund fix deployment preserves all current orders, ledger, inventory and gas before new mutations", async () => {
  const c = await client(); const after = { orders: await c.ok("owner", "orders"), ledger: await c.ok("finance", "finance.ledger"), inventory: await c.ok("inventory", "inventory"), gas: (await c.ok("inventory", "inventory.workspace")).gas };
  for (const [name, value] of Object.entries(after)) assert.deepEqual(value, c.state.refundFixBaseline[name], name);
  await writeFile(evidenceRoot + "/refund-fix-after.json", JSON.stringify(Object.fromEntries(Object.entries(after).map(([k,v]) => [k + "Hash", hash(v)])), null, 2) + "\n");
});
if (phase === "refund-approved") test("ROLEACC-REFUND: UI partial refund approval posts one wallet credit, rejects over-refund and preserves stock and immutable invoice with independently approved credit note", async () => {
  const c = await client(), o = await snapshot(c, "product-cod");
  const request = (await c.ok("finance", "credits")).find(r => r.order_id === o.id && r.status === "approved" && r.kind === "refund"); assert.ok(request);
  c.state.refundApproved = request.id; await c.save();
  const before = Number(c.state.walletBeforeRefund.balanceKobo);
  const gasCost = Number(c.state.orders["gas-wallet"].input.pricing.totalKobo);
  const wallet = await c.ok("customer", "wallet"); assert.equal(wallet.balanceKobo, before - gasCost + 2600000);
  const stock = await c.ok("inventory", "inventory"); assert.deepEqual(stock, c.state.productPaidStock);
  const rejected = await reject(c, "customer", "refund.request", { orderId: o.id, lines: [{ source: c.state.refundSource, quantity: 2 }], reason: note("Cannot exceed remaining quantity after approved partial refund"), acceptWalletCredit: true, idempotencyKey: c.key("over-refund") }, [409], /remaining|exceed/i);
  await c.reauth("finance");
  await c.ok("finance", "credit.decide", { id: request.id, decision: "approved", reason: note("Replay independent refund approval without second credit") });
  assert.equal((await c.ok("customer", "wallet")).balanceKobo, wallet.balanceKobo);
  const adjusted = (await c.ok("customer", "invoice.order", { orderId: o.id })).invoice;
  assert.equal(adjusted.status, "adjustment_required"); assert.equal(adjusted.amountDueKobo, null);
  if (!c.state.refundInvoiceNote) {
    const made = await operation(c, "finance", "invoice.correction.propose", "refund.invoice.note", { orderId: o.id, kind: "credit", amountKobo: 2600000, reason: note("Match approved synthetic partial refund; retain original issued invoice") });
    c.state.refundInvoiceNote = made.noteId; await c.save();
  }
  const self = await reject(c, "finance", "invoice.correction.decide", { orderId: o.id, noteId: c.state.refundInvoiceNote, approve: true, operationKey: c.key("invoice.note.self") }, [403], /Independent/);
  await c.reauth("owner"); await operation(c, "owner", "invoice.correction.decide", "refund.invoice.note.approved", { orderId: o.id, noteId: c.state.refundInvoiceNote, approve: true });
  const invoice = (await c.ok("customer", "invoice.order", { orderId: o.id })).invoice;
  assert.equal(invoice.status, "paid"); assert.equal(invoice.amountDueKobo, 0);
  assert.deepEqual(invoice.snapshot, c.state.originalProductInvoice.snapshot);
  assert.equal(Number(invoice.total_kobo), Number(c.state.originalProductInvoice.total_kobo));
  await writeFile(evidenceRoot + "/refund-approved.json", JSON.stringify({ reference: o.reference, refundId: request.id, walletBeforeKobo: before, newGasDebitKobo: gasCost, refundKobo: 2600000, walletAfterKobo: wallet.balanceKobo, rejected, selfApproval: self, stockUnchanged: true, originalInvoiceUnchanged: true, finalInvoiceStatus: invoice.status, amountDueKobo: invoice.amountDueKobo }, null, 2) + "\n");
  await c.check("ROLEACC-REFUND", "Actual customer and separate finance UI partial refund2600000kobo; one wallet posting, over-refund409, no stock return; immutable invoice plus independent credit note gives due0");
});
if (phase === "failed-prepare") test("ROLEACC-FAILED: failed wallet delivery blocks cancellation/retry until an independent exact manifest return and preserves reservations", async () => {
  const c = await client();
  await makeProduct(c, "failed-wallet", 1, "wallet");
  let o = await snapshot(c, "failed-wallet"); await c.reauth("finance"); await c.ok("finance", "invoice.issue", { orderId: o.id });
  if (["placed", "accepted", "preparing"].includes(o.status)) o = await assignPrepared(c, "failed-wallet");
  if (o.status === "assigned" && o.attempt.state === "assigned") {
    await operation(c, "driver", "dispatch.respond", "failed.ack1", { orderId: o.id, version: Number(o.tracking_version), decision: "acknowledged", reason: note("Synthetic first attempt accepted") });
    o = await snapshot(c, "failed-wallet");
  }
  const denials = [];
  if (!c.state.failureDenials) c.state.failureDenials = [];
  if (o.status === "assigned" && !o.attempt.picked_up_at) {
    denials.push(await reject(c, "driver", "delivery.pickup", { orderId: o.id, version: Number(o.tracking_version), manifest: [], reason: note("Wrong pickup manifest rejected"), operationKey: c.key("failed.wrong.pickup") }, [400,409]));
    await operation(c, "driver", "delivery.pickup", "failed.pickup1", { orderId: o.id, version: Number(o.tracking_version), manifest: o.manifest, reason: note("Simulated full serial manifest inspection/pickup") });
  }
  o = await snapshot(c, "failed-wallet");
  if (o.status === "assigned") {
    denials.push(await reject(c, "sales", "order.transition", { id: o.id, status: "cancelled", version: Number(o.tracking_version), note: note("Cancellation after pickup must await return"), operationKey: c.key("failed.cancel.pickup") }, [409]));
    await transition(c, "failed-wallet", "out_for_delivery", "driver");
  }
  o = await snapshot(c, "failed-wallet");
  if (o.status === "out_for_delivery") await transition(c, "failed-wallet", "delivery_failed", "driver", { failureReason: "customer_unavailable" });
  o = await snapshot(c, "failed-wallet"); assert.equal(o.status, "delivery_failed"); assert.ok(["failed", "returned"].includes(o.attempt.state));
  if (o.attempt.state !== "returned") {
    denials.push(await reject(c, "sales", "order.transition", { id: o.id, status: "cancelled", version: Number(o.tracking_version), note: note("Unreturned stock must block cancellation"), operationKey: c.key("failed.cancel.held") }, [409], /receive|return/i));
    denials.push(await reject(c, "dispatcher", "dispatch.assign", { orderId: o.id, driverId: c.state.roles.driver.id, version: Number(o.tracking_version), reason: note("Unreturned stock must block reassignment"), operationKey: c.key("failed.reassign.held") }, [409]));
    denials.push(await reject(c, "driver", "delivery.return", { orderId: o.id, version: Number(o.tracking_version), manifest: o.manifest, reason: note("Driver cannot independently receive own return"), operationKey: c.key("failed.self.return") }, [403]));
    denials.push(await reject(c, "inventory", "delivery.return", { orderId: o.id, version: Number(o.tracking_version), manifest: [], reason: note("Incomplete return must not release serial custody"), operationKey: c.key("failed.wrong.return") }, [400,409]));
    await c.reauth("inventory");
    await operation(c, "inventory", "delivery.return", "failed.return1", { orderId: o.id, version: Number(o.tracking_version), manifest: o.manifest, reason: note("Independent full synthetic manifest return; no real goods moved") });
  }
  o = await snapshot(c, "failed-wallet"); assert.equal(o.attempt.state,"returned"); assert.equal(o.payment_status,"verified");
  c.state.failureDenials.push(...denials); if (!c.state.failureDenials.length) c.state.failureDenials = c.state.calls.slice(-40).filter(r=>r.status>=400 && r.status!==401 && ["delivery.pickup","order.transition","dispatch.assign","delivery.return"].includes(r.action)); assert.ok(c.state.failureDenials.length>=5); c.state.failedWalletSnapshot = { wallet: await c.ok("customer", "wallet"), inventory: await c.ok("inventory", "inventory"), attemptId: o.attempt.id, trackingVersion: o.tracking_version }; await c.save();
  await writeFile(evidenceRoot + "/failed-returned.json", JSON.stringify({ reference: o.reference, status: o.status, attempt: o.attempt, manifest: o.manifest, rejected: c.state.failureDenials, walletBalanceKobo: c.state.failedWalletSnapshot.wallet.balanceKobo }, null, 2) + "\n");
  await c.check("ROLEACC-FAILED", "Wrong pickup/return manifest, cancellation and reassignment with held custody, driver self-return rejected; independent full return recorded; failure history retained for safe retry");
});
if (phase === "retry-prepare") test("ROLEACC-RETRY: returned failed delivery reschedules and reassigns as a new attempt without another wallet debit or stock reservation", async () => {
  const c = await client(); let o = await snapshot(c,"failed-wallet"); assert.equal(o.status,"delivery_failed"); assert.equal(o.attempt.state,"returned");
  await operation(c,"sales","delivery.reschedule","failed.reschedule",{orderId:o.id,version:Number(o.tracking_version),date:o.delivery_date.slice(0,10),window:o.delivery_window,reason:note("Safe synthetic retry after independent manifest return")});
  o = await snapshot(c,"failed-wallet");
  await operation(c,"dispatcher","dispatch.assign","failed.assign2",{orderId:o.id,driverId:c.state.roles.driver.id,version:Number(o.tracking_version),reason:note("Independent second attempt after returned custody")});
  o=await snapshot(c,"failed-wallet");assert.equal(o.status,"assigned");assert.notEqual(o.attempt.id,c.state.failedWalletSnapshot.attemptId);
  assert.deepEqual(await c.ok("customer","wallet"),c.state.failedWalletSnapshot.wallet);assert.deepEqual(await c.ok("inventory","inventory"),c.state.failedWalletSnapshot.inventory);
  await writeFile(evidenceRoot+"/retry-prepared.json",JSON.stringify({reference:o.reference,attemptId:o.attempt.id,status:o.status,noNewWalletDebit:true,noNewStockReservation:true},null,2)+"\n");
});
if (phase === "gas-arrived-guards") test("ROLEACC-GAS-GUARDS: wrong-role, stale and incorrect simulated meter readings cannot dispense or complete without proof", async () => {
  const c=await client(),o=await snapshot(c,"gas-wallet");assert.equal(o.attempt.state,"arrived");
  const load=(await c.ok("owner","bulk.summary")).loads.find(r=>r.id===c.state.gasLoad.id);assert.equal(load.state,"active");
  const input={loadId:load.id,version:Number(load.version),orderId:o.id,meterReadingGrams:1006000,reason:note("Synthetic meter guard acceptance")};const denied=[];
  denied.push(await reject(c,"finance","bulk.dispense",{...input,operationKey:c.key("gas.wrong.dispenser")},[403]));
  denied.push(await reject(c,"driver","bulk.dispense",{...input,version:Number(load.version)-1,operationKey:c.key("gas.stale.meter")},[409]));
  denied.push(await reject(c,"driver","bulk.dispense",{...input,meterReadingGrams:1000001,operationKey:c.key("gas.wrong.mass")},[409]));
  const own=await snapshot(c,"gas-wallet","customer");
  denied.push(await reject(c,"driver","driver.complete",{orderId:o.id,version:Number(o.tracking_version),code:own.confirmation_code,handover:true,operationKey:c.key("gas.missing.fulfilment")},[409]));
  assert.equal((await c.ok("owner","bulk.summary")).loads.find(r=>r.id===load.id).dispensed_grams,load.dispensed_grams);
  await writeFile(evidenceRoot+"/gas-guards.json",JSON.stringify({reference:o.reference,rejected:denied,dispensedUnchanged:true},null,2)+"\n");
});
if (phase === "gas-finish") test("ROLEACC-GAS: restricted driver UI metered/proof/handover completes fresh wallet gas order once and independent zero-return custody reconciles", async () => {
 const c=await client();const o=await snapshot(c,"gas-wallet");assert.equal(o.status,"delivered");assert.equal(o.payment_status,"verified");
 let load=(await c.ok("owner","bulk.summary")).loads.find(r=>r.id===c.state.gasLoad.id);assert.equal(Number(load.dispensed_grams),6000);
 assert.equal((await c.ok("driver","delivery.photos?orderId="+o.id)).photos.length,1);
 const inv=(await c.ok("customer","invoice.order",{orderId:o.id})).invoice;assert.equal(inv.status,"paid");assert.equal(inv.amountDueKobo,0);
 const cylinder=(await c.ok("inventory","cylinders")).find(r=>r.id===c.state.gasCylinder);assert.equal(cylinder.status,"filled");assert.equal(cylinder.customer_id,c.state.roles.customer.id);
 const gas=(await c.ok("inventory","inventory.workspace")).gas;const before=c.state.orders["gas-wallet"].stockBefore;
 assert.equal(Number(gas[0].on_hand),Number(before[0].on_hand)-6000);assert.equal(Number(gas[0].reserved),Number(before[0].reserved));
 if(load.state==="active") await operation(c,"driver","bulk.return.declare","gas.return.declare",{loadId:load.id,version:Number(load.version),returnGrams:0,reason:note("Synthetic empty remaining load declaration; no physical meter observation")});
 load=(await c.ok("owner","bulk.summary")).loads.find(r=>r.id===load.id);
 await c.reauth("inventory");if(load.state==="returning")await operation(c,"inventory","bulk.return.receive","gas.return.receive",{loadId:load.id,version:Number(load.version),returnGrams:0,reason:note("Independent synthetic zero remaining load receipt")});
 load=(await c.ok("owner","bulk.summary")).loads.find(r=>r.id===load.id);assert.equal(load.state,"reconciled");
 const stockAfter=(await c.ok("inventory","inventory.workspace")).gas;assert.deepEqual(stockAfter,gas);
 await writeFile(evidenceRoot+"/gas-completed.json",JSON.stringify({reference:o.reference,status:o.status,payment:o.payment_status,gasBefore:before,gasAfter:gas,cylinderId:cylinder.id,cylinderStatus:cylinder.status,load:{id:load.id,state:load.state,loadedGrams:load.loaded_grams,dispensedGrams:load.dispensed_grams,returnedGrams:load.declared_return_grams},invoice:inv.invoice_number,amountDueKobo:inv.amountDueKobo,syntheticOnly:true},null,2)+"\n");
 await c.check("ROLEACC-GAS","Freshwallet6kg completed through actual restricted driver UI custody/pickup/arrival/meter/proof/handover; one6000g stock debit and paid invoice; independent zero return reconciled; no real gas/device/travel claim");
});
if (phase === "wallet-cancel") test("ROLEACC-WALLET-CANCEL: customer cancellation before pickup releases gas and refunds wallet exactly once while invoice remains explicit adjustment required",async()=>{
 const c=await client();if(!c.state.walletCancelBefore){c.state.walletCancelBefore={wallet:await c.ok("customer","wallet"),gas:(await c.ok("inventory","inventory.workspace")).gas};await c.save();}
 await makeGas(c,"wallet-cancel","wallet",0.5);let o=await snapshot(c,"wallet-cancel");await c.reauth("finance");await c.ok("finance","invoice.issue",{orderId:o.id});
 await transition(c,"wallet-cancel","cancelled","customer");await transition(c,"wallet-cancel","cancelled","customer");o=await snapshot(c,"wallet-cancel");assert.equal(o.status,"cancelled");
 assert.equal((await c.ok("customer","wallet")).balanceKobo,c.state.walletCancelBefore.wallet.balanceKobo);assert.deepEqual((await c.ok("inventory","inventory.workspace")).gas,c.state.walletCancelBefore.gas);
 const invoice=(await c.ok("customer","invoice.order",{orderId:o.id})).invoice;assert.equal(invoice.status,"adjustment_required");assert.equal(invoice.amountDueKobo,null);
 const denied=await reject(c,"customer","invoice.request.create",{orderId:o.id,operationKey:c.key("cancel.payment.link")},[409]);
 await writeFile(evidenceRoot+"/wallet-cancel.json",JSON.stringify({reference:o.reference,status:o.status,balanceKobo:c.state.walletCancelBefore.wallet.balanceKobo,walletRestoredOnce:true,gasReservationReleasedOnce:true,invoiceStatus:invoice.status,newPaymentDenied:denied},null,2)+"\n");
});
if(phase==="payment-guards")test("ROLEACC-PROVIDER-GUARDS: forged verification, foreign or cancelled targets, client-selected amount and unsigned success webhook cannot create payment success",async()=>{
 const c=await client();const before={wallet:await c.ok("customer","wallet"),ledger:await c.ok("finance","finance.ledger"),orders:await c.ok("owner","orders")};const denied=[];
 denied.push(await reject(c,"customer","payments/paystack/verify",{intentId:c.key("nonexistent.intent")},[403,404]));
 denied.push(await reject(c,"owner","payments/paystack/quote",{purpose:"order",orderId:c.state.orders["abandoned-card"].id,requestKey:c.key("staff.payment.quote")},[403]));
 denied.push(await reject(c,"commercial","payments/paystack/quote",{purpose:"order",orderId:c.state.orders["abandoned-card"].id,requestKey:c.key("foreign.payment.quote")},[403,404]));
 denied.push(await reject(c,"customer","payments/paystack/quote",{purpose:"order",orderId:c.state.orders["abandoned-card"].id,requestKey:c.key("cancelled.payment.quote")},[409]));
 denied.push(await reject(c,"customer","payments/paystack/quote",{purpose:"order",orderId:c.state.orders["product-cod"].id,amountKobo:1,reference:"forged-client-paid",status:"success",requestKey:c.key("tamper.payment.quote")},[400]));
 denied.push(await reject(c,"","payments/paystack/webhook",{event:"charge.success",data:{reference:label+"-FORGED",amount:1,status:"success",currency:"NGN"}},[400,401,403]));
 assert.deepEqual(await c.ok("customer","wallet"),before.wallet);assert.deepEqual(await c.ok("finance","finance.ledger"),before.ledger);assert.deepEqual(await c.ok("owner","orders"),before.orders);
 await writeFile(evidenceRoot+"/payment-guards.json",JSON.stringify({rejected:denied,walletLedgerAndOrdersUnchanged:true,liveProviderTransaction:false},null,2)+"\n");
});
if(phase==="retry-guards")test("ROLEACC-RETRY-PROOF: a new delivery attempt requires its own consented proof and cannot complete from a stale version",async()=>{
 const c=await client();const o=await snapshot(c,"failed-wallet"),own=await snapshot(c,"failed-wallet","customer");assert.equal(o.attempt.state,"arrived");assert.equal((await c.ok("driver","delivery.photos?orderId="+o.id)).photos.length,0);const before=await c.ok("inventory","inventory");
 const input={orderId:o.id,version:Number(o.tracking_version),code:own.confirmation_code,handover:true};
 const noProof=await reject(c,"driver","driver.complete",{...input,operationKey:c.key("retry.no.proof")},[409],/proof/i);
 const stale=await reject(c,"driver","driver.complete",{...input,version:Number(o.tracking_version)-1,operationKey:c.key("retry.stale")},[409]);
 assert.equal((await snapshot(c,"failed-wallet")).tracking_version,o.tracking_version);assert.deepEqual(await c.ok("inventory","inventory"),before);
 await writeFile(".data/role-retry-handover.json",JSON.stringify({orderId:o.id,code:own.confirmation_code}),{mode:0o600});await writeFile(evidenceRoot+"/retry-guards.json",JSON.stringify({reference:o.reference,attemptId:o.attempt.id,noProof,stale,noStockOrVersionChange:true},null,2)+"\n");
});
if(phase==="retry-finish")test("ROLEACC-RETRY-COMPLETE: second-attempt driver UI delivery consumes one reserved serial once with retained failure/return history and paid invoice",async()=>{
 const c=await client();const o=await snapshot(c,"failed-wallet");assert.equal(o.status,"delivered");assert.equal(o.payment_status,"verified");assert.notEqual(o.attempt.id,c.state.failedWalletSnapshot.attemptId);assert.equal(o.attempt.state,"delivered");
 const own=await snapshot(c,"failed-wallet","customer");const stock=await c.ok("inventory","inventory");const before=c.state.orders["failed-wallet"].stockBefore;const line=stock.find(r=>r.product_id==="cylinder-empty-6"),old=before.find(r=>r.product_id==="cylinder-empty-6");assert.equal(Number(line.quantity),Number(old.quantity)-1);assert.equal(Number(line.reserved),Number(old.reserved));
 const cylinder=(await c.ok("inventory","cylinders")).find(r=>r.id===c.state.serials.C);assert.equal(cylinder.customer_id,c.state.roles.customer.id);assert.equal(cylinder.status,"sold");
 const history=o.events.map(r=>r.note??"").join("\n");assert.match(history,/delivery_failed/);assert.match(history,/delivery.return/);assert.match(history,/reschedul/i);
 const invoice=(await c.ok("customer","invoice.order",{orderId:o.id})).invoice;assert.equal(invoice.status,"paid");assert.equal(invoice.amountDueKobo,0);
 const photos=(await c.ok("driver","delivery.photos?orderId="+o.id)).photos;assert.equal(photos.length,1);
 const wallet=await c.ok("customer","wallet");assert.equal(wallet.balanceKobo,c.state.failedWalletSnapshot.wallet.balanceKobo);
 const handover={orderId:o.id,version:Number(o.tracking_version),code:JSON.parse(await readFile(".data/role-retry-handover.json","utf8")).code,handover:true,collectedKobo:0,operationKey:c.key("retry.delivered.replay.valid")};await c.save();await c.ok("owner","delivery.complete",handover);assert.deepEqual(await c.ok("inventory","inventory"),stock);assert.deepEqual(await c.ok("customer","wallet"),wallet);
 await writeFile(evidenceRoot+"/retry-completed.json",JSON.stringify({reference:o.reference,status:o.status,payment:o.payment_status,firstAttempt:c.state.failedWalletSnapshot.attemptId,secondAttempt:o.attempt.id,walletBalanceKobo:wallet.balanceKobo,stockBefore:{quantity:old.quantity,reserved:old.reserved},stockAfter:{quantity:line.quantity,reserved:line.reserved},serial:cylinder.serial,serialStatus:cylinder.status,photoCount:photos.length,invoiceStatus:invoice.status,amountDueKobo:invoice.amountDueKobo,historyPreserved:true,semanticReplayNoEffects:true},null,2)+"\n");
});
if(phase==="reconcile")test("ROLEACC-RECONCILE: all five new orders, wallet, cash, serials, gas and closed custody reconcile while original eight orders and production holds are preserved",async()=>{
 const c=await client();const failed=c.state.orders["failed-wallet"];
 const incidents=await c.ok("dispatcher","incidents");const incident=incidents.find(i=>i.category==="delivery_failure"&&i.target === c.state.failedWalletSnapshot.attemptId);assert.ok(incident);assert.equal(incident.owner_role,"manager");
 if(incident.status!=="resolved")await c.ok("dispatcher","incident.update",{id:incident.id,status:"resolved",note:note("Synthetic failure resolved after independent exact return and successful second-attempt delivery; original failure history retained")});
 let driver=await c.ok("driver","driver.snapshot");
 if(driver.trip?.id===c.state.trip.id)await operation(c,"driver","trip.end","trip.end",{tripId:c.state.trip.id,endOdometer:1000});
 await operation(c,"driver","driver.availability","driver.restore.available",{available:c.state.driverWasAvailable});
 driver=await c.ok("driver","driver.snapshot");assert.equal(driver.profile.driver_available,c.state.driverWasAvailable);assert.ok(!driver.trip);
 const orders=await c.ok("owner","orders"),ids=new Set(c.state.baseline.orders.data.map(o=>o.id));assert.deepEqual(orders.filter(o=>ids.has(o.id)),c.state.baseline.orders.data);assert.equal(orders.length,ids.size+5);
 const expected={"abandoned-card":["cancelled","unpaid"],"product-cod":["delivered","verified"],"gas-wallet":["delivered","verified"],"failed-wallet":["delivered","verified"],"wallet-cancel":["cancelled","refunded"]};for(const[name,statuses]of Object.entries(expected)){const o=orders.find(o=>o.id===c.state.orders[name].id);assert.ok(o);assert.deepEqual([o.status,o.payment_status],statuses);}
 const wallet=await c.ok("customer","wallet");assert.equal(wallet.balanceKobo,2920000);assert.equal(wallet.entries.reduce((n,e)=>n+Number(e.amount_kobo),0),wallet.balanceKobo);assert.equal(new Set(wallet.entries.map(e=>e.reference)).size,wallet.entries.length);
 const inventory=await c.ok("inventory","inventory"),physical=inventory.find(r=>r.product_id==="cylinder-empty-6");assert.equal(Number(physical.quantity),17);assert.equal(Number(physical.reserved),0);
 const gas=(await c.ok("inventory","inventory.workspace")).gas;assert.equal(Number(gas[0].on_hand),Number(c.state.baseline.inventory.data.gas[0].on_hand)-6000);assert.equal(Number(gas[0].reserved),Number(c.state.baseline.inventory.data.gas[0].reserved));
 const cylinders=await c.ok("inventory","cylinders");for(const cid of Object.values(c.state.serials)){const r=cylinders.find(r=>r.id===cid);assert.equal(r.status,"sold");assert.equal(r.customer_id,c.state.roles.customer.id);}
 const loads=(await c.ok("owner","bulk.summary")).loads;assert.equal(loads.find(l=>l.id===c.state.gasLoad.id).state,"reconciled");
 const collections=await c.ok("finance","cash.collections"),cash=collections.find(r=>r.id===c.state.cashCollection);assert.ok(cash.verified_at);assert.equal(Number(cash.amount_kobo),5700000);assert.notEqual(cash.collector_id,c.state.roles.finance.id);
 const invoices={};for(const name of ["product-cod","gas-wallet","failed-wallet"]){const inv=(await c.ok("customer","invoice.order",{orderId:c.state.orders[name].id})).invoice;assert.equal(inv.status,"paid");assert.equal(inv.amountDueKobo,0);invoices[name]={number:inv.invoice_number,status:inv.status,totalKobo:inv.total_kobo,effectiveTotalKobo:inv.effectiveTotalKobo,paidKobo:inv.paidKobo,dueKobo:inv.amountDueKobo};}
 const credits=await c.ok("finance","credits");assert.equal(credits.filter(r=>r.kind==="refund"&&r.status==="approved"&&r.order_id===c.state.orders["product-cod"].id).length,1);
 const release=JSON.parse(await readFile(".data/role-invoice-release.json","utf8"));const identity=JSON.parse(await readFile(evidenceRoot+"/invoice-stable-identity.json","utf8"));const cancelledInvoice=(await c.ok("customer","invoice.order",{orderId:c.state.orders["wallet-cancel"].id})).invoice;assert.equal(cancelledInvoice.status,"voided");assert.equal(cancelledInvoice.paidKobo,0);assert.equal(cancelledInvoice.amountDueKobo,0);
 const final={sourceSha:release.sha,deployment:identity.id,cancelledInvoice:{status:cancelledInvoice.status,paidKobo:cancelledInvoice.paidKobo,dueKobo:cancelledInvoice.amountDueKobo},originalOrdersPreserved:ids.size,totalOrders:orders.length,newOrders:Object.fromEntries(Object.keys(expected).map(n=>{const o=orders.find(o=>o.id===c.state.orders[n].id);return[n,{id:o.id,reference:o.reference,status:o.status,payment:o.payment_status}]})),walletBalanceKobo:wallet.balanceKobo,walletEntries:wallet.entries.map(e=>({kind:e.kind,amountKobo:e.amount_kobo,reference:e.reference})),empty6kg:{quantity:physical.quantity,reserved:physical.reserved,soldTestSerials:3},gas,loadReconciled:true,cash:{id:cash.id,collectedKobo:cash.amount_kobo,verifiedAt:cash.verified_at,independent:true},invoices,incident:{id:incident.id,target:incident.target,ownerRole:incident.owner_role,resolvedAfterRetry:true},qaTripEnded:true,driverAvailabilityRestored:true,qaQualificationExpiry:c.state.qaRenewal.expiresAt,productionDecision:"Existing production NO-GO, actual-import hold and retain-all unchanged",scope:"Synthetic hosted demo acceptance; no actual gas, funds, device, GPS, provider transaction or real certification claim"};
 await writeFile(evidenceRoot+"/final-reconciliation.json",JSON.stringify(final,null,2)+"\n");await c.check("ROLEACC-RECONCILE","Five new synthetic orders reconcile; wallet2920000kobo, gas6000g debit,3sold serials, independent5700000kobo cash, paid invoices, all custody/trip closed; eight original orders identical");
});
if(phase==="cancel-invoice-review")test("ROLEACC-CANCEL-INVOICE: independently void the refunded cancelled test invoice without changing its issued snapshot or wallet",async()=>{
 const c=await client(),o=await snapshot(c,"wallet-cancel");assert.equal(o.status,"cancelled");const before=(await c.ok("customer","invoice.order",{orderId:o.id})).invoice;const wallet=await c.ok("customer","wallet");
 if(!c.state.cancelInvoiceNote){await c.reauth("finance");const made=await operation(c,"finance","invoice.correction.propose","cancel.invoice.void",{orderId:o.id,kind:"void",amountKobo:Number(before.total_kobo),reason:note("Void cancelled synthetic invoice after full automatic wallet refund; keep original immutable source")});c.state.cancelInvoiceNote=made.noteId;await c.save();}
 await c.reauth("owner");await operation(c,"owner","invoice.correction.decide","cancel.invoice.void.approve",{orderId:o.id,noteId:c.state.cancelInvoiceNote,approve:true});
 const after=(await c.ok("customer","invoice.order",{orderId:o.id})).invoice;assert.equal(after.status,"voided");assert.equal(after.amountDueKobo,0);assert.deepEqual(after.snapshot,before.snapshot);assert.deepEqual(await c.ok("customer","wallet"),wallet);
 await writeFile(evidenceRoot+"/cancel-invoice-reviewed.json",JSON.stringify({reference:o.reference,invoice:after.invoice_number,status:after.status,dueKobo:after.amountDueKobo,originalIssuedSnapshotPreserved:true,walletUnchanged:true,independentFinanceAndOwnerReview:true},null,2)+"\n");
});
if(phase==="invoice-fix-readback")test("ROLEACC-INVOICE-FIX-HTTP: cancellation balance deployment preserves all orders, wallet, ledger and stock before independent invoice review",async()=>{
 const c=await client();const after={orders:await c.ok("owner","orders"),ledger:await c.ok("finance","finance.ledger"),inventory:await c.ok("inventory","inventory"),gas:(await c.ok("inventory","inventory.workspace")).gas,wallet:await c.ok("customer","wallet")};for(const[k,v]of Object.entries(after))assert.deepEqual(v,c.state.invoiceFixBaseline[k],k);await writeFile(evidenceRoot+"/invoice-fix-after.json",JSON.stringify(Object.fromEntries(Object.entries(after).map(([k,v])=>[k+"Hash",hash(v)])),null,2)+"\n");
 const inv=(await c.ok("customer","invoice.order",{orderId:c.state.orders["wallet-cancel"].id})).invoice;assert.equal(inv.paidKobo,0);assert.equal(inv.status,"adjustment_required");assert.equal(inv.amountDueKobo,null);
});
