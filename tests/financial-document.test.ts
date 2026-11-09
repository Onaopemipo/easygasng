import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  financialDocument,
  documentMoney,
  exactKobo,
  documentDate,
} from "../packages/business-rules/src/financial-document";
import { FinancialDocumentPreview } from "../apps/web/components/financial-document";
export const sampleInvoice = () => ({
  id: "fixture-document-only",
  invoice_number: "INV-SYNTHETIC-001",
  issued_at: "2026-11-09T16:15:00Z",
  status: "issued",
  total_kobo: 680000,
  paidKobo: 0,
  amountDueKobo: 680000,
  snapshot: {
    documentTemplateVersion: 2,
    business: {
      name: "EasyGas Energy Solutions",
      address: "Synthetic business address for renderer tests",
      phone: "+2347011960720",
    },
    customer: {
      name: "Synthetic Test Customer",
      public_customer_id: "EG-SYNTHETIC",
    },
    address: { street: "Synthetic home address", zone: "Synthetic zone" },
    orderReference: "SYNTHETIC-ORDER",
    products: [
      {
        name: "Synthetic cooking gas order",
        quantity: 1,
        unit_price_kobo: 180000,
      },
    ],
    gas: [],
    subtotalKobo: 180000,
    deliveryKobo: 500000,
    discountKobo: 0,
    dueDate: "2026-11-10",
    taxNote: "Recorded source totals only.",
  },
});
export const sampleReceipt = () => ({
  ...sampleInvoice(),
  documentKind: "sandbox_receipt",
  environment: "test",
  verifiedPostingId: "synthetic-posting",
  ledgerPostingId: "synthetic-ledger",
  status: "verified_test_payment",
  purpose: "invoice",
  principalKobo: 680000,
  customerFeeKobo: 20508,
  grossKobo: 700508,
  paidKobo: 700508,
  total_kobo: 700508,
  amountDueKobo: 0,
  policyVersion: 2,
  invoice_number: "TEST-SYNTHETIC-RECEIPT",
});
for (const [id, patch, expected] of [
  ["UNPAID", {}, "Unpaid invoice"],
  ["FALSE-PAID-FLAG", { status: "paid" }, "Unpaid invoice"],
  [
    "PARTIAL",
    { paidKobo: 100000, amountDueKobo: 580000 },
    "Partially paid invoice",
  ],
  ["PAID", { paidKobo: 680000, amountDueKobo: 0 }, "Paid invoice"],
  ["ZERO-DUE-UNPAID", { paidKobo: 0, amountDueKobo: 0 }, "Unpaid invoice"],
  ["VOID", { status: "voided", amountDueKobo: 0 }, "Voided invoice"],
  ["UNKNOWN-BALANCE", { amountDueKobo: null }, "Reconciliation required"],
  ["OVERDUE", { overdue: true }, "Unpaid invoice"],
  [
    "ADJUSTED",
    { status: "adjusted", effectiveTotalKobo: 670000, amountDueKobo: 670000 },
    "Unpaid invoice",
  ],
  [
    "CREDIT-BALANCE",
    { paidKobo: 700000, amountDueKobo: 0, overpaidKobo: 20000 },
    "Paid invoice",
  ],
] as const)
  test(`DOC-STATE-${id}: invoice status never becomes a payment verification badge`, () => {
    const d = financialDocument({ ...sampleInvoice(), ...patch });
    assert.equal(d.status, expected);
    assert.equal(d.verified, false);
    assert.notEqual(d.status, "Payment Verified");
    assert.equal(d.type, "invoice");
  });
for (const [input, output] of [
  [0, "₦0.00"],
  [1, "₦0.01"],
  [99, "₦0.99"],
  [100, "₦1.00"],
  [700508, "₦7,005.08"],
  [1000000000000, "₦10,000,000,000.00"],
] as const)
  test(`DOC-MONEY-${input}: integer minor units retain exact cents`, () =>
    assert.equal(documentMoney(input), output));
for (const [i, input] of [
  -1,
  1.1,
  NaN,
  Infinity,
  "1.50",
  "bad",
  null,
  undefined,
  Number.MAX_SAFE_INTEGER,
].entries())
  test(`DOC-AMOUNT-REJECT-${i}: invalid amount cannot render as an authoritative total`, () =>
    assert.throws(() => exactKobo(input)));
