import { withAuthDeadline } from "./auth-request";
/** Local authority ends before network/GPS cleanup. Never removes encrypted field evidence. */
export async function signOutMobileSession({
  endLocalSession,
  deleteStoredSession,
  emptyStoredSession,
  storageSettled,
  stopLocation,
  revokeSession,
  timeoutMs = 5000,
}: {
  endLocalSession: () => void;
  deleteStoredSession: () => Promise<void>;
  emptyStoredSession: () => Promise<void>;
  storageSettled: (cleared: boolean) => void;
  stopLocation: () => Promise<unknown>;
  revokeSession: (signal: AbortSignal) => Promise<unknown>;
  timeoutMs?: number;
}) {
  endLocalSession();
  const stopped = withAuthDeadline(
    () => stopLocation(),
    undefined,
    timeoutMs,
  ).then(
    () => true,
    () => false,
  );
  const revoked = withAuthDeadline(revokeSession, undefined, timeoutMs).then(
    () => true,
    () => false,
  );
  let storedSessionCleared = false;
  try {
    await deleteStoredSession();
    storedSessionCleared = true;
  } catch {
    try {
      await emptyStoredSession();
      storedSessionCleared = true;
    } catch {}
  }
  storageSettled(storedSessionCleared);
  const [locationStopped, serverRevoked] = await Promise.all([
    stopped,
    revoked,
  ]);
  return { storedSessionCleared, locationStopped, serverRevoked };
}
