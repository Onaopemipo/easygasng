import { consolidatedRole } from "../packages/business-rules/src/staff-roles";
import { escalateUnacknowledgedDispatch } from "../apps/web/lib/dispatch-escalation";
import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import sharp from "sharp";
import { createDatabase, migrate, one, type DB } from "../apps/web/lib/db";
import { dispatch } from "../apps/web/lib/service";
import { id, hashPassword, issueSession, actor } from "../apps/web/lib/auth";
import {
  openMessage,
  sealMessage,
  deliverChannels,
  recordMetaWebhook,
  verifyMetaSignature,
  providerAdapters,
} from "../apps/web/lib/channel-messaging";
import { prepareImage } from "../apps/web/lib/media";
import {
  attachDeliveryPhoto,
  photoOrder,
} from "../apps/web/lib/delivery-photos";
import { tripMetrics } from "../packages/business-rules/src/trip-metrics";
process.env.EASYGAS_MESSAGE_ENCRYPTION_KEY ??= "d".repeat(64);
const password = "Fixture-secure-password-123!";
async function setup() {
  const db = await createDatabase("memory://");
  await migrate(db);
  const ids: Record<string, string> = {},
    tokens: Record<string, string> = {};
  for (const role of [
    "owner",
    "finance",
    "driver",
    "manager",
    "customer",
    "sales",
    "dispatcher",
  ]) {
    ids[role] = id();
    await db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,$2,$3,$4,$5,'lagos')",
      [ids[role], role, `${role}-${id()}@fixture.invalid`, hashPassword(password), consolidatedRole(role)],
    );
    tokens[role] = await issueSession(db, ids[role]);
    await db.query("UPDATE sessions SET verified_at=now() WHERE user_id=$1", [
      ids[role],
    ]);
  }
  const call = (role: string, action: string, input: any = {}) =>
    dispatch(action, tokens[role], { operationKey: id(), ...input }, db);
  await db.query("UPDATE settings SET value='true' WHERE key='payment.cod' AND scope='lagos'");
  const order = async (status = "placed") => {
    const oid = id();
    await db.query(
      "INSERT INTO orders(id,reference,customer_id,branch_id,status,delivery_code_hash,delivery_code_expires_at,payment_method,subtotal_kobo,delivery_kobo,total_kobo,address,delivery_date,delivery_window,idempotency_key,request_hash) VALUES($1,$2,$3,'lagos',$4,'fixture',now()+interval '1 day','cash_on_delivery',100000,500000,600000,$5,'2026-12-01','AM',$1,'fixture')",
      [
        oid,
        `OP-${oid}`,
        ids.customer,
        status,
        JSON.stringify({ street: "10 Fixture Road", zone: "Lekki" }),
      ],
    );
    return oid;
  };
  // Read actions do not accept mutation envelopes.
  const read = (role: string, action: string, input: any = {}) =>
    dispatch(action, tokens[role], input, db);
  return { db, ids, tokens, call, read, order };
}

