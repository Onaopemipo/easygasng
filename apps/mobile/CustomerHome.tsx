import {
  useRemote,
  Feedback,
  Button,
  Copy,
  type CustomerAPI,
} from "./CustomerUI";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, Pressable, View } from "react-native";
import { Text } from "./typography";
import { useTheme } from "./theme";
export default function CustomerHome({
  user,
  navigate,
  api,
}: {
  api: CustomerAPI;
  user: any;
  navigate: (screen: string) => void;
}) {
  const { colors, dark, setPreference } = useTheme();
  const [themeError, setThemeError] = React.useState("");
  const indicators = useRemote(
    api,
    "customer.dashboard",
    { widget: "navigation" },
    !!user,
  );
  const refill = useRemote(api, "refill.profiles", undefined, !!user);
  const actions = [
    ["Book Service", "services", "construct-outline"],
    ["My Cylinders", "cylinders", "flame-outline"],
    ["Refill Plan", "plans", "calendar-outline"],
    ["Wallet", "wallet", "wallet-outline"],
    ["Invoices", "invoices", "receipt-outline"],
    ["Rewards", "rewards", "gift-outline"],
  ];
  return (
    <View style={{ gap: 12 }}>
      <Image
        source={require("./assets/easygas-logo-hd.png")}
        resizeMode="contain"
        accessibilityLabel="EasyGas Energy Solutions"
        style={{
          width: 180,
          height: 55,
          alignSelf: "center",
          backgroundColor: colors.surface,
          borderRadius: 12,
        }}
      />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            preserveColor
            style={{
              color: dark ? colors.onAccent : "#fff",
              fontWeight: "800",
            }}
          >
            {user?.name
              ?.split(/\s+/)
              .map((v: string) => v[0])
              .slice(0, 2)
              .join("") || "EG"}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text preserveColor style={{ color: colors.muted }}>
            Good to see you,
          </Text>
          <Text
            preserveColor
            style={{ color: colors.text, fontWeight: "800", fontSize: 22 }}
          >
            {user?.name?.split(" ")[0] || "Welcome to EasyGas"}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            dark ? "Use light appearance" : "Use dark appearance"
          }
          onPress={() =>
            setPreference(dark ? "light" : "dark").catch(() =>
              setThemeError(
                "Could not save appearance. Try again in Appearance settings.",
              ),
            )
          }
          style={{
            minWidth: 44,
            minHeight: 48,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons
            accessible={false}
            name={dark ? "sunny-outline" : "moon-outline"}
            size={22}
            color={colors.text}
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Notifications${indicators.data ? `, ${indicators.data.counts.notifications} unread` : ""}`}
          onPress={() => navigate("notifications")}
          style={{
            minWidth: 48,
            minHeight: 48,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {indicators.data?.counts.notifications > 0 && (
            <Text
              preserveColor
              style={{ color: colors.text, fontWeight: "800" }}
            >
              {indicators.data.counts.notifications}
            </Text>
          )}
          <Ionicons
            accessible={false}
            name="notifications-outline"
            size={25}
            color={colors.text}
          />
        </Pressable>
      </View>
      {user && (
        <Feedback
          loading={indicators.loading}
          error={indicators.error}
          retry={indicators.reload}
        />
      )}
      {user && (
        <Feedback
          loading={refill.loading}
          error={refill.error}
          retry={refill.reload}
        />
      )}
      {themeError ? (
        <Text
          preserveColor
          accessibilityRole="alert"
          style={{ color: colors.text }}
        >
          {themeError}
        </Text>
      ) : null}
      <View
        style={{
          backgroundColor: "#07592e",
          borderRadius: 22,
          padding: 18,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            preserveColor
            style={{
              color: "#fff",
              fontWeight: "800",
              fontSize: 24,
              lineHeight: 30,
            }}
          >
            Order Cooking Gas
          </Text>
          <Text preserveColor style={{ color: "#e4f2dd", marginVertical: 8 }}>
            More Cooking. Less Worry.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigate("gas-order")}
            style={{
              backgroundColor: colors.accent,
              borderRadius: 24,
              padding: 13,
              alignSelf: "flex-start",
              minHeight: 48,
            }}
          >
            <Text
              preserveColor
              style={{ color: colors.onAccent, fontWeight: "800" }}
            >
              Order Now →
            </Text>
          </Pressable>
        </View>
        <Image
          accessible={false}
          source={require("./assets/cylinder-illustration.png")}
          resizeMode="contain"
          style={{ width: 100, height: 160 }}
        />
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {actions.map(([label, route, icon]) => (
          <Pressable
            key={route}
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={() => navigate(route)}
            style={{
              flexBasis: "29%",
              flexGrow: 1,
              minHeight: 90,
              padding: 8,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 16,
            }}
          >
            <Ionicons
              accessible={false}
              name={icon as any}
              color={colors.primary}
              size={26}
            />
            <Text
              preserveColor
              style={{ color: colors.text, fontWeight: "700" }}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => navigate("consumption")}
        style={{
          backgroundColor: dark ? colors.surface : "#fff3df",
          borderRadius: 20,
          padding: 22,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text
          preserveColor
          style={{
            color: dark ? colors.accent : "#9a4500",
            fontWeight: "800",
            fontSize: 22,
          }}
        >
          Smart Refill →
        </Text>
        <Text preserveColor style={{ color: colors.text, marginTop: 8 }}>
          {!user
            ? "Sign in to view your cooking profiles and verified refill history."
            : refill.loading
              ? "Loading your refill history…"
              : refill.error
                ? "Refill history is unavailable. Please try again above."
                : refill.data?.find((p: any) => p.forecast.available)
                  ? "Your verified purchase history supports a refill estimate. View your cooking profile for the current forecast."
                  : "Not enough verified history for a refill estimate yet. Manage your cooking profiles to get started."}
        </Text>
      </Pressable>
      {user && (
        <Button
          label="Refresh account updates"
          secondary
          onPress={() => {
            indicators.reload();
            refill.reload();
          }}
        />
      )}
      <Pressable
        accessibilityRole="button"
        onPress={() => navigate("products")}
        style={{ padding: 16, minHeight: 48 }}
      >
        <Text
          preserveColor
          style={{ color: colors.primary, fontWeight: "700" }}
        >
          Browse products and kitchen essentials →
        </Text>
      </Pressable>
    </View>
  );
}
