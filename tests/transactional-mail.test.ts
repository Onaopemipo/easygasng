import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers/order-tracking-fixture";
import { id } from "../apps/web/lib/auth";
import { one } from "../apps/web/lib/db";
import { queueMessage } from "../apps/web/lib/accounts";
import {
  deliverTransactionalMail,
  smtpTransport,
} from "../apps/web/lib/transactional-mail";
test("PR-05: SMTP outbox sends once, never retries unknown outcomes, rejects unauthorised retry and preserves private message content", async () => {
  const f = await fixture();
  try {
    let sent = 0;
    const transport = {
      async send() {
        sent++;
      },
    };
    const first = id();
    await queueMessage(
      f.db,
      f.actors.customer.id,
      "fixture@example.test",
      "Fixture only",
      "private-token-not-for-report",
      first,
    );
    assert.equal((await deliverTransactionalMail(f.db, null)).accepted, 0);
    assert.equal(sent, 0);
    assert.equal((await deliverTransactionalMail(f.db, transport)).accepted, 1);
    assert.equal((await deliverTransactionalMail(f.db, transport)).accepted, 0);
    assert.equal(sent, 1);
    await queueMessage(
      f.db,
      f.actors.customer.id,
      "fixture@example.test",
      "Fixture only",
      "private-token-not-for-report",
      id(),
    );
    const unknown = {
      async send() {
        throw new Error("SMTP password=never-log-this");
      },
    };
    assert.equal((await deliverTransactionalMail(f.db, unknown)).review, 1);
    assert.equal((await deliverTransactionalMail(f.db, transport)).accepted, 0);
    const failed = await one(
      f.db,
      "SELECT id FROM message_outbox WHERE status='failed'",
    );
    await assert.rejects(
      () => f.call("customer", "mail.status", {}),
      /permission|authoris|access/i,
    );
    await assert.rejects(
      () =>
        f.call("owner", "mail.retry", {
          id: failed!.id,
          reason: "Reviewed synthetic delivery failure",
          acknowledgePossibleDuplicate: true,
        }),
      /verify|password/i,
    );
    await f.call("owner", "reauth", { password: "Tracking-fixture-only-123!" });
    await assert.rejects(() =>
      f.call("owner", "mail.retry", {
        id: failed!.id,
        reason: "Reviewed synthetic delivery failure",
        acknowledgePossibleDuplicate: false,
      }),
    );
    await f.call("owner", "mail.retry", {
      id: failed!.id,
      reason: "Reviewed synthetic delivery failure",
      acknowledgePossibleDuplicate: true,
    });
    assert.equal((await deliverTransactionalMail(f.db, transport)).accepted, 1);
    const report = JSON.stringify(await f.call("owner", "mail.status", {}));
    assert.ok(
      !report.includes("private-token") &&
        !report.includes("fixture@example.test"),
    );
    const incidents = JSON.stringify(
      (
        await f.db.query(
          "SELECT detail FROM operational_incidents WHERE category='mail_delivery_review'",
        )
      ).rows,
    );
    assert.ok(!incidents.includes("never-log-this"));
  } finally {
    await f.db.close?.();
  }
});
test("PR-06: expired recovery messages cancel, explicit SMTP rejection backs off, and insecure SMTP configuration is refused", async () => {
  const f = await fixture();
  try {
    assert.equal(
      smtpTransport({ EASYGAS_EMAIL_ENABLED: "false" } as any),
      null,
    );
    assert.throws(() =>
      smtpTransport({
        EASYGAS_EMAIL_ENABLED: "true",
        SMTP_HOST: "smtp.example.test",
        SMTP_PORT: "25",
        SMTP_FROM: "sender@example.test",
        SMTP_USER: "fixture",
        SMTP_PASSWORD: "fixture",
      } as any),
    );
    const cid = id();
    await f.db.query(
      "INSERT INTO account_challenges(id,user_id,purpose,token_hash,expires_at) VALUES($1,$2,'reset',$3,now()-interval '1 hour')",
      [cid, f.actors.customer.id, id()],
    );
    await queueMessage(
      f.db,
      f.actors.customer.id,
      "fixture@example.test",
      "Expired fixture",
      "expired token",
      "challenge:" + cid,
    );
    let sent = 0;
    await deliverTransactionalMail(f.db, {
      async send() {
        sent++;
      },
    });
    assert.equal(sent, 0);
    assert.equal(
      (await one(
        f.db,
        "SELECT status FROM message_outbox WHERE dedupe_key=$1",
        ["challenge:" + cid],
      ))!.status,
      "cancelled",
    );
    await queueMessage(
      f.db,
      f.actors.customer.id,
      "fixture@example.test",
      "Rejected fixture",
      "fixture only",
      id(),
    );
    assert.equal(
      (
        await deliverTransactionalMail(f.db, {
          async send() {
            throw Object.assign(new Error("rejected"), { responseCode: 451 });
          },
        })
      ).retry,
      1,
    );
    assert.equal(
      (
        await deliverTransactionalMail(f.db, {
          async send() {
            sent++;
          },
        })
      ).accepted,
      0,
    );
  } finally {
    await f.db.close?.();
  }
});
