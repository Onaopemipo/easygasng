import test from "node:test";
import assert from "node:assert/strict";
import { phonePaymentFixture } from "./helpers/phone-order-payment-fixture";
import { one } from "../apps/web/lib/db";
import { id } from "../apps/web/lib/auth";
import { requirePaidPhoneOrder } from "../apps/web/lib/phone-order-payment-state";
import { deliverTransactionalMail } from "../apps/web/lib/transactional-mail";
async function use(
  fn: (f: Awaited<ReturnType<typeof phonePaymentFixture>>) => Promise<void>,
) {
  const env = { ...process.env };
  let f: any;
  try {
    f = await phonePaymentFixture();
    await fn(f);
  } finally {
    await f?.db.close?.();
    process.env = env;
  }
}
test("PPAY-JOURNEY: first-time phone customer completes scoped profile/address, pays, is confirmed once and receives tanker refill with photo before reconciliation/trip end", () =>
  use(async (f) => {
    const trip = await f.start();
    const p = await f.makePhone(true);
    assert.equal(p.o.order_source, "PHONE_ASSISTED");
    assert.equal(p.o.payment_method, "card");
    assert.equal(p.o.status, "placed");
    const sessions = Number(
      (await one(f.db, "SELECT count(*) n FROM sessions"))!.n,
    );
    await assert.rejects(() => f.assign(p.o), /transition|profile|payment/i);
    const view = await f.http("view", { linkId: p.linkId, token: p.token });
    assert.equal(view.status, 200);
    assert.match(view.headers.get("set-cookie")!, /HttpOnly/i);
    assert.doesNotMatch(view.headers.get("set-cookie")!, /easygas_session=/);
    assert.equal(view.body.firstTime, true);
    assert.equal(
      (await f.http("quote", { linkId: p.linkId, requestKey: id() })).status,
      409,
    );
    assert.equal((await f.confirm(p)).status, 200);
    const before = await f.snapshot(p.o.id);
    assert.equal(before.status, "placed");
    assert.equal(before.payment_status, "unpaid");
    const payment = await f.pay(p);
    assert.equal(payment.v.body.status, "paid");
    assert.equal(f.initialized(), 1);
    assert.match(f.callback(), /\/phone-order\?link=/);
    assert(!f.callback().includes(p.token));
    await f.http("initialize", payment.init);
    await f.http("verify", { linkId: p.linkId, intentId: payment.q.body.id });
    const paid = await f.snapshot(p.o.id);
    assert.equal(paid.status, "accepted");
    assert.equal(paid.payment_status, "verified");
    assert.equal(f.initialized(), 1);
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT count(*) n FROM verified_payments WHERE order_id=$1",
          [p.o.id],
        ))!.n,
      ),
      1,
    );
    assert.equal(
      Number((await one(f.db, "SELECT count(*) n FROM sessions"))!.n),
      sessions,
    );
    assert.equal(
      (await one(f.db, "SELECT provisional,verified FROM users WHERE id=$1", [
        p.o.customer_id,
      ]))!.provisional,
      true,
    );
    await f.db.query(
      "UPDATE phone_order_payment_links SET expires_at=now()-interval '1 second' WHERE id=$1",
      [p.linkId],
    );
    await f.transition(p.o, "preparing");
    await f.call("owner", "delivery.coverage.confirm", {
      orderId: p.o.id,
      reason:
        "Synthetic actual address confirmed against approved delivery coverage",
    });
    await f.assign(p.o);
    await f.ack(p.o);
    const load = await f.run("inventory", "bulk.load.issue", {
      tripId: trip.id,
      meterId: f.meter.id,
      grams: 10000,
      meterReadingGrams: 100000,
      orderIds: [p.o.id],
      reason: "Synthetic actual tanker load issued",
    });
    await f.run("driver", "bulk.load.acknowledge", {
      loadId: load.id,
      version: 1,
      returnGrams: 10000,
      meterReadingGrams: 100000,
      reason: "Synthetic driver independently acknowledges mass",
    });
    await f.arrive(p.o);
    await f.run("driver", "bulk.dispense", {
      loadId: load.id,
      version: 2,
      orderId: p.o.id,
      meterReadingGrams: 106000,
      reason: "Synthetic requested6000g supplied at doorstep",
    });
    await f.proof(p.o);
    await f.run("driver", "driver.complete", {
      orderId: p.o.id,
      version: Number((await f.snapshot(p.o.id)).tracking_version),
      handover: true,
    });
    assert.equal((await f.snapshot(p.o.id)).status, "delivered");
    assert.equal(
      Number(
        (await one(f.db, "SELECT count(*) n FROM cylinder_inspections"))!.n,
      ),
      0,
    );
    await f.run("driver", "bulk.return.declare", {
      loadId: load.id,
      version: 3,
      returnGrams: 4000,
      reason: "Synthetic actual measured tank remainder",
    });
    await f.run("inventory", "bulk.return.receive", {
      loadId: load.id,
      version: 4,
      returnGrams: 4000,
      reason: "Synthetic independent exact remainder receipt",
    });
    await f.end();
    assert.equal(await f.trip(), undefined);
  }));
