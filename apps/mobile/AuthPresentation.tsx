import React from "react";
import {
  Image,
  StyleSheet,
  View,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  type TextInputProps,
} from "react-native";
import Svg, { Defs, LinearGradient, Stop, Rect, Path } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { Text, TextInput } from "./typography";
import BrandLogo from "./BrandLogo";
import { useTheme } from "./theme";
import { PASSWORD_MIN_LENGTH } from "../../packages/business-rules/src/password-policy";

export function AuthKeyboardFrame({
  active = true,
  children,
}: {
  active?: boolean;
  children: React.ReactNode;
}) {
  if (!active || Platform.OS !== "android") return <>{children}</>;
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior="height"
    >
      {children}
    </KeyboardAvoidingView>
  );
}

export function AuthAction({
  label,
  onPress,
  secondary = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        secondary ? styles.textAction : styles.primary,
        { opacity: disabled ? 0.55 : 1 },
        secondary && { alignSelf: "center" },
      ]}
    >
      {!secondary && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Svg width="100%" height="100%" preserveAspectRatio="none">
            <Defs>
              <LinearGradient id="auth-button" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#078514" />
                <Stop offset="1" stopColor="#006112" />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" rx="18" fill="url(#auth-button)" />
          </Svg>
        </View>
      )}
      <Text
        style={{
          fontSize: 16,
          fontWeight: "700",
          color: secondary ? colors.primary : "#ffffff",
          textAlign: "center",
          flexShrink: 1,
          flex: secondary ? undefined : 1,
        }}
        preserveColor
      >
        {label}
      </Text>
      {!secondary && (
        <Ionicons name="arrow-forward" size={21} color="#ffffff" />
      )}
    </Pressable>
  );
}

export function AuthShell({
  mode,
  title,
  description,
  onBack,
  children,
}: {
  mode: "signin" | "register" | "recovery" | "link";
  title: string;
  description?: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  const { colors } = useTheme(),
    { height, fontScale } = useWindowDimensions();
  const largeText = fontScale > 1.15;
  const compact = height < 720 || largeText;
  const heroHeight =
    mode === "signin" ? (compact ? 250 : 310) : compact ? 175 : 235;
  return (
    <View
      style={{ width: "100%", flexGrow: 1, backgroundColor: colors.background }}
    >
      <View
        style={[
          styles.hero,
          {
            height: largeText && mode === "signin" ? undefined : heroHeight,
            minHeight: heroHeight,
            paddingBottom: largeText && mode === "signin" ? 52 : 0,
            backgroundColor: mode === "signin" ? "#003b2c" : colors.background,
          },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBack}
          style={styles.back}
        >
          <Ionicons
            name="arrow-back"
            size={23}
            color={mode === "signin" ? "#fff" : colors.text}
          />
        </Pressable>
        <View style={styles.logo}>
          <BrandLogo tone="brand" width={200} height={67} />
        </View>
        {mode === "signin" && (
          <View
            style={[
              styles.welcome,
              compact && { top: 104 },
              largeText && {
                position: "relative",
                top: undefined,
                left: undefined,
                right: undefined,
                marginTop: 24,
                paddingHorizontal: 22,
                width: "100%",
              },
            ]}
          >
            <Text
              accessibilityRole="header"
              style={{
                fontSize: 30,
                fontWeight: "800",
                color: "#fff",
                lineHeight: 36,
              }}
              preserveColor
            >
              {title}
            </Text>
            <Text
              style={{
                fontSize: 15,
                color: "#fff",
                maxWidth: largeText ? "100%" : "73%",
              }}
              preserveColor
            >
              {compact && mode === "signin"
                ? "Sign in to your EasyGas account."
                : description}
            </Text>
          </View>
        )}
        {mode === "recovery" || mode === "link" ? (
          <View
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[styles.envelope, compact && { bottom: 16 }]}
          >
            <Ionicons name="mail" size={compact ? 72 : 108} color="#087a36" />
            <View style={[styles.lock, compact && { padding: 8 }]}>
              <Ionicons
                name="lock-closed"
                size={compact ? 24 : 31}
                color="#07592e"
              />
            </View>
          </View>
        ) : !largeText ? (
          <View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[
              styles.cylinders,
              mode === "signin"
                ? { right: -20, width: 155, top: 95 }
                : { left: 70, right: 70, top: 85 },
            ]}
          >
            {mode === "register" && (
              <Image
                source={require("./assets/cylinder-illustration.png")}
                resizeMode="contain"
                style={{ width: "28%", height: "60%", alignSelf: "flex-end" }}
              />
            )}
            <Image
              source={require("./assets/cylinder-illustration.png")}
              resizeMode="contain"
              style={{
                width: mode === "register" ? "45%" : "100%",
                height: "100%",
              }}
            />
            {mode === "register" && (
              <Image
                source={require("./assets/cylinder-illustration.png")}
                resizeMode="contain"
                style={{ width: "34%", height: "78%", alignSelf: "flex-end" }}
              />
            )}
          </View>
        ) : null}
        <Svg
          width="100%"
          height={compact ? 32 : 54}
          viewBox="0 0 600 120"
          preserveAspectRatio="none"
          style={{ position: "absolute", bottom: 0 }}
          pointerEvents="none"
        >
          <Path
            fill="#d1f460"
            d="M0 60C140 130 200-30 360 55S510 85 600 28V120H0Z"
          />
          <Path
            fill="#91c900"
            fillOpacity=".65"
            d="M0 105C180 0 320 150 600 45V120H0Z"
          />
        </Svg>
      </View>
      <View style={[styles.panel, { backgroundColor: colors.surface }]}>
        <View
          style={{ width: "100%", maxWidth: 480, alignSelf: "center", gap: 16 }}
        >
          {mode !== "signin" && (
            <View style={{ gap: 8, marginBottom: 6 }}>
              <Text
                accessibilityRole="header"
                style={{ fontSize: 30, fontWeight: "800", color: colors.text }}
              >
                {title}
              </Text>
              {description && (
                <Text style={{ fontSize: 16, color: colors.muted }}>
                  {description}
                </Text>
              )}
            </View>
          )}
          {children}
        </View>
      </View>
    </View>
  );
}

