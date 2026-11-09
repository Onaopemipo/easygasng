export type TripRecoveryRecord = {
  id: string;
  userId: string;
  tripId: string;
  operationKey: string;
  sequence: number;
  kind: string;
  recordedAt: string;
  payload: Record<string, unknown>;
  syncState?: string;
  lastError?: string;
};
/** Reconcile GPS independently of financial, delivery and service queues. A conflict holds its trip, not unrelated trips. */
export async function reconcileTripGPS(
  records: TripRecoveryRecord[],
  userId: string,
  io: {
    api: (action: string, input?: any) => Promise<any>;
    ack: (e: TripRecoveryRecord) => Promise<void>;
    review: (e: TripRecoveryRecord, message: string) => Promise<void>;
  },
) {
  let sent = 0;
  const conflicts: string[] = [],
    blocked = new Set<string>();
  for (const e of records) {
    if (
      e.kind !== "gps" ||
      e.tripId.startsWith("order:") ||
      e.tripId.startsWith("booking:")
    )
      continue;
    if (e.userId !== userId)
      throw new Error(
        "Queue account identity conflict; encrypted evidence retained.",
      );
    if (blocked.has(e.tripId)) continue;
    // Always query the authoritative receipt first: a lost response may already be committed.
    try {
      const outcome = await io.api(
        "tracking.operation?key=" + encodeURIComponent(e.operationKey),
      );
      if (outcome.status === "COMMITTED") {
        if (
          outcome.action !== "trip.sync" ||
          !Array.isArray(outcome.result?.results) ||
          !outcome.result.results.some(
            (r: any) =>
              r.id === e.id && (r.accepted === true || r.replayed === true),
          )
        )
          throw Object.assign(
            new Error("Operation belongs to another workflow"),
            { status: 409 },
          );
        await io.ack(e);
        sent++;
        continue;
      }
      if (e.syncState === "Conflict") {
        conflicts.push(e.lastError ?? "Trip evidence requires review.");
        blocked.add(e.tripId);
        continue;
      }
      await io.api("trip.sync", {
        tripId: e.tripId,
        operationKey: e.operationKey,
        events: [
          {
            id: e.id,
            sequence: e.sequence,
            kind: "gps",
            recordedAt: e.recordedAt,
            payload: e.payload,
          },
        ],
      });
      await io.ack(e);
      sent++;
    } catch (error: any) {
      if ([401, 403].includes(error?.status)) throw error;
      if (
        error?.status === 409 ||
        error?.status === 400 ||
        error?.status === 404
      ) {
        const message =
          "Conflict / Requires Review. Encrypted GPS evidence retained; no trip or observation time was rewritten.";
        await io.review(e, message);
        conflicts.push(message);
        blocked.add(e.tripId);
        continue;
      }
      // Unknown network/commit/storage outcomes retain the original operation identity. Do not guess success.
      conflicts.push(
        "Pending Sync. Reconnect to reconcile the original operation; evidence retained.",
      );
      break;
    }
  }
  return { sent, conflicts };
}
