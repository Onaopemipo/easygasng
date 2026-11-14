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
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
  assignmentLabel, driverDate, driverHistoryAction, driverNavigation,
  driverOrderAddress, driverOutcomes, type DriverHistory, type DriverHistoryRow,
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
  const headerGreen = "#07592e";
  const { width, fontScale } = useWindowDimensions();
  const [backgroundPermission, setBackgroundPermission] = useState("Not checked");
  const [history, setHistory] = useState<DriverHistory | null>(null);
  const [historyRow, setHistoryRow] = useState<DriverHistoryRow | null>(null);
  const [historyError, setHistoryError] = useState("");
  const [historyFilters, setHistoryFilters] = useState({ from: "", to: "", outcome: "", page: 1 });
  const [historyDraft, setHistoryDraft] = useState({ from: "", to: "", outcome: "" });
  const [showFilters, setShowFilters] = useState(false);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [assignmentFilter, setAssignmentFilter] = useState<"all" | "progress">("all");
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
    [queue, setQueue] = useState(0),
    [legacy, setLegacy] = useState(0),
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
  const order = orders.find((o) => o.id === selected) ?? (phase === "completed" ? completed : null);
  const response = snapshot?.responses?.find(
    (r: any) => r.order_id === selected,
  )?.decision;
  const activeOrders = orders;
  const connectionError = "Connection or session unavailable. Displayed records may be stale. Reconnect to verify assignments.";
  async function refresh() {
    const sequence = ++refreshSequence.current;
    const [list, next, inbox, pending, old] = await Promise.all([
      api("orders?active=1"),
      api("driver.snapshot"),
      api("notifications.list").catch(() => null),
      fieldQueue(user.id, true).catch(() => null),
      loadQueue(user.id).catch(() => null),
      api("driver.heartbeat", {}).catch(() => null),
    ]);
    if (!alive.current || sequence !== refreshSequence.current) return;
    setOrders(list);
    setSnapshot(next);
    if (inbox) setUnread(inbox.unread);
    if (pending) setQueue(pending.filter((e) => e.tripId.startsWith("order:")).length);
    if (old) setLegacy(old.length);
    setConnected(true);
    setError((message) => message === connectionError ? "" : message);
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
        if (alive.current && [401, 403].includes(e.status)) clearRevokedAccess();
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
        const owned = await api("orders?active=1&id=" + encodeURIComponent(orderId));
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
    api(driverHistoryAction(historyFilters)).then((data) => {
      if (current) setHistory(data);
    }).catch((e: any) => {
      if (!current) return;
      if ([401, 403].includes(e.status)) clearRevokedAccess();
      setHistoryError(e.message);
    });
    return () => { current = false; };
  }, [page, connected, revoked, historyFilters, historyRefresh, user.id]);

  function back() {
    if (historyRow) setHistoryRow(null);
    else if (selected && phase !== "detail") {
      setPhase("detail");
      setCompleted(null);
    } else if (selected) setSelected(null);
    else if (showFilters) setShowFilters(false);
    else if (["security", "personal", "trip"].includes(page)) setPage("profile");
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
        setError("The server accepted the update. Reconnect to confirm the latest delivery status.");
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
          setQueue((q) => q + 1);
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
  const heading = historyRow ? "Delivery record" : selected
    ? phase === "proof" ? "Proof of delivery"
      : phase === "status" ? "Update delivery status"
      : phase === "completed" ? "Delivery completed"
      : order?.reference ?? "Assigned delivery"
    : ({ home: "", orders: "Orders", history: "History", profile: "Profile",
        notices: "Notifications", security: "Security", personal: "Personal information",
        support: "Help & support", trip: "Trip & custody" } as Record<string, string>)[page];

  function navigate(destination?: { latitude: unknown; longitude: unknown }) {
    const url = connected && driverNavigation(destination);
    if (url) Linking.openURL(url).catch(() => setError("Navigation could not be opened."));
  }

  function openOrders() {
    setPage("orders");
    setAssignmentFilter("all");
  }

  function orderList() {
    const filtered = activeOrders.filter((o) =>
      (assignmentFilter === "all" || assignmentLabel(o.status, o.attempt?.state,
        snapshot.responses.find((r: any) => r.order_id === o.id)?.decision) !== "Assigned") &&
      [o.reference, o.address?.street, o.customer_name].join(" ").toLowerCase().includes(query.trim().toLowerCase()),
    );
    return (
      <>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Button label={`${assignmentFilter === "all" ? "✓ " : ""}Assigned`} onPress={openOrders} secondary />
          <Button label={`${assignmentFilter === "progress" ? "✓ " : ""}In progress`} onPress={() => setAssignmentFilter("progress")} secondary />
        </View>
        <TextInput
          accessibilityLabel="Search assigned orders" placeholder="Search assigned orders"
          value={query} onChangeText={(value) => { setQuery(value); setLimit(20); }}
          style={{ backgroundColor: colors.input, color: colors.text, padding: 13, minHeight: 48,
            borderWidth: 1, borderColor: colors.border, borderRadius: 14 }}
        />
        {!filtered.length && <Card><Copy>{connected ? "No matching assignments." : "Reconnect to check assigned orders."}</Copy></Card>}
        {filtered.slice(0, limit).map((o) => (
          <Card key={o.id}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8 }}>
              <DriverLabel icon="cube-outline" label={o.reference} />
              <Copy>{assignmentLabel(o.status, o.attempt?.state,
                snapshot.responses.find((r: any) => r.order_id === o.id)?.decision)}</Copy>
            </View>
            {!!o.customer_name && <Copy>{o.customer_name}</Copy>}
            {!!driverOrderAddress(o.address) && <Copy>{driverOrderAddress(o.address)}</Copy>}
            {(o.items ?? []).map((item: any, index: number) => <Copy key={item.id ?? index}>{item.quantity} × {item.name}</Copy>)}
            {(o.gas_lines ?? []).map((line: any, index: number) => <Copy key={line.id ?? index}>{Number(line.grams) / 1000} kg gas</Copy>)}
            <Copy>{[o.delivery_date, o.delivery_window].filter(Boolean).join(" · ")}</Copy>
            {!!o.last_update && <Copy>Updated {driverDate(o.last_update)} WAT</Copy>}
            {connected && driverNavigation(o.destination) && (
              <Button label="Navigate" secondary onPress={() => navigate(o.destination)} />
            )}
            <Button label="Open assignment" onPress={() => open(o)} />
          </Card>
        ))}
        {filtered.length > limit && <Button label="Show more assignments" secondary onPress={() => setLimit((n) => n + 20)} />}
        {activeOrders.length === 100 && <Copy>Showing up to 100 current assignments. Contact dispatch for older assigned records.</Copy>}
      </>
    );
  }

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView edges={["top"]} style={{ backgroundColor: headerGreen, paddingHorizontal: 18, paddingBottom: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 54 }}>
          {(selected || historyRow || !tabs.some((t) => t[1] === page)) && (
            <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={back}
              style={{ width: 48, minHeight: 48, justifyContent: "center" }}>
              <Ionicons accessible={false} name="chevron-back" size={24} color="#fff" />
            </Pressable>
          )}
          <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            <View style={{ backgroundColor: "#fff", borderRadius: 10, paddingHorizontal: 6 }}>
              <Image accessibilityLabel="EasyGas" source={require("./assets/easygas-logo-hd.png")}
                resizeMode="contain" style={{ width: 92, height: 36 }} />
            </View>
            <Text preserveColor style={{ color: "#fff", fontWeight: "700" }}>Driver</Text>
          </View>
          {!!snapshot && <Pressable accessibilityRole="button" accessibilityLabel={unread == null ? "Notifications" : `Notifications, ${unread} unread`}
            style={{ minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" }}
            onPress={() => { setSelected(null); setHistoryRow(null); setPage("notices"); }}>
            <Ionicons name="notifications-outline" size={24} color="#fff" accessible={false} />
            {connected && !!unread && <Text preserveColor style={{ color: "#fff", fontSize: 11 }}>{unread > 99 ? "99+" : unread}</Text>}
          </Pressable>}
          {!!snapshot && <Pressable accessibilityRole="button" accessibilityLabel="Help and support"
            style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center" }}
            onPress={() => { setSelected(null); setHistoryRow(null); setPage("support"); }}>
            <Ionicons name="help-circle-outline" size={26} color="#fff" accessible={false} />
          </Pressable>}
        </View>
        {!!heading && <Text accessibilityRole="header" preserveColor style={{ color: "#fff", fontWeight: "800", fontSize: 27 }}>{heading}</Text>}
        {!selected && !historyRow && page === "orders" && <Text preserveColor style={{ color: "#fff" }}>Manage your assigned deliveries</Text>}
        {!historyRow && page === "history" && <Text preserveColor style={{ color: "#fff" }}>Review closed delivery attempts</Text>}
      </SafeAreaView>
      <ScrollView
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
        {!!snapshot && !revoked && <DriverTripTracking api={api} userId={user.id} visible={page === "trip" && !selected} />}
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
          <Card><Title>Driver access unavailable</Title><Copy>Sign in again or contact dispatch to confirm your access.</Copy>
            <Button label="Sign out" secondary onPress={() => { void logout().catch(() => setError("Sign-out needs review.")); }} />
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
            <Copy>{driverOutcomes[historyRow.outcome]} · {driverDate(historyRow.closed_at)} WAT</Copy>
            {connected && historyRow.has_proof && <DriverPhotoHistory api={api} orderId={historyRow.order_id}
              attemptId={historyRow.id} origin={origin} token={token} />}
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
                    ? new Date(completed.delivered_at).toLocaleString()
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
                        <Copy>{new Date(e.created_at).toLocaleString()}</Copy>
                      </View>
                    ))}
                    {activeOrders.some((o) => o.id === order.id) && (
                      <>
                        {connected && driverNavigation(order.destination) && (
                          <Button label="Navigate to confirmed destination" onPress={() => navigate(order.destination)} />
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
                        <FieldCaption required={true}>Acknowledgement or decline reason</FieldCaption>
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
                        {!response && !order.assignment_response_open && <Copy>Ask dispatch to renew this assignment before responding.</Copy>}
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
                      <FieldCaption required={true}>Failure evidence and dispatch notes</FieldCaption>
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
                      onQueued={() => setQueue((n) => n + 1)}
                    />
                    <Button
                      label="Synchronise Encrypted Proof"
                      disabled={busy}
                      secondary
                      onPress={sync}
                    />
                    <Copy>
                      Completion requires a verified payment. Contact dispatch for payment review.
                    </Copy>
                    <FieldCaption required={true}>Customer six-digit handover code</FieldCaption>
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
                        accessibilityLabel="All items physically handed over"
                        value={handover}
                        onValueChange={setHandover}
                      />
                      <FieldCaption required={true}>All items and full gas quantity handed over</FieldCaption>
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
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 }}>
              <View style={{ backgroundColor: colors.elevated, padding: 12, borderRadius: 32 }}>
                <Ionicons accessible={false} name="car-outline" size={26} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}><Copy>Good to see you,</Copy><Title>{snapshot.profile.name}</Title></View>
            </View>
            <Card accent>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ flex: 1, gap: 6 }}>
              <DriverLabel icon="car-outline" label={snapshot.profile.driver_available
                ? "Available for dispatch" : "Unavailable for dispatch"} />
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, minHeight: 48 }}>
                <View style={{ flex: 1 }}><Copy>{snapshot.profile.driver_available ? "Ready for new assignments." : "New assignments are paused."}</Copy></View>
                <Switch
                  accessibilityLabel="Available for dispatch"
                  value={snapshot.profile.driver_available}
                  disabled={busy || !connected}
                  onValueChange={async (available) => {
                    if (actionBusy.current) return;
                    actionBusy.current = true;
                    setBusy(true);
                    setError("");
                    try {
                      const result = await api("driver.availability", { available, operationKey: randomUUID() });
                      ++refreshSequence.current;
                      setSnapshot((old: any) => old ? { ...old, profile: { ...old.profile, driver_available: result.available } } : old);
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
                </View>
                {width >= 360 && fontScale < 1.3 && <Image
                  source={require("./assets/delivery.png")} accessible={false} resizeMode="cover"
                  style={{ width: Math.min(112, width * 0.25), height: 98, borderRadius: 14 }} />}
              </View>
            </Card>
            <Card>
              <DriverLabel icon="wifi-outline" label={connected ? "Backend connected" : "Connection unconfirmed"} />
              {lastContact && <Copy>Last confirmed {driverDate(lastContact)} WAT</Copy>}
              <Copy>GPS permission · {permission}</Copy>
              <Copy>Trip location consent · {connected ? snapshot.trip ? snapshot.trip.location_consent ? "Granted for this trip" : "Off" : "No active trip" : "Unavailable"}</Copy>
            </Card>
            <Card>
              <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <DriverLabel icon="stats-chart-outline" label="At a glance" />
                <Button label="View history" secondary onPress={() => setPage("history")} />
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {[
                  ["New assignments", snapshot.metrics?.newAssignments],
                  ["In progress", snapshot.metrics?.inProgress],
                  ["Completed today", snapshot.metrics?.completedToday],
                ].map(([label, count]) => (
                  <View key={label} style={{ flexGrow: 1, flexBasis: 86, padding: 9, backgroundColor: colors.elevated, borderRadius: 12 }}>
                    <Title>{connected ? count ?? "—" : "—"}</Title><Copy>{label}</Copy>
                  </View>
                ))}
              </View>
            </Card>
            {activeOrders[0] && <Card>
              <DriverLabel icon="cube-outline" label="Next assignment" />
              <Copy>{activeOrders[0].reference}</Copy>
              <Button label="Open next assignment" onPress={() => { openOrders(); open(activeOrders[0]); }} />
            </Card>}
            <Card>
              <DriverLabel icon="flash-outline" label="Quick actions" />
              <Button label="Open assigned orders" secondary onPress={openOrders} />
              {connected && driverNavigation(activeOrders[0]?.destination) && <Button label="Navigate to next delivery" secondary onPress={() => navigate(activeOrders[0].destination)} />}
              <Button label="Trip & custody" secondary onPress={() => setPage("trip")} />
              <Button label="Contact dispatch support" secondary onPress={() => setPage("support")} />
            </Card>
          </>
        ) : page === "orders" ? orderList() : page === "history" ? (
          <>
            <Button label={showFilters ? "Close filters" : "Filter history"} secondary onPress={() => setShowFilters((value) => !value)} />
            {showFilters && <Card>
              {(["from", "to"] as const).map((field) => (
                <View key={field} style={{ gap: 6 }}>
                  <Copy>{field === "from" ? "Start date" : "End date"} · YYYY-MM-DD</Copy>
                  <TextInput accessibilityLabel={field === "from" ? "Start date" : "End date"} value={historyDraft[field]}
                    placeholder="YYYY-MM-DD" onChangeText={(value) => setHistoryDraft((draft) => ({ ...draft, [field]: value }))}
                    style={{ minHeight: 48, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 12 }} />
                </View>
              ))}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {[["", "All outcomes"], ...Object.entries(driverOutcomes)].map(([value, label]) => (
                  <Button key={value} label={(historyDraft.outcome === value ? "✓ " : "") + label} secondary
                    onPress={() => setHistoryDraft((draft) => ({ ...draft, outcome: value }))} />
                ))}
              </View>
              <Button label="Apply filters" onPress={() => {
                setHistoryFilters({ ...historyDraft, page: 1 }); setShowFilters(false);
              }} />
            </Card>}
            {historyError && <Feedback error={historyError} retry={() => setHistoryRefresh((value) => value + 1)} />}
            {!connected ? <Copy>Reconnect to confirm delivery history.</Copy> : history ? (
              <>
                <Card accent><DriverLabel icon="checkmark-circle-outline" label={`${history.delivered} completed deliveries in this period`} /></Card>
                {!history.rows.length && <Card><Copy>No closed deliveries match these filters.</Copy></Card>}
                {history.rows.map((row) => (
                  <Pressable key={row.id} accessibilityRole="button"
                    accessibilityLabel={`${row.reference}, ${driverOutcomes[row.outcome]}`} onPress={() => setHistoryRow(row)}>
                    <Card><DriverLabel icon="cube-outline" label={row.reference} />
                      <Copy>{driverOutcomes[row.outcome]} · {driverDate(row.closed_at)} WAT</Copy>
                    </Card>
                  </Pressable>
                ))}
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                  <Button label="Previous" secondary disabled={history.page <= 1} onPress={() => setHistoryFilters((old) => ({ ...old, page: old.page - 1 }))} />
                  <Copy>Page {history.page}</Copy>
                  <Button label="Next" secondary disabled={history.page * history.pageSize >= history.total} onPress={() => setHistoryFilters((old) => ({ ...old, page: old.page + 1 }))} />
                </View>
              </>
            ) : !historyError && <Feedback loading />}
          </>
        ) : page === "notices" ? (
          <CustomerNotifications
            api={api}
            onUnreadCount={setUnread}
            relatedAction={(id) => {
              const assigned = orders.find((order) => order.id === id);
              return assigned ? { label: "View assigned order", open: () => open(assigned) } : undefined;
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
          <NativeForm api={api} action="account.update" title="Edit your name"
            fields={[{ name: "name", label: "Your name", value: snapshot.profile.name }]}
            onDone={() => { setPage("profile"); void refresh().catch(() => setConnected(false)); }} />
        ) : page === "trip" ? null : (
          <>
            <Card>
              <DriverLabel icon="person-circle-outline" label={snapshot.profile.name} />
              <Copy>Driver · {snapshot.profile.branch_name}</Copy>
              <Copy>{snapshot.profile.email}</Copy>
              <Copy>
                {snapshot.profile.contact_phone ??
                  "No verified contact phone recorded"}
              </Copy>
              <Copy>
                Availability:{" "}
                {snapshot.profile.driver_available
                  ? "Available"
                  : "Unavailable"}
              </Copy>
            </Card>
            <Card>
              <DriverLabel icon="id-card-outline" label="Driver details" />
              <Button label="Edit personal information" secondary onPress={() => setPage("personal")} />
              <Copy>{connected && snapshot.trip
                && snapshot.trip.vehicle_label
                ? `Current trip vehicle · ${snapshot.trip.vehicle_label} · ${Number(snapshot.trip.capacity_grams) / 1000} kg capacity`
                : "No confirmed trip vehicle."}</Copy>
            </Card>
            <Card>
              <DriverLabel icon="navigate-outline" label="Location & sync" />
              <Copy>Foreground · {permission} · Background · {backgroundPermission}</Copy>
              <Copy>{queue} encrypted delivery updates pending</Copy>
              {lastSync && <Copy>Last confirmed sync {driverDate(lastSync)} WAT</Copy>}
              <Button label="Open device location settings" secondary onPress={() => { void Linking.openSettings().catch(() => setError("Device settings could not be opened.")); }} />
              <Button label="Trip location consent and custody" secondary onPress={() => setPage("trip")} />
            </Card>
            <Button
              label="Notifications"
              secondary
              onPress={() => setPage("notices")}
            />
            <Button
              label="Change Password"
              secondary
              onPress={() => setPage("security")}
            />
            <Button
              label="Help & Support"
              secondary
              onPress={() => setPage("support")}
            />
            {(["light", "dark", "system"] as const).map((mode) => (
              <Button
                key={mode}
                label={(preference === mode ? "✓ " : "") + mode + " appearance"}
                secondary
                onPress={() =>
                  setPreference(mode).catch(() =>
                    setError("Could not save appearance."),
                  )
                }
              />
            ))}
            <Button
              label="Sign Out"
              secondary
              onPress={() =>
                EasyGasAlert.alert(
                  "Sign out of Driver App?",
                  queue || legacy
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
        {!revoked && (queue > 0 || legacy > 0) && (
          <Card>
            <Title>Pending Sync</Title>
            <Copy>
              {queue} encrypted field records. {legacy} legacy completion
              records require dispatch review; this app never replays cash
              collection.
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
        }}
      >
        {tabs.map(([label, dest, icon]) => (
          <Pressable
            key={dest}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: page === dest && !selected }}
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
              backgroundColor: page === dest ? colors.elevated : colors.surface,
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

function DriverLabel({ icon, label }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string }) {
  const { colors } = useTheme();
  return <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 }}>
    <Ionicons name={icon} color={colors.primary} size={22} accessible={false} />
    <Text preserveColor style={{ color: colors.text, fontWeight: "800", fontSize: 17, flexShrink: 1 }}>{label}</Text>
  </View>;
}
