import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { rewardsFixture } from "./helpers/rewards-fixture";
import { one, migrate } from "../apps/web/lib/db";
import { id } from "../apps/web/lib/auth";
import {
  enqueueReward,
  processRewards,
  reverseOrderRewards,
  rewardBalance,
} from "../apps/web/lib/rewards";
import { earnedPoints, rewardsPolicy } from "../apps/web/lib/rewards-schema";
const oldIssue = process.env.EASYGAS_REWARDS_ISSUANCE_ENABLED,
  oldRedeem = process.env.EASYGAS_REWARDS_REDEMPTION_ENABLED;
before(() => {
  process.env.EASYGAS_REWARDS_ISSUANCE_ENABLED = "true";
  process.env.EASYGAS_REWARDS_REDEMPTION_ENABLED = "true";
});
after(() => {
  if (oldIssue === undefined)
    delete process.env.EASYGAS_REWARDS_ISSUANCE_ENABLED;
  else process.env.EASYGAS_REWARDS_ISSUANCE_ENABLED = oldIssue;
  if (oldRedeem === undefined)
    delete process.env.EASYGAS_REWARDS_REDEMPTION_ENABLED;
  else process.env.EASYGAS_REWARDS_REDEMPTION_ENABLED = oldRedeem;
});
const checkoutInput = () => ({
  items: [{ productId: "hose", quantity: 1 }],
  address: {
    name: "Synthetic customer",
    phone: "08012345678",
    street: "12 Synthetic Street",
    zone: "Lekki",
  },
  date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
  window: "14:00–18:00",
  paymentMethod: "cash_on_delivery",
  idempotencyKey: id(),
});
test("ER-01: additive migration preserves customer IDs and immutable legacy balances", async () => {
  const f = await rewardsFixture();
  try {
    await f.db.query(
      "INSERT INTO reward_entries(id,customer_id,points,reference) VALUES($1,$2,123,$1)",
      [id(), f.actors.customer.id],
    );
    await migrate(f.db);
    assert.equal(await rewardBalance(f.db, f.actors.customer.id), 123);
    assert.equal(
      (await f.call("customer", "me")).user.id,
      f.actors.customer.id,
    );
    await assert.rejects(
      () => f.db.query("UPDATE reward_entries SET points=1"),
      /Append-only/,
    );
  } finally {
    await f.db.close?.();
  }
});
test("ER-03: unapproved example economics and self approval cannot issue or redeem", async () => {
  const f = await rewardsFixture();
  try {
    await f.db.query(
      "UPDATE settings SET value='true' WHERE key='loyalty.enabled'",
    );
    const o = await f.fulfilled();
    await f.call("finance", "reauth", {
      password: "Tracking-fixture-only-123!",
    });
    await f.call("finance", "cash.reconcile", {
      id: (await one(
        f.db,
        "SELECT id FROM cash_collections WHERE order_id=$1",
        [o.id],
      ))!.id,
    });
    await f.db.transaction(processRewards);
    assert.equal(await rewardBalance(f.db, f.actors.customer.id), 0);
    await assert.rejects(
      () =>
        f.call("customer", "rewards.redeem", {
          points: 1,
          idempotencyKey: id(),
        }),
      /conversion is closed/,
    );
    await assert.rejects(
      () =>
        f.call("customer", "checkout", {
          ...checkoutInput(),
          rewardPoints: 10,
        }),
      /approved/,
    );
    const s = await one(
      f.db,
      "SELECT version FROM settings WHERE key='loyalty.policy' AND scope='lagos'",
    );
    await f.call("owner", "reauth", { password: "Tracking-fixture-only-123!" });
    const r = await f.call("owner", "setting.propose", {
      key: "loyalty.policy",
      scope: "lagos",
      version: s!.version,
      value: f.policy,
      reason: "Synthetic independent approval requirement",
    });
    await assert.rejects(
      () =>
        f.call("owner", "approval.decide", {
          id: r.id,
          decision: "approve",
          reason: "Forbidden self approval",
        }),
      /own|independent/i,
    );
    assert.equal(
      rewardsPolicy.safeParse({ ...f.policy, referralPoints: -1 }).success,
      false,
    );
  } finally {
    await f.db.close?.();
  }
});
test("ER-05: unverified COD and cancelled orders never enqueue; verified fulfilment awards once from immutable policy", async () => {
  const f = await rewardsFixture();
  try {
    await f.approve();
    const o = await f.fulfilled();
    assert.equal(
      (await f.db.query("SELECT * FROM reward_jobs")).rows.length,
      0,
    );
    const cash = (await one(
      f.db,
      "SELECT id FROM cash_collections WHERE order_id=$1",
      [o.id],
    ))!;
    await f.call("finance", "cash.reconcile", { id: cash.id });
    await f.call("finance", "cash.reconcile", { id: cash.id });
    await f.db.transaction(processRewards);
    await f.db.transaction(processRewards);
    assert.equal(await rewardBalance(f.db, f.actors.customer.id), 35);
    assert.equal(
      (await f.db.query("SELECT * FROM reward_entry_details")).rows.length,
      1,
    );
    await assert.rejects(
      () => f.db.query("UPDATE reward_entry_details SET detail='{}'"),
      /Append-only/,
    );
    await assert.rejects(
      () => f.db.query("UPDATE reward_jobs SET snapshot='{}'"),
      /immutable/,
    );
    const cancelled = await f.make();
    await f.transition(cancelled, "cancelled", "customer");
    await f.db.transaction((tx) => enqueueReward(tx, cancelled.id));
    assert.equal(
      (await f.db.query("SELECT * FROM reward_jobs")).rows.length,
      1,
    );
  } finally {
    await f.db.close?.();
  }
});
test("ER-08: integer kobo calculations round down without floating point rewards", () => {
  assert.equal(earnedPoints(9999n, 10000), 0);
  assert.equal(earnedPoints(10001n, 10000), 1);
  assert.equal(earnedPoints(9999999999999n, 10000), 999999999);
  assert.throws(() => earnedPoints(-1n, 10000));
});
test("ER-10: checkout discount enforces min, cap, exclusions; same cart replay posts once and cancellation restores once", async () => {
  const f = await rewardsFixture();
  try {
    await f.approve();
    await f.db.query(
      "INSERT INTO reward_entries(id,customer_id,points,reference) VALUES($1,$2,10000,$1)",
      [id(), f.actors.customer.id],
    );
    const before = await f.call("customer", "wallet");
    await assert.rejects(
      () =>
        f.call("customer", "checkout", { ...checkoutInput(), rewardPoints: 1 }),
      /minimum/,
    );
    await assert.rejects(
      () =>
        f.call("customer", "checkout", {
          ...checkoutInput(),
          rewardPoints: 1000,
        }),
      /limit/,
    );
    const input = { ...checkoutInput(), rewardPoints: 100 };
    const o = await f.call("customer", "checkout", input),
      again = await f.call("customer", "checkout", input);
    assert.equal(o.id, again.id);
    assert.equal(Number(o.reward_discount_kobo), 10000);
    await assert.rejects(
      () =>
        f.db.query(
          "UPDATE orders SET reward_discount_kobo=0,total_kobo=subtotal_kobo+delivery_kobo WHERE id=$1",
          [o.id],
        ),
      /immutable/,
    );
    assert.equal(
      Number(o.total_kobo),
      Number(o.subtotal_kobo) + Number(o.delivery_kobo) - 10000,
    );
    assert.equal(await rewardBalance(f.db, f.actors.customer.id), 9900);
    assert.equal(
      (await f.call("customer", "wallet")).balanceKobo,
      before.balanceKobo,
    );
    await assert.rejects(
      () => f.call("customer", "checkout", { ...input, rewardPoints: 101 }),
      /reference/,
    );
    await f.transition(o, "cancelled", "customer");
    assert.equal(await rewardBalance(f.db, f.actors.customer.id), 10000);
    assert.equal(
      (await f.db.query("SELECT * FROM reward_order_discounts")).rows.length,
      1,
    );
    await assert.rejects(
      () => f.db.query("DELETE FROM reward_order_discounts"),
      /Append-only/,
    );
  } finally {
    await f.db.close?.();
  }
});
test("ER-13: failed wallet checkout rolls back discount and inventory with no leaked point hold", async () => {
  const f = await rewardsFixture();
  try {
    await f.approve();
    await f.db.query(
      "UPDATE settings SET value='true' WHERE key='wallet.enabled'",
    );
    await f.db.query(
      "INSERT INTO reward_entries(id,customer_id,points,reference) VALUES($1,$2,1000,$1)",
      [id(), f.actors.customer.id],
    );
    const stock = await one(
      f.db,
      "SELECT reserved FROM inventory WHERE product_id='hose' AND branch_id='lagos'",
    );
    await assert.rejects(
      () =>
        f.call("customer", "checkout", {
          ...checkoutInput(),
          paymentMethod: "wallet",
          rewardPoints: 100,
        }),
      /Insufficient purchase credit/,
    );
    assert.equal(await rewardBalance(f.db, f.actors.customer.id), 1000);
    assert.equal(
      (await f.db.query("SELECT * FROM reward_order_discounts")).rows.length,
      0,
    );
    assert.equal(
      (await one(
        f.db,
        "SELECT reserved FROM inventory WHERE product_id='hose' AND branch_id='lagos'",
      ))!.reserved,
      stock!.reserved,
    );
  } finally {
    await f.db.close?.();
  }
});
test("ER-15: full refund reverses original award once without point-only wallet debit", async () => {
  const f = await rewardsFixture();
  try {
    await f.approve();
    const o = await f.fulfilled();
    await f.call("finance", "cash.reconcile", {
      id: (await one(
        f.db,
        "SELECT id FROM cash_collections WHERE order_id=$1",
        [o.id],
      ))!.id,
    });
    await f.db.transaction(processRewards);
    const wallet = (await f.call("customer", "wallet")).balanceKobo;
    await f.db.transaction((tx) => reverseOrderRewards(tx, o.id));
    await f.db.transaction((tx) => reverseOrderRewards(tx, o.id));
    assert.equal(await rewardBalance(f.db, f.actors.customer.id), 0);
    assert.equal((await f.call("customer", "wallet")).balanceKobo, wallet);
    assert.equal(
      (
        await f.db.query(
          "SELECT * FROM reward_entry_details WHERE kind='reversed'",
        )
      ).rows.length,
      1,
    );
  } finally {
    await f.db.close?.();
  }
});
test("ER-22: reward ownership, strict API inputs, branch scope and session revocation are enforced", async () => {
  const f = await rewardsFixture();
  try {
    await f.db.query(
      "INSERT INTO reward_entries(id,customer_id,points,reference) VALUES($1,$2,123,$1)",
      [id(), f.actors.customer.id],
    );
    assert.equal((await f.call("commercial", "rewards.summary")).points, 0);
    await assert.rejects(() =>
      f.call("commercial", "rewards.summary", {
        customerId: f.actors.customer.id,
      }),
    );
    await assert.rejects(
      () => f.call("customer", "rewards.report"),
      /permission|role|authority/i,
    );
    await assert.rejects(
      () => f.call("manager", "rewards.report", { branchId: "other-branch" }),
      /branch|scope|permission/i,
    );
    await f.db.query("UPDATE users SET active=false WHERE id=$1", [
      f.actors.customer.id,
    ]);
    await assert.rejects(
      () => f.call("customer", "rewards.summary"),
      /session|sign|inactive|authenticated/i,
    );
    await f.db.query("UPDATE users SET active=true WHERE id=$1", [
      f.actors.customer.id,
    ]);
    await f.db.query(
      "UPDATE sessions SET expires_at=now()-interval '1 minute' WHERE user_id=$1",
      [f.actors.customer.id],
    );
    await assert.rejects(
      () => f.call("customer", "rewards.summary"),
      /session|sign|expired|authenticated/i,
    );
  } finally {
    await f.db.close?.();
  }
});
test("ER-25: worker failure retains durable retry source, rolls back optional posting and then succeeds once", async () => {
  const f = await rewardsFixture();
  try {
    await f.approve();
    const o = await f.fulfilled();
    await f.call("finance", "cash.reconcile", {
      id: (await one(
        f.db,
        "SELECT id FROM cash_collections WHERE order_id=$1",
        [o.id],
      ))!.id,
    });
    await f.db.exec(
      "CREATE FUNCTION fail_reward_notify() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.title='Reward points earned' THEN RAISE EXCEPTION 'Synthetic worker notification failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER fail_reward_notify BEFORE INSERT ON notifications FOR EACH ROW EXECUTE FUNCTION fail_reward_notify();",
    );
    await f.db.transaction(processRewards);
    assert.equal(await rewardBalance(f.db, f.actors.customer.id), 0);
    assert.equal(
      (await one(f.db, "SELECT attempts FROM reward_jobs WHERE order_id=$1", [
        o.id,
      ]))!.attempts,
      1,
    );
    assert.equal(
      (await one(f.db, "SELECT status FROM orders WHERE id=$1", [o.id]))!
        .status,
      "delivered",
    );
    await f.db.exec("DROP TRIGGER fail_reward_notify ON notifications");
    await f.db.transaction(processRewards);
    await f.db.transaction(processRewards);
    assert.equal(await rewardBalance(f.db, f.actors.customer.id), 35);
  } finally {
    await f.db.close?.();
  }
});
test("ER-37: emergency issuance flag pauses pending jobs and retains real history", async () => {
  const f = await rewardsFixture();
  try {
    await f.approve();
    const o = await f.fulfilled();
    await f.call("finance", "cash.reconcile", {
      id: (await one(
        f.db,
        "SELECT id FROM cash_collections WHERE order_id=$1",
        [o.id],
      ))!.id,
    });
    process.env.EASYGAS_REWARDS_ISSUANCE_ENABLED = "false";
    await f.db.transaction(processRewards);
    assert.equal(
      (await f.call("customer", "rewards.summary")).earningEnabled,
      false,
    );
    assert.equal(await rewardBalance(f.db, f.actors.customer.id), 0);
    process.env.EASYGAS_REWARDS_ISSUANCE_ENABLED = "true";
    await f.db.transaction(processRewards);
    assert.equal((await f.call("customer", "rewards.summary")).points, 35);
  } finally {
    process.env.EASYGAS_REWARDS_ISSUANCE_ENABLED = "true";
    await f.db.close?.();
  }
});

