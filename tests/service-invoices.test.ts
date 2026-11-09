import test from "node:test";
import assert from "node:assert/strict";
import {
  fixture,
  begin,
  authoriseWork,
  serviceProof,
} from "./helpers/service-fixture";
import { one } from "../apps/web/lib/db";
import { id } from "../apps/web/lib/auth";
process.env.EASYGAS_MESSAGE_ENCRYPTION_KEY ??= "d".repeat(64);
import { invoicePdf } from "../apps/web/lib/invoice-pdf";

async function completed(f: Awaited<ReturnType<typeof fixture>>) {
  const b = await begin(f);
  await authoriseWork(f, b.id);
  await serviceProof(f, b.id);
  await f.call("technician", "booking.report", {
    bookingId: b.id,
    outcome: "success",
    responses: [
      {
        id: "equipment_check",
        passed: true,
        notes: "Actual synthetic fixture check completed",
      },
    ],
    findings: "Synthetic documented findings",
    workPerformed: "Synthetic completed service work",
    recommendations: "",
  });
  await f.call("customer", "booking.acknowledge", {
    bookingId: b.id,
    accepted: true,
    notes: "Customer acknowledges documented fixture work",
  });
  return b;
}
const mutation = (f: any, role: string, action: string, input: any) =>
  f.call(role, action, { ...input, operationKey: id() });

test("SINV-01: existing service draft, verified work, immutable issued invoice, ledger balance and private ownership", async () => {
  const f = await fixture();
  try {
    const b = await begin(f);
    const draft = await f.call("customer", "invoice.service.draft", {
      bookingId: b.id,
    });
    assert.equal(draft.totalKobo, 120000);
    assert.equal(draft.collectible, false);
    const prework = (
      await f.call("finance", "invoice.service.issue", { bookingId: b.id })
    ).invoice;
    assert.equal(prework.status, "issued");
    const request = await mutation(f, "finance", "invoice.request.create", {
      bookingId: b.id,
    });
    const token = new URL(request.url).hash.slice(1).split(":")[2];
    assert.equal(
      (
        await f.call("customer", "invoice.request.view", {
          bookingId: b.id,
          token,
        })
      ).amountDueKobo,
      120000,
    );
    await assert.rejects(
      () => f.call("commercial", "invoice.service.draft", { bookingId: b.id }),
      /not found/,
    );
    await assert.rejects(
      () => f.call("technician", "invoice.service.issue", { bookingId: b.id }),
      /permission/,
    );
    await authoriseWork(f, b.id);
    await serviceProof(f, b.id);
    await f.call("technician", "booking.report", {
      bookingId: b.id,
      outcome: "success",
      responses: [
        {
          id: "equipment_check",
          passed: true,
          notes: "Recorded test-only inspection evidence",
        },
      ],
      findings: "Synthetic documented service findings",
      workPerformed: "Synthetic test work completed",
      recommendations: "",
    });
    const first = (
      await f.call("finance", "invoice.service.issue", { bookingId: b.id })
    ).invoice;
    assert.equal(first.booking_id, b.id);
    assert.equal(first.order_id, null);
    assert.equal(first.status, "paid");
    assert.equal(first.paidKobo, 120000);
    assert.match(first.invoice_number, /^EGI-\d{10}$/);
    assert.match(first.snapshot.dueDate, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(first.snapshot.deliveryKobo, 0);
    assert.equal(
      (await f.call("finance", "invoice.service.issue", { bookingId: b.id }))
        .invoice.id,
      first.id,
    );
    assert.equal(
      (await f.call("customer", "invoice.service", { bookingId: b.id })).invoice
        .id,
      first.id,
    );
    assert.ok((await invoicePdf(first)).length > 1000);
    await assert.rejects(
      () =>
        f.db.query("UPDATE customer_invoices SET total_kobo=1 WHERE id=$1", [
          first.id,
        ]),
      /immutable/,
    );
    await assert.rejects(
      () => f.db.query("DELETE FROM customer_invoices WHERE id=$1", [first.id]),
      /immutable/,
    );
    assert.equal(
      Number((await one(f.db, "SELECT count(*) n FROM orders"))!.n),
      0,
    );
  } finally {
    await f.db.close?.();
  }
});

test("SINV-02: shared independent service correction revokes old requests and cannot authorise new work or overwrite reports", async () => {
  const f = await fixture();
  try {
    const b = await completed(f);
    const original = (
      await f.call("finance", "invoice.service.issue", { bookingId: b.id })
    ).invoice;
    const note = await mutation(f, "finance", "invoice.correction.propose", {
      bookingId: b.id,
      kind: "debit",
      amountKobo: 1000,
      reason: "Test-only financial discrepancy requires reconciliation",
    });
    await assert.rejects(
      () =>
        mutation(f, "finance", "invoice.correction.decide", {
          bookingId: b.id,
          noteId: note.noteId,
          approve: true,
        }),
      /Independent/,
    );
    await mutation(f, "owner", "invoice.correction.decide", {
      bookingId: b.id,
      noteId: note.noteId,
      approve: true,
    });
    const updated = (
      await f.call("customer", "invoice.service", { bookingId: b.id })
    ).invoice;
    assert.equal(updated.total_kobo, original.total_kobo);
    assert.equal(updated.effectiveTotalKobo, 121000);
    assert.equal(updated.status, "adjustment_required");
    assert.equal(updated.amountDueKobo, null);
    await assert.rejects(
      () => mutation(f, "owner", "invoice.request.create", { bookingId: b.id }),
      /Reconcile/,
    );
    await assert.rejects(
      () => f.call("commercial", "invoice.corrections", { bookingId: b.id }),
      /not found/,
    );
    await assert.rejects(
      () =>
        f.call("customer", "invoice.corrections", {
          bookingId: b.id,
          orderId: id(),
        }),
      /exactly one/,
    );
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT body FROM service_reports WHERE booking_id=$1",
          [b.id],
        ))!.body.invoiceTotalKobo,
      ),
      120000,
    );
  } finally {
    await f.db.close?.();
  }
});

