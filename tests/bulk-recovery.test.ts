import test from "node:test";
import assert from "node:assert/strict";
import { bulkFixture } from "./helpers/bulk-lpg-fixture";
import { id } from "../apps/web/lib/auth";

async function held() {
  const f = await bulkFixture();
  const load = await f.issue();
  await f.call("driver", "bulk.return.declare", {
    loadId: load.id,
    version: 1,
    returnGrams: 9000,
    reason: "Synthetic measured return discrepancy",
    operationKey: id(),
  });
  await f.call("inventory", "bulk.return.receive", {
    loadId: load.id,
    version: 2,
    returnGrams: 9000,
    reason: "Synthetic independent return discrepancy",
    operationKey: id(),
  });
  const request = (extra: any = {}) =>
    f.call("inventory", "bulk.recovery.request", {
      loadId: load.id,
      version: 3,
      returnGrams: 9000,
      observedAt: new Date().toISOString(),
      evidence: "Synthetic measured mass investigation certificate",
      reason: "Synthetic confirmed physical variance",
      operationKey: id(),
      ...extra,
    });
  const approve = (requestId: string) =>
    f.call("owner", "approval.decide", {
      id: requestId,
      decision: "approve",
      reason: "Synthetic independent measurement and inventory review",
    });
  return { ...f, load, request, approve };
}

test("RECOVERY-01: shared independent approval atomically reconciles measured loss and releases only vehicle buffer once", async () => {
  const before = process.env.EASYGAS_BULK_LPG_ENABLED;
  const f = await held();
  try {
    await assert.rejects(
      () => f.request({ returnGrams: 20001 }),
      /vehicle capacity/,
    );
    await assert.rejects(
      () =>
        f.request({
          observedAt: new Date(Date.now() - 86400000).toISOString(),
        }),
      /fresh measured/,
    );
    const key = id(),
      observedAt = new Date().toISOString();
    const request = await f.request({ operationKey: key, observedAt });
    await f.request({ operationKey: key, observedAt });
    assert.equal(Number((await f.balance()).grams), 20000);
    assert.equal(Number((await f.balance()).reserved_grams), 10000);
    await assert.rejects(
      () =>
        f.call("inventory", "approval.decide", {
          id: request.requestId,
          decision: "approve",
          reason: "Synthetic self decision must fail",
        }),
      /authority|independent/,
    );
    await f.approve(request.requestId);
    assert.equal(Number((await f.balance()).grams), 19000);
    assert.equal(Number((await f.balance()).reserved_grams), 6000);
    const load = (await f.call("owner", "bulk.summary")).loads[0];
    assert.equal(load.state, "reconciled");
    assert.equal(load.declared_return_grams, 9000);
    assert.equal(
      load.events.filter((e: any) => e.kind === "return.discrepancy").length,
      1,
    );
    assert.equal(
      load.events.filter((e: any) => e.kind === "return.recovered").length,
      1,
    );
    const driverHistory = (
      await f.call("driver", "bulk.summary")
    ).loads[0].events.find((e: any) => e.kind === "return.recovered");
    assert.equal(driverHistory.detail.before, undefined);
    assert.equal(driverHistory.detail.reserved, undefined);
    assert.equal(driverHistory.detail.observedGrams, 9000);
    await assert.rejects(
      () => f.approve(request.requestId),
      /no longer open|already/,
    );
    assert.equal(Number((await f.balance()).grams), 19000);
    await assert.rejects(() => f.request(), /held custody/);
    await f.call("driver", "trip.end", {
      tripId: f.trip.id,
      endOdometer: 11,
      operationKey: id(),
    });
  } finally {
    if (before === undefined) delete process.env.EASYGAS_BULK_LPG_ENABLED;
    else process.env.EASYGAS_BULK_LPG_ENABLED = before;
    await f.db.close?.();
  }
});

test("RECOVERY-02: changed balances, stale versions and disabled release cannot activate a stock recovery", async () => {
  const before = process.env.EASYGAS_BULK_LPG_ENABLED;
  const f = await held();
  try {
    await assert.rejects(() => f.request({ version: 2 }), /held custody/);
    const request = await f.request();
    await f.db.query(
      "UPDATE gas_stock SET grams=grams+100 WHERE branch_id='lagos'",
    );
    const failed = await f.approve(request.requestId);
    assert.equal(failed.status, "failed");
    assert.match(failed.failure_reason, /stock changed/);
    assert.equal(Number((await f.balance()).grams), 20100);
    assert.equal(Number((await f.balance()).reserved_grams), 10000);
    assert.equal(
      (await f.call("owner", "bulk.summary")).loads[0].state,
      "held",
    );
    await f.db.query(
      "UPDATE gas_stock SET grams=grams-100 WHERE branch_id='lagos'",
    );
    process.env.EASYGAS_BULK_LPG_ENABLED = "false";
    const disabled = await f.call("owner", "approval.retry", {
      id: request.requestId,
      reason: "Synthetic retry with release disabled",
    });
    assert.equal(disabled.status, "failed");
    assert.match(disabled.failure_reason, /release approval/);
    assert.equal(Number((await f.balance()).reserved_grams), 10000);
  } finally {
    if (before === undefined) delete process.env.EASYGAS_BULK_LPG_ENABLED;
    else process.env.EASYGAS_BULK_LPG_ENABLED = before;
    await f.db.close?.();
  }
});

test("RECOVERY-03: future measurements, insufficient reserved stock and expired maker qualifications fail closed", async () => {
  const before = process.env.EASYGAS_BULK_LPG_ENABLED;
  const f = await held();
  try {
    await assert.rejects(
      () =>
        f.request({ observedAt: new Date(Date.now() + 3600000).toISOString() }),
      /fresh measured/,
    );
    await assert.rejects(
      () => f.call("customer", "bulk.recovery.request", { operationKey: id() }),
      /permission/,
    );
    await f.db.query(
      "UPDATE gas_stock SET grams=10000 WHERE branch_id='lagos'",
    );
    await assert.rejects(() => f.request({ returnGrams: 0 }), /reserved stock/);
    await f.db.query(
      "UPDATE gas_stock SET grams=20000 WHERE branch_id='lagos'",
    );
    const request = await f.request();
    await f.db.query(
      "UPDATE technician_qualifications SET expires_at=now()-interval '1 day' WHERE user_id=$1",
      [f.actors.inventory.id],
    );
    const failed = await f.approve(request.requestId);
    assert.equal(failed.status, "failed");
    assert.match(failed.failure_reason, /qualification/);
    assert.equal(Number((await f.balance()).grams), 20000);
    assert.equal(Number((await f.balance()).reserved_grams), 10000);
    await f.db.query(
      "UPDATE technician_qualifications SET expires_at=now()+interval '1 day' WHERE user_id=$1",
      [f.actors.inventory.id],
    );
    // A fresh proposal is possible after an old review failed. Only the first
    // valid version may activate, even if multiple reviews were submitted.
    const fresh = await f.request();
    assert.notEqual(fresh.requestId, request.requestId);
    await f.approve(fresh.requestId);
    const stale = await f.call("owner", "approval.retry", {
      id: request.requestId,
      reason: "Synthetic stale recovery must not execute again",
    });
    assert.equal(stale.status, "failed");
    assert.equal(Number((await f.balance()).grams), 19000);
  } finally {
    if (before === undefined) delete process.env.EASYGAS_BULK_LPG_ENABLED;
    else process.env.EASYGAS_BULK_LPG_ENABLED = before;
    await f.db.close?.();
  }
});
