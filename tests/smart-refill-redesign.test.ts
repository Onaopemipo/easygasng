import assert from "node:assert/strict";
import test from "node:test";
import { one } from "../apps/web/lib/db";
import { id } from "../apps/web/lib/auth";
import { fixture } from "./helpers/service-fixture";
import { forecast } from "../packages/business-rules/src/forecast";
import {
  loadCookingGasProfiles,
  refillProfileActivity,
  type RefillProfile,
} from "../packages/business-rules/src/cooking-gas-profiles";

test("SR-T55: activity uses dated saved reports and verified refill references only", () => {
  const profile: RefillProfile = {
    id: "profile",
    label: "Main kitchen",
    active: true,
    product_name: "12.5kg Refill",
    capacityKg: 12.5,
    created_at: "2026-11-01T00:00:00Z",
    feedback: [
      {
        id: "manual",
        state: "already_refilled",
        created_at: "2026-11-08T08:00:00Z",
      },
    ],
    history: [
      { orderId: "delivery-1", date: "2026-11-04T07:00:00Z", kg: 12.5 },
      { orderId: "delivery-2", date: "2026-11-07T07:00:00Z", kg: 12.5 },
    ],
    lastVerifiedRefill: { date: "2026-11-07T07:00:00Z", kg: 12.5 },
    typicalIntervalDays: 3,
    forecast: { available: false, reason: "Waiting for a verified refill." },
  };
  const entries = refillProfileActivity(profile);
  assert.deepEqual(
    entries.map(({ id }) => id),
    [
      "report:manual",
      "order:delivery-2",
      "order:delivery-1",
      "profile:profile",
    ],
  );
  assert.equal(entries[0].label, "Already refilled (self-report)");
  assert.equal(entries[1].label, "Verified refill · 12.5 kg");
  assert.equal(entries[1].orderId, "delivery-2");
  assert.equal(entries[0].orderId, undefined);
  assert.equal(profile.history[0].orderId, "delivery-1");
});

test("SR-T09: Smart Refill distinguishes an unavailable offer list from a confirmed empty list without requiring schedules", async () => {
  const actions: string[] = [];
  const data = await loadCookingGasProfiles(
    async (action) => {
      actions.push(action);
      if (action === "refill.profiles") return [];
      if (action === "catalogue") return { products: [] };
      throw Object.assign(new Error("Unavailable"), { status: 503 });
    },
    { includeRecurring: false },
  );
  assert.deepEqual(actions, [
    "refill.profiles",
    "catalogue",
    "rewards.smart-offers",
  ]);
  assert.equal(data.offers, null);
  assert.deepEqual(data.profiles, []);
  const empty = await loadCookingGasProfiles(
    async (action) => (action === "catalogue" ? { products: [] } : []),
    { includeRecurring: false },
  );
  assert.deepEqual(empty.offers, []);
  await assert.rejects(
    loadCookingGasProfiles(
      async (action) => {
        if (action === "refill.profiles") return [];
        throw Object.assign(new Error("Expired"), { status: 401 });
      },
      { includeRecurring: false },
    ),
    { status: 401 },
  );
});

