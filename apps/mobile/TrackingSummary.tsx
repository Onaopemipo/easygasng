import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, Copy, Button } from "./CustomerUI";
import { Text } from "./typography";
import { useTheme } from "./theme";
import NativeRiderMap from "./NativeRiderMap";
import type { RiderFix } from "../../packages/business-rules/src/rider-location";
export default function TrackingSummary({
  order,
  onSupport,
}: {
  order: any;
  onSupport: () => void;
}) {
  const { colors } = useTheme();
  const fix: RiderFix | undefined = order.gps?.fix;
  const [expired, setExpired] = useState("");
  useEffect(() => {
    if (!fix) return;
    const timeout = setTimeout(
      () => setExpired(fix.expiresAt),
      Math.max(0, Date.parse(fix.expiresAt) - Date.now()),
    );
    return () => clearTimeout(timeout);
  }, [fix]);
  const current =
    fix && expired !== fix.expiresAt && Date.parse(fix.expiresAt) > Date.now();
  return (
    <View style={{ gap: 12 }}>
      <Card accent>
        <Ionicons
          accessible={false}
          name="location-outline"
          size={35}
          color={colors.primary}
        />
        <Text
          preserveColor
          style={{ color: colors.text, fontSize: 22, fontWeight: "800" }}
        >
          {order.reference}
        </Text>
        <Text
          preserveColor
          style={{ color: colors.success, fontWeight: "700" }}
        >
          {order.status.replaceAll("_", " ")}
        </Text>
        {order.driver?.name && (
          <Copy>Assigned driver: {order.driver.name}</Copy>
        )}
        <Copy>
          Last recorded update:{" "}
          {new Date(order.last_update).toLocaleString("en-NG", {
            timeZone: "Africa/Lagos",
          })}
        </Copy>
        {current && (
          <NativeRiderMap
            points={[
              {
                id: order.id,
                label: "Assigned rider’s recorded location",
                lat: fix.lat,
                lng: fix.lng,
              },
            ]}
          />
        )}
        <Copy>
          {current
            ? `Last recorded rider GPS: ${new Date(fix.recordedAt).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })} (Lagos). Accuracy ±${Math.round(fix.accuracy)} m. ETA unavailable.`
            : "Rider location and ETA are unavailable. Check your scheduled delivery window."}
        </Copy>
      </Card>
      {order.events?.map((event: any, index: number) => (
        <View
          key={`${event.version ?? index}:${event.status}`}
          style={{
            flexDirection: "row",
            gap: 12,
            padding: 10,
            borderLeftWidth: 2,
            borderColor: colors.primary,
          }}
        >
          <Ionicons
            accessible={false}
            name="checkmark-circle"
            size={23}
            color={colors.primary}
          />
          <View style={{ flex: 1 }}>
            <Text
              preserveColor
              style={{ fontWeight: "700", color: colors.text }}
            >
              {event.status.replaceAll("_", " ")}
            </Text>
            <Copy>
              {new Date(event.created_at).toLocaleString("en-NG", {
                timeZone: "Africa/Lagos",
              })}
            </Copy>
            {event.note && <Copy>{event.note}</Copy>}
          </View>
        </View>
      ))}
      <Button label="Contact customer support" secondary onPress={onSupport} />
    </View>
  );
}