test("SINV-03: completed-work refund preserves earned charges, revalidates historical requests and credits only excess once", async () => {
  const f = await fixture();
  try {
    const b = await completed(f);
    await assert.rejects(
      () =>
        f.call("customer", "booking.refund.request", {
          bookingId: b.id,
          acceptWalletCredit: true,
          refundScope: "excess",
          reason: "Test request with no excess payment",
        }),
      /selected refund scope/,
    );
    // Deliberately corrupt historical pending request: approval must recheck authoritative balance.
    const stale = id();
    await f.db.query(
      "INSERT INTO credit_requests(id,branch_id,customer_id,booking_id,amount_kobo,kind,requested_by,reason,service_refund_scope) VALUES($1,'lagos',$2,$3,120000,'refund',$2,'Synthetic invalid excess-refund request','excess')",
      [stale, f.actors.customer.id, b.id],
    );
    await assert.rejects(
      () =>
        f.call("finance", "credit.decide", {
          id: stale,
          decision: "approved",
          reason: "Recheck actual completed-work entitlement",
        }),
      /eligible/,
    );
    await f.call("finance", "credit.decide", {
      id: stale,
      decision: "rejected",
      reason: "Reject unsafe historical full refund",
    });
    await f.db.query(
      "INSERT INTO verified_payments(id,booking_id,reference,amount_kobo,method,verified_by) VALUES($1,$2,$1,10000,'service_cash',$3)",
      [id(), b.id, f.actors.finance.id],
    );
    const refund = await f.call("customer", "booking.refund.request", {
      bookingId: b.id,
      acceptWalletCredit: true,
      refundScope: "excess",
      reason: "Return synthetic independently verified excess",
    });
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT amount_kobo FROM credit_requests WHERE id=$1",
          [refund.id],
        ))!.amount_kobo,
      ),
      10000,
    );
    const input = {
      id: refund.id,
      decision: "approved",
      reason: "Independent verified excess refund acceptance",
    };
    await f.call("finance", "credit.decide", input);
    await f.call("finance", "credit.decide", input);
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT sum(amount_kobo) n FROM wallet_entries WHERE reference=$1",
          ["credit:" + refund.id],
        ))!.n,
      ),
      10000,
    );
    const invoice = (
      await f.call("finance", "invoice.service.issue", { bookingId: b.id })
    ).invoice;
    assert.equal(invoice.paidKobo, 120000);
    assert.equal(invoice.status, "paid");
  } finally {
    await f.db.close?.();
  }
});

