import { EasyGasAlert } from "./AppAlert";
import { technicianPending, syncTechnicianFieldQueue } from "./field-queue";
import { photoUploader } from "./DriverPhoto";
import React, { useState, useEffect, useRef } from "react";
import {
  ScrollView,
  View,
  Pressable,
  Linking,
  StatusBar,
  AppState,
  BackHandler,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { randomUUID } from "expo-crypto";
import { Text } from "./typography";
import { useTheme } from "./theme";
import {
  Card,
  Copy,
  Title,
  Button,
  Feedback,
  type CustomerAPI,
} from "./CustomerUI";
import { TechnicianBrandHeader, TechnicianScreens } from "./TechnicianScreens";
import { Appointment } from "./Services";
import { NativeForm } from "./Workflows";
const tabs = [
  ["Home", "home", "home-outline"],
  ["Jobs", "jobs", "briefcase-outline"],
  ["History", "history", "time-outline"],
  ["Profile", "profile", "person-outline"],
];
const lagos = (v: string) =>
  new Date(v).toLocaleString("en-NG", { timeZone: "Africa/Lagos" });
export default function TechnicianWorkspace({
  user,
  api,
  origin,
  token,
  logout,
}: {
  user: any;
  api: CustomerAPI;
  origin: string;
  token: string | null;
  logout: () => Promise<void>;
}) {
  const { colors, dark, preference, setPreference } = useTheme();
  const [page, setPage] = useState("home"),
    [bookings, setBookings] = useState<any[]>([]),
    [profile, setProfile] = useState<any>(null),
    [selected, setSelected] = useState<string | null>(null),
    [stage, setStage] = useState("details"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [notifications, setNotifications] = useState<any[]>([]),
    [stamp, setStamp] = useState("");
  const [connected, setConnected] = useState(false);
  const [pending, setPending] = useState<any[]>([]),
    [queueMessage, setQueueMessage] = useState("");
  async function loadPending() {
    const records = await technicianPending(user.id);
    if (alive.current) setPending(records);
  }
  async function reconcilePending() {
    setBusy(true);
    setQueueMessage("");
    try {
      const r = await syncTechnicianFieldQueue(
        user.id,
        api,
        photoUploader(origin, token),
      );
      await loadPending();
      await refresh();
      setQueueMessage(
        r.conflicts[0] ??
          `${r.sent} retained record(s) confirmed by the server.`,
      );
    } catch (e: any) {
      setQueueMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  const [entryFilter, setEntryFilter] = useState("all");
  const [entryRange, setEntryRange] = useState("30");
  const alive = useRef(true),
    refreshGeneration = useRef(0);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      refreshGeneration.current++;
    };
  }, []);
  function back() {
    if (selected) {
      if (stage !== "details") setStage("details");
      else setSelected(null);
    } else
      navigate(
        [
          "personal",
          "availability",
          "skills",
          "preferences",
          "appearance",
          "password",
          "support",
        ].includes(page)
          ? "profile"
          : "home",
      );
  }
  const availabilityOperation = useRef<{ target: boolean; key: string } | null>(
    null,
  );
  function navigate(dest: string, filter = "all", range = "30") {
    setSelected(null);
    setPage(dest);
    setEntryFilter(filter);
    setEntryRange(range);
    setError("");
  }
  async function openJob(id: string, intent?: string) {
    const rows = await api("bookings?id=" + encodeURIComponent(id));
    if (!alive.current) return;
    const job = rows.find((b: any) => b.id === id);
    if (!job) throw new Error("This assignment is no longer accessible.");
    setBookings((old) => [...old.filter((b) => b.id !== id), job]);
    setSelected(id);
    setStage(intent ?? "details");
  }
  async function availability(value: boolean) {
    if (busy || !connected) return;
    setBusy(true);
    if (availabilityOperation.current?.target !== value)
      availabilityOperation.current = { target: value, key: randomUUID() };
    try {
      await api("technician.availability", {
        available: value,
        operationKey: availabilityOperation.current.key,
      });
      await refresh();
      availabilityOperation.current = null;
      setError("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function signout() {
    EasyGasAlert.alert(
      "Sign out?",
      "Some service photos or reports may not have synced yet. Keep working to review your jobs, or sign out and return with this same account to sync them.",
      [
        { text: "Keep working", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: () => logout().catch((e) => setError(e.message)),
        },
      ],
    );
  }
  useEffect(() => {
    const back = BackHandler.addEventListener("hardwareBackPress", () => {
      if (selected) {
        if (stage !== "details") setStage("details");
        else setSelected(null);
        return true;
      }
      if (page !== "home") {
        navigate("home");
        return true;
      }
      return false;
    });
    return () => back.remove();
  }, [selected, stage, page]);
  const current = bookings.find((b) => b.id === selected);
  async function refresh() {
    await loadPending().catch((e) => setQueueMessage(e.message));
    const generation = ++refreshGeneration.current;
    try {
      const [s, me, detail] = await Promise.all([
        api("technician.snapshot"),
        api("me"),
        selected
          ? api("bookings?id=" + encodeURIComponent(selected))
          : Promise.resolve(null),
      ]);
      if (!alive.current || generation !== refreshGeneration.current) return;
      if (detail) setBookings(detail);
      setProfile(s);
      setNotifications(me.notifications);
      setStamp(new Date().toISOString());
      setConnected(true);
      setError("");
    } catch (e: any) {
      if (!alive.current || generation !== refreshGeneration.current) return;
      if ([401, 403].includes(e.status)) {
        setBookings([]);
        setProfile(null);
        setNotifications([]);
      }
      setConnected(false);
      throw e;
    }
  }
  useEffect(() => {
    const tick = () => refresh().catch((e) => setError(e.message));
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void tick();
    }, 30000);
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") void tick();
    });
    return () => {
      clearInterval(timer);
      listener.remove();
    };
  }, [selected, user.id]);

  useEffect(() => {
    let active = true;
    api("technician.restrict", {})
      .then(refresh)
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
      setBookings([]);
      setProfile(null);
    };
  }, [user.id]);
  const open = (b: any) => {
    setSelected(b.id);
    setStage("details");
    setError("");
  };
  useEffect(() => {
    let mounted = true;
    async function handle(url: string) {
      if (!url.startsWith("easygas-technician://")) return;
      try {
        const link = new URL(url);
        const bid = link.searchParams.get("bookingId");
        if (link.hostname !== "jobs" || !bid || !/^[a-f0-9-]{36}$/i.test(bid))
          throw new Error("Invalid technician job link.");
        await api("technician.restrict", {});
        const latest = await api("bookings?id=" + encodeURIComponent(bid));
        const job = latest.find((b: any) => b.id === bid);
        if (!job)
          throw new Error("This job is no longer accessible to your account.");
        if (mounted) {
          setBookings(latest);
          open(job);
        }
      } catch (e: any) {
        if (mounted) setError(e.message);
      }
    }
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
  const title = selected
    ? stage === "details"
      ? "Job Details"
      : stage === "assessment"
        ? "Assessment Visit"
        : stage === "workflow"
          ? "Service Workflow"
          : stage
    : page === "home"
      ? "EasyGas Technician"
      : page === "jobs"
        ? "My Jobs"
        : page === "history"
          ? "Service History"
          : page === "profile"
            ? "My Profile"
            : page === "notifications"
              ? "Notifications"
              : page === "password"
                ? "Change Password"
                : ((
                    {
                      personal: "Personal Information",
                      availability: "Availability",
                      skills: "Skills & Services",
                      preferences: "Notification Preferences",
                      appearance: "Appearance",
                      "photo-picker": "Take Service Photo",
                      "report-picker": "Create Service Report",
                    } as Record<string, string>
                  )[page] ?? "Help & Support");
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={dark ? "light-content" : "dark-content"} />
      {!selected && tabs.some((t) => t[1] === page) ? (
        <TechnicianBrandHeader
          user={{ ...user, ...profile?.profile }}
          unread={profile?.unreadNotifications ?? 0}
          navigate={navigate}
        />
      ) : (
        <View
          style={{
            flexDirection: "row",
            padding: 14,
            gap: 12,
            alignItems: "center",
            borderBottomWidth: 1,
            borderColor: colors.border,
          }}
        >
          {(selected || !tabs.some((t) => t[1] === page)) && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={back}
              style={{ width: 44, minHeight: 44, justifyContent: "center" }}
            >
              <Ionicons
                accessible={false}
                name="chevron-back"
                size={25}
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
            {title}
          </Text>
        </View>
      )}
      <ScrollView
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 16,
          gap: 14,
          maxWidth: 760,
          width: "100%",
          alignSelf: "center",
          paddingBottom: 35,
        }}
      >
        <Feedback
          error={error}
          retry={() => refresh().catch((e) => setError(e.message))}
        />
        {!!pending.length && (
          <Card>
            <Title>Pending service records: {pending.length}</Title>
            <Copy>
              Encrypted on this device. Pending evidence does not confirm work,
              upload or completion. Changed assignments or scope require
              operations review.
            </Copy>
            {pending.slice(0, 10).map((e) => (
              <Copy key={e.id}>
                {e.kind === "photo" ? "Service photograph" : "Service draft"} ·{" "}
                {e.syncState ?? "Pending Sync"}
              </Copy>
            ))}
            <Button
              label="Reconcile pending service records"
              disabled={busy || !connected}
              onPress={reconcilePending}
            />
          </Card>
        )}
        {!!queueMessage && <Copy>{queueMessage}</Copy>}
        {!profile ? (
          <Card>
            <Copy>Loading your verified technician workspace…</Copy>
          </Card>
        ) : selected && !current ? (
          <Card>
            <Copy>
              This job is no longer accessible. Refresh and contact operations.
            </Copy>
          </Card>
        ) : selected && current ? (
          <>
            {stage === "details" ? (
              <>
                <Card>
                  <Title>{current.reference}</Title>
                  <Copy>{current.snapshot.name}</Copy>
                  <Copy>
                    {lagos(current.starts_at)} – {lagos(current.ends_at)}
                  </Copy>
                  <Copy>
                    {current.address.street}, {current.address.zone}
                  </Copy>
                  <Copy>{current.equipment.concerns}</Copy>
                  <Copy>
                    Work phase: {current.work_phase}. Verified payment due:{" "}
                    {current.billing.dueKobo === null
                      ? "Quotation required"
                      : "₦" +
                        (current.billing.dueKobo / 100).toLocaleString("en-NG")}
                  </Copy>
                  <Copy>
                    Arrival authorises assessment only. Chargeable service
                    requires independent quotation approval, customer acceptance
                    and verified payment.
                  </Copy>
                </Card>
                <Button
                  label="View on Map"
                  secondary
                  onPress={() =>
                    Linking.openURL(
                      "https://www.google.com/maps/search/?api=1&query=" +
                        encodeURIComponent(
                          current.address.street + ", " + current.address.zone,
                        ),
                    ).catch(() => setError("Navigation unavailable."))
                  }
                />
                {/^\+?[0-9]{10,15}$/.test(current.address.phone) && (
                  <Button
                    label="Call Customer"
                    secondary
                    onPress={() =>
                      Linking.openURL("tel:" + current.address.phone).catch(
                        () => setError("Calling unavailable."),
                      )
                    }
                  />
                )}
                {current.events.map((e: any, i: number) => (
                  <View
                    key={i}
                    style={{
                      borderLeftWidth: 2,
                      borderColor: colors.primary,
                      padding: 10,
                    }}
                  >
                    <Copy>
                      {e.status.replaceAll("_", " ")} · {lagos(e.created_at)}
                    </Copy>
                    <Copy>{e.note}</Copy>
                  </View>
                ))}
                {!["completed", "cancelled", "failed"].includes(
                  current.status,
                ) && (
                  <>
                    {current.status === "assigned" &&
                      current.assignment_response === "pending" && (
                        <NativeForm
                          api={(_, v) =>
                            api("booking.assignment.respond", {
                              ...v,
                              bookingId: current.id,
                              version: current.version,
                            })
                          }
                          action="booking.assignment.respond"
                          title="Respond to Assigned Job"
                          fields={[
                            {
                              name: "decision",
                              label: "Assignment response",
                              options: [
                                {
                                  value: "acknowledged",
                                  label: "Accept assignment",
                                },
                                {
                                  value: "declined",
                                  label: "Decline and notify operations",
                                },
                              ],
                            },
                            {
                              name: "reason",
                              label: "Response reason for operations",
                            },
                          ]}
                          onDone={() =>
                            refresh().catch((e) => setError(e.message))
                          }
                        />
                      )}
                    {current.assignment_response === "declined" && (
                      <Copy>
                        Declined: operations must review and reassign this
                        appointment.
                      </Copy>
                    )}
                    <Button
                      label="Assessment & Findings"
                      onPress={() => setStage("assessment")}
                    />
                    <Button
                      label="Quotations & Work Authorisation"
                      secondary
                      onPress={() => setStage("workflow")}
                    />
                    <Button
                      label="Service Checklist"
                      secondary
                      onPress={() => setStage("Service Checklist")}
                    />
                    <Button
                      label="Parts & Materials"
                      secondary
                      onPress={() => setStage("Parts & Materials")}
                    />
                    <Button
                      label="Proof of Service"
                      secondary
                      onPress={() => setStage("Proof of Service")}
                    />
                  </>
                )}
                {current.report && (
                  <Card>
                    <Title>Recorded Service Report</Title>
                    <Copy>{current.report.outcome}</Copy>
                    <Copy>{current.report.body.findings}</Copy>
                    <Copy>
                      {current.status === "completed"
                        ? "Customer-confirmed completed service"
                        : "Awaiting the canonical review/acknowledgement process"}
                    </Copy>
                  </Card>
                )}
              </>
            ) : stage === "assessment" ? (
              <>
                <Copy>
                  Record findings without claiming authorisation to perform
                  chargeable work. Unsafe findings must go to operations for
                  review.
                </Copy>
                <NativeForm
                  api={(_, v) =>
                    api("booking.assessment.save", {
                      bookingId: current.id,
                      version: current.version,
                      reason: v.reason,
                      operationKey: randomUUID(),
                    })
                  }
                  action="booking.assessment.save"
                  title="Save Assessment Findings"
                  fields={[
                    {
                      name: "reason",
                      label:
                        "Equipment, fault, observations, safety concerns and recommended follow-up",
                    },
                  ]}
                  onDone={() => {
                    refresh().catch((e) => setError(e.message));
                    setStage("details");
                  }}
                />
                <Button
                  label="Open Existing Assessment / Quote Workflow"
                  secondary
                  onPress={() => setStage("workflow")}
                />
              </>
            ) : (
              <Appointment
                b={current}
                user={{ ...user, technician_service_only: true }}
                api={api}
                token={token}
                apiUrl={origin}
                done={() => refresh().catch((e) => setError(e.message))}
              />
            )}
          </>
        ) : !["notifications", "password", "support"].includes(page) ? (
          <TechnicianScreens
            page={page}
            user={user}
            profile={profile}
            api={api}
            navigate={navigate}
            openJob={openJob}
            connected={connected}
            stamp={stamp}
            busy={busy}
            availability={availability}
            refresh={refresh}
            signout={signout}
            entryFilter={entryFilter}
            entryRange={entryRange}
          />
        ) : page === "notifications" ? (
          <>
            {notifications.map((n) => (
              <Card key={n.id}>
                <Title>{n.title}</Title>
                <Copy>{n.body}</Copy>
                <Copy>{lagos(n.created_at)}</Copy>
                {bookings.some((b) => b.id === n.related_id) && (
                  <Button
                    label="Open Assigned Job"
                    onPress={() =>
                      open(bookings.find((b) => b.id === n.related_id))
                    }
                  />
                )}{" "}
                {!n.read_at && (
                  <Button
                    label="Mark Read"
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
            {!notifications.length && <Copy>No notifications yet.</Copy>}
          </>
        ) : page === "password" ? (
          <NativeForm
            api={api}
            action="account.password"
            title="Change Password"
            fields={[
              {
                name: "currentPassword",
                label: "Current password",
                type: "password",
              },
              { name: "newPassword", label: "New password", type: "password" },
            ]}
          />
        ) : page === "support" ? (
          <NativeForm
            api={api}
            action="support.create"
            title="Contact Service Operations"
            fields={[
              { name: "subject", label: "Subject" },
              {
                name: "message",
                label: "Describe the issue and safe next step",
              },
            ]}
          />
        ) : null}
      </ScrollView>
      <View
        style={{
          flexDirection: "row",
          padding: 8,
          borderTopWidth: 1,
          borderColor: colors.border,
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
              setPage(dest);
            }}
            style={{
              flex: 1,
              minHeight: 64,
              borderRadius: 18,
              backgroundColor:
                page === dest && !selected ? colors.elevated : "transparent",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons
              accessible={false}
              name={icon as any}
              size={24}
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
