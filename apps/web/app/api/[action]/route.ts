import { assertRequestOrigin } from "../../../lib/request-origin";
import { validateServiceOperationRequest } from "../../../lib/business-operation";
import { NextRequest, NextResponse } from "next/server";
import { dispatch } from "../../../lib/service";
import { getDb, one } from "../../../lib/db";
import { digest } from "../../../lib/auth";
import { actor, AppError } from "../../../lib/auth";
import { ZodError } from "zod";
export const runtime = "nodejs";
const reads = new Set([
  "documents.list",
  "wallet.funding",
  "inventory.workspace",
  "inventory.movements",
  "inventory.export",
  "admin.dashboard",
  "admin.search",
  "driver.snapshot",
  "driver.history",
  "driver.location",
  "technician.snapshot",
  "technician.jobs",
  "technicians.workspace",
  "delivery.photos",
  "dispatch.board",
  "dispatch.centre",
  "dispatch.candidates",
  "fleet.summary",
  "manifest.summary",
  "bulk.summary",
  "crm.summary",
  "crm.followups",
  "channels.status",
  "channels.preferences",
  "mail.status",
  "testimonials.public",
  "testimonials.mine",
  "testimonials.manage",
  "testimonials.export",
  "testimonials.analytics",
  "testimonial.detail",
  "booking.operation",
  "tracking.operation",
  "tracking.drivers",
  "booking.recover",
  "credit.customers",
  "customers.manage",
  "customers.detail",
  "customer.dashboard",
  "navigation",
  "notifications.list",
  "navigation.access",
  "business.snapshot",
  "gas.catalogue",
  "delivery.locations.manage",
  "gas.stock",
  "gas.inspections",
  "staff.manage",
  "staff.privileges",
  "staff.lookup",
  "production.readiness",
  "bundles",
  "bundles.manage",
  "service.followups",
  "compatibility",
  "compatibility.manage",
  "policies",
  "policies.manage",
  "finance.summary",
  "finance.ledger",
  "recommendations",
  "catalogue.manage",
  "recommendations.manage",
  "services.catalogue",
  "services.slots",
  "services.manage",
  "bookings",
  "incidents",
  "delegations",
  "health",
  "campaigns",
  "schedule.authorisations",
  "credits",
  "refund.lines",
  "rewards.program",
  "rewards.summary",
  "rewards.offers",
  "rewards.smart-offers",
  "rewards.checkout-outcome",
  "rewards.report",
  "pos",
  "refill.profiles",
  "jobs",
  "account.profile",
  "support.list",
  "support.detail",
  "support.sla.policy",
  "purchasing",
  "branches",
  "transfers",
  "catalogue",
  "products.manage",
  "me",
  "orders",
  "wallet",
  "schedules",
  "settings",
  "setting.history",
  "approvals",
  "inventory",
  "audit",
  "dashboard",
  "customers",
  "staff",
  "cylinders",
  "finance",
  "cash.collections",
]);
async function readBoundedBody(req: NextRequest) {
  if (Number(req.headers.get("content-length")) > 32768)
    throw new AppError(413, "Request is too large.");
  const reader = req.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let size = 0,
    result = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 32768) {
      await reader.cancel();
      throw new AppError(413, "Request is too large.");
    }
    result += decoder.decode(value, { stream: true });
  }
  return result + decoder.decode();
}
async function handle(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;
  const sessionToken = req.headers.get("authorization")?.startsWith("Bearer ")
    ? req.headers.get("authorization")!.slice(7)
    : (req.cookies.get("easygas_session")?.value ?? null);
  try {
    if (req.method === "POST") {
      assertRequestOrigin(req);
      if (req.headers.get("content-type")?.split(";")[0] !== "application/json")
        throw new AppError(415, "Send JSON content.");
      const raw = await readBoundedBody(req);
      if (reads.has(action))
        throw new AppError(405, "Use GET for this operation.");
      if (
        [
          "login",
          "driver.login",
          "technician.login",
          "register",
          "account.recover",
          "account.reset",
          "account.verify",
          "invitation.accept",
          "phone.otp",
          "phone.review",
          "phone.complete",
          "phone.login",
        ].includes(action)
      ) {
        const db = await getDb();
        const bucket = digest("http-auth:" + action);
        const attempts = await one(
          db,
          "INSERT INTO auth_attempts(key,attempts,reset_at) VALUES ($1,1,now()+interval '1 minute') ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN auth_attempts.reset_at<=now() THEN 1 ELSE auth_attempts.attempts+1 END,reset_at=CASE WHEN auth_attempts.reset_at<=now() THEN now()+interval '1 minute' ELSE auth_attempts.reset_at END RETURNING attempts",
          [bucket],
        );
        if (Number(attempts?.attempts) > 40)
          throw new AppError(
            429,
            "Authentication is busy. Please try again in a minute.",
          );
      }
      const data = await dispatch(
        action,
        sessionToken,
        validateServiceOperationRequest(action, JSON.parse(raw)),
      );
      if (data.authError)
        return NextResponse.json(
          { error: data.authError },
          { status: data.status },
        );
      const response = NextResponse.json(
        data.token
          ? {
              ok: true,
              role: data.role,
              ...(req.headers.get("x-easygas-client") === "native"
                ? { token: data.token }
                : {}),
            }
          : data,
        { headers: { "Cache-Control": "no-store" } },
      );
      if (data.token)
        response.cookies.set("easygas_session", data.token, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          maxAge: 43200,
          path: "/",
        });
      if (action === "logout" || data.signedOut)
        response.cookies.delete("easygas_session");
      return response;
    }
    if (!reads.has(action))
      throw new AppError(405, "Use POST for this operation.");
    if (
      [
        "approvals",
        "credit.customers",
        "admin.search",
        "driver.history",
        "technician.jobs",
        "technicians.workspace",
        "technician.snapshot",
        "inventory.workspace",
        "inventory.movements",
        "inventory.export",
      ].includes(action)
    ) {
      const db = await getDb();
      const user = await actor(db, sessionToken);
      const budget = await one(
        db,
        "INSERT INTO auth_attempts(key,attempts,reset_at) VALUES($1,1,now()+interval '1 minute') ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN auth_attempts.reset_at<=now() THEN 1 ELSE auth_attempts.attempts+1 END,reset_at=CASE WHEN auth_attempts.reset_at<=now() THEN now()+interval '1 minute' ELSE auth_attempts.reset_at END RETURNING attempts",
        [
          digest(
            (action === "admin.search" ? "admin-search" : action) +
              ":" +
              user.id,
          ),
        ],
      );
      if (
        Number(budget?.attempts) >
        (action === "inventory.export"
          ? 6
          : action === "admin.search"
            ? 60
            : 120)
      )
        throw new AppError(
          429,
          "Read request limit reached. Try again in a minute.",
        );
    }
    const data = await dispatch(
      action,
      sessionToken,
      Object.fromEntries(req.nextUrl.searchParams),
    );
    return NextResponse.json(data, {
      headers:
        ["documents.list", "orders", "dispatch.centre"].includes(action)
          ? {
              "Cache-Control": "private, no-store, max-age=0",
              Vary: "Cookie, Authorization",
            }
          : { "Cache-Control": "no-store" },
    });
  } catch (e) {
    if (e instanceof ZodError)
      return NextResponse.json(
        { error: e.issues[0]?.message ?? "Check the form values." },
        { status: 400 },
      );
    if (e instanceof AppError)
      return NextResponse.json(
        { error: e.message, code: e.code },
        { status: e.status },
      );
    if (e instanceof SyntaxError)
      return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
    console.error("EasyGas operation failed", {
      action,
      type: e instanceof Error ? e.name : "unknown",
    });
    return NextResponse.json(
      { error: "This request could not be completed. Please try again." },
      { status: 500 },
    );
  }
}
export const GET = handle;
export const POST = handle;
