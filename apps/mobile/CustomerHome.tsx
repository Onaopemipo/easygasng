import React from "react";
import { Image, Pressable, View, useWindowDimensions } from "react-native";
import { useRemote, Feedback, type CustomerAPI, money } from "./CustomerUI";
import { useTheme } from "./theme";
import {
  NextIntro,
  NextText,
  NextIcon,
  NextCard,
  NextEmpty,
  NextStatus,
  NextRow,
  NextList,
} from "./MobileNextUI";
export default function CustomerHome({
  user,
  navigate,
  api,
  onOrder,
}: {
  user: any;
  navigate: (screen: string) => void;
  api: CustomerAPI;
  onOrder?: (id: string) => void;
}) {
  const { colors } = useTheme(),
    { width, fontScale } = useWindowDimensions();
  const orders = useRemote(api, "orders", undefined, !!user),
    wallet = useRemote(api, "wallet", undefined, !!user);
  const latest = (
    Array.isArray(orders.data)
      ? orders.data
      : (orders.data?.orders ?? orders.data?.rows ?? [])
  )[0];
  const compact = width < 375;
  const stackedHero = width < 600 && fontScale > 1.15;
  const openOrder = () =>
    onOrder && latest ? onOrder(latest.id) : navigate("orders");
  return (
    <View style={{ gap: 0 }}>
      <NextIntro
        eyebrow="MORE COOKING. LESS WORRY."
        title={
          user
            ? "Hello, " + user.name.split(" ")[0] + "."
            : "Welcome to EasyGas."
        }
        detail="A full cylinder. One less thing to think about."
      />
      <View
        style={{
          minHeight: 246,
          borderRadius: 25,
          padding: compact ? 24 : 25,
          backgroundColor: "#064d32",
          overflow: "hidden",
          marginBottom: 16,
        }}
      >
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            width: 210,
            height: 210,
            borderRadius: 105,
            right: -64,
            top: 30,
            borderWidth: 1,
            borderColor: "#8ab28435",
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            width: 266,
            height: 266,
            borderRadius: 133,
            right: -92,
            top: 2,
            borderWidth: 28,
            borderColor: "#8ab2840d",
          }}
        />
        <View
          style={{
            maxWidth: stackedHero ? undefined : compact ? 190 : 218,
            gap: 12,
            zIndex: 2,
          }}
        >
          <NextText kind="eyebrow" style={{ color: "#d5eadb" }}>
            COOKING GAS, DELIVERED
          </NextText>
          <NextText
            style={{
              fontSize: compact ? 26 : 29,
              lineHeight: 33,
              letterSpacing: -0.8,
              fontWeight: "700",
              color: "#fff",
            }}
          >
            A little refill.{"\n"}A lot less worry.
          </NextText>
          <NextText style={{ fontSize: 13, lineHeight: 22, color: "#d5eadb" }}>
            Choose your quantity.{"\n"}We’ll handle the next steps.
          </NextText>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigate("gas-order")}
            style={{
              minHeight: 44,
              paddingHorizontal: 23,
              paddingVertical: 12,
              borderRadius: 24,
              backgroundColor: "#d1f460",
              alignSelf: "flex-start",
              marginTop: 3,
            }}
          >
            <NextText kind="label" style={{ color: "#142c23" }}>
              Order gas
            </NextText>
          </Pressable>
        </View>
        <Image
          accessible
          accessibilityLabel="EasyGas green cooking gas cylinder"
          source={require("./assets/cylinder-illustration.png")}
          resizeMode="contain"
          style={{
            position: stackedHero ? "relative" : "absolute",
            height: compact ? 173 : 190,
            width: compact ? 119 : 140,
            right: stackedHero ? undefined : compact ? -8 : 3,
            bottom: stackedHero ? undefined : 14,
            alignSelf: "flex-end",
            marginTop: stackedHero ? 16 : 0,
          }}
        />
      </View>
      <View style={{ flexDirection: "row", gap: 13, marginBottom: 24 }}>
        {[
          {
            title: "Book a service",
            detail: "Expert help, on your terms",
            route: "services",
            icon: "wrench",
          },
          {
            title: "Your wallet",
            detail: !user
              ? "Sign in to view purchase credit"
              : wallet.data
                ? money(wallet.data.balanceKobo) + " available"
                : "Purchase credit, in one place",
            route: "wallet",
            icon: "wallet",
          },
        ].map((item: any) => (
          <Pressable
            key={item.route}
            accessibilityRole="button"
            accessibilityLabel={item.title}
            onPress={() => navigate(item.route)}
            style={{
              flex: 1,
              minHeight: 138,
              padding: compact ? 15 : 18,
              borderRadius: 22,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              gap: 10,
            }}
          >
            <View
              style={{
                width: 39,
                height: 39,
                borderRadius: 14,
                backgroundColor: colors.elevated,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <NextIcon name={item.icon} />
            </View>
            <NextText kind="label" style={{ fontSize: 15 }}>
              {item.title}
            </NextText>
            <NextText kind="small" style={{ color: colors.muted }}>
              {item.detail}
            </NextText>
          </Pressable>
        ))}
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 17,
        }}
      >
        <NextText kind="heading">Your latest order</NextText>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigate("orders")}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <NextText kind="label" style={{ color: colors.primary }}>
            View all
          </NextText>
        </Pressable>
      </View>
      {user && latest ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={"Open order " + latest.reference}
          onPress={openOrder}
        >
          <NextCard>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <NextIcon name="flame" />
              <NextStatus value={latest.status} />
            </View>
            <NextText kind="heading">
              {latest.gas_lines?.length
                ? "Cooking gas refill"
                : latest.items?.length
                  ? "Essentials order"
                  : "Your EasyGas order"}
            </NextText>
            <NextText kind="small" style={{ color: colors.muted }}>
              {latest.reference}
            </NextText>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <NextText kind="label">{money(latest.total_kobo)}</NextText>
              <NextText kind="small" style={{ color: colors.muted }}>
                {latest.payment_status?.replaceAll("_", " ")}
              </NextText>
            </View>
          </NextCard>
        </Pressable>
      ) : (
        <NextEmpty
          title={
            orders.error
              ? "Your orders are temporarily unavailable"
              : "Your first refill starts here"
          }
          detail={
            orders.error
              ? "Your account stays signed in. Open Orders to try again."
              : "We’ll keep every order and update in one place."
          }
        />
      )}
      <View style={{ marginTop: 26, marginBottom: 17 }}>
        <NextText kind="heading">Made for your home</NextText>
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 24 }}>
        {[
          ["receipt", "Invoices", "invoices"],
          ["flame", "Cylinders", "cylinders"],
          ["gift", "Rewards", "rewards"],
          ["calendar-days", "Refill plans", "plans"],
        ].map(([icon, label, route]) => (
          <Pressable
            key={route}
            accessibilityRole="button"
            onPress={() => navigate(route)}
            style={{
              flex: 1,
              alignItems: "center",
              gap: 10,
              paddingVertical: 18,
              paddingHorizontal: 2,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 18,
              backgroundColor: colors.surface,
            }}
          >
            <NextIcon name={icon as any} />
            <NextText
              kind="small"
              style={{ textAlign: "center", fontSize: 12 }}
            >
              {label}
            </NextText>
          </Pressable>
        ))}
      </View>
      <NextList>
        <NextRow
          title="We’re here to help"
          detail="Questions about an order or a service?"
          icon="message-circle"
          onPress={() => navigate(user ? "conversations" : "public-info")}
        />
      </NextList>
    </View>
  );
}
