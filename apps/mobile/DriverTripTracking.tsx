import React, { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { randomUUID } from "expo-crypto";
import { Card, Copy, Button, Feedback, type CustomerAPI } from "./CustomerUI";
import { NativeForm } from "./Workflows";
import {
  driverLocationState,
  startDriverLocation,
  stopDriverLocation,
} from "./driver-location";
import { fieldQueue, syncFieldQueue } from "./field-queue";
export default function DriverTripTracking({
  api,
  userId,
  visible = true,
}: {
  api: CustomerAPI;
  userId: string;
  visible?: boolean;
}) {
  const [data, setData] = useState<any>(null),
    [lease, setLease] = useState<any>(null),
    [pending, setPending] = useState(0),
    [message, setMessage] = useState("");
  const busy = useRef(false),
    mounted = useRef(true);
  async function refresh() {
    if (busy.current || !mounted.current) return;
    busy.current = true;
    try {
      const next = await api("driver.location");
      if (!mounted.current) return;
      const state = await driverLocationState();
      if (!mounted.current) return;
      if (
        state.lease &&
        (state.lease.userId !== userId ||
          !next.trip?.location_consent ||
          next.trip.id !== state.lease.tripId ||
          state.lease.expiresAt <= Date.now())
      )
        await stopDriverLocation();
      // Upload only this driver's trip GPS. Other field workflows retain their own recovery controls.
      const recovered = await syncFieldQueue(userId, api, undefined, true);
      if (mounted.current) {
        setData(next);
        setLease((await driverLocationState()).lease);
        setPending(
          (await fieldQueue(userId, true)).filter((e) => e.kind === "gps")
            .length,
        );
        setMessage(recovered.conflicts.join(" ") || state.error || "");
      }
    } catch (e: any) {
      if (!mounted.current) return;
      if ([401, 403].includes(e?.status)) {
        await stopDriverLocation();
        if (mounted.current) {
          setLease(null);
          setMessage(
            "GPS stopped: current account authority could not be verified.",
          );
        }
        return;
      }
      if (mounted.current) {
        try {
          setLease((await driverLocationState()).lease);
          setPending(
            (await fieldQueue(userId, true)).filter((e) => e.kind === "gps")
              .length,
          );
        } catch {
          setMessage(
            "Encrypted GPS records need review; nothing was discarded.",
          );
          return;
        }
        setMessage(
          "No confirmed connection. Consented GPS may still record locally; dispatch cannot see new points until upload.",
        );
      }
    } finally {
      busy.current = false;
    }
  }
  useEffect(() => {
    mounted.current = true;
    void refresh();
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void refresh();
    }, 30000);
    return () => {
      mounted.current = false;
      clearInterval(timer);
      void stopDriverLocation();
    };
  }, [userId]);
  const trip = data?.trip;
  if (!visible) return null;
  return (
    <Card>
      <Copy>
        Trip GPS · {lease ? "local recording enabled" : "stopped"} · {pending}{" "}
        pending GPS points
      </Copy>
      <Copy>
        Offline GPS is stored encrypted and uploaded after reconnection. It is
        not live tracking. Recording expires after 8 hours; recheck the trip
        online to renew. Phone permissions, GPS reception and operating-system
        restrictions can interrupt recording.
      </Copy>
      <Feedback error={message} />
      {!trip && data && (
        <NativeForm
          title="Start consented vehicle trip"
          action="trip.start"
          api={api}
          onDone={refresh}
          fields={[
            {
              name: "vehicleId",
              label: "Vehicle",
              options: data.vehicles.map((v: any) => ({
                value: v.id,
                label: v.label,
              })),
            },
            {
              name: "startOdometer",
              label: "Start odometer (km)",
              type: "number",
            },
            {
              name: "locationConsent",
              label: "Allow GPS recording during this work trip",
              type: "checkbox",
            },
          ]}
        />
      )}
      {trip && (
        <>
          {trip.location_consent && (
            <>
              <Button
                label={
                  lease
                    ? "Renew authorised GPS recording"
                    : "Enable offline/background GPS"
                }
                onPress={async () => {
                  try {
                    const current = await api("driver.location");
                    await startDriverLocation(userId, current.trip);
                    await refresh();
                  } catch (e: any) {
                    setMessage(e.message);
                  }
                }}
              />
              <Button
                label="Stop GPS and withdraw trip consent"
                secondary
                onPress={async () => {
                  try {
                    await stopDriverLocation();
                    setLease(null);
                    await api("trip.location.revoke", {
                      tripId: trip.id,
                      operationKey: randomUUID(),
                    });
                    setData((previous: any) => ({
                      ...previous,
                      trip: { ...trip, location_consent: false },
                    }));
                    await refresh();
                  } catch {
                    setMessage(
                      "Couldn’t confirm withdrawal. Reconnect and try again to stop sharing the last recorded location.",
                    );
                  }
                }}
              />
            </>
          )}
          {!trip.location_consent && <Copy>GPS is off for this trip.</Copy>}
          <NativeForm
            title="End trip after synchronising GPS"
            action="trip.end"
            api={async (a, d) => {
              await stopDriverLocation();
              if (
                (await fieldQueue(userId, true)).some(
                  (e) =>
                    e.tripId === trip.id &&
                    (e.kind !== "gps" || trip.location_consent),
                )
              )
                throw new Error(
                  "Synchronise pending trip records before ending the trip.",
                );
              return api(a, d);
            }}
            onDone={refresh}
            fields={[
              { name: "tripId", label: "Trip", value: trip.id },
              {
                name: "endOdometer",
                label: "End odometer (km)",
                type: "number",
              },
            ]}
          />
        </>
      )}
      <Button
        label="Synchronise GPS / refresh trip"
        secondary
        onPress={refresh}
      />
    </Card>
  );
}
