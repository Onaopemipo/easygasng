import {serviceProof} from "./helpers/service-fixture";
import { test } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { fixture, begin , authoriseWork } from "./helpers/service-fixture";
import { dispatch } from "../apps/web/lib/service";
import { id } from "../apps/web/lib/auth";
import { one, type DB, type SQL } from "../apps/web/lib/db";
import { encryptBackup, decryptBackup } from "../apps/web/lib/backups";
function faultDatabase(db: DB, match: string, afterCommit = false): DB {
  let fired = false;
  return {
    ...db,
    transaction: async (fn) => {
      const result = await db.transaction((tx) =>
        fn({
          exec: (q) => tx.exec(q),
          query: async (q, p) => {
            const r = await tx.query(q, p);
            if (!afterCommit && !fired && q.includes(match)) {
              fired = true;
              throw Object.assign(new Error("Injected database interruption"), {
                code: "ECONNRESET",
              });
            }
            return r;
          },
        } as SQL),
      );
      if (afterCommit && !fired) {
        fired = true;
        throw Object.assign(new Error("Injected lost commit acknowledgement"), {
          code: "ECONNRESET",
        });
      }
      return result;
    },
  };
}
async function count(db: SQL, table: string) {
  return Number((await one(db, `SELECT count(*) n FROM ${table}`))!.n);
}
test("EO-01: sequential and concurrent same-key retries recover one authoritative booking; conflicts and cross-customer reuse reject", async () => {
  const f = await fixture();
  try {
    const request = { ...f.input(), operationKey: id() };
    const results = await Promise.all([
      f.call("customer", "booking.create", request),
      f.call("customer", "booking.create", request),
    ]);
    assert.equal(results[0].id, results[1].id);
    assert.equal(await count(f.db, "service_bookings"), 1);
    assert.equal(await count(f.db, "business_operation_results"), 1);
    const replay = await f.call("customer", "booking.create", request);
    assert.equal(replay.id, results[0].id);
    await assert.rejects(
      f.call("customer", "booking.create", {
        ...request,
        notes: "Changed request",
      }),
      /conflict/i,
    );
    await assert.rejects(
      f.call("commercial", "booking.create", request),
      /conflict/i,
    );
    const outcome = await f.call("customer", "booking.operation", {
      key: request.operationKey,
    });
    assert.equal(outcome.status, "COMMITTED");
    assert.equal(outcome.result.id, results[0].id);
    assert.equal(
      (
        await f.call("commercial", "booking.operation", {
          key: request.operationKey,
        })
      ).status,
      "NOT_FOUND",
    );
    assert.equal(
      (
        await f.call("customer", "booking.recover", {
          key: request.idempotencyKey,
        })
      ).id,
      results[0].id,
    );
    assert.equal(
      (
        await f.call("commercial", "booking.recover", {
          key: request.idempotencyKey,
        })
      ).status,
      "NOT_FOUND",
    );
    const admin = await f.call("owner", "bookings"),
      customer = await f.call("customer", "bookings");
    assert.equal(admin[0].id, customer[0].id);
    assert.equal(customer[0].technician.name, "technician");
    const next = await f.call("customer", "customer.dashboard", {
      widget: "appointment",
    });
    assert.equal(next.id, customer[0].id);
  } finally {
    await f.db.close?.();
  }
});
test("EO-03: injected failure after outbox write rolls back booking, capacity, operation result, notifications and money", async () => {
  const f = await fixture();
  try {
    const request = { ...f.input(), operationKey: id() };
    const before = {
      events: await count(f.db, "service_booking_events"),
      notifications: await count(f.db, "notifications"),
      outbox: await count(f.db, "message_outbox"),
      wallet: await count(f.db, "wallet_entries"),
    };
    await assert.rejects(
      dispatch(
        "booking.create",
        f.actors.customer.token,
        request,
        faultDatabase(f.db, "INSERT INTO message_outbox"),
      ),
      /Injected/,
    );
    assert.equal(await count(f.db, "service_bookings"), 0);
    assert.equal(await count(f.db, "business_operation_results"), 0);
    assert.equal(await count(f.db, "service_booking_events"), before.events);
    assert.equal(await count(f.db, "notifications"), before.notifications);
    assert.equal(await count(f.db, "message_outbox"), before.outbox);
    assert.equal(await count(f.db, "wallet_entries"), before.wallet);
    assert.equal(await count(f.db, "verified_payments"), 0);
    const result = await f.call("customer", "booking.create", request);
    assert.ok(result.id);
  } finally {
    await f.db.close?.();
  }
});
test("EO-04: lost commit acknowledgement is reconciled using the persisted result without another business event", async () => {
  const f = await fixture();
  try {
    const request = { ...f.input(), operationKey: id() };
    await assert.rejects(
      dispatch(
        "booking.create",
        f.actors.customer.token,
        request,
        faultDatabase(f.db, "", true),
      ),
      /Injected/,
    );
    const events = await count(f.db, "service_booking_events"),
      outbox = await count(f.db, "message_outbox");
    const recovered = await f.call("customer", "booking.create", request);
    assert.equal(recovered.replayed, true);
    assert.equal(await count(f.db, "service_bookings"), 1);
    assert.equal(await count(f.db, "service_booking_events"), events);
    assert.equal(await count(f.db, "message_outbox"), outbox);
  } finally {
    await f.db.close?.();
  }
});
test("RC-04: failed and competing rescheduling preserve a single capacity allocation and reject stale cancellation", async () => {
  const f = await fixture();
  try {
    const original = await f.call("customer", "booking.create", f.input());
    const b = (await f.call("customer", "bookings"))[0];
    const next = await f.createSlot(3),
      later = await f.createSlot(6);
    const request = {
      bookingId: b.id,
      slotId: next.id,
      version: b.version,
      reason: "Customer requests a different time",
      operationKey: id(),
    };
    await assert.rejects(
      dispatch(
        "booking.reschedule",
        f.actors.customer.token,
        request,
        faultDatabase(f.db, "INSERT INTO message_outbox"),
      ),
      /Injected/,
    );
    assert.equal((await f.call("customer", "bookings"))[0].slot_id, b.slot_id);
    const attempts = await Promise.allSettled([
      f.call("customer", "booking.reschedule", request),
      f.call("customer", "booking.reschedule", {
        ...request,
        slotId: later.id,
        operationKey: id(),
      }),
    ]);
    assert.equal(attempts.filter((a) => a.status === "fulfilled").length, 1);
    await assert.rejects(
      f.call("customer", "booking.cancel", {
        bookingId: b.id,
        version: b.version,
        reason: "Stale cancellation request",
        operationKey: id(),
      }),
      /Refresh/,
    );
    const updated = (await f.call("customer", "bookings"))[0];
    assert.notEqual(updated.slot_id, b.slot_id);
    const cancel = {
      bookingId: b.id,
      version: updated.version,
      reason: "Customer no longer needs appointment",
      operationKey: id(),
    };
    await f.call("customer", "booking.cancel", cancel);
    await f.call("customer", "booking.cancel", cancel);
    assert.equal((await f.call("customer", "bookings"))[0].status, "cancelled");
    assert.equal(await count(f.db, "verified_payments"), 0);
    assert.ok(
      (
        await f.call("customer", "services.slots", {
          serviceId: b.service_id,
          branchId: b.branch_id,
        })
      ).some((s: any) => s.id === b.slot_id),
    );
  } finally {
    await f.db.close?.();
  }
});
test("RC-15: encrypted backup restores booking, operation, quotation, inventory, notifications and audit relationships", async () => {
  const f = await fixture();
  let restored: PGlite | undefined;
  try {
    const request = { ...f.input(), operationKey: id() },
      saved = await f.call("customer", "booking.create", request);
    for (const status of ["confirmed", "assigned"])
      await f.call("service_manager", "booking.transition", {
        bookingId: saved.id,
        status,
        reason: "Synthetic restore fixture service confirmation",
      });
    for (const status of ["en_route", "in_progress"])
      await f.call("technician", "booking.transition", {
        bookingId: saved.id,
        status,
        reason: "Synthetic restore fixture technician arrival",
      });
    const quote = await f.call("technician", "booking.quote", {
      bookingId: saved.id,
      labourKobo: 100000,
      lines: [],
      notes: "Synthetic quotation retained in encrypted restoration",
    });
    await f.call("customer", "booking.quote.decide", {
      bookingId: saved.id,
      quoteId: quote.id,
      approved: true,
    });
    await authoriseWork(f,saved.id);
    await serviceProof(f,saved.id);
    await f.call("technician", "booking.report", {
      bookingId: saved.id,
      outcome: "success",
      responses: [
        {
          id: "equipment_check",
          passed: true,
          notes: "Synthetic restore fixture inspection evidence",
        },
      ],
      findings: "Synthetic recorded service findings",
      workPerformed: "Synthetic documented service work",
      recommendations: "",
    });
    await f.call("customer", "booking.acknowledge", {
      bookingId: saved.id,
      accepted: true,
      notes: "Synthetic customer acknowledgement for restoration",
    });
    const tables = [
      "service_quotes",
      "service_quote_decisions",
      "service_reports",
      "service_acknowledgements",
      "users",
      "service_bookings",
      "service_booking_events",
      "business_operation_results",
      "message_outbox",
      "audit_events",
      "inventory",
      "wallet_entries",
      "verified_payments",
    ];
    const before = Object.fromEntries(
      await Promise.all(tables.map(async (t) => [t, await count(f.db, t)])),
    );
    const backup = encryptBackup(
      await f.db.snapshot!(),
      "Synthetic-restore-passphrase-123!",
    );
    assert.throws(() =>
      decryptBackup(backup, "Wrong-synthetic-passphrase-123!"),
    );
    restored = await PGlite.create({
      loadDataDir: new Blob([
        new Uint8Array(
          decryptBackup(backup, "Synthetic-restore-passphrase-123!"),
        ),
      ]),
    });
    for (const t of tables)
      assert.equal(
        Number(
          (await restored.query(`SELECT count(*) n FROM ${t}`)).rows[0] &&
            (await restored.query<{ n: string }>(`SELECT count(*) n FROM ${t}`))
              .rows[0].n,
        ),
        before[t],
      );
    const persisted = (
      await restored.query<any>(
        "SELECT result FROM business_operation_results WHERE operation_key=$1",
        [request.operationKey],
      )
    ).rows[0];
    assert.equal(persisted.result.id, saved.id);
    assert.equal(
      (
        await restored.query(
          "SELECT b.id FROM service_bookings b JOIN service_slots s ON s.id=b.slot_id JOIN users u ON u.id=b.customer_id WHERE b.id=$1",
          [saved.id],
        )
      ).rows.length,
      1,
    );
  } finally {
    await restored?.close();
    await f.db.close?.();
  }
});
test("BK-23: communication opt-out is respected while in-app history remains authoritative", async () => {
  const f = await fixture();
  try {
    await f.db.query(
      "INSERT INTO communication_preferences(user_id,service_reminders) VALUES($1,false)",
      [f.actors.customer.id],
    );
    const request = f.input();
    await f.call("customer", "booking.create", request);
    assert.equal(await count(f.db, "message_outbox"), 0);
    assert.ok((await f.call("customer", "bookings"))[0].events.length);
    assert.ok(await count(f.db, "notifications"));
  } finally {
    await f.db.close?.();
  }
});
test("EO-09: approval and material issue retries have one inventory effect; expired quotations cannot authorise work", async () => {
  const f = await fixture();
  try {
    const b = await begin(f);
    await f.db.query(
      "UPDATE inventory SET quantity=10,price_kobo=5000,published=true WHERE branch_id='lagos' AND product_id='hose'",
    );
    const quote = await f.call("technician", "booking.quote", {
      bookingId: b.id,
      labourKobo: 150000,
      lines: [{ productId: "hose", quantity: 2 }],
      notes: "Documented replacement materials",
      operationKey: id(),
    });
    const decision = {
      bookingId: b.id,
      quoteId: quote.id,
      approved: true,
      operationKey: id(),
    };
    await assert.rejects(
      dispatch(
        "booking.quote.decide",
        f.actors.customer.token,
        decision,
        faultDatabase(f.db, "INSERT INTO service_materials"),
      ),
      /Injected/,
    );
    assert.equal(
      (await one(
        f.db,
        "SELECT reserved FROM inventory WHERE branch_id='lagos' AND product_id='hose'",
      ))!.reserved,
      0,
    );
    assert.equal(await count(f.db, "service_quote_decisions"), 0);
    await f.call("customer", "booking.quote.decide", decision);
    await f.call("customer", "booking.quote.decide", decision);
    await authoriseWork(f,b.id);
    const material = await one(
      f.db,
      "SELECT id FROM service_materials WHERE booking_id=$1",
      [b.id],
    );
    const issue = {
      bookingId: b.id,
      materialId: material!.id,
      unitCostKobo: 3000,
      operationKey: id(),
    };
    await f.call("inventory", "service.material.issue", issue);
    const quantity = (await one(
      f.db,
      "SELECT quantity FROM inventory WHERE branch_id='lagos' AND product_id='hose'",
    ))!.quantity;
    await f.call("inventory", "service.material.issue", issue);
    assert.equal(
      (await one(
        f.db,
        "SELECT quantity FROM inventory WHERE branch_id='lagos' AND product_id='hose'",
      ))!.quantity,
      quantity,
    );
    const customer = (await f.call("customer", "bookings"))[0];
    assert.equal(customer.materials[0].unit_cost_kobo, undefined);
    assert.equal(customer.technician_id, undefined);
    const second = await f.createSlot(3);
    const other = await f.call(
      "commercial",
      "booking.create",
      f.input(second.id),
    );
    for (const status of ["confirmed", "assigned"])
      await f.call("service_manager", "booking.transition", {
        bookingId: other.id,
        status,
        reason: "Test authorised service transition",
      });
    for (const status of ["en_route", "in_progress"])
      await f.call("technician", "booking.transition", {
        bookingId: other.id,
        status,
        reason: "Test authorised technician arrival",
      });
    await f.call("technician", "booking.quote", {
      bookingId: other.id,
      labourKobo: 10000,
      lines: [],
      notes: "Initial assessed quotation",
    });
    const expiredId = id();
    await f.db.query(
      "INSERT INTO service_quotes(id,booking_id,revision,labour_kobo,callout_kobo,total_kobo,lines,notes,created_by,valid_until) VALUES($1,$2,2,10000,20000,30000,'[]','Synthetic expired quote',$3,now()-interval '1 hour')",
      [expiredId, other.id, f.actors.technician.id],
    );
    await assert.rejects(
      f.call("commercial", "booking.quote.decide", {
        bookingId: other.id,
        quoteId: expiredId,
        approved: true,
        operationKey: id(),
      }),
      /expired/,
    );
    assert.equal(
      (await one(
        f.db,
        "SELECT count(*)::int n FROM service_quote_decisions WHERE quote_id=$1",
        [expiredId],
      ))!.n,
      0,
    );
  } finally {
    await f.db.close?.();
  }
});
test("RC-10: interrupted report publication preserves in-progress work; unsafe completion is rejected; permission revocation blocks recovery", async () => {
  const f = await fixture();
  try {
    const b = await begin(f);
    await authoriseWork(f,b.id);
    await serviceProof(f,b.id);
    const request = {
      bookingId: b.id,
      outcome: "success",
      responses: [
        {
          id: "equipment_check",
          passed: true,
          notes: "Recorded synthetic inspection evidence",
        },
      ],
      findings: "Documented synthetic service findings",
      workPerformed: "Documented synthetic approved work",
      recommendations: "",
      operationKey: id(),
    };
    await assert.rejects(
      dispatch(
        "booking.report",
        f.actors.technician.token,
        request,
        faultDatabase(f.db, "INSERT INTO service_reports"),
      ),
      /Injected/,
    );
    assert.equal(await count(f.db, "service_reports"), 0);
    assert.equal(
      (await f.call("customer", "bookings"))[0].status,
      "in_progress",
    );
    await assert.rejects(
      f.call("technician", "booking.report", {
        ...request,
        responses: [
          {
            id: "equipment_check",
            passed: false,
            notes: "Synthetic failed inspection step",
          },
        ],
        operationKey: id(),
      }),
      /Failed inspection/,
    );
    const report = await f.call("technician", "booking.report", request);
    await f.call("technician", "booking.report", request);
    assert.equal(await count(f.db, "service_reports"), 1);
    await f.db.query("UPDATE users SET active=false WHERE id=$1", [
      f.actors.technician.id,
    ]);
    await assert.rejects(
      f.call("technician", "booking.report", request),
      /expired/,
    );
    assert.equal((await f.call("commercial", "bookings")).length, 0);
  } finally {
    await f.db.close?.();
  }
});
test("BK-quiet: durable service events are scheduled after overnight and same-day quiet periods", async () => {
  const { nextServiceMessageAt } = await import(
    "../packages/business-rules/src/quiet-hours"
  );
  assert.equal(
    nextServiceMessageAt(new Date("2026-10-30T22:30:00Z"), 21, 8).toISOString(),
    "2026-10-31T07:00:00.000Z",
  );
  assert.equal(
    nextServiceMessageAt(new Date("2026-10-30T10:30:00Z"), 9, 15).toISOString(),
    "2026-10-30T14:00:00.000Z",
  );
  assert.equal(
    nextServiceMessageAt(new Date("2026-10-30T15:30:00Z"), 9, 15).toISOString(),
    "2026-10-30T15:30:00.000Z",
  );
});
test("EO-10: wallet and independently approved refund failures roll back and replay without duplicate money", async () => {
  const f = await fixture();
  try {
    await f.db.query(
      "UPDATE settings SET value='true' WHERE key='wallet.enabled' AND scope='lagos'",
    );
    const funding = await f.call("finance", "credit.request", {
      customerId: f.actors.customer.id,
      branchId: "lagos",
      amountKobo: 500000,
      receiptReference: "RECOVERY-FUNDING-" + id(),
      reason: "Synthetic verified funding for isolated rollback test",
    });
    await f.call("owner", "credit.decide", {
      id: funding.id,
      decision: "approved",
      reason: "Independent synthetic funding receipt verification",
    });
    const b = await f.call("customer", "booking.create", f.input());
    const pay = {
      bookingId: b.id,
      amountKobo: 50000,
      idempotencyKey: id(),
      operationKey: id(),
    };
    await assert.rejects(
      dispatch(
        "booking.wallet.pay",
        f.actors.customer.token,
        pay,
        faultDatabase(f.db, "INSERT INTO verified_payments"),
      ),
      /Injected/,
    );
    assert.equal((await f.call("customer", "wallet")).balanceKobo, 500000);
    assert.equal(await count(f.db, "verified_payments"), 0);
    await f.call("customer", "booking.wallet.pay", pay);
    await f.call("customer", "booking.wallet.pay", pay);
    assert.equal((await f.call("customer", "wallet")).balanceKobo, 450000);
    assert.equal(await count(f.db, "verified_payments"), 1);
    await f.call("customer", "booking.cancel", {
      bookingId: b.id,
      reason: "Synthetic cancelled appointment with paid deposit",
      operationKey: id(),
    });
    const refund = await f.call("customer", "booking.refund.request", {
      bookingId: b.id,
      acceptWalletCredit: true,
      reason: "Synthetic reviewed refund request",
      operationKey: id(),
    });
    const decision = {
      id: refund.id,
      decision: "approved",
      reason: "Independent finance refund verification",
    };
    await assert.rejects(
      dispatch(
        "credit.decide",
        f.actors.finance.token,
        decision,
        faultDatabase(f.db, "INSERT INTO wallet_entries"),
      ),
      /Injected/,
    );
    assert.equal((await f.call("customer", "wallet")).balanceKobo, 450000);
    await f.call("finance", "credit.decide", decision);
    await f.call("finance", "credit.decide", decision);
    assert.equal((await f.call("customer", "wallet")).balanceKobo, 500000);
    assert.equal(
      (await one(
        f.db,
        "SELECT count(*)::int n FROM wallet_entries WHERE kind='refund'",
      ))!.n,
      1,
    );
  } finally {
    await f.db.close?.();
  }
});
test("RC-13: failed additive migration rolls back DDL without losing a valid booking", async () => {
  const f = await fixture();
  try {
    const b = await f.call("customer", "booking.create", f.input());
    await assert.rejects(
      f.db.transaction(async (tx) => {
        await tx.exec(
          "ALTER TABLE service_bookings ADD COLUMN recovery_test_probe text; SELECT 1/0;",
        );
      }),
    );
    assert.equal(
      (await one(
        f.db,
        "SELECT count(*)::int n FROM information_schema.columns WHERE table_name='service_bookings' AND column_name='recovery_test_probe'",
      ))!.n,
      0,
    );
    assert.equal((await f.call("customer", "bookings"))[0].id, b.id);
    assert.equal(
      (await one(
        f.db,
        "SELECT count(*)::int n FROM schema_migrations WHERE version='033'",
      ))!.n,
      1,
    );
  } finally {
    await f.db.close?.();
  }
});
test("BK-private: operation persistence works under the restricted trusted server role and committed results are immutable", async () => {
  const { readFile } = await import("node:fs/promises"),
    { createDatabase } = await import("../apps/web/lib/db");
  const db = await createDatabase("memory://");
  try {
    await db.exec(await readFile("database/bootstrap.sql", "utf8"));
    await db.exec(
      "SET search_path TO easygas_private,pg_catalog; SET ROLE easygas_server",
    );
    const f = await fixture(db),
      request = { ...f.input(), operationKey: id() };
    const b = await f.call("customer", "booking.create", request);
    assert.equal(
      (await f.call("customer", "booking.create", request)).id,
      b.id,
    );
    await assert.rejects(
      db.query(
        "UPDATE business_operation_results SET result='{}' WHERE operation_key=$1",
        [request.operationKey],
      ),
      /immutable/,
    );
    await assert.rejects(
      db.query(
        "DELETE FROM business_operation_results WHERE operation_key=$1",
        [request.operationKey],
      ),
    );
    await db.query("UPDATE users SET role='commercial' WHERE id=$1", [
      f.actors.customer.id,
    ]);
    await assert.rejects(
      f.call("customer", "booking.create", request),
      /conflict/i,
    );
    assert.equal(
      (
        await f.call("customer", "booking.operation", {
          key: request.operationKey,
        })
      ).status,
      "NOT_FOUND",
    );
  } finally {
    await db.close?.();
  }
});
test("EO-contract: public service mutations require a stable identity and stale-sensitive changes require a version", async () => {
  const { validateServiceOperationRequest } = await import(
    "../apps/web/lib/business-operation"
  );
  for (const action of [
    "booking.create",
    "booking.quote",
    "booking.report",
    "service.material.issue",
  ])
    assert.throws(
      () => validateServiceOperationRequest(action, {}),
      /operationKey/,
    );
  assert.throws(
    () =>
      validateServiceOperationRequest("booking.cancel", { operationKey: id() }),
    /version/,
  );
  const body = { operationKey: id(), version: 2 };
  assert.equal(validateServiceOperationRequest("booking.cancel", body), body);
  assert.deepEqual(validateServiceOperationRequest("logout", {}), {});
});
