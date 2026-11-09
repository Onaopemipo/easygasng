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
  Alert,
  AppState,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { randomUUID } from "expo-crypto";
import { Text, TextInput } from "./typography";
import { useTheme } from "./theme";
import {
  Button,
  Card,
  Copy,
  Title,
  Feedback,
  money,
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
  const { colors, dark, preference, setPreference } = useTheme();
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
    [notices, setNotices] = useState<any[]>([]),
    [completed, setCompleted] = useState<any>(null);
  const alive = useRef(true),
    appActive = useRef(true),
    keys = useRef(new Map<string, string>());
  const order = orders.find((o) => o.id === selected);
  const response = snapshot?.responses?.find(
    (r: any) => r.order_id === selected,
  )?.decision;
  const activeOrders = orders.filter((o) =>
      ["assigned", "out_for_delivery"].includes(o.status),
    ),
    done = orders.filter((o) => o.status === "delivered");
  async function refresh() {
    const [list, s, me, pending, old] = await Promise.all([
      api("orders"),
      api("driver.snapshot"),
      api("me"),
      fieldQueue(user.id, true),
      loadQueue(user.id),
      api("driver.heartbeat", {}),
    ]);
    if (!alive.current) return;
    setOrders(list);
    setSnapshot(s);
    setNotices(me.notifications);
    setQueue(pending.filter((e) => e.tripId.startsWith("order:")).length);
    setLegacy(old.length);
    setConnected(true);
    setLastContact(new Date().toISOString());
  }
  useEffect(() => {
    alive.current = true;
    let running = false;
    const poll = async () => {
      if (running || !appActive.current) return;
      running = true;
      try {
        await refresh();
      } catch {
        if (alive.current) {
          setConnected(false);
          setError(
            "Connection or session unavailable. Displayed records may be stale. Reconnect to verify assignments.",
          );
        }
      } finally {
        running = false;
      }
    };
    api("driver.restrict", {})
      .then(poll)
      .catch((e) => {
        if (alive.current) setError(e.message);
      });
    Location.getForegroundPermissionsAsync().then((p) => {
      if (alive.current) setPermission(p.granted ? "Granted" : "Not granted");
    });
    const timer = setInterval(poll, 15000);
    const listener = AppState.addEventListener("change", (state) => {
      appActive.current = state === "active";
      if (state === "active") poll();
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
        const owned = await api("orders?id=" + encodeURIComponent(orderId));
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
  function open(o: any) {
    setSelected(o.id);
    setPhase("detail");
    setNotes("");
    setCode("");
    setHandover(false);
    setError("");
  }
  async function run(action: string, input: any) {
    if (!order) return;
    setBusy(true);
    setError("");
    const signature = action + JSON.stringify(input);
    if (!keys.current.has(signature)) keys.current.set(signature, randomUUID());
    const operationKey = keys.current.get(signature)!;
    try {
      await api(action, { ...input, operationKey });
      await refresh();
      if (action === "driver.complete") {
        const current = (await api("orders?id=" + order.id))[0];
        if (current?.status === "delivered") {
          setCompleted(current);
          setPhase("completed");
        }
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
  const heading = selected
    ? phase === "proof"
      ? "Proof of Delivery"
      : phase === "status"
        ? "Update Order Status"
        : phase === "completed"
          ? "Delivery Completed"
          : (order?.reference ?? "Assigned delivery")
    : page === "home"
      ? "EasyGas Driver"
      : page === "history"
        ? "Delivery History"
        : page === "profile"
          ? "My Profile"
          : page === "notices"
            ? "Notifications"
            : "My Orders";
  function orderList(list: any[]) {
    const filtered = list.filter((o) =>
      [o.reference, o.address?.street, o.status]
        .join(" ")
        .toLowerCase()
        .includes(query.toLowerCase()),
    );
    return (
      <>
        <TextInput
          accessibilityLabel="Search assigned orders"
          placeholder="Search reference or address"
          value={query}
          onChangeText={(v) => {
            setQuery(v);
            setLimit(20);
          }}
          style={{
            backgroundColor: colors.input,
            color: colors.text,
            padding: 13,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 13,
          }}
        />
        {!filtered.length && (
          <Card>
            <Copy>
              No matching assignments. Dispatch assigns deliveries through the
              existing system.
            </Copy>
          </Card>
        )}
        {filtered.slice(0, limit).map((o) => (
          <Card key={o.id}>
            <Text
              preserveColor
              style={{ color: colors.text, fontWeight: "800", fontSize: 20 }}
            >
              {o.reference}
            </Text>
            <Copy>
              {o.status.replaceAll("_", " ")} · {o.delivery_date} ·{" "}
              {o.delivery_window}
            </Copy>
            <Copy>
              {o.address?.street}, {o.address?.zone}
            </Copy>
            <Button
              label={
                o.status === "delivered"
                  ? "View delivery history"
                  : "View assignment"
              }
              secondary
              onPress={() => open(o)}
            />
          </Card>
        ))}
        {filtered.length > limit && (
          <Button
            label="Show more assigned records"
            secondary
            onPress={() => setLimit((n) => n + 20)}
          />
        )}
        <Copy>
          Latest100 canonical assignments. Completed records are read-only.
        </Copy>
      </>
    );
  }
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={dark ? "light-content" : "dark-content"} />
      <View
        style={{
          padding: 14,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          borderBottomWidth: 1,
          borderColor: colors.border,
        }}
      >
        {(selected || !tabs.some((t) => t[1] === page)) && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => {
              if (selected && phase !== "detail") {
                setPhase("detail");
                setCompleted(null);
              } else {
                setSelected(null);
                setPage("home");
              }
            }}
            style={{ width: 44, height: 44, justifyContent: "center" }}
          >
            <Ionicons
              accessible={false}
              name="chevron-back"
              size={24}
              color={colors.text}
            />
          </Pressable>
        )}
        <Text
          preserveColor
          style={{
            fontSize: 21,
            fontWeight: "800",
            color: colors.text,
            flex: 1,
          }}
        >
          {heading}
        </Text>
      </View>
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
        <DriverTripTracking api={api} userId={user.id} visible={!selected} />
        {!!snapshot && !selected && (
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
        {!snapshot ? (
          <Card>
            <Image
              source={require("./assets/easygas-logo-hd.png")}
              resizeMode="contain"
              style={{ width: 220, height: 80, alignSelf: "center" }}
            />
            <Title>Driver App</Title>
            <Copy>Restoring your verified delivery-only session…</Copy>
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
                  <Copy>
                    {money(order.total_kobo)} · Payment {order.payment_status}{" "}
                    (read-only)
                  </Copy>
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
                        <Button
                          label="Navigate to Customer"
                          onPress={() =>
                            Linking.openURL(
                              "https://www.google.com/maps/search/?api=1&query=" +
                                encodeURIComponent(
                                  order.address.street +
                                    ", " +
                                    order.address.zone,
                                ),
                            ).catch(() =>
                              setError("Navigation could not be opened."),
                            )
                          }
                        />
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
                          GPS/ETA unavailable. Navigation opens the authorised
                          address, not a simulated tracking map.
                        </Copy>
                      </>
                    )}
                    {order.status === "assigned" && (
                      <>
                        <TextInput
                          accessibilityLabel="Acknowledgement or decline reason"
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
                        {!response && (
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
                      <TextInput
                        accessibilityLabel="Failure evidence and dispatch notes"
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
                      Only verified purchase-credit payments can be completed in
                      this delivery-only app. Contact dispatch for cash/payment
                      review.
                    </Copy>
                    <TextInput
                      accessibilityLabel="Customer six-digit handover code"
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
                      <Copy>All items and full gas quantity handed over</Copy>
                    </View>
                    <Button
                      label="Complete Delivery"
                      disabled={
                        busy ||
                        !handover ||
                        !/^\d{6}$/.test(code) ||
                        !["wallet", "cash_on_delivery"].includes(
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
              style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <View style={{ flex: 1 }}>
                <Copy>Good to see you,</Copy>
                <Title>{user.name}</Title>
              </View>
              <Button
                label={`Notifications (${notices.filter((n) => !n.read_at).length})`}
                secondary
                onPress={() => setPage("notices")}
              />
            </View>
            <Card accent>
              <Image
                source={require("./assets/delivery.png")}
                resizeMode="contain"
                style={{ width: "100%", height: 150 }}
              />
              <Title>
                {snapshot.profile.driver_available
                  ? "Available for Dispatch"
                  : "Not Available for New Assignments"}
              </Title>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <Switch
                  accessibilityLabel="Available for dispatch, independent of internet or GPS"
                  value={snapshot.profile.driver_available}
                  disabled={busy}
                  onValueChange={async (available) => {
                    setBusy(true);
                    try {
                      await api("driver.availability", {
                        available,
                        operationKey: randomUUID(),
                      });
                      await refresh();
                    } catch (e: any) {
                      setError(e.message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
                <Copy>Availability is not internet connectivity.</Copy>
              </View>
            </Card>
            <Copy>
              Backend connection:{" "}
              {connected
                ? "last verified " + new Date(lastContact!).toLocaleTimeString()
                : "unavailable / records stale"}
              . GPS permission: {permission}. Trip recording status appears in
              Trip GPS above.
            </Copy>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {[
                [
                  "New Assignments",
                  orders.filter((o) => o.status === "assigned").length,
                ],
                [
                  "In Progress",
                  orders.filter((o) => o.status === "out_for_delivery").length,
                ],
                ["Completed", done.length],
              ].map(([label, count]) => (
                <Card key={label}>
                  <Text
                    preserveColor
                    style={{
                      fontSize: 24,
                      fontWeight: "800",
                      color: colors.text,
                    }}
                  >
                    {count}
                  </Text>
                  <Copy>{label}</Copy>
                </Card>
              ))}
            </View>
            {activeOrders[0] && (
              <Button
                label={"View next assignment " + activeOrders[0].reference}
                onPress={() => open(activeOrders[0])}
              />
            )}
            <Button
              label="Refresh Assignments"
              secondary
              onPress={() =>
                refresh().catch(() => setError("Connection unavailable."))
              }
            />
          </>
        ) : page === "orders" || page === "history" ? (
          orderList(page === "history" ? done : orders)
        ) : page === "notices" ? (
          <>
            {!notices.length && (
              <Card>
                <Copy>No driver notifications yet.</Copy>
              </Card>
            )}
            {notices.map((n) => (
              <Card key={n.id}>
                <Title>{n.title}</Title>
                <Copy>{n.body}</Copy>
                <Copy>{new Date(n.created_at).toLocaleString()}</Copy>
                {orders.some((o) => o.id === n.related_id) && (
                  <Button
                    label="View assigned order"
                    secondary
                    onPress={() =>
                      open(orders.find((o) => o.id === n.related_id))
                    }
                  />
                )}{" "}
                {!n.read_at && (
                  <Button
                    label="Mark read"
                    secondary
                    onPress={() =>
                      api("notifications.read", { id: n.id })
                        .then(refresh)
                        .catch((e) => setError(e.message))
                    }
                  />
                )}
              </Card>
            ))}
          </>
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
                label: "New password (at least12 characters)",
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
        ) : (
          <>
            <Card>
              <Title>{user.name}</Title>
              <Copy>Driver ID: {user.id}</Copy>
              <Copy>{user.email}</Copy>
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
            <NativeForm
              api={api}
              action="account.update"
              title="Profile information"
              fields={[{ name: "name", label: "Your name", value: user.name }]}
            />
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
                Alert.alert(
                  "Sign out of Driver App?",
                  queue || legacy
                    ? "Encrypted pending records stay on this device and require the same account to reconcile. No offline delivery is confirmed."
                    : "Your session will be revoked.",
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
        {(queue > 0 || legacy > 0) && (
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
              setPhase("detail");
              setPage(dest);
              setQuery("");
              setLimit(20);
            }}
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              minHeight: 56,
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
