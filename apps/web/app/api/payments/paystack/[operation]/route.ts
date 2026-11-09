import { NextRequest, NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { getDb, one } from "../../../../../lib/db";
import { actor, AppError, digest } from "../../../../../lib/auth";
import { assertRequestOrigin } from "../../../../../lib/request-origin";
import {
  paystackAvailability,
  paystackRuntime,
  paystackWebhookKeys,
} from "../../../../../lib/payments/runtime";
import {
  preparePayment,
  readPayment,
  initializePayment,
  reconcilePayment,
} from "../../../../../lib/payments/orchestrator";
import { paymentReceipt } from "../../../../../lib/payments/documents";
import { invoicePdf } from "../../../../../lib/invoice-pdf";
import { receiveAndVerifyPaystackEvent } from "../../../../../lib/payments/webhooks";
export const runtime = "nodejs";
async function handle(
  req: NextRequest,
  { params }: { params: Promise<{ operation: string }> },
) {
  try {
    const { operation } = await params;
    const db = await getDb();
    if (operation === "configuration" && req.method === "GET") {
      const token =
        req.headers.get("authorization")?.replace(/^Bearer /i, "") ??
        req.cookies.get("easygas_session")?.value ??
        null;
      const branch = token ? (await actor(db, token)).branch_id : "lagos";
      return NextResponse.json(
        await paystackAvailability(db, branch ?? "lagos"),
        {
          headers: {
            "Cache-Control": "private, no-store",
            Vary: "Cookie, Authorization",
          },
        },
      );
    }
    if (operation === "receipt" && req.method === "GET") {
      const token =
        req.headers.get("authorization")?.replace(/^Bearer /i, "") ??
        req.cookies.get("easygas_session")?.value ??
        null;
      const receipt = await db.transaction(async (tx) =>
        paymentReceipt(
          tx,
          await actor(tx, token),
          z.string().uuid().parse(req.nextUrl.searchParams.get("intentId")),
        ),
      );
      if (req.nextUrl.searchParams.get("format") === "pdf") {
        const bytes = await invoicePdf(receipt);
        return new NextResponse(new Uint8Array(bytes), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${receipt.invoice_number}.pdf"`,
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "default-src 'none'; sandbox",
            Vary: "Cookie, Authorization",
          },
        });
      }
      return NextResponse.json(receipt, {
        headers: {
          "Cache-Control": "private, no-store",
          Vary: "Cookie, Authorization",
        },
      });
    }
    const provider = paystackRuntime();
    if (operation === "webhook") {
      if (req.method !== "POST") throw new AppError(405, "Use POST.");
      const size = Number(req.headers.get("content-length") ?? 0);
      if (size > 262144) throw new AppError(413, "Payment event is too large.");
      const reader = req.body?.getReader();
      if (!reader) throw new AppError(400, "Empty payment event.");
      const chunks: Uint8Array[] = [];
      let length = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > 262144) {
          await reader.cancel();
          throw new AppError(413, "Payment event is too large.");
        }
        chunks.push(value);
      }
      const raw = Buffer.concat(chunks);
      const result = await receiveAndVerifyPaystackEvent(
        db,
        raw,
        {
          current: req.headers.get("paystack-signature"),
          legacy: req.headers.get("x-paystack-signature"),
        },
        paystackWebhookKeys(),
        provider,
      );
      return NextResponse.json(result, {
        headers: { "Cache-Control": "no-store" },
      });
    }
    if (req.method === "POST") assertRequestOrigin(req);
    const token =
      req.headers.get("authorization")?.replace(/^Bearer /i, "") ??
      req.cookies.get("easygas_session")?.value ??
      null;
    const u = await actor(db, token);
    if (
      !["customer", "commercial"].includes(u.role) ||
      u.driver_delivery_only ||
      u.technician_service_only
    )
      throw new AppError(403, "Customer payment access required.");
    const budget = await one(
      db,
      "INSERT INTO auth_attempts(key,attempts,reset_at) VALUES($1,1,now()+interval '1 minute') ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN auth_attempts.reset_at<=now() THEN 1 ELSE auth_attempts.attempts+1 END,reset_at=CASE WHEN auth_attempts.reset_at<=now() THEN now()+interval '1 minute' ELSE auth_attempts.reset_at END RETURNING attempts",
      [digest("paystack:" + u.id)],
    );
    if (Number(budget?.attempts) > 30)
      throw new AppError(429, "Too many payment requests. Try again later.");
    let result;
    if (operation === "status" && req.method === "GET")
      result = await readPayment(
        db,
        token,
        z.string().uuid().parse(req.nextUrl.searchParams.get("intentId")),
      );
    else if (operation === "quote" && req.method === "POST")
      result = await preparePayment(db, token, await req.json());
    else if (operation === "initialize" && req.method === "POST")
      result = await initializePayment(db, token, await req.json(), provider);
    else if (operation === "verify" && req.method === "POST") {
      const d = z
        .object({ intentId: z.string().uuid() })
        .strict()
        .parse(await req.json());
      const own = await readPayment(db, token, d.intentId);
      if (!own.attempt) throw new AppError(409, "Payment attempt missing.");
      result = await reconcilePayment(db, own.attempt.reference, provider);
    } else throw new AppError(405, "Unsupported payment operation.");
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    if (e instanceof AppError)
      return NextResponse.json(
        { error: e.message, code: e.code },
        { status: e.status, headers: { "Cache-Control": "no-store" } },
      );
    if (e instanceof ZodError || e instanceof SyntaxError)
      return NextResponse.json(
        { error: "Invalid payment request." },
        { status: 400 },
      );
    return NextResponse.json(
      {
        error:
          "Payment processing is temporarily unavailable. No payment success has been inferred.",
      },
      { status: 503 },
    );
  }
}
export const GET = handle;
export const POST = handle;
