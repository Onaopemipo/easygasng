import * as SecureStore from "expo-secure-store";
import { randomUUID } from "expo-crypto";
export type PendingDelivery = {
  id: string;
  userId: string;
  orderId: string;
  version: number;
  handover: boolean;
  operationKey: string;
  code: string;
  collectedKobo: number;
  recordedAt: string;
  error?: string;
};
const key = (uid: string) => `easygas.deliveryQueue.${uid}`;
export async function loadQueue(userId: string): Promise<PendingDelivery[]> {
  try {
    const data = JSON.parse(
      (await SecureStore.getItemAsync(key(userId))) ?? "[]",
    );
    return Array.isArray(data)
      ? data
          .filter(
            (e) =>
              e.userId === userId &&
              typeof e.orderId === "string" &&
              /^\d{6}$/.test(e.code) &&
              Number.isSafeInteger(e.collectedKobo) &&
              e.collectedKobo >= 0,
          )
          .slice(0, 50)
      : [];
  } catch {
    throw new Error(
      "The offline delivery queue could not be read. It has not been discarded.",
    );
  }
}
export async function saveQueue(userId: string, queue: PendingDelivery[]) {
  if (queue.some((e) => e.userId !== userId))
    throw new Error("Queue account mismatch.");
  await SecureStore.setItemAsync(key(userId), JSON.stringify(queue));
}
export async function enqueueDelivery(
  userId: string,
  input: {
    orderId: string;
    code: string;
    collectedKobo: number;
    version: number;
    handover: boolean;
    operationKey: string;
  },
) {
  if (
    !/^\d{6}$/.test(input.code) ||
    !Number.isSafeInteger(input.collectedKobo) ||
    input.collectedKobo < 0
  )
    throw new Error("Enter a six-digit code and a valid cash amount.");
  const queue = await loadQueue(userId);
  if (queue.some((q) => q.orderId === input.orderId))
    throw new Error("This delivery already awaits synchronisation.");
  if (queue.length >= 50)
    throw new Error("Synchronise pending deliveries before recording more.");
  queue.push({
    id: randomUUID(),
    userId,
    ...input,
    recordedAt: new Date().toISOString(),
  });
  await saveQueue(userId, queue);
  return queue;
}
