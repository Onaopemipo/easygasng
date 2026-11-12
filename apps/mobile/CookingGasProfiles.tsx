import React, { useEffect, useRef, useState } from "react";
import { AppState, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  lagosRefillDate,
  loadCookingGasProfiles,
  noSmartRefillOffers,
  refillProfileActivity,
  refillSaveError,
  smartRefillExplanation,
  supplyOptions,
  type CookingGasProfilesData,
  type RefillOffer,
  type RefillProduct,
  type RefillProfile,
  type SupplyReport,
  type SupplyState,
} from "../../packages/business-rules/src/cooking-gas-profiles";
import {
  Button,
  Card,
  Copy,
  Feedback,
  Row,
  Title,
  type CustomerAPI,
} from "./CustomerUI";
import { ContextSheet } from "./ContextSheet";
import { View } from "./surfaces";
import { Text, TextInput } from "./typography";
import { useTheme } from "./theme";

export function CookingGasProfiles({
  api,
  onOffer,
  onOrders,
  smart = false,
  onPreferences,
  onOrderGas,
}: {
  api: CustomerAPI;
  onOffer: (offer: RefillOffer) => void;
  onOrders: (id?: string) => void;
  smart?: boolean;
  onPreferences?: () => void;
  onOrderGas?: () => void;
}) {
  const { colors } = useTheme();
  const [data, setData] = useState<CookingGasProfilesData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const request = useRef(0);
  const latestApi = useRef(api);
  latestApi.current = api;

  async function reload() {
    const version = ++request.current;
    setLoading(true);
    try {
      const next = await loadCookingGasProfiles(latestApi.current, {
        includeRecurring: !smart,
      });
      if (version !== request.current) return;
      setData(next);
      setError("");
    } catch (cause) {
      if (version !== request.current) return;
      const { status } = cause as { status?: number };
      if (status === 401 || status === 403) {
        setData(null);
        setCreating(false);
      }
      setError(
        status === 401
          ? "Sign in to view your profiles."
          : status === 403
            ? "This account can’t access Cooking Gas Profiles."
            : smart
              ? "Couldn’t refresh Smart Refill."
              : "Couldn’t refresh Cooking Gas Profiles.",
      );
    } finally {
      if (version === request.current) setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") void reload();
    });
    return () => {
      ++request.current;
      listener.remove();
    };
  }, [smart]);

  return (
    <View style={styles.stack}>
      <View style={[styles.hero, { backgroundColor: colors.elevated }]}>
        <View style={styles.grow}>
          <Text
            preserveColor
            style={{ color: colors.primary, fontWeight: "700" }}
          >
            YOUR KITCHEN
          </Text>
          <Title>{smart ? "Smart Refill" : "Cooking gas profiles"}</Title>
          <Copy>
            {smart
              ? "Track your refill profiles and view estimates based on verified deliveries."
              : "Manage refill profiles and review estimates based on your verified deliveries."}
          </Copy>
        </View>
        <Image
          source={require("./assets/cylinder-illustration.png")}
          style={{ width: 60, height: 82 }}
          resizeMode="contain"
          accessible={false}
        />
      </View>
      {error && (
        <Feedback
          error={
            data
              ? `${error} Last confirmed ${lagosRefillDate(data.refreshedAt, true)}.`
              : error
          }
          retry={reload}
        />
      )}
      {!data && loading && <Feedback loading />}
      {data && (
        <>
          <Card>
            <View style={styles.metrics}>
              {(smart
                ? [
                    {
                      label: "Active gas profiles",
                      value: data.profiles.filter((profile) => profile.active)
                        .length,
                    },
                    { label: "Smart offers", value: data.offers?.length },
                    {
                      label: "Refill estimates",
                      value: data.profiles.some(
                        (profile) =>
                          profile.active && profile.forecast.available,
                      )
                        ? "Available"
                        : "Unavailable",
                    },
                  ]
                : [
                    {
                      label: "Active profiles",
                      value: data.profiles.filter((profile) => profile.active)
                        .length,
                    },
                    { label: "Recurring refills", value: data.recurringCount },
                    {
                      label: "Smart Refill offers",
                      value: data.offers?.length,
                    },
                  ]
              ).map(({ label, value }) => (
                <View
                  key={label}
                  style={[
                    styles.metric,
                    smart &&
                      (typeof value === "number"
                        ? styles.smartCount
                        : styles.smartStatus),
                    { backgroundColor: colors.elevated },
                  ]}
                >
                  <Text style={styles.metricValue}>
                    {value ?? "Unavailable"}
                  </Text>
                  <Copy>{label}</Copy>
                </View>
              ))}
            </View>
            <Button
              label="Add consumption profile"
              onPress={() => setCreating(true)}
              disabled={loading || !!error || !data.products?.length}
            />
            {!data.products?.length && (
              <Copy>
                {data.products
                  ? "There are no refill sizes available to add."
                  : "Refill sizes are unavailable. Refresh to try again."}
              </Copy>
            )}
          </Card>
          <Card>
            <View style={styles.heading}>
              <Ionicons
                name="gift-outline"
                size={24}
                color={colors.primary}
                accessible={false}
              />
              <Text accessibilityRole="header" style={styles.title}>
                Smart Refill offers
              </Text>
            </View>
            {error ? (
              <Copy>Refresh to check current offer eligibility.</Copy>
            ) : !data.offers ? (
              <Copy>Smart Refill offers are unavailable.</Copy>
            ) : data.offers.length ? (
              data.offers.map((offer) => (
                <Row
                  key={offer.id}
                  label={offer.title}
                  detail={`${offer.points} points · expires ${lagosRefillDate(offer.expiresAt)}`}
                  icon="gift-outline"
                  onPress={() => onOffer(offer)}
                />
              ))
            ) : (
              <Copy>{noSmartRefillOffers}</Copy>
            )}
            {smart && (
              <Button
                secondary
                label="Learn more"
                onPress={() => setShowHelp(true)}
              />
            )}
          </Card>
          {!data.profiles.length && (
            <Card>
              <Text accessibilityRole="header" style={styles.title}>
                No cooking gas profiles yet
              </Text>
              <Copy>
                Add a profile to track your gas supply and review estimates as
                verified refills become available.
              </Copy>
            </Card>
          )}
          {data.profiles.map((profile) => (
            <NativeProfile
              key={profile.id}
              profile={profile}
              api={api}
              reload={reload}
              disabled={loading || !!error}
              refreshedAt={data.refreshedAt}
              onOrders={onOrders}
              smart={smart}
            />
          ))}
          {smart && (
            <View style={styles.stack}>
              {onPreferences && (
                <Button
                  secondary
                  label="Manage reminder preferences"
                  onPress={onPreferences}
                />
              )}
              {onOrderGas && (
                <Button secondary label="Order gas" onPress={onOrderGas} />
              )}
            </View>
          )}
          {showHelp && (
            <ContextSheet
              title="How Smart Refill works"
              onClose={() => setShowHelp(false)}
            >
              <View style={styles.stack}>
                <Copy>{smartRefillExplanation}</Copy>
                <Copy>
                  Offers depend on your eligible profile and communication
                  preferences.
                </Copy>
              </View>
            </ContextSheet>
          )}
          {!error && (
            <Button
              label={loading ? "Refreshing…" : "Refresh profiles"}
              onPress={reload}
              secondary
              disabled={loading}
            />
          )}
          {creating && data.products && (
            <AddProfileSheet
              api={api}
              products={data.products}
              disabled={loading || !!error}
              onClose={() => setCreating(false)}
              onSaved={() => {
                setCreating(false);
                void reload();
              }}
            />
          )}
        </>
      )}
    </View>
  );
}

