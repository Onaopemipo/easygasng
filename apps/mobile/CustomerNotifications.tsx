import React, { useState } from "react";
import { View } from "react-native";
import {
  Title,
  Card,
  Copy,
  Button,
  Feedback,
  useRemote,
  type CustomerAPI,
} from "./CustomerUI";
import { Text } from "./typography";
import { useTheme } from "./theme";
import {
  notificationTarget,
  lagosDay,
} from "../../packages/business-rules/src/customer-mobile";
export default function CustomerNotifications({
  api,
  navigate,
  onOrder,
}: {
  api: CustomerAPI;
  navigate: (screen: string) => void;
  onOrder: (id: string) => void;
}) {
  const { colors } = useTheme();
  const r = useRemote(api, "me");
  const [busy, setBusy] = useState(""),
    [error, setError] = useState("");
  let last = "";
  return (
    <View style={{ gap: 12 }}>
      <Title>Notifications</Title>
      <Feedback
        loading={r.loading}
        error={r.error || error}
        retry={() => {
          setError("");
          r.reload();
        }}
        empty={
          r.data?.notifications?.length === 0
            ? "You're all caught up. Your updates will appear here."
            : undefined
        }
      />
      {r.data?.notifications?.map((n: any) => {
        const date = lagosDay(n.created_at);
        const heading = date !== last ? date : "";
        last = date;
        const target = notificationTarget(n);
        return (
          <View key={n.id} style={{ gap: 8 }}>
            {heading && (
              <Text
                preserveColor
                style={{ color: colors.text, fontWeight: "800" }}
              >
                {heading}
              </Text>
            )}
            <Card>
              <Text
                preserveColor
                style={{ color: colors.text, fontWeight: "700" }}
              >
                {n.title}
                {n.read_at ? "" : " · Unread"}
              </Text>
              <Copy>{n.body}</Copy>
              <Copy>
                {new Date(n.created_at).toLocaleTimeString("en-NG", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Africa/Lagos",
                })}
              </Copy>
              {target && (
                <Button
                  label="View related update"
                  secondary
                  onPress={() =>
                    target.screen === "orders" && target.id
                      ? onOrder(target.id)
                      : navigate(target.screen)
                  }
                />
              )}{" "}
              {!n.read_at && (
                <Button
                  label="Mark as read"
                  secondary
                  disabled={!!busy}
                  onPress={async () => {
                    setBusy(n.id);
                    try {
                      await api("notifications.read", { id: n.id });
                      r.reload();
                    } catch {
                      setError(
                        "Could not mark this update read. Please try again.",
                      );
                    } finally {
                      setBusy("");
                    }
                  }}
                />
              )}
            </Card>
          </View>
        );
      })}
      <Button
        label="Notification preferences"
        secondary
        onPress={() => navigate("profile")}
      />
    </View>
  );
}
