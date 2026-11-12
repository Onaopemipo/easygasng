import { AppError, type Actor } from "./auth";
const allowed = new Set([
  "me",
  "bookings",
  "logout",
  "reauth",
  "account.profile",
  "account.update",
  "account.password",
  "preferences.save",
  "notifications.read",
  "notifications.list",
  "notifications.read.bulk",
  "support.list",
  "support.create",
  "support.reply",
  "technician.restrict",
  "technician.snapshot",
  "technician.jobs",
  "technician.availability",
  "booking.transition",
  "booking.assignment.respond",
  "booking.assessment.save",
  "booking.quote",
  "booking.quote.request_review",
  "booking.work.start",
  "booking.report",
  "booking.operation",
  "booking.recover",
  "service.material.usage",
]);
export function technicianSessionPermission(
  user: Actor,
  action: string,
  input: any,
) {
  if (!user.technician_service_only) return;
  if (!allowed.has(action))
    throw new AppError(
      403,
      "This session is limited to assigned technician service work. Payments, approvals, sales and stock administration require authorised operations.",
    );
  if (
    action === "booking.transition" &&
    !["en_route", "in_progress", "failed"].includes(input?.status)
  )
    throw new AppError(403, "Only assigned visit progression is permitted.");
}
