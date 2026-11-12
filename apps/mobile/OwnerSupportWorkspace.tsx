import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, StyleSheet } from "react-native";
import { View, Pressable } from "./surfaces";
import { Text, TextInput } from "./typography";
import { useTheme, type Preference } from "./theme";
import { EasyGasLoader } from "./EasyGasLoader";
import { PASSWORD_MIN_LENGTH } from "../../packages/business-rules/src/password-policy";

type API = (action: string, data?: any) => Promise<any>;
type Owner = { id: string; role: string; name?: string; email?: string };
type Props = {
  user: Owner;
  screen: "owner-profile" | "owner-notifications";
  api: API;
  navigate: (screen: string) => void;
  signOut: () => Promise<void>;
};
type Nav = {
  user?: { id?: string; role?: string };
  allowed?: string[];
  notifications?: NoticeRow[];
  generatedAt?: string;
};
type NoticeRow = {
  id: string;
  title: string;
  body: string;
  read_at?: string | null;
  created_at: string;
  href?: string | null;
};
function friendly(error: unknown) {
  return error instanceof Error ? error.message : "Unable to connect. Try again.";
}
function lagosTime(value?: string | null) {
  if (!value) return "Unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unavailable"
    : date.toLocaleString("en-NG", { timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short" });
}
/** This component never grants access. The existing API validates the owner session and all mutations. */
export default function OwnerSupportWorkspace({ user, screen, api, navigate, signOut }: Props) {
  const apiRef = useRef(api);
  apiRef.current = api;
  const { colors, preference, setPreference } = useTheme();
  const [snapshot, setSnapshot] = useState<Nav | null>(null);
  const [profile, setProfile] = useState<{ name: string; email: string; verified?: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState("");
  const [lastConfirmed, setLastConfirmed] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const mounted = useRef(true);
  const editingNameRef = useRef(false);
  editingNameRef.current = editingName;
  const inFlight = useRef(false);
  const revoked = useRef(false);
  const surface = colors.surface;
  const text = colors.text;
  const muted = colors.muted;

  const load = useCallback(async () => {
    if (inFlight.current || revoked.current) return;
    inFlight.current = true;
    setLoading(true);
    try {
      // Check the effective role before fetching any owner-sensitive information.
      const nav: Nav = await apiRef.current("navigation");
      if (!mounted.current) return;
      if (nav.user?.id !== user.id || nav.user?.role !== "owner") {
        revoked.current = true;
        setDenied(true);
        setSnapshot(null);
        setProfile(null);
        setError("Your Business Owner access has changed. Sign out and sign back in to refresh your workspace.");
        return;
      }
      const nextProfile = screen === "owner-profile" ? await apiRef.current("account.profile") : null;
      if (!mounted.current || revoked.current) return;
      setSnapshot(nav);
      if (nextProfile) {
        setProfile(nextProfile.user);
        if (!editingNameRef.current) setName(nextProfile.user.name ?? "");
      }
      setLastConfirmed(nav.generatedAt ?? new Date().toISOString());
      setStale(false);
      setError("");
      setDenied(false);
    } catch (e: any) {
      if (!mounted.current) return;
      if (e?.status === 401 || e?.status === 403) {
        revoked.current = true;
        setDenied(true);
        setSnapshot(null);
        setProfile(null);
      } else {
        setStale(true);
      }
      setError(friendly(e));
    } finally {
      inFlight.current = false;
      if (mounted.current) setLoading(false);
    }
  }, [screen, user.id]);

  useEffect(() => {
    mounted.current = true;
    revoked.current = false;
    setSnapshot(null);
    setProfile(null);
    setLastConfirmed(null);
    setStale(false);
    setDenied(false);
    setError("");
    void load();
    const listener = AppState.addEventListener("change", state => {
      if (state === "active") void load();
    });
    return () => {
      mounted.current = false;
      listener.remove();
    };
  }, [load]);

  useEffect(() => {
    if (!stale || denied || busy) return;
    const retry = setInterval(() => {
      if (AppState.currentState === "active") void load();
    }, 15_000);
    return () => clearInterval(retry);
  }, [busy, denied, load, stale]);

  async function saveName() {
    if (!profile || busy || loading || denied || stale || name.trim().length < 2 || name.trim().length > 100) return;
    setBusy(true); setFeedback("");
    try {
      await apiRef.current("account.update", { name: name.trim() });
      await load();
      if (mounted.current) { setEditingName(false); setFeedback("Your name was updated."); }
    } catch (e) { if (mounted.current) setFeedback(friendly(e)); }
    finally { if (mounted.current) setBusy(false); }
  }
  async function changePassword() {
    if (busy || loading || denied || stale || !currentPassword || newPassword.length < PASSWORD_MIN_LENGTH || newPassword !== confirmPassword) return;
    setBusy(true); setFeedback("");
    try {
      // The server revokes all sessions; App.tsx handles signedOut and returns to sign-in.
      await apiRef.current("account.password", { currentPassword, newPassword });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setFeedback("Password updated. Sign in again to continue.");
    } catch (e) { if (mounted.current) setFeedback(friendly(e)); }
    finally { if (mounted.current) setBusy(false); }
  }
  async function markRead(id: string) {
    if (busy || loading || denied || stale) return;
    setBusy(true); setFeedback("");
    try {
      await apiRef.current("notifications.read", { id });
      await load();
    } catch (e) { if (mounted.current) setFeedback(friendly(e)); }
    finally { if (mounted.current) setBusy(false); }
  }
  async function chooseAppearance(value: Preference) {
    try { await setPreference(value); setFeedback(""); }
    catch (e) { setFeedback(friendly(e)); }
  }
  const block = (children: React.ReactNode, key?: string) => (
    <View key={key} style={[s.card, { backgroundColor: surface, borderColor: colors.border }]}>{children}</View>
  );
  const label = (title: string, value: string) => (
    <View style={s.field}><Text style={{ color: muted }}>{title}</Text><Text style={{ color: text, fontWeight: "700" }}>{value}</Text></View>
  );
  const button = (title: string, onPress: () => void, disabled = false) => (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} onPress={onPress} disabled={disabled}
      style={[s.button, { backgroundColor: colors.button, opacity: disabled ? .45 : 1 }]}>
      <Text style={{ color: colors.onButton, fontWeight: "800", textAlign: "center" }}>{title}</Text>
    </Pressable>
  );
  const input = (title: string, value: string, update: (v: string) => void, secure = false) => (
    <View style={s.field}>
      <Text style={{ color: text, fontWeight: "700" }}>{title}</Text>
      <TextInput accessibilityLabel={title} value={value} onChangeText={update} secureTextEntry={secure}
        autoCapitalize="none" style={[s.input, { borderColor: colors.border, color: text, backgroundColor: colors.input }]} />
    </View>
  );
  const notices = snapshot?.notifications ?? [];
  return (
    <View style={s.wrap}>
      <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "800", letterSpacing: 1 }}>EASYGAS · BUSINESS OWNER</Text>
      <Text style={{ color: text, fontSize: 25, fontWeight: "800" }}>
        {screen === "owner-profile" ? "Profile & Security" : "Notifications"}
      </Text>
      {lastConfirmed && <Text style={{ color: muted }}>Last confirmed refresh: {lagosTime(lastConfirmed)} (Lagos)</Text>}
      {stale && block(<Text accessibilityRole="alert" style={{ color: text }}>Offline or reconnecting. Information may be out of date. Sensitive actions are unavailable until the server responds.</Text>)}
      {error && block(<><Text accessibilityRole="alert" style={{ color: colors.error }}>{error}</Text>{!denied ? button("Retry connection", () => { void load(); }) : button("Sign out", () => { void signOut(); })}</>)}
      {loading && !snapshot && !denied && <EasyGasLoader color={colors.primary} />}
      {feedback && block(<Text accessibilityRole="alert" style={{ color: text }}>{feedback}</Text>)}
      {snapshot && !denied && screen === "owner-notifications" && <>
        {notices.length ? notices.map(item => block(
          <View key={item.id} style={s.field}>
            <Text style={{ color: text, fontWeight: "800", fontSize: 16 }}>{item.title}{!item.read_at ? " · Unread" : ""}</Text>
            <Text style={{ color: text }}>{item.body}</Text>
            <Text style={{ color: muted }}>{lagosTime(item.created_at)}</Text>
            {!item.read_at && button("Mark as read", () => { void markRead(item.id); }, busy || loading || stale)}
            {item.href && <Text style={{ color: muted }}>Open the related order from your web workspace.</Text>}
          </View>, item.id
        )) : block(<Text style={{ color: muted }}>You're all caught up. New authorised alerts will appear here.</Text>)}
      </>}
      {snapshot && !denied && screen === "owner-profile" && <>
        {block(<>
          <Text style={[s.heading, { color: text }]}>Your account</Text>
          {label("Name", profile?.name ?? user.name ?? "Unavailable")}
          {label("Email", profile?.email ?? user.email ?? "Unavailable")}
          {label("Verification", profile ? (profile.verified ? "Verified" : "Not verified") : "Unavailable")}
          {!editingName ? button("Edit name", () => setEditingName(true), stale) : <>
            {input("Full name", name, setName)}
            {name.trim().length < 2 && <Text style={{ color: colors.error }}>Enter at least two characters.</Text>}
            {button(busy ? "Saving…" : "Save name", () => { void saveName(); }, busy || loading || stale || name.trim().length < 2 || name.trim().length > 100)}
            {button("Cancel", () => { setEditingName(false); setName(profile?.name ?? ""); })}
          </>}
        </>)}
        {block(<>
          <Text style={[s.heading, { color: text }]}>Appearance</Text>
          <Text style={{ color: muted }}>Follow your device or select an appearance.</Text>
          {(["system", "light", "dark"] as const).map(v => (
            <Pressable key={v} accessibilityRole="radio" accessibilityState={{ selected: preference === v }}
              style={[s.option, { borderColor: colors.border }]} onPress={() => { void chooseAppearance(v); }}>
              <Text style={{ color: text }}>{v === "system" ? "System default" : v === "light" ? "Light" : "Dark"}</Text>
              <Text style={{ color: colors.primary }}>{preference === v ? "Selected" : "Choose"}</Text>
            </Pressable>
          ))}
        </>)}
        {block(<>
          <Text style={[s.heading, { color: text }]}>Security</Text>
          <Text style={{ color: muted }}>Changing your password signs out all existing sessions.</Text>
          {!changingPassword ? button("Change password", () => setChangingPassword(true), stale) : <>
            {input("Current password", currentPassword, setCurrentPassword, true)}
            {input("New password", newPassword, setNewPassword, true)}
            {input("Confirm new password", confirmPassword, setConfirmPassword, true)}
            {newPassword.length > 0 && newPassword.length < PASSWORD_MIN_LENGTH && <Text style={{ color: colors.error }}>Use at least {PASSWORD_MIN_LENGTH} characters.</Text>}
            {confirmPassword && newPassword !== confirmPassword && <Text style={{ color: colors.error }}>Passwords do not match.</Text>}
            {button(busy ? "Updating…" : "Update password and sign out", () => { void changePassword(); },
              busy || loading || stale || !currentPassword || newPassword.length < PASSWORD_MIN_LENGTH || newPassword !== confirmPassword)}
            {button("Cancel", () => { setChangingPassword(false); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); })}
          </>}
        </>)}
        {button("View notifications", () => navigate("owner-notifications"))}
        {button("Sign out", () => { void signOut(); })}
      </>}
    </View>
  );
}
const s = StyleSheet.create({
  wrap: { gap: 12, width: "100%", paddingBottom: 24 },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
  heading: { fontSize: 17, fontWeight: "800" },
  field: { gap: 5 },
  button: { minHeight: 48, borderRadius: 12, justifyContent: "center", paddingHorizontal: 16, paddingVertical: 12 },
  input: { borderWidth: 1, borderRadius: 12, minHeight: 48, padding: 12, fontSize: 16 },
  option: { minHeight: 48, padding: 12, borderWidth: 1, borderRadius: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
