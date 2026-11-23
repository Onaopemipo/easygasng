import React, { useState } from "react";
import { View, Pressable } from "react-native";
import {
  nativeWorkspaces,
  visibleWorkspaces,
} from "../../packages/business-rules/src/native-workspaces";
import { useRemote, Feedback, type CustomerAPI } from "./CustomerUI";
import { useTheme } from "./theme";
import {
  NextIntro,
  NextText,
  NextList,
  NextRow,
  NextIcon,
  NextButton,
  NextField,
  NextEmpty,
  type NextIconName,
} from "./MobileNextUI";
export const customerWorkspaceRows: [string, string, NextIconName, string][] = [
  [
    "Discover and compare",
    "products",
    "search",
    "Products, specifications and availability",
  ],
  [
    "Order and checkout",
    "gas-order",
    "flame",
    "Refill quantity, delivery and payment",
  ],
  ["Shopping cart", "cart", "package", "Products and linked service requests"],
  [
    "My orders",
    "orders",
    "package",
    "Tracking, invoices, cancellations and refunds",
  ],
  [
    "Account and privacy",
    "profile",
    "user-round",
    "Profile, addresses, sessions and privacy",
  ],
  [
    "Purchase credit and wallet",
    "wallet",
    "wallet",
    "Funding and your credit ledger",
  ],
  [
    "Customer service visits",
    "services",
    "wrench",
    "Service catalogue, bookings and work approval",
  ],
  [
    "Rewards and refill planning",
    "rewards",
    "gift",
    "Rewards, cylinders and recurring refill plans",
  ],
  [
    "Customer support",
    "conversations",
    "message-circle",
    "Requests, replies and evidence",
  ],
  [
    "Quotations",
    "customer-quotations",
    "receipt",
    "Service scope and quotations",
  ],
  [
    "Credits and refunds",
    "credit",
    "credit-card",
    "Issued credits and refund requests",
  ],
  [
    "Testimonials",
    "customer-testimonials",
    "message-circle",
    "Feedback and publication consent",
  ],
  [
    "Policies and legal information",
    "public-policies",
    "shield-check",
    "Published policies and terms",
  ],
  [
    "Global navigation and appearance",
    "appearance",
    "moon",
    "Appearance and accessibility preferences",
  ],
];
export function CustomerNextDirectory({
  navigate,
  user,
}: {
  navigate: (s: string) => void;
  user: any;
}) {
  const [query, setQuery] = useState("");
  return (
    <>
      <NextIntro
        title={"Everything you need.\nOne clear place."}
        detail="Find your orders, services and account features."
      />
      <NextField
        label="Search workspaces"
        placeholder="Find a workspace or feature"
        value={query}
        onChange={setQuery}
      />
      <View style={{ height: 18 }} />
      <NextList>
        {customerWorkspaceRows
          .filter((r) =>
            (r[0] + " " + r[3]).toLowerCase().includes(query.toLowerCase()),
          )
          .map(([title, route, icon, detail]) => (
            <NextRow
              key={route}
              title={title}
              detail={detail}
              icon={icon}
              onPress={() =>
                navigate(
                  user ||
                    [
                      "products",
                      "gas-order",
                      "services",
                      "public-policies",
                      "appearance",
                    ].includes(route)
                    ? route
                    : "login",
                )
              }
            />
          ))}
      </NextList>
      <View style={{ height: 18 }} />
      <NextList>
        {[
          ["My cylinders", "cylinders", "flame"],
          ["Cooking gas profiles", "consumption", "flame"],
          ["Smart refill", "smart-refill", "clock"],
          ["Refill plans", "plans", "calendar-days"],
          ["Recurring orders", "recurring", "calendar-days"],
          ["Invoices & receipts", "invoices", "receipt"],
          ["My service bookings", "bookings", "wrench"],
          ["Products & appointments", "combined-checkout", "layers"],
        ].map(([title, route, icon]) => (
          <NextRow
            key={route}
            title={title}
            icon={icon as NextIconName}
            onPress={() => navigate(user ? route : "login")}
          />
        ))}
      </NextList>
    </>
  );
}
export function StaffNextHome({
  user,
  api,
  navigate,
}: {
  user: any;
  api: CustomerAPI;
  navigate: (s: string) => void;
}) {
  const { colors } = useTheme(),
    nav = useRemote(api, "navigation"),
    orders = useRemote(api, "orders"),
    approvals = useRemote(
      api,
      "approvals",
      { view: "paged", filter: "pending", page: "1", pageSize: "1" },
      ["owner", "finance"].includes(user.role),
    );
  const allowed = visibleWorkspaces(user.role, nav.data?.allowed ?? []),
    orderRows = Array.isArray(orders.data)
      ? orders.data
      : (orders.data?.rows ?? null);
  return (
    <>
      <NextIntro
        eyebrow={
          (user.branchId || user.branch_id || "YOUR").toUpperCase() + " BRANCH"
        }
        title="A clear view of today."
        detail={
          user.role === "owner"
            ? "Business owner workspace"
            : user.role === "manager"
              ? "Service manager workspace"
              : "Inventory & finance workspace"
        }
      />
      <View
        style={{
          backgroundColor: colors.elevated,
          padding: 25,
          borderRadius: 24,
          gap: 15,
        }}
      >
        <NextText kind="eyebrow" style={{ color: colors.muted }}>
          YOUR NEXT PRIORITY
        </NextText>
        <NextText kind="title" style={{ fontSize: 28, lineHeight: 33 }}>
          {user.role === "finance"
            ? "Stock & financial review"
            : "Orders needing attention"}
        </NextText>
        <NextText style={{ color: colors.muted }}>
          See what needs action, then open the right workspace.
        </NextText>
        <NextButton
          label="Open today’s work"
          onPress={() =>
            navigate(user.role === "finance" ? "finance-work" : "orders")
          }
        />
      </View>
      <View style={{ flexDirection: "row", gap: 12, marginVertical: 20 }}>
        {[
          [orderRows ? String(orderRows.length) : "—", "Scoped orders"],
          [
            approvals.data ? String(approvals.data.total) : "—",
            "Awaiting review",
          ],
        ].map(([value, label]) => (
          <View
            key={label}
            style={{
              flex: 1,
              padding: 19,
              borderRadius: 19,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              gap: 6,
            }}
          >
            <NextText kind="title">{value}</NextText>
            <NextText kind="small" style={{ color: colors.muted }}>
              {label}
            </NextText>
          </View>
        ))}
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 15,
        }}
      >
        <NextText kind="heading">Your workspaces</NextText>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigate("native-workspaces")}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <NextText kind="label" style={{ color: colors.primary }}>
            View all
          </NextText>
        </Pressable>
      </View>
      <Feedback error={nav.error} retry={nav.reload} />
      <NextList>
        {allowed.slice(0, 7).map(([key, w], i) => (
          <NextRow
            key={key}
            title={w.title}
            detail="Current records and authorised actions"
            icon={
              (
                [
                  "package",
                  "layers",
                  "flame",
                  "wallet",
                  "wrench",
                  "receipt",
                  "shield-check",
                ] as NextIconName[]
              )[i % 7]
            }
            onPress={() => navigate("workspace:" + key)}
          />
        ))}
      </NextList>
      <View style={{ height: 24 }} />
      <NextList>
        <NextRow
          title="We’re here to help"
          detail="Questions about an order or a service?"
          icon="message-circle"
          onPress={() => navigate("conversations")}
        />
      </NextList>
    </>
  );
}
export function StaffNextAccount({
  user,
  navigate,
  logout,
}: {
  user: any;
  navigate: (s: string) => void;
  logout: () => void;
}) {
  const { colors } = useTheme();
  return (
    <>
      <NextIntro
        title={user.name}
        detail={
          user.role === "owner"
            ? "Business owner"
            : user.role === "manager"
              ? "Service manager"
              : "Inventory & finance"
        }
      />
      <NextList>
        <NextRow
          title="Profile & security"
          icon="user-round"
          onPress={() => navigate("owner-profile")}
        />
        <NextRow
          title="Notifications & preferences"
          icon="bell"
          onPress={() => navigate("owner-notifications")}
        />
        <NextRow
          title="Appearance"
          icon="moon"
          onPress={() => navigate("appearance")}
        />
        <NextRow
          title="All workspaces"
          detail="Find every feature for your account"
          icon="layers"
          onPress={() => navigate("native-workspaces")}
        />
        {user.role !== "manager" && (
          <NextRow
            title="Finance & reconciliation"
            icon="wallet"
            onPress={() => navigate("finance-work")}
          />
        )}
        <NextRow
          title="Policies & legal information"
          icon="shield-check"
          onPress={() => navigate("public-policies")}
        />
        <NextRow
          title="Help & support"
          icon="message-circle"
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
          marginTop: 18,
        }}
      >
        <NextText kind="label" style={{ color: colors.primary }}>
          Sign out
        </NextText>
      </Pressable>
    </>
  );
}
