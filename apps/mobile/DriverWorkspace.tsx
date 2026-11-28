import DriverDeparture from "./DriverDeparture";
import DriverLoadReadiness from "./DriverLoadReadiness";
import {driverLoadScope} from "../../packages/business-rules/src/driver-load-readiness";
import AssignmentResponseActions from "./AssignmentResponseActions";
import DriverPickupSummary from "./DriverPickupSummary";
import { NextHeader, NextTabs, NextText, NextIntro } from "./MobileNextUI";
import {
  FieldNextHome,
  FieldNextWork,
  FieldNextAccount,
} from "./MobileNextFieldWork";
import { ScreenTransition } from "./ScreenTransition";
import { ScreenCanvas, fullWidthScreenContent } from "./ScreenCanvas";
import BrandLogo from "./BrandLogo";
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
  driverOrderLabel,
  driverNextAssignment,
} from "../../packages/business-rules/src/driver-presentation";
import CustomerNotifications from "./CustomerNotifications";
import DriverAssignmentAlerts from "./DriverAssignmentAlerts";
import { EasyGasAlert } from "./AppAlert";
import { PASSWORD_MIN_LENGTH } from "../../packages/business-rules/src/password-policy";
import VehicleManifest from "./VehicleManifest";
import DriverTripTracking from "./DriverTripTracking";
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  Switch,
  StatusBar,
  Linking,
  AppState,
  BackHandler,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { isDoorstepRefillOrder } from "../../packages/business-rules/src/refill-workflow";
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
  ["Today", "home", "home-outline"],
  ["Deliveries", "orders", "bag-handle-outline"],
  ["Work", "work", "layers-outline"],
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
  const { colors, dark, preference, setPreference } = useTheme();
  const [tripTab, setTripTab] = useState("Daily gas");
  const [loadReadiness, setLoadReadiness] = useState<{key: string; ready: boolean} | null>(null);
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
  const [syncNotice, setSyncNotice] = useState("");
  const [revoked, setRevoked] = useState(false);
  const [page, setPage] = useState("home"),
    [selected, setSelected] = useState<string | null>(null),
    [phase, setPhase] = useState("detail"),
    [orders, setOrders] = useState<any[]>([]),
    [snapshot, setSnapshot] = useState<any>(null),
    [failureNotes, setFailureNotes] = useState(""),
    [reason, setReason] = useState<(typeof deliveryFailureReasons)[number]>(
      deliveryFailureReasons[0],
    ),
    [code, setCode] = useState(""),
    [handover, setHandover] = useState(false),
    [cashCollected, setCashCollected] = useState(false),
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
  const refill = isDoorstepRefillOrder(order);
  const collectCOD =
    refill &&
    order?.payment_method === "cash_on_delivery" &&
    order?.payment_status !== "verified";
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

  function open(o: any, continueWork = false) {
    setSyncNotice("");
    setPage("orders");
    setHistoryRow(null);
    setSelected(o.id);
    setPhase(
      continueWork && o.status === "out_for_delivery"
        ? o.attempt?.state === "arrived" ? "proof" : "status"
        : "detail",
    );
    setFailureNotes("");
    setCode("");
    setHandover(false);
    setCashCollected(false);
    setError("");
  }
  async function run(action: string, input: any) {
    if (!order || actionBusy.current) return;
    setSyncNotice("");
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
      if (e instanceof TypeError && action === "driver.depart") {
        setError(
          "Starting delivery was not confirmed. Reconnect and refresh before retrying. No offline departure has been queued.",
        );
      } else if (e instanceof TypeError) {
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
    setSyncNotice("");
    try {
      const result = await syncDriverFieldQueue(
        user.id,
        api,
        photoUploader(origin, token),
      );
      await refresh();
      if (!result.conflicts.length) setLastSync(new Date().toISOString());
      setError(result.conflicts[0] ?? "");
      if (!result.conflicts.length)
        setSyncNotice(
          result.sent ? "Delivery records verified by the server. You can continue." : "Delivery records are up to date.",
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
            trip: "Today’s vehicle",
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
                label={driverOrderLabel(
                  o,
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
                onPress={() => open(o, true)}
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

  async function setAvailability(available: boolean) {
    if (actionBusy.current || !connected) return;
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
              profile: { ...old.profile, driver_available: result.available },
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
  }
  function requestSignout() {
    EasyGasAlert.alert(
      "Sign out of Driver App?",
      queue == null || legacy == null
        ? "Sync status is unavailable. Retained evidence stays encrypted on this device."
        : queue || legacy
          ? "You have updates waiting to sync. They stay encrypted on this device. Sign in with this account to sync them later; deliveries remain unconfirmed until verified."
          : "You can sign in again whenever you are ready.",
      [
        { text: "Keep working", style: "cancel" },
        {
          text: "Sign Out",
          onPress: () =>
            logout().catch(() => setError("Sign-out needs review.")),
        },
      ],
    );
  }
  const go = (destination: string) => {
    setSyncNotice("");
    setSelected(null);
    setHistoryRow(null);
    setCompleted(null);
    setPhase("detail");
    setPage(destination);
  };
  return (
    <ScreenCanvas
      topBackgroundColor={colors.background}
      bottomBackgroundColor={colors.background}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <StatusBar barStyle={dark ? "light-content" : "dark-content"} />
      <NextHeader
        home={page === "home" && !selected && !historyRow}
        title={
          heading || page === "work" ? heading || "Driver workspace" : "Driver"
        }
        user={user}
        onBack={back}
        onWork={() => go("work")}
        onNotifications={() => go("notices")}
        onAccount={() => go("profile")}
      />
      <ScreenTransition identity={page + ":" + (selected ?? "") + ":" + phase}>
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
            ...fullWidthScreenContent,
            gap: 14,
            padding: 22,
            paddingTop: 6,
            paddingBottom: 30,
            width: "100%",
            alignSelf: "stretch",
          }}
        >
          {!!snapshot && page === "trip" && !selected && (
            <>
              <NextIntro
                title="Today’s vehicle"
                detail="The office records opening and closing gas weights. Use Deliveries for scale refills and photos."
              />
              <View
                style={{
                  flexDirection: "row",
                  gap: 6,
                  backgroundColor: colors.elevated,
                  padding: 4,
                  borderRadius: 15,
                }}
              >
                {["Daily gas", "Earlier trip", "Products"].map((label) => (
                  <Pressable
                    key={label}
                    accessibilityRole="tab"
                    accessibilityLabel={label}
                    accessibilityState={{ selected: tripTab === label }}
                    onPress={() => setTripTab(label)}
                    style={{
                      flex: 1,
                      minHeight: 44,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 12,
                      backgroundColor:
                        tripTab === label ? colors.surface : "transparent",
                    }}
                  >
                    <NextText kind="label">{label}</NextText>
                  </Pressable>
                ))}
              </View>
              {tripTab === "Earlier trip" ? (
                <DriverTripTracking
                  api={api}
                  userId={user.id}
                  visible={!revoked}
                />
              ) : tripTab === "Daily gas" ? (
                <BulkLPG api={api} />
              ) : (
                <VehicleManifest api={api} />
              )}
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
          {connected && !revoked && !!syncNotice && <Copy>{syncNotice}</Copy>}
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
              <BrandLogo
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
                    {completed.reference} was confirmed delivered by the server
                    at{" "}
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
                        .map((g: any) => `${Number(g.grams) / 1000} kg gas`)
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
                      {order.status === "assigned" && <DriverLoadReadiness
                        api={api} order={order} tripId={snapshot?.trip?.id ?? null}
                        onChange={setLoadReadiness}
                        onReviewLoad={() => {
                          setError(""); setSelected(null); setTripTab("Daily gas"); setPage("trip");
                        }}
                      />}
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
                          {!response &&
                            !order.assignment_response_open &&
                            order.attempt?.state === "assigned" && (
                              <Copy>
                                Ask dispatch to renew this assignment before
                                responding.
                              </Copy>
                            )}
                          {!response && order.assignment_response_open && (
                            <AssignmentResponseActions
                              key={"accept:" + order.id + ":" + order.tracking_version}
                              api={api}
                              onDone={refresh}
                              action="dispatch.respond"
                              input={{
                                orderId: order.id,
                                version: order.tracking_version,
                              }}
                              disabled={busy || !connected || revoked}
                            />
                          )}
                          {!order.daily_run && (!order.gas_lines?.length || order.legacy_lpg === true) && <DriverPickupSummary order={order} refill={refill} />}
                          <DriverDeparture
                            key={"depart:" + order.id + ":" + order.tracking_version}
                            order={order}
                            disabled={
                              busy ||
                              !connected ||
                              revoked ||
                              (!!order.gas_lines?.length &&
                                (loadReadiness?.key !== driverLoadScope(order, snapshot?.trip?.id ?? null) || !loadReadiness?.ready)) ||
                              (response !== "acknowledged" &&
                                order.attempt?.state !== "picked_up")
                            }
                            onStart={(input) => run("driver.depart", input)}
                          />
                        </>
                      )}
                      {order.status === "out_for_delivery" && (
                        <Button
                          label="Continue delivery"
                          onPress={() => setPhase("status")}
                        />
                      )}
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
                          label="I’ve arrived"
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
                          label="Record supply and photo"
                          onPress={() => setPhase("proof")}
                        />
                      )}
                      <Card>
                        <Title>Unable to Deliver</Title>
                        {deliveryFailureReasons.map((r) => (
                          <Button
                            key={r}
                            label={
                              (reason === r ? "✓ " : "") +
                              r.replaceAll("_", " ")
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
                          value={failureNotes}
                          onChangeText={setFailureNotes}
                          style={{
                            padding: 12,
                            color: colors.text,
                            backgroundColor: colors.input,
                          }}
                        />
                        <Button
                          label="Report Failure to Dispatch"
                          disabled={busy || failureNotes.trim().length < 5}
                          onPress={() =>
                            run("order.transition", {
                              id: order.id,
                              version: order.tracking_version,
                              status: "delivery_failed",
                              failureReason: reason,
                              note: failureNotes.trim(),
                            })
                          }
                        />
                      </Card>
                    </>
                  ) : phase === "proof" ? (
                    <>
                      {refill && (
                        <>
                          <Title>Complete doorstep refill</Title>
                          <Copy>
                            Record the gas supplied from your vehicle tank, then
                            upload a photo of the completed refill. No customer
                            cylinder registration or handover code is required.
                          </Copy>
                          <BulkLPG api={api} orderId={order.id} order={order} onSaved={refresh} />
                        </>
                      )}
                      {!refill && order.daily_run && <BulkLPG api={api} orderId={order.id} order={order} onSaved={refresh}/>}
                      {(!order.daily_run || Number(order.daily_run.supplied_grams)>0)&&<DriverProof
                        userId={user.id}
                        order={order}
                        galleryApproved={snapshot.galleryApproved}
                        proofVerified={order.daily_run?.photo_ready === true && queue === 0}
                        onQueued={() =>
                          setQueue((n) => (n === null ? null : n + 1))
                        }
                      />
                      }
                      <Button
                        label="Synchronise Encrypted Proof"
                        disabled={busy}
                        secondary
                        onPress={sync}
                      />
                      {!refill && (
                        <>
                          <Copy>
                            Completion requires a verified payment. Contact
                            dispatch for payment review.
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
                        </>
                      )}
                      {collectCOD && (
                        <View
                          style={{
                            flexDirection: "row",
                            gap: 12,
                            alignItems: "center",
                          }}
                        >
                          <Switch
                            accessibilityLabel="Cash collected for this refill"
                            value={cashCollected}
                            onValueChange={setCashCollected}
                          />
                          <Copy>
                            I actually collected ₦
                            {(Number(order.total_kobo) / 100).toLocaleString()}{" "}
                            in cash for this order. Finance reconciliation is
                            pending.
                          </Copy>
                        </View>
                      )}
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
                        label={refill ? "Complete Refill" : "Complete Delivery"}
                        disabled={
                          busy ||
                          !handover ||
                          (!refill && !/^\d{6}$/.test(code)) ||
                          (collectCOD && !cashCollected) ||
                          !["wallet", "card", "cash_on_delivery"].includes(
                            order.payment_method,
                          ) ||
                          (!collectCOD && order.payment_status !== "verified")
                        }
                        onPress={() =>
                          run("driver.complete", {
                            orderId: order.id,
                            version: order.tracking_version,
                            ...(refill ? {} : { code }),
                            ...(collectCOD
                              ? { collectedKobo: Number(order.total_kobo) }
                              : {}),
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
            <FieldNextHome
              role="driver"
              data={snapshot}
              navigate={go}
              connected={connected}
            />
          ) : page === "work" ? (
            <FieldNextWork
              role="driver"
              data={snapshot}
              navigate={go}
              connected={connected}
              availability={!!snapshot.profile.driver_available}
              onAvailability={(value) => void setAvailability(value)}
            />
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
                      disabled={
                        history.page * history.pageSize >= history.total
                      }
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
            <FieldNextAccount
              role="driver"
              user={snapshot.profile}
              navigate={go}
              onSignout={requestSignout}
              onSettings={() =>
                void Linking.openSettings().catch(() =>
                  setError("Device settings could not be opened."),
                )
              }
              onSync={sync}
              queue={queue}
              appearance={preference}
              onAppearance={(mode) =>
                void setPreference(mode).catch(() =>
                  setError("Could not save appearance."),
                )
              }
            />
          )}
          <DriverAssignmentAlerts
            key={`${origin}:${user.id}:${user.branch_id}`}
            api={api}
            user={user}
            origin={origin}
            orders={orders}
            snapshot={snapshot}
            connected={connected}
            revoked={revoked}
            showSettings={page === "profile" && !selected && !historyRow}
            onReview={open}
            onRefresh={refresh}
            selectedOrderId={selected}
          />
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
      </ScreenTransition>
      <NextTabs
        tabs={[
          { label: "Today", screen: "home", icon: "home" },
          { label: "Deliveries", screen: "orders", icon: "truck" },
          { label: "Work", screen: "work", icon: "clipboard-list" },
          { label: "Profile", screen: "profile", icon: "user-round" },
        ]}
        active={
          selected
            ? "orders"
            : ["work", "history", "trip"].includes(page)
              ? "work"
              : page === "home" || page === "orders"
                ? page
                : "profile"
        }
        onNavigate={go}
      />
    </ScreenCanvas>
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
