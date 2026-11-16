import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { actor, AppError } from "../auth";
import { getDb } from "../db";
import { invoicePdf } from "../invoice-pdf";
import { paymentReceipt } from "./documents";

const privateHeaders = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie, Authorization",
};

export async function receiptResponse(req: NextRequest) {
  try {
    const token =
      req.headers.get("authorization")?.replace(/^Bearer /i, "") ??
      req.cookies.get("easygas_session")?.value ??
      null;
    const db = await getDb();
    const receipt = await db.transaction(async (tx) => {
      const user = await actor(tx, token);
      const intent = z.string().uuid().safeParse(req.nextUrl.searchParams.get("intentId"));
      if (!intent.success) throw new AppError(400, "Invalid payment reference.");
      return paymentReceipt(tx, user, intent.data);
    });
    if (req.nextUrl.searchParams.get("format") !== "pdf")
      return NextResponse.json(receipt, { headers: privateHeaders });
    return new NextResponse(new Uint8Array(await invoicePdf(receipt)), {
      headers: {
        ...privateHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${receipt.invoice_number}.pdf"`,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    return NextResponse.json(
      error instanceof AppError
        ? { error: error.message, code: error.code }
        : { error: "We couldn't load your EasyGas receipt. Please try again." },
      {
        status: error instanceof AppError ? error.status : 503,
        headers: privateHeaders,
      },
    );
  }
}
