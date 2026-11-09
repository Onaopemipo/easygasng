import {serviceProof} from "./helpers/service-fixture";
import {authoriseWork} from "./helpers/service-fixture";
import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { rewardsFixture } from "./helpers/rewards-fixture";
import { one } from "../apps/web/lib/db";
import { id } from "../apps/web/lib/auth";
import { processRewards, rewardBalance } from "../apps/web/lib/rewards";
import { processServiceRewards } from "../apps/web/lib/reward-services";
const oldI = process.env.EASYGAS_REWARDS_ISSUANCE_ENABLED,
  oldR = process.env.EASYGAS_REWARDS_REDEMPTION_ENABLED;
before(() => {
  process.env.EASYGAS_REWARDS_ISSUANCE_ENABLED = "true";
  process.env.EASYGAS_REWARDS_REDEMPTION_ENABLED = "true";
});
after(() => {
  if (oldI === undefined) delete process.env.EASYGAS_REWARDS_ISSUANCE_ENABLED;
  else process.env.EASYGAS_REWARDS_ISSUANCE_ENABLED = oldI;
  if (oldR === undefined) delete process.env.EASYGAS_REWARDS_REDEMPTION_ENABLED;
  else process.env.EASYGAS_REWARDS_REDEMPTION_ENABLED = oldR;
});
const input = (quantity = 3) => ({
  items: [{ productId: "hose", quantity }],
  address: {
    name: "Synthetic Customer",
    phone: "08012345678",
    street: "12 Synthetic Street",
    zone: "Lekki",
  },
  date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
  window: "14:00–18:00",
  paymentMethod: "cash_on_delivery",
  idempotencyKey: id(),
});
async function deliver(f: any, o: any) {
  for (const s of ["accepted", "preparing", "assigned"])
    await f.transition(o, s);
  await f.pickup(o);
  await f.transition(o, "out_for_delivery", "driver");
  const source = (await f.call("customer", "orders", { id: o.id }))[0];
  await f.call("driver", "delivery.complete", {
    orderId: o.id,
    version: source.tracking_version,
    operationKey: id(),
    code: source.confirmation_code,
    handover: true,
    collectedKobo: Number(source.total_kobo),
  });
  await f.call("finance", "cash.reconcile", {
    id: (await one(f.db, "SELECT id FROM cash_collections WHERE order_id=$1", [
      o.id,
    ]))!.id,
  });
  return source;
}
const offer = (overrides: any = {}) => ({
  id: "refill-offer",
  title: "Approved synthetic offer",
  description: "Fixture only",
  points: 100,
  budgetKobo: 10000,
  maximumUsesPerCustomer: 1,
  frequencyDays: 7,
  startsAt: new Date(Date.now() - 1000).toISOString(),
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
  smartRefill: false,
  active: true,
  ...overrides,
});
test("ER-14: cumulative partial line refunds prorate discount and points, preserve delivery, and finish with an exact remaining refund", async () => {
  const f = await rewardsFixture();
  try {
    await f.approve();
    await f.db.query(
      "INSERT INTO reward_entries(id,customer_id,points,reference) VALUES($1,$2,1000,$1)",
      [id(), f.actors.customer.id],
    );
    const o = await f.call("customer", "checkout", {
      ...input(),
      rewardPoints: 101,
    });
    await deliver(f, o);
    await f.db.transaction(processRewards);
    assert.equal(await rewardBalance(f.db, f.actors.customer.id), 1002);
    const request = {
      orderId: o.id,
      lines: [{ source: "product:hose", quantity: 1 }],
      reason: "Synthetic partial line refund reason",
      acceptWalletCredit: true,
      idempotencyKey: id(),
    };
    const a = await f.call("customer", "refund.request", request);
    assert.equal(
      (await f.call("customer", "refund.request", request)).id,
      a.id,
    );
    await assert.rejects(
      () =>
        f.call("customer", "refund.request", {
          ...request,
          lines: [{ source: "product:hose", quantity: 2 }],
        }),
      /conflict/,
    );
    await f.call("finance", "credit.decide", {
      id: a.id,
      decision: "approved",
      reason: "Independent partial refund evidence verified",
    });
    await f.call("finance", "credit.decide", {
      id: a.id,
      decision: "approved",
      reason: "Independent partial refund evidence verified",
    });
    assert.equal((await f.call("customer", "wallet")).balanceKobo, 346634);
    assert.equal(
      (await one(f.db, "SELECT payment_status FROM orders WHERE id=$1", [
        o.id,
      ]))!.payment_status,
      "verified",
    );
    await assert.rejects(
      () =>
        f.call("customer", "refund.request", {
          ...request,
          idempotencyKey: id(),
          lines: [{ source: "product:hose", quantity: 3 }],
        }),
      /remaining fulfilled/,
    );
    const b = await f.call("customer", "refund.request", {
      orderId: o.id,
      reason: "Synthetic full remaining refund reason",
      acceptWalletCredit: true,
      idempotencyKey: id(),
    });
    await f.call("finance", "credit.decide", {
      id: b.id,
      decision: "approved",
      reason: "Independent remaining amount evidence verified",
    });
    assert.equal(
      (await f.call("customer", "wallet")).balanceKobo,
      Number(o.total_kobo),
    );
    assert.equal(await rewardBalance(f.db, f.actors.customer.id), 1000);
    assert.equal(
      (await one(f.db, "SELECT payment_status FROM orders WHERE id=$1", [
        o.id,
      ]))!.payment_status,
      "refunded",
    );
    await assert.rejects(
      () => f.db.query("DELETE FROM reward_refund_allocations"),
      /Append-only/,
    );
  } finally {
    await f.db.close?.();
  }
});
test("ER-10O: approved catalogue offers enforce expiry, budget, point cost and lifetime reuse; unapproved edits cannot publish", async () => {
  const f = await rewardsFixture();
  try {
    await f.approve({ ...f.policy, offers: [offer()] } as any);
    await f.db.query(
      "INSERT INTO reward_entries(id,customer_id,points,reference) VALUES($1,$2,1000,$1)",
      [id(), f.actors.customer.id],
    );
    assert.equal((await f.call("customer", "rewards.offers")).length, 1);
    await assert.rejects(
      () =>
        f.call("customer", "checkout", {
          ...input(1),
          rewardPoints: 101,
          rewardOfferId: "refill-offer",
        }),
      /unavailable/,
    );
    const o = await f.call("customer", "checkout", {
      ...input(1),
      rewardPoints: 100,
      rewardOfferId: "refill-offer",
    });
    assert.equal(Number(o.reward_discount_kobo), 10000);
    assert.equal((await f.call("customer", "rewards.offers")).length, 0);
    await assert.rejects(
      () =>
        f.call("customer", "checkout", {
          ...input(1),
          rewardPoints: 100,
          rewardOfferId: "refill-offer",
        }),
      /unavailable/,
    );
    await f.approve({
      ...f.policy,
      offers: [
        offer({
          id: "expired-offer",
          startsAt: new Date(Date.now() - 86400000).toISOString(),
          expiresAt: new Date(Date.now() - 1000).toISOString(),
        }),
      ],
    } as any);
    assert.equal((await f.call("customer", "rewards.offers")).length, 0);
  } finally {
    await f.db.close?.();
  }
});
test("ER-19R: independently approved referral hold blocks posting until separately approved clearance and audited retry", async () => {
  const f = await rewardsFixture();
  try {
    await f.approve({
      ...f.policy,
      referralEnabled: true,
      referralPoints: 250,
    });
    const { code } = await f.call("commercial", "rewards.referral");
    await f.call("customer", "rewards.referral.attribute", { code });
    const attribution = (await one(
      f.db,
      "SELECT attribution_id FROM reward_referrals WHERE customer_id=$1",
      [f.actors.customer.id],
    ))!.attribution_id;
    async function review(state: string, version: number) {
      const r = await f.call("owner", "setting.propose", {
        key: "loyalty.referral_review",
        scope: "lagos",
        version,
        value: {
          attributionId: attribution,
          state,
          reason: "Synthetic independent risk review evidence",
        },
        reason: "Synthetic independent risk control request",
      });
      for (const role of ["owner2", "finance"])
        await f.call(role, "approval.decide", {
          id: r.id,
          decision: "approve",
          reason: "Independent risk evidence checked",
        });
    }
    await review("held", 1);
    const o = await f.fulfilled();
    await f.call("finance", "cash.reconcile", {
      id: (await one(
        f.db,
        "SELECT id FROM cash_collections WHERE order_id=$1",
        [o.id],
      ))!.id,
    });
    await f.db.transaction(processRewards);
    assert.equal(await rewardBalance(f.db, f.actors.commercial.id), 0);
    await assert.rejects(
      () =>
        f.call("finance", "rewards.retry", {
          orderId: o.id,
          reason: "Synthetic premature retry rejected",
        }),
      /Clear the referral/,
    );
    await review("cleared", 2);
    await f.db.query(
      "UPDATE reward_jobs SET status='review' WHERE order_id=$1",
      [o.id],
    );
    await f.call("finance", "rewards.retry", {
      orderId: o.id,
      reason: "Independent clearance recorded, safe retry",
    });
    await f.db.transaction(processRewards);
    assert.equal(await rewardBalance(f.db, f.actors.commercial.id), 250);
  } finally {
    await f.db.close?.();
  }
});
test("ER-31S: Smart Refill offers require approved active offers, communication consent and real forecast history", async () => {
  const f = await rewardsFixture();
  try {
    await f.approve({
      ...f.policy,
      offers: [offer({ smartRefill: true })],
    } as any);
    assert.deepEqual(await f.call("customer", "rewards.smart-offers"), []);
    await f.db.query(
      "INSERT INTO communication_preferences(user_id,marketing,refill_reminders) VALUES($1,true,true) ON CONFLICT(user_id) DO UPDATE SET marketing=true,refill_reminders=true",
      [f.actors.customer.id],
    );
    assert.deepEqual(await f.call("customer", "rewards.smart-offers"), []);
    await assert.rejects(
      () =>
        f.call("customer", "checkout", {
          ...input(1),
          rewardPoints: 100,
          rewardOfferId: "refill-offer",
        }),
      /not eligible/,
    );
  } finally {
    await f.db.close?.();
  }
});
test("ER-04S: completed service labour earns only after independent payment verification and full refund reverses once", async () => {
  const { fixture, begin } = await import("./helpers/service-fixture");
  const f = await fixture();
  try {
    // Reuse the same independent owner/finance policy engine with a second owner.
    const { hashPassword, issueSession } = await import("../apps/web/lib/auth");
    const uid = id();
    await f.db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,'Second fixture owner',$2,$3,'owner','lagos')",
      [
        uid,
        uid + "@service-rewards.test",
        hashPassword("Services-fixture-only-123!"),
      ],
    );
    f.actors.owner2 = { id: uid, token: await issueSession(f.db, uid) };
    await f.call("owner2", "reauth", {
      password: "Services-fixture-only-123!",
    });
    const p = {
      earningEnabled: true,
      redemptionEnabled: false,
      spendPerPointKobo: 10000,
      discountPerPointKobo: 100,
      minimumPoints: 10,
      maximumDiscountBps: 2000,
      eligibleCategories: ["Gas refills"],
      referralEnabled: false,
      referralPoints: 0,
      serviceEarningEnabled: true,
      eligibleServiceIds: ["cooker-servicing"],
      offers: [],
    };
    const r = await f.call("owner", "setting.propose", {
      key: "loyalty.policy",
      scope: "lagos",
      version: 1,
      value: p,
      reason: "Synthetic service labour rewards policy",
    });
    for (const role of ["owner2", "finance"])
      await f.call(role, "approval.decide", {
        id: r.id,
        decision: "approve",
        reason: "Independent synthetic service policy review",
      });
    const b = await begin(f);
    await f.call("technician", "booking.cash.record", {
      bookingId: b.id,
      amountKobo: 120000,
      reference: "SERVICE-REWARD-FIXTURE-RECEIPT",
    });
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
          notes: "Synthetic inspection evidence",
        },
      ],
      findings: "Synthetic findings documented",
      workPerformed: "Synthetic completed service labour",
      recommendations: "Synthetic no additional work",
    });
    await f.call("customer", "booking.acknowledge", {
      bookingId: b.id,
      accepted: true,
      notes: "Customer acknowledged documented service",
    });
    await f.db.transaction(processServiceRewards);
    assert.equal(await rewardBalance(f.db, f.actors.customer.id), 10);

    await f.db.transaction(processServiceRewards);
    await f.db.transaction(processServiceRewards);
    assert.equal(await rewardBalance(f.db, f.actors.customer.id), 10);
    const refund = await f.call("customer", "booking.refund.request", {
      bookingId: b.id,
      acceptWalletCredit: true,
      reason: "Synthetic service full refund evidence",
    });
    await f.call("finance", "credit.decide", {
      id: refund.id,
      decision: "approved",
      reason: "Independent verified service refund approval",
    });
    assert.equal(await rewardBalance(f.db, f.actors.customer.id), 0);
  } finally {
    await f.db.close?.();
  }
});

