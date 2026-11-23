import * as FileSystem from "expo-file-system/legacy";
import * as SecureStore from "expo-secure-store";
import { getRandomBytesAsync, randomUUID } from "expo-crypto";
import {
  sealFieldRecord,
  openFieldRecord,
  hexBytes,
  unhex,
} from "./field-crypto";
export type CheckoutDraftRecord = {
  userId: string;
  draft?: any;
  pending?: { action: string; payload: any };
  order?: any;
};
let queue = Promise.resolve();
function location(userId: string) {
  if (!/^[a-f0-9-]{36}$/i.test(userId) || !FileSystem.documentDirectory)
    throw Error("Secure checkout storage is unavailable.");
  return FileSystem.documentDirectory + "checkout-" + userId + "/";
}
async function key(userId: string, create = false) {
  const name = "easygas.checkoutKey." + userId;
  let raw = await SecureStore.getItemAsync(name);
  if (!raw) {
    if (!create)
      throw Error(
        "The saved checkout key is unavailable. Existing records were preserved.",
      );
    raw = hexBytes(await getRandomBytesAsync(32));
    await SecureStore.setItemAsync(name, raw, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }
  return unhex(raw);
}
export async function readCheckoutDraft(
  userId: string,
): Promise<CheckoutDraftRecord | null> {
  await queue;
  const dir = location(userId),
    main = dir + "current.sealed",
    backup = dir + "previous.sealed";
  const file = (await FileSystem.getInfoAsync(main)).exists
    ? main
    : (await FileSystem.getInfoAsync(backup)).exists
      ? backup
      : null;
  if (!file) return null;
  return openFieldRecord(
    await FileSystem.readAsStringAsync(file),
    await key(userId),
    userId,
  );
}
export function saveCheckoutDraft(record: CheckoutDraftRecord) {
  const run = queue.then(async () => {
    const dir = location(record.userId);
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    const cipher = sealFieldRecord(
        record,
        await key(record.userId, true),
        await getRandomBytesAsync(24),
      ),
      tmp = dir + randomUUID() + ".pending",
      main = dir + "current.sealed",
      backup = dir + "previous.sealed";
    await FileSystem.writeAsStringAsync(tmp, cipher);
    if ((await FileSystem.getInfoAsync(main)).exists) {
      await FileSystem.deleteAsync(backup, { idempotent: true });
      await FileSystem.moveAsync({ from: main, to: backup });
    }
    await FileSystem.moveAsync({ from: tmp, to: main });
    await FileSystem.deleteAsync(backup, { idempotent: true });
  });
  queue = run.catch(() => {});
  return run;
}
export async function clearCheckoutDraft(userId: string) {
  await queue;
  await FileSystem.deleteAsync(location(userId), { idempotent: true });
}
