import { serviceInvoiceAction } from "../../../../lib/service-invoices";
import { NextRequest, NextResponse } from "next/server";
import { actor, AppError } from "../../../../lib/auth";
import { getDb } from "../../../../lib/db";
import { invoiceAction } from "../../../../lib/invoices";
import { invoicePdf } from "../../../../lib/invoice-pdf";
import { audit } from "../../../../lib/governance";
export const runtime = "nodejs";
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const headers = {
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
    Vary: "Cookie, Authorization",
  };
  try {
    const { orderId } = await params;
    if (!/^[a-f0-9-]{36}$/.test(orderId))
      throw new AppError(404, "Invoice not found.");
    const db = await getDb();
    const invoice: any = await db.transaction(async (tx) => {
      const user = await actor(
        tx,
        req.headers.get("authorization")?.replace(/^Bearer /, "") ??
          req.cookies.get("easygas_session")?.value ??
          null,
      );
      const result =
        req.nextUrl.searchParams.get("source") === "service"
          ? await serviceInvoiceAction(tx, user, "invoice.service", {
              bookingId: orderId,
            })
          : await invoiceAction(tx, user, "invoice.order", { orderId });
      if (!result.invoice) throw new AppError(404, "Invoice not found.");
      await audit(tx, user, "invoice.pdf.download", result.invoice.id);
      const noteId = req.nextUrl.searchParams.get("note");
      if (noteId) {
        if (
          process.env.EASYGAS_DOCUMENT_TEMPLATE_V2 !== "true" ||
          !/^[a-f0-9-]{36}$/.test(noteId)
        )
          throw new AppError(404, "Note unavailable.");
        const note = result.invoice.notes?.find(
          (n: any) => n.id === noteId && n.state === "approved",
        );
        if (!note) throw new AppError(404, "Approved note not found.");
        await audit(tx, user, "invoice.note.pdf.download", note.id);
        return { ...result.invoice, documentNote: note };
      }
      return result.invoice;
    });
    const bytes = await invoicePdf(invoice);
    const filename = String(
      invoice.invoice_number +
        (invoice.documentNote
          ? "-" +
            invoice.documentNote.kind +
            "-" +
            invoice.documentNote.sequence
          : ""),
    ).replace(/[^a-zA-Z0-9_-]/g, "-");
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        ...headers,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Invoice not available." },
      { status: error instanceof AppError ? error.status : 500, headers },
    );
  }
}