export function AuthField({
  label,
  icon,
  ...props
}: TextInputProps & {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: colors.text, fontSize: 14, fontWeight: "700" }}>
        {label}
      </Text>
      <View style={{ position: "relative" }}>
        <TextInput
          {...props}
          accessibilityLabel={label}
          style={[
            styles.input,
            {
              backgroundColor: colors.input,
              borderColor: colors.border,
              color: colors.text,
            },
            props.style,
          ]}
        />
        <View
          pointerEvents="none"
          style={{ position: "absolute", left: 15, top: 16 }}
        >
          <Ionicons name={icon} size={21} color={colors.primary} />
        </View>
      </View>
    </View>
  );
}

export function NativeAuth({
  register,
  name,
  identifier,
  password,
  newPassword,
  passwordChangeRequired,
  error,
  busy,
  onName,
  onIdentifier,
  onPassword,
  onNewPassword,
  onSubmit,
  onSwitch,
  onRecovery,
  onLink,
  onPolicies,
  onInfo,
  onBack,
}: {
  register: boolean;
  name: string;
  identifier: string;
  password: string;
  newPassword: string;
  passwordChangeRequired: boolean;
  error: string;
  busy: boolean;
  onName: (s: string) => void;
  onIdentifier: (s: string) => void;
  onPassword: (s: string) => void;
  onNewPassword: (s: string) => void;
  onSubmit: () => void;
  onSwitch: () => void;
  onRecovery: () => void;
  onLink: () => void;
  onPolicies: () => void;
  onInfo: () => void;
  onBack: () => void;
}) {
  const { colors } = useTheme();
  return (
    <AuthShell
      mode={register ? "register" : "signin"}
      title={register ? "Create your account." : "Welcome back."}
      description={
        register
          ? "It’s quick and easy. Get access to gas delivery, services and more."
          : "Sign in to your EasyGas account and manage your orders, services and more."
      }
      onBack={onBack}
    >
      {!register && (
        <View style={[styles.segment, { backgroundColor: colors.elevated }]}>
          <View style={[styles.selectedSegment]}>
            <Ionicons name="person-outline" size={19} color="#fff" />
            <Text preserveColor style={{ color: "#fff", fontWeight: "700" }}>
              Sign In
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={onSwitch}
            disabled={busy}
            style={styles.segmentAction}
          >
            <Text style={{ color: colors.muted, fontWeight: "700" }}>
              Create Account
            </Text>
          </Pressable>
        </View>
      )}
      {register && (
        <AuthField
          label="Full name"
          icon="person-outline"
          value={name}
          onChangeText={onName}
          autoComplete="name"
          textContentType="name"
          maxLength={100}
          placeholder="Full name"
          editable={!busy}
        />
      )}
      <AuthField
        label={register ? "Email address" : "Email or phone number"}
        icon="mail-outline"
        value={identifier}
        onChangeText={onIdentifier}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete={register ? "email" : "username"}
        textContentType={register ? "emailAddress" : "username"}
        keyboardType={register ? "email-address" : "default"}
        placeholder={register ? "Email address" : "Enter your email or phone"}
        maxLength={200}
        editable={!busy}
      />
      <AuthField
        key={register ? "registration-password" : "sign-in-password"}
        label={passwordChangeRequired ? "Temporary password" : "Password"}
        icon="lock-closed-outline"
        value={password}
        onChangeText={onPassword}
        secureTextEntry
        autoComplete={register ? "new-password" : "current-password"}
        textContentType={register ? "newPassword" : "password"}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder={register ? "Create password" : "Enter your password"}
        maxLength={128}
        editable={!busy}
        returnKeyType="go"
        onSubmitEditing={onSubmit}
      />
      {passwordChangeRequired && (
        <>
          <Text style={{ color: colors.muted }}>
            Choose a new password to finish your first sign-in.
          </Text>
          <AuthField
            label="New password"
            icon="lock-closed-outline"
            value={newPassword}
            onChangeText={onNewPassword}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            maxLength={128}
            editable={!busy}
            onSubmitEditing={onSubmit}
          />
        </>
      )}
      {register ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{
            fontSize: 14,
            color:
              password.length >= PASSWORD_MIN_LENGTH
                ? colors.primary
                : colors.muted,
          }}
        >
          {password.length >= PASSWORD_MIN_LENGTH ? "✓" : "○"} At least{" "}
          {PASSWORD_MIN_LENGTH} characters. Maximum 128 characters.
        </Text>
      ) : (
        <View style={{ alignSelf: "flex-end", marginTop: -12 }}>
          <AuthAction
            label="Forgot password?"
            secondary
            onPress={onRecovery}
            disabled={busy}
          />
        </View>
      )}
      {error ? (
        <Text accessibilityRole="alert" style={{ color: colors.error }}>
          {error}
        </Text>
      ) : null}
      <AuthAction
        label={
          busy
            ? "Please wait…"
            : passwordChangeRequired
              ? "Change Password & Sign In"
              : register
                ? "Create Account"
                : "Sign In"
        }
        onPress={onSubmit}
        disabled={busy}
      />
      <AuthAction
        label={
          register
            ? "Already have an account? Sign In"
            : "New to EasyGas? Create an account"
        }
        secondary
        onPress={onSwitch}
        disabled={busy}
      />
      {register && (
        <AuthAction
          label="Forgot password?"
          secondary
          onPress={onRecovery}
          disabled={busy}
        />
      )}
      <AuthAction
        label="Open an account link"
        secondary
        onPress={onLink}
        disabled={busy}
      />
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <AuthAction label="Policies & terms" secondary onPress={onPolicies} />
        <AuthAction label="About & delivery" secondary onPress={onInfo} />
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  hero: { width: "100%", overflow: "hidden", alignItems: "center" },
  back: {
    position: "absolute",
    top: 8,
    left: 12,
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 4,
  },
  logo: {
    marginTop: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#f8faf6",
    zIndex: 2,
  },
  welcome: {
    position: "absolute",
    top: 118,
    left: 22,
    right: 22,
    gap: 8,
    zIndex: 2,
  },
  cylinders: {
    position: "absolute",
    bottom: 0,
    flexDirection: "row",
    justifyContent: "center",
  },
  panel: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 28,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -18,
    flexGrow: 1,
  },
  input: {
    minHeight: 54,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingLeft: 48,
    paddingRight: 16,
    fontSize: 16,
  },
  primary: {
    minHeight: 56,
    backgroundColor: "#006112",
    borderRadius: 18,
    overflow: "hidden",
    padding: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  textAction: {
    minHeight: 48,
    paddingVertical: 10,
    paddingHorizontal: 8,
    justifyContent: "center",
  },
  segment: {
    flexDirection: "row",
    borderRadius: 28,
    padding: 4,
    marginBottom: 4,
  },
  selectedSegment: {
    flex: 1,
    minHeight: 48,
    borderRadius: 26,
    backgroundColor: "#087a36",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  segmentAction: {
    flex: 1,
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  envelope: {
    position: "absolute",
    bottom: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  lock: {
    position: "absolute",
    top: 4,
    padding: 12,
    backgroundColor: "#f8faf6",
    borderRadius: 12,
  },
});
