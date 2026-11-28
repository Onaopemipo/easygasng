// Dedicated client-demo acceptance. All positive business writes use a fresh labelled QA branch.
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { randomUUID, randomBytes, createHash } from "node:crypto";
const root = process.argv[2];
assert(root?.endsWith("/Easygas Smart Solution"));
const mode = process.argv[3] ?? "prepare",
  base = "https://easygas-client-demo.vercel.app",
  run = process.argv[4] ?? "web",
  dir = path.join(
    root,
    run === "ios" ? ".data/hosted-daily-flow-ios" : ".data/hosted-daily-flow",
  ),
  file = path.join(dir, "state.json");
assert(["web", "ios"].includes(run));
await fs.mkdir(dir, { recursive: true });
let s;
try {
  s = JSON.parse(await fs.readFile(file, "utf8"));
} catch (e) {
  if (e.code !== "ENOENT") throw e;
  s = {
    branch:
      (run === "ios" ? "qa-ios-" : "qa-daily-") + randomUUID().slice(0, 8),
    tag:
      run === "ios"
        ? "SANDBOX ONLY — iOS Daily flow QA"
        : "SANDBOX ONLY — Daily flow QA",
    actors: {},
    steps: [],
    keys: {},
  };
}
const save = () =>
  fs.writeFile(file, JSON.stringify(s, null, 2), { mode: 0o600 });
const hash = (x) =>
  createHash("sha256").update(JSON.stringify(x)).digest("hex");
