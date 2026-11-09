import React from "react";
import { View, Image, ScrollView, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, TextInput } from "./typography";
import { useTheme } from "./theme";
import { Card, Copy, Title, Button, Feedback } from "./CustomerUI";
import { NativeForm } from "./Workflows";
export default function DriverSignIn({
  email,
  password,
  setEmail,
  setPassword,
  submit,
  busy,
  error,
  recover,
  setRecover,
  api,
  signout,
}: {
  email: string;
  password: string;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
  submit: () => void;
  busy: boolean;
  error: string;
  recover: boolean;
  setRecover: (v: boolean) => void;
  api: any;
  signout?: () => void;
}) {
  const { colors, dark } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar barStyle={dark ? "light-content" : "dark-content"} />
      <ScrollView
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 24,
          gap: 18,
          flexGrow: 1,
          justifyContent: "center",
          width: "100%",
          maxWidth: 600,
          alignSelf: "center",
        }}
      >
        <Image
          source={require("./assets/easygas-logo-hd.png")}
          resizeMode="contain"
          accessibilityLabel="EasyGas Energy Solutions Driver App"
          style={{
            width: 250,
            height: 100,
            alignSelf: "center",
            backgroundColor: colors.surface,
            borderRadius: 18,
          }}
        />
        <Title>{recover ? "Driver Account Recovery" : "Driver Sign In"}</Title>
        <Feedback error={error} />
        {signout ? (
          <Button
            label="Sign out of this non-driver session"
            onPress={signout}
          />
        ) : recover ? (
          <>
            <NativeForm
              api={api}
              action="account.recover"
              title="Request secure recovery"
              fields={[{ name: "email", label: "Registered work email" }]}
            />
            <Button
              label="Back to Driver Sign In"
              secondary
              onPress={() => setRecover(false)}
            />
          </>
        ) : (
          <>
            <Copy>
              Use your existing EasyGas driver work email and password. Driver
              ID/phone-only login is not configured in this delivery app.
            </Copy>
            <TextInput
              accessibilityLabel="Driver work email"
              autoComplete="email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              placeholder="Driver work email"
              style={{
                padding: 15,
                borderWidth: 1,
                borderColor: colors.border,
                color: colors.text,
                backgroundColor: colors.input,
                borderRadius: 14,
              }}
            />
            <TextInput
              accessibilityLabel="Driver password"
              autoComplete="current-password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              style={{
                padding: 15,
                borderWidth: 1,
                borderColor: colors.border,
                color: colors.text,
                backgroundColor: colors.input,
                borderRadius: 14,
              }}
            />
            <Button
              label={busy ? "Signing in…" : "Sign In"}
              disabled={busy || !email || !password}
              onPress={submit}
            />
            <Button
              label="Forgot Password?"
              secondary
              onPress={() => setRecover(true)}
            />
          </>
        )}
        <Copy>
          Delivery only · no sales, wallet, cash collection or stock editing.
        </Copy>
      </ScrollView>
    </SafeAreaView>
  );
}