for (const [name, patch] of [
  ["posting", { verifiedPostingId: null }],
  ["ledger", { ledgerPostingId: null }],
  ["state", { status: "pending" }],
  ["environment", { environment: "live" }],
  ["gross", { grossKobo: 700507 }],
  ["principal", { principalKobo: 680001 }],
  ["due", { amountDueKobo: 1 }],
  ["paid", { paidKobo: 0 }],
] as const)
  test(`DOC-RECEIPT-DENY-${name}: receipt refuses absent or mismatched verified evidence`, () =>
    assert.throws(() => financialDocument({ ...sampleReceipt(), ...patch })));
test("DOC-RECEIPT: verified collection is distinct from settlement and wallet liability", () => {
  const d = financialDocument({ ...sampleReceipt(), purpose: "wallet" });
  assert.equal(d.status, "Payment Verified");
  assert.equal(d.sandbox, true);
  assert.equal(d.lines[0].label, "Wallet funding principal");
  assert.equal(d.lines[0].amountKobo, 680000);
  assert.equal(d.lines[1].amountKobo, 20508);
  assert.equal(d.totals[0].amountKobo, 700508);
  assert.ok(d.notices.some((v) => v.includes("not sales revenue")));
  assert.ok(
    d.notices.some((v) =>
      v.includes("not confirmation of merchant settlement"),
    ),
  );
});
for (const kind of ["credit", "debit", "void"])
  test(`DOC-NOTE-${kind}: adjustment retains original reference and never confirms refund`, () => {
    const d = financialDocument({
      ...sampleInvoice(),
      documentNote: {
        id: "synthetic-note",
        state: "approved",
        sequence: 1,
        kind,
        amount_kobo: 100,
        reason: "Synthetic approved adjustment",
      },
    });
    assert.equal(d.type, kind + "_note");
    assert.match(d.number, /INV-SYNTHETIC-001/);
    assert.equal(d.verified, false);
    assert.ok(
      d.notices.some((v) =>
        v.includes("not a payment receipt or refund confirmation"),
      ),
    );
  });
test("DOC-NOTE-DENY: pending adjustments cannot become approved documents", () =>
  assert.throws(() =>
    financialDocument({
      ...sampleInvoice(),
      documentNote: { id: "pending", state: "pending", kind: "credit" },
    }),
  ));
test("DOC-LEGAL-OMIT: absent RC, TIN, email and website never copy mockup values", () => {
  const html = renderToStaticMarkup(
    React.createElement(FinancialDocumentPreview, { invoice: sampleInvoice() }),
  );
  for (const text of [
    "1234567",
    "0123456789",
    "support@easygas.com",
    "www.easygas.com",
    "Payment Verified",
  ])
    assert.ok(!html.includes(text));
  assert.match(html, /Invoice/);
  assert.match(html, /Unpaid invoice/);
});
test("DOC-ESCAPE: customer, references and identity remain inert text", () => {
  const v = sampleInvoice();
  v.snapshot.customer.name = '<script>alert("x")</script>';
  const html = renderToStaticMarkup(
    React.createElement(FinancialDocumentPreview, { invoice: v }),
  );
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<script>"));
});
test("DOC-SNAPSHOT: rendering never mutates issued items or identifiers", () => {
  const v = sampleInvoice(),
    before = JSON.stringify(v);
  financialDocument(v);
  renderToStaticMarkup(
    React.createElement(FinancialDocumentPreview, { invoice: v }),
  );
  assert.equal(JSON.stringify(v), before);
});
test("DOC-DATE: issue date is rendered in Africa/Lagos and invalid date is honest", () => {
  assert.match(documentDate("2026-11-09T23:15:00Z"), /10 Nov 2026/);
  assert.equal(documentDate("bad"), "Not recorded");
});
test("DOC-LIMIT: document line count is bounded before rendering", () => {
  const v = sampleInvoice();
  v.snapshot.products = Array.from(
    { length: 1001 },
    () => v.snapshot.products[0],
  );
  assert.throws(() => financialDocument(v), /limit/);
});

test("DOC-PRIVATE-DIAGNOSTIC: optional configuration and approval metadata do not leak into the customer document model", () => {
  const v = sampleInvoice();
  Object.assign(v.snapshot.business, {
    identityWarning: "Internal verification workflow diagnostic",
    identityVersion: 2,
    verificationReference: "Internal evidence",
  });
  const d = financialDocument(v);
  assert.equal(d.business.identityWarning, undefined);
  assert.equal(d.business.verificationReference, undefined);
  assert.equal(d.business.identityVersion, undefined);
  assert.ok(!d.notices.some((n) => n.includes("Internal")));
});