test("ER-18: approved referral first verified fulfilment awards once, hides identities and reverses once on refund", async () => {
  const f = await rewardsFixture();
  try {
    await f.approve({
      ...f.policy,
      referralEnabled: true,
      referralPoints: 250,
    });
    const code = (await f.call("commercial", "rewards.referral")).code;
    await assert.rejects(
      () => f.call("commercial", "rewards.referral.attribute", { code }),
      /cannot be applied/,
    );
    await f.call("customer", "rewards.referral.attribute", { code });
    await f.call("customer", "rewards.referral.attribute", { code });
    const o = await f.fulfilled();
    assert.equal(await rewardBalance(f.db, f.actors.commercial.id), 0);
    await f.call("finance", "cash.reconcile", {
      id: (await one(
        f.db,
        "SELECT id FROM cash_collections WHERE order_id=$1",
        [o.id],
      ))!.id,
    });
    await f.db.transaction(processRewards);
    await f.db.transaction(processRewards);
    assert.equal(await rewardBalance(f.db, f.actors.commercial.id), 250);
    const summary = await f.call("commercial", "rewards.summary");
    assert.equal(summary.entries[0].order_id, null);
    assert.equal(JSON.stringify(summary).includes(f.actors.customer.id), false);
    await f.db.transaction((tx) => reverseOrderRewards(tx, o.id));
    await f.db.transaction((tx) => reverseOrderRewards(tx, o.id));
    assert.equal(await rewardBalance(f.db, f.actors.commercial.id), 0);
    await assert.rejects(
      () =>
        f.db.query("UPDATE reward_referrals SET referrer_id=$1", [
          f.actors.owner.id,
        ]),
      /immutable/,
    );
  } finally {
    await f.db.close?.();
  }
});
test("ER-21: manual point correction requires independent owner and finance approvals and cannot change wallet money", async () => {
  const f = await rewardsFixture();
  try {
    await f.approve();
    const wallet = (await f.call("customer", "wallet")).balanceKobo;
    const r = await f.call("owner", "setting.propose", {
      key: "loyalty.adjustment",
      scope: "lagos",
      version: 1,
      value: {
        customerId: f.actors.customer.id,
        points: 123,
        reason: "Synthetic correction after ledger reconciliation",
        evidence: "Synthetic finance receipt reference TEST-123",
      },
      reason: "Synthetic independent correction test",
    });
    assert.equal(await rewardBalance(f.db, f.actors.customer.id), 0);
    await assert.rejects(
      () =>
        f.call("owner", "approval.decide", {
          id: r.id,
          decision: "approve",
          reason: "Self approval must fail",
        }),
      /own|independent/i,
    );
    await f.call("owner2", "approval.decide", {
      id: r.id,
      decision: "approve",
      reason: "Synthetic independent owner review",
    });
    assert.equal(await rewardBalance(f.db, f.actors.customer.id), 0);
    await f.call("finance", "approval.decide", {
      id: r.id,
      decision: "approve",
      reason: "Synthetic independent finance review",
    });
    assert.equal(await rewardBalance(f.db, f.actors.customer.id), 123);
    assert.equal((await f.call("customer", "wallet")).balanceKobo, wallet);
    await assert.rejects(
      () =>
        f.call("finance", "approval.decide", {
          id: r.id,
          decision: "approve",
          reason: "Synthetic retry after committed approval",
        }),
      /no longer open/,
    );
    assert.equal(await rewardBalance(f.db, f.actors.customer.id), 123);
  } finally {
    await f.db.close?.();
  }
});
test("ER-26: a lost checkout response recovers the owned committed result and rejects changed payload", async () => {
  const f = await rewardsFixture();
  try {
    await f.approve();
    await f.db.query(
      "INSERT INTO reward_entries(id,customer_id,points,reference) VALUES($1,$2,1000,$1)",
      [id(), f.actors.customer.id],
    );
    const input = { ...checkoutInput(), rewardPoints: 100 };
    const o = await f.call("customer", "checkout", input);
    const result = await f.call("customer", "rewards.checkout-outcome", {
      idempotencyKey: input.idempotencyKey,
    });
    assert.equal(result.status, "COMMITTED");
    assert.equal(result.order.id, o.id);
    assert.equal(
      (
        await f.call("commercial", "rewards.checkout-outcome", {
          idempotencyKey: input.idempotencyKey,
        })
      ).status,
      "NOT_FOUND",
    );
    await assert.rejects(
      () => f.call("customer", "checkout", { ...input, rewardPoints: 110 }),
      /reference/,
    );
  } finally {
    await f.db.close?.();
  }
});
test("ER-38: referral sharing rejects localhost and private IDs and uses only the configured HTTPS public domain", async () => {
  const { referralShareUrl } = await import(
    "../apps/web/lib/rewards-referrals"
  );
  const old = process.env.APP_URL;
  const code = "a".repeat(32);
  try {
    for (const origin of [
      "http://127.0.0.1:3003",
      "https://localhost",
      "https://127.0.0.1",
      "https://user:pass@example.com",
      "https://service.local",
    ]) {
      process.env.APP_URL = origin;
      assert.equal(referralShareUrl(code), null);
    }
    process.env.APP_URL = "https://easygasng.com";
    assert.equal(
      referralShareUrl(code),
      `https://easygasng.com/register?ref=${code}`,
    );
    assert.equal(referralShareUrl("customer-private-id"), null);
  } finally {
    if (old === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = old;
  }
});
test("ER-25Q: optional enqueue failure preserves verified fulfilment and records a durable finance incident", async () => {
  const f = await rewardsFixture();
  try {
    await f.approve();
    const o = await f.fulfilled();
    await f.db.exec(
      "CREATE FUNCTION fail_reward_enqueue() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Synthetic enqueue outage'; END $$; CREATE TRIGGER fail_reward_enqueue BEFORE INSERT ON reward_jobs FOR EACH ROW EXECUTE FUNCTION fail_reward_enqueue();",
    );
    await f.call("finance", "cash.reconcile", {
      id: (await one(
        f.db,
        "SELECT id FROM cash_collections WHERE order_id=$1",
        [o.id],
      ))!.id,
    });
    assert.equal(
      (await one(f.db, "SELECT payment_status FROM orders WHERE id=$1", [
        o.id,
      ]))!.payment_status,
      "verified",
    );
    assert.equal(
      (await one(
        f.db,
        "SELECT count(*) n FROM operational_incidents WHERE category='reward_enqueue_failure' AND target=$1",
        [o.id],
      ))!.n,
      1,
    );
  } finally {
    await f.db.close?.();
  }
});

test("ER-36: upgrade from revision 42 preserves legacy history and encrypted isolated restore preserves the new point ledger", async () => {
  const { createDatabase } = await import("../apps/web/lib/db");
  const { hashPassword } = await import("../apps/web/lib/auth");
  const db = await createDatabase("memory://");
  try {
    // Pre-mark only the not-yet-applied revision to construct the actual previous schema.
    await db.exec(
      "CREATE TABLE schema_migrations(version text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now()); INSERT INTO schema_migrations(version) VALUES('043'),('043c'),('044'),('045'),('046');",
    );
    await migrate(db);
    const uid = id();
    await db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,'Legacy synthetic customer',$2,$3,'customer','lagos')",
      [
        uid,
        uid + "@upgrade.example.test",
        hashPassword("Synthetic-restore-only-123!"),
      ],
    );
    await db.query(
      "INSERT INTO reward_entries(id,customer_id,points,reference) VALUES($1,$2,77,$1)",
      [id(), uid],
    );
    await db.query(
      "DELETE FROM schema_migrations WHERE version IN ('043','043c','044','045','046')",
    );
    await migrate(db);
    assert.equal(await rewardBalance(db, uid), 77);
    assert.equal(
      (await one(db, "SELECT id FROM users WHERE id=$1", [uid]))!.id,
      uid,
    );
    const { encryptBackup, decryptBackup } = await import(
      "../apps/web/lib/backups"
    );
    const { PGlite } = await import("@electric-sql/pglite");
    const bytes = decryptBackup(
      encryptBackup(await db.snapshot!(), "Synthetic-rewards-backup-only-123!"),
      "Synthetic-rewards-backup-only-123!",
    );
    const restored = await PGlite.create({
      loadDataDir: new Blob([new Uint8Array(bytes)]),
    });
    try {
      assert.equal(
        Number(
          (
            await restored.query<any>(
              "SELECT sum(points) n FROM reward_entries WHERE customer_id=$1",
              [uid],
            )
          ).rows[0].n,
        ),
        77,
      );
      await assert.rejects(
        () => restored.query("DELETE FROM reward_entries"),
        /Append-only/,
      );
    } finally {
      await restored.close();
    }
  } finally {
    await db.close?.();
  }
});
test("ER-16: spent award reversal restricts point spending and opens finance review without debiting monetary wallet", async () => {
  const f = await rewardsFixture();
  try {
    await f.approve();
    const o = await f.fulfilled();
    await f.call("finance", "cash.reconcile", {
      id: (await one(
        f.db,
        "SELECT id FROM cash_collections WHERE order_id=$1",
        [o.id],
      ))!.id,
    });
    await f.db.transaction(processRewards);
    await f.db.query(
      "INSERT INTO reward_entries(id,customer_id,points,reference) VALUES($1,$2,-35,$1)",
      [id(), f.actors.customer.id],
    );
    const wallet = (await f.call("customer", "wallet")).balanceKobo;
    await f.db.transaction((tx) => reverseOrderRewards(tx, o.id));
    assert.equal(
      (await f.call("customer", "rewards.summary")).restricted,
      true,
    );
    assert.equal((await f.call("customer", "wallet")).balanceKobo, wallet);
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT count(*) n FROM operational_incidents WHERE category='reward_reversal_review'",
        ))!.n,
      ),
      1,
    );
  } finally {
    await f.db.close?.();
  }
});

