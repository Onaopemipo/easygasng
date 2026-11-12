import React, { useEffect, useRef, useState } from "react";
import { AppState, View } from "react-native";
import {
  Title,
  Card,
  Copy,
  Button,
  Feedback,
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
  onBack,
  openOrderLink,
  relatedAction,
  onUnreadCount,
}: {
  api: CustomerAPI;
  navigate?: (screen: string) => void;
  onOrder?: (id: string) => void;
  onBack?: () => void;
  openOrderLink?: (path: string) => void;
  relatedAction?: (
    id: string,
  ) => { label: string; open: () => void } | undefined;
  onUnreadCount?: (count: number) => void;
}) {
  const { colors } = useTheme();
  const apiRef = useRef(api);
  apiRef.current = api;
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [version, refresh] = useState(0);
  const [inbox, setInbox] = useState<any>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const reload = () => refresh((value) => value + 1);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    apiRef
      .current(`notifications.list?filter=${filter}&page=${page}`)
      .then((value) => {
        if (active) {
          setInbox(value);
          onUnreadCount?.(value.unread);
        }
      })
      .catch((failure) => {
        if (!active) return;
        if ([401, 403].includes(failure?.status)) setInbox(null);
        setLoadError(
          "Could not refresh notifications. Check your connection and try again.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filter, page, version]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh((value) => value + 1);
    });
    return () => subscription.remove();
  }, []);
  const [busy, setBusy] = useState(""),
    [error, setError] = useState("");
  async function mark(id?: string) {
    setBusy(id ?? "all");
    setError("");
    try {
      if (id) await apiRef.current("notifications.read", { id });
      else await apiRef.current("notifications.read.bulk", { all: true });
      reload();
    } catch {
      setError("Could not mark notifications as read. Please try again.");
    } finally {
      setBusy("");
    }
  }

  const disabled = loading || !!loadError || !!busy;
  let last = "";
  return (
    <View style={{ gap: 12 }}>
      {onBack && <Button label="Back" secondary onPress={onBack} />}
      <Title>Notifications</Title>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Button
          label={`All${inbox ? ` (${inbox.total})` : ""}`}
          secondary={filter !== "all"}
          disabled={!!busy}
          onPress={() => {
            setPage(1);
            setFilter("all");
          }}
        />
        <Button
          label={`Unread${inbox ? ` (${inbox.unread})` : ""}`}
          secondary={filter !== "unread"}
          disabled={!!busy}
          onPress={() => {
            setPage(1);
            setFilter("unread");
          }}
        />
      </View>
      {!!inbox?.unread && (
        <Button
          label={busy === "all" ? "Marking…" : "Mark all as read"}
          secondary
          disabled={disabled}
          onPress={() => {
            void mark();
          }}
        />
      )}
      {loadError && inbox && (
        <Copy>
          Last updated{" "}
          {new Date(inbox.generatedAt).toLocaleString("en-NG", {
            timeZone: "Africa/Lagos",
          })}{" "}
          WAT
        </Copy>
      )}
      <Feedback
        loading={loading && !inbox}
        error={loadError || error}
        retry={() => {
          setError("");
          reload();
        }}
        empty={
          !loading && !loadError && inbox?.items.length === 0
            ? filter === "unread"
              ? "No unread notifications."
              : "You’re all caught up."
            : undefined
        }
      />
      {!loading &&
        inbox?.items.map((n: any) => {
          const date = lagosDay(n.created_at);
          const heading = date !== last ? date : "";
          last = date;
          const target = navigate && notificationTarget(n);
          const fieldTarget = n.related_id && relatedAction?.(n.related_id);
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
                {fieldTarget && !loadError && (
                  <Button
                    label={fieldTarget.label}
                    secondary
                    onPress={fieldTarget.open}
                  />
                )}
                {n.href && openOrderLink && !loadError && (
                  <Button
                    label="View order"
                    secondary
                    onPress={() => openOrderLink(n.href)}
                  />
                )}
                {target && navigate && onOrder && !loadError && (
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
                    label={busy === n.id ? "Marking…" : "Mark as read"}
                    secondary
                    disabled={disabled}
                    onPress={() => {
                      void mark(n.id);
                    }}
                  />
                )}
              </Card>
            </View>
          );
        })}
      {inbox && inbox.filteredTotal > 0 && (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Copy>
            Page {inbox.page} of{" "}
            {Math.ceil(inbox.filteredTotal / inbox.pageSize)}
          </Copy>
          <Button
            label="Previous"
            secondary
            disabled={disabled || inbox.page <= 1}
            onPress={() => setPage(inbox.page - 1)}
          />
          <Button
            label="Next"
            secondary
            disabled={
              disabled || inbox.page * inbox.pageSize >= inbox.filteredTotal
            }
            onPress={() => setPage(inbox.page + 1)}
          />
        </View>
      )}
      {navigate && (
        <Button
          label="Notification preferences"
          secondary
          onPress={() => navigate("profile")}
        />
      )}
    </View>
  );
}
