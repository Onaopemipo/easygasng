import { reconcileTripGPS } from "../../packages/business-rules/src/trip-recovery";
import { nextLocationSequence } from "../../packages/business-rules/src/offline-location";
import {
  reconcileTechnicianRecords,
  serviceDraftFingerprint,
} from "../../packages/business-rules/src/technician-recovery";
import * as SecureStore from "expo-secure-store";
import * as FileSystem from "expo-file-system/legacy";
import { getRandomBytesAsync, randomUUID } from "expo-crypto";
import { sealFieldRecord, openFieldRecord } from "./field-crypto";
export type FieldEvent = {
  id: string;
  operationKey: string;
  userId: string;
  tripId: string;
  sequence: number;
  kind: "gps" | "fuel" | "status" | "photo";
  recordedAt: string;
  payload: Record<string, unknown>;
  syncState?: string;
  lastError?: string;
};
const hex = (a: Uint8Array) =>
  Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
const bytes = (s: string) => {
  if (!/^(?:[a-f0-9]{2})+$/.test(s))
    throw new Error("Encrypted queue data is invalid.");
  return Uint8Array.from(s.match(/../g)!, (v) => parseInt(v, 16));
};
function directory(userId: string) {
  if (!/^[a-f0-9-]{36}$/i.test(userId) || !FileSystem.documentDirectory)
    throw new Error("Secure local queue is unavailable.");
  return `${FileSystem.documentDirectory}field-${userId}/`;
}
async function encryptionKey(userId: string, create = false) {
  const name = `easygas.fieldKey.${userId}`;
  let k = await SecureStore.getItemAsync(name);
  if (!k) {
    if (!create)
      throw new Error(
        "Queue key is unavailable; records have not been discarded.",
      );
    k = hex(await getRandomBytesAsync(32));
    await SecureStore.setItemAsync(name, k, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }
  return bytes(k);
}
let serial = Promise.resolve();
function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = serial.then(fn, fn);
  serial = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
export async function fieldQueue(
  userId: string,
  metadataOnly = false,
): Promise<FieldEvent[]> {
  const dir = directory(userId);
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) return [];
  const names = await FileSystem.readDirectoryAsync(dir);
  const files = names.filter((f) =>
    /^[a-f0-9-]{36}\.(sealed|pending)$/.test(f),
  );
  if (files.length > 1300)
    throw new Error(
      "Queue exceeds its review limit; nothing has been discarded.",
    );
  if (!files.length) return [];
  const key = await encryptionKey(userId);
  const entries: FieldEvent[] = [];
  for (const file of files) {
    const metadata = dir + file.replace(/\.(sealed|pending)$/, ".meta");
    const candidate =
      metadataOnly &&
      !file.endsWith(".pending") &&
      (await FileSystem.getInfoAsync(metadata)).exists
        ? metadata
        : dir + file;
    const e = openFieldRecord(
      await FileSystem.readAsStringAsync(candidate),
      key,
      userId,
    );
    if (![e.id + ".sealed", e.id + ".pending"].includes(file))
      throw new Error("Queue identity mismatch.");
    if (file.endsWith(".pending"))
      await FileSystem.moveAsync({
        from: dir + file,
        to: dir + e.id + ".sealed",
      });
    const review = dir + e.id + ".review";
    if ((await FileSystem.getInfoAsync(review)).exists) {
      const state = openFieldRecord(
        await FileSystem.readAsStringAsync(review),
        key,
        userId,
      );
      if (state.id !== e.id) throw new Error("Review identity conflict.");
      e.syncState = state.syncState;
      e.lastError = state.lastError;
    }
    entries.push(e);
  }
  return entries.sort((a, b) => a.sequence - b.sequence);
}
export function captureFieldEvent(
  userId: string,
  tripId: string,
  nextSequence: number,
  kind: FieldEvent["kind"],
  payload: Record<string, unknown>,
  operationKeyOverride?: string,
  recordedAtOverride?: string,
) {
  return exclusive(async () => {
    if (
      operationKeyOverride &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        operationKeyOverride,
      )
    )
      throw new Error("Invalid delivery operation key.");
    const queue = await fieldQueue(userId, true);
    const duplicate = operationKeyOverride
      ? queue.find((e) => e.operationKey === operationKeyOverride)
      : undefined;
    if (duplicate) {
      const existing = (await fieldQueue(userId)).find(
        (e) => e.id === duplicate.id,
      )!;
      if (
        existing.tripId !== tripId ||
        existing.kind !== kind ||
        (recordedAtOverride !== undefined &&
          existing.recordedAt !== recordedAtOverride) ||
        JSON.stringify(existing.payload) !== JSON.stringify(payload)
      )
        throw new Error("Queue operation identity conflict; records retained.");
      return existing;
    }
    if (
      recordedAtOverride &&
      (kind !== "gps" ||
        !Number.isFinite(Date.parse(recordedAtOverride)) ||
        Date.parse(recordedAtOverride) > Date.now())
    )
      throw new Error("Invalid GPS observation time.");
    if (
      queue.length >= 1300 ||
      (kind === "gps"
        ? queue.filter((e) => e.kind === "gps").length >= 1000
        : queue.filter((e) => e.kind !== "gps").length >= 300)
    )
      throw new Error(
        "Synchronise or review pending events before recording more.",
      );
    const sequenceKey =
      kind === "gps" ? `easygas.fieldSeq.${userId}.${tripId}` : null;
    const savedNext = sequenceKey
      ? await SecureStore.getItemAsync(sequenceKey)
      : null;
    const floor = savedNext === null ? 1 : Number(savedNext);
    if (!Number.isSafeInteger(floor) || floor < 1)
      throw new Error("GPS sequence needs review; records retained.");
    const queuedNext = queue
      .filter((e) => e.tripId === tripId)
      .map((e) => e.sequence + 1);
    const sequence =
      kind === "gps"
        ? nextLocationSequence(nextSequence, floor, queuedNext)
        : Math.max(nextSequence, ...queuedNext);
    // Reserve the high-water mark before writing. A crash may leave a gap, never reuse an acknowledged sequence.
    if (sequenceKey)
      await SecureStore.setItemAsync(sequenceKey, String(sequence + 1), {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
      });
    const event: FieldEvent = {
      id: randomUUID(),
      operationKey: operationKeyOverride ?? randomUUID(),
      userId,
      tripId,
      sequence,
      kind,
      recordedAt: recordedAtOverride ?? new Date().toISOString(),
      payload,
    };
    const raw = JSON.stringify(event);
    if (kind === "photo" && queue.filter((e) => e.kind === "photo").length >= 5)
      throw new Error("Synchronise pending photos before adding more.");
    if (
      new TextEncoder().encode(raw).length >
      (kind === "photo"
        ? 6000000
        : tripId.startsWith("booking:")
          ? 128000
          : 4096)
    )
      throw new Error("Field event exceeds the safe metadata limit.");
    const nonce = await getRandomBytesAsync(24),
      sealed = sealFieldRecord(event, await encryptionKey(userId, true), nonce);
    const dir = directory(userId);
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    const temp = dir + event.id + ".pending",
      dest = dir + event.id + ".sealed";
    await FileSystem.writeAsStringAsync(temp, sealed);
    await FileSystem.moveAsync({ from: temp, to: dest });
    await FileSystem.writeAsStringAsync(
      dir + event.id + ".meta",
      sealFieldRecord(
        { ...event, payload: {} },
        await encryptionKey(userId),
        await getRandomBytesAsync(24),
      ),
    );
    return event;
  });
}
export function syncFieldQueue(
  userId: string,
  api: (action: string, data?: any) => Promise<any>,
  uploadPhoto?: (event: FieldEvent) => Promise<void>,
  gpsOnly = false,
) {
  return exclusive(async () => {
    const queue = await fieldQueue(userId, true);
    if (gpsOnly)
      return reconcileTripGPS(await fieldQueue(userId), userId, {
        api,
        ack: (e) => eraseFieldEvent(userId, e.id),
        review: async (e, message) =>
          FileSystem.writeAsStringAsync(
            directory(userId) + e.id + ".review",
            sealFieldRecord(
              { ...e, payload: {}, syncState: "Conflict", lastError: message },
              await encryptionKey(userId),
              await getRandomBytesAsync(24),
            ),
          ),
      });
    let sent = 0;
    for (const summary of queue) {
      if (
        gpsOnly &&
        (summary.kind !== "gps" ||
          summary.tripId.startsWith("order:") ||
          summary.tripId.startsWith("booking:"))
      )
        continue;
      const e = openFieldRecord(
        await FileSystem.readAsStringAsync(
          directory(userId) + summary.id + ".sealed",
        ),
        await encryptionKey(userId),
        userId,
      ) as FieldEvent;
      if (
        e.id !== summary.id ||
        e.operationKey !== summary.operationKey ||
        e.tripId !== summary.tripId
      )
        throw new Error("Queue metadata conflict; retain records for review.");
      if (e.kind === "photo") {
        if (!uploadPhoto)
          throw new Error("Photo upload needs an authenticated connection.");
        await uploadPhoto(e);
      } else
        await api("trip.sync", {
          tripId: e.tripId,
          operationKey: e.operationKey,
          events: [
            {
              id: e.id,
              sequence: e.sequence,
              kind: e.kind,
              recordedAt: e.recordedAt,
              payload: e.payload,
            },
          ],
        });
      await FileSystem.deleteAsync(directory(userId) + e.id + ".sealed", {
        idempotent: true,
      });
      await FileSystem.deleteAsync(directory(userId) + e.id + ".meta", {
        idempotent: true,
      });
      sent++;
    }
    return { sent, conflicts: [] as string[] };
  });
}

