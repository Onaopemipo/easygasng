import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { ContextSheet } from "./ContextSheet";
import { NextText, NextIcon } from "./MobileNextUI";
import { useTheme } from "./theme";
export function lagosDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export default function MobileNextCalendar({
  value,
  onSelect,
  onClose,
}: {
  value: string;
  onSelect: (day: string) => void;
  onClose: () => void;
}) {
  const { colors } = useTheme(),
    today = lagosDate(),
    [month, setMonth] = useState((value || today).slice(0, 7));
  const [year, m] = month.split("-").map(Number),
    count = new Date(Date.UTC(year, m, 0)).getUTCDate(),
    offset = new Date(Date.UTC(year, m - 1, 1)).getUTCDay(),
    cells = [
      ...Array(offset).fill(null),
      ...Array.from({ length: count }, (_, i) => i + 1),
    ];
  function move(delta: number) {
    const d = new Date(Date.UTC(year, m - 1 + delta, 1));
    setMonth(d.toISOString().slice(0, 7));
  }
  return (
    <ContextSheet title="Delivery date" onClose={onClose}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          onPress={() => move(-1)}
          style={{
            minHeight: 48,
            minWidth: 48,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <NextIcon name="chevron-left" />
        </Pressable>
        <NextText kind="heading">
          {new Date(Date.UTC(year, m - 1, 15)).toLocaleDateString("en-NG", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          })}
        </NextText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          onPress={() => move(1)}
          style={{
            minHeight: 48,
            minWidth: 48,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <NextIcon name="chevron-right" />
        </Pressable>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((x) => (
          <View
            key={x}
            style={{
              width: "14.285%",
              alignItems: "center",
              paddingVertical: 8,
            }}
          >
            <NextText kind="small" style={{ color: colors.muted }}>
              {x}
            </NextText>
          </View>
        ))}
        {cells.map((day, i) => {
          const date = month + "-" + String(day).padStart(2, "0"),
            disabled = !day || date < today;
          return (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={day ? date : "Empty calendar cell"}
              accessibilityState={{ disabled, selected: date === value }}
              disabled={disabled}
              onPress={() => {
                onSelect(date);
                onClose();
              }}
              style={{
                width: "14.285%",
                minHeight: 48,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 13,
                opacity: disabled ? 0.3 : 1,
                backgroundColor: date === value ? colors.button : "transparent",
              }}
            >
              <NextText
                style={{
                  color: date === value ? colors.onButton : colors.text,
                }}
              >
                {day || ""}
              </NextText>
            </Pressable>
          );
        })}
      </View>
    </ContextSheet>
  );
}
