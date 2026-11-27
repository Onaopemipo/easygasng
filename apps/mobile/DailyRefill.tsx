import React, { useRef, useState } from "react";
import { View } from "react-native";
import { randomUUID } from "expo-crypto";
import { Button, Card, Copy, Title, type CustomerAPI } from "./CustomerUI";
import { TextInput, FieldCaption } from "./typography";
import { useTheme } from "./theme";
export default function DailyRefill({
  api,
  order,
  onSaved,
}: {
  api: CustomerAPI;
  order: any;
  onSaved?: () => void;
}) {
  const { colors } = useTheme(),
    [rows, setRows] = useState([{ before: "", after: "" }]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const pending = useRef(false),
    key = useRef(randomUUID());
  const expected = Number(order.daily_run.grams) / 1000,
    total = rows.reduce((n, r) => n + Number(r.after) - Number(r.before), 0);
  if (Number(order.daily_run.supplied_grams) > 0)
    return (
      <Card>
        <Title>Refill recorded</Title>
        <Copy>
          {Number(order.daily_run.supplied_grams) / 1000} kg supplied. Take the
          refill photo, synchronise it and complete delivery.
        </Copy>
      </Card>
    );
  return (
    <Card>
      <Title>Weigh and refill</Title>
      <Copy>
        Customer paid for {expected} kg. Weigh each cylinder before and after
        filling on the same scale.
      </Copy>
      {rows.map((r, i) => (
        <View key={i} style={{ gap: 8 }}>
          <Copy>Cylinder {i + 1}</Copy>
          {(["before", "after"] as const).map((k) => (
            <View key={k}>
              <FieldCaption required>{`Weight ${k} filling (kg)`}</FieldCaption>
              <TextInput
                accessibilityLabel={`Cylinder ${i + 1} weight ${k} filling (kg)`}
                keyboardType="decimal-pad"
                value={r[k]}
                editable={!busy}
                onChangeText={(v) => {
                  setRows((old) =>
                    old.map((x, j) => (j === i ? { ...x, [k]: v } : x)),
                  );
                  key.current = randomUUID();
                }}
                style={{
                  minHeight: 48,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 12,
                  padding: 12,
                  color: colors.text,
                  backgroundColor: colors.input,
                }}
              />
            </View>
          ))}
        </View>
      ))}
      <Copy>
        Gas added: {Math.round(total * 1000) / 1000} kg · Paid quantity:{" "}
        {expected} kg
      </Copy>
      <Button
        secondary
        label="Add another cylinder"
        disabled={busy || rows.length >= 20}
        onPress={() => {
          setRows((x) => [...x, { before: "", after: "" }]);
          key.current = randomUUID();
        }}
      />
      {!!message && <Copy>{message}</Copy>}
      <Button
        label={busy ? "Saving refill…" : "Save scale readings"}
        disabled={
          busy ||
          rows.some((r) => !r.before.trim() || !r.after.trim()) ||
          order.attempt?.state !== "arrived"
        }
        onPress={async () => {
          if (pending.current) return;
          pending.current = true;
          setBusy(true);
          setMessage("");
          try {
            const result = await api("daily.refill.record", {
              orderId: order.id,
              version: order.tracking_version,
              readings: rows.map((r) => ({
                beforeKg: Number(r.before),
                afterKg: Number(r.after),
              })),
              operationKey: key.current,
            });
            setMessage(result.message);
            onSaved?.();
          } catch (e: any) {
            setMessage(e.message);
          } finally {
            pending.current = false;
            setBusy(false);
          }
        }}
      />
    </Card>
  );
}
