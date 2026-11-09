import test from "node:test";
import assert from "node:assert/strict";
import { fixture, begin, authoriseWork } from "./helpers/service-fixture";
import { id } from "../apps/web/lib/auth";
const mutation = (f: any, role: string, action: string, input: any) =>
  f.call(role, action, { ...input, operationKey: id() });
async function report(
  f: Awaited<ReturnType<typeof fixture>>,
  bookingId: string,
) {
  return mutation(f, "technician", "booking.report", {
    bookingId,
    outcome: "unable",
    responses: [
      {
        id: "equipment_check",
        passed: false,
        notes: "Actual work stopped; no successful clearance",
      },
    ],
    findings: "Synthetic documented inability to complete work",
    workPerformed: "Synthetic actual assessment and stopped work",
    recommendations: "Independent operations review required",
  });
}
async function agree(
  f: Awaited<ReturnType<typeof fixture>>,
  bookingId: string,
  amountKobo: number,
) {
  await f.call("service_manager", "reauth", {
    password: "Services-fixture-only-123!",
  });
  const b = (await f.call("owner", "bookings", { id: bookingId }))[0];
  const s = await mutation(f, "service_manager", "booking.settlement.propose", {
    bookingId,
    version: b.version,
    amountKobo,
    reason: "Synthetic negotiated charge for actual stopped work",
    evidence: "Synthetic report and actual customer settlement evidence",
  });
  await f.call("owner", "approval.decide", {
    id: s.requestId,
    decision: "approve",
    reason: "Independent synthetic owner settlement review",
  });
  await f.call("finance", "approval.decide", {
    id: s.requestId,
    decision: "approve",
    reason: "Independent synthetic finance settlement review",
  });
  await mutation(f, "customer", "booking.settlement.consent", {
    bookingId,
    settlementId: s.id,
    accepted: true,
    notes: "Customer agrees only to this actual financial settlement",
  });
  return s;
}
test("SVC-EX01: failed chargeable work uses customer-agreed dual-approved settlement and exact invoice credit/excess refund without certifying completion", async () => {
  const f = await fixture();
  try {
    const b = await begin(f);
    await f.call("finance", "invoice.service.issue", { bookingId: b.id });
    await authoriseWork(f, b.id);
    await report(f, b.id);
    const before = await f.call("customer", "invoice.service", {
      bookingId: b.id,
    });
    assert.equal(before.invoice.amountDueKobo, null);
    await agree(f, b.id, 60000);
    const credit = await mutation(f, "finance", "invoice.correction.propose", {
      bookingId: b.id,
      kind: "credit",
      amountKobo: 60000,
      reason: "Reconcile exact agreed stopped-work settlement",
    });
    await mutation(f, "owner", "invoice.correction.decide", {
      bookingId: b.id,
      noteId: credit.noteId,
      approve: true,
    });
    const excess = await mutation(f, "customer", "booking.refund.request", {
      bookingId: b.id,
      refundScope: "excess",
      acceptWalletCredit: true,
      reason: "Return only excess beyond the agreed settlement",
    });
    await f.call("owner", "credit.decide", {
      id: excess.id,
      decision: "approved",
      reason: "Independent exact failed-service excess refund",
    });
    const inv = await f.call("customer", "invoice.service", {
      bookingId: b.id,
    });
    assert.equal(inv.invoice.effectiveTotalKobo, 60000);
    assert.equal(inv.invoice.overpaidKobo, 0);
    assert.equal(inv.invoice.amountDueKobo, 0);
    const current = (await f.call("owner", "bookings", { id: b.id }))[0];
    assert.equal(current.status, "failed");
    assert.equal(current.settlements[0].accepted, true);
    assert.equal(current.settlements[0].business_approved, true);
    await assert.rejects(
      () =>
        mutation(f, "technician", "booking.work.start", {
          bookingId: b.id,
          version: current.version,
          reason: "Settlement must never authorise resumed work",
        }),
      /current on-site/,
    );
    await assert.rejects(
      () =>
        mutation(f, "customer", "booking.acknowledge", {
          bookingId: b.id,
          accepted: true,
          notes: "Cannot turn failed work into a successful service",
        }),
      /successful documented/,
    );
    assert.equal(
      Number(
        (
          await f.db.query(
            "SELECT count(*) n FROM reward_entries WHERE reference LIKE $1",
            [`%${b.id}%`],
          )
        ).rows[0].n,
      ),
      0,
    );
  } finally {
    await f.db.close?.();
  }
});
test("SVC-EX02: declined quote can close with an honest unsuccessful report and cannot charge unapproved labour", async () => {
  const f = await fixture();
  try {
    const b = await begin(f);
    const q = await mutation(f, "technician", "booking.quote", {
      bookingId: b.id,
      labourKobo: 90000,
      lines: [],
      notes: "Synthetic proposed but unapproved labour",
    });
    await mutation(f, "customer", "booking.quote.decide", {
      bookingId: b.id,
      quoteId: q.id,
      approved: false,
    });
    await report(f, b.id);
    const saved = (
      await f.db.query("SELECT body FROM service_reports WHERE booking_id=$1", [
        b.id,
      ])
    ).rows[0];
    assert.equal(saved.body.invoiceTotalKobo, 20000);
    await f.call("service_manager", "reauth", {
      password: "Services-fixture-only-123!",
    });
    const current = (await f.call("owner", "bookings", { id: b.id }))[0];
    await assert.rejects(
      () =>
        mutation(f, "service_manager", "booking.settlement.propose", {
          bookingId: b.id,
          version: current.version,
          amountKobo: 21000,
          reason: "Cannot charge above actual authorised assessment",
          evidence: "Synthetic declined-quote evidence",
        }),
      /cannot exceed/,
    );
    const s = await agree(f, b.id, 10000);
    await f.call("finance", "invoice.service.issue", { bookingId: b.id });
    const invoice = await f.call("customer", "invoice.service", {
      bookingId: b.id,
    });
    assert.equal(invoice.invoice.effectiveTotalKobo, 10000);
    assert.match(
      invoice.invoice.snapshot.products[0].name,
      /not certified complete/,
    );
    const consent = (
      await f.db.query(
        "SELECT * FROM service_settlement_consents WHERE settlement_id=$1",
        [s.id],
      )
    ).rows[0];
    await assert.rejects(
      () =>
        f.db.query("DELETE FROM service_settlement_consents WHERE id=$1", [
          consent.id,
        ]),
      /immutable|append|modified|deleted/i,
    );
  } finally {
    await f.db.close?.();
  }
});
