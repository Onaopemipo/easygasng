import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers/order-tracking-fixture";
import { enqueueChannel } from "../apps/web/lib/channel-messaging";
import { id } from "../apps/web/lib/auth";
test("CRM-CANCEL01: scoped cancellation stops unsent messages, preserves in-flight/accepted evidence and dedupe reports actual state", async () => {
  const f = await fixture();
  const key = process.env.EASYGAS_MESSAGE_ENCRYPTION_KEY;
  process.env.EASYGAS_MESSAGE_ENCRYPTION_KEY = "f".repeat(64);
  try {
    await f.db.query(
      "INSERT INTO branches(id,name) VALUES('fixture-other','Synthetic other branch')",
    );
    await f.db.query("UPDATE users SET role='manager' WHERE id=$1", [
      f.actors.dispatcher.id,
    ]);
    await f.db.query("UPDATE users SET branch_id='fixture-other' WHERE id=$1", [
      f.actors.commercial.id,
    ]);
    for (const [role, phone] of [
      ["customer", "+2348021111118"],
      ["commercial", "+2348021111119"],
    ]) {
      await f.db.query("UPDATE users SET contact_phone=$1 WHERE id=$2", [
        phone,
        f.actors[role].id,
      ]);
      await f.db.query("UPDATE users SET phone_verified_at=now() WHERE id=$1", [
        f.actors[role].id,
      ]);
      await f.call(role, "channels.consent", {
        channel: "sms",
        purpose: "marketing",
        enabled: true,
        evidence: "Synthetic explicit customer marketing consent",
        operationKey: id(),
      });
    }
    const send = (role: string, suffix: string) =>
      f.db.transaction((tx) =>
        enqueueChannel(tx, {
          userId: f.actors[role].id,
          channel: "sms",
          purpose: "marketing",
          body: "Synthetic test-only win-back message; no provider is invoked.",
          dedupe: `winback:${f.actors[role].id}:${suffix}`,
        }),
      );
    const pending = await send("customer", "pending"),
      leased = await send("customer", "leased"),
      accepted = await send("customer", "accepted");
    await send("commercial", "foreign");
    await f.db.query(
      "UPDATE message_outbox SET lease_until=now()+interval '5 minutes' WHERE id=$1",
      [leased.messageId],
    );
    await f.db.query(
      "UPDATE message_outbox SET status='sent',delivery_status='accepted',provider_message_id='synthetic-only-provider-evidence' WHERE id=$1",
      [accepted.messageId],
    );
    const input = {
      customerId: f.actors.customer.id,
      reason: "Operator stops the unsent synthetic win-back messages",
      operationKey: id(),
    };
    const result = await f.call("dispatcher", "crm.winback.cancel", input);
    assert.equal(result.cancelled, 1);
    assert.equal(result.inFlight, 1);
    assert.equal(result.providerRecallAttempted, false);
    assert.deepEqual(await f.call("dispatcher", "crm.winback.cancel", input), {
      ...result,
      replayed: true,
    });
    const replay = await send("customer", "pending");
    assert.equal(replay.messageId, pending.messageId);
    assert.equal(replay.queued, false);
    assert.equal(replay.status, "cancelled");
    await assert.rejects(
      () =>
        f.call("dispatcher", "crm.winback.cancel", {
          ...input,
          customerId: f.actors.commercial.id,
          operationKey: id(),
        }),
      /not available/,
    );
    await assert.rejects(
      () =>
        f.call("customer", "crm.winback.cancel", {
          ...input,
          operationKey: id(),
        }),
      /permission/,
    );
    const counts = (await f.call("dispatcher", "channels.status")).counts;
    assert.equal(
      counts.reduce((n: number, r: any) => n + Number(r.count), 0),
      3,
    );
    assert.equal(
      (
        await f.db.query(
          "SELECT status,provider_message_id FROM message_outbox WHERE id=$1",
          [accepted.messageId],
        )
      ).rows[0].provider_message_id,
      "synthetic-only-provider-evidence",
    );
    assert.equal(
      (
        await f.db.query("SELECT status FROM message_outbox WHERE id=$1", [
          leased.messageId,
        ])
      ).rows[0].status,
      "pending",
    );
    const summary = await f.call("dispatcher", "crm.summary");
    assert.equal(Number(summary.customers[0].pending_winbacks), 0);
    // One persisted daily message must not consume a second monthly budget unit on retry.
    const o = await f.make();
    await f.db.query(
      "UPDATE orders SET status='delivered',payment_status='verified' WHERE id=$1",
      [o.id],
    );
    await f.db.query(
      "INSERT INTO delivery_attempts(id,order_id,driver_id,assignment_version,state,completed_at) VALUES($1,$2,$3,1,'delivered',now()-interval '100 days')",
      [id(), o.id, f.actors.driver.id],
    );
    const total = (
      await f.db.query("SELECT total_kobo FROM orders WHERE id=$1", [o.id])
    ).rows[0].total_kobo;
    await f.db.query(
      "INSERT INTO verified_payments(id,order_id,reference,amount_kobo,method,verified_by) VALUES($1,$2,$1,$3,'cash',$4)",
      [id(), o.id, total, f.actors.owner.id],
    );
    await f.db.query(
      "UPDATE settings SET value=$1 WHERE key='crm.retention' AND scope='lagos'",
      [
        JSON.stringify({
          enabled: true,
          atRiskDays: 45,
          dormantDays: 90,
          monthlyBudgetKobo: 2000,
          costCeilingPerMessageKobo: 1000,
        }),
      ],
    );
    // Historical accepted+leased count already fills the budget. A pending exact daily key is returned without reserving another unit.
    const day = new Date().toLocaleDateString("en-CA", {
      timeZone: "Africa/Lagos",
    });
    await send("customer", day);
    const retry = await f.call("dispatcher", "crm.winback.queue", {
      customerId: f.actors.customer.id,
      channel: "sms",
      operationKey: id(),
    });
    assert.equal(retry.replayed, true);
    assert.equal(retry.queued, true);
  } finally {
    if (key === undefined) delete process.env.EASYGAS_MESSAGE_ENCRYPTION_KEY;
    else process.env.EASYGAS_MESSAGE_ENCRYPTION_KEY = key;
    await f.db.close?.();
  }
});