test("ER-32: authorised reconciliation separates points from monetary liability and rechecks export scope", async () => {
  const f = await rewardsFixture();
  try {
    await f.approve();
    await f.db.query(
      "INSERT INTO reward_entries(id,customer_id,points,reference) VALUES($1,$2,50,$1)",
      [id(), f.actors.customer.id],
    );
    const r = await f.call("finance", "rewards.export");
    assert.equal(r.ledger[0].net_points, "50");
    assert.equal(r.ledger[0].legacy_points, "50");
    assert.equal(r.ledger[0].estimatedDiscountKobo, "5000");
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT count(*) n FROM audit_events WHERE action='rewards.exported'",
        ))!.n,
      ),
      1,
    );
    await assert.rejects(
      () => f.call("finance", "rewards.export", { branchId: "another-branch" }),
      /permission|branch|scope/i,
    );
    await assert.rejects(
      () => f.call("customer", "rewards.export"),
      /permission|role|authority/i,
    );
  } finally {
    await f.db.close?.();
  }
});

test("ER-09: queued line eligibility and approved economics stay frozen across later policy and category changes", async () => {
  const f = await rewardsFixture();
  try {
    await f.approve();
    const o = await f.fulfilled();
    await f.call("finance", "cash.reconcile", {
      id: (await one(
        f.db,
        "SELECT id FROM cash_collections WHERE order_id=$1",
        [o.id],
      ))!.id,
    });
    const old = (await one(
      f.db,
      "SELECT policy_version_id FROM reward_jobs WHERE order_id=$1",
      [o.id],
    ))!.policy_version_id;
    await f.approve({ ...f.policy, spendPerPointKobo: 20000 });
    await f.db.query(
      "UPDATE products SET category='Changed after source event' WHERE id='hose'",
    );
    await f.db.transaction(processRewards);
    assert.equal(await rewardBalance(f.db, f.actors.customer.id), 35);
    assert.equal(
      (await one(
        f.db,
        "SELECT policy_version_id FROM reward_entry_details WHERE order_id=$1 AND kind='earned'",
        [o.id],
      ))!.policy_version_id,
      old,
    );
  } finally {
    await f.db.close?.();
  }
});
test("ER-06: failed delivery never queues an award and excluded categories cannot receive checkout discounts", async () => {
  const f = await rewardsFixture();
  try {
    await f.approve({ ...f.policy, eligibleCategories: ["Gas refills"] });
    const o = await f.assigned();
    await f.transition(o, "delivery_failed");
    await f.db.transaction((tx) => enqueueReward(tx, o.id));
    assert.equal(
      (await f.db.query("SELECT * FROM reward_jobs")).rows.length,
      0,
    );
    await f.db.query(
      "INSERT INTO reward_entries(id,customer_id,points,reference) VALUES($1,$2,1000,$1)",
      [id(), f.actors.customer.id],
    );
    await assert.rejects(
      () =>
        f.call("customer", "checkout", {
          ...checkoutInput(),
          rewardPoints: 100,
        }),
      /discount limit/,
    );
  } finally {
    await f.db.close?.();
  }
});
test("ER-15F: independently verified full refund restores exactly the discounted monetary total and points only once", async () => {
  const f = await rewardsFixture();
  try {
    await f.approve();
    await f.db.query(
      "INSERT INTO reward_entries(id,customer_id,points,reference) VALUES($1,$2,1000,$1)",
      [id(), f.actors.customer.id],
    );
    const order = await f.call("customer", "checkout", {
      ...checkoutInput(),
      rewardPoints: 100,
    });
    for (const s of ["accepted", "preparing", "assigned"])
      await f.transition(order, s);
    await f.pickup(order);
    await f.transition(order, "out_for_delivery", "driver");
    const o = (await f.call("customer", "orders", { id: order.id }))[0];
    await f.call("driver", "delivery.complete", {
      orderId: o.id,
      version: o.tracking_version,
      operationKey: id(),
      code: o.confirmation_code,
      handover: true,
      collectedKobo: Number(o.total_kobo),
    });
    await f.call("finance", "cash.reconcile", {
      id: (await one(
        f.db,
        "SELECT id FROM cash_collections WHERE order_id=$1",
        [o.id],
      ))!.id,
    });
    await f.db.transaction(processRewards);
    assert.equal(await rewardBalance(f.db, f.actors.customer.id), 934);
    const request = await f.call("customer", "refund.request", {
      orderId: o.id,
      reason: "Synthetic full refund of discounted verified order",
      acceptWalletCredit: true,
    });
    const payload = {
      id: request.id,
      decision: "approved",
      reason: "Independent finance review of discounted source payment",
    };
    await f.call("finance", "credit.decide", payload);
    await f.call("finance", "credit.decide", payload);
    assert.equal(await rewardBalance(f.db, f.actors.customer.id), 1000);
    assert.equal(
      (await f.call("customer", "wallet")).balanceKobo,
      Number(o.total_kobo),
    );
  } finally {
    await f.db.close?.();
  }
});