test("OPS-T01: phone activation requires possession, preserves identity, expires/revokes, commits failed attempts and rejects replay", async () => {
  const f = await setup();
  const env = { ...process.env };
  process.env.EASYGAS_MESSAGE_ENCRYPTION_KEY = "a".repeat(64);
  process.env.EASYGAS_SMS_ENABLED = "true";
  try {
    await f.db.query(
      "UPDATE users SET provisional=true,contact_phone='+2348021111118' WHERE id=$1",
      [f.ids.customer],
    );
    for (const purpose of ["transactional", "otp"])
      await f.call("sales", "channels.consent", {
        customerId: f.ids.customer,
        channel: "sms",
        purpose,
        enabled: true,
        evidence: "Customer requested a fixture invitation",
      });
    const oid = await f.order();
    const op = id();
    const invite = await f.call("sales", "phone.invite", {
      orderId: oid,
      operationKey: op,
    });
    assert.equal(invite.queued, true);
    assert.equal(
      (
        await f.call("sales", "phone.invite", {
          orderId: oid,
          operationKey: op,
        })
      ).replayed,
      true,
    );
    const message = await one(
      f.db,
      "SELECT body FROM message_outbox WHERE purpose='transactional' ORDER BY created_at DESC LIMIT 1",
    );
    assert.ok(!message!.body.includes("/activate"));
    const raw = openMessage(message!.body).match(/#([a-f0-9]{64})/)![1];
    assert.equal(
      (
        await dispatch(
          "phone.review",
          null,
          { token: raw, code: "000000" },
          f.db,
        )
      ).ok,
      false,
    );
    await dispatch("phone.otp", null, { token: raw }, f.db);
    const otp = openMessage(
      (await one(
        f.db,
        "SELECT body FROM message_outbox WHERE purpose='otp' LIMIT 1",
      ))!.body,
    ).match(/\b\d{6}\b/)![0];
    const expired = await one(
      f.db,
      "UPDATE phone_activations SET expires_at=now()-interval '1 minute' RETURNING id",
    );
    assert.equal(
      (await dispatch("phone.review", null, { token: raw, code: otp }, f.db))
        .ok,
      false,
    );
    await f.db.query(
      "UPDATE phone_activations SET expires_at=now()+interval '30 minutes',revoked_at=now() WHERE id=$1",
      [expired!.id],
    );
    assert.equal(
      (await dispatch("phone.review", null, { token: raw, code: otp }, f.db))
        .ok,
      false,
    );
    await f.db.query(
      "UPDATE phone_activations SET revoked_at=NULL WHERE id=$1",
      [expired!.id],
    );
    const before = (await one(
      f.db,
      "SELECT otp_attempts FROM phone_activations",
    ))!.otp_attempts;
    await dispatch("phone.review", null, { token: raw, code: "000000" }, f.db);
    assert.equal(
      (await one(f.db, "SELECT otp_attempts FROM phone_activations"))!
        .otp_attempts,
      before + 1,
    );
    assert.equal(
      (await dispatch("phone.review", null, { token: raw, code: otp }, f.db))
        .order.reference,
      `OP-${oid}`,
    );
    const done = await dispatch(
      "phone.complete",
      null,
      { token: raw, code: otp, password, termsAccepted: true },
      f.db,
    );
    assert.equal(done.customerId, f.ids.customer);
    assert.ok(done.token);
    assert.equal(
      (
        await dispatch(
          "phone.complete",
          null,
          { token: raw, code: otp, password, termsAccepted: true },
          f.db,
        )
      ).ok,
      false,
    );
    const u = await one(f.db, "SELECT * FROM users WHERE id=$1", [
      f.ids.customer,
    ]);
    assert.equal(u!.provisional, false);
    assert.ok(u!.phone_verified_at);
    assert.equal(u!.onboarding_version, 1);
    const login = await dispatch(
      "phone.login",
      null,
      { phone: "08021111118", password },
      f.db,
    );
    assert.ok(login.token);
    assert.ok(
      (
        await dispatch(
          "phone.login",
          null,
          { phone: "08021111118", password: "wrong" },
          f.db,
        )
      ).authError,
    );
    assert.equal((await one(f.db, "SELECT count(*) AS n FROM orders"))!.n, 1);
  } finally {
    process.env = env;
    await f.db.close?.();
  }
});

test("OPS-T02: invoice notes need independent approval, never overwrite originals, invalidate stale requests and reject cross-customer access", async () => {
  const f = await setup();
  try {
    const oid = await f.order();
    const original = await f.read("owner", "invoice.issue", { orderId: oid });
    const proposed = await f.call("finance", "invoice.correction.propose", {
      orderId: oid,
      kind: "credit",
      amountKobo: 10000,
      reason: "Correct duplicate accessory charge",
    });
    await assert.rejects(
      () =>
        f.call("finance", "invoice.correction.decide", {
          orderId: oid,
          noteId: proposed.noteId,
          approve: true,
        }),
      /Independent/,
    );
    await f.call("owner", "invoice.correction.decide", {
      orderId: oid,
      noteId: proposed.noteId,
      approve: true,
    });
    assert.equal(
      (await one(f.db, "SELECT total_kobo FROM customer_invoices WHERE id=$1", [
        original.invoice.id,
      ]))!.total_kobo,
      600000,
    );
    const b = await f.read("customer", "invoice.corrections", { orderId: oid });
    assert.equal(b.totalKobo, 590000);
    assert.equal(b.version, 2);
    await assert.rejects(
      () =>
        f.db.query("UPDATE invoice_notes SET amount_kobo=1 WHERE id=$1", [
          proposed.noteId,
        ]),
      /immutable/,
    );
    const request = await f.call("finance", "invoice.request.create", {
      orderId: oid,
    });
    assert.equal(request.onlinePaymentsEnabled, false);
    const persisted = (await one(
      f.db,
      "SELECT result FROM business_operation_results WHERE action='invoice.request.create' LIMIT 1",
    ))!.result;
    assert.equal(persisted.url, undefined);
    assert.ok(persisted.encryptedPaymentUrl);
    assert.ok(!JSON.stringify(persisted).includes("/payment-request"));
    const token = new URL(request.url).hash.split(":")[1];
    assert.equal(
      (
        await f.read("customer", "invoice.request.view", {
          orderId: oid,
          token,
        })
      ).amountDueKobo,
      590000,
    );
    await assert.rejects(() =>
      f.read("sales", "invoice.request.view", { orderId: oid, token }),
    );
    const next = await f.call("finance", "invoice.correction.propose", {
      orderId: oid,
      kind: "debit",
      amountKobo: 20000,
      reason: "Approved correction for omitted item",
    });
    await f.call("owner", "invoice.correction.decide", {
      orderId: oid,
      noteId: next.noteId,
      approve: true,
    });
    await assert.rejects(
      () => f.read("customer", "invoice.request.view", { orderId: oid, token }),
      /expired or changed/,
    );
    await assert.rejects(() =>
      f.call("customer", "invoice.correction.propose", {
        orderId: oid,
        kind: "credit",
        amountKobo: 1,
        reason: "Attempt customer privilege escalation",
      }),
    );
  } finally {
    await f.db.close?.();
  }
});

test("OPS-T03: trip capture is account scoped, replay safe, bounded to duty, and reports actual purchases separately", async () => {
  const f = await setup();
  try {
    const vehicle = await f.call("owner", "fleet.vehicle.create", {
      branchId: "lagos",
      label: "Fixture vehicle",
      capacityGrams: 50000,
      lpgSuitable: true,
      estimatedLitresPer100km: 10,
    });
    const trip = await f.call("driver", "trip.start", {
      vehicleId: vehicle.id,
      startOdometer: 100,
      locationConsent: true,
    });
    const at = new Date().toISOString(),
      event = {
        id: id(),
        sequence: 1,
        kind: "gps",
        recordedAt: at,
        payload: { lat: 6.45, lng: 3.4, accuracy: 10 },
      },
      fuel = {
        id: id(),
        sequence: 2,
        kind: "fuel",
        recordedAt: at,
        payload: { litres: 20, costKobo: 2000000, receipt: "FIXTURE-FUEL-001" },
      };
    await f.call("driver", "trip.sync", {
      tripId: trip.id,
      events: [event, fuel],
    });
    assert.equal(
      (
        await f.call("driver", "trip.sync", {
          tripId: trip.id,
          events: [event],
        })
      ).results[0].replayed,
      true,
    );
    await assert.rejects(
      () =>
        f.call("driver", "trip.sync", {
          tripId: trip.id,
          events: [{ ...event, payload: { ...event.payload, lat: 7 } }],
        }),
      /conflict/,
    );
    await assert.rejects(() =>
      f.call("customer", "trip.sync", { tripId: trip.id, events: [event] }),
    );
    assert.equal((await f.call("driver","trip.sync",{tripId:trip.id,events:[fuel]})).results[0].replayed,true);
    assert.equal(Number((await one(f.db,"SELECT count(*) n FROM trip_events WHERE trip_id=$1 AND kind='fuel'",[trip.id]))!.n),1);
    await assert.rejects(()=>f.call("driver","trip.end",{tripId:trip.id,endOdometer:99}),/at least the start/i);
    await f.call("driver", "trip.end", { tripId: trip.id, endOdometer: 110 });
    await assert.rejects(
      () =>
        f.call("driver", "trip.sync", {
          tripId: trip.id,
          events: [
            {
              ...event,
              id: id(),
              sequence: 3,
              recordedAt: new Date().toISOString(),
            },
          ],
        }),
      /authorised|outside/,
    );
    const summary = await f.read("driver", "fleet.summary");
    assert.equal(summary.trips[0].metrics.odometerKm, 10);
    assert.equal(summary.trips[0].metrics.estimatedLitres, 1);
    assert.equal(summary.trips[0].fuelPurchases[0].litres, 20);
    assert.equal(summary.trips[0].metrics.live, false);
  } finally {
    await f.db.close?.();
  }
});

test("OPS-T04: proof photos are private, append-only, retain historical records and reject invalid image input", async () => {
  const f = await setup();
  try {
    const oid = await f.order("out_for_delivery");
    await f.db.query("UPDATE orders SET driver_id=$1 WHERE id=$2", [
      f.ids.driver,
      oid,
    ]);
    await f.db.query(
      "INSERT INTO delivery_attempts(id,order_id,driver_id,assignment_version,state) VALUES($1,$2,$3,1,'picked_up')",
      [id(), oid, f.ids.driver],
    );
    const driver = await actor(f.db, f.tokens.driver),
      customer = await actor(f.db, f.tokens.customer),
      data = await prepareImage(
        await sharp({
          create: { width: 10, height: 10, channels: 3, background: "green" },
        })
          .png()
          .toBuffer(),
      );
    await assert.rejects(
      () =>
        f.db.transaction((tx) =>
          attachDeliveryPhoto(tx, driver, oid, data, "Fixture proof", false),
        ),
      /consent/,
    );
    const a = await f.db.transaction((tx) =>
      attachDeliveryPhoto(tx, driver, oid, data, "Fixture proof", true),
    );
    const b = await f.db.transaction((tx) =>
      attachDeliveryPhoto(tx, driver, oid, data, "Fixture proof", true),
    );
    assert.equal(a.id, b.id);
    await photoOrder(f.db, customer, oid);
    await assert.rejects(() => photoOrder(f.db, awaitActorPlaceholder(), oid));
    await assert.rejects(
      () => f.db.query("DELETE FROM delivery_photos WHERE id=$1", [a.id]),
      /immutable|Append-only/,
    );
    await assert.rejects(() =>
      prepareImage(
        Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
      ),
    );
    assert.equal(
      (await one(f.db, "SELECT count(*) AS n FROM delivery_photos"))!.n,
      1,
    );
    function awaitActorPlaceholder(): any {
      return { id: id(), role: "customer", branch_id: "lagos" };
    }
  } finally {
    await f.db.close?.();
  }
});

test("OPS-T05: messaging encrypts contents, rechecks consent, quarantines uncertain sends and authenticates/deduplicates callbacks", async () => {
  const f = await setup(),
    env = { ...process.env };
  process.env.EASYGAS_MESSAGE_ENCRYPTION_KEY = "b".repeat(64);
  try {
    assert.equal(openMessage(sealMessage("fixture secret")), "fixture secret");
    assert.deepEqual(providerAdapters({}), {});
    await f.db.query(
      "UPDATE users SET contact_phone='+2348021111118',phone_verified_at=now() WHERE id=$1",
      [f.ids.customer],
    );
    await f.db.query("UPDATE users SET phone_verified_at=now() WHERE id=$1", [
      f.ids.customer,
    ]);
    await f.call("customer", "channels.consent", {
      channel: "sms",
      purpose: "transactional",
      enabled: true,
      evidence: "Customer selected fixture SMS consent",
    });
    const { enqueueChannel } = await import(
      "../apps/web/lib/channel-messaging"
    );
    await f.db.transaction((tx) =>
      enqueueChannel(tx, {
        userId: f.ids.customer,
        channel: "sms",
        purpose: "transactional",
        body: "Fixture account update",
        dedupe: "fixture-1",
      }),
    );
    let sends = 0;
    await f.db.query("UPDATE users SET phone_verified_at=now() WHERE id=$1", [
      f.ids.customer,
    ]);
    await f.call("customer", "channels.consent", {
      channel: "sms",
      purpose: "transactional",
      enabled: false,
      evidence: "Customer withdrew fixture SMS consent",
    });
    await deliverChannels(f.db, {
      sms: {
        async send() {
          sends++;
          return { providerId: "fixture" };
        },
      },
    });
    assert.equal(sends, 0);
    await f.db.query("UPDATE users SET phone_verified_at=now() WHERE id=$1", [
      f.ids.customer,
    ]);
    await f.call("customer", "channels.consent", {
      channel: "sms",
      purpose: "transactional",
      enabled: true,
      evidence: "Customer restored fixture SMS consent",
    });
    await f.db.transaction((tx) =>
      enqueueChannel(tx, {
        userId: f.ids.customer,
        channel: "sms",
        purpose: "transactional",
        body: "Fixture account update",
        dedupe: "fixture-2",
      }),
    );
    const transport = {
      sms: {
        async send() {
          sends++;
          throw new Error("uncertain timeout");
        },
      },
    };
    await deliverChannels(f.db, transport);
    await deliverChannels(f.db, transport);
    assert.equal(sends, 1);
    assert.equal(
      (await one(
        f.db,
        "SELECT delivery_status FROM message_outbox WHERE dedupe_key='fixture-2'",
      ))!.delivery_status,
      "review_required",
    );
    const raw = JSON.stringify({
        object: "whatsapp_business_account",
        entry: [],
      }),
      secret = "fixture-secret";
    const sig =
      "sha256=" + createHmac("sha256", secret).update(raw).digest("hex");
    assert.ok(verifyMetaSignature(raw, sig, secret));
    assert.ok(!verifyMetaSignature(raw + " ", sig, secret));
    const hook = {
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              value: {
                statuses: [
                  {
                    id: "fixture-provider-id",
                    status: "delivered",
                    timestamp: "123",
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    await f.db.transaction((tx) => recordMetaWebhook(tx, hook));
    await f.db.transaction((tx) => recordMetaWebhook(tx, hook));
    assert.equal(
      (await one(f.db, "SELECT count(*) AS n FROM channel_receipts"))!.n,
      1,
    );
  } finally {
    process.env = env;
    await f.db.close?.();
  }
});

test("OPS-T06: GPS rejects impossible jumps and gaps; no distance-derived actual fuel claim", () => {
  const m = tripMetrics(
    [
      { lat: 6, lng: 3, accuracy: 5, recordedAt: "2026-01-01T00:00:00Z" },
      { lat: 40, lng: 80, accuracy: 5, recordedAt: "2026-01-01T00:00:01Z" },
    ],
    100,
    110,
    null,
  );
  assert.equal(m.rejected, 1);
  assert.equal(m.gpsObservedKm, 0);
  assert.equal(m.estimatedLitres, null);
  assert.equal(m.live, false);
});

test("FIELD-GPS-02: fleet summary requires current accurate consented trip evidence and ignores future uploaded fixes", async () => {
  const f = await setup();
  try {
    const vehicle = await f.call("owner", "fleet.vehicle.create", {
      branchId: "lagos",
      label: "Location evidence fixture",
      capacityGrams: 50000,
      lpgSuitable: true,
    });
    const trip = await f.call("driver", "trip.start", {
      vehicleId: vehicle.id,
      startOdometer: 10,
      locationConsent: true,
    });
    const summary = async () =>
      (await f.read("dispatcher", "fleet.summary")).trips.find(
        (t: any) => t.id === trip.id,
      );
    assert.equal((await summary()).connectivity, "location_unavailable");
    await f.call("driver", "trip.sync", {
      tripId: trip.id,
      events: [
        {
          id: id(),
          sequence: 1,
          kind: "gps",
          recordedAt: new Date(Date.now() + 30000).toISOString(),
          payload: { lat: 6.45, lng: 3.4, accuracy: 10 },
        },
      ],
    });
    assert.equal((await summary()).connectivity, "location_unavailable");
    await f.call("driver", "trip.sync", {
      tripId: trip.id,
      events: [
        {
          id: id(),
          sequence: 2,
          kind: "gps",
          recordedAt: new Date().toISOString(),
          payload: { lat: 6.45, lng: 3.4, accuracy: 10 },
        },
      ],
    });
    assert.equal((await summary()).connectivity, "recent_location");
    await f.db.query(
      "UPDATE driver_trips SET location_consent=false WHERE id=$1",
      [trip.id],
    );
    assert.equal((await summary()).connectivity, "location_unavailable");
  } finally {
    await f.db.close?.();
  }
});

test("OPS-T07: enhanced dispatch requires a suitable active trip, records acknowledgement and rejects stale versions", async () => {
  const f = await setup();
  try {
    const oid = await f.order("preparing");
    await f.db.query("UPDATE users SET driver_available=true WHERE id=$1", [f.ids.driver]);
    await assert.rejects(
      () =>
        f.call("dispatcher", "dispatch.assign", {
          orderId: oid,
          driverId: f.ids.driver,
          version: 0,
          reason: "Fixture assignment without a trip",
        }),
      /active.*trip/,
    );
    const vehicle = await f.call("owner", "fleet.vehicle.create", {
      branchId: "lagos",
      label: "Fixture dispatch van",
      capacityGrams: 50000,
      lpgSuitable: true,
    });
    await f.call("driver", "trip.start", {
      vehicleId: vehicle.id,
      startOdometer: 10,
      locationConsent: false,
    });
    const board = await f.read("dispatcher", "dispatch.board");
    assert.ok(
      board.orders.find((o: any) => o.id === oid).recommendations[0].eligible,
    );
    const before = (await one(
      f.db,
      "SELECT tracking_version FROM orders WHERE id=$1",
      [oid],
    ))!.tracking_version;
    await f.call("dispatcher", "dispatch.assign", {
      orderId: oid,
      driverId: f.ids.driver,
      version: before,
      reason: "Assign area-compatible active vehicle",
    });
    const o = await one(f.db, "SELECT * FROM orders WHERE id=$1", [oid]);
    assert.equal(o!.status, "assigned");
    const routingAudit=await one(f.db,"SELECT detail FROM audit_events WHERE action='dispatch.routing_basis' AND target=$1 ORDER BY created_at DESC LIMIT 1",[oid]);
    assert.equal(routingAudit!.detail.reason,"Assign area-compatible active vehicle");
    const attempt = await one(
      f.db,
      "SELECT * FROM delivery_attempts WHERE order_id=$1 AND state='assigned'",
      [oid],
    );
    assert.equal(attempt!.requires_ack, true);
    await assert.rejects(
      () =>
        f.call("driver", "dispatch.respond", {
          orderId: oid,
          version: before,
          decision: "acknowledged",
          reason: "Fixture acknowledgement",
        }),
      /changed/,
    );
    await f.db.query(
      "UPDATE delivery_attempts SET created_at=now()-interval '15 minutes' WHERE id=$1",
      [attempt!.id],
    );
    const operator = await actor(f.db, f.tokens.owner);
    assert.equal(
      (await escalateUnacknowledgedDispatch(f.db, operator!)).escalated,
      1,
    );
    assert.equal(
      (await escalateUnacknowledgedDispatch(f.db, operator!)).escalated,
      0,
    );
    assert.equal(
      (await one(f.db, "SELECT driver_id FROM orders WHERE id=$1", [oid]))!
        .driver_id,
      f.ids.driver,
    );
    await f.call("driver", "dispatch.respond", {
      orderId: oid,
      version: o!.tracking_version,
      decision: "acknowledged",
      reason: "Vehicle and route checked",
    });
    assert.equal(
      (await one(
        f.db,
        "SELECT decision FROM dispatch_responses WHERE attempt_id=$1",
        [attempt!.id],
      ))!.decision,
      "acknowledged",
    );
    await assert.rejects(() =>
      f.call("customer", "dispatch.assign", {
        orderId: oid,
        driverId: f.ids.driver,
        version: o!.tracking_version,
        reason: "Attempt unauthorised assignment",
      }),
    );
  } finally {
    await f.db.close?.();
  }
});

test("OPS-T08: win-back uses true completed delivery timestamps, preserves low-data state and requires marketing consent", async () => {
  const f = await setup(),
    env = { ...process.env };
  process.env.EASYGAS_MESSAGE_ENCRYPTION_KEY = "c".repeat(64);
  try {
    let crm = await f.read("sales", "crm.summary");
    assert.equal(
      crm.customers.find((c: any) => c.id === f.ids.customer).segment,
      "low_data",
    );
    const oid = await f.order("delivered");
    await f.db.query(
      "UPDATE orders SET payment_status='verified',driver_id=$1 WHERE id=$2",
      [f.ids.driver, oid],
    );
    await f.db.query(
      "INSERT INTO delivery_attempts(id,order_id,driver_id,assignment_version,state,completed_at) VALUES($1,$2,$3,1,'delivered',now()-interval '100 days')",
      [id(), oid, f.ids.driver],
    );
    await f.db.query(
      "INSERT INTO verified_payments(id,order_id,reference,amount_kobo,method,verified_by) VALUES($1,$2,$1,600000,'cash',$3)",
      [id(), oid, f.ids.finance],
    );
    await f.db.query(
      "UPDATE settings SET value=$1 WHERE key='crm.retention' AND scope='lagos'",
      [
        JSON.stringify({
          enabled: true,
          atRiskDays: 45,
          dormantDays: 90,
          monthlyBudgetKobo: 100000,
          costCeilingPerMessageKobo: 1000,
        }),
      ],
    );
    await f.db.query(
      "UPDATE users SET contact_phone='+2348021111118',phone_verified_at=now() WHERE id=$1",
      [f.ids.customer],
    );
    crm = await f.read("sales", "crm.summary");
    assert.equal(
      crm.customers.find((c: any) => c.id === f.ids.customer).segment,
      "dormant",
    );
    await assert.rejects(
      () =>
        f.call("sales", "crm.winback.queue", {
          customerId: f.ids.customer,
          channel: "sms",
        }),
      /consent/,
    );
    await f.db.query("UPDATE users SET phone_verified_at=now() WHERE id=$1", [
      f.ids.customer,
    ]);
    await f.call("customer", "channels.consent", {
      channel: "sms",
      purpose: "marketing",
      enabled: true,
      evidence: "Customer independently enabled fixture marketing",
    });
    const a = await f.call("sales", "crm.winback.queue", {
      customerId: f.ids.customer,
      channel: "sms",
    });
    assert.equal(a.queued, true);
    await f.call("sales", "crm.winback.queue", {
      customerId: f.ids.customer,
      channel: "sms",
    });
    assert.equal(
      (await one(
        f.db,
        "SELECT count(*) AS n FROM message_outbox WHERE purpose='marketing'",
      ))!.n,
      1,
    );
    await assert.rejects(() =>
      f.call("sales", "channels.consent", {
        customerId: f.ids.customer,
        channel: "whatsapp",
        purpose: "marketing",
        enabled: true,
        evidence: "Attempt to manufacture marketing consent",
      }),
    );
    // A purchase after queueing suppresses the stale win-back at send time.
    await f.db.query(
      "UPDATE delivery_attempts SET completed_at=now() WHERE order_id=$1",
      [oid],
    );
    let sends = 0;
    await deliverChannels(f.db, {
      sms: {
        async send() {
          sends++;
          return { providerId: "fixture-should-not-send" };
        },
      },
    });
    assert.equal(sends, 0);
    assert.equal(
      (await one(
        f.db,
        "SELECT delivery_status FROM message_outbox WHERE purpose='marketing'",
      ))!.delivery_status,
      "retention_no_longer_eligible",
    );
    const follow = await f.call("sales", "crm.followup.create", {
      customerId: f.ids.customer,
      ownerId: f.ids.sales,
      dueAt: new Date(Date.now() + 86400000).toISOString(),
      nextAction: "Review the next refill requirement",
    });
    await f.call("sales", "crm.followup.outcome", {
      followupId: follow.id,
      outcome: "Customer requested no follow-up",
    });
    await assert.rejects(
      () =>
        f.call("sales", "crm.followup.outcome", {
          followupId: follow.id,
          outcome: "Overwrite a previous recorded outcome",
        }),
      /already/,
    );
  } finally {
    process.env = env;
    await f.db.close?.();
  }
});

test("OPS-T09: doorstep review preserves original order, rejects driver-as-customer consent and never commits unverified van stock", async () => {
  const f = await setup();
  try {
    const oid = await f.order("out_for_delivery");
    await f.db.query("UPDATE orders SET driver_id=$1 WHERE id=$2", [
      f.ids.driver,
      oid,
    ]);
    await f.db.query(
      "INSERT INTO delivery_attempts(id,order_id,driver_id,assignment_version,state) VALUES($1,$2,$3,1,'arrived')",
      [id(), oid, f.ids.driver],
    );
    await f.db.query(
      "UPDATE settings SET value=$1 WHERE key='gas.quantity_policy' AND scope='lagos'",
      [
        JSON.stringify({
          minimumKg: 1,
          maximumKg: 50,
          incrementKg: 0.5,
          precision: 1,
          capacitiesKg: [6, 12.5, 25, 50],
        }),
      ],
    );
    const version = (await one(
      f.db,
      "SELECT tracking_version FROM orders WHERE id=$1",
      [oid],
    ))!.tracking_version;
    const result = await f.call("driver", "doorstep.propose", {
      orderId: oid,
      version,
      lines: [{ capacityKg: 6, kg: 1 }],
    });
    assert.equal(result.additionalDeliveryKobo, 0);
    assert.equal(result.committed, false);
    await assert.rejects(
      () =>
        f.call("driver", "doorstep.consent", {
          orderId: oid,
          amendmentId: result.id,
          consent: true,
        }),
      /customer/,
    );
    await f.call("customer", "doorstep.consent", {
      orderId: oid,
      amendmentId: result.id,
      consent: true,
    });
    await assert.rejects(
      () =>
        f.call("driver", "doorstep.commit", {
          orderId: oid,
          amendmentId: result.id,
        }),
      /not enabled/,
    );
    assert.equal(
      (await one(f.db, "SELECT total_kobo FROM orders WHERE id=$1", [oid]))!
        .total_kobo,
      600000,
    );
    assert.equal(
      (await one(f.db, "SELECT count(*) AS n FROM gas_stock_movements"))!.n,
      0,
    );
  } finally {
    await f.db.close?.();
  }
});

test("OPS-T10: encrypted offline records reject tampering, wrong keys and cross-account decryption", async () => {
  const { sealFieldRecord, openFieldRecord } = await import(
    "../apps/mobile/field-crypto"
  );
  const key = new Uint8Array(32).fill(2),
    nonce = new Uint8Array(24).fill(3),
    user = id();
  const raw = sealFieldRecord(
    {
      id: id(),
      userId: user,
      kind: "photo",
      payload: { base64: "fixture-private-photo" },
    },
    key,
    nonce,
  );
  assert.ok(!raw.includes("fixture-private-photo"));
  assert.equal(openFieldRecord(raw, key, user).kind, "photo");
  assert.throws(() => openFieldRecord(raw, new Uint8Array(32).fill(4), user));
  assert.throws(() => openFieldRecord(raw, key, id()), /account/);
  const tampered = JSON.parse(raw);
  tampered.cipher = "ff" + tampered.cipher.slice(2);
  assert.throws(
    () => openFieldRecord(JSON.stringify(tampered), key, user),
    /authentication/,
  );
});

test("OPS-T11: retain-all policy preserves expired proof bytes without widening access", async () => {
  const f = await setup();
  try {
    const oid = await f.order("out_for_delivery");
    await f.db.query("UPDATE orders SET driver_id=$1 WHERE id=$2", [
      f.ids.driver,
      oid,
    ]);
    await f.db.query(
      "INSERT INTO delivery_attempts(id,order_id,driver_id,assignment_version,state) VALUES($1,$2,$3,1,'picked_up')",
      [id(), oid, f.ids.driver],
    );
    const attempt = await one(
        f.db,
        "SELECT id FROM delivery_attempts WHERE order_id=$1",
        [oid],
      ),
      pid = id();
    await f.db.query(
      "INSERT INTO delivery_photos(id,order_id,attempt_id,actor_id,data,sha256,alt,consent,retain_until) VALUES($1,$2,$3,$4,$5,'fixturehash','Expired fixture proof',true,now()-interval '1 day')",
      [pid, oid, attempt!.id, f.ids.driver, Buffer.from("fixture-bytes")],
    );
    const { purgeExpiredProof } = await import(
      "../apps/web/lib/delivery-photos"
    );
    await f.db.transaction(async (tx) =>
      purgeExpiredProof(tx, await actor(tx, f.tokens.owner)),
    );
    const p = await one(
      f.db,
      "SELECT octet_length(data) AS bytes,sha256,alt FROM delivery_photos WHERE id=$1",
      [pid],
    );
    assert.equal(p!.bytes, Buffer.byteLength("fixture-bytes"));
    assert.equal(p!.sha256, "fixturehash");
    assert.equal(p!.alt, "Expired fixture proof");
    await assert.rejects(
      () =>
        f.db.query(
          "UPDATE delivery_photos SET alt='Replaced evidence' WHERE id=$1",
          [pid],
        ),
      /immutable/,
    );
    await assert.rejects(
      () => f.db.query("DELETE FROM delivery_photos WHERE id=$1", [pid]),
      /immutable/,
    );
  } finally {
    await f.db.close?.();
  }
});
