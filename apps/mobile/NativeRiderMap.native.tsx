import React, { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { Button, Copy } from "./CustomerUI";
import { useTheme } from "./theme";
import type { NativeRiderMapPoint } from "./NativeRiderMap";
import type MapView from "react-native-maps";

function MapCanvas({ points }: { points: NativeRiderMapPoint[] }) {
  const { dark } = useTheme();
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const ref = useRef<MapView>(null);
  const {
    default: Map,
    Marker,
    PROVIDER_GOOGLE,
  } = require("react-native-maps") as typeof import("react-native-maps");
  const coordinates = points.map(({ lat, lng }) => ({
    latitude: lat,
    longitude: lng,
  }));
  useEffect(() => {
    if (ready) return;
    const timer = setTimeout(() => setFailed(true), 12000);
    return () => clearTimeout(timer);
  }, [ready]);
  useEffect(() => {
    if (!ready) return;
    if (coordinates.length === 1) {
      ref.current?.setCamera({ center: coordinates[0], zoom: 14 });
    } else {
      ref.current?.fitToCoordinates(coordinates, {
        animated: false,
        edgePadding: { top: 35, bottom: 35, left: 35, right: 35 },
      });
    }
  }, [ready, points]);
  if (failed)
    return (
      <Copy>The map couldn’t load. See the recorded location details.</Copy>
    );
  return (
    <>
      {!ready && <Copy>Loading map…</Copy>}
      <Map
        ref={ref}
        provider={PROVIDER_GOOGLE}
        style={{ height: 240, width: "100%" }}
        initialRegion={{
          ...coordinates[0],
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        }}
        userInterfaceStyle={dark ? "dark" : "light"}
        accessibilityLabel="Recorded rider locations"
        onMapLoaded={() => setReady(true)}
      >
        {points.map((point, index) => (
          <Marker
            key={point.id}
            coordinate={coordinates[index]}
            title={point.label}
          />
        ))}
      </Map>
    </>
  );
}

export default function NativeRiderMap({
  points,
}: {
  points: NativeRiderMapPoint[];
}) {
  const [visible, setVisible] = useState(false);
  const config = Constants.expoConfig?.extra?.riderMaps;
  const supported = Platform.OS === "ios" ? config?.ios : config?.android;
  if (
    !supported ||
    !points.length ||
    Constants.executionEnvironment === "storeClient"
  )
    return null;
  return (
    <>
      <Button
        label={visible ? "Hide map" : "Show Google Maps"}
        onPress={() => setVisible(!visible)}
        secondary
      />
      {visible && <MapCanvas points={points} />}
    </>
  );
}
