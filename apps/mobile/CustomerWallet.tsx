import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { NativeWalletFunding } from "./HostedPayment";
import { ContextSheet } from "./ContextSheet";
import { type CustomerAPI, money, Feedback } from "./CustomerUI";
import {
  NextIntro,
  NextText,
  NextButton,
  NextRow,
  NextList,
  NextEmpty,
  NextCard,
} from "./MobileNextUI";
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
  const { colors } = useTheme(),
    [funding, setFunding] = useState(false),
    [entry, setEntry] = useState<any>(null),
    [error, setError] = useState(""),
    [all, setAll] = useState(false);
  return (
    <View style={{ gap: 20 }}>
      <NextIntro
        title={"Your wallet,\nready when you are."}
        detail="Purchase credit and every movement, clearly recorded."
      />
      <View
        style={{
          backgroundColor: "#064d32",
          padding: 27,
          borderRadius: 25,
          gap: 17,
        }}
      >
        <NextText kind="eyebrow" style={{ color: "#d5eadb" }}>
          AVAILABLE PURCHASE CREDIT
        </NextText>
        <NextText
          kind="title"
          style={{ color: "#fff", fontSize: 39, lineHeight: 47 }}
        >
          {money(wallet.balanceKobo)}
        </NextText>
        <NextText kind="small" style={{ color: "#d5eadb" }}>
          For eligible EasyGas purchases
        </NextText>
        <Pressable
          accessibilityRole="button"
          onPress={() => setFunding(true)}
          style={{
            alignSelf: "flex-start",
            minHeight: 46,
            paddingHorizontal: 23,
            paddingVertical: 12,
            borderRadius: 15,
            backgroundColor: "#d1f460",
          }}
        >
          <NextText kind="label" style={{ color: "#142c23" }}>
            Add money
          </NextText>
        </Pressable>
      </View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <NextText kind="heading">Recent activity</NextText>
        <Pressable
          accessibilityRole="button"
          onPress={() => setAll(!all)}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <NextText kind="label" style={{ color: colors.primary }}>
            {all ? "Show recent" : "See all"}
          </NextText>
        </Pressable>
      </View>
      <Feedback
        error={error}
        retry={() => {
          setError("");
          reload().catch((e) => setError(e.message));
        }}
      />
      {wallet.entries?.length ? (
        <NextList>
          {wallet.entries
            .slice(0, all ? wallet.entries.length : 12)
            .map((e: any) => (
              <NextRow
                key={e.id}
                title={e.kind.replaceAll("_", " ")}
                detail={lagosDay(e.created_at)}
                icon={Number(e.amount_kobo) > 0 ? "arrow-up-right" : "receipt"}
                tail={<NextText kind="label">{money(e.amount_kobo)}</NextText>}
                onPress={() => setEntry(e)}
              />
            ))}
        </NextList>
      ) : (
        <NextEmpty
          title="No wallet activity"
          detail="Recorded purchase credit will appear here."
        />
      )}
      <NextList>
        <NextRow
          title="Credits & redemption"
          icon="credit-card"
          onPress={() => navigate("credit")}
        />
        <NextRow
          title="Rewards"
          icon="gift"
          onPress={() => navigate("rewards")}
        />
      </NextList>
      {funding && (
        <ContextSheet
          title="Add purchase credit"
          onClose={() => setFunding(false)}
        >
          <NativeWalletFunding
            api={api}
            userId={userId}
            onPaid={() => {
              void reload().catch((e) => setError(e.message));
              setFunding(false);
            }}
          />
        </ContextSheet>
      )}
      {entry && (
        <ContextSheet title="Wallet entry" onClose={() => setEntry(null)}>
          <NextCard>
            <NextText kind="heading">{money(entry.amount_kobo)}</NextText>
            <NextText>{entry.kind.replaceAll("_", " ")}</NextText>
            <NextText kind="small">{lagosDay(entry.created_at)}</NextText>
            <NextText kind="small">{entry.reference}</NextText>
          </NextCard>
        </ContextSheet>
      )}
    </View>
  );
}
