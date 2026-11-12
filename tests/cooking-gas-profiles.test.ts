import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { dispatch } from "../apps/web/lib/service";
import { fixture } from "./helpers/service-fixture";
import {
  countRecurringRefills,
  lagosRefillDate,
  loadCookingGasProfiles,
  supplyOptions,
} from "../packages/business-rules/src/cooking-gas-profiles";

let f: Awaited<ReturnType<typeof fixture>>;
let profileId: string;
before(async () => {
  f = await fixture();
});
after(async () => {
  await f?.db.close?.();
});

test("CGP-T08: recurring count intersects active plans and active authorisations", () => {
  assert.equal(
    countRecurringRefills(
      [
        { id: "active", status: "active" },
        { id: "paused", status: "paused" },
        { id: "manual", status: "active" },
      ],
      [
        { schedule_id: "active", active: true },
        { schedule_id: "active", active: true },
        { schedule_id: "paused", active: true },
        { schedule_id: "manual", active: false },
      ],
    ),
    1,
  );
  assert.equal(
    lagosRefillDate("2026-11-11T23:30:00Z"),
    lagosRefillDate("2026-11-12T01:00:00Z"),
  );
});

test("CGP-T06: missing optional sources stay unavailable and expired sessions fail closed", async () => {
  const results = await loadCookingGasProfiles(async (action) => {
    if (action === "refill.profiles") return [];
    if (action === "catalogue")
      return {
        products: [
          { id: "refill-6", category: "Gas refills" },
          { id: "hose", category: "Accessories" },
        ],
      };
    if (action === "rewards.smart-offers") return [];
    throw new Error("Unavailable");
  });
  assert.equal(results.recurringCount, null);
  assert.deepEqual(results.offers, []);
  assert.deepEqual(
    results.products?.map((p) => p.id),
    ["refill-6"],
  );
  await assert.rejects(
    loadCookingGasProfiles(async (action) => {
      if (action === "refill.profiles") return [];
      throw Object.assign(new Error("Expired"), { status: 401 });
    }),
    { status: 401 },
  );
});

test("CGP-T37: repeat profile creation cannot duplicate a refill size", async () => {
  const input = {
    label: "Kitchen refill",
    productId: "refill-12",
    householdSize: 2,
    cookingDays: 5,
  };
  const attempts = await Promise.allSettled([
    f.call("customer", "refill.profile.create", input),
    f.call("customer", "refill.profile.create", input),
  ]);
  const created = attempts.find((attempt) => attempt.status === "fulfilled");
  assert.ok(created);
  profileId = created.value.id;
  assert.equal(
    attempts.filter((attempt) => attempt.status === "fulfilled").length,
    1,
  );
  assert.ok(
    attempts.some(
      (attempt) =>
        attempt.status === "rejected" && attempt.reason.status === 409,
    ),
  );
  const [profile] = await f.call("customer", "refill.profiles");
  assert.equal(profile.id, profileId);
  assert.equal(profile.capacityKg, 12.5);
  assert.equal(profile.forecast.available, false);
  assert.deepEqual(profile.history, []);
  await assert.rejects(
    f.call("customer", "refill.profile.create", {
      ...input,
      productId: "hose",
    }),
    { status: 400 },
  );
});

test("CGP-T27: a stale supply report cannot overwrite a confirmed report or append duplicates", async () => {
  assert.equal(supplyOptions.length, 5);
  const first = await f.call("customer", "refill.feedback", {
    profileId,
    state: "low",
    expectedFeedbackId: null,
  });
  const [profile] = await f.call("customer", "refill.profiles");
  assert.equal(profile.feedback.length, 1);
  assert.equal(profile.feedback[0].id, first.feedback.id);
  assert.equal(profile.feedback[0].state, "low");
  assert.ok(first.feedback.created_at);
  await assert.rejects(
    f.call("customer", "refill.feedback", {
      profileId,
      state: "empty",
      expectedFeedbackId: null,
    }),
    { status: 409 },
  );
  await assert.rejects(
    f.call("customer", "refill.feedback", {
      profileId,
      state: "empty",
      expectedFeedbackId: first.feedback.id,
    }),
    { status: 429 },
  );
  assert.equal(
    (await f.call("customer", "refill.profiles"))[0].feedback.length,
    1,
  );
});

test("CGP-T31: cross-customer, staff and expired sessions cannot read or mutate private profiles", async () => {
  assert.deepEqual(await f.call("commercial", "refill.profiles"), []);
  await assert.rejects(
    f.call("commercial", "refill.feedback", { profileId, state: "empty" }),
    { status: 404 },
  );
  for (const role of ["owner", "administrator", "technician"]) {
    await assert.rejects(f.call(role, "refill.profiles"), { status: 403 });
    await assert.rejects(
      f.call(role, "refill.feedback", { profileId, state: "empty" }),
      { status: 403 },
    );
  }
  await assert.rejects(dispatch("refill.profiles", null, {}, f.db), {
    status: 401,
  });
});