test("ER-14Z: refund of an entirely points-funded product restores points without fictional monetary wallet credit", async () => {
  const f = await rewardsFixture();
  try {
    await f.approve({ ...f.policy, maximumDiscountBps: 10000 });
    await f.db.query(
      "INSERT INTO reward_entries(id,customer_id,points,reference) VALUES($1,$2,3500,$1)",
      [id(), f.actors.customer.id],
    );
    const o = await f.call("customer", "checkout", {
      ...input(1),
      rewardPoints: 3500,
    });
    await deliver(f, o);
    await f.db.transaction(processRewards);
    const r = await f.call("customer", "refund.request", {
      orderId: o.id,
      lines: [{ source: "product:hose", quantity: 1 }],
      reason: "Synthetic points-funded product refund",
      acceptWalletCredit: true,
      idempotencyKey: id(),
    });
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT amount_kobo FROM credit_requests WHERE id=$1",
          [r.id],
        ))!.amount_kobo,
      ),
      0,
    );
    await f.call("finance", "credit.decide", {
      id: r.id,
      decision: "approved",
      reason: "Independent points-only refund evidence",
    });
    assert.equal((await f.call("customer", "wallet")).balanceKobo, 0);
    assert.equal(await rewardBalance(f.db, f.actors.customer.id), 3500);
  } finally {
    await f.db.close?.();
  }
});

