import {serviceProof} from "./helpers/service-fixture";
import {authoriseWork} from "./helpers/service-fixture";
import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { createDatabase, migrate } from "../apps/web/lib/db";
import { encryptBackup, decryptBackup } from "../apps/web/lib/backups";
test("encrypted backup verifies authentication and restores the actual database in isolation", async () => {
  const db = await createDatabase("memory://");
  await migrate(db);
  const password = "Backup-test-passphrase-only-123!",
    snapshot = await db.snapshot!(),
    encrypted = encryptBackup(snapshot, password);
  assert.ok(!encrypted.includes(Buffer.from("CREATE TABLE")));
  assert.throws(
    () => decryptBackup(encrypted, "Incorrect-passphrase-123!"),
    /authentication/,
  );
  const changed = Buffer.from(encrypted);
  changed[changed.length - 1] ^= 1;
  assert.throws(() => decryptBackup(changed, password), /authentication/);
  const raw = decryptBackup(encrypted, password),
    restored = await PGlite.create({
      loadDataDir: new Blob([new Uint8Array(raw)]),
    });
  assert.equal(
    (
      await restored.query<{ n: number }>(
        "SELECT count(*)::int AS n FROM products",
      )
    ).rows[0].n,
    12,
  );
  assert.ok(
    (
      await restored.query(
        "SELECT version FROM schema_migrations WHERE version='005'",
      )
    ).rows.length,
  );
  await restored.close();
  await db.close?.();
});
test("encrypted restore preserves completed service reports, verified receipts and immutable history", async () => {
  const { fixture, begin } = await import("./helpers/service-fixture");
  const f = await fixture();
  try {
    const b = await begin(f);
    await f.call("technician", "booking.cash.record", {
      bookingId: b.id,
      amountKobo: 120000,
      reference: "RESTORE-SERVICE-FIXTURE",
    });
    const collection = (
      await f.db.query(
        "SELECT id FROM service_cash_collections WHERE booking_id=$1",
        [b.id],
      )
    ).rows[0];
    await f.call("finance", "booking.cash.verify", {
      bookingId: b.id,
      collectionId: collection.id,
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
          notes: "Restore fixture inspection evidence",
        },
      ],
      findings: "Restore fixture recorded findings",
      workPerformed: "Restore fixture completed work",
      recommendations: "",
    });
    await f.call("customer", "booking.acknowledge", {
      bookingId: b.id,
      accepted: true,
      notes: "Customer acknowledged restore fixture",
    });

    const password = "Service-restore-test-passphrase-123!";
    const encrypted = encryptBackup(await f.db.snapshot!(), password);
    const raw = decryptBackup(encrypted, password);
    const restored = await PGlite.create({
      loadDataDir: new Blob([new Uint8Array(raw)]),
    });
    try {
      assert.equal(
        (
          await restored.query<{ status: string }>(
            "SELECT status FROM service_bookings WHERE id=$1",
            [b.id],
          )
        ).rows[0].status,
        "completed",
      );
      assert.equal(
        Number(
          (
            await restored.query<{ n: string }>(
              "SELECT sum(amount_kobo) AS n FROM verified_payments WHERE booking_id=$1",
              [b.id],
            )
          ).rows[0].n,
        ),
        120000,
      );
      assert.equal(
        (
          await restored.query<{ body: any }>(
            "SELECT body FROM service_reports WHERE booking_id=$1",
            [b.id],
          )
        ).rows[0].body.findings,
        "Restore fixture recorded findings",
      );
      await assert.rejects(
        () =>
          restored.query(
            "UPDATE service_reports SET outcome='unsafe' WHERE booking_id=$1",
            [b.id],
          ),
        /Append-only/,
      );
    } finally {
      await restored.close();
    }
  } finally {
    await f.db.close?.();
  }
});