// Delivery-only reconciliation shares the encrypted store; legacy trip/fuel/cash
// records stay untouched and are never promoted into delivery confirmation.
export function syncDriverFieldQueue(
  userId: string,
  api: (a: string, d?: any) => Promise<any>,
  uploadPhoto: (e: FieldEvent) => Promise<unknown>,
) {
  return exclusive(async () => {
    const summaries = await fieldQueue(userId, true);
    let sent = 0;
    const conflicts: string[] = [];
    const blockedOrders = new Set<string>();
    for (const summary of summaries) {
      if (
        !summary.tripId.startsWith("order:") ||
        !["photo", "status"].includes(summary.kind)
      )
        continue;
      const path = directory(userId) + summary.id + ".sealed";
      const e = openFieldRecord(
        await FileSystem.readAsStringAsync(path),
        await encryptionKey(userId),
        userId,
      ) as FieldEvent;
      if (e.id !== summary.id || e.operationKey !== summary.operationKey)
        throw new Error("Queue identity conflict; encrypted records retained.");
      const orderId = e.tripId.slice(6);
      if (blockedOrders.has(orderId)) continue;
      if (summary.syncState === "Conflict") {
        conflicts.push(summary.lastError ?? "Requires dispatch review.");
        blockedOrders.add(orderId);
        continue;
      }
      try {
        if (e.kind === "status") {
          const result = await api(
            "tracking.operation?key=" + encodeURIComponent(e.operationKey),
          );
          if (result.status === "COMMITTED") {
            await FileSystem.deleteAsync(path, { idempotent: true });
            await FileSystem.deleteAsync(directory(userId) + e.id + ".meta", {
              idempotent: true,
            });
            await FileSystem.deleteAsync(directory(userId) + e.id + ".review", {
              idempotent: true,
            });
            sent++;
            continue;
          }
        }
        const orders = await api("orders?id=" + encodeURIComponent(orderId));
        const order = orders.find((o: any) => o.id === orderId);
        if (
          !order ||
          ["delivered", "cancelled", "delivery_failed"].includes(
            order.status,
          ) ||
          order.attempt?.id !== e.payload.attemptId
        )
          throw new Error(
            "Assignment/attempt changed. Requires dispatch review; encrypted record retained.",
          );
        if (e.kind === "photo") await uploadPhoto(e);
        else {
          const action = String(e.payload.deliveryAction);
          if (
            ![
              "dispatch.respond",
              "delivery.pickup",
              "delivery.arrived",
              "delivery.help",
              "order.transition",
              "driver.complete",
            ].includes(action)
          )
            throw new Error("Unsupported delivery record. Requires review.");
          const input = e.payload.input as any;
          if (Number(input?.version) !== Number(order.tracking_version))
            throw new Error(
              "Order version changed. Requires review before retry.",
            );
          await api(action, { ...input, operationKey: e.operationKey });
        }
        await FileSystem.deleteAsync(path, { idempotent: true });
        await FileSystem.deleteAsync(directory(userId) + e.id + ".meta", {
          idempotent: true,
        });
        await FileSystem.deleteAsync(directory(userId) + e.id + ".review", {
          idempotent: true,
        });
        sent++;
      } catch (error: any) {
        const conflict =
          error?.status === 409 || /changed|review/i.test(error.message);
        const message = conflict
          ? "Conflict / Requires Review. Encrypted evidence retained."
          : "Pending Sync. Connection or authenticated review required.";
        conflicts.push(message);
        if (conflict) {
          await FileSystem.writeAsStringAsync(
            directory(userId) + e.id + ".review",
            sealFieldRecord(
              { ...e, payload: {}, syncState: "Conflict", lastError: message },
              await encryptionKey(userId),
              await getRandomBytesAsync(24),
            ),
          );
          blockedOrders.add(orderId);
          continue;
        }
        break;
      }
    }
    return { sent, conflicts };
  });
}

