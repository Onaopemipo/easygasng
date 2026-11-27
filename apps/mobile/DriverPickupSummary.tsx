import React from "react";
import { View } from "react-native";
import { Text } from "./typography";
import { useTheme } from "./theme";

export function pickupSummaryRows(order: any, refill: boolean): string[] {
  const manifest = order?.manifest;
  if (!manifest || typeof manifest !== "object") return [];
  const rows: string[] = [];
  for (const line of Array.isArray(manifest.gas) ? manifest.gas : []) {
    const grams = Number(line?.grams);
    if (Number.isSafeInteger(grams) && grams > 0)
      rows.push(
        `${(grams / 1000).toLocaleString("en-NG", { maximumFractionDigits: 3 })} kg gas`,
      );
  }
  const items = Array.isArray(manifest.items) ? manifest.items : [];
  for (const line of items) {
    const quantity = Number(line?.quantity);
    if (!Number.isSafeInteger(quantity) || quantity <= 0) continue;
    const item = (Array.isArray(order.items) ? order.items : []).find(
      (item: any) => item.product_id === line.product_id,
    );
    const name =
      typeof item?.name === "string" && item.name.trim()
        ? item.name.trim()
        : "Product";
    rows.push(`${quantity} × ${name}`);
  }
  // Refill customer cylinders are not registered or collected by the business.
  if (!refill || items.length > 0)
    for (const serial of Array.isArray(manifest.serials)
      ? manifest.serials
      : [])
      if (typeof serial === "string" && serial.trim())
        rows.push(`Cylinder serial: ${serial.trim()}`);
  return rows;
}

export default function DriverPickupSummary({
  order,
  refill,
}: {
  order: any;
  refill: boolean;
}) {
  const { colors } = useTheme();
  const rows = pickupSummaryRows(order, refill);
  return (
    <View
      style={{
        padding: 16,
        gap: 10,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
      }}
    >
      <Text
        accessibilityRole="header"
        style={{ color: colors.text, fontWeight: "700", fontSize: 18 }}
      >
        Load for this delivery
      </Text>
      {rows.length ? (
        rows.map((row, index) => (
          <Text key={index} style={{ color: colors.text, fontSize: 18 }}>
            {row}
          </Text>
        ))
      ) : (
        <Text style={{ color: colors.text }}>
          Load details unavailable. Refresh the order or contact dispatch.
        </Text>
      )}
    </View>
  );
}
