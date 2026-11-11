import { z } from "zod";
// Targets are supplied by the business. Hours are local to Africa/Lagos (UTC+01).
export const supportSlaPolicy = z
  .object({
    responseMinutes: z.number().int().min(1).max(43200),
    resolutionMinutes: z.number().int().min(1).max(43200),
    weekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
    startHour: z.number().int().min(0).max(23),
    endHour: z.number().int().min(1).max(24),
  })
  .strict()
  .refine((p) => p.endHour > p.startHour, {
    message: "Closing hour must follow opening hour.",
  });
export function supportDueAt(
  start: Date,
  minutes: number,
  policy: z.infer<typeof supportSlaPolicy>,
) {
  let cursor = start.getTime();
  let remaining = minutes * 60000;
  // Walk day windows, retaining seconds within open hours and skipping closed days.
  for (let day = 0; day < 3660; day++) {
    const local = new Date(cursor + 3600000);
    const midnight =
      Date.UTC(
        local.getUTCFullYear(),
        local.getUTCMonth(),
        local.getUTCDate(),
      ) - 3600000;
    if (policy.weekdays.includes(local.getUTCDay())) {
      const open = midnight + policy.startHour * 3600000;
      const close = midnight + policy.endHour * 3600000;
      const from = Math.max(cursor, open);
      const available = Math.max(0, close - from);
      if (remaining <= available) return new Date(from + remaining);
      remaining -= available;
    }
    cursor = midnight + 86400000;
  }
  throw new Error("SLA target exceeds the supported calendar range.");
}
export function supportSlaState(ticket: Record<string, any>, now = new Date()) {
  const response = ticket.first_response_at
    ? ticket.response_due_at &&
      new Date(ticket.first_response_at) > new Date(ticket.response_due_at)
      ? "late"
      : "met"
    : !ticket.response_due_at
      ? "unconfigured"
      : new Date(ticket.response_due_at) < now
        ? "overdue"
        : "pending";
  const resolution = ticket.resolved_at
    ? ticket.resolution_due_at &&
      new Date(ticket.resolved_at) > new Date(ticket.resolution_due_at)
      ? "late"
      : "met"
    : !ticket.resolution_due_at
      ? "unconfigured"
      : new Date(ticket.resolution_due_at) < now
        ? "overdue"
        : "pending";
  return { response, resolution };
}