const key = (n) => (s.keys[n] ??= randomUUID());
async function call(role, action, input) {
  const token = s.actors[role]?.token;
  const r = await fetch(base + "/api/" + action, {
    method: input === undefined ? "GET" : "POST",
    headers: {
      origin: base,
      "content-type": "application/json",
      "x-easygas-client": "native",
      ...(token ? { authorization: "Bearer " + token } : {}),
    },
    ...(input === undefined ? {} : { body: JSON.stringify(input) }),
    signal: AbortSignal.timeout(45000),
  });
  const d = await r.json();
  if (!r.ok)
    throw Object.assign(
      Error(
        action +
          ": " +
          r.status +
          " " +
          (d.code ?? "") +
          " " +
          (d.error ?? "request failed"),
      ),
      { status: r.status, data: d },
    );
  return d;
}
async function step(n, work) {
  if (s.steps.includes(n)) return;
  await save();
  await work();
  s.steps.push(n);
  await save();
  console.log("PASS " + n);
}
async function owner() {
  const line = (
    await fs.readFile(
      path.join(root, ".data/demo-staff-logins-qa-ac7e0495.md"),
      "utf8",
    )
  )
    .split("\n")
    .find((l) => l.includes("owner.qa-ac7e0495@"));
  assert(line);
  const cells = line.split("|").map((x) => x.trim().replaceAll("`", ""));
  const email = cells.find((x) => x.startsWith("owner.qa-ac7e0495@")),
    password = cells[cells.indexOf(email) + 1];
  if (s.actors.owner?.token) {
    try {
      await call("owner", "me");
      await call("owner", "reauth", { password });
      return;
    } catch (e) {
      if (e.status !== 401) throw e;
    }
  }
  const r = await call(null, "login", { identifier: email, password });
  s.actors.owner = { token: r.token };
  await save();
  await call("owner", "reauth", { password });
}
async function settings() {
  return call("owner", "settings?scope=" + s.branch);
}
async function setting(k, v) {
  const row = (await settings()).find((x) => x.key === k);
  assert(row, k);
  const q = await call("owner", "setting.propose", {
    key: k,
    scope: s.branch,
    version: row.version,
    value: v,
    reason: s.tag + " — synthetic test only; no real operation",
  });
  assert(
    ["active", "approved"].includes(q.status) ||
      q.ownerAutoApproved ||
      q.autoApproved ||
      q.id,
    JSON.stringify(q),
  );
  const now = (await settings()).find((x) => x.key === k);
  assert.deepEqual(now.value, v, k + " applied");
}
const shape = (o) => ({
  id: o.id,
  status: o.status,
  driver_id: o.driver_id,
  payment_status: o.payment_status,
  total_kobo: o.total_kobo,
  tracking_version: o.tracking_version,
  branch_id: o.branch_id,
});
async function preservation() {
  const orders = (await call("owner", "orders"))
    .filter((o) => o.branch_id !== s.branch)
    .map(shape)
    .sort((a, b) => a.id.localeCompare(b.id));
  const stock = (await call("owner", "gas.stock"))
    .filter((x) => x.branch_id !== s.branch)
    .sort((a, b) => a.branch_id.localeCompare(b.branch_id));
  const days = await call("owner", "daily.summary?branch=lagos");
  const settings = (await call("owner", "settings?scope=lagos"))
    .map((x) => ({ key: x.key, value: x.value, version: x.version }))
    .sort((a, b) => a.key.localeCompare(b.key));
  return { orders, stock, lagosDays: days.runs, lagosSettings: settings };
}
async function checkPreservation() {
  const after = await preservation();
  const found = new Map(after.orders.map((o) => [o.id, o]));
  const changes = [];
  for (const old of s.before.orders) {
    if (!found.has(old.id)) {
      const row = (await call("owner", "orders?id=" + old.id))[0];
      assert(row);
      found.set(old.id, shape(row));
    }
    const now = found.get(old.id);
    if (JSON.stringify(now) !== JSON.stringify(old)) {
      const audit = await call(
        "owner",
        "audit?view=paged&pageSize=100&q=" + old.id,
      );
      changes.push({
        before: old,
        after: now,
        audit: audit.rows.map((x) => ({ action: x.action, at: x.created_at })),
      });
    }
  }
  s.preservation = {
    originalOrdersChecked: s.before.orders.length,
    changedOrders: changes,
    stockDifferences: after.stock.filter(
      (x) =>
        hash(x) !==
        hash(s.before.stock.find((b) => b.branch_id === x.branch_id)),
    ),
    dayDifferences: after.lagosDays.filter(
      (x) => hash(x) !== hash(s.before.lagosDays.find((b) => b.id === x.id)),
    ),
    otherBranchStockHashesMatch: hash(after.stock) === hash(s.before.stock),
    lagosDayFiguresMatch: hash(after.lagosDays) === hash(s.before.lagosDays),
    lagosSettingsMatch:
      hash(after.lagosSettings) === hash(s.before.lagosSettings),
    scope:
      "Original latest100 orders, other-branch stock, Lagos daily records and settings; isolated QA excluded",
  };
  await save();
  console.log(JSON.stringify(s.preservation, null, 2));
}
await owner();
assert.deepEqual(await call(null, "status"), {
  status: "ready",
  scope: "demo",
});
if (mode === "prepare") {
  await step("baseline", async () => {
    s.before = await preservation();
  });
  await step("branch", async () => {
    await call("owner", "branch.create", {
      id: s.branch,
      name: s.tag + " " + s.branch,
    });
  });
  await step("selling-settings", async () => {
    await setting("delivery.enabled", true);
    await setting("wallet.enabled", true);
    await setting("payment.cod", false);
  });
  await step("qa-location", async () => {
    s.locationConfig = {
      name: s.tag,
      city: "Lagos",
      state: "Lagos",
      country: "Nigeria",
      branchId: s.branch,
      active: true,
      visible: true,
      archived: false,
      displayOrder: 9999,
      requiresAddressConfirmation: false,
      coverage:
        "Synthetic acceptance fixture only. Not a real delivery destination.",
      mapBounds: { south: 6.3, north: 6.7, west: 3.2, east: 3.8 },
      description: "Temporary synthetic end-to-end acceptance location",
    };
    const l = await call("owner", "delivery.location.create", {
      config: s.locationConfig,
      reason: s.tag + " temporary synthetic area",
    });
    s.locationId = l.id;
  });
  for (const [role, name] of [
    ["previous", "Previous driver"],
    ["today", "Today driver"],
    ["customer", "Refill customer"],
  ]) {
    await step("register-" + role, async () => {
      const a = {
        email: role + "." + s.branch + "@qa.easygas.invalid",
        password: "QA!" + randomBytes(22).toString("base64url"),
      };
      s.actors[role] = a;
      await save();
      const reg = await call(null, "register", {
        name: s.tag + " " + name,
        email: a.email,
        password: a.password,
      });
      a.token = reg.token;
      const me = await call(role, "me");
      a.id = me.user.id;
    });
    await step("scope-" + role, async () => {
      await call("owner", "staff.access.request", {
        userId: s.actors[role].id,
        role: role === "customer" ? "customer" : "driver",
        branchId: s.branch,
        reason: s.tag + " isolated synthetic test identity",
      });
      const a = s.actors[role];
      const r = await call(
        null,
        role === "customer" ? "login" : "driver.login",
        { identifier: a.email, password: a.password },
      );
      a.token = r.token;
      const me = await call(role, "me");
      assert.equal(me.user.branchId ?? me.user.branch_id, s.branch);
    });
  }
  await step("stock", async () => {
    await call("owner", "gas.stock.receive", {
      branchId: s.branch,
      grams: 100000,
      reference: "SYNTHETIC-" + s.branch,
      reason: s.tag + " synthetic 100 kg stock; not a physical measurement",
    });
  });
  await step("wallet", async () => {
    const q = await call("owner", "credit.request", {
      branchId: s.branch,
      customerId: s.actors.customer.id,
      amountKobo: 3000000,
      receiptReference: "SYNTHETIC-" + s.branch,
      reason: s.tag + " synthetic credit only; no real money or transfer",
    });
    s.creditId = q.id;
    await call("owner", "credit.decide", {
      id: q.id,
      decision: "approved",
      reason: s.tag + " synthetic demo funding; no actual cash received",
    });
  });
  await step("vehicles", async () => {
    for (const role of ["previous", "today"]) {
      const v = await call("owner", "fleet.vehicle.create", {
        branchId: s.branch,
        label: s.tag + " " + role,
        capacityGrams: 50000,
        lpgSuitable: true,
        operationKey: key("vehicle-" + role),
      });
      s.actors[role].vehicleId = v.id;
      await save();
    }
  });
  await step("previous-trip", async () => {
    await call("owner", "dispatch.vehicle.assign", {
      driverId: s.actors.previous.id,
      vehicleId: s.actors.previous.vehicleId,
      startOdometer: 10,
      makeAvailable: true,
      operationKey: key("previous-trip"),
    });
  });
  await step("paid-order", async () => {
    const lines = [{ capacityKg: 12.5, kg: 12.5 }],
      q = await call("customer", "gas.quote", {
        branchId: s.branch,
        locationId: s.locationId,
        lines,
      });
    const o = await call("customer", "checkout", {
      items: [],
      gasLines: lines,
      pricing: {
        priceVersion: q.priceVersion,
        feeVersion: q.feeVersion,
        policyVersion: q.policyVersion,
        totalKobo: q.subtotalKobo + q.deliveryKobo,
      },
      address: {
        name: s.tag + " customer",
        phone: "08012345678",
        street: "12 Synthetic QA Street",
        zone: s.tag,
        locationId: s.locationId,
      },
      date: new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Lagos",
      }).format(new Date()),
      window: "14:00–18:00",
      paymentMethod: "wallet",
      idempotencyKey: key("checkout"),
    });
    s.orderId = o.id;
    s.reference = o.reference;
    assert.equal(o.payment_status, "verified");
  });
  await step("previous-assignment", async () => {
    for (const status of ["accepted", "preparing", "assigned"]) {
      const o = (await call("owner", "orders?id=" + s.orderId))[0];
      if (o.status === status) continue;
      await call("owner", "order.transition", {
        id: o.id,
        version: o.tracking_version,
        status,
        ...(status === "assigned" ? { driverId: s.actors.previous.id } : {}),
        operationKey: key("status-" + status),
      });
    }
  });
  await step("today-run", async () => {
    const r = await call("owner", "daily.start", {
      driverId: s.actors.today.id,
      vehicleId: s.actors.today.vehicleId,
      openingKg: 25,
      startOdometer: 10,
      scaleReference: s.tag + " synthetic weights only",
      operationKey: key("today-run"),
    });
    s.runId = r.id;
  });
  const o = (await call("owner", "orders?id=" + s.orderId))[0];
  assert.equal(o.driver_id, s.actors.previous.id);
  assert.equal(o.daily_run, null);
  await save();
  console.log("READY " + s.reference + " in " + s.branch);
} else if (mode === "reassign") {
  await step("reassign-today", async () => {
    const order = (await call("owner", "orders?id=" + s.orderId))[0];
    const day = (
      await call("owner", "daily.summary?branch=" + s.branch)
    ).runs.find((x) => x.id === s.runId);
    await call("owner", "dispatch.assignToday", {
      orderId: order.id,
      version: order.tracking_version,
      runId: day.id,
      operationKey: key("reassign-today"),
    });
  });
  const o = (await call("owner", "orders?id=" + s.orderId))[0];
  assert.equal(o.driver_id, s.actors.today.id);
  assert.equal(Number(o.daily_run.grams), 12500);
  console.log(
    "PASS reassigned to today's driver and automatically reserved 12500 g",
  );
} else if (mode === "secondary-assignment") {
  await step("secondary-wallet", async () => {
    const q = await call("owner", "credit.request", {
      branchId: s.branch,
      customerId: s.actors.customer.id,
      amountKobo: 1000000,
      receiptReference: "SYNTHETIC-NAV-" + s.branch,
      reason: s.tag + " synthetic navigation retest funding",
    });
    await call("owner", "credit.decide", {
      id: q.id,
      decision: "approved",
      reason: s.tag + " synthetic navigation retest; no money received",
    });
  });
  await step("secondary-order", async () => {
    const lines = [{ capacityKg: 6, kg: 3 }],
      q = await call("customer", "gas.quote", {
        branchId: s.branch,
        locationId: s.locationId,
        lines,
      });
    const o = await call("customer", "checkout", {
      items: [],
      gasLines: lines,
      pricing: {
        priceVersion: q.priceVersion,
        feeVersion: q.feeVersion,
        policyVersion: q.policyVersion,
        totalKobo: q.subtotalKobo + q.deliveryKobo,
      },
      address: {
        name: s.tag + " navigation retest",
        phone: "08012345678",
        street: "12 Synthetic QA Street",
        zone: s.tag,
        locationId: s.locationId,
      },
      date: new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Lagos",
      }).format(new Date()),
      window: "14:00–18:00",
      paymentMethod: "wallet",
      idempotencyKey: key("secondary-checkout"),
    });
    s.secondaryId = o.id;
    s.secondaryReference = o.reference;
  });
  await step("secondary-assign", async () => {
    for (const status of ["accepted", "preparing", "assigned"]) {
      const o = (await call("owner", "orders?id=" + s.secondaryId))[0];
      if (o.status === status) continue;
      await call("owner", "order.transition", {
        id: o.id,
        version: o.tracking_version,
        status,
        ...(status === "assigned" ? { driverId: s.actors.today.id } : {}),
        operationKey: key("secondary-" + status),
      });
    }
  });
  console.log("READY secondary navigation retest " + s.secondaryReference);
} else if (mode === "cancel-secondary") {
  await step("retire-secondary-assignment", async () => {
    const o = (await call("owner", "orders?id=" + s.secondaryId))[0];
    if (o.status === "assigned")
      await call("owner", "order.transition", {
        id: o.id,
        version: o.tracking_version,
        status: "delivery_failed",
        failureReason: "other",
        note:
          s.tag +
          " synthetic navigation-only test completed; no delivery attempted or gas supplied",
        operationKey: key("retire-secondary"),
      });
  });
  await step("cancel-secondary", async () => {
    const o = (await call("owner", "orders?id=" + s.secondaryId))[0];
    await call("owner", "order.transition", {
      id: o.id,
      version: o.tracking_version,
      status: "cancelled",
      note: s.tag + " navigation retest complete; no gas supplied",
      operationKey: key("cancel-secondary"),
    });
  });
} else if (mode === "native-check") {
  const snapshot = await call("today", "driver.snapshot");
  s.nativeSnapshot = {
    galleryApproved: snapshot.galleryApproved,
    keys: Object.keys(snapshot),
  };
  await save();
  console.log(JSON.stringify(s.nativeSnapshot));
} else if (mode === "checkpoint") {
  const o = (await call("owner", "orders?id=" + s.orderId))[0],
    day = (await call("owner", "daily.summary?branch=" + s.branch)).runs.find(
      (x) => x.id === s.runId,
    );
  s.current = {
    order: shape(o),
    daily: o.daily_run,
    attempt: o.attempt,
    run: day,
  };
  await save();
  console.log(
    JSON.stringify({
      reference: s.reference,
      status: o.status,
      driverMatchesToday: o.driver_id === s.actors.today.id,
      dailyReserved: !!o.daily_run,
      suppliedGrams: o.daily_run?.supplied_grams,
      committedGrams: day?.committed_grams,
      runState: day?.state,
    }),
  );
} else if (mode === "probe-before-refill" || mode === "probe-before-photo") {
  const o = (await call("owner", "orders?id=" + s.orderId))[0],
    day = (await call("owner", "daily.summary?branch=" + s.branch)).runs.find(
      (x) => x.id === s.runId,
    );
  s.probes ??= [];
  const deny = async (name, role, action, input, expected) => {
    try {
      await call(role, action, input);
      throw Error("Unsafe success: " + name);
    } catch (e) {
      assert(expected.includes(e.status), name + ": " + e.message);
      s.probes.push({
        name,
        status: e.status,
        code: e.data?.code,
        error: e.data?.error,
      });
      await save();
      console.log("PASS " + name + " denied " + e.status);
    }
  };
  await deny(
    mode + " completion",
    "today",
    "driver.complete",
    {
      orderId: o.id,
      version: o.tracking_version,
      handover: true,
      operationKey: randomUUID(),
    },
    [409],
  );
  if (mode === "probe-before-refill")
    await deny(
      "incorrect gas quantity",
      "today",
      "daily.refill.record",
      {
        orderId: o.id,
        version: o.tracking_version,
        readings: [{ beforeKg: 8, afterKg: 9 }],
        operationKey: randomUUID(),
      },
      [409],
    );
  if (mode === "probe-before-photo") {
    const form = new FormData();
    form.append(
      "image",
      new Blob([await fs.readFile(path.join(dir, "proof.png"))], {
        type: "image/png",
      }),
      "synthetic-proof.png",
    );
    form.append("orderId", o.id);
    form.append("alt", "SYNTHETIC demo QA proof, no real delivery");
    const r = await fetch(base + "/api/media", {
      method: "POST",
      headers: {
        origin: base,
        authorization: "Bearer " + s.actors.today.token,
      },
      body: form,
      signal: AbortSignal.timeout(45000),
    });
    const b = await r.json();
    assert.equal(r.status, 400);
    assert.match(b.error, /consent/i);
    s.probes.push({
      name: "photo without consent",
      status: r.status,
      error: b.error,
    });
    await save();
    console.log("PASS photo consent gate denied400");
  }
  await deny(
    "previous driver proof access",
    "previous",
    "delivery.photos?orderId=" + o.id,
    undefined,
    [404],
  );
  const after = (await call("owner", "orders?id=" + o.id))[0],
    afterDay = (
      await call("owner", "daily.summary?branch=" + s.branch)
    ).runs.find((x) => x.id === s.runId);
  assert.equal(after.tracking_version, o.tracking_version);
  assert.equal(after.status, o.status);
  assert.deepEqual(after.daily_run, o.daily_run);
  assert.deepEqual(afterDay, day);
  s.probes.push({ name: mode + " no mutation", status: "PASS" });
  await save();
} else if (mode === "verify-and-close") {
  const o = (await call("owner", "orders?id=" + s.orderId))[0],
    day = (await call("owner", "daily.summary?branch=" + s.branch)).runs.find(
      (x) => x.id === s.runId,
    );
  assert.equal(o.status, "delivered");
  assert.equal(o.driver_id, s.actors.today.id);
  assert.equal(o.payment_status, "verified");
  assert.equal(o.attempt.state, "delivered");
  assert.equal(o.daily_run.allocation_state, "fulfilled");
  assert.equal(Number(o.daily_run.supplied_grams), 12500);
  assert.equal(o.daily_run.photo_ready, true);
  assert.equal(Number(day.opening_grams), 25000);
  assert.equal(Number(day.supplied_grams), 12500);
  assert.equal(Number(day.committed_grams), 0);
  const photos = await call(
    "today",
    "delivery.photos?orderId=" + o.id + "&attemptId=" + o.attempt.id,
  );
  assert.equal(photos.photos.length, 1);
  const photo = photos.photos[0];
  assert(new Date(photo.captured_at) >= new Date(o.daily_run.supplied_at));
  const history = await call("today", "driver.history?outcome=delivered");
  assert(history.rows.some((r) => r.order_id === o.id && r.has_proof));
  const customer = (await call("customer", "orders?id=" + o.id))[0];
  assert.equal(customer.status, "delivered");
  const stock = (await call("owner", "gas.stock")).find(
    (x) => x.branch_id === s.branch,
  );
  assert.equal(Number(stock.grams), 87500);
  assert.equal(Number(stock.reserved_grams), 12500);
  s.proofAccess = [];
  for (const [role, expected] of [
    ["owner", 200],
    ["today", 200],
    ["customer", 200],
    ["previous", 404],
    [null, 401],
  ]) {
    const r = await fetch(base + "/api/media/" + photo.id, {
      headers: {
        ...(role ? { authorization: "Bearer " + s.actors[role].token } : {}),
      },
      signal: AbortSignal.timeout(45000),
    });
    await r.arrayBuffer();
    assert.equal(r.status, expected);
    if (expected === 200) {
      assert.match(r.headers.get("content-type"), /^image\//);
      assert.equal(r.headers.get("cache-control"), "private, no-store");
    }
    s.proofAccess.push({
      role: role ?? "anonymous",
      status: r.status,
      cacheControl: r.headers.get("cache-control"),
    });
    await save();
  }
  const audits = await call("owner", "audit?view=paged&pageSize=100&q=" + o.id);
  const actions = audits.rows.map((x) => x.action);
  for (const a of [
    "dispatch.assignToday",
    "daily.order_reserved",
    "daily.refill.record",
    "delivery.completed",
  ])
    assert.equal(actions.filter((x) => x === a).length, 1, a + " once");
  try {
    await call("today", "driver.complete", {
      orderId: o.id,
      version: o.tracking_version,
      handover: true,
      operationKey: key("duplicate-completion"),
    });
    throw Error("Expected already-completed denial");
  } catch (e) {
    assert.equal(e.status, 409);
    s.probes.push({
      name: "duplicate completion with new identity",
      status: e.status,
      error: e.data?.error,
    });
  }
  const same = (await call("owner", "gas.stock")).find(
    (x) => x.branch_id === s.branch,
  );
  assert.deepEqual(same, stock);
  s.verified = {
    reference: s.reference,
    orderId: o.id,
    branch: s.branch,
    status: o.status,
    payment: o.payment_status,
    attempt: o.attempt,
    daily: o.daily_run,
    run: day,
    stock,
    photo: {
      id: photo.id,
      capturedAt: photo.captured_at,
      description: photo.alt,
    },
    driverHistory: history.rows.filter((x) => x.order_id === o.id),
    customerStatus: customer.status,
    events: o.events.map((x) => ({ status: x.status, at: x.created_at })),
    auditActions: actions,
    duplicateCompletionStockUnchanged: true,
  };
  await save();
  console.log(
    "PASS full hosted order/refill/photo/audit/privacy/stock verification",
  );
  await step("close-test-day", async () => {
    s.closeInput ??= {
      runId: day.id,
      version: Number(day.version),
      kg: 12.5,
      endOdometer: 10,
      carryForward: false,
      reason: s.tag + " synthetic closing weight only",
      operationKey: key("close-test-day"),
    };
    await save();
    await call("owner", "daily.close", s.closeInput);
  });
  await step("end-previous-trip", async () => {
    const fleet = await call("owner", "fleet.summary");
    const t = fleet.trips.find(
      (x) => x.driver_id === s.actors.previous.id && !x.ended_at,
    );
    if (t)
      await call("previous", "trip.end", {
        tripId: t.id,
        endOdometer: 10,
        operationKey: key("end-previous-trip"),
      });
  });
  await step("hide-test-area", async () => {
    await setting("location." + s.locationId, {
      ...s.locationConfig,
      active: false,
      visible: false,
    });
    await setting("delivery.enabled", false);
    await setting("wallet.enabled", false);
  });
  const closed = (
    await call("owner", "daily.summary?branch=" + s.branch)
  ).runs.find((x) => x.id === s.runId);
  assert.equal(closed.state, "closed");
  assert.equal(Number(closed.closing_grams), 12500);
  assert.equal(Number(closed.variance_grams), 0);
  s.closedDay = closed;
  await save();
  await checkPreservation();
} else if (mode === "preservation-check") {
  await checkPreservation();
} else if (mode === "cleanup") {
  await step("suspend-test-drivers", async () => {
    for (const role of ["previous", "today"])
      await call("owner", "staff.suspend", {
        userId: s.actors[role].id,
        reason: s.tag + " completed test; retire generated driver access",
        expectedRole: "driver",
      });
  });
  s.cleanup = {
    testDriverAccessSuspended: true,
    testAreaHidden: true,
    testDayClosed: true,
    syntheticHistoryRetained: true,
    knownApiSessionsRevoked: [],
  };
  for (const role of ["customer", "previous", "today"]) {
    try {
      await call(role, "logout", {});
      s.cleanup.knownApiSessionsRevoked.push(role);
    } catch (e) {
      assert.equal(e.status, 401);
      s.cleanup.knownApiSessionsRevoked.push(role + " already revoked");
    }
  }
  await call("owner", "logout", {});
  s.cleanup.knownApiSessionsRevoked.push("owner current verifier session");
  await save();
  console.log(
    "PASS test drivers suspended and known test API sessions signed out",
  );
} else throw Error("Unsupported mode");