// Technician drafts share the existing authenticated encrypted store, not a new job system.
async function eraseFieldEvent(userId: string, eventId: string) {
  if (!/^[a-f0-9-]{36}$/i.test(eventId))
    throw new Error("Invalid encrypted record identity.");
  for (const suffix of ["sealed", "pending", "meta", "review"])
    await FileSystem.deleteAsync(directory(userId) + eventId + "." + suffix, {
      idempotent: true,
    });
}
export function acknowledgeFieldEvent(userId: string, eventId: string) {
  return exclusive(() => eraseFieldEvent(userId, eventId));
}
export async function technicianPending(userId: string) {
  return (await fieldQueue(userId, true)).filter((e) =>
    e.tripId.startsWith("booking:"),
  );
}
export async function technicianMutation(
  userId: string,
  booking: any,
  action: string,
  input: any,
  api: (a: string, d?: any) => Promise<any>,
) {
  const fingerprint = serviceDraftFingerprint(action, input);
  const existing = (await fieldQueue(userId)).find(
    (e) =>
      e.tripId === "booking:" + booking.id &&
      e.payload.fingerprint === fingerprint,
  );
  const event =
    existing ??
    (await captureFieldEvent(
      userId,
      "booking:" + booking.id,
      1,
      "status",
      {
        serviceAction: action,
        input,
        bookingVersion: Number(booking.version),
        technicianId: userId,
        fingerprint,
      },
      input.operationKey,
    ));
  try {
    if (existing) {
      const outcome = await api(
        "booking.operation?key=" + encodeURIComponent(event.operationKey),
      );
      if (outcome.status === "COMMITTED") {
        await acknowledgeFieldEvent(userId, event.id);
        return outcome.result;
      }
      if (Number(existing.payload.bookingVersion) !== Number(booking.version))
        throw new Error(
          "Booking changed. Review the retained draft before retrying.",
        );
    }
    const result = await api(action, {
      ...input,
      operationKey: event.operationKey,
    });
    await acknowledgeFieldEvent(userId, event.id);
    return result;
  } catch (e: any) {
    // A known rejection and an unknown network outcome both retain encrypted evidence.
    throw new Error(
      (e?.status && e.status < 500 ? "Requires Review. " : "Pending Sync. ") +
        "Encrypted service draft retained; no success inferred. " +
        (e.message ?? "Reconnect to reconcile this request."),
    );
  }
}
export function syncTechnicianFieldQueue(
  userId: string,
  api: (a: string, d?: any) => Promise<any>,
  uploadPhoto?: (e: FieldEvent) => Promise<unknown>,
) {
  return exclusive(async () =>
    reconcileTechnicianRecords(await fieldQueue(userId), userId, {
      api,
      ack: (e) => eraseFieldEvent(userId, e.id),
      review: async (e, message) =>
        FileSystem.writeAsStringAsync(
          directory(userId) + e.id + ".review",
          sealFieldRecord(
            { ...e, payload: {}, syncState: "Conflict", lastError: message },
            await encryptionKey(userId),
            await getRandomBytesAsync(24),
          ),
        ),
      ...(uploadPhoto ? { upload: (e) => uploadPhoto(e as FieldEvent) } : {}),
    }),
  );
}

/** Explicit driver opt-in permits the existing encrypted key to be used after first unlock for locked-screen GPS. */
export async function prepareBackgroundFieldQueue(userId: string) {
  return exclusive(async () => {
    const key = await encryptionKey(userId, true);
    await SecureStore.setItemAsync(`easygas.fieldKey.${userId}`, hex(key), {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
  });
}
