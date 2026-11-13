import { EasyGasLoader } from "./EasyGasLoader";
import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useTheme } from "./theme";

type Snapshot = {
  revenue: number | null;
  orders: { count: number } | null;
  services: number | null;
  customers: number | null;
  incidents: number | null;
  operations: { deliveries: number | null } | null;
};

export function OwnerOverview({ api, branchManager = false, operationsOnly = false }: { api: (action: string) => Promise<Snapshot>; branchManager?: boolean; operationsOnly?: boolean }) {
  const { colors } = useTheme();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts();
    const part = (type: string) => date.find(item => item.type === type)?.value;
    const month = `${part("year")}-${part("month")}`;
    api(`admin.dashboard?from=${month}-01&to=${month}-${part("day")}`)
      .then(result => { if (active) setSnapshot(result); })
      .catch(() => { if (active) setFailed(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [attempt]);

  const count = (value?: number | null) => value == null ? "Unavailable" : value.toLocaleString("en-NG");
  const metrics = [
    ["Orders", snapshot?.orders?.count],
    ...(branchManager || operationsOnly ? [["Active deliveries", snapshot?.operations?.deliveries] as const] : []),
    ["Service bookings", snapshot?.services],
    ...(operationsOnly ? [] : [["Customers who ordered", snapshot?.customers] as const]),
    ["Open incidents", snapshot?.incidents],
  ] as const;

  return (
    <View style={{ gap: 12 }}>
      {loading ? <EasyGasLoader variant="section" label="Loading business overview" /> : failed ? (
        <Pressable accessibilityRole="button" onPress={() => {
          setFailed(false);
          setLoading(true);
          setAttempt(value => value + 1);
        }}>
          <Text style={{ color: colors.text }}>Business overview unavailable. Tap to retry.</Text>
        </Pressable>
      ) : (
        <>
          {operationsOnly ? <Text style={{ color: colors.text, fontSize: 24, fontWeight: "700" }}>Operations Summary</Text> : <View style={{ backgroundColor: "#005B35", padding: 20, borderRadius: 16 }}>
            <Text style={{ color: "#fff" }}>{branchManager ? "Assigned branch · Orders this month" : "Verified net receipts this month"}</Text>
            <Text style={{ color: "#fff", fontSize: 28, fontWeight: "700" }}>
              {branchManager ? count(snapshot?.orders?.count) : snapshot?.revenue == null ? "Unavailable" : (snapshot.revenue / 100).toLocaleString("en-NG", { style: "currency", currency: "NGN" })}
            </Text>
          </View>}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {metrics.filter(([label]) => !branchManager || label !== "Orders").map(([label, value]) => (
              <View key={label} style={{ flexGrow: 1, flexBasis: "45%", borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 12 }}>
                <Text style={{ color: colors.text }}>{label}</Text>
                <Text style={{ color: colors.text, fontSize: 22, fontWeight: "700" }}>{count(value)}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}