test("PPAY-SECURITY: anonymous link cannot target another order/wallet, claim an account, alter scope/area or bypass incomplete profile, unpaid policy, expiry, revocation or changed source", () =>
  use(async (f) => {
    const p = await f.makePhone();
    assert.equal(
      (await f.http("view", { linkId: p.linkId, token: "0".repeat(64) }))
        .status,
      404,
    );
    assert.equal(
      (await f.http("view", { linkId: p.linkId, token: p.token })).status,
      200,
    );
    assert.equal(
      (
        await f.http("profile", {
          linkId: p.linkId,
          profile: {
            ...p.o.address,
            email: "other@example.test",
            confirmed: true,
          },
        })
      ).status,
      400,
    );
    assert.equal(
      (await f.confirm(p, { email: "wrong@example.test" })).status,
      409,
    );
    assert.equal((await f.confirm(p)).status, 200);
    await f.transition(p.o, "accepted");
    await f.transition(p.o, "preparing");
    await f.start();
    await f.call("owner", "delivery.coverage.confirm", {
      orderId: p.o.id,
      reason: "Synthetic current street address confirmation",
    });
    await assert.rejects(() => f.assign(p.o), /verified.*payment|awaiting/i);
    assert.equal(
      (
        await f.http("quote", {
          linkId: p.linkId,
          requestKey: id(),
          purpose: "wallet",
        })
      ).status,
      400,
    );
    const other = await f.makePhone();
    await f.http("view", { linkId: other.linkId, token: other.token });
    await f.confirm(other);
    const q = await f.http("quote", { linkId: other.linkId, requestKey: id() });
    assert.equal(q.status, 200);
    await f.http("view", { linkId: p.linkId, token: p.token });
    assert.equal(
      (await f.http("status", { linkId: p.linkId, intentId: q.body.id }))
        .status,
      404,
    );
    await f.call("owner", "order.phone.payment.revoke", { orderId: p.o.id });
    assert.equal(
      (await f.http("view", { linkId: p.linkId, token: p.token })).status,
      404,
    );
    const renewed = await f.call("owner", "order.phone.payment.create", {
      orderId: p.o.id,
    });
    const [lid, token] = new URL(renewed.url).hash.slice(1).split(":");
    await f.db.query(
      "UPDATE phone_order_payment_links SET expires_at=now()-interval '1 second' WHERE id=$1",
      [lid],
    );
    assert.equal((await f.http("view", { linkId: lid, token })).status, 404);
    for (const role of ["driver", "customer", "inventory"])
      await assert.rejects(
        () => f.call(role, "order.phone.payment.create", { orderId: p.o.id }),
        (e) => (e as any).status === 403,
      );
  }));
