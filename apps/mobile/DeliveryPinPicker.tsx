import React, { useEffect, useRef, useState } from "react";
import { View, Switch, Platform } from "react-native";
import * as Location from "expo-location";
import { Text, TextInput, FieldCaption } from "./typography";
import { Button, Copy } from "./CustomerUI";
import { useTheme } from "./theme";
import {
  confirmedDeliveryPin,
  deliveryAddressKey,
  parseDeliveryPoint,
  type ConfirmedDeliveryPin,
  type DeliveryPoint,
} from "../../packages/business-rules/src/delivery-pin";

import { deliveryPinAreaError, deliveryAreaBounds, type DeliveryMapArea } from "../../packages/business-rules/src/delivery-pin-area";

export default function DeliveryPinPicker({
  street,
  zone,
  value,
  area,
  onChange,
  disabled = false,
}: {
  street: string;
  zone: string;
  value?: ConfirmedDeliveryPin;
  area?: DeliveryMapArea;
  onChange: (pin: ConfirmedDeliveryPin | undefined) => void;
  disabled?: boolean;
}) {
  const { colors } = useTheme(),
    valid = confirmedDeliveryPin(value, street, zone) && !deliveryPinAreaError(value, area ?? zone) ? confirmedDeliveryPin(value, street, zone) : null,
    key = deliveryAddressKey(street, zone);
  const [point, setPoint] = useState<DeliveryPoint | null>(confirmedDeliveryPin(value, street, zone)),
    [showMap, setShowMap] = useState(false),
    [manual, setManual] = useState(false),
    [text, setText] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const current = useRef(key),
    alive = useRef(true);
  current.current = key;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    setPoint(confirmedDeliveryPin(value, street, zone));
    setError("");
  }, [key]);
  useEffect(() => {
    const bound = confirmedDeliveryPin(value, street, zone);
    if (bound) setPoint(bound);
  }, [value?.latitude, value?.longitude, value?.addressKey, value?.confirmed]);
  function choose(p: DeliveryPoint) {
    if (disabled) return;
    setPoint(p);
    onChange(undefined);
    setError("");
  }
  async function locate() {
    if (disabled || busy) return;
    setBusy(true);
    setError("");
    const requested = key;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted)
        throw Error(
          "Location permission was not granted. Choose a pin or paste a map link instead.",
        );
      const p = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        new Promise<never>(
          (_, reject) =>
            (timer = setTimeout(
              () =>
                reject(
                  Error(
                    "Location timed out. Choose a pin or paste a map link instead.",
                  ),
                ),
              15000,
            )),
        ),
      ]);
      if (alive.current && current.current === requested) {
        choose({ latitude: p.coords.latitude, longitude: p.coords.longitude });
        setShowMap(true);
      }
    } catch (e: any) {
      if (alive.current) setError(e.message);
    } finally {
      if (timer) clearTimeout(timer);
      if (alive.current) setBusy(false);
    }
  }
  let Map: any = null,
    Marker: any = null;
  if (showMap && Platform.OS === "ios") {
    try {
      const maps = require("react-native-maps");
      Map = maps.default;
      Marker = maps.Marker;
    } catch {}
  }
  const bounds = deliveryAreaBounds(area ?? zone);
  const areaError = point ? deliveryPinAreaError(point, area ?? zone) : "";
  const canConfirm = !!point && !areaError && street.trim().length >= 8 && !!zone.trim();
  return (
    <View
      style={{
        gap: 12,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
        padding: 16,
        backgroundColor: colors.surface,
      }}
    >
      <Text
        accessibilityRole="header"
        style={{ fontWeight: "700", color: colors.text }}
      >
        Delivery map location
      </Text>
      <Copy>
        {valid
          ? "Delivery pin confirmed for this address."
          : "Choose the exact delivery location so your driver can find you."}
      </Copy>
      <Button
        label={busy ? "Finding location…" : "Use my current location"}
        secondary
        disabled={disabled || busy}
        onPress={() => void locate()}
      />
      {Platform.OS === "ios" && (
        <Button
          label={showMap ? "Hide map" : "Choose on map"}
          secondary
          disabled={disabled}
          onPress={() => setShowMap(!showMap)}
        />
      )}
      {showMap && Map && (
        <>
          <Copy>Tap the map to place your delivery pin.</Copy>
          <Map
            accessibilityLabel="Choose delivery map location"
            style={{ height: 260, width: "100%" }}
            region={{
              latitude: point?.latitude ?? (bounds ? (bounds.south+bounds.north)/2 : 6.5244),
              longitude: point?.longitude ?? (bounds ? (bounds.west+bounds.east)/2 : 3.3792),
              latitudeDelta: point ? 0.015 : 0.15,
              longitudeDelta: point ? 0.015 : 0.15,
            }}
            onPress={(e: any) => choose(e.nativeEvent.coordinate)}
          >
            {point && (
              <Marker
                coordinate={point}
                draggable
                onDragEnd={(e: any) => choose(e.nativeEvent.coordinate)}
              />
            )}
          </Map>
        </>
      )}
      <Button
        label={manual ? "Hide map link" : "Paste a map link or coordinates"}
        secondary
        disabled={disabled}
        onPress={() => setManual(!manual)}
      />
      {manual && (
        <>
          <FieldCaption required={false}>
            Full map link or latitude, longitude
          </FieldCaption>
          <TextInput
            accessibilityLabel="Full map link or coordinates"
            value={text}
            editable={!disabled}
            onChangeText={setText}
            autoCapitalize="none"
            style={{
              padding: 12,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 10,
              color: colors.text,
            }}
          />
          <Button
            label="Use this location"
            secondary
            disabled={disabled}
            onPress={() => {
              const p = parseDeliveryPoint(text);
              if (p) choose(p);
              else
                setError(
                  "Use a full map link containing coordinates, or latitude, longitude. Shortened links cannot be read here.",
                );
            }}
          />
        </>
      )}
      {point && (
        <Copy>
          Selected pin: {point.latitude.toFixed(5)},{" "}
          {point.longitude.toFixed(5)}
        </Copy>
      )}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Switch
          accessibilityLabel="This pin matches my delivery address"
          value={!!valid}
          disabled={disabled || !canConfirm}
          onValueChange={(yes) =>
            onChange(
              yes && point && canConfirm
                ? { ...point, confirmed: true, addressKey: key }
                : undefined,
            )
          }
        />
        <Text style={{ flex: 1, color: colors.text }}>
          This pin matches my delivery address.
        </Text>
      </View>
      {!!areaError && <Text accessibilityRole="alert" style={{ color: colors.text }}>{areaError}</Text>}
      {!!error && (
        <Text accessibilityRole="alert" style={{ color: colors.text }}>
          {error}
        </Text>
      )}
    </View>
  );
}