test("ER-18Q: delayed worker awards the actual first eligible referral purchase even after a later purchase completes", async () => {
  const f = await rewardsFixture();
  try {
    await f.approve({
      ...f.policy,
      referralEnabled: true,
      referralPoints: 250,
    });
    const { code } = await f.call("commercial", "rewards.referral");
    await f.call("customer", "rewards.referral.attribute", { code });
    const first = await f.fulfilled();
    await f.call("finance", "cash.reconcile", {
      id: (await one(
        f.db,
        "SELECT id FROM cash_collections WHERE order_id=$1",
        [first.id],
      ))!.id,
    });
    const second = await f.fulfilled();
    await f.call("finance", "cash.reconcile", {
      id: (await one(
        f.db,
        "SELECT id FROM cash_collections WHERE order_id=$1",
        [second.id],
      ))!.id,
    });
    await f.approve({ ...f.policy, referralEnabled: false, referralPoints: 0 });
    await f.db.transaction(processRewards);
    await f.db.transaction(processRewards);
    assert.equal(await rewardBalance(f.db, f.actors.commercial.id), 250);
    assert.equal(
      (await one(
        f.db,
        "SELECT source_order_id FROM reward_referrals WHERE customer_id=$1",
        [f.actors.customer.id],
      ))!.source_order_id,
      first.id,
    );
  } finally {
    await f.db.close?.();
  }
});
