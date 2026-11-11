import { EasyGasLoader } from "./EasyGasLoader";
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Pressable,
  Image,
  Switch,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text, TextInput } from "./typography";
import { useTheme } from "./theme";
import { Button, Card, Copy, Title, type CustomerAPI } from "./CustomerUI";
import { NativeForm } from "./Workflows";
import {
  technicianRange,
  technicianStatus,
  historyGroup,
  lagosDate,
} from "../../packages/business-rules/src/technician-mobile";
export function TechnicianBrandHeader({
  user,
  unread,
  navigate,
}: {
  user: any;
  unread: number;
  navigate: (page: string) => void;
}) {
  const { colors, dark } = useTheme(),
    { width } = useWindowDimensions();
  return (
    <View
      style={[
        s.brand,
        { borderColor: colors.border, backgroundColor: colors.surface },
      ]}
    >
      <Image
        source={require("./assets/easygas-logo-hd.png")}
        accessibilityLabel="EasyGas Energy Solutions"
        resizeMode="contain"
        style={{
          width: width < 360 ? 90 : 112,
          height: 46,
          backgroundColor: dark ? "#f0faee" : "transparent",
          borderRadius: 6,
        }}
      />
      <View
        style={{
          borderLeftWidth: 1,
          borderColor: colors.border,
          paddingLeft: 10,
          flex: 1,
        }}
      >
        <Text
          preserveColor
          style={{
            fontSize: width < 360 ? 16 : 18,
            fontWeight: "800",
            color: colors.primary,
          }}
        >
          Technician
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Notifications, ${unread} unread`}
        onPress={() => navigate("notifications")}
        style={s.iconButton}
      >
        <Ionicons
          name="notifications-outline"
          size={27}
          color={colors.primary}
        />
        {unread > 0 && (
          <View style={s.badge}>
            <Text
              preserveColor
              style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}
            >
              {unread > 99 ? "99+" : unread}
            </Text>
          </View>
        )}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open my technician profile"
        onPress={() => navigate("profile")}
        style={[s.avatar, { backgroundColor: colors.elevated }]}
      >
        <Text
          preserveColor
          style={{ fontWeight: "800", fontSize: 22, color: colors.primary }}
        >
          {user.name?.slice(0, 1).toUpperCase() ?? "T"}
        </Text>
      </Pressable>
    </View>
  );
}
function Hero({
  title,
  subtitle,
  home = false,
  eyebrow,
}: {
  title: string;
  subtitle: string;
  home?: boolean;
  eyebrow?: string;
}) {
  const { colors, dark } = useTheme();
  return (
    <View
      style={[
        s.hero,
        { backgroundColor: colors.surface, minHeight: home ? 158 : 142 },
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          s.wave,
          {
            backgroundColor: dark ? "#234b28" : "#e1f8d3",
            bottom: -75,
            left: -40,
          },
        ]}
      />
      <View
        pointerEvents="none"
        style={[
          s.wave,
          {
            backgroundColor: dark ? "#3b5723" : "#d1ef8a",
            bottom: -100,
            left: 75,
            transform: [{ rotate: "-12deg" }],
          },
        ]}
      />
      <View style={{ flex: 1, zIndex: 1, paddingBottom: 25, paddingRight: 82 }}>
        {eyebrow && (
          <Text
            preserveColor
            style={{ color: colors.muted, fontSize: 17, marginBottom: 4 }}
          >
            {eyebrow}
          </Text>
        )}
        <Text
          preserveColor
          accessibilityRole="header"
          style={{
            color: colors.text,
            fontSize: home ? 27 : 28,
            fontWeight: "800",
          }}
        >
          {title}
        </Text>
        <Text preserveColor style={{ color: colors.muted, fontSize: 15 }}>
          {subtitle}
        </Text>
      </View>
      <Image
        source={require("./assets/cylinder-illustration.png")}
        accessible={false}
        resizeMode="contain"
        style={s.heroCylinder}
      />
    </View>
  );
}
function ActionRow({
  label,
  detail,
  icon,
  onPress,
}: {
  label: string;
  detail?: string;
  icon: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={detail ? label + ". " + detail : label}
      onPress={onPress}
      style={({ pressed }) => [
        s.action,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <View style={[s.actionIcon, { backgroundColor: colors.elevated }]}>
        <Ionicons name={icon as any} color={colors.primary} size={27} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          preserveColor
          style={{ color: colors.text, fontWeight: "700", fontSize: 18 }}
        >
          {label}
        </Text>
        {detail && <Copy>{detail}</Copy>}
      </View>
      <Ionicons name="chevron-forward" size={22} color={colors.muted} />
    </Pressable>
  );
}
function Metric({
  value,
  label,
  icon,
  tone,
  onPress,
  compact = false,
}: {
  compact?: boolean;
  value: any;
  label: string;
  icon: string;
  tone: string;
  onPress?: () => void;
}) {
  const { colors, dark } = useTheme();
  const { width } = useWindowDimensions();
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={label + ": " + String(value ?? "Unavailable")}
      onPress={onPress}
      disabled={!onPress}
      style={[
        s.metric,
        compact && {
          padding: 8,
          ...(width < 500 ? { minWidth: "44%", flexBasis: "44%" } : {}),
        },
        {
          backgroundColor: dark ? colors.elevated : tone,
          borderColor: colors.border,
        },
      ]}
    >
      <Ionicons name={icon as any} size={25} color={colors.primary} />
      <Text
        preserveColor
        style={{ fontSize: 29, fontWeight: "800", color: colors.text }}
      >
        {value ?? "Unavailable"}
      </Text>
      <Text preserveColor style={{ fontSize: 15, color: colors.text }}>
        {label}
      </Text>
      {onPress && (
        <Ionicons
          name="chevron-forward"
          color={colors.primary}
          size={19}
          style={{ position: "absolute", right: 9, bottom: 12 }}
        />
      )}
    </Pressable>
  );
}
export function TechnicianScreens({
  page,
  user,
  profile,
  api,
  navigate,
  openJob,
  connected,
  stamp,
  busy,
  availability,
  refresh,
  signout,
  entryFilter = "all",
  entryRange = "30",
}: {
  page: string;
  user: any;
  profile: any;
  api: CustomerAPI;
  navigate: (page: string, filter?: string, range?: string) => void;
  openJob: (id: string, intent?: string) => Promise<void>;
  connected: boolean;
  stamp: string;
  busy: boolean;
  availability: (value: boolean) => Promise<void>;
  refresh: () => Promise<void>;
  signout: () => void;
  entryFilter?: string;
  entryRange?: string;
}) {
  const { colors, dark, preference, setPreference } = useTheme(),
    [q, setQ] = useState(""),
    [filter, setFilter] = useState(entryFilter),
    [range, setRange] = useState(entryRange),
    [index, setIndex] = useState(1),
    [location, setLocation] = useState(""),
    [showFilters, setShowFilters] = useState(false),
    [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [revision, setRevision] = useState(0);
  const generation = useRef(0);
  const history = page === "history",
    listPage = page === "jobs" || history,
    period = technicianRange(range),
    summary = profile.summary ?? {},
    p = profile.profile ?? {},
    identity = { ...user, ...p };
  useEffect(() => {
    setQ("");
    setLocation("");
    setIndex(1);
    setFilter(entryFilter);
    setRange(entryRange);
    setData(null);
  }, [page, entryFilter, entryRange]);
  useEffect(() => {
    if (!listPage) return;
    let live = true;
    const current = ++generation.current;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          filter: history ? "past" : filter,
          page: String(index),
          ...(q ? { q } : {}),
          ...(location ? { location } : {}),
          ...(history ? { from: period.from, to: period.to } : {}),
        });
        const r = await api("technician.jobs?" + params);
        if (live && current === generation.current) {
          setData(r);
          setError("");
        }
      } catch (e: any) {
        if (live) {
          setData(null);
          setError(e.message);
        }
      } finally {
        if (live) setLoading(false);
      }
    }, 250);
    return () => {
      live = false;
      generation.current++;
      clearTimeout(timer);
    };
  }, [
    page,
    filter,
    index,
    q,
    location,
    range,
    api,
    profile.generatedAt,
    revision,
  ]);
  async function choose(job: any) {
    try {
      await openJob(job.id);
    } catch (e: any) {
      setError(e.message);
    }
  }
  function availabilityCard() {
    return (
      <View
        style={[
          s.availability,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Switch
          accessibilityLabel="Available for Work"
          value={!!p.technician_available}
          disabled={busy || !connected}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.surface}
          onValueChange={availability}
        />
        <View style={{ flex: 1 }}>
          <Text
            preserveColor
            style={{ color: colors.text, fontSize: 19, fontWeight: "800" }}
          >
            Available for Work
          </Text>
          <Copy>
            {!connected
              ? "Offline / refresh not confirmed — preference is cached"
              : "Receive job assignments and updates"}
          </Copy>
        </View>
      </View>
    );
  }
  function jobCard(job: any) {
    const done = job.status === "completed",
      inProgress = job.status === "in_progress";
    return (
      <Pressable
        key={job.id}
        accessibilityRole="button"
        accessibilityLabel={`${job.reference}, ${job.service}, ${technicianStatus(job)}. Open job`}
        onPress={() => choose(job)}
        style={({ pressed }) => [
          s.job,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderLeftColor: inProgress ? colors.primary : colors.border,
            borderLeftWidth: inProgress ? 4 : 1,
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        <View style={[s.actionIcon, { backgroundColor: colors.elevated }]}>
          <Ionicons
            name={done ? "checkmark-circle-outline" : "build-outline"}
            color={colors.primary}
            size={27}
          />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            preserveColor
            style={{ color: colors.text, fontSize: 15, fontWeight: "700" }}
          >
            {job.reference}
          </Text>
          <Text
            preserveColor
            style={{ color: colors.text, fontSize: 18, fontWeight: "800" }}
          >
            {job.service}
          </Text>
          <View style={s.line}>
            <Ionicons
              name="location-outline"
              color={colors.primary}
              size={18}
            />
            <Copy>
              {job.address?.street}, {job.address?.zone}
            </Copy>
          </View>
          <View style={s.line}>
            <Ionicons
              name="calendar-outline"
              color={colors.primary}
              size={18}
            />
            <Copy>
              {new Date(job.starts_at).toLocaleString("en-GB", {
                timeZone: "Africa/Lagos",
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              –{" "}
              {new Date(job.ends_at).toLocaleTimeString("en-GB", {
                timeZone: "Africa/Lagos",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Copy>
          </View>
          <Text
            preserveColor
            style={{
              color: colors.primary,
              fontWeight: "700",
              fontSize: 15,
              marginTop: 6,
            }}
          >
            {technicianStatus(job)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color={colors.muted} />
      </Pressable>
    );
  }
  const greetingHour = Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Africa/Lagos",
        hour: "2-digit",
        hourCycle: "h23",
      }).format(new Date()),
    ),
    greeting =
      greetingHour < 12
        ? "Good morning"
        : greetingHour < 17
          ? "Good afternoon"
          : "Good evening";
  if (page === "home")
    return (
      <>
        <Hero
          home
          title={identity.name}
          eyebrow={greeting + ","}
          subtitle={`Technician · ${p.branch_id ?? "Branch unavailable"}`}
        />
        {availabilityCard()}
        <View style={s.metrics}>
          <Metric
            label="My Jobs"
            value={summary.total}
            icon="briefcase-outline"
            tone="#edf7ff"
            onPress={() => navigate("jobs", "all")}
          />
          <Metric
            label="In Progress"
            value={summary.in_progress}
            icon="play-circle-outline"
            tone="#fff8e7"
            onPress={() => navigate("jobs", "in_progress")}
          />
          <Metric
            label="Completed This Month"
            value={summary.completed_month}
            icon="checkmark-circle-outline"
            tone="#effbea"
            onPress={() => navigate("history", "all", "month")}
          />
        </View>
        <Button label="View My Jobs" onPress={() => navigate("jobs", "all")} />
        <Copy>
          My Jobs includes current and past assigned records. Last confirmed
          sync:{" "}
          {stamp
            ? new Date(stamp).toLocaleString("en-GB", {
                timeZone: "Africa/Lagos",
              })
            : "unavailable"}
          .{" "}
          {connected
            ? "Availability is separate from connectivity."
            : "Cached information — refresh before acting."}
        </Copy>
      </>
    );
  if (listPage) {
    let group = "";
    return (
      <>
        <Hero
          title={history ? "Service History" : "My Jobs"}
          subtitle={history ? "Your completed and past service jobs" : "View and manage your assigned service jobs"}
        />
        {history && (
          <>
            <View style={[s.metrics, { flexWrap: "wrap" }]}>
              <Metric
                compact
                label="Completed · All Time"
                value={summary.completed}
                icon="checkmark-circle-outline"
                tone="#effbea"
              />
              <Metric
                compact
                label="Total Jobs"
                value={summary.total}
                icon="time-outline"
                tone="#edf7ff"
              />
              <Metric
                compact
                label={
                  summary.ratingCount ? "Verified Rating" : "No Reviews Yet"
                }
                value={
                  summary.rating == null
                    ? "—"
                    : Number(summary.rating).toFixed(1)
                }
                icon="star-outline"
                tone="#fff8e7"
              />
              <Metric
                compact
                label="History Days"
                value={period.days}
                icon="calendar-outline"
                tone="#f6efff"
              />
            </View>
            <Copy>
              Totals cover all your jobs. History: {period.from} – {period.to}{" "}
              (Lagos).
            </Copy>
          </>
        )}
        {page === "jobs" && (
          <View style={s.filterTabs}>
            {[
              ["all", "All Jobs", summary.total],
              ["assigned", "Assigned", summary.assigned],
              ["in_progress", "In Progress", summary.in_progress],
              ["completed", "Completed", summary.completed],
            ].map(([v, title, count]) => (
              <Pressable
                key={v}
                accessibilityRole="tab"
                accessibilityState={{ selected: filter === v }}
                onPress={() => {
                  setFilter(String(v));
                  setIndex(1);
                }}
                style={[
                  s.filterTab,
                  {
                    backgroundColor:
                      filter === v ? colors.primary : colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  preserveColor
                  style={{
                    fontWeight: "700",
                    fontSize: 15,
                    color:
                      filter === v ? (dark ? "#10251c" : "#fff") : colors.text,
                  }}
                >
                  {title} ({count ?? "—"})
                </Text>
              </Pressable>
            ))}
          </View>
        )}
        <View style={s.searchRow}>
          <View
            style={[
              s.search,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons name="search" color={colors.muted} size={23} />
            <TextInput
              accessibilityLabel="Search technician jobs"
              placeholder="Job ID, service or customer"
              value={q}
              maxLength={100}
              onChangeText={(v) => {
                setQ(v);
                setIndex(1);
              }}
              style={{
                flex: 1,
                color: colors.text,
                fontSize: 15,
                minHeight: 44,
              }}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Filter technician jobs"
            accessibilityState={{ expanded: showFilters }}
            onPress={() => setShowFilters(!showFilters)}
            style={[
              s.iconButton,
              {
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: 14,
              },
            ]}
          >
            <Ionicons name="options-outline" size={26} color={colors.primary} />
          </Pressable>
        </View>
        {showFilters && (
          <Card>
            <Copy>Filter within your authorised assignments.</Copy>
            <TextInput
              accessibilityLabel="Filter jobs by location"
              placeholder="Location / address"
              value={location}
              maxLength={100}
              onChangeText={(v) => {
                setLocation(v);
                setIndex(1);
              }}
              style={{
                minHeight: 44,
                color: colors.text,
                borderBottomWidth: 1,
                borderColor: colors.border,
              }}
            />
            {history && (
              <View style={s.filterTabs}>
                {[
                  ["7", "7 days"],
                  ["30", "30 days"],
                  ["90", "90 days"],
                  ["month", "This month"],
                ].map(([v, l]) => (
                  <Button
                    key={v}
                    label={l}
                    secondary={range !== v}
                    onPress={() => {
                      setRange(v);
                      setIndex(1);
                    }}
                  />
                ))}
              </View>
            )}
            <Button
              label="Clear Search & Location"
              secondary
              onPress={() => {
                setQ("");
                setLocation("");
                setIndex(1);
              }}
            />
          </Card>
        )}
        {loading && (
          <EasyGasLoader
            accessibilityLabel="Loading authorised jobs"
            color={colors.primary}
          />
        )}{" "}
        {!!error && (
          <Card>
            <Copy>{error}</Copy>
            <Button
              label="Retry Jobs"
              secondary
              onPress={() => setRevision((x) => x + 1)}
            />
          </Card>
        )}
        {!loading && !error && data?.rows.length === 0 && (
          <Card>
            <Title>No matching jobs</Title>
            <Copy>Only your authorised assignments appear here.</Copy>
            <Button
              label="View My Jobs"
              secondary
              onPress={() => navigate("jobs", "all")}
            />
          </Card>
        )}
        {data?.rows.map((job: any) => {
          const heading = history ? historyGroup(job) : "";
          const start = heading !== group;
          group = heading;
          return (
            <React.Fragment key={job.id}>
              {start && history && (
                <Text
                  preserveColor
                  accessibilityRole="header"
                  style={[
                    s.group,
                    { backgroundColor: colors.elevated, color: colors.primary },
                  ]}
                >
                  {heading}
                </Text>
              )}
              {jobCard(job)}
            </React.Fragment>
          );
        })}
        {data && (
          <View style={s.pager}>
            <Button
              label="Previous"
              secondary
              disabled={index <= 1 || loading}
              onPress={() => setIndex((x) => x - 1)}
            />
            <Copy>
              Page {index} · {data.total} jobs
            </Copy>
            <Button
              label="Next"
              secondary
              disabled={!data.hasMore || loading}
              onPress={() => setIndex((x) => x + 1)}
            />
          </View>
        )}
        <Copy>
          All Jobs includes current and past assignments. Final actions are
          revalidated by the server.
        </Copy>
      </>
    );
  }
  if (page === "profile")
    return (
      <>
        <Hero
          title="My Profile"
          subtitle="Manage your account, availability and preferences."
        />
        <View
          style={[
            s.identity,
            { backgroundColor: dark ? "#153c28" : "#075b21" },
          ]}
        >
          <View style={[s.largeAvatar, { backgroundColor: "#dff7d2" }]}>
            <Text
              preserveColor
              style={{ fontSize: 36, fontWeight: "800", color: "#075b21" }}
            >
              {identity.name?.slice(0, 1).toUpperCase() ?? "T"}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              preserveColor
              style={{ color: "#fff", fontSize: 25, fontWeight: "800" }}
            >
              {identity.name}
            </Text>
            <Text preserveColor style={{ color: "#fff", fontSize: 15 }}>
              Technician · {p.branch_id}
            </Text>
            <Text
              preserveColor
              style={{ color: "#e5ffbc", fontWeight: "700", fontSize: 15 }}
            >
              {p.active ? "Active account" : "Inactive account"}
            </Text>
          </View>
        </View>
        <View style={s.metrics}>
          <Metric
            label="Completed Jobs"
            value={summary.completed}
            icon="briefcase-outline"
            tone="#effbea"
          />
          <Metric
            label={summary.ratingCount ? "Verified Rating" : "No Reviews Yet"}
            value={
              summary.rating == null ? "—" : Number(summary.rating).toFixed(1)
            }
            icon="star-outline"
            tone="#fff8e7"
          />
          <Metric
            label="Total Jobs"
            value={summary.total}
            icon="calendar-outline"
            tone="#edf7ff"
          />
        </View>
        {[
          [
            "Personal Information",
            "Name and authorised account details",
            "person-outline",
            "personal",
          ],
          [
            "Availability",
            "Your assignment availability",
            "calendar-outline",
            "availability",
          ],
          [
            "Skills & Services",
            "Qualifications and expiry, managed by operations",
            "build-outline",
            "skills",
          ],
          [
            "Security",
            "Change your password securely",
            "lock-closed-outline",
            "password",
          ],
          [
            "Notification Preferences",
            "Optional reminders and quiet hours",
            "notifications-outline",
            "preferences",
          ],
          [
            "Appearance",
            "Light, Dark or System",
            "contrast-outline",
            "appearance",
          ],
          [
            "Help & Support",
            "Contact service operations",
            "help-circle-outline",
            "support",
          ],
        ].map(([l, d, i, dest]) => (
          <ActionRow
            key={dest}
            label={l}
            detail={d}
            icon={i}
            onPress={() => navigate(dest)}
          />
        ))}
        <Button label="Sign Out" secondary onPress={signout} />
      </>
    );
  if (page === "availability")
    return (
      <>
        <Hero
          title="Availability"
          subtitle="Assignments remain governed by service operations."
        />
        {availabilityCard()}
        <Copy>
          An active visit must be reconciled before going unavailable.
          Availability does not mean the device is online or that chargeable
          work is authorised.
        </Copy>
      </>
    );
  if (page === "personal")
    return (
      <>
        <Title>Personal Information</Title>
        <Card>
          <Copy>Email: {identity.email}</Copy>
          <Copy>Staff record ID: {identity.id}</Copy>
          <Copy>Role: Technician · Branch: {p.branch_id}</Copy>
          <Copy>
            Staff identity, phone verification, branch and qualifications are
            managed by authorised operations.
          </Copy>
        </Card>
        <NativeForm
          api={api}
          action="account.update"
          title="Update Your Name"
          fields={[{ name: "name", label: "Your name", value: identity.name }]}
          onDone={() => refresh().catch((e) => setError(e.message))}
        />
        {error && <Copy>{error}</Copy>}
      </>
    );
  if (page === "skills")
    return (
      <>
        <Title>Skills & Services</Title>
        <Copy>
          Qualifications are independently verified by authorised operations.
          You cannot grant yourself a qualification or change its expiry.
        </Copy>
        {profile.qualifications?.length ? (
          profile.qualifications.map((v: any) => (
            <Card key={v.code}>
              <Title>{v.code.replaceAll("_", " ")}</Title>
              <Copy>
                Expires{" "}
                {new Date(v.expires_at).toLocaleString("en-GB", {
                  timeZone: "Africa/Lagos",
                })}{" "}
                ·{" "}
                {Date.parse(v.expires_at) > Date.now() ? "Current" : "Expired"}
              </Copy>
            </Card>
          ))
        ) : (
          <Card>
            <Copy>No qualification records available. Contact operations.</Copy>
          </Card>
        )}
      </>
    );
  if (page === "preferences") {
    const pref = profile.preferences;
    return (
      <>
        <Title>Notification Preferences</Title>
        <Copy>
          Essential assignment and security messages remain available in app.
          These preferences control optional reminders, not permission to
          perform work. Channel delivery depends on configured verified
          providers.
        </Copy>
        {!pref && (
          <Copy>
            Default reminder settings apply until you save your preferences.
          </Copy>
        )}
        <NativeForm
          api={api}
          action="preferences.save"
          title="Optional Reminders & Quiet Hours"
          fields={[
            {
              name: "marketing",
              label: "Optional marketing",
              type: "checkbox",
              value: pref?.marketing ?? false,
            },
            {
              name: "refillReminders",
              label: "Refill reminders",
              type: "checkbox",
              value: pref?.refill_reminders ?? true,
            },
            {
              name: "serviceReminders",
              label: "Service reminders",
              type: "checkbox",
              value: pref?.service_reminders ?? true,
            },
            {
              name: "quietStart",
              label: "Quiet hours start (0–23)",
              type: "number",
              value: pref?.quiet_start ?? 21,
            },
            {
              name: "quietEnd",
              label: "Quiet hours end (0–23)",
              type: "number",
              value: pref?.quiet_end ?? 8,
            },
          ]}
          onDone={() => refresh().catch((e) => setError(e.message))}
        />
        {error && <Copy>{error}</Copy>}
      </>
    );
  }
  if (page === "appearance")
    return (
      <>
        <Title>Appearance</Title>
        {(["light", "dark", "system"] as const).map((v) => (
          <Button
            key={v}
            label={(preference === v ? "✓ " : "") + label(v)}
            secondary
            onPress={() => setPreference(v).catch((e) => setError(e.message))}
          />
        ))}
        {error && <Copy>{error}</Copy>}
      </>
    );
  return null;
}
function label(v: string) {
  return v.charAt(0).toUpperCase() + v.slice(1);
}
const s = StyleSheet.create({
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  iconButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    right: -3,
    top: -3,
    minWidth: 20,
    paddingHorizontal: 3,
    backgroundColor: "#cc172b",
    borderRadius: 12,
    alignItems: "center",
  },
  hero: {
    paddingTop: 15,
    paddingHorizontal: 8,
    position: "relative",
    overflow: "hidden",
    justifyContent: "center",
    borderRadius: 18,
  },
  wave: {
    position: "absolute",
    width: 450,
    height: 135,
    borderRadius: 160,
    transform: [{ rotate: "8deg" }],
  },
  heroCylinder: {
    position: "absolute",
    width: 87,
    height: 128,
    right: 2,
    bottom: 8,
  },
  availability: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    borderWidth: 1,
    borderRadius: 20,
    padding: 17,
  },
  metrics: { flexDirection: "row", gap: 8, alignItems: "stretch" },
  metric: {
    flex: 1,
    minWidth: 0,
    padding: 11,
    borderRadius: 19,
    borderWidth: 1,
    minHeight: 130,
  },
  action: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 19,
    padding: 16,
    minHeight: 90,
  },
  actionIcon: {
    width: 43,
    height: 43,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  job: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderRadius: 19,
    borderWidth: 1,
    padding: 14,
    minHeight: 112,
    marginBottom: 12,
  },
  line: {
    flexDirection: "row",
    gap: 5,
    alignItems: "flex-start",
    paddingRight: 15,
  },
  filterTabs: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  filterTab: { padding: 10, borderRadius: 14, borderWidth: 1, minHeight: 44 },
  searchRow: { flexDirection: "row", gap: 9, alignItems: "center" },
  search: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 10,
  },
  pager: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  group: {
    padding: 10,
    borderRadius: 12,
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 8,
  },
  identity: {
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
  },
  largeAvatar: {
    width: 76,
    height: 76,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
});
