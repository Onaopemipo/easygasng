import { NextText, NextIcon, NextCard } from "./MobileNextUI";
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
  compact = false,
}: {
  order: any;
  onSupport: () => void;
  compact?: boolean;
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
  if (compact) {
    const stages = [
        "placed",
        "accepted",
        "preparing",
        "assigned",
        "out_for_delivery",
        "delivered",
      ],
      index = stages.indexOf(order.status);
    return (
      <View style={{ gap: 16 }}>
        {stages.map((stage, i) => {
          const event = order.events?.find((e: any) => e.status === stage),
            done = !!event || i <= index;
          return (
            <View
              key={stage}
              style={{
                flexDirection: "row",
                gap: 16,
                paddingBottom: 20,
                borderLeftWidth: i === 5 ? 0 : 1,
                borderColor: colors.border,
                marginLeft: 11,
                paddingLeft: 22,
                position: "relative",
              }}
            >
              <View
                style={{
                  position: "absolute",
                  left: -11,
                  top: 0,
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  borderWidth: 1,
                  borderColor: done ? colors.primary : colors.border,
                  backgroundColor: done ? colors.elevated : colors.background,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {done && <NextIcon name="check" size={13} />}
              </View>
              <View style={{ gap: 5, flex: 1 }}>
                <NextText
                  kind="label"
                  style={{
                    textTransform: "capitalize",
                    color: done ? colors.text : colors.muted,
                  }}
                >
                  {stage.replaceAll("_", " ")}
                </NextText>
                <NextText kind="small" style={{ color: colors.muted }}>
                  {event
                    ? new Date(event.created_at).toLocaleString("en-NG", {
                        timeZone: "Africa/Lagos",
                      })
                    : [
                        "Your request is saved.",
                        "Coverage and order review.",
                        "Cylinder checks and preparation.",
                        "A qualified driver with a suitable trip.",
                        "Observed driver updates appear when available.",
                        "Verified handover and completion.",
                      ][i]}
                </NextText>
              </View>
            </View>
          );
        })}
        {["delivery_failed", "returned", "cancelled"].includes(
          order.status,
        ) && (
          <NextCard>
            <NextText kind="heading">
              {order.status.replaceAll("_", " ")}
            </NextText>
            <NextText>Contact support for the next verified step.</NextText>
          </NextCard>
        )}
        {order.driver?.name && (
          <NextText kind="small">Assigned driver: {order.driver.name}</NextText>
        )}
        {current ? (
          <NextCard>
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
            <NextText kind="small">
              Last recorded GPS:{" "}
              {new Date(fix.recordedAt).toLocaleString("en-NG", {
                timeZone: "Africa/Lagos",
              })}
              . Accuracy ±{Math.round(fix.accuracy)} m. ETA unavailable.
            </NextText>
          </NextCard>
        ) : (
          <NextText kind="small" style={{ color: colors.muted }}>
            Rider location and ETA are unavailable. Check your scheduled
            delivery window.
          </NextText>
        )}
      </View>
    );
  }
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