test("ER-31P: approved Smart Refill offer uses verified historical sources and disappears on consent withdrawal", async () => {
  const f = await rewardsFixture();
  try {
    await f.approve({
      ...f.policy,
      offers: [offer({ smartRefill: true })],
    } as any);
    await f.call("customer", "refill.profile.create", {
      productId: "refill-6",
      label: "Synthetic household",
      householdSize: 3,
      cookingDays: 7,
    });
    await f.db.query(
      "INSERT INTO communication_preferences(user_id,marketing,refill_reminders) VALUES($1,true,true) ON CONFLICT(user_id) DO UPDATE SET marketing=true,refill_reminders=true",
      [f.actors.customer.id],
    );
    for (const days of [45, 30, 15]) {
      const o = await f.make();
      await f.db.query(
        "UPDATE order_items SET product_id='refill-6' WHERE order_id=$1",
        [o.id],
      );
      await f.db.query(
        "UPDATE orders SET status='delivered',payment_status='verified',delivered_at=now()-($2::int*interval '1 day') WHERE id=$1",
        [o.id, days],
      );
      await f.db.query(
        "INSERT INTO verified_payments(id,order_id,reference,amount_kobo,method,verified_by) VALUES($1,$2,$1,$3,'cash',$4)",
        [id(), o.id, o.total_kobo, f.actors.finance.id],
      );
    }
    const profiles = await f.call("customer", "refill.profiles");
    assert.equal(profiles[0].forecast.available, true);
    assert.equal((await f.call("customer", "rewards.smart-offers")).length, 1);
    const { notifyRefillOffers } = await import(
      "../apps/web/lib/reward-offers"
    );
    const daytime = new Date();
    daytime.setUTCHours(12, 0, 0, 0);
    await f.db.query(
      "UPDATE communication_preferences SET quiet_start=8,quiet_end=8 WHERE user_id=$1",
      [f.actors.customer.id],
    );
    await f.db.transaction((tx) => notifyRefillOffers(tx, daytime));
    assert.equal(
      Number(
        (await one(f.db, "SELECT count(*) n FROM reward_offer_notices"))!.n,
      ),
      0,
    );
    await f.db.query(
      "UPDATE communication_preferences SET quiet_start=21,quiet_end=8 WHERE user_id=$1",
      [f.actors.customer.id],
    );
    await f.db.transaction((tx) => notifyRefillOffers(tx, daytime));
    await f.db.transaction((tx) => notifyRefillOffers(tx, daytime));
    assert.equal(
      Number(
        (await one(f.db, "SELECT count(*) n FROM reward_offer_notices"))!.n,
      ),
      1,
    );
    await f.db.query(
      "UPDATE communication_preferences SET marketing=false WHERE user_id=$1",
      [f.actors.customer.id],
    );
    assert.deepEqual(await f.call("customer", "rewards.smart-offers"), []);
  } finally {
    await f.db.close?.();
  }
});