test("SR-T32: refill writes validate the form, audit the owned profile and leave financial and stock records intact", async () => {
  const f = await fixture();
  try {
    const input = {
      productId: "refill-12",
      label: "Kitchen",
      householdSize: 2,
      cookingDays: 5,
    };
    for (const invalid of [
      { label: "" },
      { householdSize: 0 },
      { householdSize: 1001 },
      { cookingDays: 0 },
      { cookingDays: 8 },
      { customerId: "other" },
    ]) {
      await assert.rejects(
        f.call("customer", "refill.profile.create", { ...input, ...invalid }),
      );
    }
    const snapshot = () =>
      one(
        f.db,
        `SELECT
      (SELECT count(*) FROM orders) AS orders,
      (SELECT count(*) FROM wallet_entries) AS wallet,
      (SELECT count(*) FROM inventory_operations) AS operations,
      (SELECT sum(quantity) FROM inventory) AS quantity,
      (SELECT sum(reserved) FROM inventory) AS reserved`,
      );
    const before = await snapshot();
    const profile = await f.call("customer", "refill.profile.create", input);
    await f.call("customer", "refill.feedback", {
      profileId: profile.id,
      state: "empty",
      expectedFeedbackId: null,
    });
    const audit = await f.db.query(
      "SELECT action FROM audit_events WHERE target=$1 AND actor_id=$2 ORDER BY action",
      [profile.id, f.actors.customer.id],
    );
    assert.deepEqual(
      audit.rows.map((row) => row.action),
      ["refill.feedback_received", "refill.profile_created"],
    );
    assert.deepEqual(await snapshot(), before);
    await f.db.query(
      "UPDATE consumption_profiles SET active=false WHERE id=$1",
      [profile.id],
    );
    await assert.rejects(
      f.call("customer", "refill.feedback", {
        profileId: profile.id,
        state: "low",
      }),
      { status: 404 },
    );
  } finally {
    await f.db.close?.();
  }
});

test("SR-T40: impossible refill intervals stay unavailable and consistent verified history earns high confidence", () => {
  const record = (date: string) => ({
    date,
    kg: 12.5,
    verified: true,
    cylinderId: "kitchen",
  });
  const now = new Date("2026-04-20T00:00:00Z");
  assert.equal(
    forecast(["2026-04-01", "2026-04-02"].map(record), "kitchen", now)
      .available,
    false,
  );
  const result = forecast(
    [
      "2026-01-01",
      "2026-01-15",
      "2026-01-29",
      "2026-02-12",
      "2026-02-26",
      "2026-03-12",
    ].map(record),
    "kitchen",
    now,
  );
  assert.equal(result.available, true);
  assert.equal(result.confidence, "high");
  assert.equal(result.preliminary, false);
  assert.equal(result.basis, "verified purchase intervals");
});

test("SR-T46: verified multi-cylinder orders are excluded from profile history and the last verified date", async () => {
  const f = await fixture();
  try {
    await f.call("customer", "refill.profile.create", {
      productId: "refill-12",
      label: "Single cylinder",
      householdSize: 2,
      cookingDays: 7,
    });
    const delivered = "2026-11-01T10:00:00.000Z";
    for (const [reference, lines, date] of [
      ["single-cylinder", 1, delivered],
      ["ambiguous-cylinders", 2, "2026-11-04T10:00:00.000Z"],
    ] as const) {
      const orderId = id();
      await f.db.query(
        `INSERT INTO orders(id,reference,customer_id,branch_id,status,payment_status,payment_method,subtotal_kobo,delivery_kobo,total_kobo,address,delivery_date,delivery_window,idempotency_key,request_hash,delivery_code_hash,delivery_code_expires_at,delivered_at)
         VALUES($1,$2,$3,'lagos','delivered','verified','cash',1000,0,1000,'{}','2026-11-04','test',$1,'test','test',now(),$4)`,
        [orderId, reference, f.actors.customer.id, date],
      );
      for (let line = 0; line < lines; line++) {
        await f.db.query(
          "INSERT INTO order_gas_lines(id,order_id,capacity_grams,grams,unit_price_kobo,subtotal_kobo,pricing_version) VALUES($1,$2,12500,12500,80,1000,1)",
          [id(), orderId],
        );
      }
      await f.db.query(
        "INSERT INTO verified_payments(id,order_id,reference,amount_kobo,method,verified_by) VALUES($1,$2,$1,1000,'test',$3)",
        [id(), orderId, f.actors.owner.id],
      );
    }
    const [profile] = await f.call("customer", "refill.profiles");
    assert.equal(profile.history.length, 1);
    assert.equal(
      new Date(profile.lastVerifiedRefill.date).toISOString(),
      delivered,
    );
    assert.equal(profile.forecast.available, false);
  } finally {
    await f.db.close?.();
  }
});
