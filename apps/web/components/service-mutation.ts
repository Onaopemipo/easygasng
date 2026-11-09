"use client";
import { api } from "./ui";
const pending = new Map<string, string>();
export async function serviceMutation(action: string, data: any) {
  const me = await api("me");
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify([action, data])),
  );
  const hash = Array.from(new Uint8Array(bytes))
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
  const storage = `easygas.operation.${me.user.id}.${hash}`;
  let key = pending.get(storage);
  try {
    key ??= sessionStorage.getItem(storage) ?? undefined;
  } catch {}
  key ??= crypto.randomUUID();
  pending.set(storage, key);
  try {
    sessionStorage.setItem(storage, key);
  } catch {}
  let result;
  try {
    result = await api(action, { ...data, operationKey: key });
  } catch (error: any) {
    if (!error.status || error.status >= 500)
      throw new Error(
        "The request outcome could not be confirmed. Retry with the same details or open My Bookings to check the saved record. Do not start a second request while this outcome is uncertain.",
      );
    throw error;
  }
  pending.delete(storage);
  try {
    sessionStorage.removeItem(storage);
  } catch {}
  return result;
}