test("SINV-04: unused quoted materials reconcile by independent credit on the same invoice and refund only the actual excess", async () => {
  const f = await fixture();
  try {
    const b = await begin(f);
    await f.db.query(
      "UPDATE inventory SET quantity=10,price_kobo=5000,published=true WHERE branch_id='lagos' AND product_id='hose'",
    );
    const q = await f.call("technician", "booking.quote", {
      bookingId: b.id,
      labourKobo: 150000,
      lines: [{ productId: "hose", quantity: 2 }],
      notes: "Synthetic assessed service and optional replacement materials",
    });
    await f.call("customer", "booking.quote.decide", {
      bookingId: b.id,
      quoteId: q.id,
      approved: true,
    });
    await assert.rejects(
      () => f.call("finance", "invoice.service.issue", { bookingId: b.id }),
      /approved service scope/,
    );
    await authoriseWork(f, b.id);
    const issued = (
      await f.call("finance", "invoice.service.issue", { bookingId: b.id })
    ).invoice;
    assert.equal(Number(issued.total_kobo), 180000);
    const m = await one(
      f.db,
      "SELECT id FROM service_materials WHERE booking_id=$1",
      [b.id],
    );
    await f.call("inventory", "service.material.issue", {
      bookingId: b.id,
      materialId: m!.id,
      unitCostKobo: 3000,
    });
    await f.call("technician", "service.material.usage", {
      bookingId: b.id,
      materialId: m!.id,
      used: 1,
      damaged: 0,
    });
    await f.call("inventory", "service.material.return", {
      bookingId: b.id,
      materialId: m!.id,
      returned: 1,
      reason: "Unused synthetic material received and reconciled",
    });
    await serviceProof(f, b.id);
    await f.call("technician", "booking.report", {
      bookingId: b.id,
      outcome: "success",
      responses: [
        {
          id: "equipment_check",
          passed: true,
          notes: "Synthetic documented completed inspection",
        },
      ],
      findings: "Synthetic service findings recorded",
      workPerformed: "Synthetic approved scope completed",
      recommendations: "",
    });
    await f.call("customer", "booking.acknowledge", {
      bookingId: b.id,
      accepted: true,
      notes: "Acknowledge actual completed scope and materials",
    });
    let current = (
      await f.call("customer", "invoice.service", { bookingId: b.id })
    ).invoice;
    assert.equal(current.status, "adjustment_required");
    assert.equal(current.reconciliationKobo, -5000);
    const note = await mutation(f, "finance", "invoice.correction.propose", {
      bookingId: b.id,
      kind: "credit",
      amountKobo: 5000,
      reason: "Credit actual unused material reconciled in final report",
    });
    await mutation(f, "owner", "invoice.correction.decide", {
      bookingId: b.id,
      noteId: note.noteId,
      approve: true,
    });
    current = (await f.call("customer", "invoice.service", { bookingId: b.id }))
      .invoice;
    assert.equal(current.finalReconciled, true);
    assert.equal(current.status, "credit_balance");
    assert.equal(current.overpaidKobo, 5000);
    assert.equal(current.id, issued.id);
    assert.equal(Number(current.total_kobo), 180000);
    // Synthetic historical earned reward; real earning/full reversal is exercised by ER-04S.
    await f.db.query(
      "INSERT INTO reward_entries(id,customer_id,points,reference) VALUES($1,$2,100,$3)",
      [id(), f.actors.customer.id, "service:" + b.id],
    );
    const refund = await f.call("customer", "booking.refund.request", {
      bookingId: b.id,
      acceptWalletCredit: true,
      refundScope: "excess",
      reason: "Return only reconciled unused-material overpayment",
    });
    await f.call("finance", "credit.decide", {
      id: refund.id,
      decision: "approved",
      reason: "Independent excess reconciliation to existing credit ledger",
    });
    current = (await f.call("customer", "invoice.service", { bookingId: b.id }))
      .invoice;
    assert.equal(current.status, "paid");
    assert.equal(current.paidKobo, 175000);
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT COALESCE(sum(points),0) n FROM reward_entries WHERE customer_id=$1",
          [f.actors.customer.id],
        ))!.n,
      ),
      100,
    );

    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT quantity FROM inventory WHERE branch_id='lagos' AND product_id='hose'",
        ))!.quantity,
      ),
      9,
    );
    const history = await f.call("customer", "customer.dashboard", {
      widget: "invoices",
    });
    assert.equal(history.length, 1);
    assert.equal(history[0].booking_id, b.id);
    assert.equal(
      (await f.call("commercial", "customer.dashboard", { widget: "invoices" }))
        .length,
      0,
    );
    await f.call("customer", "reauth", {
      password: "Services-fixture-only-123!",
    });
    const exported = await f.call("customer", "account.export");
    assert.equal(exported.issuedInvoices.length, 1);
    assert.equal(exported.issuedInvoices[0].id, issued.id);
  } finally {
    await f.db.close?.();
  }
});

