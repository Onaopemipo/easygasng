import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { AuthShell, AuthAction, AuthField } from "./AuthPresentation";
import { Text } from "./typography";
import { useTheme } from "./theme";
import { friendlyMessage } from "../../packages/business-rules/src/friendly-message";
export default function AuthRecovery({
  api,
  onBack,
}: {
  api: (a: string, d?: any) => Promise<any>;
  onBack: () => void;
}) {
  const { colors } = useTheme(),
    [sent, setSent] = useState(false),
    [email, setEmail] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const pending = useRef(false),
    live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  async function send() {
    if (pending.current) return;
    if (!email.trim()) {
      setError("Enter your account email.");
      return;
    }
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await api("account.recover", { email });
      if (live.current) setSent(true);
    } catch (e) {
      if (live.current) setError(friendlyMessage(e));
    } finally {
      pending.current = false;
      if (live.current) setBusy(false);
    }
  }
  return (
    <AuthShell
      mode="recovery"
      title="Account recovery."
      description="We’ll send a password reset link to your email so you can regain access to your EasyGas account."
      onBack={onBack}
    >
      {sent ? (
        <Text
          accessible
          accessibilityLiveRegion="polite"
          style={{ color: colors.text }}
        >
          If an account exists for that email, follow the reset instructions
          sent to you.
        </Text>
      ) : (
        <>
          <AuthField
            label="Email address"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            autoCorrect={false}
            autoCapitalize="none"
            maxLength={200}
            placeholder="Enter your account email"
            editable={!busy}
            returnKeyType="send"
            onSubmitEditing={send}
          />
          {error ? (
            <Text accessibilityRole="alert" style={{ color: colors.error }}>
              {error}
            </Text>
          ) : null}
          <AuthAction
            label={busy ? "Sending…" : "Send Reset Link"}
            onPress={send}
            disabled={busy}
          />
        </>
      )}
      <View
        style={{
          padding: 16,
          borderRadius: 18,
          backgroundColor: colors.elevated,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text style={{ color: colors.text, fontSize: 14 }}>
          Open your reset link in EasyGas, or choose “Open an account link” on
          Sign In and paste the link from your email.
        </Text>
      </View>
      {sent && (
        <AuthAction
          label="Send another reset link"
          secondary
          onPress={() => setSent(false)}
        />
      )}
      <AuthAction
        label="Remember your password? Sign In"
        secondary
        onPress={onBack}
      />
    </AuthShell>
  );
}