function NativeProfile({
  profile,
  api,
  reload,
  disabled,
  refreshedAt,
  onOrders,
  smart,
}: {
  profile: RefillProfile;
  api: CustomerAPI;
  reload: () => Promise<void>;
  disabled: boolean;
  refreshedAt: string;
  onOrders: (id?: string) => void;
  smart: boolean;
}) {
  const [draft, setDraft] = useState<{
    state: SupplyState;
    base: string | null;
  } | null>(null);
  const [confirmed, setConfirmed] = useState<SupplyReport | null>(null);
  const [sheet, setSheet] = useState(false);
  const [history, setHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState("");
  const [message, setMessage] = useState("");
  const pending = useRef(false);
  const report = profile.feedback[0];
  const saved =
    confirmed &&
    (!report ||
      Date.parse(confirmed.created_at) > Date.parse(report.created_at))
      ? confirmed
      : report;
  const base = saved?.id ?? null;
  const choice = draft?.state ?? saved?.state;
  const conflict = !!draft && draft.base !== base;
  const { colors } = useTheme();

  async function save() {
    if (
      !draft ||
      pending.current ||
      disabled ||
      conflict ||
      draft.state === saved?.state
    )
      return;
    pending.current = true;
    setSaving(true);
    setProblem("");
    setMessage("");
    try {
      const result = await api("refill.feedback", {
        profileId: profile.id,
        state: draft.state,
        expectedFeedbackId: draft.base,
      });
      setConfirmed(result.feedback);
      setDraft(null);
      setMessage("Gas supply updated.");
      await reload();
    } catch (cause) {
      setProblem(refillSaveError(cause));
      await reload();
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }

  const forecast = profile.forecast;
  return (
    <Card>
      <View style={styles.heading}>
        <Ionicons
          name="analytics-outline"
          size={25}
          color={colors.primary}
          accessible={false}
        />
        <Text accessibilityRole="header" style={[styles.title, styles.grow]}>
          {profile.label} · {profile.product_name}
        </Text>
      </View>
      {profile.capacityKg != null && (
        <Copy>{profile.capacityKg} kg cylinder capacity</Copy>
      )}
      {forecast.available ? (
        <>
          <Text style={styles.title}>
            {forecast.estimatedPercent}% estimated remaining ·{" "}
            {forecast.daysLeft} days
          </Text>
          <Copy>
            Estimated refill {lagosRefillDate(forecast.nextDate)} ·{" "}
            {forecast.confidence} confidence · Checked{" "}
            {lagosRefillDate(refreshedAt, true)}
          </Copy>
        </>
      ) : (
        <Copy>{forecast.reason || "Refill estimate unavailable."}</Copy>
      )}
      {profile.active && (
        <View style={[styles.editor, { backgroundColor: colors.elevated }]}>
          <Text accessibilityRole="header" style={styles.title}>
            Tell us how much gas is left
          </Text>
          <Button
            secondary
            label={`Current supply · ${supplyOptions.find(({ value }) => value === choice)?.label ?? "Choose current supply"}`}
            onPress={() => setSheet(true)}
            disabled={saving || disabled}
          />
          <Copy>
            Current supply is your own report. Estimates use verified
            single-cylinder deliveries and aren’t sensor readings.
          </Copy>
          {problem && (
            <Text
              accessibilityRole="alert"
              preserveColor
              style={{ color: colors.error }}
            >
              {problem}
            </Text>
          )}
          {!problem && conflict && (
            <Text accessibilityRole="alert">
              The saved supply has changed. Reset to review the latest report.
            </Text>
          )}
          {message && (
            <Text
              accessibilityLiveRegion="polite"
              preserveColor
              style={{ color: colors.success }}
            >
              {message}
            </Text>
          )}
          {draft && !conflict && <Copy>Unsaved changes</Copy>}
          <View style={styles.actions}>
            <View style={styles.grow}>
              <Button
                label="Reset"
                secondary
                disabled={!draft || saving}
                onPress={() => {
                  setDraft(null);
                  setMessage("");
                  setProblem("");
                }}
              />
            </View>
            <View style={styles.grow}>
              <Button
                label={saving ? "Saving…" : "Save"}
                disabled={!draft || saving || conflict || disabled}
                onPress={save}
              />
            </View>
          </View>
        </View>
      )}
      {profile.reminderState?.reason && (
        <Copy>
          {profile.reminderState.reason}
          {profile.reminderState.until &&
            ` Until ${lagosRefillDate(profile.reminderState.until, true)}.`}
        </Copy>
      )}
      <Copy>
        {saved ? "Last supply update" : "Profile added"} ·{" "}
        {lagosRefillDate(saved?.created_at ?? profile.created_at, true)}
      </Copy>
      {profile.lastVerifiedRefill && (
        <Copy>
          Last verified refill ·{" "}
          {lagosRefillDate(profile.lastVerifiedRefill.date)} ·{" "}
          {profile.lastVerifiedRefill.kg} kg
        </Copy>
      )}
      {!smart && profile.history.length > 0 && (
        <Button
          secondary
          label={
            history
              ? "Hide verified refill history"
              : "View verified refill history"
          }
          onPress={() => setHistory(!history)}
        />
      )}
      {!smart && history && (
        <>
          {profile.history.map((entry) => (
            <Copy key={entry.orderId}>
              {lagosRefillDate(entry.date)} · {entry.kg} kg
            </Copy>
          ))}
          <Button secondary label="View orders" onPress={() => onOrders()} />
        </>
      )}
      {smart && (profile.feedback.length > 0 || profile.history.length > 0) && (
        <Row
          label="Profile activity"
          detail="Supply reports and verified refills"
          icon="time-outline"
          onPress={() => setHistory(true)}
        />
      )}
      {smart && history && (
        <ContextSheet
          title={`${profile.label} activity`}
          onClose={() => setHistory(false)}
        >
          <View style={styles.stack}>
            {refillProfileActivity(profile).map((entry) => (
              <View key={entry.id}>
                <Text style={styles.title}>{entry.label}</Text>
                <Copy>{lagosRefillDate(entry.date, true)}</Copy>
                {"orderId" in entry && (
                  <Button
                    secondary
                    label="View order"
                    onPress={() => onOrders(entry.orderId)}
                  />
                )}
              </View>
            ))}
            {profile.feedback.length === 10 && (
              <Copy>Showing the latest 10 supply reports.</Copy>
            )}
          </View>
        </ContextSheet>
      )}
      {sheet && (
        <ContextSheet title="Current supply" onClose={() => setSheet(false)}>
          <View style={styles.stack}>
            {supplyOptions.map(({ value, label }) => (
              <Button
                key={value}
                label={choice === value ? `${label} · Selected` : label}
                secondary={choice !== value}
                onPress={() => {
                  setDraft(
                    value !== saved?.state ? { state: value, base } : null,
                  );
                  setProblem("");
                  setMessage("");
                  setSheet(false);
                }}
              />
            ))}
          </View>
        </ContextSheet>
      )}
    </Card>
  );
}

function AddProfileSheet({
  api,
  products,
  onClose,
  onSaved,
  disabled,
}: {
  api: CustomerAPI;
  products: RefillProduct[];
  onClose: () => void;
  onSaved: () => void;
  disabled: boolean;
}) {
  const { colors } = useTheme();
  const [label, setLabel] = useState("");
  const [productId, setProductId] = useState("");
  const [household, setHousehold] = useState("1");
  const [days, setDays] = useState("7");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);

  async function save() {
    if (pending.current || disabled) return;
    const householdSize = Number(household);
    const cookingDays = Number(days);
    if (label.trim().length < 2) {
      setError("Enter a profile name with at least 2 characters.");
      return;
    }
    if (!productId) {
      setError("Choose a refill size.");
      return;
    }
    if (
      !Number.isInteger(householdSize) ||
      householdSize < 1 ||
      householdSize > 1000
    ) {
      setError("Enter between 1 and 1,000 people served.");
      return;
    }
    if (!Number.isInteger(cookingDays) || cookingDays < 1 || cookingDays > 7) {
      setError("Enter between 1 and 7 cooking days per week.");
      return;
    }
    pending.current = true;
    setSaving(true);
    setError("");
    try {
      await api("refill.profile.create", {
        productId,
        label: label.trim(),
        householdSize,
        cookingDays,
      });
      onSaved();
    } catch (cause) {
      setError(
        (cause as Error).message ||
          "Couldn’t confirm that your profile was added. Refresh before trying again.",
      );
    } finally {
      pending.current = false;
      setSaving(false);
    }
  }

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.input, borderColor: colors.border },
  ];
  return (
    <ContextSheet
      title="Add consumption profile"
      onClose={() => {
        if (!pending.current) onClose();
      }}
    >
      <View style={styles.stack}>
        <Text>Profile name</Text>
        <TextInput
          accessibilityLabel="Profile name"
          style={inputStyle}
          value={label}
          onChangeText={setLabel}
          editable={!saving}
          maxLength={80}
        />
        <Text>Refill size</Text>
        {products.map((product) => (
          <Button
            key={product.id}
            label={
              product.id === productId
                ? `${product.name} · Selected`
                : product.name
            }
            secondary={product.id !== productId}
            onPress={() => setProductId(product.id)}
            disabled={saving}
          />
        ))}
        <Text>People served</Text>
        <TextInput
          accessibilityLabel="People served"
          style={inputStyle}
          value={household}
          onChangeText={setHousehold}
          keyboardType="number-pad"
          editable={!saving}
        />
        <Text>Cooking days per week</Text>
        <TextInput
          accessibilityLabel="Cooking days per week"
          style={inputStyle}
          value={days}
          onChangeText={setDays}
          keyboardType="number-pad"
          editable={!saving}
        />
        {error && (
          <Text
            accessibilityRole="alert"
            preserveColor
            style={{ color: colors.error }}
          >
            {error}
          </Text>
        )}
        <Button
          label={saving ? "Adding…" : "Add profile"}
          onPress={save}
          disabled={saving || disabled}
        />
      </View>
    </ContextSheet>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
  grow: { flex: 1, minWidth: 0 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  metric: { flexGrow: 1, flexBasis: 95, borderRadius: 12, padding: 10 },
  smartCount: { flexBasis: "40%" },
  smartStatus: { flexBasis: "100%" },
  metricValue: { fontSize: 17, fontWeight: "800" },
  heading: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { fontSize: 17, fontWeight: "700" },
  editor: { padding: 14, borderRadius: 14, gap: 10 },
  actions: { flexDirection: "row", gap: 8 },
  input: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
});