test("SINV-05: equal-price quotation revision invalidates prior source-bound payment request and revocation stops reuse", async () => {
  const f = await fixture();
  try {
    const b = await begin(f);
    await f.call("finance", "invoice.service.issue", { bookingId: b.id });
    const old = await mutation(f, "finance", "invoice.request.create", {
      bookingId: b.id,
    });
    const token = new URL(old.url).hash.slice(1).split(":")[2];
    const q = await f.call("technician", "booking.quote", {
      bookingId: b.id,
      labourKobo: 100000,
      lines: [],
      notes: "Different synthetic scope at exactly the same authorised price",
    });
    await f.call("customer", "booking.quote.decide", {
      bookingId: b.id,
      quoteId: q.id,
      approved: true,
    });
    await f.call("technician", "reauth", {
      password: "Services-fixture-only-123!",
    });
    const approval = await f.call(
      "technician",
      "booking.quote.request_review",
      {
        bookingId: b.id,
        quoteId: q.id,
        reason: "Independent review of changed equal-price service scope",
      },
    );
    await f.call("owner", "approval.decide", {
      id: approval.id,
      decision: "approve",
      reason: "Independent approved revised scope and unchanged price",
    });
    await assert.rejects(
      () =>
        f.call("customer", "invoice.request.view", { bookingId: b.id, token }),
      /expired or changed/,
    );
    const next = await mutation(f, "finance", "invoice.request.create", {
      bookingId: b.id,
    });
    const nextToken = new URL(next.url).hash.slice(1).split(":")[2];
    assert.equal(
      (
        await f.call("customer", "invoice.request.view", {
          bookingId: b.id,
          token: nextToken,
        })
      ).amountDueKobo,
      120000,
    );
    await mutation(f, "owner", "invoice.request.revoke", { bookingId: b.id });
    await assert.rejects(
      () =>
        f.call("customer", "invoice.request.view", {
          bookingId: b.id,
          token: nextToken,
        }),
      /expired or changed/,
    );
  } finally {
    await f.db.close?.();
  }
});

test("SINV-06: pending invoice correction blocks backend work even after actual independent cash verification", async () => {
  const f = await fixture();
  try {
    const b = await begin(f);
    await f.call("finance", "invoice.service.issue", { bookingId: b.id });
    const note = await mutation(f, "finance", "invoice.correction.propose", {
      bookingId: b.id,
      kind: "debit",
      amountKobo: 1000,
      reason:
        "Hold physical work for independently reviewed financial discrepancy",
    });
    await assert.rejects(
      () => authoriseWork(f, b.id),
      /Reconcile the service invoice/,
    );
    assert.equal(
      (await one(f.db, "SELECT work_phase FROM service_bookings WHERE id=$1", [
        b.id,
      ]))!.work_phase,
      "assessment",
    );
    await mutation(f, "owner", "invoice.correction.decide", {
      bookingId: b.id,
      noteId: note.noteId,
      approve: false,
    });
    const current = (await f.call("technician", "bookings")).find(
      (x: any) => x.id === b.id,
    );
    await f.call("technician", "booking.work.start", {
      bookingId: b.id,
      version: current.version,
      reason: "Financial discrepancy rejected after independent review",
    });
    assert.equal(
      (await one(f.db, "SELECT work_phase FROM service_bookings WHERE id=$1", [
        b.id,
      ]))!.work_phase,
      "authorised",
    );
  } finally {
    await f.db.close?.();
  }
});

