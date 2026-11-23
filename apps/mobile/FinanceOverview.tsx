import React, { useState } from "react";
import { View } from "react-native";
import { useRemote, Feedback } from "./CustomerUI";
import {
  NextIntro,
  NextText,
  NextCard,
  NextList,
  NextRow,
  NextButton,
} from "./MobileNextUI";
import { gasMoney } from "../../packages/business-rules/src/gas-pricing";
import { useTheme } from "./theme";
const metrics = [
  ["verifiedCompletedRevenueKobo", "Verified completed revenue"],
  ["grossProfitKobo", "Gross profit"],
  ["recordedExpensesKobo", "Recorded expenses"],
  ["netProfitKobo", "Net profit"],
  ["walletLiabilityKobo", "Wallet liability"],
] as const;
export function FinanceOverview({
  api,
  navigate,
}: {
  api: (action: string) => Promise<any>;
  navigate?: (screen: string) => void;
}) {
  const r = useRemote(api, "business.snapshot"),
    [tab, setTab] = useState("Overview"),
    { colors } = useTheme();
  return (
    <View style={{ gap: 18 }}>
      <NextIntro
        title={"Every figure,\nwith a source."}
        detail="Committed financial records in your authorised scope."
      />
      <Feedback loading={r.loading} error={r.error} retry={r.reload} />
      {r.data &&
        (!r.data.permissions.financeWrite ? (
          <NextText>Finance records are unavailable for this account.</NextText>
        ) : (
          <>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {["Overview", "Actions", "Activity"].map((label) => (
                <View key={label} style={{ flex: 1 }}>
                  <NextButton
                    compact
                    label={label}
                    secondary={tab !== label}
                    onPress={() => setTab(label)}
                  />
                </View>
              ))}
            </View>
            {tab === "Overview" ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                {metrics.map(([key, label]) => (
                  <NextCard
                    key={key}
                    style={{ flexBasis: "46%", flexGrow: 1, minWidth: 130 }}
                  >
                    <NextText kind="small" style={{ color: colors.muted }}>
                      {label}
                    </NextText>
                    <NextText kind="heading">
                      {r.data.finance[key] == null
                        ? "Unavailable"
                        : gasMoney(r.data.finance[key])}
                    </NextText>
                  </NextCard>
                ))}
              </View>
            ) : (
              <NextList>
                <NextRow
                  icon="receipt"
                  title={
                    tab === "Activity"
                      ? "Ledger & reconciliation history"
                      : "Reconciliation & expenses"
                  }
                  detail="Canonical branch records and governed actions"
                  onPress={() => navigate?.("workspace:reconciliation")}
                />
                {tab === "Actions" && (
                  <>
                    <NextRow
                      icon="wallet"
                      title="Credits & refunds"
                      onPress={() => navigate?.("workspace:credits")}
                    />
                    <NextRow
                      icon="clipboard-list"
                      title="Reports & exports"
                      onPress={() => navigate?.("workspace:reports")}
                    />
                  </>
                )}
              </NextList>
            )}
          </>
        ))}
    </View>
  );
}
