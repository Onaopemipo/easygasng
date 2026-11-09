import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { root } from "./db";
import { documentBrand } from "./document-brand";

let fontBytes: Promise<Buffer> | undefined;
export async function legacyInvoicePdf(invoice: any): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  fontBytes ??= readFile(
    path.join(root, "apps/web/assets/fonts/NotoSans-Regular.ttf"),
  );
  const font = await pdf.embedFont(await fontBytes, { subset: true });
  const glyphs = new Set(font.getCharacterSet());
  const clean = (s: unknown) =>
    Array.from(String(s ?? "").replace(/[\u0000-\u001f\u007f]/g, " "))
      .map((c) =>
        glyphs.has(c.codePointAt(0)!)
          ? c
          : `[U+${c.codePointAt(0)!.toString(16).toUpperCase()}]`,
      )
      .join("");
  const money = (v: unknown) =>
    `NGN ${(Number(v) / 100).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const logo = await pdf.embedPng(
    await readFile(path.join(root, "apps/web/public", documentBrand.logo)),
  );
  const decorate = (p: ReturnType<typeof pdf.addPage>) => {
    p.drawRectangle({
      x: 0,
      y: 831.89,
      width: 595.28,
      height: 10,
      color: rgb(0.027, 0.349, 0.18),
    });
    p.drawImage(logo, { x: 44, y: 750, width: 210, height: 70 });
    p.drawText(documentBrand.tagline, {
      x: 310,
      y: 775,
      size: 11,
      font,
      color: rgb(0.027, 0.349, 0.18),
    });
    p.drawRectangle({
      x: 44,
      y: 735,
      width: 455,
      height: 3,
      color: rgb(0.569, 0.788, 0),
    });
    p.drawRectangle({
      x: 499,
      y: 735,
      width: 52,
      height: 3,
      color: rgb(1, 0.475, 0),
    });
  };
  let page = pdf.addPage([595.28, 841.89]),
    y = 710;
  decorate(page);
  const line = (value: unknown, size = 11) => {
    const text = clean(value);
    let current = "";
    const flush = () => {
      if (y < 62) {
        page = pdf.addPage([595.28, 841.89]);
        decorate(page);
        y = 710;
      }
      page.drawText(current, {
        x: 44,
        y,
        size,
        font,
        color: rgb(0.04, 0.16, 0.12),
      });
      y -= size + 7;
      current = "";
    };
    for (const c of text) {
      if (font.widthOfTextAtSize(current + c, size) > 507 && current) flush();
      current += c;
    }
    flush();
  };
  const gap = () => {
    y -= 12;
  };
  const s = invoice.snapshot;
  const receipt = invoice.documentKind === "sandbox_receipt";
  pdf.setTitle(
    `EasyGas ${receipt ? "sandbox receipt" : "invoice"} ${invoice.invoice_number}`,
  );
  pdf.setAuthor("EasyGas Energy Solutions");
  line(s.business.name, 15);
  line(
    receipt ? "SANDBOX PAYMENT RECEIPT — NO LIVE FUNDS" : "CUSTOMER INVOICE",
    13,
  );
  line(invoice.invoice_number, 16);
  line(s.business.address);
  line(s.business.phone);
  gap();
  line(
    `Issued: ${new Date(invoice.issued_at).toLocaleString("en-GB", { timeZone: "Africa/Lagos" })} (Lagos)`,
  );
  line(`Due: ${s.dueDate}`);
  line(`${s.serviceReference ? "Service" : "Order"}: ${s.orderReference}`);
  line(
    `Status: ${invoice.status.replaceAll("_", " ")} | Correction version: ${invoice.correctionVersion ?? 1}`,
  );
  gap();
  line(`Bill to: ${s.customer.name}`, 13);
  line(s.customer.public_customer_id);
  line([s.address.street, s.address.zone].filter(Boolean).join(", "));
  gap();
  line(receipt ? "VERIFIED COLLECTION BREAKDOWN" : "ORIGINAL ISSUED ITEMS", 13);
  for (const p of s.products ?? [])
    line(
      `${p.name} | ${p.quantity} x ${money(p.unit_price_kobo)} = ${money(Number(p.quantity) * Number(p.unit_price_kobo))}`,
    );
  for (const g of s.gas ?? [])
    line(
      `Cooking gas ${Number(g.grams) / 1000} kg | cylinder capacity ${Number(g.capacity_grams) / 1000} kg | ${money(g.subtotal_kobo)}`,
    );
  gap();
  line(`Subtotal: ${money(s.subtotalKobo)}`);
  line(`Delivery: ${money(s.deliveryKobo)}`);
  line(`Discount: ${money(s.discountKobo)}`);
  line(`Original issued total: ${money(invoice.total_kobo)}`, 13);
  const approved = (invoice.notes ?? []).filter(
    (n: any) => n.state === "approved",
  );
  if (approved.length) {
    gap();
    line("APPROVED CORRECTION NOTES", 13);
    for (const n of approved) {
      line(`#${n.sequence} ${n.kind.toUpperCase()} ${money(n.amount_kobo)}`);
      line(n.reason);
    }
  }
  gap();
  line(
    `Effective invoice total: ${money(invoice.effectiveTotalKobo ?? invoice.total_kobo)}`,
    13,
  );
  line(`Verified net paid: ${money(invoice.paidKobo)}`);
  line(
    invoice.amountDueKobo === null
      ? "Amount due: finance reconciliation required"
      : `Amount due: ${money(invoice.amountDueKobo)}`,
    13,
  );
  gap();
  line(s.taxNote);
  if (s.customerNote) line(s.customerNote);
  line(
    "An invoice is not proof of payment. Settlement is based on the verified ledger.",
  );
  line(
    receipt
      ? "Issued only from a committed verified sandbox posting."
      : "This invoice alone does not confirm an online payment.",
  );
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    p.drawLine({
      start: { x: 44, y: 48 },
      end: { x: 551, y: 48 },
      thickness: 1,
      color: rgb(0.569, 0.788, 0),
    });
    p.drawText(
      `EasyGas | ${clean(invoice.invoice_number)} | Page ${i + 1} of ${pages.length}`,
      { x: 44, y: 30, size: 9, font, color: rgb(0.3, 0.38, 0.34) },
    );
  });
  return pdf.save();
}
