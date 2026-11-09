import { EasyGasLoader } from "./EasyGasLoader";
import {
  Card as CustomerCard,
  Copy as CustomerCopy,
  Title as CustomerTitle,
} from "./CustomerUI";
import * as SecureStore from "expo-secure-store";
import React, { useState, useEffect, useRef } from "react";
import { Switch, StyleSheet } from "react-native";
import { View, Pressable } from "./surfaces";
import { Text, TextInput } from "./typography";
import { randomUUID } from "expo-crypto";
type API = (action: string, data?: any) => Promise<any>;
type Field = {
  name: string;
  label: string;
  value?: any;
  type?: "number" | "password" | "checkbox" | "text" | "hidden";
  options?: { value: string; label: string }[];
};
export function NativeForm({
  api,
  action,
  title,
  fields,
  onDone,
  draftKey,
  recordVersion,
}: {
  api: API;
  action: string;
  title: string;
  fields: Field[];
  onDone?: () => void;
  draftKey?: string;
  recordVersion?: number;
}) {
  const [values, setValues] = useState<Record<string, any>>(() =>
      Object.fromEntries(
        fields.map((f) => [
          f.name,
          f.value ?? (f.type === "checkbox" ? false : ""),
        ]),
      ),
    ),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [draftReady, setDraftReady] = useState(!draftKey),
    [draftConflict, setDraftConflict] = useState(false);
  useEffect(() => {
    let live = true;
    if (!draftKey) return;
    SecureStore.getItemAsync(draftKey)
      .then((raw) => {
        if (!live) return;
        if (raw) {
          const draft = JSON.parse(raw);
          if (draft.values && typeof draft.values === "object") {
            setValues(draft.values);
            if (draft.recordVersion !== recordVersion) {
              setDraftConflict(true);
              setMessage(
                "A saved draft belongs to an earlier booking version. Review it before submitting against the current record.",
              );
            }
          }
        }
        setDraftReady(true);
      })
      .catch(() => {
        if (live) {
          setMessage(
            "The encrypted service draft could not be read. It has not been discarded.",
          );
          setDraftReady(false);
        }
      });
    return () => {
      live = false;
    };
  }, [draftKey]);
  useEffect(() => {
    if (draftKey && draftReady && !draftConflict)
      SecureStore.setItemAsync(
        draftKey,
        JSON.stringify({ recordVersion, values }),
      ).catch(() =>
        setMessage("The service draft could not be saved on this device."),
      );
  }, [values, draftKey, draftReady, draftConflict, recordVersion]);
  const pendingOperation = useRef<{ fingerprint: string; key: string } | null>(
    null,
  );
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return (
    <View style={s.card}>
      <Text style={s.heading}>{title}</Text>
      {fields
        .filter((f) => f.type !== "hidden")
        .map((f) => (
          <View key={f.name}>
            <Text style={s.label}>{f.label}</Text>
            {f.options ? (
              <View>
                {f.options.map((o) => (
                  <Pressable
                    key={o.value}
                    style={[
                      s.button,
                      {
                        backgroundColor:
                          values[f.name] === o.value ? "#087a36" : "#edf6e9",
                      },
                    ]}
                    onPress={() => setValues({ ...values, [f.name]: o.value })}
                  >
                    <Text
                      style={{
                        color: values[f.name] === o.value ? "white" : "#07592e",
                      }}
                    >
                      {o.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : f.type === "checkbox" ? (
              <Switch
                accessibilityLabel={f.label}
                disabled={!draftReady}
                value={Boolean(values[f.name])}
                onValueChange={(v) => setValues({ ...values, [f.name]: v })}
              />
            ) : (
              <TextInput
                accessibilityLabel={f.label}
                style={s.input}
                editable={draftReady}
                secureTextEntry={f.type === "password"}
                keyboardType={f.type === "number" ? "numeric" : "default"}
                autoCapitalize="none"
                value={String(values[f.name] ?? "")}
                onChangeText={(v) => setValues({ ...values, [f.name]: v })}
              />
            )}
          </View>
        ))}
      {message ? (
        <Text accessibilityRole="alert" style={s.body}>
          {message}
        </Text>
      ) : null}
      {draftConflict && (
        <Pressable
          style={s.button}
          onPress={() => {
            setDraftConflict(false);
            setMessage(
              "Draft reviewed against the current booking. Submit only after checking the latest approved scope.",
            );
          }}
        >
          <Text style={s.buttonText}>
            I have reviewed this draft against the current record
          </Text>
        </Pressable>
      )}
      <Pressable
        style={s.button}
        disabled={busy || !draftReady || draftConflict}
        onPress={async () => {
          setBusy(true);
          setMessage("");
          try {
            const data = { ...values };
            for (const f of fields)
              if (f.type === "number") data[f.name] = Number(data[f.name]);
            for (const key of Object.keys(data))
              if (key.startsWith("address.")) {
                data.address ??= {};
                data.address[key.slice(8)] = data[key];
                delete data[key];
              }
            if (
              [
                "booking.",
                "service.material.",
                "trip.",
                "fleet.",
                "manifest.",
                "dispatch.",
                "doorstep.",
                "crm.",
                "invoice.request.",
                "invoice.excess.",
                "invoice.correction.",
                "phone.invite",
                "phone.revoke",
              ].some((p) => action.startsWith(p))
            ) {
              const fingerprint = JSON.stringify(data);
              if (pendingOperation.current?.fingerprint !== fingerprint)
                pendingOperation.current = { fingerprint, key: randomUUID() };
              data.operationKey = pendingOperation.current!.key;
            }
            const r = await api(action, data);
            pendingOperation.current = null;
            if (draftKey) await SecureStore.deleteItemAsync(draftKey);
            if (mounted.current) {
              setMessage(r.message ?? "Saved successfully.");
              onDone?.();
            }
          } catch (e: any) {
            if (mounted.current) setMessage(e.message);
          } finally {
            if (mounted.current) setBusy(false);
          }
        }}
      >
        <Text style={s.buttonText}>{busy ? "Saving…" : "Continue"}</Text>
      </Pressable>
    </View>
  );
}
export default function Workflows({
  api,
  screen,
}: {
  api: API;
  screen: string;
}) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);
  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    const load = async () => {
      if (screen === "notifications") return api("me");
      if (screen === "profile") return api("account.profile");
      if (screen === "conversations") return api("support.list");
      if (screen === "consumption")
        return {
          profiles: await api("refill.profiles"),
          catalogue: await api("catalogue"),
        };
      if (screen === "credit")
        return {
          wallet: await api("wallet"),
          program: await api("rewards.program"),
          credits: await api("credits"),
        };
      if (screen === "recurring")
        return {
          plans: await api("schedules"),
          authorisations: await api("schedule.authorisations"),
          catalogue: await api("catalogue"),
        };
      if (screen === "plans")
        return {
          plans: await api("schedules"),
          catalogue: await api("catalogue"),
        };
      return {};
    };
    load()
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [screen, version]);
  if (error) return <Text style={s.body}>{error}</Text>;
  if (!data) return <EasyGasLoader color="#087a36" />;
  if (screen === "notifications")
    return (
      <>
        <Text style={s.title}>Your notifications</Text>
        {data.notifications.length ? (
          data.notifications.map((n: any) => (
            <View style={s.card} key={n.id}>
              <Text style={s.heading}>
                {n.title}
                {n.read_at ? "" : " · Unread"}
              </Text>
              <Text style={s.body}>{n.body}</Text>
              <Text style={s.body}>
                {new Date(n.created_at).toLocaleString()}
              </Text>
              {!n.read_at && (
                <NativeForm
                  api={api}
                  action="notifications.read"
                  title="Mark notification read"
                  fields={[
                    { name: "id", label: "", type: "hidden", value: n.id },
                  ]}
                  onDone={reload}
                />
              )}
            </View>
          ))
        ) : (
          <Text style={s.body}>
            You're all caught up. Order updates, reminders and support replies
            will appear here.
          </Text>
        )}
      </>
    );
  if (screen === "recovery")
    return (
      <>
        <Text style={s.title}>Account recovery</Text>
        <NativeForm
          api={api}
          action="account.recover"
          title="Request a recovery email"
          fields={[{ name: "email", label: "Account email" }]}
        />
        <NativeForm
          api={api}
          action="account.reset"
          title="Reset with your email token"
          fields={[
            { name: "token", label: "Secure token" },
            {
              name: "password",
              label: "New password (at least 12 characters)",
              type: "password",
            },
          ]}
        />
        <Text style={s.body}>
          Email is queued for local preview by the installation operator.
          External delivery is unconnected.
        </Text>
      </>
    );
  if (screen === "profile")
    return (
      <>
        <Text style={s.title}>Account & privacy</Text>
        <NativeForm
          api={api}
          action="account.update"
          title="Your profile"
          fields={[{ name: "name", label: "Full name", value: data.user.name }]}
          onDone={reload}
        />
        <Text style={s.body}>
          {data.user.email} · {data.user.verified ? "Verified" : "Unverified"}
        </Text>
        {!data.user.verified && (
          <>
            <NativeForm
              api={api}
              action="account.verification.send"
              title="Queue verification email"
              fields={[]}
            />
            <NativeForm
              api={api}
              action="account.verify"
              title="Verify email token"
              fields={[{ name: "token", label: "Secure email token" }]}
              onDone={reload}
            />
          </>
        )}
        <NativeForm
          api={api}
          action="account.password"
          title="Change password and sign out"
          fields={[
            {
              name: "currentPassword",
              label: "Current password",
              type: "password",
            },
            {
              name: "newPassword",
              label: "New password (12+ characters)",
              type: "password",
            },
          ]}
        />
        <Text style={s.heading}>Saved addresses</Text>
        {data.addresses.map((a: any) => (
          <View style={s.card} key={a.id}>
            <Text>
              {a.label} · {a.street}, {a.zone}{" "}
              {a.location_available ? "" : " · Location unavailable"}{" "}
              {a.is_default ? " · Default" : ""}
            </Text>
            <NativeForm
              api={api}
              action="address.default"
              title="Use as default address"
              fields={[
                { name: "id", type: "hidden", label: "Address", value: a.id },
              ]}
              onDone={reload}
            />
            <NativeForm
              api={api}
              action="address.save"
              title="Edit address"
              fields={[
                { name: "id", type: "hidden", label: "Address", value: a.id },
                { name: "label", label: "Label", value: a.label },
                { name: "street", label: "Street", value: a.street },
                {
                  name: "locationId",
                  label: "Delivery location",
                  value: a.location_id,
                  options: data.deliveryLocations.map((l: any) => ({
                    value: l.id,
                    label: l.name,
                  })),
                },
                { name: "phone", label: "Recipient phone", value: a.phone },
                {
                  name: "building",
                  label: "House / building number",
                  value: a.details?.building,
                },
              ]}
              onDone={reload}
            />
            <NativeForm
              api={api}
              action="address.archive"
              title="Remove this address"
              fields={[
                {
                  name: "id",
                  type: "hidden",
                  label: "Address ID",
                  value: a.id,
                },
              ]}
              onDone={reload}
            />
          </View>
        ))}
        <NativeForm
          api={api}
          action="address.save"
          title="Add address"
          fields={[
            { name: "label", label: "Label" },
            { name: "street", label: "Street address" },
            {
              name: "locationId",
              label: "Delivery location",
              options: data.deliveryLocations.map((l: any) => ({
                value: l.id,
                label: l.name,
              })),
            },
            { name: "building", label: "Building / house number" },
            { name: "landmark", label: "Estate / landmark" },
            { name: "directions", label: "Additional directions" },
            {
              name: "isDefault",
              label: "Default delivery address",
              type: "checkbox",
            },
            { name: "phone", label: "Mobile number" },
          ]}
          onDone={reload}
        />
        <NativeForm
          api={api}
          action="preferences.save"
          title="Communication preferences"
          fields={[
            {
              name: "marketing",
              label: "Marketing messages",
              type: "checkbox",
              value: data.preferences.marketing,
            },
            {
              name: "refillReminders",
              label: "Refill reminders",
              type: "checkbox",
              value: data.preferences.refill_reminders,
            },
            {
              name: "serviceReminders",
              label: "Service follow-up reminders",
              type: "checkbox",
              value: data.preferences.service_reminders ?? true,
            },
            {
              name: "quietStart",
              label: "Quiet start hour (0–23, Lagos)",
              type: "number",
              value: data.preferences.quiet_start,
            },
            {
              name: "quietEnd",
              label: "Quiet end hour (0–23, Lagos)",
              type: "number",
              value: data.preferences.quiet_end,
            },
          ]}
          onDone={reload}
        />
        {data.sessions.map((session: any) => (
          <NativeForm
            key={session.id}
            api={api}
            action="account.session.revoke"
            title={
              session.current
                ? "Sign out this session"
                : "Revoke another session"
            }
            fields={[
              {
                name: "id",
                type: "hidden",
                label: "Session reference",
                value: session.id,
              },
            ]}
            onDone={reload}
          />
        ))}
        <NativeForm
          api={api}
          action="reauth"
          title="Verify password for privacy request"
          fields={[{ name: "password", label: "Password", type: "password" }]}
        />
        <NativeForm
          api={api}
          action="privacy.request"
          title="Privacy request"
          fields={[
            {
              name: "kind",
              label: "Request type",
              value: "export",
              options: [
                { value: "export", label: "Export my data" },
                { value: "deletion", label: "Review account deletion" },
              ],
            },
            { name: "reason", label: "Reason and details" },
          ]}
          onDone={reload}
        />
      </>
    );
  if (screen === "conversations")
    return (
      <>
        <Text style={s.title}>Support conversations</Text>
        <NativeForm
          api={api}
          action="support.create"
          title="New request"
          fields={[
            { name: "subject", label: "Subject" },
            { name: "message", label: "Message" },
          ]}
          onDone={reload}
        />
        {data.map((t: any) => (
          <View style={s.card} key={t.id}>
            <Text style={s.heading}>
              {t.subject} · {t.status}
            </Text>
            <Text style={s.body}>{t.message}</Text>
            {t.messages.map((m: any) => (
              <View key={m.id} style={s.message}>
                <Text>{m.author}</Text>
                <Text style={s.body}>{m.body}</Text>
              </View>
            ))}
            {t.status !== "closed" && (
              <NativeForm
                api={api}
                action="support.reply"
                title="Reply"
                fields={[
                  {
                    name: "id",
                    type: "hidden",
                    label: "Request reference",
                    value: t.id,
                  },
                  { name: "body", label: "Message" },
                ]}
                onDone={reload}
              />
            )}
          </View>
        ))}
      </>
    );
  if (screen === "consumption")
    return (
      <>
        <Text style={s.title}>Cooking gas profiles</Text>
        <Text style={s.body}>
          Estimates use verified single-cylinder purchases. They are not sensor
          readings.
        </Text>
        {data.profiles.map((p: any) => (
          <View style={s.card} key={p.id}>
            <Text style={s.heading}>
              {p.label} · {p.product_name}
            </Text>
            <Text style={s.body}>{p.forecast.reason}</Text>
            {p.forecast.available && (
              <Text>
                {p.forecast.estimatedPercent}% estimated remaining ·{" "}
                {p.forecast.daysLeft} days
              </Text>
            )}
            <NativeForm
              api={api}
              action="refill.feedback"
              title="Update your gas supply"
              fields={[
                {
                  name: "profileId",
                  type: "hidden",
                  label: "Profile reference",
                  value: p.id,
                },
                {
                  name: "state",
                  label: "Current gas supply",
                  value: "low",
                  options: [
                    { value: "still_available", label: "Still available" },
                    { value: "low", label: "Running low" },
                    { value: "empty", label: "Empty" },
                  ],
                },
              ]}
              onDone={reload}
            />
          </View>
        ))}
        <NativeForm
          api={api}
          action="refill.profile.create"
          title="Add cooking profile"
          fields={[
            {
              name: "productId",
              label: "Refill size",
              value: "refill-6",
              options: data.catalogue.products
                .filter((p: any) => p.category === "Gas refills")
                .map((p: any) => ({ value: p.id, label: p.name })),
            },
            { name: "label", label: "Profile name" },
            {
              name: "householdSize",
              label: "People served",
              type: "number",
              value: 1,
            },
            {
              name: "cookingDays",
              label: "Cooking days per week",
              type: "number",
              value: 7,
            },
          ]}
          onDone={reload}
        />
      </>
    );
  if (screen === "recurring")
    return (
      <>
        <Text style={s.title}>Recurring COD orders</Text>
        <Text style={s.body}>
          Authorise a refill plan within your maximum total. No electronic debit
          is authorised. Pausing or revoking prevents future generation.
        </Text>
        <NativeForm
          api={api}
          action="reauth"
          title="Verify your identity"
          fields={[{ name: "password", label: "Password", type: "password" }]}
        />
        <NativeForm
          api={api}
          action="schedule.authorise"
          title="Authorise a plan"
          fields={[
            {
              name: "scheduleId",
              label: "Active plan",
              options: data.plans
                .filter(
                  (p: any) =>
                    p.status === "active" &&
                    !data.authorisations.some(
                      (a: any) => a.schedule_id === p.id,
                    ),
                )
                .map((p: any) => ({
                  value: p.id,
                  label: `${p.product_name} · every ${p.interval_days} days`,
                })),
            },
            { name: "address.name", label: "Recipient name" },
            { name: "address.phone", label: "Nigerian mobile number" },
            { name: "address.street", label: "Street address" },
            {
              name: "address.zone",
              label: "Delivery area",
              options: data.catalogue.zones.map((z: string) => ({
                value: z,
                label: z,
              })),
            },
            {
              name: "window",
              label: "Delivery window",
              options: data.catalogue.windows.map((w: string) => ({
                value: w,
                label: w,
              })),
            },
            { name: "quantity", label: "Quantity", type: "number", value: 1 },
            {
              name: "maximumTotalKobo",
              label: "Maximum total including delivery (kobo)",
              type: "number",
            },
            {
              name: "consent",
              label:
                "I authorise recurring cash-on-delivery orders within this maximum total and can revoke authorisation.",
              type: "checkbox",
            },
          ]}
          onDone={reload}
        />
        {data.authorisations.map((a: any) => (
          <View style={s.card} key={a.id}>
            <Text style={s.heading}>
              {a.product_id} · {a.active ? "Authorised" : "Revoked"}
            </Text>
            <Text style={s.body}>
              Maximum ₦{Number(a.maximum_total_kobo) / 100} per order
            </Text>
            {a.active && (
              <NativeForm
                api={api}
                action="schedule.revoke"
                title="Revoke future generation"
                fields={[
                  { name: "id", label: "", type: "hidden", value: a.id },
                ]}
                onDone={reload}
              />
            )}
            <NativeForm
              api={api}
              action="schedule.reschedule"
              title="Choose a new date"
              fields={[
                { name: "id", label: "", type: "hidden", value: a.schedule_id },
                { name: "nextDate", label: "Future date (YYYY-MM-DD)" },
              ]}
              onDone={reload}
            />
          </View>
        ))}
      </>
    );
  if (screen === "plans")
    return (
      <>
        <CustomerTitle>Refill Plan</CustomerTitle>
        <Text style={s.body}>
          Plans remind you to order; they never charge or dispatch
          automatically.
        </Text>
        {data.plans.length === 0 && (
          <CustomerCard>
            <CustomerCopy>
              No active refill plan. Create a reminder below; no payment or
              dispatch is automatic.
            </CustomerCopy>
          </CustomerCard>
        )}
        {data.plans.map((plan: any) => (
          <CustomerCard key={plan.id} accent>
            <CustomerTitle>
              {plan.status === "active" ? "Active Plan" : plan.status}
            </CustomerTitle>
            <CustomerCopy>
              {plan.product_name} · Every {plan.interval_days} days
            </CustomerCopy>
            <CustomerCopy>
              Next reminder: {String(plan.next_date).slice(0, 10)}
            </CustomerCopy>
          </CustomerCard>
        ))}
        <NativeForm
          api={api}
          action="schedule.create"
          title="Create refill plan"
          fields={[
            {
              name: "productId",
              label: "Refill size",
              value: "refill-6",
              options: data.catalogue.products
                .filter((p: any) => p.category === "Gas refills" && p.published)
                .map((p: any) => ({ value: p.id, label: p.name })),
            },
            {
              name: "intervalDays",
              label: "Interval: 7, 14, 28 or 42 days",
              type: "number",
              value: 28,
            },
            { name: "nextDate", label: "Next date (YYYY-MM-DD)" },
          ]}
          onDone={reload}
        />
        {data.plans.map((p: any) => (
          <NativeForm
            key={p.id}
            api={api}
            action="schedule.update"
            title={`${p.product_name} · ${p.status}`}
            fields={[
              {
                name: "id",
                type: "hidden",
                label: "Plan reference",
                value: p.id,
              },
              {
                name: "status",
                label: "Plan status",
                value: p.status === "active" ? "paused" : "active",
                options: [
                  { value: "active", label: "Active" },
                  { value: "paused", label: "Paused" },
                  { value: "cancelled", label: "Cancelled" },
                ],
              },
            ]}
            onDone={reload}
          />
        ))}
      </>
    );
  return (
    <>
      <Text style={s.title}>Purchase credit & rewards</Text>
      <View style={s.card}>
        <Text style={s.heading}>
          ₦{(Number(data.wallet.balanceKobo) / 100).toLocaleString()} ·{" "}
          {data.wallet.points} points
        </Text>
        <Text style={s.body}>
          {data.program.enabled ? "Rewards enabled" : "Rewards disabled"} ·{" "}
          {data.program.walletEnabled
            ? "Wallet spending enabled"
            : "Wallet spending disabled"}
        </Text>
      </View>
      <Text style={s.body}>
        Points are separate from purchase credit. Point-to-wallet conversion is
        closed. Checkout discounts require an approved policy.
      </Text>
      {data.credits.map((c: any) => (
        <Text style={s.body} key={c.id}>
          {c.kind} · ₦{Number(c.amount_kobo) / 100} · {c.status}
        </Text>
      ))}
      <Text style={s.body}>
        External payments, transfers and withdrawals remain unconnected.
      </Text>
    </>
  );
}
const s = StyleSheet.create({
  title: {
    fontSize: 25,
    fontWeight: "800",
    color: "#10251c",
    marginVertical: 15,
  },
  heading: {
    fontSize: 15,
    fontWeight: "700",
    color: "#10251c",
    marginBottom: 10,
  },
  card: {
    padding: 18,
    borderWidth: 1,
    borderColor: "#e2e8da",
    borderRadius: 15,
    marginVertical: 10,
  },
  body: { fontSize: 15, lineHeight: 24, color: "#586954", marginVertical: 8 },
  label: { fontSize: 15, color: "#24361f", marginTop: 9, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8da",
    borderRadius: 10,
    padding: 13,
    color: "#142c20",
    backgroundColor: "#fcfdf9",
  },
  button: {
    backgroundColor: "#087a36",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 15,
  },
  buttonText: { color: "white", fontWeight: "700" },
  message: {
    backgroundColor: "#f1f7ed",
    padding: 12,
    borderRadius: 10,
    marginVertical: 7,
  },
});