test("ER-30G: decimal gas plus accessory discount preserves one delivery fee, quoted versions and exact reservations", async () => {
  const f = await rewardsFixture();
  try {
    await f.approve();
    await f.db.query(
      "INSERT INTO reward_entries(id,customer_id,points,reference) VALUES($1,$2,1000,$1)",
      [id(), f.actors.customer.id],
    );
    await f.db.query("UPDATE gas_stock SET grams=10000");
    await f.db.query(
      "UPDATE settings SET value=$1 WHERE key='gas.quantity_policy'",
      [
        JSON.stringify({
          minimumKg: 0.5,
          maximumKg: 50,
          incrementKg: 0.5,
          precision: 1,
          capacitiesKg: [6, 12.5],
        }),
      ],
    );
    const { dispatch } = await import("../apps/web/lib/service");
    const lines = [{ capacityKg: 6, kg: 1.5 }],
      q = await dispatch(
        "gas.quote",
        null,
        {
          lines,
          items: [{ productId: "hose", quantity: 1 }],
          branchId: "lagos",
        },
        f.db,
      );
    const payload = {
      ...input(1),
      gasLines: lines,
      rewardPoints: 100,
      pricing: {
        priceVersion: q.priceVersion,
        feeVersion: q.feeVersion,
        policyVersion: q.policyVersion,
        totalKobo: q.subtotalKobo + q.deliveryKobo + q.physicalSubtotalKobo,
      },
    };
    const o = await f.call("customer", "checkout", payload);
    await f.call("customer", "checkout", payload);
    assert.equal(Number(o.delivery_kobo), 500000);
    assert.equal(Number(o.total_kobo), payload.pricing.totalKobo - 10000);
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT reserved_grams FROM gas_stock WHERE branch_id='lagos'",
        ))!.reserved_grams,
      ),
      1500,
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
