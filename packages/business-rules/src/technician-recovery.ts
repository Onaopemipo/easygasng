/** Offline drafts never authorise chargeable work or report publication. */
export const technicianReplayActions = new Set([
  "service.photo.upload",
  "booking.assessment.save",
  "booking.assignment.respond",
  "booking.transition",
  "service.material.usage",
]);
export function technicianReplayCheck(
  userId: string,
  record: { action: string; bookingId: string; version: number; input: any },
  booking: any,
) {
  if (
    !booking ||
    booking.id !== record.bookingId ||
    booking.technician_id !== userId
  )
    throw new Error("Assignment changed. Requires service operations review.");
  if (["completed", "cancelled", "failed"].includes(booking.status))
    throw new Error("Job is closed. Requires service operations review.");
  if (Number(booking.version) !== record.version)
    throw new Error(
      "Booking version changed. Requires review; draft retained.",
    );
  if (!technicianReplayActions.has(record.action))
    throw new Error(
      "This action requires online review and confirmation; no automatic replay is permitted.",
    );
  if (
    record.action === "booking.transition" &&
    !["en_route", "in_progress", "failed"].includes(record.input?.status)
  )
    throw new Error("Unsupported technician progression; draft retained.");
  if (record.input?.bookingId !== record.bookingId)
    throw new Error("Draft booking identity mismatch.");
}
export function serviceDraftFingerprint(action: string, input: any) {
  const canonical = (v: any): string =>
    Array.isArray(v)
      ? "[" + v.map(canonical).join(",") + "]"
      : v && typeof v === "object"
        ? "{" +
          Object.entries(v)
            .filter(([k, x]) => k !== "operationKey" && x !== undefined)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, x]) => JSON.stringify(k) + ":" + canonical(x))
            .join(",") +
          "}"
        : JSON.stringify(v);
  return action + ":" + canonical(input);
}

export type ServiceRecoveryRecord = {
  id: string;
  userId: string;
  operationKey: string;
  tripId: string;
  kind: string;
  payload: Record<string, any>;
};
export async function reconcileTechnicianRecords(
  records: ServiceRecoveryRecord[],
  userId: string,
  io: {
    api: (action: string, data?: any) => Promise<any>;
    ack: (record: ServiceRecoveryRecord) => Promise<void>;
    review: (record: ServiceRecoveryRecord, message: string) => Promise<void>;
    upload?: (record: ServiceRecoveryRecord) => Promise<unknown>;
  },
) {
  const blocked = new Set<string>();
  let sent = 0;
  const conflicts: string[] = [];
  for (const e of records) {
    if (!e.tripId.startsWith("booking:")) continue;
    const bookingId = e.tripId.slice(8);
    if (blocked.has(bookingId)) continue;
    try {
      if (e.userId !== userId || e.payload.technicianId !== userId)
        throw new Error("Queue account identity conflict.");
      if (e.kind !== "photo") {
        const outcome = await io.api(
          "booking.operation?key=" + encodeURIComponent(e.operationKey),
        );
        if (outcome.status === "COMMITTED") {
          await io.ack(e);
          sent++;
          continue;
        }
      }
      const rows = await io.api("bookings?id=" + encodeURIComponent(bookingId));
      const booking = rows.find((b: any) => b.id === bookingId);
      technicianReplayCheck(
        userId,
        {
          action: String(e.payload.serviceAction),
          bookingId,
          version: Number(e.payload.bookingVersion),
          input: e.payload.input,
        },
        booking,
      );
      if (e.kind === "photo") {
        if (!io.upload)
          throw new Error(
            "Authenticated photo upload unavailable; evidence retained.",
          );
        await io.upload(e);
      } else
        await io.api(String(e.payload.serviceAction), {
          ...e.payload.input,
          operationKey: e.operationKey,
        });
      await io.ack(e);
      sent++;
    } catch (err: any) {
      const message =
        err.status === 401 || err.status === 403
          ? "Access revoked or expired. Sign in again; evidence retained."
          : (err.message ?? "Pending connection; evidence retained.");
      conflicts.push(message);
      blocked.add(bookingId);
      await io.review(e, message);
      if (
        err.status === 401 ||
        err.status === 403 ||
        err.status >= 500 ||
        (!err.status && /network|fetch|connect/i.test(message))
      )
        break;
    }
  }
  return { sent, conflicts };
}
