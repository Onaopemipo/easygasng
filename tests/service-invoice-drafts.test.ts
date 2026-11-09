import test from "node:test";
import assert from "node:assert/strict";
import {
  fixture,
  begin,
  authoriseWork,
  serviceProof,
} from "./helpers/service-fixture";
import { id } from "../apps/web/lib/auth";
import { one } from "../apps/web/lib/db";

process.env.EASYGAS_MESSAGE_ENCRYPTION_KEY ??= "d".repeat(64);
test("SINV-DRAFT01: persistent immutable revisions, replay, source-bound issue and private draft history", async () => {
  const f = await fixture();
  try {
    const b = await begin(f);
    const input = {
      bookingId: b.id,
      expectedRevision: 0,
      dueDate: "2026-12-20",
      customerNote: "Customer-approved appointment details",
      reason: "Reviewed service invoice draft",
      operationKey: id(),
    };
    await assert.rejects(
      () => f.call("customer", "invoice.service.draft.save", input),
      /permission|access|authoris/i,
    );
    const saved = await f.call("finance", "invoice.service.draft.save", input);
    assert.equal(saved.savedRevision.revision, 1);
    assert.equal(
      (await f.call("finance", "invoice.service.draft.save", input)).replayed,
      true,
    );
    await assert.rejects(
      () =>
        f.call("finance", "invoice.service.draft.save", {
          ...input,
          operationKey: id(),
        }),
      /changed/,
    );
    const preview = await f.call("finance", "invoice.service.draft", {
      bookingId: b.id,
    });
    assert.equal(preview.revisions.length, 1);
    assert.equal(preview.collectible, false);
    const customer = await f.call("customer", "invoice.service.draft", {
      bookingId: b.id,
    });
    assert.equal(customer.savedRevision, undefined);
    assert.equal(customer.revisions, undefined);
    await assert.rejects(
      () => f.call("finance", "invoice.service.issue", { bookingId: b.id }),
      /exact draft revision/,
    );
    const issued = (
      await f.call("finance", "invoice.service.issue", {
        bookingId: b.id,
        expectedDraftRevision: 1,
      })
    ).invoice;
    assert.equal(issued.snapshot.customerNote, input.customerNote);
    assert.equal(issued.snapshot.dueDate, input.dueDate);
    assert.equal(issued.snapshot.draftRevision, 1);
    await assert.rejects(
      () =>
        f.call("finance", "invoice.service.draft.save", {
          ...input,
          expectedRevision: 1,
          operationKey: id(),
        }),
      /Issued invoices/,
    );
    await assert.rejects(
      () =>
        f.db.query(
          "UPDATE service_invoice_drafts SET customer_note='changed' WHERE booking_id=$1",
          [b.id],
        ),
      /immutable/,
    );
    assert.equal(
      (await one(
        f.db,
        "SELECT count(*) AS n FROM customer_invoices WHERE booking_id=$1",
        [b.id],
      ))!.n,
      1,
    );
  } finally {
    await f.db.close?.();
  }
});

test("SINV-DRAFT02: changed approved source invalidates saved draft, resave requires optimistic revision", async () => {
  const f = await fixture();
  try {
    const b = await begin(f);
    const input = {
      bookingId: b.id,
      expectedRevision: 0,
      dueDate: "2026-12-20",
      customerNote: "",
      reason: "Initial reviewed invoice draft",
      operationKey: id(),
    };
    await f.call("finance", "invoice.service.draft.save", input);
    await f.db.query(
      "UPDATE service_bookings SET snapshot=jsonb_set(snapshot,'{priceKobo}','110000'::jsonb) WHERE id=$1",
      [b.id],
    );
    assert.equal(
      (await f.call("finance", "invoice.service.draft", { bookingId: b.id }))
        .stale,
      true,
    );
    await assert.rejects(
      () =>
        f.call("finance", "invoice.service.issue", {
          bookingId: b.id,
          expectedDraftRevision: 1,
        }),
      /current approved scope/,
    );
    await f.call("finance", "invoice.service.draft.save", {
      ...input,
      expectedRevision: 1,
      operationKey: id(),
    });
    const invoice = (
      await f.call("finance", "invoice.service.issue", {
        bookingId: b.id,
        expectedDraftRevision: 2,
      })
    ).invoice;
    assert.equal(invoice.total_kobo, 130000);
  } finally {
    await f.db.close?.();
  }
});

