import {
  DriverPanel,
  DriverHeading,
  DriverMetric,
  DriverBadge,
  DriverSettingRow,
  DriverSignal,
} from "./DriverSaaS";
import {
  driverAssignmentSummary,
  driverContactLabel,
  driverInitials,
  driverNextAction,
  driverNextAssignment,
} from "../../packages/business-rules/src/driver-presentation";
import CustomerNotifications from "./CustomerNotifications";
import { EasyGasAlert } from "./AppAlert";
import { PASSWORD_MIN_LENGTH } from "../../packages/business-rules/src/password-policy";
import VehicleManifest from "./VehicleManifest";
import DriverTripTracking from "./DriverTripTracking";
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  Image,
  Switch,
  StatusBar,
  Linking,
  AppState,
  BackHandler,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { randomUUID } from "expo-crypto";
import { FieldCaption, Text, TextInput } from "./typography";
import { useTheme } from "./theme";
import {
  Button,
  Card,
  Copy,
  Title,
  Feedback,
  type CustomerAPI,
} from "./CustomerUI";
import { NativeForm } from "./Workflows";
import BulkLPG from "./BulkLPG";
import DriverProof from "./DriverProof";
import DriverPhotoHistory from "./DriverPhotoHistory";
import { photoUploader } from "./DriverPhoto";
import {
  captureFieldEvent,
  fieldQueue,
  syncDriverFieldQueue,
} from "./field-queue";
import { loadQueue } from "./offline";
import { deliveryFailureReasons } from "../../packages/business-rules/src/order-tracking";
import { stopDriverLocation } from "./driver-location";
import {
  assignmentLabel,
  driverDate,
  driverHistoryAction,
  driverNavigation,
  driverOrderAddress,
  driverOutcomes,
  type DriverHistory,
  type DriverHistoryRow,
} from "../../packages/business-rules/src/driver-experience";

