import React from "react";
import { View, Image, ScrollView, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FieldCaption, Text, TextInput } from "./typography";
import { useTheme } from "./theme";
import { Card, Copy, Title, Button, Feedback } from "./CustomerUI";
import { NativeForm } from "./Workflows";
export default function DriverSignIn({
  identifier,
  password,
  setIdentifier,
  setPassword,
  submit,
  busy,
  error,
  recover,
  setRecover,
  api,
  signout,
  passwordChangeRequired,
  newPassword,
  setNewPassword,
}: {
  identifier: string;
  password: string;
  setIdentifier: (v: string) => void;
  setPassword: (v: string) => void;
  submit: () => void;
  busy: boolean;
  error: string;
  recover: boolean;
  setRecover: (v: boolean) => void;
  api: any;
  signout?: () => void;
  passwordChangeRequired: boolean;
  newPassword: string;
  setNewPassword: (v: string) => void;
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
              fields={[{ name: "email", label: "Registered work email", value: identifier.includes("@") ? identifier : "", type: "email" }]}
            />
            <Copy>Open the link in your email to set a new password, then return here to sign in.</Copy>
            <Button
              label="Back to Driver Sign In"
              secondary
              onPress={() => setRecover(false)}
            />
          </>
        ) : (
          <>
            <FieldCaption required={true}>Email or phone number</FieldCaption>
            <TextInput
              accessibilityLabel="Email or phone number, required"
              autoComplete="username"
              keyboardType="default"
              autoCorrect={false}
              autoCapitalize="none"
              value={identifier}
              onChangeText={setIdentifier}
              placeholder="Email or phone number"
              style={{
                padding: 15,
                borderWidth: 1,
                borderColor: colors.border,
                color: colors.text,
                backgroundColor: colors.input,
                borderRadius: 14,
              }}
            />
            <FieldCaption required={true}>Password</FieldCaption>
            <TextInput
              accessibilityLabel="Driver password, required"
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
            {passwordChangeRequired && (
              <>
                <Copy>Choose a new password to finish your first sign-in.</Copy>
                <FieldCaption required={true}>New password</FieldCaption>
                <TextInput
                  accessibilityLabel="New password, required"
                  autoComplete="new-password"
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="New password"
                  style={{
                    padding: 15,
                    borderWidth: 1,
                    borderColor: colors.border,
                    color: colors.text,
                    backgroundColor: colors.input,
                    borderRadius: 14,
                  }}
                />
              </>
            )}
            <Button
              label={busy ? "Signing in…" : passwordChangeRequired ? "Change Password & Sign In" : "Sign In"}
              disabled={busy || !identifier || !password}
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
