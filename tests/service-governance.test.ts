import {serviceProof} from "./helpers/service-fixture";
import test from "node:test";
import assert from "node:assert/strict";
import { fixture, begin , authoriseWork } from "./helpers/service-fixture";
import { one } from "../apps/web/lib/db";
import { serviceFollowupReminders } from "../apps/web/lib/service-followups";
import { id } from "../apps/web/lib/auth";
test("specific compatibility requires independent qualified review and expires with reviewer qualification", async () => {
  const f = await fixture();
  try {
    const record = await f.call("owner", "compatibility.propose", {
      productId: "regulator",
      equipmentBrand: "Synthetic",
      equipmentModel: "Fixture X",
      connectionSpec: "Fixture connection specification",
      pressureSpec: "Fixture pressure specification",
      evidence: "Synthetic manufacturer evidence for this exact test model",
      status: "verified_compatible",
    });
    await assert.rejects(
      () =>
        f.call("owner", "compatibility.review", {
          id: record.id,
          approve: true,
        }),
      /Independent/,
    );
    assert.equal(
      (await f.call("customer", "compatibility", { productId: "regulator" }))
        .length,
      0,
    );
    await f.call("safety_officer", "compatibility.review", {
      id: record.id,
      approve: true,
    });
    assert.equal(
      (await f.call("customer", "compatibility", { productId: "regulator" }))
        .length,
      1,
    );
    await assert.rejects(
      () =>
        f.call("customer", "compatibility.manage", { productId: "regulator" }),
      /permission/,
    );
    await f.db.query(
      "UPDATE technician_qualifications SET expires_at=now()-interval '1 second' WHERE user_id=$1",
      [f.actors.safety_officer.id],
    );
    assert.equal(
      (await f.call("customer", "compatibility", { productId: "regulator" }))
        .length,
      0,
    );
  } finally {
    await f.db.close?.();
  }
});
test("follow-ups require completed work, respect service consent and quiet hours, deduplicate and link rebooking", async () => {
  const f = await fixture();
  try {
    const b = await begin(f),
      dueDate = new Date().toISOString().slice(0, 10),
      data = {
        bookingId: b.id,
        dueDate,
        reason: "Synthetic documented maintenance follow-up reason",
      };
    await assert.rejects(
      () => f.call("technician", "service.followup.create", data),
      /completed/,
    );
    await authoriseWork(f,b.id);
    await serviceProof(f,b.id);
    await f.call("technician", "booking.report", {
      bookingId: b.id,
      outcome: "success",
      responses: [
        {
          id: "equipment_check",
          passed: true,
          notes: "Recorded fixture evidence",
        },
      ],
      findings: "Synthetic documented findings",
      workPerformed: "Synthetic completed service work",
      recommendations: "Review documented future service needs",
    });
    await f.call("customer", "booking.acknowledge", {
      bookingId: b.id,
      accepted: true,
      notes: "Fixture acknowledged completed service",
    });
    const follow = await f.call("technician", "service.followup.create", data);
    assert.equal(
      (await f.call("technician", "service.followup.create", data)).id,
      follow.id,
    );
    assert.equal((await f.call("commercial", "service.followups")).length, 0);
    await assert.rejects(
      () => f.call("commercial", "service.followup.dismiss", { id: follow.id }),
      /not found/,
    );
    await f.call("customer", "preferences.save", {
      marketing: false,
      refillReminders: true,
      serviceReminders: false,
      quietStart: 21,
      quietEnd: 8,
    });
    assert.equal(
      await f.db.transaction((tx) => serviceFollowupReminders(tx, 12)),
      0,
    );
    await f.call("customer", "preferences.save", {
      marketing: false,
      refillReminders: true,
      serviceReminders: true,
      quietStart: 21,
      quietEnd: 8,
    });
    assert.equal(
      await f.db.transaction((tx) => serviceFollowupReminders(tx, 22)),
      0,
    );
    assert.equal(
      await f.db.transaction((tx) => serviceFollowupReminders(tx, 12)),
      1,
    );
    assert.equal(
      await f.db.transaction((tx) => serviceFollowupReminders(tx, 12)),
      0,
    );
    const slot = await f.createSlot(2);
    const request = {
      ...f.input(slot.id),
      followupId: follow.id,
      idempotencyKey: id(),
    };
    const second = await f.call("customer", "booking.create", request);
    assert.equal(
      (await one(
        f.db,
        "SELECT rebooked_id FROM service_followups WHERE id=$1",
        [follow.id],
      ))!.rebooked_id,
      second.id,
    );
    assert.equal(
      (await f.call("customer", "booking.create", request)).id,
      second.id,
    );
    const third = await f.createSlot(4);
    await assert.rejects(
      () =>
        f.call("customer", "booking.create", {
          ...f.input(third.id),
          followupId: follow.id,
        }),
      /no longer eligible/,
    );
  } finally {
    await f.db.close?.();
  }
});
test("policy publication requires independently approved real content and effective date", async () => {
  const f = await fixture();
  try {
    assert.deepEqual(await f.call("customer", "policies"), []);
    await assert.rejects(
      () => f.call("technician", "policies.manage"),
      /permission/,
    );
    const change = await f.call("owner", "setting.propose", {
      key: "legal.terms",
      scope: "lagos",
      version: 1,
      value: {
        title: "Fixture service terms",
        content: "Synthetic test-only policy text. ".repeat(8),
        published: true,
        effectiveAt: new Date(Date.now() - 1000).toISOString(),
      },
      reason: "Synthetic policy publication fixture",
    });
    await assert.rejects(
      () =>
        f.call("owner", "approval.decide", {
          id: change.id,
          decision: "approve",
          reason: "Cannot approve own policy",
        }),
      /own|independent/i,
    );
    assert.deepEqual(await f.call("customer", "policies"), []);
  } finally {
    await f.db.close?.();
  }
});
test("all new service tables and workflows function under the restricted private-schema server role", async () => {
  const { readFile } = await import("node:fs/promises");
  const { createDatabase } = await import("../apps/web/lib/db");
  const db = await createDatabase("memory://");
  try {
    await db.exec(await readFile("database/bootstrap.sql", "utf8"));
    await db.exec(
      "SET search_path TO easygas_private,pg_catalog; SET ROLE easygas_server",
    );
    const f = await fixture(db);
    const b = await begin(f);
    await authoriseWork(f,b.id);
    await serviceProof(f,b.id);
    await f.call("technician", "booking.report", {
      bookingId: b.id,
      outcome: "success",
      responses: [
        {
          id: "equipment_check",
          passed: true,
          notes: "Restricted role documented evidence",
        },
      ],
      findings: "Restricted role service findings",
      workPerformed: "Restricted role actual service work",
      recommendations: "",
    });
    await f.call("customer", "booking.acknowledge", {
      bookingId: b.id,
      accepted: true,
      notes: "Customer acknowledged report",
    });
    await f.call("technician", "service.followup.create", {
      bookingId: b.id,
      dueDate: new Date().toISOString().slice(0, 10),
      reason: "Restricted role test follow-up",
    });
    assert.equal((await f.call("customer", "service.followups")).length, 1);
    await assert.rejects(
      () => db.query("UPDATE service_reports SET outcome='success'"),
      /permission denied/,
    );
    await assert.rejects(
      () => db.query("DELETE FROM service_bookings"),
      /permission denied/,
    );
  } finally {
    await db.close?.();
  }
});
test("incremental Supabase migration upgrades the previous catalogue schema without losing existing records", async () => {
  const { readFile } = await import("node:fs/promises");
  const { createDatabase } = await import("../apps/web/lib/db");
  const db = await createDatabase("memory://");
  try {
    for (const file of [
      "20261029091616_easygas_private_core.sql",
      "20261029104023_operations_and_commerce.sql",
      "20261029113454_requested_product_catalogue.sql",
    ])
      await db.exec(await readFile("supabase/migrations/" + file, "utf8"));
    await db.exec("SET search_path TO easygas_private,pg_catalog");
    const before = (await db.query("SELECT id,name FROM products ORDER BY id"))
      .rows;
    await db.exec(
      await readFile(
        "supabase/migrations/20261029150247_professional_services_and_integrity.sql",
        "utf8",
      ),
    );
    assert.deepEqual(
      (await db.query("SELECT id,name FROM products ORDER BY id")).rows,
      before,
    );
    await db.exec(
      await readFile(
        "supabase/migrations/20261029150950_governed_service_bundles.sql",
        "utf8",
      ),
    );
    assert.equal(
      (await db.query("SELECT count(*)::int n FROM service_catalogue")).rows[0]
        .n,
      4,
    );
    const tables = (
      await db.query(
        "SELECT c.relname,c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='easygas_private' AND c.relkind='r'",
      )
    ).rows;
    assert.ok(tables.every((t) => t.relrowsecurity));
  } finally {
    await db.close?.();
  }
});
test("production gates remain truthful and customer export includes owned service records only", async () => {
  const f = await fixture();
  try {
    const b = await f.call("customer", "booking.create", f.input());
    await assert.rejects(
      () => f.call("technician", "production.readiness"),
      /permission/,
    );
    const ready = await f.call("owner", "production.readiness");
    assert.equal(ready.gates.length, 20);
    assert.equal(ready.recommendation, "NO-GO");
    assert.equal(ready.gates.find((g: any) => g.id === 8).status, "blocked");
    await f.call("customer", "reauth", {
      password: "Services-fixture-only-123!",
    });
    const own = await f.call("customer", "account.export");
    assert.equal(own.serviceBookings.length, 1);
    assert.equal(own.serviceBookings[0].id, b.id);
    await f.call("commercial", "reauth", {
      password: "Services-fixture-only-123!",
    });
    assert.equal(
      (await f.call("commercial", "account.export")).serviceBookings.length,
      0,
    );
  } finally {
    await f.db.close?.();
  }
});
