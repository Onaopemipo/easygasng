import { photoUploader } from "./DriverPhoto";
import React, { useEffect, useRef, useState } from "react";
import {   AppState } from "react-native";
import { View, Pressable } from "./surfaces";
import * as Location from "expo-location";
import { Text, TextInput } from "./typography";
import { NativeForm } from "./Workflows";
import { captureFieldEvent, fieldQueue, syncFieldQueue } from "./field-queue";
export default function DriverOperations({
  api,
  user,
  origin,
  token,
}: {
  origin: string;
  token: string | null;
  api: (action: string, data?: any) => Promise<any>;
  user: any;
}) {
  const [fleet, setFleet] = useState<any>(null),
    [error, setError] = useState(""),
    [pending, setPending] = useState(0),
    [capturing, setCapturing] = useState(false),
    [tick, setTick] = useState(0),
    [fuel, setFuel] = useState({ litres: "", cost: "", receipt: "" });
  const generation=useRef(0);
  const watch = useRef<Location.LocationSubscription | null>(null),
    sequence = useRef(1),
    active = useRef(true);
  const trip = fleet?.trips.find((t: any) => !t.ended_at);
  function stop() {
    generation.current++;
    watch.current?.remove();
    watch.current = null;
    setCapturing(false);
  }
  useEffect(() => {
    active.current = true;
    api("fleet.summary")
      .then(setFleet)
      .catch((e) => setError(e.message));
    fieldQueue(user.id,true)
      .then((q) => setPending(q.length))
      .catch((e) => setError(e.message));
    return () => {
      active.current = false;
      watch.current?.remove();
    };
  }, [tick, user.id]);
  useEffect(() => {
    const s = AppState.addEventListener("change", (state) => {
      if (state !== "active") stop();
    });
    const timer = setInterval(
      () =>
        api("fleet.summary")
          .then(async (data) => {
            if(!active.current)return;
            setFleet(data);
            await syncFieldQueue(user.id,api,photoUploader(origin,token));
            const queued=await fieldQueue(user.id,true);if(active.current)setPending(queued.length);
            const t = data.trips.find((t: any) => !t.ended_at);
            if (!t?.location_consent) stop();
          })
          .catch(() =>
            setError(
              "Offline: locations remain queued. Server position is not live.",
            ),
          ),
      30000,
    );
    return () => {
      s.remove();
      clearInterval(timer);
      watch.current?.remove();
    };
  }, [user.id]);
  async function gps() {
    try {
      const requested=++generation.current;
      if (!trip?.location_consent)
        throw new Error("Start a consented active trip first.");
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted")
        throw new Error("Location permission was not granted.");
      if(!active.current||AppState.currentState!=="active"||requested!==generation.current)return;
      sequence.current = trip.nextSequence;
      setCapturing(true);
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 30000,
          distanceInterval: 30,
        },
        (fix) => {
          if (!active.current||AppState.currentState!=="active"||requested!==generation.current) return;
          captureFieldEvent(user.id, trip.id, sequence.current, "gps", {
            lat: fix.coords.latitude,
            lng: fix.coords.longitude,
            accuracy: fix.coords.accuracy ?? 10000,
          })
            .then((e) => {
              sequence.current = e.sequence + 1;
              setPending((n) => n + 1);
            })
            .catch((e) => {
              stop();
              setError(e.message);
            });
        },
        (message) => {
          stop();
          setError(message);
        },
      );
      if(!active.current||AppState.currentState!=="active"||requested!==generation.current)subscription.remove();else watch.current=subscription;
    } catch (e: any) {
      stop();
      setError(e.message);
    }
  }
  async function sync() {
    try {
      const r = await syncFieldQueue(
        user.id,
        api,
        photoUploader(origin, token),
      );
      setError(
        `${r.sent} records synchronised. No offline record marks a delivery completed.`,
      );
      setTick((n) => n + 1);
    } catch (e: any) {
      setError(
        `Sync needs review: ${e.message}. Pending records are retained.`,
      );
    }
  }
  async function recordFuel() {
    try {
      const litres = Number(fuel.litres),
        costKobo = Math.round(Number(fuel.cost) * 100);
      if (
        !(
          litres > 0 &&
          Number.isSafeInteger(costKobo) &&
          costKobo > 0 &&
          fuel.receipt.trim().length >= 5
        )
      )
        throw new Error("Enter positive litres, cost and receipt reference.");
      await captureFieldEvent(user.id, trip.id, trip.nextSequence, "fuel", {
        litres,
        costKobo,
        receipt: fuel.receipt.trim(),
      });
      setPending((n) => n + 1);
      setFuel({ litres: "", cost: "", receipt: "" });
    } catch (e: any) {
      setError(e.message);
    }
  }
  const button = (label: string, fn: () => void) => (
    <Pressable
      accessibilityRole="button"
      onPress={fn}
      style={{
        padding: 14,
        backgroundColor: "#086b36",
        borderRadius: 10,
        marginVertical: 6,
      }}
    >
      <Text style={{ color: "white", fontSize: 16 }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={{ padding: 16, gap: 10 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>
        Trip and offline records
      </Text>
      <Text>
        {pending} encrypted records pending sync. GPS is not transmitted while
        offline. Foreground capture stops when this screen or app is left.
      </Text>
      {error && <Text accessibilityRole="alert">{error}</Text>}
      {button("Synchronise pending records", sync)}
      {fleet && !trip && (
        <NativeForm
          api={api}
          action="trip.start"
          title="Start trip"
          fields={[
            {
              name: "vehicleId",
              label: "Vehicle",
              options: fleet.vehicles
                .filter((v: any) => v.active)
                .map((v: any) => ({ value: v.id, label: v.label })),
            },
            {
              name: "startOdometer",
              label: "Start odometer (km)",
              type: "number",
            },
            {
              name: "locationConsent",
              label: "Allow location during this trip",
              type: "checkbox",
            },
          ]}
          onDone={() => setTick((n) => n + 1)}
        />
      )}{" "}
      {trip && (
        <>
          <Text>Trip {trip.id}</Text>
          {button(
            capturing
              ? "Stop location capture"
              : "Capture location on this screen",
            capturing ? stop : gps,
          )}
          <TextInput
            accessibilityLabel="Fuel litres"
            placeholder="Litres purchased"
            keyboardType="decimal-pad"
            value={fuel.litres}
            onChangeText={(litres) => setFuel((v) => ({ ...v, litres }))}
          />
          <TextInput
            accessibilityLabel="Fuel cost in naira"
            placeholder="Cost (₦)"
            keyboardType="decimal-pad"
            value={fuel.cost}
            onChangeText={(cost) => setFuel((v) => ({ ...v, cost }))}
          />
          <TextInput
            accessibilityLabel="Fuel receipt reference"
            placeholder="Receipt reference"
            value={fuel.receipt}
            onChangeText={(receipt) => setFuel((v) => ({ ...v, receipt }))}
          />
          {button("Save fuel purchase offline", recordFuel)}
          {pending === 0 ? (
            <NativeForm
              api={async(action,data)=>{stop();if((await fieldQueue(user.id,true)).length)throw new Error("Synchronise pending records before ending this trip.");return api(action,data);}}
              action="trip.end"
              title="End trip"
              fields={[
                {
                  name: "tripId",
                  label: "Trip ID",
                  value: trip.id,
                  type: "hidden",
                },
                {
                  name: "endOdometer",
                  label: "End odometer (km)",
                  type: "number",
                },
              ]}
              onDone={() => {
                stop();
                setTick((n) => n + 1);
              }}
            />
          ) : (
            <Text>
              Synchronise or resolve pending events before ending this trip.
            </Text>
          )}
        </>
      )}
    </View>
  );
}
