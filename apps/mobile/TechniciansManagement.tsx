import React, { useEffect, useState, useRef } from "react";
import {
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { View, Pressable } from "./surfaces";
import { Text, TextInput } from "./typography";
import { NativeForm } from "./Workflows";
import { EasyGasLoader } from "./EasyGasLoader";
import { useTheme } from "./theme";
import {
  lagosAppointment,
  type TechnicianWorkspaceData,
  type TechnicianDirectoryRow,
  type TechnicianScheduleRow,
} from "../../packages/business-rules/src/technicians-availability";
import { EasyGasAlert } from "./AppAlert";
import { randomUUID } from "expo-crypto";
type API = (action: string, data?: any) => Promise<any>;
const roles = [
  "owner",
  "service_manager",
  "safety_officer",
  "inventory",
  "finance",
];
const local = (v: string) =>
  new Date(v).toLocaleString("en-GB", { timeZone: "Africa/Lagos" });
export default function TechniciansManagement({
  user,
  api,
}: {
  user: any;
  api: API;
}) {
  const { colors } = useTheme();
  const [data, setData] = useState<TechnicianWorkspaceData | null>(null),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [q, setQ] = useState(""),
    [page, setPage] = useState(1),
    [status, setStatus] = useState("all"),
    [schedulePage, setSchedulePage] = useState(1),
    [refresh, setRefresh] = useState(0),
    [modal, setModal] = useState(""),
    [target, setTarget] = useState<TechnicianDirectoryRow | null>(null),
    [slot, setSlot] = useState<TechnicianScheduleRow | null>(null),
    [busy, setBusy] = useState(false);
  const operations = useRef(new Map<string, string>());
  const allowed = roles.includes(user?.role);
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(query);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);
  useEffect(() => {
    if (!allowed) return;
    let live = true;
    setBusy(true);
    api(
      "technicians.workspace?" +
        new URLSearchParams({
          q,
          status,
          page: String(page),
          schedulePage: String(schedulePage),
        }),
    )
      .then((d) => {
        if (live) {
          setData(d);
          setError("");
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setBusy(false);
      });
    return () => {
      live = false;
    };
  }, [allowed, q, page, status, schedulePage, refresh, user?.id]);
  if (!allowed)
    return (
      <Text accessibilityRole="alert">
        This workspace requires authorised service management access.
      </Text>
    );
  const button = (label: string, press: () => void, disabled = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={press}
      style={[
        s.button,
        { backgroundColor: colors.button, opacity: disabled ? 0.5 : 1 },
      ]}
    >
      <Text style={{ color: colors.onButton }}>{label}</Text>
    </Pressable>
  );
  const close = () => {
      if (
        [
          "invite",
          "availability",
          "verify",
          "block",
          "edit",
          "revoke",
        ].includes(modal)
      )
        EasyGasAlert.alert(
          "Close this form?",
          "Unsaved changes will be discarded. A submitted request may still complete; refresh to confirm its status.",
          [
            { text: "Keep editing", style: "cancel" },
            {
              text: "Close form",
              style: "destructive",
              onPress: () => setModal(""),
            },
          ],
        );
      else setModal("");
    },
    done = () => {
      setModal("");
      setRefresh((n) => n + 1);
    };
  const managedApi: API = async (action, values) => {
    const v = { ...values };
    if (action === "services.slot.create") {
      v.startsAt = lagosAppointment(v.startsAt);
      v.endsAt = lagosAppointment(v.endsAt);
    }
    if (action === "technician.qualify")
      v.expiresAt = lagosAppointment(v.expiresAt);
    if (
      [
        "services.slot.create",
        "services.slot.block",
        "technician.qualify",
        "technician.revoke",
      ].includes(action)
    ) {
      const fingerprint = JSON.stringify([action, v]);
      if (!operations.current.has(fingerprint))
        operations.current.set(fingerprint, randomUUID());
      v.operationKey = operations.current.get(fingerprint);
      const result = await api(action, v);
      operations.current.delete(fingerprint);
      return result;
    }
    return api(action, v);
  };
  return (
    <View style={s.workspace}>
      <Text style={s.heading}>Technicians &amp; Availability</Text>
      <Text>Manage technician qualifications and service availability.</Text>
      {error ? (
        <Text accessibilityRole="alert">
          {error} {data ? "Showing last confirmed records." : ""}
        </Text>
      ) : null}
      {!data ? (
        busy ? (
          <EasyGasLoader />
        ) : (
          button("Try again", () => setRefresh((n) => n + 1))
        )
      ) : (
        <>
          <Text accessibilityLiveRegion="polite">
            {busy
              ? "Updating…"
              : `Updated ${local(data.generatedAt)} · Africa/Lagos`}
          </Text>
          {button("Refresh", () => setRefresh((n) => n + 1), busy)}
          <View style={s.kpis}>
            {[
              ["Total Technicians", data.summary.total],
              ["Active", data.summary.active],
              ["On Assignment", data.summary.onAssignment],
              ["Available Today", data.summary.availableToday],
            ].map(([label, n]) => (
              <View style={[s.kpi, { borderColor: colors.border }]} key={label}>
                <Text>{label}</Text>
                <Text style={s.heading}>{n}</Text>
              </View>
            ))}
          </View>
          {data.permissions.verify &&
            button("Verify qualification", () => {
              setTarget(null);
              setModal("verify");
            })}
          {data.permissions.invite &&
            button("Add Technician", () => setModal("invite"))}
          <View style={s.row}>
            {["all", "active", "inactive"].map((v) => (
              <Pressable
                key={v}
                accessibilityRole="button"
                accessibilityState={{ selected: status === v }}
                onPress={() => {
                  setStatus(v);
                  setPage(1);
                }}
                style={[
                  s.button,
                  { borderWidth: 1, borderColor: colors.border },
                ]}
              >
                <Text>
                  {v === "all" ? "All" : v === "active" ? "Active" : "Inactive"}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            accessibilityLabel="Search technicians by name, ID or skill"
            placeholder="Search name, ID or skill"
            value={query}
            onChangeText={setQuery}
            style={[s.input, { borderColor: colors.border }]}
          />
          {!data.people.length && (
            <Text>No technicians match your search.</Text>
          )}
          {data.people.map((p) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`View ${p.name}`}
              key={p.id}
              onPress={() => {
                setTarget(p);
                setModal("details");
              }}
              style={[s.card, { borderColor: colors.border }]}
            >
              <Text style={s.title}>{p.name}</Text>
              <Text>
                {p.id} · {p.branch_id}
              </Text>
              <Text>
                {p.active
                  ? p.on_assignment
                    ? "On Assignment"
                    : p.available_today
                      ? "Available"
                      : "Not schedulable today"
                  : "Inactive"}
              </Text>
              <Text>
                {p.qualifications.filter((q) => q.verified).length} current
                verified qualifications
              </Text>
            </Pressable>
          ))}
          <View style={s.row}>
            {button("Previous", () => setPage((p) => p - 1), page <= 1 || busy)}
            <Text>Page {page}</Text>
            {button(
              "Next",
              () => setPage((p) => p + 1),
              page * 20 >= data.total || busy,
            )}
          </View>
          <Text style={s.title}>Upcoming Availability</Text>
          {data.permissions.schedule &&
            button("Create availability", () => setModal("availability"))}
          {!data.schedule.length && <Text>No upcoming availability.</Text>}
          {data.schedule.map((v) => (
            <View key={v.id} style={[s.card, { borderColor: colors.border }]}>
              <Text style={s.title}>{v.service_name}</Text>
              <Text>
                {v.technician_name} · {v.branch_id}
              </Text>
              <Text>
                {local(v.starts_at)} – {local(v.ends_at)}
              </Text>
              <Text>
                {v.blocked
                  ? "Blocked"
                  : v.bookings
                    ? "Reserved appointment"
                    : v.eligible
                      ? "Available slot"
                      : "Not eligible for booking"}
              </Text>
              {data.permissions.schedule &&
                button(
                  v.blocked ? "Unblock appointment" : "Block appointment",
                  () => {
                    setSlot(v);
                    setModal("block");
                  },
                )}
            </View>
          ))}
          <View style={s.row}>
            {button(
              "Earlier appointments",
              () => setSchedulePage((p) => p - 1),
              schedulePage <= 1 || busy,
            )}
            {button(
              "Later appointments",
              () => setSchedulePage((p) => p + 1),
              schedulePage * 10 >= data.scheduleTotal || busy,
            )}
          </View>
          <Modal
            visible={!!modal}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={close}
          >
            <KeyboardAvoidingView
              style={{ flex: 1, backgroundColor: colors.background }}
              behavior={Platform.OS === "ios" ? "padding" : undefined}
            >
              <ScrollView
                contentContainerStyle={s.workspace}
                keyboardShouldPersistTaps="handled"
              >
                <Text accessibilityRole="header" style={s.heading}>
                  {modal === "details"
                    ? target?.name
                    : modal === "invite"
                      ? "Add Technician"
                      : modal === "verify"
                        ? "Independent qualification verification"
                        : modal === "block"
                          ? "Manage appointment"
                          : "Create availability"}
                </Text>
                {button("Close", close)}
                {modal === "details" && target ? (
                  <>
                    <Text>
                      {target.id} · {target.branch_id}
                    </Text>
                    <Text>
                      Account {target.active ? "active" : "inactive"} ·
                      Assignment availability{" "}
                      {target.technician_available ? "enabled" : "disabled"}
                    </Text>
                    {target.qualifications.map((v) => (
                      <View key={v.id} style={s.card}>
                        <Text>
                          {v.code.replaceAll("_", " ")} ·{" "}
                          {v.verified
                            ? "Verified"
                            : "Expired or no longer eligible"}
                        </Text>
                        <Text>Expiry {local(v.expires_at)}</Text>
                        {v.evidence && (
                          <Text>Verification reference: {v.evidence}</Text>
                        )}
                      </View>
                    ))}
                    {data.permissions.verify &&
                      target.id !== user.id &&
                      button("Verify qualification", () => setModal("verify"))}
                    {data.permissions.verify &&
                      target.id !== user.id &&
                      button("Revoke qualification", () => setModal("revoke"))}
                    {data.permissions.edit &&
                      button("Edit name", () => setModal("edit"))}
                  </>
                ) : modal === "edit" && target ? (
                  <NativeForm
                    api={api}
                    action="staff.edit"
                    title="Edit technician name"
                    fields={[
                      {
                        name: "userId",
                        label: "Technician",
                        value: target.id,
                        type: "hidden",
                      },
                      { name: "name", label: "Full name", value: target.name },
                      { name: "reason", label: "Reason for change" },
                    ]}
                    onDone={done}
                  />
                ) : modal === "revoke" && target ? (
                  <NativeForm
                    api={managedApi}
                    action="technician.revoke"
                    title="Revoke qualification"
                    fields={[
                      {
                        name: "id",
                        label: "Qualification",
                        options: target.qualifications
                          .filter((q) => q.verified)
                          .map((q) => ({ value: q.id, label: q.code })),
                      },
                      { name: "reason", label: "Reason" },
                    ]}
                    onDone={done}
                  />
                ) : modal === "invite" ? (
                  <>
                    <Text>
                      Invitations grant no technician privilege or
                      qualification. Complete the existing Staff Management
                      access review after acceptance.
                    </Text>
                    <NativeForm
                      api={api}
                      action="staff.invite"
                      title="Invite colleague"
                      fields={[
                        { name: "name", label: "Full name" },
                        { name: "email", label: "Email address" },
                        {
                          name: "branchId",
                          label: "Branch",
                          value: user.branchId || user.branch_id || "lagos",
                          options: data.branches
                            .filter((b) => b.active)
                            .map((b) => ({ value: b.id, label: b.name })),
                        },
                      ]}
                      onDone={done}
                    />
                  </>
                ) : modal === "availability" ? (
                  <>
                    <Text>
                      Enter Africa/Lagos dates as YYYY-MM-DDTHH:mm. A slot does
                      not authorise chargeable work.
                    </Text>
                    <NativeForm
                      api={managedApi}
                      action="services.slot.create"
                      title="New appointment"
                      fields={[
                        {
                          name: "branchId",
                          label: "Branch",
                          type: "hidden",
                          value: user.branchId || user.branch_id || "lagos",
                        },
                        {
                          name: "serviceId",
                          label: "Service",
                          options: data.services
                            .filter((s) => s.config.active)
                            .map((s) => ({ value: s.id, label: s.name })),
                        },
                        {
                          name: "technicianId",
                          label: "Technician from current results",
                          options: data.people
                            .filter((p) => p.active)
                            .map((p) => ({ value: p.id, label: p.name })),
                        },
                        { name: "startsAt", label: "Start (Africa/Lagos)" },
                        { name: "endsAt", label: "End (Africa/Lagos)" },
                      ]}
                      onDone={done}
                    />
                  </>
                ) : modal === "verify" ? (
                  <>
                    <Text>
                      Only independent authorised verification is accepted.
                      Genuine document evidence and identity verification are
                      required.
                    </Text>
                    <NativeForm
                      api={managedApi}
                      action="technician.qualify"
                      title="Record qualification"
                      fields={[
                        {
                          name: "userId",
                          label: "Technician",
                          value: target?.id,
                          options: data.verificationTargets
                            .filter((p) => p.id !== user.id)
                            .map((p) => ({
                              value: p.id,
                              label: p.name + " · " + p.role,
                            })),
                        },
                        { name: "code", label: "Qualification code" },
                        {
                          name: "evidence",
                          label:
                            "Issuer, verification method and document reference",
                        },
                        {
                          name: "expiresAt",
                          label:
                            "Documented expiry, YYYY-MM-DDTHH:mm (Africa/Lagos)",
                        },
                      ]}
                      onDone={done}
                    />
                  </>
                ) : modal === "block" && slot ? (
                  <>
                    <Text>
                      {slot.bookings
                        ? "Reschedule the active booking with the customer before blocking."
                        : "The server checks for bookings again before saving."}
                    </Text>
                    <NativeForm
                      api={managedApi}
                      action="services.slot.block"
                      title={
                        slot.blocked
                          ? "Unblock appointment"
                          : "Block appointment"
                      }
                      fields={[
                        {
                          name: "id",
                          label: "Appointment",
                          value: slot.id,
                          type: "hidden",
                        },
                        {
                          name: "blocked",
                          label: "Blocked",
                          value: !slot.blocked,
                          type: "hidden",
                        },
                        { name: "reason", label: "Reason" },
                      ]}
                      onDone={done}
                    />
                  </>
                ) : null}
                {["invite", "verify", "edit", "revoke"].includes(modal) && (
                  <NativeForm
                    api={api}
                    action="reauth"
                    title="Verify your identity if requested"
                    fields={[
                      {
                        name: "password",
                        label: "Current password",
                        type: "password",
                      },
                    ]}
                  />
                )}
              </ScrollView>
            </KeyboardAvoidingView>
          </Modal>
        </>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  workspace: { padding: 16, gap: 16, paddingBottom: 40 },
  heading: { fontSize: 24, fontWeight: "800" },
  title: { fontSize: 18, fontWeight: "700" },
  button: {
    minHeight: 46,
    padding: 12,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  kpis: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  kpi: { width: "47%", padding: 14, borderRadius: 16, borderWidth: 1, gap: 8 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 48 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
});
