import { Title } from "./CustomerUI";
import React, { useEffect, useState } from "react";
import { View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "./typography";
import { useTheme } from "./theme";
const rows = [
  ["My Profile", "profile", "person-outline"],
  ["My Cylinders", "cylinders", "flame-outline"],
  ["Cooking Profiles & Usage", "consumption", "bar-chart-outline"],
  ["Refill Plan", "plans", "calendar-outline"],
  ["Invoices & Receipts", "invoices", "receipt-outline"],
  ["Order History", "orders", "bag-check-outline"],
  ["Service Requests", "bookings", "construct-outline"],
  ["Notifications", "notifications", "notifications-outline"],
  ["My Wallet & Credit", "wallet", "wallet-outline"],
  ["EasyRewards", "rewards", "gift-outline"],
  ["Recurring Orders", "recurring", "repeat-outline"],
  ["Products", "products", "cube-outline"],
  ["Shopping Cart", "cart", "cart-outline"],
  ["Products & Appointments", "combined-checkout", "layers-outline"],
  ["Credit & Redemption", "credit", "card-outline"],
  ["Appearance", "appearance", "contrast-outline"],
  ["Help & Support", "conversations", "help-circle-outline"],
];
export default function AccountHub({
  user,
  api,
  navigate,
  logout,
}: {
  user: any;
  api: (action: string) => Promise<any>;
  navigate: (screen: string) => void;
  logout: () => void;
}) {
  const { colors, preference } = useTheme();
  const [profile, setProfile] = useState<any>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    setProfile(null);
    if (user)
      api("account.profile")
        .then((data) => {
          if (live) setProfile(data.user);
        })
        .catch(() => {
          if (live)
            setError(
              "Customer details unavailable. Your account settings remain available.",
            );
        });
    return () => {
      live = false;
    };
  }, [user?.id]);
  return (
    <View style={{ gap: 12 }}>
      <Title>My Account</Title>
      <View
        style={{
          padding: 18,
          borderRadius: 18,
          backgroundColor: colors.surface,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            preserveColor
            style={{ fontWeight: "800", color: colors.background }}
          >
            {user.name
              .split(/\s+/)
              .map((v: string) => v[0])
              .slice(0, 2)
              .join("")}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text
            preserveColor
            style={{ fontWeight: "800", color: colors.text, fontSize: 19 }}
          >
            {user.name}
          </Text>
          <Text preserveColor style={{ color: colors.muted }}>
            {profile?.public_customer_id || user.email}
          </Text>
        </View>
      </View>
      {error ? (
        <Text
          preserveColor
          accessibilityRole="alert"
          style={{ color: colors.muted }}
        >
          {error}
        </Text>
      ) : null}
      <View
        style={{
          borderRadius: 18,
          borderColor: colors.border,
          borderWidth: 1,
          overflow: "hidden",
        }}
      >
        {rows.map(([label, route, icon]) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            key={route}
            onPress={() => navigate(route)}
            style={{
              paddingHorizontal: 15,
              paddingVertical: 14,
              minHeight: 52,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
              backgroundColor: colors.surface,
              borderBottomWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Ionicons
              accessible={false}
              name={icon as any}
              size={22}
              color={colors.text}
            />
            <Text preserveColor style={{ flex: 1, color: colors.text }}>
              {label}
            </Text>
            {route === "appearance" ? (
              <Text preserveColor style={{ color: colors.muted }}>
                {preference}
              </Text>
            ) : null}
            <Ionicons
              accessible={false}
              name="chevron-forward"
              size={18}
              color={colors.muted}
            />
          </Pressable>
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={logout}
        style={{ padding: 16, minHeight: 52 }}
      >
        <Text
          preserveColor
          style={{ color: colors.primary, fontWeight: "700" }}
        >
          Sign Out
        </Text>
      </Pressable>
    </View>
  );
}
