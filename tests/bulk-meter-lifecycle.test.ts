import test from "node:test";
import assert from "node:assert/strict";
import { bulkFixture } from "./helpers/bulk-lpg-fixture";
import { id } from "../apps/web/lib/auth";

test("METER-02: emergency retirement stops dispensing and requires current owner verification and qualification", async () => {
  const before = process.env.EASYGAS_BULK_LPG_ENABLED;
  const f = await bulkFixture();
  try {
    const load = await f.issue();
    await f.call("driver", "bulk.load.acknowledge", {
      loadId: load.id,
      version: 1,
      returnGrams: 10000,
      meterReadingGrams: 100000,
      reason: "Synthetic measured acknowledgement",
      operationKey: id(),
    });
    await f.db.query(
      "UPDATE orders SET status='out_for_delivery' WHERE id=$1",
      [f.order.id],
    );
    const m = (
      await f.db.query("SELECT * FROM bulk_lpg_meters WHERE id=$1", [
        f.meter.id,
      ])
    ).rows[0];
    const retire = () =>
      f.call("owner", "bulk.meter.retire", {
        meterId: m.id,
        expectedCalibrationExpiresAt: new Date(
          m.calibration_expires_at,
        ).toISOString(),
        expectedCalibrationReference: m.calibration_reference,
        reason: "Synthetic emergency equipment defect",
        operationKey: id(),
      });
    await f.db.query(
      "UPDATE sessions SET verified_at=now()-interval '1 day' WHERE user_id=$1",
      [f.actors.owner.id],
    );
    await assert.rejects(retire, /[Vv]erif/);
    await f.db.query("UPDATE sessions SET verified_at=now() WHERE user_id=$1", [
      f.actors.owner.id,
    ]);
    await f.db.query(
      "UPDATE technician_qualifications SET expires_at=now()-interval '1 day' WHERE user_id=$1",
      [f.actors.owner.id],
    );
    await assert.rejects(retire, /qualification/);
    await f.db.query(
      "UPDATE technician_qualifications SET expires_at=now()+interval '1 day' WHERE user_id=$1",
      [f.actors.owner.id],
    );
    await retire();
    await assert.rejects(
      () =>
        f.call("driver", "bulk.dispense", {
          loadId: load.id,
          version: 2,
          orderId: f.order.id,
          meterReadingGrams: 106000,
          reason: "Synthetic retired meter blocked",
          operationKey: id(),
        }),
      /calibration/,
    );
    assert.equal(Number((await f.balance()).grams), 20000);
    assert.equal(Number((await f.balance()).reserved_grams), 10000);
    assert.equal(
      Number(
        (
          await f.db.query(
            "SELECT dispensed_grams FROM bulk_lpg_loads WHERE id=$1",
            [load.id],
          )
        ).rows[0].dispensed_grams,
      ),
      0,
    );
  } finally {
    if (before === undefined) delete process.env.EASYGAS_BULK_LPG_ENABLED;
    else process.env.EASYGAS_BULK_LPG_ENABLED = before;
    await f.db.close?.();
  }
});

test("METER-01: renewed calibration preserves evidence, rejects stale/unauthorised changes and retires without releasing custody", async () => {
  const before = process.env.EASYGAS_BULK_LPG_ENABLED;
  const f = await bulkFixture();
  try {
    const original = (
      await f.db.query("SELECT * FROM bulk_lpg_meters WHERE id=$1", [
        f.meter.id,
      ])
    ).rows[0];
    const request = {
      meterId: f.meter.id,
      expectedCalibrationExpiresAt: new Date(
        original.calibration_expires_at,
      ).toISOString(),
      expectedCalibrationReference: original.calibration_reference,
      calibrationReference:
        "Synthetic independently issued renewal certificate",
      calibrationExpiresAt: new Date(Date.now() + 172800000).toISOString(),
      reason: "Synthetic calibration renewal evidence",
    };
    await assert.rejects(
      () =>
        f.call("driver", "bulk.meter.recalibrate", {
          ...request,
          operationKey: id(),
        }),
      /permission/,
    );
    await assert.rejects(
      () =>
        f.call("owner", "bulk.meter.recalibrate", {
          ...request,
          calibrationExpiresAt: new Date(Date.now() - 86400000).toISOString(),
          operationKey: id(),
        }),
      /future expiry/,
    );
    const key = id();
    await f.call("owner", "bulk.meter.recalibrate", {
      ...request,
      operationKey: key,
    });
    await f.call("owner", "bulk.meter.recalibrate", {
      ...request,
      operationKey: key,
    });
    await assert.rejects(
      () =>
        f.call("owner", "bulk.meter.recalibrate", {
          ...request,
          operationKey: id(),
        }),
      /changed/,
    );
    const history = (
      await f.db.query(
        "SELECT detail FROM audit_events WHERE action='bulk.meter.recalibrate' AND target=$1",
        [f.meter.id],
      )
    ).rows;
    assert.equal(history.length, 1);
    assert.equal(
      history[0].detail.previous.calibrationReference,
      original.calibration_reference,
    );
    const load = await f.issue();
    const current = {
      ...request,
      expectedCalibrationExpiresAt: request.calibrationExpiresAt,
      expectedCalibrationReference: request.calibrationReference,
    };
    await assert.rejects(
      () =>
        f.call("owner", "bulk.meter.recalibrate", {
          ...current,
          operationKey: id(),
        }),
      /Reconcile/,
    );
    await f.call("owner", "bulk.meter.retire", {
      ...current,
      operationKey: id(),
    });
    assert.equal(Number((await f.balance()).reserved_grams), 10000);
    assert.equal(
      (
        await f.db.query("SELECT active FROM bulk_lpg_meters WHERE id=$1", [
          f.meter.id,
        ])
      ).rows[0].active,
      false,
    );
    await assert.rejects(() => f.issue(), /calibrated/);
    await assert.rejects(
      () =>
        f.call("driver", "trip.end", {
          tripId: f.trip.id,
          endOdometer: 11,
          operationKey: id(),
        }),
      /bulk LPG/,
    );
    await f.call("driver", "bulk.return.declare", {
      loadId: load.id,
      version: 1,
      returnGrams: 10000,
      reason: "Synthetic unsafe equipment return",
      operationKey: id(),
    });
    await f.call("inventory", "bulk.return.receive", {
      loadId: load.id,
      version: 2,
      returnGrams: 10000,
      reason: "Synthetic independent equipment return",
      operationKey: id(),
    });
    assert.equal(Number((await f.balance()).reserved_grams), 6000);
    assert.equal(
      (await f.call("owner", "bulk.summary")).meters[0].active,
      false,
    );
    assert.deepEqual((await f.call("driver", "bulk.summary")).meters, []);
  } finally {
    if (before === undefined) delete process.env.EASYGAS_BULK_LPG_ENABLED;
    else process.env.EASYGAS_BULK_LPG_ENABLED = before;
    await f.db.close?.();
  }
});