test("SINV-07: failed/cancelled service remains historical and cannot create a collectible request despite a prior successful report", async () => {
  const f = await fixture();
  try {
    const b = await completed(f);
    const invoice = (
      await f.call("finance", "invoice.service.issue", { bookingId: b.id })
    ).invoice;
    for (const status of ["failed", "cancelled"]) {
      await f.db.query("UPDATE service_bookings SET status=$1 WHERE id=$2", [
        status,
        b.id,
      ]); // Synthetic recovery-state corruption probe, never a business transition.
      const current = (
        await f.call("customer", "invoice.service", { bookingId: b.id })
      ).invoice;
      assert.equal(current.id, invoice.id);
      assert.equal(current.status, "adjustment_required");
      assert.equal(current.amountDueKobo, null);
      await assert.rejects(
        () =>
          mutation(f, "finance", "invoice.request.create", { bookingId: b.id }),
        /Reconcile/,
      );
    }
    const next = await f.call(
      "customer",
      "booking.create",
      f.input((await f.createSlot(4)).id),
    );
    await f.db.query("UPDATE branches SET active=false WHERE id='lagos'");
    await assert.rejects(
      () => f.call("finance", "invoice.service.issue", { bookingId: next.id }),
      /approved service scope/,
    );
  } finally {
    await f.db.close?.();
  }
});

test("SINV-08: existing full-service refund review remains available and cannot turn its refunded invoice into a new collectible debt", async () => {
  const f = await fixture();
  try {
    const b = await completed(f);
    await f.call("finance", "invoice.service.issue", { bookingId: b.id });
    const request = await f.call("customer", "booking.refund.request", {
      bookingId: b.id,
      acceptWalletCredit: true,
      reason: "Independent full service refund review for synthetic complaint",
    });
    assert.equal(
      (await one(
        f.db,
        "SELECT service_refund_scope FROM credit_requests WHERE id=$1",
        [request.id],
      ))!.service_refund_scope,
      "service",
    );
    await f.call("finance", "credit.decide", {
      id: request.id,
      decision: "approved",
      reason: "Independent full-service review authorises restricted credit",
    });
    const invoice = (
      await f.call("customer", "invoice.service", { bookingId: b.id })
    ).invoice;
    assert.equal(invoice.status, "adjustment_required");
    assert.equal(invoice.amountDueKobo, null);
    assert.equal(invoice.finalReconciled, false);
    const booking = (await f.call("customer", "bookings")).find(
      (x: any) => x.id === b.id,
    );
    assert.equal(booking.billing.paymentReviewRequired, true);
    assert.equal(booking.billing.dueKobo, null);
    await assert.rejects(
      () =>
        mutation(f, "finance", "invoice.request.create", { bookingId: b.id }),
      /refund requires finance reconciliation/,
    );
    const note = await mutation(f, "finance", "invoice.correction.propose", {
      bookingId: b.id,
      kind: "credit",
      amountKobo: 120000,
      reason:
        "Credit approved full service refund without rewriting original report",
    });
    await mutation(f, "owner", "invoice.correction.decide", {
      bookingId: b.id,
      noteId: note.noteId,
      approve: true,
    });
    const closed = (
      await f.call("customer", "invoice.service", { bookingId: b.id })
    ).invoice;
    assert.equal(closed.status, "refunded");
    assert.equal(closed.amountDueKobo, 0);
    assert.equal(closed.financialReviewReconciled, true);
    assert.equal(Number(closed.total_kobo), 120000);
    assert.equal(
      Number(
        (await one(
          f.db,
          "SELECT body FROM service_reports WHERE booking_id=$1",
          [b.id],
        ))!.body.invoiceTotalKobo,
      ),
      120000,
    );
  } finally {
    await f.db.close?.();
  }
});
