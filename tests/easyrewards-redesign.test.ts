import assert from "node:assert/strict";
import test from "node:test";
import { dispatch } from "../apps/web/lib/service";
import { one } from "../apps/web/lib/db";
import { processRewards } from "../apps/web/lib/rewards";
import { rewardsFixture } from "./helpers/rewards-fixture";
import {
  canSelectReward,
  formatRewardCount,
  rewardCapabilities,
  rewardDelta,
  type RewardsSummary,
} from "../packages/business-rules/src/rewards-overview";

test("ERD-T10: missing values stay unavailable and restricted points never enable an offer", () => {
  assert.equal(formatRewardCount(null), "Unavailable");
  assert.equal(formatRewardCount(undefined), "Unavailable");
  assert.equal(formatRewardCount(0), "0");
  assert.equal(rewardDelta(8), "+8 points");
  assert.equal(rewardDelta("-4"), "-4 points");
  const summary: RewardsSummary = {
    customerId: "owned",
    availablePoints: 18,
    pendingAwards: 3,
    restricted: false,
    earningEnabled: false,
    redemptionEnabled: true,
    referralEnabled: true,
    policy: {
      version: 1,
      referralEnabled: true,
      minimumPoints: 10,
      maximumDiscountBps: 1000,
      spendPerPointKobo: 1050,
      eligibleCategories: ["Gas"],
    },
    catalogue: [],
    entries: [],
    historyLimit: 200,
  };
  assert.equal(canSelectReward(summary, 10), true);
  assert.equal(canSelectReward(summary, 20), false);
  assert.equal(canSelectReward({ ...summary, restricted: true }, 10), false);
  assert.equal(
    canSelectReward({ ...summary, availablePoints: undefined }, 10),
    false,
  );
  assert.deepEqual(rewardCapabilities(summary), {
    earning: false,
    redemption: true,
    referral: true,
  });
  assert.equal(
    rewardCapabilities({ ...summary, referralEnabled: false }).referral,
    false,
  );
});

test("ERD-T46: existing summary caps history and protects account ownership, role and session", async () => {
  const f = await rewardsFixture();
  try {
    await f.db.query(
      "INSERT INTO reward_entries(id,customer_id,points,reference,created_at) SELECT 'reward-test-' || n, $1, 1, 'reward-test-' || n, now() - n * interval '1 day' FROM generate_series(1,205) n",
      [f.actors.customer.id],
    );
    const s = await f.call("customer", "rewards.summary");
    assert.equal(s.availablePoints, 205);
    assert.equal(s.historyLimit, 200);
    assert.equal(s.entries.length, 200);
    assert.equal(s.entries.at(-1).id, "reward-test-200");
    assert.equal(
      (await f.call("commercial", "rewards.summary")).entries.length,
      0,
    );
    await assert.rejects(
      f.call("commercial", "rewards.summary", {
        customerId: f.actors.customer.id,
      }),
    );
    await assert.rejects(dispatch("rewards.summary", null, {}, f.db), {
      status: 401,
    });
    await f.db.query("UPDATE users SET role='manager' WHERE id=$1", [
      f.actors.customer.id,
    ]);
    await assert.rejects(f.call("customer", "rewards.summary"), {
      status: 403,
    });
  } finally {
    await f.db.close?.();
  }
});

test("ERD-T18: referral summary reflects approved referral policy and issuance independently of retail earning", async () => {
  const f = await rewardsFixture();
  const original = process.env.EASYGAS_REWARDS_ISSUANCE_ENABLED;
  try {
    await f.approve({
      ...f.policy,
      earningEnabled: false,
      referralEnabled: true,
      referralPoints: 5,
    });
    process.env.EASYGAS_REWARDS_ISSUANCE_ENABLED = "false";
    assert.equal(
      (await f.call("customer", "rewards.summary")).referralEnabled,
      false,
    );
    process.env.EASYGAS_REWARDS_ISSUANCE_ENABLED = "true";
    const s = await f.call("customer", "rewards.summary");
    assert.equal(s.earningEnabled, false);
    assert.equal(s.referralEnabled, true);
    assert.equal((await f.call("customer", "rewards.referral")).enabled, true);
    await f.db.query("UPDATE branches SET active=false WHERE id=$1", ["lagos"]);
    assert.equal(
      (await f.call("customer", "rewards.summary")).referralEnabled,
      false,
    );
    await assert.rejects(f.call("customer", "rewards.referral"), {
      status: 409,
    });
  } finally {
    if (original === undefined)
      delete process.env.EASYGAS_REWARDS_ISSUANCE_ENABLED;
    else process.env.EASYGAS_REWARDS_ISSUANCE_ENABLED = original;
    await f.db.close?.();
  }
});

test("ERD-T11: pending award count stays separate from posted points and the posted order reference is owned", async () => {
  const f = await rewardsFixture();
  const original = process.env.EASYGAS_REWARDS_ISSUANCE_ENABLED;
  try {
    process.env.EASYGAS_REWARDS_ISSUANCE_ENABLED = "true";
    await f.approve();
    const order = await f.fulfilled();
    const collection = await one(
      f.db,
      "SELECT id FROM cash_collections WHERE order_id=$1",
      [order.id],
    );
    await f.call("finance", "cash.reconcile", { id: collection!.id });
    const pending = await f.call("customer", "rewards.summary");
    assert.equal(pending.pendingAwards, 1);
    assert.equal(pending.availablePoints, 0);
    assert.deepEqual(pending.entries, []);
    assert.equal(
      (await f.call("commercial", "rewards.summary")).pendingAwards,
      0,
    );

    await f.db.transaction(processRewards);
    const posted = await f.call("customer", "rewards.summary");
    assert.equal(posted.pendingAwards, 0);
    assert.equal(posted.availablePoints, 35);
    assert.equal(posted.entries[0].order_id, order.id);
    assert.ok(posted.entries[0].order_reference);
  } finally {
    if (original === undefined)
      delete process.env.EASYGAS_REWARDS_ISSUANCE_ENABLED;
    else process.env.EASYGAS_REWARDS_ISSUANCE_ENABLED = original;
    await f.db.close?.();
  }
});
