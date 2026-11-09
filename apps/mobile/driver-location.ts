// Older installed binaries do not contain this new native module. Keep their existing driver UI usable.
const TaskManager: typeof import("expo-task-manager") | null = (() => {
  try {
    return require("expo-task-manager");
  } catch {
    return null;
  }
})();
import * as Location from "expo-location";
import * as SecureStore from "expo-secure-store";
import { digestStringAsync, CryptoDigestAlgorithm } from "expo-crypto";
import { captureFieldEvent, prepareBackgroundFieldQueue } from "./field-queue";
import {
  authorisedOfflineFix,
  locationLeaseMs,
  type LocationLease,
} from "../../packages/business-rules/src/offline-location";
export const driverLocationTask = "easygas-consented-driver-gps-v1";
const leaseKey = "easygas.driverGps.lease";
const errorKey = "easygas.driverGps.error";
let captureGeneration = 0;
const options = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};
export async function driverLocationState(): Promise<{
  lease: LocationLease | null;
  error: string | null;
}> {
  const raw = await SecureStore.getItemAsync(leaseKey);
  return {
    lease: raw ? JSON.parse(raw) : null,
    error: await SecureStore.getItemAsync(errorKey),
  };
}
export async function stopDriverLocation() {
  captureGeneration++;
  // Revoke local authority before asking the operating system to stop callbacks.
  await SecureStore.deleteItemAsync(leaseKey);
  if (!TaskManager) return;
  if (await Location.hasStartedLocationUpdatesAsync(driverLocationTask))
    await Location.stopLocationUpdatesAsync(driverLocationTask);
}
TaskManager?.defineTask<{ locations: Location.LocationObject[] }>(
  driverLocationTask,
  async ({ data, error }) => {
    try {
      if (error)
        throw new Error(
          "The phone could not provide background location. Open trip tracking to review.",
        );
      const { lease } = await driverLocationState();
      if (!lease || lease.expiresAt <= Date.now()) {
        await stopDriverLocation();
        return;
      }
      for (const fix of [...(data?.locations ?? [])].sort(
        (a, b) => a.timestamp - b.timestamp,
      )) {
        const current = (await driverLocationState()).lease;
        if (
          !current ||
          current.userId !== lease.userId ||
          current.tripId !== lease.tripId
        )
          return;
        if (!authorisedOfflineFix(current, fix, Date.now())) continue;
        const hash = await digestStringAsync(
          CryptoDigestAlgorithm.SHA256,
          `${lease.userId}:${lease.tripId}:${fix.timestamp}`,
        );
        const operationKey = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
        await captureFieldEvent(
          lease.userId,
          lease.tripId,
          current.nextSequence,
          "gps",
          {
            lat: fix.coords.latitude,
            lng: fix.coords.longitude,
            accuracy: fix.coords.accuracy,
          },
          operationKey,
          new Date(fix.timestamp).toISOString(),
        );
      }
    } catch {
      await SecureStore.setItemAsync(
        errorKey,
        "GPS capture stopped or needs review. Queued records were preserved. Open trip tracking to check permissions, storage and trip authority.",
        options,
      );
      await stopDriverLocation();
    }
  },
);
export async function startDriverLocation(userId: string, trip: any) {
  await stopDriverLocation();
  const requested = captureGeneration;
  const currentRequest = () => {
    if (requested !== captureGeneration)
      throw new Error(
        "GPS start was cancelled. Enable tracking again for the current trip.",
      );
  };
  if (
    !trip ||
    trip.driver_id !== userId ||
    trip.ended_at ||
    trip.location_consent !== true
  )
    throw new Error("A current consented driver trip is required.");
  if (!TaskManager || !(await TaskManager.isAvailableAsync()))
    throw new Error(
      "Background tracking requires an EasyGas native build with background location enabled.",
    );
  if ((await Location.requestForegroundPermissionsAsync()).status !== "granted")
    throw new Error("Location permission was not granted.");
  if ((await Location.requestBackgroundPermissionsAsync()).status !== "granted")
    throw new Error(
      "Background location permission was not granted. No background tracking started.",
    );
  currentRequest();
  await prepareBackgroundFieldQueue(userId);
  currentRequest();
  const lease: LocationLease = {
    userId,
    tripId: trip.id,
    nextSequence: trip.nextSequence,
    startedAt: trip.started_at,
    expiresAt: Date.now() + locationLeaseMs,
  };
  await SecureStore.setItemAsync(leaseKey, JSON.stringify(lease), options);
  if (requested !== captureGeneration) {
    await stopDriverLocation();
    throw new Error("GPS start cancelled.");
  }
  await SecureStore.deleteItemAsync(errorKey);
  try {
    await Location.startLocationUpdatesAsync(driverLocationTask, {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 30,
      timeInterval: 30000,
      deferredUpdatesInterval: 60000,
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "EasyGas trip GPS recording",
        notificationBody:
          "Recording your consented work trip. Offline points upload after reconnection.",
        killServiceOnDestroy: true,
      },
    });
  } catch (e) {
    await stopDriverLocation();
    throw e;
  }
  if (requested !== captureGeneration) {
    await stopDriverLocation();
    throw new Error("GPS start cancelled.");
  }
  return lease;
}
