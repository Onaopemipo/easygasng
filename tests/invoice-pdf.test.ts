import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { PDFDocument } from "pdf-lib";
import { mkdir, writeFile } from "node:fs/promises";
import { GET } from "../apps/web/app/api/invoices/[orderId]/route";
import { fixture } from "./helpers/order-tracking-fixture";
import { invoicePdf } from "../apps/web/lib/invoice-pdf";

test("INV-PDF01: authorised download uses immutable original plus approved notes; anonymous/foreign/driver reads fail closed", async () => {
  const f = await fixture();
  const globals = globalThis as any;
  const old = globals.easygasDb;
  globals.easygasDb = Promise.resolve(f.db);
  try {
    const o = await f.make();
    await f.call("owner", "reauth", { password: "Tracking-fixture-only-123!" });
    const issued = await f.call("owner", "invoice.issue", { orderId: o.id });
    const request = (token?: string) =>
      new NextRequest(`http://localhost:3003/api/invoices/${o.id}`, {
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
    const params = { params: Promise.resolve({ orderId: o.id }) };
    assert.equal((await GET(request(), params)).status, 401);
    assert.equal(
      (await GET(request(f.actors.commercial.token), params)).status,
      404,
    );
    assert.equal(
      (await GET(request(f.actors.driver.token), params)).status,
      403,
    );
    const response = await GET(request(f.actors.customer.token), params);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control")!, /private.*no-store/);
    assert.equal(response.headers.get("content-type"), "application/pdf");
    assert.match(response.headers.get("content-disposition")!, /attachment/);
    const bytes = new Uint8Array(await response.arrayBuffer());
    assert.equal((await PDFDocument.load(bytes)).getPageCount(), 1);
    const before = JSON.stringify(issued.invoice.snapshot);
    const long = {
      ...issued.invoice,
      notes: [
        {
          state: "approved",
          sequence: 1,
          kind: "credit",
          amount_kobo: 100,
          reason: "Synthetic correction note for visual inspection",
        },
      ],
      effectiveTotalKobo: Number(issued.invoice.total_kobo) - 100,
    };
    long.snapshot = {
      ...long.snapshot,
      customer: {
        ...long.snapshot.customer,
        name: "Ọláwálé Synthetic Customer",
      },
      products: Array.from({ length: 65 }, (_, i) => ({
        name: `Synthetic invoice item ${i + 1} with a long descriptive title for wrapping`,
        quantity: 1,
        unit_price_kobo: 100,
      })),
    };
    const sample = await invoicePdf(long);
    assert.ok((await PDFDocument.load(sample)).getPageCount() > 1);
    assert.equal(JSON.stringify(issued.invoice.snapshot), before);
    await mkdir("docs/audits/production-completion-evidence", {
      recursive: true,
    });
    await writeFile(
      "docs/audits/production-completion-evidence/invoice-synthetic.pdf",
      sample,
    );
  } finally {
    globals.easygasDb = old;
    await f.db.close?.();
  }
});
