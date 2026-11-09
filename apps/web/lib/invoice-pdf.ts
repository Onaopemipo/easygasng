import { PDFDocument, rgb, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { root } from "./db";
import { documentBrand } from "./document-brand";
import {
  financialDocument,
  documentMoney,
} from "../../../packages/business-rules/src/financial-document";
import { legacyInvoicePdf } from "./invoice-pdf-legacy";

/** Flag off restores legacy presentation. Existing unversioned snapshots always use v1. */
export async function invoicePdf(invoice: any): Promise<Uint8Array> {
  if (invoice.documentKind === "sandbox_receipt") financialDocument(invoice);
  if (
    process.env.EASYGAS_DOCUMENT_TEMPLATE_V2 !== "true" ||
    (invoice.snapshot?.documentTemplateVersion !== 2 && !invoice.documentNote)
  )
    return legacyInvoicePdf(invoice);
  return approvedDocumentPdf(invoice);
}
let fonts: Promise<Buffer[]> | undefined;
export async function approvedDocumentPdf(invoice: any): Promise<Uint8Array> {
  const d = financialDocument(invoice),
    pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  fonts ??= Promise.all([
    readFile(path.join(root, "apps/web/assets/fonts/NotoSans-Regular.ttf")),
    readFile(path.join(root, "apps/web/assets/fonts/NotoSans-Bold.ttf")).catch(
      () =>
        readFile(path.join(root, "apps/web/assets/fonts/NotoSans-Regular.ttf")),
    ),
  ]);
  const bytes = await fonts,
    font = await pdf.embedFont(bytes[0], { subset: true }),
    bold = await pdf.embedFont(bytes[1], { subset: true }),
    glyphs = new Set(font.getCharacterSet());
  const clean = (v: unknown) =>
    Array.from(String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " "))
      .map((c) =>
        glyphs.has(c.codePointAt(0)!)
          ? c
          : `[U+${c.codePointAt(0)!.toString(16).toUpperCase()}]`,
      )
      .join("");
  const green = rgb(0.025, 0.35, 0.12),
    ink = rgb(0.03, 0.055, 0.09),
    muted = rgb(0.3, 0.35, 0.4),
    pale = rgb(0.94, 0.985, 0.925),
    border = rgb(0.89, 0.91, 0.92),
    red = rgb(0.77, 0.06, 0.07);
  const logo = await pdf.embedPng(
    await readFile(path.join(root, "apps/web/public", documentBrand.logo)),
  );
  const W = 595.28,
    H = 841.89,
    L = 36,
    R = 559.28,
    CW = R - L;
  let page!: PDFPage,
    y = 0,
    table = false;
  const wrapped = (v: unknown, width: number, size = 11, strong = false) => {
    const f = strong ? bold : font,
      s = clean(v),
      out: string[] = [];
    let line = "";
    for (const c of s) {
      if (f.widthOfTextAtSize(line + c, size) > width && line) {
        out.push(line);
        line = "";
      }
      line += c;
    }
    out.push(line);
    return out;
  };
  const text = (
    v: unknown,
    x: number,
    yy: number,
    size = 11,
    strong = false,
    color = ink,
  ) =>
    page.drawText(clean(v), {
      x,
      y: yy,
      size,
      font: strong ? bold : font,
      color,
    });
  const box = (
    x: number,
    yy: number,
    width: number,
    height: number,
    color = pale,
  ) =>
    page.drawRectangle({
      x,
      y: yy - height,
      width,
      height,
      color,
      borderColor: border,
      borderWidth: 0.5,
    });
  function next() {
    page = pdf.addPage([W, H]);
    page.drawSvgPath(
      "M 280 0 C 430 100 500 10 596 0 L 596 100 C 450 120 390 60 280 0 Z",
      { x: 0, y: H, color: rgb(0.9, 0.98, 0.84), opacity: 0.65 },
    );
    page.drawSvgPath("M 350 0 C 480 15 530 70 596 120 L 596 0 Z", {
      x: 0,
      y: H,
      color: rgb(0.58, 0.81, 0.18),
      opacity: 0.35,
    });
    page.drawImage(logo, { x: L, y: 765, width: 135, height: 45 });
    page.drawLine({
      start: { x: 184, y: 775 },
      end: { x: 184, y: 803 },
      color: border,
      thickness: 1,
    });
    text(documentBrand.tagline, 199, 785, 11, true, green);
    y = 738;
    if (pdf.getPageCount() > 1) {
      text(d.title + " · continued", L, 735, 14, true);
      y = 710;
      if (table) tableHeader();
    }
  }
  function ensure(height: number) {
    if (y - height < 74) next();
  }
  function paragraph(v: unknown, size = 11, strong = false, color = ink) {
    for (const row of wrapped(v, CW, size, strong)) {
      ensure(size + 5);
      text(row, L, y, size, strong, color);
      y -= size + 5;
    }
  }
  function tableHeader() {
    ensure(30);
    box(L, y, CW, 26, rgb(0.965, 0.975, 0.965));
    text("Description", L + 12, y - 18, 11, true);
    text("Amount", R - 84, y - 18, 11, true);
    y -= 32;
  }
  function amountRow(label: string, amount: number | null, emphasis = false) {
    const size = emphasis ? 16 : 11;
    const right = documentMoney(amount);
    const rightWidth = Math.max(
        130,
        bold.widthOfTextAtSize(clean(right), size) + 12,
      ),
      leftWidth = CW - rightWidth - 36;
    const a = wrapped(label, leftWidth, size, emphasis);
    const height = Math.max(
      emphasis ? 38 : 25,
      a.length * (size + 4) + (emphasis ? 12 : 8),
    );
    ensure(height + 6);
    if (emphasis) box(L, y, CW, height, pale);
    a.forEach((line, i) =>
      text(
        line,
        L + 12,
        y - size - (emphasis ? 8 : 5) - i * (size + 5),
        size,
        emphasis,
        emphasis ? green : ink,
      ),
    );
    text(
      right,
      R - 12 - (emphasis ? bold : font).widthOfTextAtSize(clean(right), size),
      y - size - (emphasis ? 8 : 5),
      size,
      emphasis,
      emphasis ? green : ink,
    );
    y -= height;
  }
  next();
  pdf.setTitle(`${d.title} ${d.number}`);
  pdf.setAuthor(d.business.name || "EasyGas Energy Solutions");
  pdf.setSubject(
    d.sandbox
      ? "Sandbox transaction only. No live funds."
      : "Authoritative financial document",
  );
  // Verified identity only. Missing optional values are omitted rather than replaced.
  page.drawLine({
    start: { x: L, y: y + 9 },
    end: { x: L, y: y - 40 },
    color: green,
    thickness: 2,
  });
  for (const [i, v] of [
    d.business.name,
    d.business.address,
    d.business.phone,
    d.business.email,
    d.business.website,
  ]
    .filter(Boolean)
    .entries()) {
    const rows = wrapped(v, CW - 24, i === 0 ? 13 : 11, i === 0);
    for (const row of rows) {
      ensure(18);
      text(row, L + 13, y, i === 0 ? 13 : 11, i === 0);
      y -= 17;
    }
  }
  y -= 23;
  ensure(90);
  text(d.title, L, y, 28, true);
  y -= 20;
  const statusWidth = Math.min(
    CW,
    Math.max(160, bold.widthOfTextAtSize(clean(d.status), 13) + 30),
  );
  box(
    R - statusWidth,
    y + 51,
    statusWidth,
    34,
    d.verified ? pale : rgb(0.965, 0.975, 0.98),
  );
  text(
    d.status,
    R - statusWidth + 12,
    y + 29,
    13,
    true,
    d.verified ? green : muted,
  );
  if (d.sandbox) {
    box(L, y, 255, 27, rgb(1, 0.94, 0.94));
    text("SANDBOX - NO LIVE FUNDS", L + 12, y - 18, 12, true, red);
    y -= 40;
  } else y -= 18;
  paragraph(
    d.type === "receipt"
      ? "Receipt No."
      : d.type === "invoice"
        ? "Invoice No."
        : "Adjustment reference",
    11,
    false,
    muted,
  );
  paragraph(d.number, 13, true);
  y -= 3;
  paragraph("Date issued: " + d.issuedAt);
  if (d.dueDate) paragraph("Due: " + d.dueDate);
  if (d.sourceReference)
    paragraph(
      (invoice.snapshot?.serviceReference ? "Service" : "Source reference") +
        ": " +
        d.sourceReference,
    );
  if (d.paymentReference && d.paymentReference !== d.sourceReference)
    paragraph("Payment reference: " + d.paymentReference);
  if (d.type === "invoice")
    paragraph("Correction version: " + d.version, 11, false, muted);
  y -= 12;
  const customerRows = [
    ...wrapped(d.customer.name ?? "Not recorded", CW - 26, 14, true),
    ...wrapped(d.customer.public_customer_id ?? "", CW - 26),
    ...wrapped(d.address, CW - 26),
  ].filter(Boolean);
  const bh = 32 + customerRows.length * 16;
  ensure(bh + 15);
  box(L, y, CW, bh, rgb(0.975, 0.98, 0.975));
  text("Billed To", L + 13, y - 22, 11, false, muted);
  customerRows.forEach((r, i) =>
    text(r, L + 13, y - 38 - i * 16, i === 0 ? 14 : 11, i === 0),
  );
  y -= bh + 24;
  ensure(65);
  text(
    d.type === "receipt"
      ? "Payment Details"
      : d.type === "invoice"
        ? "Invoice Details"
        : "Adjustment Details",
    L,
    y,
    18,
    true,
  );
  y -= 20;
  table = true;
  tableHeader();
  for (const row of d.lines) {
    const rows = wrapped(row.label, CW - 155, 11);
    let offset = 0;
    while (offset < rows.length) {
      ensure(38);
      const count = Math.max(
        1,
        Math.min(rows.length - offset, Math.floor((y - 88) / 16)),
      );
      const h = count * 16 + 14;
      box(L, y, CW, h, rgb(1, 1, 1));
      rows
        .slice(offset, offset + count)
        .forEach((r, i) => text(r, L + 12, y - 20 - i * 16));
      if (offset === 0) {
        const m = documentMoney(row.amountKobo);
        text(
          m,
          R - 12 - bold.widthOfTextAtSize(clean(m), 12),
          y - 20,
          12,
          true,
        );
      }
      y -= h;
      offset += count;
    }
  }
  table = false;
  y -= 8;
  const summaryHeight = d.totals.reduce((sum, t) => {
    const size = t.emphasis ? 16 : 11;
    const rightWidth = Math.max(
      130,
      bold.widthOfTextAtSize(clean(documentMoney(t.amountKobo)), size) + 12,
    );
    const rows = wrapped(
      t.label,
      CW - rightWidth - 36,
      size,
      Boolean(t.emphasis),
    );
    return (
      sum +
      Math.max(
        t.emphasis ? 38 : 25,
        rows.length * (size + 4) + (t.emphasis ? 12 : 8),
      )
    );
  }, 0);
  // Keep ordinary totals together; exceptionally large correction histories may continue.
  ensure(Math.min(600, summaryHeight + 6));
  for (const t of d.totals) amountRow(t.label, t.amountKobo, t.emphasis);
  y -= 18;
  for (const n of d.notices) {
    ensure(20);
    paragraph(n, 10, false, muted);
    y -= 4;
  }
  const legalLine = [
    d.business.registrationNumber ? "RC: " + d.business.registrationNumber : "",
    d.business.taxId ? "TIN: " + d.business.taxId : "",
  ]
    .filter(Boolean)
    .join(" | ");
  const legalRows = wrapped(legalLine, CW - 100, 9);
  if (legalRows.length > 2) {
    y -= 8;
    paragraph(legalLine, 10, false, muted);
  }
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    page = p;
    page.drawLine({
      start: { x: L, y: 57 },
      end: { x: R, y: 57 },
      color: green,
      thickness: 1,
    });
    const footerName = d.business.name || "EasyGas Energy Solutions";
    // Full legal name is wrapped in the header. Avoid clipping its repeated footer.
    text(
      bold.widthOfTextAtSize(clean(footerName), 10) > CW
        ? documentBrand.tagline
        : footerName,
      L,
      42,
      10,
      true,
    );
    const legal = [
      d.business.registrationNumber
        ? "RC: " + d.business.registrationNumber
        : "",
      d.business.taxId ? "TIN: " + d.business.taxId : "",
    ]
      .filter(Boolean)
      .join(" | ");
    const footer = wrapped(legal, CW - 100, 9);
    (legalRows.length > 2 ? [] : footer).forEach((r, j) =>
      text(r, L, 28 - j * 11, 9, false, muted),
    );
    text(`${d.title} · ${i + 1}/${pages.length}`, R - 145, 28, 9, false, muted);
  });
  return pdf.save();
}
