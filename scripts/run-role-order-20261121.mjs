import test from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { client, hash, evidenceRoot, label } from "./demo-role-acceptance-20261121-client.mjs";
const phase = process.argv[2];
assert.ok(["preexceptions","product-prepare","product-progress","commercial","renew-safety","gas-expiry","gas-prepare","product-handover-guards","cash-guards","product-verified","failed-prepare","retry-prepare","gas-arrived-guards","gas-finish","wallet-cancel","payment-guards","retry-guards","retry-finish","cancel-invoice-review","refund-approved"].includes(phase), "Explicit approved fresh-run stage required");
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
  assert.ok(!c.state.baseline.orders.some((old) => old.id === o.id), "Only run-owned orders may mutate");
  const rows = await c.ok(role, "orders?id=" + o.id); assert.equal(rows.length, 1); return rows[0];
}
if (phase === "product-prepare") test("ROD21-PRODUCT-PREP: synthetic serial registration, customer COD checkout, sales preparation and independent dispatch use normal product controls", async () => {
  const c = await client(); c.state.serials ??= {};
  for (const suffix of ["A", "B", "C"]) {
    const serial = label + "-PRODUCT-" + suffix;
    let existing = (await c.ok("inventory", "cylinders")).find((r) => r.serial === serial);
    if (!existing) {
      await c.ok("inventory", "cylinder.create", { serial, sizeKg: 6, ownership: "company", status: "empty", testDue: "2027-02-21", branchId: "lagos" });
      existing = (await c.ok("inventory", "cylinders")).find((r) => r.serial === serial); assert.ok(existing);
    }
    c.state.serials[suffix] = existing.id; await c.save();
  }
  await makeProduct(c, "product-cod", 2);
  let o = await snapshot(c, "product-cod");
  if (o.status === "placed") await transition(c, "product-cod", "accepted", "sales");
  o = await snapshot(c, "product-cod");
  if (o.status === "accepted") await transition(c, "product-cod", "preparing", "sales");
  o = await snapshot(c, "product-cod");
  if (o.status === "preparing") {
    await c.ok("sales", "delivery.coverage.confirm", { orderId: o.id, reason: note("QA-only address coverage in configured demo area") });
  }
  o = await snapshot(c, "product-cod"); assert.equal(o.status, "preparing");
  await c.reauth("finance");
  const invoice = await c.ok("finance", "invoice.issue", { orderId: o.id }); assert.ok(invoice.invoice);
  await c.check("ROD21-PRODUCT-PREP", `${o.reference}:2 new QA serials reserved, sales accepted/prepared and coverage confirmed; finance invoice issued; trip start and assignment still pending actual UI; no original order mutated`);
  await writeFile(evidenceRoot + "/product-prepared.json", JSON.stringify({ order: { id: o.id, reference: o.reference, status: o.status, totalKobo: o.total_kobo, payment: o.payment_status }, serialIds: c.state.serials, trip: c.state.trip, checks: c.state.checks }, null, 2) + "\n");
});
if (phase === "product-handover-guards") test("ROD21-HANDOVER-GUARDS: restricted driver cash, stale progression, false handover, wrong code and cross-account completion are rejected", async () => {
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
  await writeFile(".data/role-order-acceptance-20261121/handover.json", JSON.stringify({ orderId: o.id, reference: o.reference, code: customer.confirmation_code, amountNaira: Number(o.total_kobo) / 100, version: Number(o.tracking_version) }), { mode: 0o600 });
  await writeFile(evidenceRoot + "/handover-guards.json", JSON.stringify({ orderId: o.id, reference: o.reference, rejected: rows, statusUnchanged: true, paymentUnchanged: true, retainedProofCount: photos.photos.length }, null, 2) + "\n");
  await c.check("ROD21-HANDOVER-GUARDS", "Wrong role/customer, stale version, no handover and wrong code rejected; driver COD policy preserved; current arrived order and unpaid status unchanged");
});
if (phase === "cash-guards") test("ROD21-CASH-GUARDS: collected cash is not verified and the collector cannot reconcile their own collection", async () => {
  const c = await client(), o = await snapshot(c, "product-cod");
  assert.equal(o.status, "delivered"); assert.equal(o.payment_status, "collected");
  const collection = (await c.ok("finance", "cash.collections")).find((r) => r.reference === o.reference); assert.ok(collection && !collection.verified_at);
  await c.reauth("owner");
  const denied = await reject(c, "owner", "cash.reconcile", { id: collection.id }, [403], /independent finance approver/);
  const refund = await reject(c, "customer", "refund.request", { orderId: o.id, reason: note("Unverified collection cannot be refunded"), acceptWalletCredit: true, idempotencyKey: c.key("refund-unverified-cash") }, [409], /verified payments/);
  assert.equal((await snapshot(c, "product-cod")).payment_status, "collected");
  c.state.cashCollection = collection.id; await c.save();
  await writeFile(evidenceRoot + "/cash-guards.json", JSON.stringify({ reference: o.reference, collectionId: collection.id, denied, refund, payment: "collected/unverified" }, null, 2) + "\n");
  await c.check("ROD21-CASH-GUARDS", "Collector self-reconciliation403 and refund-before-verification409; actual synthetic collection remains unverified until independent finance");
});
if (phase === "product-verified") test("ROD21-COD: supervised COD delivery and independent finance verification post one settlement; rejected partial refund leaves wallet and stock unchanged", async () => {
  const c = await client(), o = await snapshot(c, "product-cod");
  assert.equal(o.status, "delivered"); assert.equal(o.payment_status, "verified");
  const invoice = (await c.ok("customer", "invoice.order", { orderId: o.id })).invoice;
  assert.equal(invoice.status, "paid"); assert.equal(Number(invoice.paidKobo), 5700000); assert.equal(invoice.amountDueKobo, 0);
  const wallet = await c.ok("customer", "wallet"), stock = await c.ok("inventory", "inventory"), ledger = await c.ok("finance", "finance.ledger");
  const replayCheckout = await c.ok("customer", "checkout", c.state.orders["product-cod"].input); assert.equal(replayCheckout.id, o.id);
  await reject(c, "customer", "checkout", { ...c.state.orders["product-cod"].input, items: [{ productId: "cylinder-empty-6", quantity: 1 }] }, [409], /already used/);
  await c.reauth("finance"); await c.ok("finance", "cash.reconcile", { id: c.state.cashCollection });
  const handover = JSON.parse(await (await import("node:fs/promises")).readFile(".data/role-order-acceptance-20261121/handover.json", "utf8"));
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
  await c.check("ROD21-COD", "₦57,000 COD settled independently once; checkout/cash/delivery replay has no extra posting; pending/key/changed-decision refund conflicts rejected; rejected refund leaves money/stock unchanged");
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
if (phase === "preexceptions") {
  const c = await client(), results = [];
  test("ROD21-ACCESS: customer, commercial, driver and technician cannot read or operate another account's protected order or finance", async () => {
    const other = c.state.baseline.orders.find((o) => o.customer_id !== c.state.roles.customer.id);
    for (const role of ["customer", "commercial"]) {
      assert.deepEqual(await c.ok(role, "orders?id=" + other.id), []);
      results.push(await reject(c, role, "invoice.order", { orderId: other.id }, [403, 404]));
      results.push(await reject(c, role, "navigation.access", undefined, [403]));
    }
    for (const role of ["sales", "dispatcher", "driver", "technician"])
      results.push(await reject(c, role, "finance.ledger", undefined, [403]));
    const driver = await c.ok("driver", "orders");
    assert.ok(driver.every((o) => o.driver_id === c.state.roles.driver.id && !o.confirmation_code && !o.delivery_code_hash));
    await c.check("ROD21-ACCESS", "Own-account orders only; independent labelled operational accounts cannot access finance; driver scope excludes handover secrets");
  });
  test("ROD21-PAYMENT: insufficient wallet and tampered pricing do not create an order, debit the wallet or consume gas", async () => {
    const before = { orders: await c.ok("customer", "orders"), wallet: await c.ok("customer", "wallet"), stock: (await c.ok("inventory", "inventory.workspace")).gas };
    const input = await gasInput(c, "unfunded-wallet-large", "wallet", 50);
    assert.ok(before.wallet.balanceKobo < input.pricing.totalKobo, "Controlled insufficient balance");
    results.push(await reject(c, "customer", "checkout", input, [409], /Insufficient wallet/));
    results.push(await reject(c, "customer", "checkout", { ...input, idempotencyKey: c.key("tampered-checkout"), pricing: { ...input.pricing, totalKobo: input.pricing.totalKobo - 1 } }, [409]));
    assert.deepEqual(await c.ok("customer", "orders"), before.orders);
    assert.deepEqual(await c.ok("customer", "wallet"), before.wallet);
    assert.deepEqual((await c.ok("inventory", "inventory.workspace")).gas, before.stock);
    await c.check("ROD21-PAYMENT", "Insufficient balance and quote tampering rejected transactionally; orders, wallet and gas summary unchanged");
  });
  test("ROD21-CANCEL: unpaid card checkout stays unpaid and customer cancellation releases reservation exactly once", async () => {
    const stock = c.state.orders["abandoned-card"]?.stockBefore ?? c.state.baseline.inventory.gas;
    const made = await makeGas(c, "abandoned-card", "card");
    const order = await snapshot(c, "abandoned-card");
    assert.equal(order.payment_status, "unpaid");
    await transition(c, "abandoned-card", "cancelled", "customer");
    const replay = await transition(c, "abandoned-card", "cancelled", "customer"); assert.ok(replay);
    assert.equal((await snapshot(c, "abandoned-card")).status, "cancelled");
    assert.deepEqual((await c.ok("inventory", "inventory.workspace")).gas, stock);
    await c.check("ROD21-CANCEL", `${made.reference}: abandoned unpaid card order cancelled by its owner; reservation restored; cancellation replay has no extra effect`);
  });
  test("ROD21-FUND: explicit synthetic purchase-credit receipt needs a different reauthenticated finance approver and posts once", async () => {
    await c.reauth("owner"); await c.reauth("finance");
    const request = await c.ok("owner", "credit.request", { branchId: "lagos", customerId: c.state.roles.customer.id, amountKobo: 5000000, receiptReference: label + "-SYNTHETIC-CREDIT", reason: note("Simulated test-only purchase credit; no actual cash receipt") });
    c.state.funding = request.id; await c.save();
    results.push(await reject(c, "owner", "credit.decide", { id: request.id, decision: "approved", reason: note("Independent-approval negative check") }, [403], /different finance approver/));
    const decision = { id: request.id, decision: "approved", reason: note("Independent finance review of explicitly simulated test credit") };
    await c.ok("finance", "credit.decide", decision); await c.ok("finance", "credit.decide", decision);
    const wallet = await c.ok("customer", "wallet"); assert.equal(wallet.balanceKobo, Number(c.state.baseline.wallet.balanceKobo)+5000000);
    await c.check("ROD21-FUND", "₦50,000 explicitly synthetic QA credit approved independently; self-approval denied and decision replay posted one credit");
    await writeFile(evidenceRoot + "/preexceptions.json", JSON.stringify({ results, fundingRequest: request.id, labelledOrders: c.state.orders, checks: c.state.checks }, (key, value) => key === "input" ? undefined : value, 2) + "\n");
  });
}
if (phase === "renew-safety") test("ROD21-QA-RENEWAL: explicitly approved two-hour synthetic qualifications and existing sandbox meter renew independently through product APIs", async () => {
  const c = await client();
  assert.equal(c.state.renewalApproval?.approved,true,"Current explicit approval required; no automatic renewal");
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
    if(!c.state.expiredMeterVerified){
      await c.reauth("inventory");
      const denied=await reject(c,"inventory","bulk.load.issue",{tripId:c.state.trip.id,meterId:meter.id,grams:6000,meterReadingGrams:1000000,orderIds:[c.state.orders["gas-wallet"].id],reason:note("Expired sandbox meter must block synthetic load before renewal"),operationKey:c.key("expired.meter.load")},[409],/current calibrated mass meter/);
      c.state.expiredMeterVerified=true;await c.save();await writeFile(evidenceRoot+"/expired-meter.json",JSON.stringify({meterId:meter.id,calibrationExpiresAt:meter.calibration_expires_at,denied},null,2)+"\n");
    }
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
  await c.check("ROD21-QA-RENEWAL", "Explicitly approved2h labelled QA-only qualifications independently verified; existing sandbox meter renewed; unchanged production controls and no actual safety certification");
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
if (phase === "gas-expiry") test("ROD21-EXPIRED: expired QA qualification rejects inspection without changing the paid synthetic gas order",async()=>{
 const c=await client();await makeGas(c,"gas-wallet","wallet",6);const o=await snapshot(c,"gas-wallet");const line=o.gas_lines[0];await c.reauth("finance");
 if(!c.state.gasCylinder){const made=await operation(c,"finance","gas.cylinder.intake","gas.cylinder.intake",{lineId:line.id,serial:label+"-CUSTOMER-6KG",sizeKg:6,testDue:"2027-02-21",reason:note("Synthetic customer cylinder intake before expiry negative test")});c.state.gasCylinder=made.id;await c.save();}
 const before={order:hash(await snapshot(c,"gas-wallet")),gas:hash((await c.ok("inventory","inventory.workspace")).gas),wallet:hash(await c.ok("customer","wallet"))};
 const denied=await reject(c,"finance","cylinder.inspect",{id:c.state.gasCylinder,passed:true,nextDue:"2027-02-21",notes:note("Expired qualification must block this synthetic inspection"),operationKey:c.key("expired.inspection")},[403],/current independently verified.*qualification/i);
 const after={order:hash(await snapshot(c,"gas-wallet")),gas:hash((await c.ok("inventory","inventory.workspace")).gas),wallet:hash(await c.ok("customer","wallet"))};assert.deepEqual(after,before);
 await writeFile(evidenceRoot+"/expired-qualification.json",JSON.stringify({reference:o.reference,denied,before,after},null,2)+"\n");await c.check("ROD21-EXPIRED","Hosted expired cylinder-inspection qualification rejected403 with no order, gas or wallet effects before approved renewal");
});
if (phase === "gas-prepare") test("ROD21-GAS-PREP: fresh wallet gas checkout, qualified cylinder inspection, sales preparation, invoice and independent dispatch/custody issuance use normal controls", async () => {
  const c = await client(); assert.ok(Date.parse(c.state.qaRenewal.expiresAt) > Date.now());
  await makeGas(c, "gas-wallet", "wallet", 6); let o = await snapshot(c, "gas-wallet");
  assert.equal(o.payment_status, "verified"); assert.equal(Number(o.total_kobo), 1580000);
  const line = o.gas_lines[0]; await c.reauth("finance");
  if (!c.state.gasCylinder) {
    const cid = await operation(c, "finance", "gas.cylinder.intake", "gas.cylinder.intake", { lineId: line.id, serial: label + "-CUSTOMER-6KG", sizeKg: 6, testDue: "2027-02-21", reason: note("Synthetic QA customer-cylinder intake; no real cylinder received") });
    c.state.gasCylinder = cid.id; await c.save();
  }
  await operation(c, "finance", "cylinder.inspect", "gas.cylinder.inspect", { id: c.state.gasCylinder, passed: true, nextDue: "2027-02-21", notes: note("Synthetic QA-only inspection under user-approved temporary qualification; not a physical safety certificate") });
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
  await c.check("ROD21-GAS-PREP", "Fresh6kg wallet order paid1580000kobo; registered/qualified inspected customer cylinder, sales preparation, independent dispatch/invoice/load; premature pickup rejected");
});
if (phase === "refund-approved") test("ROD21-REFUND: UI partial refund approval posts one wallet credit, rejects over-refund and preserves stock and immutable invoice with independently approved credit note", async () => {
  const c = await client(), o = await snapshot(c, "product-cod");
  const request = (await c.ok("finance", "credits")).find(r => r.order_id === o.id && r.status === "approved" && r.kind === "refund"); assert.ok(request);
  c.state.refundApproved = request.id; await c.save();
  const before = Number(c.state.walletBeforeRefund.balanceKobo);
  const gasCost = Number(c.state.orders["gas-wallet"].input.pricing.totalKobo);
  const wallet = await c.ok("customer", "wallet"); assert.equal(wallet.balanceKobo, before + 2600000);
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
  await c.check("ROD21-REFUND", "Actual customer and separate finance UI partial refund2600000kobo; one wallet posting, over-refund409, no stock return; immutable invoice plus independent credit note gives due0");
});
if (phase === "failed-prepare") test("ROD21-FAILED: failed wallet delivery blocks cancellation/retry until an independent exact manifest return and preserves reservations", async () => {
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
  await c.check("ROD21-FAILED", "Wrong pickup/return manifest, cancellation and reassignment with held custody, driver self-return rejected; independent full return recorded; failure history retained for safe retry");
});
if (phase === "retry-prepare") test("ROD21-RETRY: returned failed delivery reschedules and reassigns as a new attempt without another wallet debit or stock reservation", async () => {
  const c = await client(); let o = await snapshot(c,"failed-wallet"); assert.equal(o.status,"delivery_failed"); assert.equal(o.attempt.state,"returned");
  await operation(c,"sales","delivery.reschedule","failed.reschedule",{orderId:o.id,version:Number(o.tracking_version),date:o.delivery_date.slice(0,10),window:o.delivery_window,reason:note("Safe synthetic retry after independent manifest return")});
  o = await snapshot(c,"failed-wallet");
  await operation(c,"dispatcher","dispatch.assign","failed.assign2",{orderId:o.id,driverId:c.state.roles.driver.id,version:Number(o.tracking_version),reason:note("Independent second attempt after returned custody")});
  o=await snapshot(c,"failed-wallet");assert.equal(o.status,"assigned");assert.notEqual(o.attempt.id,c.state.failedWalletSnapshot.attemptId);
  assert.deepEqual(await c.ok("customer","wallet"),c.state.failedWalletSnapshot.wallet);assert.deepEqual(await c.ok("inventory","inventory"),c.state.failedWalletSnapshot.inventory);
  await writeFile(evidenceRoot+"/retry-prepared.json",JSON.stringify({reference:o.reference,attemptId:o.attempt.id,status:o.status,noNewWalletDebit:true,noNewStockReservation:true},null,2)+"\n");
});
if (phase === "gas-arrived-guards") test("ROD21-GAS-GUARDS: wrong-role, stale and incorrect simulated meter readings cannot dispense or complete without proof", async () => {
  const c=await client(),o=await snapshot(c,"gas-wallet");assert.equal(o.attempt.state,"arrived");
  const load=(await c.ok("owner","bulk.summary")).loads.find(r=>r.id===c.state.gasLoad.id);assert.equal(load.state,"active");
  const input={loadId:load.id,version:Number(load.version),orderId:o.id,meterReadingGrams:1006000,reason:note("Synthetic meter guard acceptance")};const denied=[];
  denied.push(await reject(c,"finance","bulk.dispense",{...input,operationKey:c.key("gas.wrong.dispenser")},[403]));
  denied.push(await reject(c,"driver","bulk.dispense",{...input,version:Number(load.version)-1,operationKey:c.key("gas.stale.meter")},[409]));
  denied.push(await reject(c,"driver","bulk.dispense",{...input,meterReadingGrams:1000001,operationKey:c.key("gas.wrong.mass")},[409]));
  const own=await snapshot(c,"gas-wallet","customer");
  await writeFile(".data/role-order-acceptance-20261121/gas-handover.json",JSON.stringify({orderId:o.id,code:own.confirmation_code}),{mode:0o600});
  denied.push(await reject(c,"driver","driver.complete",{orderId:o.id,version:Number(o.tracking_version),code:own.confirmation_code,handover:true,operationKey:c.key("gas.missing.fulfilment")},[409]));
  assert.equal((await c.ok("owner","bulk.summary")).loads.find(r=>r.id===load.id).dispensed_grams,load.dispensed_grams);
  await writeFile(evidenceRoot+"/gas-guards.json",JSON.stringify({reference:o.reference,rejected:denied,dispensedUnchanged:true},null,2)+"\n");
});
if (phase === "gas-finish") test("ROD21-GAS: restricted driver UI metered/proof/handover completes fresh wallet gas order once and independent zero-return custody reconciles", async () => {
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
 await c.check("ROD21-GAS","Freshwallet6kg completed through actual restricted driver UI custody/pickup/arrival/meter/proof/handover; one6000g stock debit and paid invoice; independent zero return reconciled; no real gas/device/travel claim");
});
if (phase === "wallet-cancel") test("ROD21-WALLET-CANCEL: customer cancellation before pickup releases gas and refunds wallet exactly once while invoice remains explicit adjustment required",async()=>{
 const c=await client();if(!c.state.walletCancelBefore){c.state.walletCancelBefore={wallet:await c.ok("customer","wallet"),gas:(await c.ok("inventory","inventory.workspace")).gas};await c.save();}
 await makeGas(c,"wallet-cancel","wallet",0.5);let o=await snapshot(c,"wallet-cancel");await c.reauth("finance");await c.ok("finance","invoice.issue",{orderId:o.id});
 await transition(c,"wallet-cancel","cancelled","customer");await transition(c,"wallet-cancel","cancelled","customer");o=await snapshot(c,"wallet-cancel");assert.equal(o.status,"cancelled");
 assert.equal((await c.ok("customer","wallet")).balanceKobo,c.state.walletCancelBefore.wallet.balanceKobo);assert.deepEqual((await c.ok("inventory","inventory.workspace")).gas,c.state.walletCancelBefore.gas);
 const invoice=(await c.ok("customer","invoice.order",{orderId:o.id})).invoice;assert.equal(invoice.status,"adjustment_required");assert.equal(invoice.amountDueKobo,null);
 const denied=await reject(c,"customer","invoice.request.create",{orderId:o.id,operationKey:c.key("cancel.payment.link")},[409]);
 await writeFile(evidenceRoot+"/wallet-cancel.json",JSON.stringify({reference:o.reference,status:o.status,balanceKobo:c.state.walletCancelBefore.wallet.balanceKobo,walletRestoredOnce:true,gasReservationReleasedOnce:true,invoiceStatus:invoice.status,newPaymentDenied:denied},null,2)+"\n");
});
if(phase==="payment-guards")test("ROD21-PROVIDER-GUARDS: forged verification, foreign or cancelled targets, client-selected amount and unsigned success webhook cannot create payment success",async()=>{
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
if(phase==="retry-guards")test("ROD21-RETRY-PROOF: a new delivery attempt requires its own consented proof and cannot complete from a stale version",async()=>{
 const c=await client();const o=await snapshot(c,"failed-wallet"),own=await snapshot(c,"failed-wallet","customer");assert.equal(o.attempt.state,"arrived");assert.equal((await c.ok("driver","delivery.photos?orderId="+o.id)).photos.length,0);const before=await c.ok("inventory","inventory");
 const input={orderId:o.id,version:Number(o.tracking_version),code:own.confirmation_code,handover:true};
 const noProof=await reject(c,"driver","driver.complete",{...input,operationKey:c.key("retry.no.proof")},[409],/proof/i);
 const stale=await reject(c,"driver","driver.complete",{...input,version:Number(o.tracking_version)-1,operationKey:c.key("retry.stale")},[409]);
 assert.equal((await snapshot(c,"failed-wallet")).tracking_version,o.tracking_version);assert.deepEqual(await c.ok("inventory","inventory"),before);
 await writeFile(".data/role-order-acceptance-20261121/retry-handover.json",JSON.stringify({orderId:o.id,code:own.confirmation_code}),{mode:0o600});await writeFile(evidenceRoot+"/retry-guards.json",JSON.stringify({reference:o.reference,attemptId:o.attempt.id,noProof,stale,noStockOrVersionChange:true},null,2)+"\n");
});
if(phase==="retry-finish")test("ROD21-RETRY-COMPLETE: second-attempt driver UI delivery consumes one reserved serial once with retained failure/return history and paid invoice",async()=>{
 const c=await client();const o=await snapshot(c,"failed-wallet");assert.equal(o.status,"delivered");assert.equal(o.payment_status,"verified");assert.notEqual(o.attempt.id,c.state.failedWalletSnapshot.attemptId);assert.equal(o.attempt.state,"delivered");
 const own=await snapshot(c,"failed-wallet","customer");const stock=await c.ok("inventory","inventory");const before=c.state.orders["failed-wallet"].stockBefore;const line=stock.find(r=>r.product_id==="cylinder-empty-6"),old=before.find(r=>r.product_id==="cylinder-empty-6");assert.equal(Number(line.quantity),Number(old.quantity)-1);assert.equal(Number(line.reserved),Number(old.reserved));
 const cylinder=(await c.ok("inventory","cylinders")).find(r=>r.id===c.state.serials.C);assert.equal(cylinder.customer_id,c.state.roles.customer.id);assert.equal(cylinder.status,"sold");
 const history=o.events.map(r=>r.note??"").join("\n");assert.match(history,/delivery_failed/);assert.match(history,/delivery.return/);assert.match(history,/reschedul/i);
 const invoice=(await c.ok("customer","invoice.order",{orderId:o.id})).invoice;assert.equal(invoice.status,"paid");assert.equal(invoice.amountDueKobo,0);
 const photos=(await c.ok("driver","delivery.photos?orderId="+o.id)).photos;assert.equal(photos.length,1);
 const wallet=await c.ok("customer","wallet");assert.equal(wallet.balanceKobo,c.state.failedWalletSnapshot.wallet.balanceKobo);
 const handover={orderId:o.id,version:Number(o.tracking_version),code:JSON.parse(await readFile(".data/role-order-acceptance-20261121/retry-handover.json","utf8")).code,handover:true,collectedKobo:0,operationKey:c.key("retry.delivered.replay.valid")};await c.save();await c.ok("owner","delivery.complete",handover);assert.deepEqual(await c.ok("inventory","inventory"),stock);assert.deepEqual(await c.ok("customer","wallet"),wallet);
 await writeFile(evidenceRoot+"/retry-completed.json",JSON.stringify({reference:o.reference,status:o.status,payment:o.payment_status,firstAttempt:c.state.failedWalletSnapshot.attemptId,secondAttempt:o.attempt.id,walletBalanceKobo:wallet.balanceKobo,stockBefore:{quantity:old.quantity,reserved:old.reserved},stockAfter:{quantity:line.quantity,reserved:line.reserved},serial:cylinder.serial,serialStatus:cylinder.status,photoCount:photos.length,invoiceStatus:invoice.status,amountDueKobo:invoice.amountDueKobo,historyPreserved:true,semanticReplayNoEffects:true},null,2)+"\n");
});
if(phase==="cancel-invoice-review")test("ROD21-CANCEL-INVOICE: independently void the refunded cancelled test invoice without changing its issued snapshot or wallet",async()=>{
 const c=await client(),o=await snapshot(c,"wallet-cancel");assert.equal(o.status,"cancelled");const before=(await c.ok("customer","invoice.order",{orderId:o.id})).invoice;const wallet=await c.ok("customer","wallet");
 if(!c.state.cancelInvoiceNote){await c.reauth("finance");const made=await operation(c,"finance","invoice.correction.propose","cancel.invoice.void",{orderId:o.id,kind:"void",amountKobo:Number(before.total_kobo),reason:note("Void cancelled synthetic invoice after full automatic wallet refund; keep original immutable source")});c.state.cancelInvoiceNote=made.noteId;await c.save();}
 await c.reauth("owner");await operation(c,"owner","invoice.correction.decide","cancel.invoice.void.approve",{orderId:o.id,noteId:c.state.cancelInvoiceNote,approve:true});
 const after=(await c.ok("customer","invoice.order",{orderId:o.id})).invoice;assert.equal(after.status,"voided");assert.equal(after.amountDueKobo,0);assert.deepEqual(after.snapshot,before.snapshot);assert.deepEqual(await c.ok("customer","wallet"),wallet);
 await writeFile(evidenceRoot+"/cancel-invoice-reviewed.json",JSON.stringify({reference:o.reference,invoice:after.invoice_number,status:after.status,dueKobo:after.amountDueKobo,originalIssuedSnapshotPreserved:true,walletUnchanged:true,independentFinanceAndOwnerReview:true},null,2)+"\n");
});

if(phase==="product-progress")test("ROD21-PRODUCT-VISIT: assigned driver acknowledges, checks manifest and arrives with labelled consented synthetic proof",async()=>{
 const c=await client();let o=await snapshot(c,"product-cod");assert.equal(o.status,"assigned");
 const early=await reject(c,"driver","delivery.pickup",{orderId:o.id,version:Number(o.tracking_version),manifest:o.manifest,reason:note("Unacknowledged pickup must fail"),operationKey:c.key("product.early.pickup")},[409]);
 await operation(c,"driver","dispatch.respond","product.ack",{orderId:o.id,version:Number(o.tracking_version),decision:"acknowledged",reason:note("Synthetic product assignment acknowledged")});o=await snapshot(c,"product-cod");
 await operation(c,"driver","delivery.pickup","product.pickup",{orderId:o.id,version:Number(o.tracking_version),manifest:o.manifest,reason:note("Simulated exact full serial manifest received")});await transition(c,"product-cod","out_for_delivery","driver");o=await snapshot(c,"product-cod");
 await operation(c,"driver","delivery.arrived","product.arrived",{orderId:o.id,version:Number(o.tracking_version),reason:note("Simulated arrival only; no actual travel or location claim")});o=await snapshot(c,"product-cod");assert.equal(o.attempt.state,"arrived");
 const photo=await uploadProof(c,"product-cod","product");await writeFile(evidenceRoot+"/product-visit.json",JSON.stringify({reference:o.reference,state:o.attempt.state,earlyPickup:early,proof:photo},null,2)+"\n");await c.check("ROD21-PRODUCT-VISIT","Canonical product acknowledgement, manifest pickup, departure, arrival and synthetic consented proof recorded; no physical travel");
});
async function uploadProof(c,name,image){
 const o=await snapshot(c,name);const bytes=await readFile(evidenceRoot+"/"+image+"-proof.png");
 const form=()=>{const f=new FormData();f.set("image",new File([bytes],image+"-proof.png",{type:"image/png"}));f.set("orderId",o.id);f.set("alt",label+" synthetic "+image+" QA proof; no real goods or delivery");f.set("photoConsent","on");return f;};
 const response=await fetch(c.state.origin+"/api/media",{method:"POST",headers:{origin:c.state.origin,"x-easygas-client":"native",authorization:"Bearer "+c.state.tokens.driver},body:form(),signal:AbortSignal.timeout(30000)});const data=await response.json();assert.equal(response.status,200,data.error);return{id:data.id,synthetic:true};
}

if(phase==="commercial")test("ROD21-COMMERCIAL: a business customer owns and cancels a fresh unpaid order while other customer access and insufficient wallet remain blocked",async()=>{
 const c=await client();const name="commercial-unpaid",before={wallet:await c.ok("commercial","wallet"),gas:(await c.ok("inventory","inventory.workspace")).gas};
 const input=await gasInput(c,name,"card",0.5);input.instructions=note("Commercial account isolated unpaid cancellation scenario");input.idempotencyKey=c.key("checkout:"+name);
 const walletDenied=await reject(c,"commercial","checkout",{...input,paymentMethod:"wallet",idempotencyKey:c.key("commercial.insufficient.wallet")},[409],/Insufficient wallet/);
 if(!c.state.orders[name]){await c.save();const made=await c.ok("commercial","checkout",input);c.state.orders[name]={id:made.id,reference:made.reference,input,actor:"commercial"};await c.save();}
 const o=await snapshot(c,name);assert.equal(o.customer_id,c.state.roles.commercial.id);assert.equal((await c.ok("commercial","orders?id="+o.id)).length,1);assert.deepEqual(await c.ok("customer","orders?id="+o.id),[]);
 const other=await reject(c,"customer","order.transition",{id:o.id,status:"cancelled",version:Number(o.tracking_version),note:note("Another customer cannot cancel commercial order"),operationKey:c.key("commercial.foreign.cancel")},[403]);
 await transition(c,name,"cancelled","commercial");await transition(c,name,"cancelled","commercial");assert.equal((await snapshot(c,name)).status,"cancelled");assert.deepEqual(await c.ok("commercial","wallet"),before.wallet);assert.deepEqual((await c.ok("inventory","inventory.workspace")).gas,before.gas);
 await writeFile(evidenceRoot+"/commercial.json",JSON.stringify({reference:o.reference,owner:c.state.roles.commercial.id,status:"cancelled",payment:"unpaid",walletDenied,other,commercialWalletUnchanged:true,gasReservationReleasedOnce:true},null,2)+"\n");await c.check("ROD21-COMMERCIAL","Commercial own checkout/read/cancel/replay passed; insufficient wallet and other-customer cancellation rejected; no payment or stock debit");
});