test("PPAY-MESSAGES: encrypted email and WhatsApp requests are retry-safe, honestly queued while disabled, and revoked email links are never delivered", () =>
  use(async (f) => {
    const p = await f.makePhone(true);
    await f.db.query("UPDATE users SET email=$1 WHERE id=$2", [
      "synthetic-link@example.test",
      p.o.customer_id,
    ]);
    delete process.env.EASYGAS_EMAIL_ENABLED;
    delete process.env.EASYGAS_WHATSAPP_ENABLED;
    const body = { orderId: p.o.id, channel: "email", consent: true };
    const a = await f.call("owner", "order.phone.payment.send", body),
      b = await f.call("owner", "order.phone.payment.send", body);
    assert.equal(a.id, b.id);
    assert.equal(a.providerEnabled, false);
    assert.match(a.message, /not been sent/);
    await f.call("owner", "order.phone.payment.send", {
      ...body,
      channel: "whatsapp",
    });
    const rows = (
      await f.db.query(
        "SELECT * FROM message_outbox WHERE dedupe_key LIKE 'phone-order-payment:%'",
      )
    ).rows;
    assert.equal(rows.length, 2);
    assert(
      rows.every((r) => r.body.startsWith("v1:") && !r.body.includes(p.token)),
    );
    await f.call("owner", "order.phone.payment.revoke", { orderId: p.o.id });
    let sent = 0;
    await deliverTransactionalMail(
      f.db,
      {
        send: async () => {
          sent++;
        },
      },
      10,
    );
    assert.equal(sent, 0);
  }));
test("PPAY-VERIFY: pending, mismatched, or browser-asserted payment never confirms an order; exact verified provider evidence posts only once", () =>
  use(async (f) => {
    const p = await f.makePhone();
    await f.http("view", { linkId: p.linkId, token: p.token });
    await f.confirm(p);
    f.alter({ status: "pending" });
    const v = await f.pay(p);
    assert.equal(v.v.body.status, "pending");
    assert.equal((await f.snapshot(p.o.id)).status, "placed");
    assert.equal(
      (
        await f.http("verify", {
          linkId: p.linkId,
          intentId: v.q.body.id,
          status: "paid",
        })
      ).status,
      400,
    );
    f.alter({ amountKobo: 1 });
    const denied = await f.http("verify", {
      linkId: p.linkId,
      intentId: v.q.body.id,
    });
    assert.equal(denied.body.status, "under_review");
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT count(*) n FROM verified_payments WHERE order_id=$1",
          [p.o.id],
        ))!.n,
      ),
      0,
    );
  }));

test("PPAY-EXTRA: a same-visit extra phone order charges no second delivery fee, stays unassigned until payment and then rejoins the original active driver", () =>
  use(async (f) => {
    const parent = await f.make(false, "wallet");
    await f.prepare(parent);
    const trip = await f.start();
    await f.assign(parent);
    const load = await f.run("inventory", "bulk.load.issue", {
      tripId: trip.id,
      meterId: f.meter.id,
      grams: 12000,
      meterReadingGrams: 100000,
      orderIds: [],
      reason: "Synthetic tanker buffer for paid same-visit requests",
    });
    await f.run("driver", "bulk.load.acknowledge", {
      loadId: load.id,
      version: 1,
      returnGrams: 12000,
      meterReadingGrams: 100000,
      reason: "Synthetic actual tanker buffer acknowledged",
    });
    const p = await f.snapshot(parent.id),
      cart = {
        parentOrderId: p.id,
        version: Number(p.tracking_version),
        items: [],
        gasLines: [{ capacityKg: 6, kg: 6 }],
      };
    const quote = await f.call("owner", "order.visit.quote", cart);
    const child = await f.call("owner", "order.visit.create", {
      ...cart,
      quoteHash: quote.quoteHash,
      requestKey: id(),
      reason: "Synthetic customer calls for an extra6000g during current visit",
    });
    assert.equal(child.status, "placed");
    assert.equal((await f.snapshot(child.orderId)).driver_id, null);
    assert.equal(Number((await f.snapshot(child.orderId)).delivery_kobo), 0);
    const [linkId, token] = new URL(child.paymentLink.url).hash
      .slice(1)
      .split(":");
    const o = await f.snapshot(child.orderId),
      c = { o, linkId, token };
    await f.http("view", { linkId, token });
    assert.equal((await f.confirm(c)).status, 200);
    const paid = await f.pay(c);
    assert.equal(paid.v.body.status, "paid");
    const actual = await f.snapshot(child.orderId);
    assert.equal(
      actual.status,
      "assigned",
      JSON.stringify(
        (
          await f.db.query(
            "SELECT action,detail FROM audit_events WHERE target=$1",
            [child.orderId],
          )
        ).rows,
      ),
    );
    assert.equal(actual.driver_id, f.actors.driver.id);
    assert.equal(Number(actual.delivery_kobo), 0);
    assert.equal(actual.gas_lines[0].cylinder_id, null);
  }));

