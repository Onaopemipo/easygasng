import test from "node:test";
import assert from "node:assert/strict";
import { createDatabase, migrate, one } from "../apps/web/lib/db";
import { dispatch } from "../apps/web/lib/service";
import { id, hashPassword, issueSession } from "../apps/web/lib/auth";
import { publishTrackingNotifications } from "../apps/web/lib/order-tracking";
import { validateServiceOperationRequest } from "../apps/web/lib/business-operation";
import { reconcileTracking } from "../packages/business-rules/src/order-tracking";
import { fixture } from "./helpers/order-tracking-fixture";

test("TRK-01: committed versioned history is immutable and only owned orders are returned", async () => {
  const f = await fixture();
  try {
    const o = await f.assigned();
    const own = await f.call("customer", "orders", { id: o.id });
    assert.equal(own.length, 1);
    assert.equal(own[0].events.length, 4);
    assert.equal(own[0].tracking_version, 4);
    assert.equal(own[0].driver.name, "driver");
    assert.equal(own[0].delivery_code_hash, undefined);
    assert.equal(
      (await f.call("commercial", "orders", { id: o.id })).length,
      0,
    );
    assert.equal(
      (await f.call("driver", "orders"))[0].confirmation_code,
      undefined,
    );
    await assert.rejects(
      () =>
        f.db.query(
          "UPDATE order_events SET note='tampered' WHERE order_id=$1",
          [o.id],
        ),
      /Append-only/,
    );
    assert.equal(
      (await one(
        f.db,
        "SELECT count(*)::int n FROM order_event_outbox WHERE order_id=$1",
        [o.id],
      ))!.n,
      4,
    );
  } finally {
    await f.db.close?.();
  }
});
test("TRK-04: skipped transitions, stale versions, branch and inactive dispatch fail without business effects", async () => {
  const f = await fixture();
  try {
    const o = await f.make();
    const before = await f.snapshot(o.id);
    await assert.rejects(
      () => f.transition(o, "out_for_delivery"),
      /not allowed/,
    );
    await assert.rejects(
      () =>
        f.call("owner", "order.transition", {
          id: o.id,
          status: "accepted",
          note: "Stale request rejected",
          version: 0,
        }),
      /changed/,
    );
    await f.db.query("INSERT INTO branches(id,name) VALUES('other','Other')");
    await f.db.query("UPDATE users SET branch_id='other' WHERE id=$1", [
      f.actors.dispatcher.id,
    ]);
    await assert.rejects(
      () => f.transition(o, "accepted", "dispatcher"),
      /another branch/,
    );
    await f.db.query("UPDATE branches SET active=false WHERE id='lagos'");
    await assert.rejects(() => f.transition(o, "accepted"), /not active/);
    const after = await f.snapshot(o.id);
    assert.equal(after.tracking_version, before.tracking_version);
    assert.deepEqual(after.events, before.events);
    assert.equal(
      (await one(
        f.db,
        "SELECT reserved FROM inventory WHERE product_id='hose' AND branch_id='lagos'",
      ))!.reserved,
      1,
    );
    await f.db.query("UPDATE branches SET active=true WHERE id='lagos'");
    await f.transition(o, "accepted");
  } finally {
    await f.db.close?.();
  }
});
test("TRK-11: pickup requires assignment and exact quantities; completion requires pickup and actual handover", async () => {
  const f = await fixture();
  try {
    const o = await f.assigned();
    await assert.rejects(
      () => f.transition(o, "out_for_delivery", "driver"),
      /pickup manifest/,
    );
    await assert.rejects(
      () =>
        f.call("driver", "delivery.pickup", {
          orderId: o.id,
          version: o.tracking_version,
          manifest: { items: [] },
          reason: "Wrong quantity test",
        }),
      /complete quantities/,
    );
    await assert.rejects(
      () =>
        f.call("inventory", "delivery.pickup", {
          orderId: o.id,
          version: o.tracking_version,
          manifest: o.manifest,
          reason: "Unauthorized pickup test",
        }),
      /permission/,
    );
    await f.pickup(o);
    await f.transition(o, "out_for_delivery", "driver");
    const current = await f.snapshot(o.id);
    const code = (await f.call("customer", "orders", { id: o.id }))[0]
      .confirmation_code;
    await assert.rejects(
      () =>
        f.call("driver", "delivery.complete", {
          orderId: o.id,
          version: current.tracking_version,
          code,
          collectedKobo: Number(o.total_kobo),
        }),
      /actual handover/,
    );
    assert.equal((await f.snapshot(o.id)).status, "out_for_delivery");
  } finally {
    await f.db.close?.();
  }
});
test("TRK-12: proof expires, wrong guesses rate limit, and attempt reassignment rotates the code", async () => {
  const f = await fixture();
  try {
    const o = await f.ready();
    const input = {
      orderId: o.id,
      code: "000000",
      collectedKobo: Number(o.total_kobo),
      handover: true,
    };
    for (let i = 0; i < 5; i++)
      await assert.rejects(
        () => f.call("driver", "delivery.complete", input),
        /incorrect/,
      );
    await assert.rejects(
      () => f.call("driver", "delivery.complete", input),
      /Too many/,
    );
    await f.db.query("DELETE FROM auth_attempts");
    await f.db.query(
      "UPDATE orders SET delivery_code_expires_at=now()-interval '1 second' WHERE id=$1",
      [o.id],
    );
    await assert.rejects(
      () => f.call("driver", "delivery.complete", input),
      /expired/,
    );
    assert.equal(
      (await one(f.db, "SELECT count(*)::int n FROM cash_collections"))!.n,
      0,
    );
  } finally {
    await f.db.close?.();
  }
});
test("TRK-15: stable retries and ambiguous commit recovery produce one stock, cash and handover effect", async () => {
  const f = await fixture();
  try {
    const o = await f.ready();
    const code = (await f.call("customer", "orders", { id: o.id }))[0]
      .confirmation_code;
    const input = {
      orderId: o.id,
      version: o.tracking_version,
      operationKey: id(),
      code,
      collectedKobo: Number(o.total_kobo),
      handover: true,
    };
    await f.call("driver", "delivery.complete", input);
    const recovered = await f.call("driver", "tracking.operation", {
      key: input.operationKey,
    });
    assert.equal(recovered.status, "COMMITTED");
    assert.equal(
      (await f.call("driver", "delivery.complete", input)).replayed,
      true,
    );
    await assert.rejects(
      () =>
        f.call("driver", "delivery.complete", { ...input, collectedKobo: 0 }),
      /identity conflicts/,
    );
    await assert.rejects(
      () => f.call("owner", "delivery.complete", input),
      /identity conflicts/,
    );
    assert.equal(
      (await one(
        f.db,
        "SELECT count(*)::int n FROM cash_collections WHERE order_id=$1",
        [o.id],
      ))!.n,
      1,
    );
    assert.equal(
      (await one(
        f.db,
        "SELECT count(*)::int n FROM delivery_evidence WHERE kind='handover'",
      ))!.n,
      1,
    );
    assert.equal((await f.snapshot(o.id)).payment_status, "collected");
  } finally {
    await f.db.close?.();
  }
});
test("TRK-27: held failed deliveries cannot be reissued or cancelled until physical return reconciliation", async () => {
  const f = await fixture();
  try {
    const o = await f.ready();
    await f.transition(o, "delivery_failed", "driver");
    await assert.rejects(
      () => f.transition(o, "assigned"),
      /Physically receive/,
    );
    await assert.rejects(
      () => f.transition(o, "cancelled"),
      /Physically receive/,
    );
    const failed = await f.snapshot(o.id);
    await f.call("inventory", "delivery.return", {
      orderId: o.id,
      version: failed.tracking_version,
      manifest: failed.manifest,
      reason: "Synthetic full physical receipt and inspection confirmed",
      operationKey: id(),
    });
    await f.transition(o, "assigned");
    const next = await f.snapshot(o.id);
    assert.equal(next.attempt.state, "assigned");
    assert.equal(
      (await one(
        f.db,
        "SELECT count(*)::int n FROM delivery_attempts WHERE order_id=$1",
        [o.id],
      ))!.n,
      2,
    );
    assert.equal(
      (await one(
        f.db,
        "SELECT reserved FROM inventory WHERE product_id='hose' AND branch_id='lagos'",
      ))!.reserved,
      1,
    );
  } finally {
    await f.db.close?.();
  }
});
test("TRK-18: outbox publication survives retry without duplicate in-app messages", async () => {
  const f = await fixture();
  try {
    await f.assigned();
    const before = Number(
      (await one(f.db, "SELECT count(*) n FROM notifications"))!.n,
    );
    await assert.rejects(
      () =>
        f.db.transaction(async (tx) => {
          await publishTrackingNotifications(tx);
          throw new Error("Injected worker crash before commit");
        }),
      /Injected/,
    );
    assert.equal(
      Number((await one(f.db, "SELECT count(*) n FROM notifications"))!.n),
      before,
    );
    await f.db.transaction(publishTrackingNotifications);
    const after = Number(
      (await one(f.db, "SELECT count(*) n FROM notifications"))!.n,
    );
    await f.db.transaction(publishTrackingNotifications);
    assert.equal(
      Number((await one(f.db, "SELECT count(*) n FROM notifications"))!.n),
      after,
    );
    assert.equal(after, before + 4);
  } finally {
    await f.db.close?.();
  }
});
test("TRK-21: snapshots reject older versions and remove revoked assignment records; GPS stays unavailable", () => {
  assert.equal(
    reconcileTracking(
      [{ id: "a", tracking_version: 3 }],
      [{ id: "a", tracking_version: 2 }],
    )[0].tracking_version,
    3,
  );
  assert.deepEqual(
    reconcileTracking([{ id: "a", tracking_version: 3 }], []),
    [],
  );
  assert.throws(
    () => validateServiceOperationRequest("delivery.complete", { version: 1 }),
    /operationKey/,
  );
  assert.throws(
    () =>
      validateServiceOperationRequest("order.transition", {
        operationKey: id(),
      }),
    /version/,
  );
});
test("TRK-09: failed reassignment and rescheduling revalidate capacity with no attempted reservation changes", async () => {
  const f = await fixture();
  try {
    const a = await f.assigned();
    await f.transition(a, "delivery_failed");
    await f.db.query(
      "UPDATE settings SET value='1' WHERE key='delivery.capacity' AND scope='lagos'",
    );
    await f.make();
    const before = await f.snapshot(a.id);
    await assert.rejects(() => f.transition(a, "assigned"), /fully booked/);
    await assert.rejects(
      () =>
        f.call("owner", "delivery.reschedule", {
          orderId: a.id,
          version: before.tracking_version,
          operationKey: id(),
          date: String(before.delivery_date).slice(0, 10),
          window: before.delivery_window,
          reason: "Attempt reschedule into occupied capacity",
        }),
      /fully booked/,
    );
    assert.equal(
      (await f.snapshot(a.id)).tracking_version,
      before.tracking_version,
    );
    await f.db.query(
      "UPDATE settings SET value='10' WHERE key='delivery.capacity' AND scope='lagos'",
    );
    await f.transition(a, "assigned");
    assert.equal((await f.snapshot(a.id)).attempt.state, "assigned");
  } finally {
    await f.db.close?.();
  }
});
test("TRK-20: reassigned branch, revoked session and unrelated driver cannot read or mutate assigned delivery", async () => {
  const f = await fixture();
  try {
    const o = await f.assigned();
    await f.db.query("INSERT INTO branches(id,name) VALUES('other','Other')");
    await f.db.query("UPDATE users SET branch_id='other' WHERE id=$1", [
      f.actors.driver.id,
    ]);
    assert.deepEqual(await f.call("driver", "orders"), []);
    await assert.rejects(
      () =>
        f.call("driver", "delivery.pickup", {
          orderId: o.id,
          version: o.tracking_version,
          manifest: o.manifest,
          reason: "Cross branch driver attempt",
        }),
      /another branch/,
    );
    await f.db.query("UPDATE users SET active=false WHERE id=$1", [
      f.actors.customer.id,
    ]);
    await assert.rejects(
      () => f.call("customer", "orders"),
      /sign in|session|Sign in/i,
    );
  } finally {
    await f.db.close?.();
  }
});
test("TRK-23: API never fabricates GPS, ETA or a proof for an unfulfilled order", async () => {
  const f = await fixture();
  try {
    const o = await f.make();
    const snapshot = await f.snapshot(o.id);
    assert.deepEqual(snapshot.gps, {
      enabled: false,
      status: "unavailable",
      eta: null,
    });
    assert.equal(snapshot.attempt, undefined);
    assert.deepEqual(snapshot.delivery_evidence, []);
  } finally {
    await f.db.close?.();
  }
});
test("TRK-02: linked support requests verify customer ownership and preserve order branch", async () => {
  const f = await fixture();
  try {
    const o = await f.make();
    const payload = {
      orderId: o.id,
      subject: "Delivery change request",
      message: "Please review this synthetic delivery request.",
    };
    await assert.rejects(
      () => f.call("commercial", "support.create", payload),
      /unavailable/,
    );
    assert.equal(
      Number((await one(f.db, "SELECT count(*) n FROM support_requests"))!.n),
      0,
    );
    await f.call("customer", "support.create", payload);
    const ticket = await one(
      f.db,
      "SELECT * FROM support_requests WHERE order_id=$1",
      [o.id],
    );
    assert.equal(ticket!.customer_id, f.actors.customer.id);
    assert.equal(ticket!.branch_id, "lagos");
  } finally {
    await f.db.close?.();
  }
});
test("TRK-31: encrypted isolated restore preserves committed tracking, proof, operation outcome and outbox", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { encryptBackup, decryptBackup } = await import(
    "../apps/web/lib/backups"
  );
  const f = await fixture();
  try {
    const o = await f.ready(),
      code = (await f.call("customer", "orders", { id: o.id }))[0]
        .confirmation_code;
    const key = id();
    await f.call("driver", "delivery.complete", {
      orderId: o.id,
      version: o.tracking_version,
      operationKey: key,
      code,
      collectedKobo: Number(o.total_kobo),
      handover: true,
    });
    const bytes = decryptBackup(
      encryptBackup(await f.db.snapshot!(), "Tracking-backup-only-123!"),
      "Tracking-backup-only-123!",
    );
    const restored = await PGlite.create({
      loadDataDir: new Blob([new Uint8Array(bytes)]),
    });
    try {
      assert.equal(
        (
          await restored.query<any>("SELECT status FROM orders WHERE id=$1", [
            o.id,
          ])
        ).rows[0].status,
        "delivered",
      );
      assert.equal(
        (
          await restored.query<any>(
            "SELECT action FROM business_operation_results WHERE operation_key=$1",
            [key],
          )
        ).rows[0].action,
        "delivery.complete",
      );
      assert.equal(
        (
          await restored.query<any>(
            "SELECT count(*)::int n FROM delivery_evidence WHERE kind='handover'",
          )
        ).rows[0].n,
        1,
      );
      assert.ok(
        Number(
          (
            await restored.query<any>(
              "SELECT count(*) n FROM order_event_outbox",
            )
          ).rows[0].n,
        ) > 0,
      );
      await assert.rejects(
        () =>
          restored.query("DELETE FROM order_events WHERE order_id=$1", [o.id]),
        /Append-only/,
      );
    } finally {
      await restored.close();
    }
  } finally {
    await f.db.close?.();
  }
});
test("TRK-14: assigned driver help opens one branch incident without committing delivery or cash", async () => {
  const f = await fixture();
  try {
    const o = await f.assigned();
    const input = {
      orderId: o.id,
      version: o.tracking_version,
      operationKey: id(),
      reason: "Synthetic driver requests dispatch assistance at assigned stop",
    };
    await f.call("driver", "delivery.help", input);
    await f.call("driver", "delivery.help", input);
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT count(*) n FROM operational_incidents WHERE category='delivery_help'",
        ))!.n,
      ),
      1,
    );
    assert.equal((await f.snapshot(o.id)).status, "assigned");
    assert.equal(
      Number((await one(f.db, "SELECT count(*) n FROM cash_collections"))!.n),
      0,
    );
  } finally {
    await f.db.close?.();
  }
});
test("TRK-20S: real authenticated snapshot stream isolates customer orders and closes after session revocation", async () => {
  const { openTrackingStream } = await import(
    "../apps/web/lib/tracking-stream"
  );
  const f = await fixture();
  try {
    const o = await f.assigned();
    const controller = new AbortController();
    const stream = await openTrackingStream({
      token: f.actors.customer.token,
      signal: controller.signal,
      database: f.db,
      intervalMs: 10,
    });
    const reader = stream.getReader();
    const first = await reader.read();
    const payload = JSON.parse(
      new TextDecoder().decode(first.value).split("data: ")[1].trim(),
    );
    assert.equal(payload.orders.length, 1);
    assert.equal(payload.orders[0].id, o.id);
    assert.equal(payload.orders[0].delivery_code_hash, undefined);
    await f.db.query("UPDATE users SET active=false WHERE id=$1", [
      f.actors.customer.id,
    ]);
    assert.equal((await reader.read()).done, true);
    controller.abort();
    await assert.rejects(
      () =>
        openTrackingStream({
          token: f.actors.customer.token,
          signal: new AbortController().signal,
          database: f.db,
        }),
      /sign in|Sign in|session/,
    );
  } finally {
    await f.db.close?.();
  }
});
test("TRK-rollback: emergency write stop preserves history and rejects fulfilment with no event or stock effects", async () => {
  const f = await fixture(),
    before = process.env.EASYGAS_TRACKING_MUTATIONS_ENABLED;
  try {
    const o = await f.make();
    const snapshot = await f.snapshot(o.id);
    process.env.EASYGAS_TRACKING_MUTATIONS_ENABLED = "false";
    await assert.rejects(() => f.transition(o, "accepted"), /disabled/);
    assert.equal(
      (await f.snapshot(o.id)).tracking_version,
      snapshot.tracking_version,
    );
    assert.equal(
      (await f.call("customer", "orders", { id: o.id }))[0].status,
      "placed",
    );
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT reserved FROM inventory WHERE branch_id='lagos' AND product_id='hose'",
        ))!.reserved,
      ),
      1,
    );
  } finally {
    if (before === undefined)
      delete process.env.EASYGAS_TRACKING_MUTATIONS_ENABLED;
    else process.env.EASYGAS_TRACKING_MUTATIONS_ENABLED = before;
    await f.db.close?.();
  }
});
test("TRK-07: a legacy held failed refill cannot be reissued through another order", async () => {
  const f = await fixture();
  try {
    const held = await f.ready();
    await f.transition(held, "delivery_failed", "driver");
    const other = await f.make();
    await f.transition(other, "accepted");
    await f.transition(other, "preparing");
    const cylinder = id();
    await f.db.query(
      "INSERT INTO cylinders(id,branch_id,serial,size_kg,ownership,status,test_due,customer_id) VALUES($1,'lagos',$2,6,'customer','empty',CURRENT_DATE+365,$3)",
      [cylinder, "TRACKING-HELD-" + id(), f.actors.customer.id],
    );
    for (const order of [held, other])
      await f.db.query(
        "INSERT INTO order_gas_lines(id,order_id,capacity_grams,grams,unit_price_kobo,subtotal_kobo,cylinder_id,inspected_at,allowable_grams,pricing_version) VALUES($1,$2,6000,1000,180000,180000,$3,now(),6000,1)",
        [id(), order.id, cylinder],
      );
    const before = await f.snapshot(other.id);
    await assert.rejects(
      () => f.transition(other, "assigned"),
      /physical delivery custody/,
    );
    assert.equal(
      (await f.snapshot(other.id)).tracking_version,
      before.tracking_version,
    );
    assert.equal((await f.snapshot(held.id)).attempt.state, "failed");
    assert.equal(
      Number((await one(f.db, "SELECT count(*) n FROM cash_collections"))!.n),
      0,
    );
  } finally {
    await f.db.close?.();
  }
});
test("TRK-14F: structured unsafe-cylinder failure creates critical incident and immutable next-step evidence", async () => {
  const f = await fixture();
  try {
    const o = await f.assigned();
    const input = {
      id: o.id,
      status: "delivery_failed",
      version: o.tracking_version,
      operationKey: id(),
      note: "Synthetic fixture unsafe cylinder requires qualified inspection",
      failureReason: "damaged_unsafe_cylinder",
    };
    validateServiceOperationRequest("order.transition", input);
    await f.call("driver", "order.transition", input);
    const incident = await one(
      f.db,
      "SELECT severity,owner_role FROM operational_incidents WHERE category='delivery_failure'",
    );
    assert.equal(incident!.severity, "critical");
    assert.equal(incident!.owner_role, "manager");
    const evidence = await one(
      f.db,
      "SELECT detail FROM delivery_evidence WHERE kind='failed'",
    );
    assert.equal(evidence!.detail.category, "damaged_unsafe_cylinder");
    assert.ok(evidence!.detail.nextAction);
    assert.ok(evidence!.detail.customerSafeMessage);
    assert.throws(
      () =>
        validateServiceOperationRequest("order.transition", {
          ...input,
          failureReason: undefined,
        }),
      /actual delivery failure/,
    );
    assert.throws(
      () =>
        validateServiceOperationRequest("order.transition", {
          ...input,
          failureReason: "invented",
        }),
      /actual delivery failure/,
    );
  } finally {
    await f.db.close?.();
  }
});