test("SINV-DISPUTE01: customer dispute holds collection, preserves report and requires authorised independent review", async () => {
  const f = await fixture();
  try {
    const b = await begin(f);
    await authoriseWork(f, b.id);
    await serviceProof(f, b.id);
    await f.call("technician", "booking.report", {
      bookingId: b.id,
      outcome: "success",
      responses: [
        { id: "equipment_check", passed: true, notes: "Documented inspection" },
      ],
      findings: "Synthetic service findings",
      workPerformed: "Synthetic performed service",
      recommendations: "",
    });
    await f.call("customer", "booking.acknowledge", {
      bookingId: b.id,
      accepted: true,
      notes: "Documented work acknowledged",
    });
    const invoice = (
      await f.call("finance", "invoice.service.issue", { bookingId: b.id })
    ).invoice;
    const before = await one(
      f.db,
      "SELECT body FROM service_reports WHERE booking_id=$1",
      [b.id],
    );
    const input = {
      bookingId: b.id,
      reason: "Customer reports a concern after service",
      operationKey: id(),
    };
    await assert.rejects(
      () => f.call("commercial", "booking.dispute", input),
      /not found|permission|customer/i,
    );
    const dispute = await f.call("customer", "booking.dispute", input);
    assert.equal(
      (await f.call("customer", "booking.dispute", input)).replayed,
      true,
    );
    const held = (
      await f.call("customer", "invoice.service", { bookingId: b.id })
    ).invoice;
    await assert.rejects(
      () =>
        f.call("customer", "booking.acknowledge", {
          bookingId: b.id,
          accepted: true,
          notes: "Repeat while dispute remains open",
        }),
      /Resolve the open service dispute/,
    );
    assert.equal(held.status, "adjustment_required");
    assert.equal(held.amountDueKobo, null);
    await assert.rejects(
      () =>
        f.call("finance", "invoice.request.create", {
          bookingId: b.id,
          operationKey: id(),
        }),
      /Reconcile/,
    );
    await assert.rejects(
      () =>
        f.call("technician", "incident.update", {
          id: dispute.incidentId,
          status: "resolved",
          note: "Attempted technician resolution",
        }),
      /permission|authoris|access/i,
    );
    await f.call("owner", "incident.update", {
      id: dispute.incidentId,
      status: "resolved",
      note: "Independently reviewed with the customer; original documented charges retained",
    });
    const restored = (
      await f.call("customer", "invoice.service", { bookingId: b.id })
    ).invoice;
    assert.equal(restored.id, invoice.id);
    assert.equal(restored.status, "paid");
    assert.deepEqual(
      (await one(f.db, "SELECT body FROM service_reports WHERE booking_id=$1", [
        b.id,
      ]))!.body,
      before!.body,
    );
  } finally {
    await f.db.close?.();
  }
});

test("PRIVACY-RETAIN01: explicit retain-all policy records truthful disposition and preserves owned records", async () => {
  const f = await fixture();
  try {
    await f.call("customer", "reauth", {
      password: "Services-fixture-only-123!",
    });
    const data = {
      kind: "deletion",
      reason: "Customer requests review of personal records",
    };
    const r = await f.call("customer", "privacy.request", data);
    assert.equal(r.status, "retained");
    assert.match(r.message, /not been deleted/);
    await f.call("customer", "privacy.request", data);
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT count(*) n FROM privacy_requests WHERE user_id=$1 AND kind='deletion'",
          [f.actors.customer.id],
        ))!.n,
      ),
      1,
    );
    assert.ok(
      await one(f.db, "SELECT id FROM users WHERE id=$1", [
        f.actors.customer.id,
      ]),
    );
    const exp = await f.call("customer", "account.export", {});
    assert.ok(exp);
    assert.equal(
      (await one(
        f.db,
        "SELECT status FROM privacy_requests WHERE user_id=$1 AND kind='deletion'",
        [f.actors.customer.id],
      ))!.status,
      "retained",
    );
  } finally {
    await f.db.close?.();
  }
});
