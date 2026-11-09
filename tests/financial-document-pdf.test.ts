import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { writeFile, mkdir } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { approvedDocumentPdf, invoicePdf } from "../apps/web/lib/invoice-pdf";
// Fixtures are rendering-only. Never inserted into a business database.
const fixture = (receipt = false): any => ({
  invoice_number: receipt ? "TEST-SYNTHETIC-RECEIPT-001" : "INV-SYNTHETIC-001",
  issued_at: "2026-11-09T16:15:00Z",
  status: receipt ? "verified_test_payment" : "issued",
  documentKind: receipt ? "sandbox_receipt" : undefined,
  environment: "test",
  verifiedPostingId: receipt ? "synthetic-posting" : undefined,
  ledgerPostingId: receipt ? "synthetic-ledger" : undefined,
  total_kobo: receipt ? 700508 : 680000,
  paidKobo: receipt ? 700508 : 0,
  amountDueKobo: receipt ? 0 : 680000,
  principalKobo: 680000,
  customerFeeKobo: 20508,
  grossKobo: 700508,
  purpose: "invoice",
  policyVersion: 2,
  snapshot: {
    documentTemplateVersion: 2,
    business: {
      name: "EasyGas Energy Solutions",
      address: "Synthetic address for isolated design verification",
      phone: "+2347011960720",
    },
    customer: {
      name: "Synthetic Test Customer",
      public_customer_id: "EG-SYNTHETIC",
    },
    address: { street: "Synthetic home address", zone: "Synthetic zone" },
    orderReference: "SYNTHETIC-ORDER-001",
    products: [
      { name: "Synthetic cooking gas", quantity: 1, unit_price_kobo: 180000 },
    ],
    gas: [],
    subtotalKobo: 180000,
    deliveryKobo: 500000,
    discountKobo: 0,
    dueDate: "2026-11-10",
    taxNote: "No additional tax added; source amounts retained.",
  },
});
for (const [name, change] of [
  ["A4", (v: any) => v],
  ["RECEIPT", () => fixture(true)],
  [
    "LONG-ID",
    (v: any) => ({
      ...v,
      invoice_number: "SYNTHETIC-" + "1234567890".repeat(15),
    }),
  ],
  [
    "LONG-NAME",
    (v: any) => {
      v.snapshot.customer.name = "Ọláwálé Synthetic Customer ".repeat(9);
      v.snapshot.business.name = "Synthetic long business identity ".repeat(7);
      return v;
    },
  ],
  [
    "LONG-ADDRESS",
    (v: any) => {
      v.snapshot.address.street = "Synthetic address for wrapping ".repeat(20);
      return v;
    },
  ],
  ["NAIRA", (v: any) => v],
  [
    "OPTIONAL-IDENTITY",
    (v: any) => {
      v.snapshot.business = { name: "EasyGas Energy Solutions" };
      return v;
    },
  ],
  [
    "MULTIPAGE",
    (v: any) => {
      v.snapshot.products = Array.from({ length: 100 }, (_, i) => ({
        name: `Synthetic item ${i + 1} with a long descriptive title for wrapping`,
        quantity: 1,
        unit_price_kobo: 100,
      }));
      return v;
    },
  ],
  [
    "LONG-ITEM",
    (v: any) => {
      v.snapshot.products = [
        {
          name: "Synthetic long item ".repeat(500),
          quantity: 1,
          unit_price_kobo: 100,
        },
      ];
      return v;
    },
  ],
  [
    "CREDIT-NOTE",
    (v: any) => ({
      ...v,
      documentNote: {
        id: "synthetic-note",
        state: "approved",
        kind: "credit",
        sequence: 1,
        amount_kobo: 100,
        reason: "Synthetic approved correction; original retained",
      },
    }),
  ],
  [
    "MAX-AMOUNT",
    (v: any) => ({
      ...v,
      total_kobo: 1000000000000,
      amountDueKobo: 1000000000000,
    }),
  ],
  [
    "UNICODE",
    (v: any) => {
      v.snapshot.customer.name = "Ọláwálé ₦ Synthetic 客户";
      return v;
    },
  ],
] as [string, (v: any) => any][])
  test(`DOC-PDF-${name}: bounded A4 generation preserves content without mutating the source`, async () => {
    const v = change(fixture()),
      before = JSON.stringify(v),
      started = performance.now(),
      bytes = await approvedDocumentPdf(v),
      pdf = await PDFDocument.load(bytes);
    assert.equal(JSON.stringify(v), before);
    assert.ok(bytes.length < 2_000_000);
    assert.ok(performance.now() - started < 15000);
    for (const p of pdf.getPages()) {
      assert.equal(p.getWidth(), 595.28);
      assert.equal(p.getHeight(), 841.89);
    }
    if (name === "A4" || name === "RECEIPT")
      assert.equal(pdf.getPageCount(), 1);
    if (name === "MULTIPAGE" || name === "LONG-ITEM")
      assert.ok(pdf.getPageCount() > 1);
    if (["A4", "RECEIPT", "MULTIPAGE", "CREDIT-NOTE"].includes(name)) {
      await mkdir("docs/easygas-invoicing/evidence", { recursive: true });
      await writeFile(
        `docs/easygas-invoicing/evidence/${name.toLowerCase()}.pdf`,
        bytes,
      );
    }
  });
test("DOC-ROLLBACK: disabled flag and historical snapshots retain legacy renderer", async () => {
  const old = process.env.EASYGAS_DOCUMENT_TEMPLATE_V2;
  try {
    delete process.env.EASYGAS_DOCUMENT_TEMPLATE_V2;
    const v = fixture(),
      a = await invoicePdf(v);
    assert.ok((await PDFDocument.load(a)).getTitle()?.includes("invoice"));
    process.env.EASYGAS_DOCUMENT_TEMPLATE_V2 = "true";
    delete v.snapshot.documentTemplateVersion;
    const b = await invoicePdf(v);
    assert.ok((await PDFDocument.load(b)).getTitle()?.includes("invoice"));
    v.snapshot.documentTemplateVersion = 2;
    const c = await invoicePdf(v);
    assert.ok((await PDFDocument.load(c)).getTitle()?.includes("Invoice"));
  } finally {
    if (old === undefined) delete process.env.EASYGAS_DOCUMENT_TEMPLATE_V2;
    else process.env.EASYGAS_DOCUMENT_TEMPLATE_V2 = old;
  }
});
