import React, { useState } from "react";
import { View, Pressable, Switch } from "react-native";
import {
  NextIntro,
  NextText,
  NextCard,
  NextList,
  NextRow,
  NextButton,
  NextIcon,
  initials,
  type NextIconName,
} from "./MobileNextUI";
import { useTheme } from "./theme";
import { ContextSheet } from "./ContextSheet";
type Navigate = (screen: string, filter?: string, range?: string) => void;
export function FieldNextHome({
  role,
  data,
  navigate,
  connected,
}: {
  role: "driver" | "technician";
  data: any;
  navigate: Navigate;
  connected: boolean;
}) {
  const { colors } = useTheme(),
    driver = role === "driver";
  return (
    <View style={{ gap: 20 }}>
      <NextIntro
        eyebrow={(
          data.profile?.branch_name ||
          data.profile?.branch_id ||
          "YOUR BRANCH"
        ).toUpperCase()}
        title={driver ? "Ready for the road?" : "Your work, in view."}
        detail={driver ? "Driver workspace" : "Technician workspace"}
      />
      <View
        style={{
          padding: 25,
          borderRadius: 24,
          backgroundColor: colors.elevated,
          gap: 16,
        }}
      >
        <NextText kind="eyebrow" style={{ color: colors.muted }}>
          YOUR NEXT PRIORITY
        </NextText>
        <NextText kind="title" style={{ fontSize: 28, lineHeight: 33 }}>
          {driver
            ? "Trip & delivery readiness"
            : "Appointments & work authority"}
        </NextText>
        <NextText style={{ color: colors.muted }}>
          {driver
            ? "Start a suitable vehicle trip before collecting orders."
            : "Review the scope and approval before starting work."}
        </NextText>
        <NextButton
          label="Open today’s work"
          onPress={() => navigate("work")}
        />
      </View>
      <View style={{ flexDirection: "row", gap: 12 }}>
        {(driver
          ? [
              [data.metrics?.newAssignments, "New assignments"],
              [data.metrics?.inProgress, "In progress"],
            ]
          : [
              [data.summary?.assigned, "Assigned jobs"],
              [data.summary?.upcoming, "Upcoming"],
            ]
        ).map(([n, label]) => (
          <NextCard key={label} style={{ flex: 1, padding: 18 }}>
            <NextText kind="title">
              {connected && Number.isFinite(n) ? String(n) : "—"}
            </NextText>
            <NextText kind="small" style={{ color: colors.muted }}>
              {label}
            </NextText>
          </NextCard>
        ))}
      </View>
      <NextText kind="heading">Your workspaces</NextText>
      <NextList>
        <NextRow
          title={driver ? "Driver workspace" : "Technician workspace"}
          detail={
            driver
              ? "Trip, assignments, handover and returns"
              : "Appointments, work authority and completion"
          }
          icon={driver ? "truck" : "wrench"}
          onPress={() => navigate("work")}
        />
        <NextRow
          title="Governance and incidents"
          detail="Contact operations and report an issue"
          icon="shield-check"
          onPress={() => navigate("support")}
        />
        <NextRow
          title="Global navigation and appearance"
          icon="moon"
          onPress={() => navigate("profile")}
        />
      </NextList>
    </View>
  );
}
export function FieldNextWork({
  role,
  navigate,
  data,
  connected,
  availability,
  onAvailability,
}: {
  role: "driver" | "technician";
  navigate: Navigate;
  data: any;
  connected: boolean;
  availability: boolean;
  onAvailability: (value: boolean) => void;
}) {
  const { colors } = useTheme(),
    [view, setView] = useState("Overview"),
    [sheet, setSheet] = useState<string | null>(null),
    driver = role === "driver";
  const overview = driver
    ? [
        ["Home, Orders, History and Profile", "home"],
        ["Availability", "availability"],
        ["Connection state", "connection"],
        ["Vehicle and odometer", "trip"],
        ["Start trip", "trip"],
        ["Assignment acknowledgement", "orders"],
        ["Inspected pickup", "orders"],
        ["Travel and arrival", "orders"],
        ["Metered dispensing", "trip"],
        ["Customer code", "orders"],
        ["Proof and cash", "orders"],
        ["Failed delivery", "orders"],
        ["Returns and end trip", "trip"],
      ]
    : [
        ["Home, Jobs, History and Profile", "home"],
        ["Availability", "availability"],
        ["Assignment response", "jobs"],
        ["Assessment and findings", "jobs"],
        ["Approved scope and work authority", "jobs"],
        ["Start authorised work", "jobs"],
        ["Parts and materials", "jobs"],
        ["Proof and completion", "jobs"],
        ["History and customer acknowledgement", "history"],
        ["Safety incidents", "support"],
        ["Skills and qualifications", "skills"],
      ];
  const actions = driver
    ? [
        ["Set availability", "availability"],
        ["Start a trip", "trip"],
        ["Acknowledge assignment", "orders"],
        ["Record inspected pickup", "orders"],
        ["Record arrival", "orders"],
        ["Record location and fuel", "trip"],
        ["Acknowledge bulk load", "trip"],
        ["Record metered dispensing", "trip"],
        ["Complete handover", "orders"],
        ["Report failed delivery", "orders"],
        ["Declare returned custody", "trip"],
        ["End reconciled trip", "trip"],
      ]
    : [
        ["Set availability preference", "availability"],
        ["Respond to assignment", "jobs"],
        ["Save assessment", "jobs"],
        ["Start authorised work", "jobs"],
        ["Record material usage", "jobs"],
        ["Return unused material", "jobs"],
        ["Submit completion report", "jobs"],
        ["Report safety incident", "support"],
      ];
  function open(dest: string) {
    if (dest === "availability" || dest === "connection") setSheet(dest);
    else navigate(dest);
  }
  return (
    <View style={{ gap: 18 }}>
      <NextIntro
        eyebrow={driver ? "Driver" : "Technician"}
        title={driver ? "Driver workspace" : "Technician workspace"}
        detail="Current records and the next appropriate action."
      />
      <View
        accessibilityRole="tablist"
        style={{
          flexDirection: "row",
          gap: 4,
          padding: 4,
          borderRadius: 15,
          backgroundColor: colors.elevated,
        }}
      >
        {["Overview", "Actions", "Activity"].map((label) => (
          <Pressable
            key={label}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: view === label }}
            onPress={() => setView(label)}
            style={{
              flex: 1,
              minHeight: 44,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 12,
              backgroundColor: view === label ? colors.surface : "transparent",
            }}
          >
            <NextText
              kind="label"
              style={{ color: view === label ? colors.text : colors.muted }}
            >
              {label}
            </NextText>
          </Pressable>
        ))}
      </View>
      <NextList>
        {(view === "Overview"
          ? overview
          : view === "Actions"
            ? actions
            : [
                ["History and outcomes", "history"],
                ["Notifications", "notifications"],
                ["Connection and pending records", "connection"],
              ]
        ).map(([title, dest], i) => (
          <NextRow
            key={title}
            title={title}
            detail={
              view === "Actions"
                ? "Choose the current record and open a focused form"
                : undefined
            }
            icon={
              (
                [
                  "clipboard-list",
                  "layers",
                  "truck",
                  "wrench",
                  "shield-check",
                ] as NextIconName[]
              )[i % 5]
            }
            onPress={() =>
              open(dest === "notifications" && driver ? "notices" : dest)
            }
          />
        ))}
      </NextList>
      {sheet && (
        <ContextSheet
          title={
            sheet === "availability" ? "Availability" : "Connection & sync"
          }
          onClose={() => setSheet(null)}
        >
          {sheet === "availability" ? (
            <View style={{ gap: 18 }}>
              <NextText>
                {driver
                  ? "Enable new dispatch assignments when you are ready."
                  : "Set your availability preference. Assignment and qualification requirements still apply."}
              </NextText>
              <View
                style={{ flexDirection: "row", gap: 16, alignItems: "center" }}
              >
                <Switch
                  accessibilityLabel={
                    driver
                      ? "Available for dispatch"
                      : "Available for service assignments"
                  }
                  value={availability}
                  disabled={!connected}
                  onValueChange={onAvailability}
                />
                <NextText>{availability ? "Available" : "Paused"}</NextText>
              </View>
              {!connected && (
                <NextText>Reconnect before changing availability.</NextText>
              )}
            </View>
          ) : (
            <View style={{ gap: 14 }}>
              <NextText>
                {connected
                  ? "Connected to EasyGas."
                  : "Connection is unconfirmed. Saved records remain on this device until verified."}
              </NextText>
              <NextText>
                Offline evidence does not confirm payment, work or delivery.
                Open your profile to reconcile pending records.
              </NextText>
              <NextButton
                label="Open profile & sync"
                onPress={() => {
                  setSheet(null);
                  navigate("profile");
                }}
              />
            </View>
          )}
        </ContextSheet>
      )}
    </View>
  );
}
export function FieldNextAccount({
  role,
  user,
  navigate,
  onSignout,
  onSettings,
  onSync,
  queue,
  appearance,
  onAppearance,
}: {
  role: "driver" | "technician";
  user: any;
  navigate: Navigate;
  onSignout: () => void;
  onSettings?: () => void;
  onSync?: () => void;
  queue?: number | null;
  appearance?: string;
  onAppearance?: (mode: "light" | "dark" | "system") => void;
}) {
  const { colors } = useTheme(),
    [sheet, setSheet] = useState(false),
    driver = role === "driver";
  return (
    <View style={{ gap: 22 }}>
      <View style={{ alignItems: "center", gap: 12, paddingVertical: 24 }}>
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
          <NextText kind="heading">{initials(user.name)}</NextText>
        </View>
        <NextText
          kind="title"
          style={{ fontSize: 27, lineHeight: 33, textAlign: "center" }}
        >
          {user.name}
        </NextText>
        <NextText kind="small" style={{ color: colors.muted }}>
          {driver ? "Driver" : "Technician"} ·{" "}
          {user.branch_name || user.branch_id || user.branchId}
        </NextText>
      </View>
      <NextList>
        <NextRow
          title="Personal information"
          icon="user-round"
          onPress={() => navigate("personal")}
        />
        <NextRow
          title="Security"
          icon="lock-keyhole"
          onPress={() => navigate(driver ? "security" : "password")}
        />
        <NextRow
          title="Notifications & preferences"
          icon="bell"
          onPress={() => navigate(driver ? "notices" : "preferences")}
        />
        <NextRow
          title="All workspaces"
          icon="layers"
          onPress={() => navigate("work")}
        />
        <NextRow
          title={driver ? "Location & trip consent" : "Skills & services"}
          icon={driver ? "map-pin" : "wrench"}
          onPress={() => navigate(driver ? "trip" : "skills")}
        />
        <NextRow
          title="History"
          icon="clock"
          onPress={() => navigate("history")}
        />
        <NextRow
          title="Appearance"
          detail={appearance}
          icon="moon"
          onPress={() => (driver ? setSheet(true) : navigate("appearance"))}
        />
        {onSettings && (
          <NextRow
            title="Device location settings"
            icon="map-pin"
            onPress={onSettings}
          />
        )}
        <NextRow
          title="Help & support"
          icon="message-circle"
          onPress={() => navigate("support")}
        />
        {onSync && (
          <NextRow
            title="Synchronise pending records"
            detail={
              queue == null
                ? "Sync state unavailable"
                : queue + " encrypted field records pending"
            }
            icon="refresh-cw"
            onPress={onSync}
          />
        )}
      </NextList>
      <Pressable
        accessibilityRole="button"
        onPress={onSignout}
        style={{ minHeight: 52, padding: 16, alignItems: "center" }}
      >
        <NextText kind="label" style={{ color: colors.primary }}>
          Sign out
        </NextText>
      </Pressable>
      {sheet && (
        <ContextSheet title="Appearance" onClose={() => setSheet(false)}>
          <NextList>
            {(["light", "dark", "system"] as const).map((mode) => (
              <NextRow
                key={mode}
                title={mode.charAt(0).toUpperCase() + mode.slice(1)}
                icon={mode === "dark" ? "moon" : "sun"}
                onPress={() => {
                  onAppearance?.(mode);
                  setSheet(false);
                }}
              />
            ))}
          </NextList>
        </ContextSheet>
      )}
    </View>
  );
}
