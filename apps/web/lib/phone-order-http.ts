import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { AppError, digest, type Actor } from "./auth";
import { getDb, one } from "./db";
import { assertRequestOrigin } from "./request-origin";
import {
  completePhoneProfile,
  phoneLink,
  viewPhonePayment,
  phoneProfile,
} from "./phone-order-payments";
import {
  preparePayment,
  initializePayment,
  readPayment,
  reconcilePayment,
  type OrderPaymentAuthority,
} from "./payments/orchestrator";
import { paystackRuntime } from "./payments/runtime";
const headers = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie, Origin",
  "Referrer-Policy": "no-referrer",
};
const base = z.object({ linkId: z.string().uuid() });
const schemas = {
  view: base.extend({
    token: z
      .string()
      .regex(/^[a-f0-9]{64}$/)
      .optional(),
  }),
  configuration: base,
  profile: base.extend({ profile: phoneProfile }),
  quote: base.extend({ requestKey: z.string().uuid() }),
  initialize: base.extend({
    intentId: z.string().uuid(),
    acceptedGrossKobo: z.number().int().positive(),
    acceptedPolicyVersion: z.number().int().positive(),
  }),
  verify: base.extend({ intentId: z.string().uuid() }),
  status: base.extend({ intentId: z.string().uuid() }),
};
export async function phoneOrderHttp(
  req: NextRequest,
  { params }: { params: Promise<{ operation: string }> },
  dependencies = { getDb, paystackRuntime },
) {
  try {
    assertRequestOrigin(req);
    const { operation } = await params;
    const schema = schemas[operation as keyof typeof schemas];
    if (!schema) throw new AppError(404, "Unknown phone-order operation.");
    const reader = req.body?.getReader();
    if (!reader) throw new AppError(400, "Request body required.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const r = await reader.read();
      if (r.done) break;
      size += r.value.byteLength;
      if (size > 16384) {
        await reader.cancel();
        throw new AppError(413, "Request too large.");
      }
      chunks.push(r.value);
    }
    const d: any = schema
      .strict()
      .parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    const db = await dependencies.getDb();
    const budget = await one(
      db,
      "INSERT INTO auth_attempts(key,attempts,reset_at) VALUES($1,1,now()+interval '1 minute') ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN auth_attempts.reset_at<=now() THEN 1 ELSE auth_attempts.attempts+1 END,reset_at=CASE WHEN auth_attempts.reset_at<=now() THEN now()+interval '1 minute' ELSE auth_attempts.reset_at END RETURNING attempts",
      [
        digest(
          "phone-pay:" +
            d.linkId +
            ":" +
            (req.headers.get("x-forwarded-for") ?? "unknown"),
        ),
      ],
    );
    if (Number(budget!.attempts) > 60)
      throw new AppError(429, "Too many requests. Please retry shortly.");
    const cookie = req.cookies.get("easygas_phone_payment")?.value?.split(":");
    const raw =
      operation === "view" && d.token
        ? d.token
        : cookie?.[0] === d.linkId
          ? cookie?.[1]
          : null;
    if (!raw || !/^[a-f0-9]{64}$/.test(raw))
      throw new AppError(
        401,
        "Open the original complete private payment link from your message.",
      );
    let result: any;
    if (operation === "view" || operation === "configuration")
      result = await db.transaction(async (tx) => {
        const v = await viewPhonePayment(tx, d.linkId, raw);
        return operation === "configuration" ? v.configuration : v;
      });
    else if (operation === "profile")
      result = await db.transaction((tx) =>
        completePhoneProfile(tx, d.linkId, raw, d.profile),
      );
    else {
      const target = await db.transaction(async (tx) => {
        const { o } = await phoneLink(tx, d.linkId, raw, true);
        const invoice = await one(
          tx,
          "SELECT id FROM customer_invoices WHERE order_id=$1",
          [o.id],
        );
        return {
          orderId: o.id,
          payment: invoice
            ? { purpose: "invoice", invoiceId: invoice.id }
            : { purpose: "order", orderId: o.id },
        };
      });
      const authority: OrderPaymentAuthority = {
        orderId: target.orderId,
        linkId: d.linkId,
        resolve: async (tx) => {
          const { u } = await phoneLink(tx, d.linkId, raw, true);
          return {
            ...u,
            verified_at: null,
            session_id: "phone-order:" + d.linkId,
          } as Actor;
        },
      };
      if (operation === "quote") {
        dependencies.paystackRuntime();
        result = await preparePayment(
          db,
          null,
          { ...target.payment, requestKey: d.requestKey },
          authority,
        );
      } else if (operation === "initialize")
        result = await initializePayment(
          db,
          null,
          {
            intentId: d.intentId,
            acceptedGrossKobo: d.acceptedGrossKobo,
            acceptedPolicyVersion: d.acceptedPolicyVersion,
          },
          dependencies.paystackRuntime(),
          false,
          authority,
        );
      else if (operation === "status")
        result = await readPayment(db, null, d.intentId, authority);
      else {
        const own = await readPayment(db, null, d.intentId, authority);
        if (!own.attempt)
          throw new AppError(409, "Payment attempt unavailable.");
        result = await reconcilePayment(
          db,
          own.attempt.reference,
          dependencies.paystackRuntime(),
        );
      }
    }
    const response = NextResponse.json(result, { headers });
    if (operation === "view" && d.token)
      response.cookies.set("easygas_phone_payment", d.linkId + ":" + raw, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api/phone-orders",
        maxAge: 86400,
      });
    return response;
  } catch (e) {
    if (e instanceof AppError)
      return NextResponse.json(
        { error: e.message, code: e.code },
        { status: e.status, headers },
      );
    if (e instanceof ZodError || e instanceof SyntaxError)
      return NextResponse.json(
        { error: "Invalid phone-order request." },
        { status: 400, headers },
      );
    return NextResponse.json(
      {
        error:
          "Phone-order checkout is temporarily unavailable. No payment success has been inferred.",
      },
      { status: 503, headers },
    );
  }
}