const tabs = [
  ["Home", "home", "home-outline"],
  ["Orders", "orders", "bag-handle-outline"],
  ["History", "history", "time-outline"],
  ["Profile", "profile", "person-outline"],
];
export default function DriverWorkspace({
  api,
  user,
  origin,
  token,
  logout,
}: {
  api: CustomerAPI;
  user: any;
  origin: string;
  token: string | null;
  logout: () => Promise<void>;
}) {
  const { colors, preference, setPreference } = useTheme();
  const insets = useSafeAreaInsets();
  const headerGreen = "#004c30";
  const [backgroundPermission, setBackgroundPermission] =
    useState("Not checked");
  const [history, setHistory] = useState<DriverHistory | null>(null);
  const [historyRow, setHistoryRow] = useState<DriverHistoryRow | null>(null);
  const [historyError, setHistoryError] = useState("");
  const [historyFilters, setHistoryFilters] = useState({
    from: "",
    to: "",
    outcome: "",
    page: 1,
  });
  const [historyQuery, setHistoryQuery] = useState("");
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const scrollPositions = useRef<Record<string, number>>({});
  const [historyDraft, setHistoryDraft] = useState({
    from: "",
    to: "",
    outcome: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [assignmentFilter, setAssignmentFilter] = useState<"all" | "progress">(
    "all",
  );
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [revoked, setRevoked] = useState(false);
  const [page, setPage] = useState("home"),
    [selected, setSelected] = useState<string | null>(null),
    [phase, setPhase] = useState("detail"),
    [orders, setOrders] = useState<any[]>([]),
    [snapshot, setSnapshot] = useState<any>(null),
    [notes, setNotes] = useState(""),
    [reason, setReason] = useState<(typeof deliveryFailureReasons)[number]>(
      deliveryFailureReasons[0],
    ),
    [code, setCode] = useState(""),
    [handover, setHandover] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [queue, setQueue] = useState<number | null>(null),
    [legacy, setLegacy] = useState<number | null>(null),
    [connected, setConnected] = useState(false),
    [lastContact, setLastContact] = useState<string | null>(null),
    [permission, setPermission] = useState("Not checked"),
    [query, setQuery] = useState(""),
    [limit, setLimit] = useState(20),
    [unread, setUnread] = useState<number | null>(null),
    [completed, setCompleted] = useState<any>(null);
  const alive = useRef(true),
    appActive = useRef(true),
    actionBusy = useRef(false),
    refreshSequence = useRef(0),
    keys = useRef(new Map<string, string>());
  const order =
    orders.find((o) => o.id === selected) ??
    (phase === "completed" ? completed : null);
  const response = snapshot?.responses?.find(
    (r: any) => r.order_id === selected,
  )?.decision;
  const activeOrders = orders;
  const nextAssignment = driverNextAssignment(
    activeOrders,
    snapshot?.responses ?? [],
  );
  const scrollKey = selected
    ? `order:${selected}:${phase}`
    : historyRow
      ? `history:${historyRow.id}`
      : page;
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      scrollRef.current?.scrollTo({
        y: scrollPositions.current[scrollKey] ?? 0,
        animated: false,
      }),
    );
    return () => cancelAnimationFrame(frame);
  }, [scrollKey]);
  const connectionError =
    "Connection or session unavailable. Displayed records may be stale. Reconnect to verify assignments.";
  async function refresh() {
    const sequence = ++refreshSequence.current;
    const [list, next, inbox, pending, old] = await driverReadDeadline(
      Promise.all([
        api("orders?active=1"),
        api("driver.snapshot"),
        api("notifications.list").catch(() => null),
        fieldQueue(user.id, true).catch(() => null),
        loadQueue(user.id).catch(() => null),
        api("driver.heartbeat", {}).catch(() => null),
      ]),
    );
    if (!alive.current || sequence !== refreshSequence.current) return;
    setOrders(list);
    setSnapshot(next);
    if (inbox) setUnread(inbox.unread);
    setQueue(
      pending
        ? pending.filter((e) => e.tripId.startsWith("order:")).length
        : null,
    );
    setLegacy(old ? old.length : null);
    setConnected(true);
    setError((message) => (message === connectionError ? "" : message));
    setRevoked(false);
    setLastContact(new Date().toISOString());
  }

  async function readPermission() {
    try {
      const [foreground, background] = await Promise.all([
        Location.getForegroundPermissionsAsync(),
        Location.getBackgroundPermissionsAsync(),
      ]);
      if (!alive.current) return;
      setPermission(foreground.granted ? "Granted" : "Not granted");
      setBackgroundPermission(background.granted ? "Granted" : "Not granted");
    } catch {
      if (!alive.current) return;
      setPermission("Unavailable");
      setBackgroundPermission("Unavailable");
    }
  }

  function clearRevokedAccess() {
    ++refreshSequence.current;
    setSnapshot(null);
    setOrders([]);
    setHistory(null);
    setHistoryRow(null);
    setSelected(null);
    setUnread(null);
    setConnected(false);
    setRevoked(true);
    void stopDriverLocation();
  }
  useEffect(() => {
    alive.current = true;
    let running = false;
    const poll = async () => {
      if (running || !appActive.current) return;
      running = true;
      try {
        await refresh();
      } catch (e: any) {
        if (alive.current) {
          if ([401, 403].includes(e.status)) clearRevokedAccess();
          setConnected(false);
          setError(connectionError);
        }
      } finally {
        running = false;
      }
    };
    api("driver.restrict", {})
      .then(poll)
      .catch((e) => {
        if (alive.current && [401, 403].includes(e.status))
          clearRevokedAccess();
        if (alive.current) setError(e.message);
      });
    void readPermission();
    const timer = setInterval(poll, 15000);
    const listener = AppState.addEventListener("change", (state) => {
      appActive.current = state === "active";
      if (state === "active") {
        void readPermission();
        void poll();
      }
    });
    return () => {
      alive.current = false;
      clearInterval(timer);
      listener.remove();
      keys.current.clear();
    };
  }, [user.id]);
  useEffect(() => {
    let mounted = true;
    const handle = async (url: string) => {
      if (!url.startsWith("easygas-driver://")) return;
      try {
        const parsed = new URL(url);
        const orderId = parsed.searchParams.get("orderId");
        if (
          parsed.hostname !== "orders" ||
          !orderId ||
          !/^[a-f0-9-]{36}$/i.test(orderId)
        )
          throw new Error("Invalid driver delivery link.");
        await api("driver.restrict", {});
        const owned = await api(
          "orders?active=1&id=" + encodeURIComponent(orderId),
        );
        if (!owned.length)
          throw new Error(
            "This delivery is no longer assigned to your account.",
          );
        if (mounted) {
          await refresh();
          open(owned[0]);
        }
      } catch (e: any) {
        if (mounted) setError(e.message);
      }
    };
    Linking.getInitialURL().then((url) => {
      if (url && mounted) void handle(url);
    });
    const listener = Linking.addEventListener("url", ({ url }) => {
      void handle(url);
    });
    return () => {
      mounted = false;
      listener.remove();
    };
  }, [user.id]);
  useEffect(() => {
    if (page !== "history" || !connected || revoked) return;
    let current = true;
    setHistory(null);
    setHistoryError("");
    driverReadDeadline(api(driverHistoryAction(historyFilters)))
      .then((data) => {
        if (current) setHistory(data);
      })
      .catch((e: any) => {
        if (!current) return;
        if ([401, 403].includes(e.status)) clearRevokedAccess();
        setHistoryError(e.message);
      });
    return () => {
      current = false;
    };
  }, [page, connected, revoked, historyFilters, historyRefresh, user.id]);

  function back() {
    if (historyRow) setHistoryRow(null);
    else if (selected && phase !== "detail") {
      setPhase("detail");
      setCompleted(null);
    } else if (selected) setSelected(null);
    else if (showFilters) setShowFilters(false);
    else if (["security", "personal", "trip"].includes(page))
      setPage("profile");
    else if (page !== "home") setPage("home");
    else return false;
    return true;
  }
  useEffect(() => {
    const handler = BackHandler.addEventListener("hardwareBackPress", back);
    return () => handler.remove();
  }, [page, selected, phase, historyRow, showFilters]);

  function open(o: any) {
    setSelected(o.id);
    setPhase("detail");
    setNotes("");
    setCode("");
    setHandover(false);
    setError("");
  }
  async function run(action: string, input: any) {
    if (!order || actionBusy.current) return;
    actionBusy.current = true;
    setBusy(true);
    setError("");
    const signature = action + JSON.stringify(input);
    if (!keys.current.has(signature)) keys.current.set(signature, randomUUID());
    const operationKey = keys.current.get(signature)!;
    try {
      await api(action, { ...input, operationKey });
      try {
        if (action === "driver.complete") {
          const current = (await api("orders?id=" + order.id))[0];
          if (current?.status === "delivered") {
            setCompleted(current);
            setPhase("completed");
          }
        }
        await refresh();
      } catch {
        setConnected(false);
        setError(
          "The server accepted the update. Reconnect to confirm the latest delivery status.",
        );
      }
    } catch (e: any) {
      if (e instanceof TypeError) {
        try {
          await captureFieldEvent(
            user.id,
            "order:" + order.id,
            2,
            "status",
            {
              attemptId: order.attempt?.id,
              deliveryAction: action,
              input: { ...input },
            },
            operationKey,
          );
          setQueue((q) => (q === null ? null : q + 1));
          setError(
            "Pending Sync: encrypted intent retained. This has not changed the server order or confirmed delivery.",
          );
        } catch (q: any) {
          setError(q.message);
        }
      } else setError(e.message);
    } finally {
      actionBusy.current = false;
      setBusy(false);
    }
  }
  async function sync() {
    setBusy(true);
    setError("");
    try {
      const result = await syncDriverFieldQueue(
        user.id,
        api,
        photoUploader(origin, token),
      );
      await refresh();
      if (!result.conflicts.length) setLastSync(new Date().toISOString());
      setError(
        result.conflicts[0] ??
          `${result.sent} pending records verified by the server. Refresh the order before continuing.`,
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const heading = historyRow
    ? "Delivery record"
    : selected
      ? phase === "proof"
        ? "Proof of delivery"
        : phase === "status"
          ? "Update delivery status"
          : phase === "completed"
            ? "Delivery completed"
            : (order?.reference ?? "Assigned delivery")
      : (
          {
            home: "",
            orders: "Orders",
            history: "History",
            profile: "Profile",
            notices: "Notifications",
            security: "Security",
            personal: "Personal information",
            support: "Help & support",
            trip: "Trip & custody",
          } as Record<string, string>
        )[page];

  function navigate(destination?: { latitude: unknown; longitude: unknown }) {
    const url = connected && driverNavigation(destination);
    if (url)
      Linking.openURL(url).catch(() =>
        setError("Navigation could not be opened."),
      );
  }

  function openOrders() {
    setPage("orders");
    setAssignmentFilter("all");
  }

  function orderList() {
    const filtered = activeOrders.filter(
      (o) =>
        (assignmentFilter === "all" ||
          assignmentLabel(
            o.status,
            o.attempt?.state,
            snapshot.responses.find((r: any) => r.order_id === o.id)?.decision,
          ) !== "Assigned") &&
        [o.reference, o.address?.street, o.customer_name]
          .join(" ")
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
    );
    return (
      <>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Button
            label={`${assignmentFilter === "all" ? "✓ " : ""}Assigned`}
            onPress={openOrders}
            secondary
          />
          <Button
            label={`${assignmentFilter === "progress" ? "✓ " : ""}In progress`}
            onPress={() => setAssignmentFilter("progress")}
            secondary
          />
          <Button
            label="History"
            onPress={() => setPage("history")}
            secondary
          />
        </View>
        <TextInput
          accessibilityLabel="Search assigned orders"
          placeholder="Search assigned orders"
          value={query}
          onChangeText={(value) => {
            setQuery(value);
            setLimit(20);
          }}
          style={{
            backgroundColor: colors.input,
            color: colors.text,
            padding: 13,
            minHeight: 48,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 14,
          }}
        />
        {!filtered.length && (
          <Card>
            <Copy>
              {connected
                ? "No matching assignments."
                : "Reconnect to check assigned orders."}
            </Copy>
          </Card>
        )}
        {filtered.slice(0, limit).map((o) => (
          <DriverPanel key={o.id}>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "space-between",
                gap: 10,
                alignItems: "center",
              }}
            >
              <DriverLabel icon="cube-outline" label={o.reference} />
              <DriverBadge
                label={assignmentLabel(
                  o.status,
                  o.attempt?.state,
                  snapshot.responses.find((r: any) => r.order_id === o.id)
                    ?.decision,
                )}
              />
            </View>
            {!!o.customer_name && (
              <DriverSettingRow title={o.customer_name} icon="person-outline" />
            )}
            {!!driverOrderAddress(o.address) && (
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Ionicons
                  name="location-outline"
                  size={21}
                  color={colors.primary}
                  accessible={false}
                />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Copy>{driverOrderAddress(o.address)}</Copy>
                </View>
              </View>
            )}
            {driverAssignmentSummary(o).map((line, index) => (
              <Copy key={index}>{line}</Copy>
            ))}
            <View
              style={{
                borderTopWidth: 1,
                borderColor: colors.border,
                paddingTop: 12,
                gap: 10,
              }}
            >
              <Copy>
                {[o.delivery_date, o.delivery_window]
                  .filter(Boolean)
                  .join(" · ") || "Delivery window unavailable"}
              </Copy>
              {connected && driverNavigation(o.destination) && (
                <Button
                  label="Navigate"
                  secondary
                  onPress={() => navigate(o.destination)}
                />
              )}
              <Button
                label={driverNextAction(
                  o,
                  snapshot.responses.find((r: any) => r.order_id === o.id)
                    ?.decision,
                )}
                onPress={() => open(o)}
              />
            </View>
          </DriverPanel>
        ))}
        {filtered.length > limit && (
          <Button
            label="Show more assignments"
            secondary
            onPress={() => setLimit((n) => n + 20)}
          />
        )}
        {activeOrders.length === 100 && (
          <Copy>
            Showing up to 100 current assignments. Contact dispatch for older
            assigned records.
          </Copy>
        )}
      </>
    );
  }

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <StatusBar barStyle="light-content" />
      <View
        key={`${scrollKey}:${colors.background}`}
        collapsable={false}
        style={{
          backgroundColor: headerGreen,
          paddingTop: insets.top,
          paddingHorizontal: 18,
          paddingBottom: 30,
          flexShrink: 0,
        }}
      >
        <View
          collapsable={false}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            minHeight: 54,
            flexShrink: 0,
          }}
        >
          {(selected || historyRow || !tabs.some((t) => t[1] === page)) && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={back}
              style={{ width: 48, minHeight: 48, justifyContent: "center" }}
            >
              <Ionicons
                accessible={false}
                name="chevron-back"
                size={24}
                color="#fff"
              />
            </Pressable>
          )}
          <View
            collapsable={false}
            style={{
              flex: 1,
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 8,
            }}
          >
            <View
              style={{
                backgroundColor: "#fff",
                borderRadius: 10,
                paddingHorizontal: 6,
              }}
            >
              <Image
                accessibilityLabel="EasyGas"
                source={require("./assets/easygas-logo-hd.png")}
                resizeMode="contain"
                style={{ width: 92, height: 36 }}
              />
            </View>
            <Text preserveColor style={{ color: "#fff", fontWeight: "700" }}>
              Driver
            </Text>
          </View>
          {!!snapshot && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                unread == null
                  ? "Notifications"
                  : `Notifications, ${unread} unread`
              }
              style={{
                minWidth: 48,
                minHeight: 48,
                alignItems: "center",
                justifyContent: "center",
              }}
              onPress={() => {
                setSelected(null);
                setHistoryRow(null);
                setPage("notices");
              }}
            >
              <Ionicons
                name="notifications-outline"
                size={24}
                color="#fff"
                accessible={false}
              />
              {connected && !!unread && (
                <Text preserveColor style={{ color: "#fff", fontSize: 11 }}>
                  {unread > 99 ? "99+" : unread}
                </Text>
              )}
            </Pressable>
          )}
          {!!snapshot && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Help and support"
              style={{
                width: 48,
                height: 48,
                alignItems: "center",
                justifyContent: "center",
              }}
              onPress={() => {
                setSelected(null);
                setHistoryRow(null);
                setPage("support");
              }}
            >
              <Ionicons
                name="help-circle-outline"
                size={26}
                color="#fff"
                accessible={false}
              />
            </Pressable>
          )}
        </View>
        {!!heading && (
          <Text
            accessibilityRole="header"
            preserveColor
            style={{ color: "#fff", fontWeight: "800", fontSize: 27 }}
          >
            {heading}
          </Text>
        )}
        {!selected && !historyRow && page === "orders" && (
          <Text preserveColor style={{ color: "#fff" }}>
            Manage your assigned deliveries
          </Text>
        )}
        {!historyRow && page === "history" && (
          <Text preserveColor style={{ color: "#fff" }}>
            Review closed delivery attempts
          </Text>
        )}
        <View
          accessible={false}
          pointerEvents="none"
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 30,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              position: "absolute",
              bottom: -14,
              left: -30,
              right: -30,
              height: 35,
              backgroundColor: "#168d3e",
              borderTopLeftRadius: 180,
              borderTopRightRadius: 110,
              transform: [{ rotate: "-2deg" }],
            }}
          />
          <View
            style={{
              position: "absolute",
              bottom: -23,
              left: -20,
              right: -20,
              height: 36,
              backgroundColor: colors.background,
              borderTopLeftRadius: 130,
              borderTopRightRadius: 180,
            }}
          />
        </View>
      </View>
      <ScrollView
        ref={scrollRef}
        onScroll={(event) => {
          scrollPositions.current[scrollKey] =
            event.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={32}
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          gap: 14,
          padding: 16,
          paddingBottom: 40,
          width: "100%",
          maxWidth: 760,
          alignSelf: "center",
        }}
      >
        {!!snapshot && !revoked && (
          <DriverTripTracking
            api={api}
            userId={user.id}
            visible={page === "trip" && !selected}
          />
        )}
        {!!snapshot && page === "trip" && !selected && (
          <>
            <BulkLPG api={api} />
            <VehicleManifest api={api} />
          </>
        )}
        {!!error && (
          <Feedback
            error={error}
            retry={() => {
              setError("");
              refresh().catch(() => {
                setConnected(false);
                setError("Unable to refresh. Records may be stale.");
              });
            }}
          />
        )}
        {revoked ? (
          <Card>
            <Title>Driver access unavailable</Title>
            <Copy>
              Sign in again or contact dispatch to confirm your access.
            </Copy>
            <Button
              label="Sign out"
              secondary
              onPress={() => {
                void logout().catch(() => setError("Sign-out needs review."));
              }}
            />
          </Card>
        ) : !snapshot ? (
          <Card>
            <Image
              source={require("./assets/easygas-logo-hd.png")}
              resizeMode="contain"
              style={{ width: 220, height: 80, alignSelf: "center" }}
            />
            <Title>Driver App</Title>
            <Copy>Restoring your verified delivery-only session…</Copy>
          </Card>
        ) : historyRow ? (
          <Card>
            <Title>{historyRow.reference}</Title>
            <Copy>
              {driverOutcomes[historyRow.outcome]} ·{" "}
              {driverDate(historyRow.closed_at)} WAT
            </Copy>
            {connected && historyRow.has_proof && (
              <DriverPhotoHistory
                api={api}
                orderId={historyRow.order_id}
                attemptId={historyRow.id}
                origin={origin}
                token={token}
              />
            )}
          </Card>
        ) : selected && !order ? (
          <Card>
            <Copy>
              This assignment is no longer accessible. It may have been
              reassigned. Pending evidence is retained for dispatch review.
            </Copy>
            <Button
              label="Back to Orders"
              onPress={() => {
                setSelected(null);
                setPage("orders");
              }}
            />
          </Card>
        ) : selected && order ? (
          <>
            {phase === "completed" && completed?.status === "delivered" ? (
              <Card accent>
                <Ionicons
                  accessible={false}
                  name="checkmark-circle"
                  size={84}
                  color={colors.success}
                />
                <Title>Delivery Completed</Title>
                <Copy>
                  {completed.reference} was confirmed delivered by the server at{" "}
                  {completed.delivered_at
                    ? driverDate(completed.delivered_at) + " WAT"
                    : "the recorded delivery time"}
                  .
                </Copy>
                <Button
                  label="Back to Orders"
                  onPress={() => {
                    setSelected(null);
                    setCompleted(null);
                    setPhase("detail");
                    setPage("orders");
                  }}
                />
              </Card>
            ) : (
              <>
                <Card>
                  <Title>{order.reference}</Title>
                  <Copy>{order.customer_name}</Copy>
                  <Copy>
                    {order.address?.street}, {order.address?.zone}
                  </Copy>
                  <Copy>
                    {(order.gas_lines ?? [])
                      .map(
                        (g: any) =>
                          `${Number(g.grams) / 1000} kg (${Number(g.capacity_grams) / 1000} kg capacity)`,
                      )
                      .join(" · ")}
                  </Copy>
                  <Copy>
                    {(order.items ?? [])
                      .map((i: any) => `${i.quantity} × ${i.name}`)
                      .join(" · ")}
                  </Copy>
                  <Copy>Payment status · {order.payment_status}</Copy>
                  <Copy>
                    {order.delivery_date} · {order.delivery_window}
                  </Copy>
                </Card>
                {phase === "history" ? (
                  <DriverPhotoHistory
                    api={api}
                    orderId={order.id}
                    origin={origin}
                    token={token}
                  />
                ) : phase === "detail" ? (
                  <>
                    {order.events?.map((e: any, i: number) => (
                      <View
                        key={i}
                        style={{
                          padding: 10,
                          borderLeftWidth: 2,
                          borderColor: colors.primary,
                        }}
                      >
                        <Text
                          preserveColor
                          style={{ color: colors.text, fontWeight: "700" }}
                        >
                          {e.status.replaceAll("_", " ")}
                        </Text>
                        <Copy>{driverDate(e.created_at) + " WAT"}</Copy>
                      </View>
                    ))}
                    {activeOrders.some((o) => o.id === order.id) && (
                      <>
                        {connected && driverNavigation(order.destination) && (
                          <Button
                            label="Navigate to confirmed destination"
                            onPress={() => navigate(order.destination)}
                          />
                        )}
                        {/^\+?[0-9]{10,15}$/.test(
                          order.address?.phone ?? "",
                        ) && (
                          <Button
                            label="Call Customer"
                            secondary
                            onPress={() =>
                              Linking.openURL(
                                "tel:" + order.address.phone,
                              ).catch(() =>
                                setError(
                                  "Calling is unavailable on this device.",
                                ),
                              )
                            }
                          />
                        )}
                        <Copy>
                          {driverNavigation(order.destination)
                            ? "Directions use the destination confirmed by dispatch."
                            : "Directions are unavailable until dispatch confirms the destination."}
                        </Copy>
                      </>
                    )}
                    {order.status === "assigned" && (
                      <>
                        <FieldCaption required={true}>
                          Acknowledgement or decline reason
                        </FieldCaption>
                        <TextInput
                          accessibilityLabel="Acknowledgement or decline reason, required"
                          placeholder="Acknowledgement / decline reason"
                          value={notes}
                          onChangeText={setNotes}
                          style={{
                            padding: 13,
                            color: colors.text,
                            backgroundColor: colors.input,
                            borderRadius: 12,
                          }}
                        />
                        {!response && !order.assignment_response_open && (
                          <Copy>
                            Ask dispatch to renew this assignment before
                            responding.
                          </Copy>
                        )}
                        {!response && order.assignment_response_open && (
                          <>
                            <Button
                              label="Acknowledge Assignment"
                              disabled={busy || notes.trim().length < 5}
                              onPress={() =>
                                run("dispatch.respond", {
                                  orderId: order.id,
                                  version: order.tracking_version,
                                  decision: "acknowledged",
                                  reason: notes.trim(),
                                })
                              }
                            />
                            <Button
                              label="Decline and Notify Dispatch"
                              secondary
                              disabled={busy || notes.trim().length < 5}
                              onPress={() =>
                                run("dispatch.respond", {
                                  orderId: order.id,
                                  version: order.tracking_version,
                                  decision: "rejected",
                                  reason: notes.trim(),
                                })
                              }
                            />
                          </>
                        )}
                        <Copy>
                          Direct assignment workflow. This is acknowledgement,
                          not a fabricated offer.
                        </Copy>
                        <Copy>
                          Verify physical items/serials against the canonical
                          manifest: {JSON.stringify(order.manifest)}
                        </Copy>
                        <Button
                          label="Confirm Inspected Pickup"
                          disabled={
                            busy ||
                            notes.trim().length < 5 ||
                            response !== "acknowledged" ||
                            order.attempt?.state === "picked_up"
                          }
                          onPress={() =>
                            run("delivery.pickup", {
                              orderId: order.id,
                              version: order.tracking_version,
                              manifest: order.manifest,
                              reason: notes.trim(),
                            })
                          }
                        />
                        {order.attempt?.state === "picked_up" && (
                          <Button
                            label="On the Way"
                            disabled={busy}
                            onPress={() =>
                              run("order.transition", {
                                id: order.id,
                                version: order.tracking_version,
                                status: "out_for_delivery",
                                note: "Driver confirms verified pickup and departure",
                              })
                            }
                          />
                        )}
                      </>
                    )}
                    {order.status === "out_for_delivery" && (
                      <Button
                        label="Update Delivery Status"
                        onPress={() => setPhase("status")}
                      />
                    )}{" "}
                    <Button
                      label="View Private Proof History"
                      secondary
                      onPress={() => setPhase("history")}
                    />
                    {order.status === "delivered" && (
                      <Copy>
                        Confirmed history is read-only. Original per-order
                        evidence remains retained.
                      </Copy>
                    )}
                  </>
                ) : phase === "status" ? (
                  <>
                    {order.attempt?.state === "picked_up" && (
                      <Button
                        label="At Location"
                        disabled={busy}
                        onPress={() =>
                          run("delivery.arrived", {
                            orderId: order.id,
                            version: order.tracking_version,
                            reason:
                              "Driver confirms arrival at the assigned address",
                          })
                        }
                      />
                    )}
                    {order.attempt?.state === "arrived" && (
                      <Button
                        label="Continue to Proof of Delivery"
                        onPress={() => setPhase("proof")}
                      />
                    )}
                    <Card>
                      <Title>Unable to Deliver</Title>
                      {deliveryFailureReasons.map((r) => (
                        <Button
                          key={r}
                          label={
                            (reason === r ? "✓ " : "") + r.replaceAll("_", " ")
                          }
                          secondary
                          onPress={() => setReason(r)}
                        />
                      ))}
                      <FieldCaption required={true}>
                        Failure evidence and dispatch notes
                      </FieldCaption>
                      <TextInput
                        accessibilityLabel="Failure evidence and dispatch notes, required"
                        placeholder="Observed problem and next step"
                        value={notes}
                        onChangeText={setNotes}
                        style={{
                          padding: 12,
                          color: colors.text,
                          backgroundColor: colors.input,
                        }}
                      />
                      <Button
                        label="Report Failure to Dispatch"
                        disabled={busy || notes.trim().length < 5}
                        onPress={() =>
                          run("order.transition", {
                            id: order.id,
                            version: order.tracking_version,
                            status: "delivery_failed",
                            failureReason: reason,
                            note: notes.trim(),
                          })
                        }
                      />
                    </Card>
                  </>
                ) : phase === "proof" ? (
                  <>
                    <DriverProof
                      userId={user.id}
                      order={order}
                      galleryApproved={snapshot.galleryApproved}
                      onQueued={() =>
                        setQueue((n) => (n === null ? null : n + 1))
                      }
                    />
                    <Button
                      label="Synchronise Encrypted Proof"
                      disabled={busy}
                      secondary
                      onPress={sync}
                    />
                    <Copy>
                      Completion requires a verified payment. Contact dispatch
                      for payment review.
                    </Copy>
                    <FieldCaption required={true}>
                      Customer six-digit handover code
                    </FieldCaption>
                    <TextInput
                      accessibilityLabel="Customer six-digit handover code, required"
                      placeholder="Customer handover code"
                      keyboardType="number-pad"
                      value={code}
                      maxLength={6}
                      onChangeText={setCode}
                      style={{
                        padding: 14,
                        color: colors.text,
                        backgroundColor: colors.input,
                        borderRadius: 12,
                      }}
                    />
                    <View
                      style={{
                        flexDirection: "row",
                        gap: 12,
                        alignItems: "center",
                      }}
                    >
                      <Switch
                        hitSlop={10}
                        accessibilityLabel="All items physically handed over"
                        value={handover}
                        onValueChange={setHandover}
                      />
                      <FieldCaption required={true}>
                        All items and full gas quantity handed over
                      </FieldCaption>
                    </View>
                    <Button
                      label="Complete Delivery"
                      disabled={
                        busy ||
                        !handover ||
                        !/^\d{6}$/.test(code) ||
                        !["wallet", "card", "cash_on_delivery"].includes(
                          order.payment_method,
                        ) ||
                        order.payment_status !== "verified"
                      }
                      onPress={() =>
                        run("driver.complete", {
                          orderId: order.id,
                          version: order.tracking_version,
                          code,
                          handover: true,
                        })
                      }
                    />
                  </>
                ) : null}
              </>
            )}
          </>
        ) : page === "home" ? (
          <>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                paddingVertical: 2,
              }}
            >
              <View
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 29,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.elevated,
                }}
              >
                <Ionicons
                  accessible={false}
                  name="car-outline"
                  size={30}
                  color={colors.primary}
                />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Copy>Good to see you,</Copy>
                <Text
                  preserveColor
                  accessibilityRole="header"
                  style={{
                    fontSize: 27,
                    fontWeight: "800",
                    letterSpacing: -0.7,
                    color: colors.text,
                  }}
                >
                  {snapshot.profile.name}
                </Text>
              </View>
            </View>
            <View
              style={{
                backgroundColor: headerGreen,
                borderRadius: 18,
                padding: 18,
                gap: 10,
                overflow: "hidden",
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <View style={{ flex: 1, gap: 6 }}>
                  <Text
                    preserveColor
                    style={{
                      color: "#fff",
                      fontWeight: "800",
                      fontSize: 20,
                      letterSpacing: -0.4,
                    }}
                  >
                    {snapshot.profile.driver_available
                      ? "Ready for dispatch"
                      : "Assignments paused"}
                  </Text>
                  <Text
                    preserveColor
                    style={{ color: "#e3f1e8", fontSize: 13 }}
                  >
                    {connected
                      ? snapshot.profile.driver_available
                        ? "New assignments enabled."
                        : "Turn on availability when ready."
                      : "Reconnect to confirm availability."}
                  </Text>
                </View>
                <Switch
                  hitSlop={10}
                  accessibilityLabel="Available for dispatch"
                  value={snapshot.profile.driver_available}
                  disabled={busy || !connected}
                  trackColor={{ false: "#597467", true: "#23ac31" }}
                  onValueChange={async (available) => {
                    if (actionBusy.current) return;
                    actionBusy.current = true;
                    setBusy(true);
                    setError("");
                    try {
                      const result = await api("driver.availability", {
                        available,
                        operationKey: randomUUID(),
                      });
                      ++refreshSequence.current;
                      setSnapshot((old: any) =>
                        old
                          ? {
                              ...old,
                              profile: {
                                ...old.profile,
                                driver_available: result.available,
                              },
                            }
                          : old,
                      );
                    } catch (e: any) {
                      if ([401, 403].includes(e.status)) clearRevokedAccess();
                      setError(e.message);
                    } finally {
                      actionBusy.current = false;
                      setBusy(false);
                    }
                  }}
                />
              </View>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Ionicons
                  accessible={false}
                  name="car-outline"
                  size={19}
                  color="#b7ef8c"
                />
                <Text preserveColor style={{ color: "#d0eed7", fontSize: 12 }}>
                  {connected
                    ? "Availability confirmed by EasyGas"
                    : "Availability unconfirmed"}
                </Text>
              </View>
            </View>
            <DriverPanel>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                <DriverSignal
                  icon="wifi-outline"
                  label="Backend"
                  value={connected ? "Connected" : "Unconfirmed"}
                />
                <DriverSignal
                  icon="navigate-outline"
                  label="GPS permission"
                  value={permission}
                  onPress={() => setPage("trip")}
                />
                <DriverSignal
                  icon="location-outline"
                  label="Trip sharing"
                  value={
                    connected
                      ? snapshot.trip
                        ? snapshot.trip.location_consent
                          ? "Consented"
                          : "Off"
                        : "No active trip"
                      : "Unavailable"
                  }
                  onPress={() => setPage("trip")}
                />
              </View>
              <Copy>
                {driverContactLabel(snapshot.profile.driver_last_seen_at)}
              </Copy>
              {lastContact && (
                <Copy>Backend confirmed {driverDate(lastContact)} WAT</Copy>
              )}
            </DriverPanel>
            <DriverPanel>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <DriverHeading>Today at a glance</DriverHeading>
                <Button
                  label="View history"
                  secondary
                  onPress={() => setPage("history")}
                />
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <DriverMetric
                  label="New assignments"
                  value={snapshot.metrics?.newAssignments}
                  confirmed={connected}
                  icon="cube-outline"
                />
                <DriverMetric
                  label="In progress"
                  value={snapshot.metrics?.inProgress}
                  confirmed={connected}
                  icon="car-outline"
                  tone="blue"
                />
                <DriverMetric
                  label="Completed today"
                  value={snapshot.metrics?.completedToday}
                  confirmed={connected}
                  icon="checkmark-circle-outline"
                  tone="amber"
                />
              </View>
            </DriverPanel>
            <DriverPanel>
              <DriverHeading icon="cube-outline">Next delivery</DriverHeading>
              {nextAssignment ? (
                <>
                  <DriverLabel
                    icon="bag-handle-outline"
                    label={nextAssignment.reference}
                  />
                  <Copy>
                    {driverOrderAddress(nextAssignment.address) ||
                      "Destination unavailable"}
                  </Copy>
                  {driverAssignmentSummary(nextAssignment).map(
                    (line, index) => (
                      <Copy key={index}>{line}</Copy>
                    ),
                  )}
                  <Copy>
                    {[
                      nextAssignment.delivery_date,
                      nextAssignment.delivery_window,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Copy>
                  <Button
                    label={driverNextAction(
                      nextAssignment,
                      snapshot.responses.find(
                        (r: any) => r.order_id === nextAssignment.id,
                      )?.decision,
                    )}
                    onPress={() => {
                      openOrders();
                      open(nextAssignment);
                    }}
                  />
                </>
              ) : (
                <>
                  <Copy>
                    {connected
                      ? "You're up to date. Your next assigned delivery will appear here."
                      : "Reconnect to confirm assignments."}
                  </Copy>
                  <Button
                    label="View assigned orders"
                    secondary
                    onPress={openOrders}
                  />
                </>
              )}
            </DriverPanel>
            <DriverPanel>
              <DriverHeading icon="flash-outline">Quick actions</DriverHeading>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <View style={{ flexGrow: 1, flexBasis: 130 }}>
                  <Button
                    label="Assigned orders"
                    secondary
                    onPress={openOrders}
                  />
                </View>
                <View style={{ flexGrow: 1, flexBasis: 130 }}>
                  <Button
                    label="Trip & custody"
                    secondary
                    onPress={() => setPage("trip")}
                  />
                </View>
                <View style={{ flexGrow: 1, flexBasis: 130 }}>
                  <Button
                    label="Contact dispatch"
                    secondary
                    onPress={() => setPage("support")}
                  />
                </View>
                <View style={{ flexGrow: 1, flexBasis: 130 }}>
                  <Button
                    label="Settings"
                    secondary
                    onPress={() => setPage("profile")}
                  />
                </View>
              </View>
            </DriverPanel>
          </>
        ) : page === "orders" ? (
          orderList()
        ) : page === "history" ? (
          <>
            <Button
              label={showFilters ? "Close filters" : "Filter history"}
              secondary
              onPress={() => setShowFilters((value) => !value)}
            />
            {showFilters && (
              <Card>
                {(["from", "to"] as const).map((field) => (
                  <View key={field} style={{ gap: 6 }}>
                    <Copy>
                      {field === "from" ? "Start date" : "End date"} ·
                      YYYY-MM-DD
                    </Copy>
                    <TextInput
                      accessibilityLabel={
                        field === "from" ? "Start date" : "End date"
                      }
                      value={historyDraft[field]}
                      placeholder="YYYY-MM-DD"
                      onChangeText={(value) =>
                        setHistoryDraft((draft) => ({
                          ...draft,
                          [field]: value,
                        }))
                      }
                      style={{
                        minHeight: 48,
                        paddingHorizontal: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                        borderRadius: 12,
                      }}
                    />
                  </View>
                ))}
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
                >
                  {[
                    ["", "All outcomes"],
                    ...Object.entries(driverOutcomes),
                  ].map(([value, label]) => (
                    <Button
                      key={value}
                      label={
                        (historyDraft.outcome === value ? "✓ " : "") + label
                      }
                      secondary
                      onPress={() =>
                        setHistoryDraft((draft) => ({
                          ...draft,
                          outcome: value,
                        }))
                      }
                    />
                  ))}
                </View>
                <Button
                  label="Apply filters"
                  onPress={() => {
                    setHistoryFilters({ ...historyDraft, page: 1 });
                    setShowFilters(false);
                  }}
                />
              </Card>
            )}
            {historyError && (
              <Feedback
                error={historyError}
                retry={() => setHistoryRefresh((value) => value + 1)}
              />
            )}
            {!connected ? (
              <Copy>Reconnect to confirm delivery history.</Copy>
            ) : history ? (
              <>
                <DriverPanel>
                  <DriverHeading icon="checkmark-circle-outline">
                    Delivery history
                  </DriverHeading>
                  <Copy>
                    {history.delivered} completed deliveries in this period ·{" "}
                    {history.total} closed records matching filters
                  </Copy>
                </DriverPanel>
                <TextInput
                  accessibilityLabel="Find reference on this history page"
                  placeholder="Find reference on this page"
                  value={historyQuery}
                  onChangeText={setHistoryQuery}
                  style={{
                    minHeight: 48,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 14,
                  }}
                />
                {!history.rows.length && (
                  <Card>
                    <Copy>No closed deliveries match these filters.</Copy>
                  </Card>
                )}
                {history.rows
                  .filter((row) =>
                    row.reference
                      .toLowerCase()
                      .includes(historyQuery.trim().toLowerCase()),
                  )
                  .map((row) => (
                    <Pressable
                      key={row.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${row.reference}, ${driverOutcomes[row.outcome]}`}
                      onPress={() => setHistoryRow(row)}
                    >
                      <DriverPanel>
                        <View
                          style={{
                            flexDirection: "row",
                            flexWrap: "wrap",
                            justifyContent: "space-between",
                            gap: 8,
                          }}
                        >
                          <DriverLabel
                            icon="cube-outline"
                            label={row.reference}
                          />
                          <DriverBadge label={driverOutcomes[row.outcome]} />
                        </View>
                        <Copy>{driverDate(row.closed_at)} WAT</Copy>
                        <Copy>View delivery record →</Copy>
                      </DriverPanel>
                    </Pressable>
                  ))}
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <Button
                    label="Previous"
                    secondary
                    disabled={history.page <= 1}
                    onPress={() =>
                      setHistoryFilters((old) => ({
                        ...old,
                        page: old.page - 1,
                      }))
                    }
                  />
                  <Copy>Page {history.page}</Copy>
                  <Button
                    label="Next"
                    secondary
                    disabled={history.page * history.pageSize >= history.total}
                    onPress={() =>
                      setHistoryFilters((old) => ({
                        ...old,
                        page: old.page + 1,
                      }))
                    }
                  />
                </View>
              </>
            ) : (
              !historyError && <Feedback loading />
            )}
          </>
        ) : page === "notices" ? (
          <CustomerNotifications
            api={api}
            onUnreadCount={setUnread}
            relatedAction={(id) => {
              const assigned = orders.find((order) => order.id === id);
              return assigned
                ? { label: "View assigned order", open: () => open(assigned) }
                : undefined;
            }}
          />
        ) : page === "security" ? (
          <NativeForm
            api={api}
            action="account.password"
            title="Change your password"
            fields={[
              {
                name: "currentPassword",
                label: "Current password",
                type: "password",
              },
              {
                name: "newPassword",
                label: `New password (at least ${PASSWORD_MIN_LENGTH} characters)`,
                type: "password",
              },
            ]}
            onDone={() => setPage("profile")}
          />
        ) : page === "support" ? (
          <NativeForm
            api={api}
            action="support.create"
            title="Contact Dispatch Support"
            fields={[
              { name: "subject", label: "Subject" },
              { name: "message", label: "Describe the delivery issue" },
            ]}
            onDone={() => setPage("profile")}
          />
        ) : page === "personal" ? (
          <NativeForm
            api={api}
            action="account.update"
            title="Edit your name"
            fields={[
              {
                name: "name",
                label: "Your name",
                value: snapshot.profile.name,
              },
            ]}
            onDone={() => {
              setPage("profile");
              void refresh().catch(() => setConnected(false));
            }}
          />
        ) : page === "trip" ? null : (
          <>
            <DriverPanel>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 16,
                }}
              >
                <View
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: 38,
                    backgroundColor: colors.elevated,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    preserveColor
                    style={{
                      color: colors.primary,
                      fontWeight: "800",
                      fontSize: 28,
                    }}
                  >
                    {driverInitials(snapshot.profile.name)}
                  </Text>
                </View>
                <View style={{ flex: 1, minWidth: 160, gap: 8 }}>
                  <DriverBadge label="Driver" />
                  <DriverHeading>{snapshot.profile.name}</DriverHeading>
                  <Copy>{snapshot.profile.branch_name}</Copy>
                  <DriverBadge
                    label={
                      !connected
                        ? "Account status unconfirmed"
                        : snapshot.profile.active
                          ? "Active account"
                          : "Inactive account"
                    }
                  />
                </View>
              </View>
              <Copy>{snapshot.profile.email || "Email unavailable"}</Copy>
              <Copy>
                {snapshot.profile.contact_phone || "Contact number unavailable"}
              </Copy>
            </DriverPanel>
            <DriverHeading>Driver details</DriverHeading>
            <DriverPanel>
              <DriverSettingRow
                icon="person-outline"
                title="Personal information"
                description="Edit your name; role and branch remain governed"
                onPress={() => setPage("personal")}
              />
              <DriverSettingRow
                icon="car-outline"
                title="Current trip vehicle"
                description={
                  connected && snapshot.trip?.vehicle_label
                    ? `${snapshot.trip.vehicle_label}${snapshot.trip.capacity_grams != null ? ` · ${Number(snapshot.trip.capacity_grams) / 1000} kg capacity` : ""}`
                    : "No confirmed trip vehicle."
                }
              />
              <DriverSettingRow
                icon="shield-checkmark-outline"
                title="Verification & documents"
                description="Managed by authorised staff. No verification record is provided here."
              />
            </DriverPanel>
            <DriverHeading>App & preferences</DriverHeading>
            <DriverPanel>
              <DriverSettingRow
                icon="notifications-outline"
                title="Notifications"
                description="View delivery updates and operational alerts"
                onPress={() => setPage("notices")}
              />
              <DriverSettingRow
                icon="navigate-outline"
                title="Location & trip consent"
                description={`Foreground: ${permission}. Background: ${backgroundPermission}. Trip consent is separate.`}
                onPress={() => setPage("trip")}
              />
              <DriverSettingRow
                icon="settings-outline"
                title="Device location settings"
                description="A switch in this app does not grant OS permission"
                onPress={() => {
                  void Linking.openSettings().catch(() =>
                    setError("Device settings could not be opened."),
                  );
                }}
              />
              <DriverSettingRow
                icon="cloud-upload-outline"
                title="Offline sync"
                description={`${queue ?? "Unavailable"} encrypted delivery updates pending${lastSync ? ` · Confirmed ${driverDate(lastSync)} WAT` : " · No confirmed sync time"}`}
              />
              <Button
                label="Synchronise Safe Delivery Records"
                secondary
                disabled={busy}
                onPress={sync}
              />
              <Copy>Appearance</Copy>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {(["light", "dark", "system"] as const).map((mode) => (
                  <Button
                    key={mode}
                    label={
                      (preference === mode ? "✓ " : "") + mode + " appearance"
                    }
                    secondary
                    onPress={() => {
                      void setPreference(mode).catch(() =>
                        setError("Could not save appearance."),
                      );
                    }}
                  />
                ))}
              </View>
            </DriverPanel>
            <DriverHeading>Support & account</DriverHeading>
            <DriverPanel>
              <DriverSettingRow
                icon="help-circle-outline"
                title="Help & support"
                description="Contact dispatch or report a delivery issue"
                onPress={() => setPage("support")}
              />
              <DriverSettingRow
                icon="lock-closed-outline"
                title="Change password"
                description="Use your existing account security controls"
                onPress={() => setPage("security")}
              />
              <DriverSettingRow
                icon="information-circle-outline"
                title="EasyGas Driver"
                description="Delivery-only workspace · existing session and safety controls"
              />
            </DriverPanel>
            <Button
              label="Sign Out"
              secondary
              onPress={() =>
                EasyGasAlert.alert(
                  "Sign out of Driver App?",
                  queue == null || legacy == null
                    ? "Sync status is unavailable. Reconnect to check for pending updates. Any retained evidence stays encrypted on this device."
                    : queue || legacy
                      ? "You have updates waiting to sync. They will stay securely on this device. Sign in with this same account to sync them later. Deliveries remain unconfirmed until EasyGas verifies them."
                      : "You can sign in again whenever you are ready.",
                  [
                    { text: "Keep working", style: "cancel" },
                    {
                      text: "Sign Out",
                      onPress: () =>
                        logout().catch(() =>
                          setError("Sign-out needs review."),
                        ),
                    },
                  ],
                )
              }
            />
          </>
        )}
        {!revoked && ((queue ?? 0) > 0 || (legacy ?? 0) > 0) && (
          <Card>
            <Title>Pending Sync</Title>
            <Copy>
              {queue ?? "Unavailable"} encrypted field records.{" "}
              {legacy ?? "Unavailable"} legacy completion records require
              dispatch review; this app never replays cash collection.
            </Copy>
            <Button
              label="Synchronise Safe Delivery Records"
              secondary
              disabled={busy}
              onPress={sync}
            />
          </Card>
        )}
      </ScrollView>
      <View
        style={{
          flexDirection: "row",
          borderTopWidth: 1,
          borderColor: colors.border,
          padding: 8,
          backgroundColor: colors.surface,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
        }}
      >
        {tabs.map(([label, dest, icon]) => (
          <Pressable
            key={dest}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{
              selected: page === dest && !selected && !historyRow,
            }}
            onPress={() => {
              setSelected(null);
              setHistoryRow(null);
              setCompleted(null);
              setPhase("detail");
              setPage(dest);
            }}
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              minHeight: 56,
              borderRadius: 24,
              backgroundColor:
                page === dest && !selected && !historyRow
                  ? colors.elevated
                  : colors.surface,
            }}
          >
            <Ionicons
              accessible={false}
              name={icon as any}
              size={23}
              color={page === dest ? colors.primary : colors.muted}
            />
            <Text
              preserveColor
              style={{ color: page === dest ? colors.primary : colors.muted }}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

function DriverLabel({
  icon,
  label,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        flexShrink: 1,
      }}
    >
      <Ionicons
        name={icon}
        color={colors.primary}
        size={22}
        accessible={false}
      />
      <Text
        preserveColor
        style={{
          color: colors.text,
          fontWeight: "800",
          fontSize: 17,
          flexShrink: 1,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

// Only read refreshes use a deadline. Mutation keys and offline recovery stay unchanged.
async function driverReadDeadline<T>(request: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      request,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error("Driver information timed out. Reconnect and retry."),
            ),
          15000,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