// Explicit compatibility gates: no historical payment is rewritten to satisfy the new flow.
test("PPAY-LEGACY: already-paid pre-migration phone orders remain paid; unpaid legacy COD requests convert explicitly to card without dispatch bypass", () =>
  use(async (f) => {
    const seed = await f.make(false, "wallet");
    const clone = async (paid: boolean) => {
      const oid = id();
      await f.db.query(
        "INSERT INTO orders SELECT (jsonb_populate_record(NULL::orders,to_jsonb(o)||$2::jsonb)).* FROM orders o WHERE o.id=$1",
        [
          seed.id,
          JSON.stringify({
            id: oid,
            reference: "LEGACY-" + oid,
            idempotency_key: oid,
            order_source: "PHONE_ASSISTED",
            assisted_by: f.actors.owner.id,
            assisted_reason: "Synthetic historical phone-order fixture",
            payment_method: paid ? "card" : "cash_on_delivery",
            payment_status: paid ? "verified" : "unpaid",
            created_at: "2020-01-01T00:00:00Z",
          }),
        ],
      );
      if (paid)
        await f.db.query(
          "INSERT INTO verified_payments(id,order_id,reference,amount_kobo,method,verified_by) VALUES($1,$2,$3,$4,'card',$5)",
          [
            id(),
            oid,
            "SYNTHETIC-HISTORICAL-" + oid,
            Number(seed.total_kobo),
            f.actors.owner.id,
          ],
        );
      return f.snapshot(oid);
    };
    const old = await clone(true);
    await requirePaidPhoneOrder(f.db, old);
    const pending = await clone(false);
    await assert.rejects(
      () => requirePaidPhoneOrder(f.db, pending),
      /profile|confirm.*details/i,
    );
    const link = await f.call("owner", "order.phone.payment.create", {
      orderId: pending.id,
    });
    assert.match(link.url, /phone-order#/);
    const now = await f.snapshot(pending.id);
    assert.equal(now.payment_method, "card");
    assert.equal(now.payment_status, "unpaid");
    assert.equal(Number(now.total_kobo), Number(pending.total_kobo));
  }));
test("PPAY-ADDRESS: a customer address correction invalidates the prior coverage confirmation and still requires actual current address review", () =>
  use(async (f) => {
    const p = await f.makePhone(true);
    await f.start();
    await f.call("owner", "delivery.coverage.confirm", {
      orderId: p.o.id,
      reason: "Synthetic original street reviewed against coverage",
    });
    await f.http("view", { linkId: p.linkId, token: p.token });
    assert.equal(
      (await f.confirm(p, { street: "14 Corrected Synthetic Phone Street" }))
        .status,
      200,
    );
    await f.pay(p);
    await f.transition(p.o, "preparing");
    await assert.rejects(() => f.assign(p.o), /coverage|address/i);
    await f.call("owner", "delivery.coverage.confirm", {
      orderId: p.o.id,
      reason:
        "Synthetic corrected actual street confirmed against approved coverage",
    });
    await f.assign(p.o);
    assert.equal((await f.snapshot(p.o.id)).status, "assigned");
  }));
test("PPAY-ORIGIN: foreign origins and oversized or missing capabilities cannot access the private customer order", () =>
  use(async (f) => {
    const p = await f.makePhone();
    assert.equal(
      (
        await f.http(
          "view",
          { linkId: p.linkId, token: p.token },
          { origin: "https://foreign.example.test" },
        )
      ).status,
      403,
    );
    f.clearCookie();
    assert.equal((await f.http("view", { linkId: p.linkId })).status, 401);
    assert.equal(
      (
        await f.http("view", {
          linkId: p.linkId,
          token: p.token,
          oversized: "a".repeat(20000),
        })
      ).status,
      413,
    );
  }));
