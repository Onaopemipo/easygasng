import React, { useState, useRef } from "react";
import { View, Switch } from "react-native";
import { Button, Copy } from "./CustomerUI";
export default function DriverDeparture({
  order,
  disabled,
  onStart,
}: {
  order: any;
  disabled: boolean;
  onStart: (input: any) => void | Promise<void>;
}) {
  const starting = useRef(false);
  const [confirmed, setConfirmed] = useState(false);
  const needsPickupConfirmation =
    !order.daily_run && (!order.gas_lines?.length || order.legacy_lpg === true);
  return (
    <View style={{ gap: 12 }}>
      {needsPickupConfirmation && (
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
          <Switch
            accessibilityLabel="I checked the load for this order"
            value={confirmed}
            disabled={disabled}
            onValueChange={setConfirmed}
          />
          <View style={{ flex: 1 }}>
            <Copy>I checked the load for this order.</Copy>
          </View>
        </View>
      )}
      <Button
        label="Start delivery"
        disabled={disabled || (needsPickupConfirmation && !confirmed)}
        onPress={async () => {
          if (
            starting.current ||
            disabled ||
            (needsPickupConfirmation && !confirmed)
          )
            return;
          starting.current = true;
          try {
            await onStart({
              orderId: order.id,
              version: order.tracking_version,
              manifest: order.manifest,
              loadConfirmed: true,
            });
          } finally {
            starting.current = false;
          }
        }}
      />
    </View>
  );
}
