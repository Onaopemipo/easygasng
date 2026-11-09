import { NativeWalletFunding } from "./HostedPayment";
import type { CustomerAPI } from "./CustomerUI";
import React, { useState } from "react";
import { View } from "react-native";
import { Card, Copy, Title, Button, Feedback, money } from "./CustomerUI";
import { Text } from "./typography";
import { useTheme } from "./theme";
import { lagosDay } from "../../packages/business-rules/src/customer-mobile";
export default function CustomerWallet({
  wallet,
  api,
  userId,
  navigate,
  reload,
}: {
  wallet: any;
  api: CustomerAPI;
  userId: string;
  navigate: (s: string) => void;
  reload: () => Promise<void>;
}) {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false),
    [error, setError] = useState("");
  async function refresh() {
    setRefreshing(true);
    setError("");
    try {
      await reload();
    } catch {
      setError("Your credit ledger could not be refreshed. Please try again.");
    } finally {
      setRefreshing(false);
    }
  }
  return (
    <View style={{ gap: 15 }}>
      <Title>My Wallet</Title>
      <Card accent>
        <Copy>EasyGas purchase credit</Copy>
        <Text
          preserveColor
          style={{
            fontSize: 34,
            lineHeight: 42,
            fontWeight: "800",
            color: colors.text,
          }}
        >
          {wallet ? money(wallet.balanceKobo) : "Loading…"}
        </Text>
        <Copy>
          Ledger-derived available credit. EasyRewards points are separate.
        </Copy>
      </Card>
      <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
        <Button
          label="Credit & redemption"
          secondary
          onPress={() => navigate("credit")}
        />
        <Button
          label="EasyRewards"
          secondary
          onPress={() => navigate("rewards")}
        />
      </View>
      <Copy>Transfers and cash withdrawals are not supported.</Copy>
      <NativeWalletFunding api={api} userId={userId} />
      <Title>Recent Transactions</Title>
      <Feedback loading={!wallet && !error} error={error} retry={refresh} />
      {wallet?.entries?.length === 0 && (
        <Card>
          <Copy>No credit transactions yet.</Copy>
        </Card>
      )}
      {wallet?.entries?.map((entry: any) => (
        <Card key={entry.id}>
          <View
            style={{
              flexDirection: "row",
              gap: 12,
              justifyContent: "space-between",
            }}
          >
            <Text
              preserveColor
              style={{ color: colors.text, fontWeight: "700", flex: 1 }}
            >
              {entry.kind.replaceAll("_", " ")}
            </Text>
            <Text
              preserveColor
              style={{
                color:
                  Number(entry.amount_kobo) > 0 ? colors.success : colors.text,
                fontWeight: "800",
              }}
            >
              {Number(entry.amount_kobo) > 0 ? "+" : ""}
              {money(entry.amount_kobo)}
            </Text>
          </View>
          <Copy>
            {lagosDay(entry.created_at)} · {entry.reference}
          </Copy>
        </Card>
      ))}
      <Button
        label={refreshing ? "Refreshing…" : "Refresh transactions"}
        secondary
        disabled={refreshing}
        onPress={refresh}
      />
    </View>
  );
}
