import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { useRemote, Feedback } from "./CustomerUI";
import { useTheme } from "./theme";
import {
  NextText,
  NextRow,
  NextList,
  NextIcon,
  initials,
} from "./MobileNextUI";
import { CustomerNextDirectory } from "./MobileNextWorkspaces";
export default function AccountHub({
  user,
  api,
  navigate,
  logout,
}: {
  user: any;
  api: (a: string) => Promise<any>;
  navigate: (s: string) => void;
  logout: () => void;
}) {
  const { colors, preference } = useTheme(),
    profile = useRemote(api, "account.profile");
  return (
    <View style={{ gap: 22 }}>
      <View style={{ alignItems: "center", gap: 10, paddingVertical: 22 }}>
        <View
          style={{
            width: 76,
            height: 76,
            borderRadius: 38,
            backgroundColor: colors.elevated,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <NextText kind="heading" style={{ color: colors.primary }}>
            {initials(user.name)}
          </NextText>
        </View>
        <NextText
          kind="title"
          style={{ fontSize: 27, lineHeight: 33, textAlign: "center" }}
        >
          {profile.data?.user?.name || user.name}
        </NextText>
        <NextText kind="small" style={{ color: colors.muted }}>
          {profile.data?.user?.public_customer_id || user.email}
        </NextText>
      </View>
      <Feedback error={profile.error} retry={profile.reload} />
      <NextList>
        <NextRow
          icon="user-round"
          title="Profile & security"
          onPress={() => navigate("profile")}
        />
        <NextRow
          icon="map-pin"
          title="Delivery addresses"
          detail="Your saved places"
          onPress={() => navigate("profile")}
        />
        <NextRow
          icon="bell"
          title="Notifications & preferences"
          onPress={() => navigate("notifications")}
        />
        <NextRow
          icon="moon"
          title="Appearance"
          detail={
            preference === "system"
              ? "System"
              : preference === "dark"
                ? "Dark"
                : "Light"
          }
          onPress={() => navigate("appearance")}
        />
        <NextRow
          icon="layers"
          title="All workspaces"
          detail="Find every feature for your account"
          onPress={() => navigate("customer-workspaces")}
        />
        <NextRow
          icon="message-circle"
          title="Help & support"
          onPress={() => navigate("conversations")}
        />
      </NextList>
      <Pressable
        accessibilityRole="button"
        onPress={logout}
        style={{
          minHeight: 52,
          padding: 18,
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "center",
          gap: 10,
        }}
      >
        <NextIcon name="log-out" />
        <NextText kind="label" style={{ color: colors.primary }}>
          Sign out
        </NextText>
      </Pressable>
    </View>
  );
}
