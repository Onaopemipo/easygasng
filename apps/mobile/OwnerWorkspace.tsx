import React, { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { gasReportCsv } from "../../packages/business-rules/src/gas-report-export";
import Svg, { Circle, Polyline } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { Button, Card, Copy, Title } from "./CustomerUI";
import { Text } from "./typography";
import { ContextSheet } from "./ContextSheet";
import { EasyGasLoader } from "./EasyGasLoader";
import { useTheme } from "./theme";
import { gasMoney } from "../../packages/business-rules/src/gas-pricing";

type API = (action: string, data?: unknown) => Promise<any>;
export type OwnerScope = { branchId: string; period: "month" | "7" | "30" };
const periods = { month: "This month", "7": "Last 7 days", "30": "Last 30 days" };
function filters(scope: OwnerScope) {
  const to = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const start = new Date(to + "T00:00:00Z");
  if (scope.period === "month") start.setUTCDate(1);
  else start.setUTCDate(start.getUTCDate() - Number(scope.period) + 1);
  return new URLSearchParams({ from: start.toISOString().slice(0, 10), to, ...(scope.branchId ? { branchId: scope.branchId } : {}) });
}

function RevenueTrend({ rows }: { rows: { date: string; amountKobo: number }[] }) {
  const { colors } = useTheme();
  const maximum = Math.max(0, ...rows.map(row => row.amountKobo));
  const first = Date.parse(rows[0]?.date);
  const span = Math.max(1, Date.parse(rows.at(-1)?.date ?? "") - first);
  const points = rows.map(row => ({
    date: row.date,
    x: 8 + ((Date.parse(row.date) - first) / span) * 284,
    y: 88 - (row.amountKobo / Math.max(1, maximum)) * 76,
    amountKobo: row.amountKobo,
  }));
  return <Card>
    <Title>Order revenue trend</Title>
    {points.length === 0 ? <Copy>No dated order revenue available for this period.</Copy> : <>
      <Svg accessible={false} width="100%" height={100} viewBox="0 0 300 100">
        <Polyline points={points.map(point => point.x + "," + point.y).join(" ")} fill="none" stroke={colors.primary} strokeWidth={3} />
        {points.map(point => <Circle key={point.date} cx={point.x} cy={point.y} r={3} fill={colors.primary} />)}
      </Svg>
      <Copy>{points[0].date} – {points.at(-1)?.date}</Copy>
      <Copy>Peak daily order revenue · {gasMoney(maximum)}</Copy>
    </>}
  </Card>;
}

export function OwnerWorkspace({ api, mode, scope, onScope, navigate, openWeb }: {
  api: API;
  mode: "home" | "operations" | "finance" | "reports";
  scope: OwnerScope;
  onScope: (scope: OwnerScope) => void;
  navigate: (screen: string) => void;
  openWeb: (path: string) => void;
}) {
  const { colors } = useTheme();
  const [sheet, setSheet] = useState<"branch" | "period" | null>(null);
  const [revision, refresh] = useState(0);
  const [confirmed, setConfirmed] = useState<{ key: string; dashboard: any; finance: any; pending: number | null }>();
  const [error, setError] = useState("");
  const [payments, setPayments] = useState<{ key: string; rows: Record<string, unknown>[] }>();
  const [paymentIndex, setPaymentIndex] = useState(0);
  const [reportError, setReportError] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const query = filters(scope).toString();
  const key = mode + query;
  const data = confirmed?.key === key ? confirmed : undefined;
  useEffect(() => {
    let active = true;
    setError("");
    Promise.all([
      api("admin.dashboard?" + query),
      mode !== "reports" ? api("business.snapshot?" + query).catch((err) => {
        if (err.status === 401 || err.status === 403) throw err;
        return null;
      }) : null,
      mode === "home" ? api("approvals?" + new URLSearchParams({ view: "paged", filter: "pending", pageSize: "10", ...(scope.branchId ? { branchId: scope.branchId } : {}) })).then(value => value.total).catch(() => null) : null,
    ]).then(([dashboard, finance, pending]) => {
      if (active) setConfirmed({ key, dashboard, finance, pending });
    }).catch(err => {
      if (!active) return;
      if (err.status === 401 || err.status === 403) setConfirmed(undefined);
      setError(err.status === 403 ? "You no longer have access to this workspace." : "Couldn’t refresh. Check your connection and try again.");
    });
    return () => { active = false; };
  }, [key, revision]);

  async function paymentReport(exportCsv: boolean) {
    if (reportBusy) return;
    setReportBusy(true);
    setReportError("");
    try {
      const parameters = Object.fromEntries(filters(scope));
      const result = await api(exportCsv ? "business.export" : "business.report", {
        ...parameters, report: "payments", ...(exportCsv ? { format: "csv" } : {}),
      });
      if (exportCsv) {
        if (!FileSystem.cacheDirectory || !(await Sharing.isAvailableAsync())) throw new Error("File sharing is unavailable.");
        const columns = Object.keys(result.rows[0] ?? {});
        if (!columns.length) throw new Error("There are no payments to export for this scope.");
        const file = FileSystem.cacheDirectory + "easygas-owner-payments.csv";
        const csv = gasReportCsv([columns, ...result.rows.map((row: Record<string, unknown>) => columns.map(column => row[column]))]);
        try {
          await FileSystem.writeAsStringAsync(file, csv);
          await Sharing.shareAsync(file, { mimeType: "text/csv", UTI: "public.comma-separated-values-text" });
        } finally {
          await FileSystem.deleteAsync(file, { idempotent: true });
        }
      } else {
        setPayments({ key, rows: result.rows });
        setPaymentIndex(0);
      }
    } catch (err: any) {
      setPayments(undefined);
      setReportError(err.message ?? "Payment report unavailable.");
    } finally {
      setReportBusy(false);
    }
  }
  const dashboard = data?.dashboard;
  const summary = data?.finance;
  const finance = summary?.finance;
  const branches: { id: string; name: string }[] = confirmed?.dashboard?.branches ?? [];
  const branch = branches.find(item => item.id === scope.branchId)?.name ?? "All authorised branches";
  const metric = (label: string, value: number | null | undefined, money = false) => (
    <View key={label} style={{ flexBasis: "47%", flexGrow: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.surface, padding: 12 }}>
      <Copy>{label}</Copy>
      <Text style={{ color: colors.text, fontSize: 19, fontWeight: "700", marginTop: 4 }}>{value == null ? "Unavailable" : money ? gasMoney(value) : value.toLocaleString("en-NG")}</Text>
    </View>
  );
  const modules = [
    ["Orders", dashboard?.orders?.count, "orders", "bag-check-outline"],
    ["Active deliveries", dashboard?.operations?.deliveries, "deliveries", "bus-outline"],
    ["Service bookings", dashboard?.services, "bookings", "construct-outline"],
    ["Stock exceptions", summary?.alerts?.filter((alert: { kind: string }) => ["low_stock", "low_gas"].includes(alert.kind)).length, "inventory", "cube-outline"],
    ["Open incidents", dashboard?.incidents, "incidents", "warning-outline"],
    ["Active stock holds", summary?.holds?.length, "inventory", "shield-outline"],
  ] as const;

  return <View style={{ gap: 14 }}>
    <Title>{{ home: "Business Overview", operations: "Operations Summary", finance: "Financial Summary", reports: "Reports & Analytics" }[mode]}</Title>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      <Button label={branch} onPress={() => setSheet("branch")} />
      <Button label={periods[scope.period]} onPress={() => setSheet("period")} />
      <Button label="Refresh" onPress={() => refresh(value => value + 1)} />
    </View>
    {sheet && <ContextSheet title={sheet === "branch" ? "Choose branch" : "Reporting period"} onClose={() => setSheet(null)}>
      {sheet === "branch" ? [{ id: "", name: "All authorised branches" }, ...branches].map(item =>
        <Button key={item.id} label={item.name} onPress={() => { onScope({ ...scope, branchId: item.id }); setSheet(null); }} />
      ) : (Object.keys(periods) as OwnerScope["period"][]).map(period =>
        <Button key={period} label={periods[period]} onPress={() => { onScope({ ...scope, period }); setSheet(null); }} />
      )}
    </ContextSheet>}
    {error && <Copy>{data ? "Showing last confirmed data. " : ""}{error}</Copy>}
    {dashboard && <Copy>Updated {new Date(dashboard.generatedAt).toLocaleTimeString("en-NG", { timeZone: "Africa/Lagos" })} WAT</Copy>}
    {!data && !error && <EasyGasLoader label="Loading owner records" />}
    {data && mode === "home" && <>
      <View style={{ backgroundColor: colors.primary, borderRadius: 16, padding: 18, gap: 5 }}>
        <Text preserveColor style={{ color: "#fff" }}>Verified net receipts</Text>
        <Text preserveColor style={{ color: "#fff", fontWeight: "700", fontSize: 30 }}>{dashboard.revenue == null ? "Unavailable" : gasMoney(dashboard.revenue)}</Text>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {metric("Verified completed revenue", finance?.verifiedCompletedRevenueKobo, true)}
        {metric("Recorded expenses", finance?.recordedExpensesKobo, true)}
        {metric("Net profit", finance?.netProfitKobo, true)}
        {metric("Orders", dashboard.orders?.count)}
      </View>
      <RevenueTrend rows={summary?.analytics?.dailyOrderRevenue ?? []} />
      <Card>
        <Title>Priorities</Title>
        {dashboard.allowed?.includes("approvals") && <Button label={data.pending == null ? "Review approvals" : `${data.pending} awaiting review`} onPress={() => navigate("owner-approvals")} />}
        {modules.slice(3).map(([label, value, route]) => dashboard.allowed?.includes(route) && <Button key={label} label={`${label} · ${value ?? "Unavailable"}`} onPress={() => navigate("owner-operations")} />)}
      </Card>
      <Card>
        <Title>Quick actions</Title>
        <Button label="Operations Summary" onPress={() => navigate("owner-operations")} />
        {dashboard.allowed?.includes("finance") && <Button label="Financial Summary" onPress={() => navigate("owner-finance")} />}
        {dashboard.allowed?.includes("reports") && <Button label="Reports & Analytics" onPress={() => navigate("owner-reports")} />}
      </Card>
    </>}
    {data && mode === "operations" && <Card>
      <Copy>Orders and bookings follow the selected period. Deliveries, incidents and inventory exceptions show current conditions.</Copy>
      {modules.filter(([, , route]) => dashboard.allowed?.includes(route)).map(([label, value, route, icon]) =>
        <Pressable accessibilityRole="link" accessibilityLabel={`${label}, ${value ?? "Unavailable"}`} key={label} onPress={() => openWeb("/admin/" + route)}
          style={{ minHeight: 48, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, borderColor: colors.border }}>
          <Ionicons name={icon} size={20} color={colors.primary} />
          <Text style={{ color: colors.text, flex: 1 }}>{label}</Text>
          <Text style={{ color: colors.text, fontWeight: "700" }}>{value ?? "Unavailable"}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.muted} />
        </Pressable>
      )}
    </Card>}
    {data && mode === "finance" && <>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {metric("Verified net receipts", dashboard.revenue, true)}
        {metric("Verified completed revenue", finance?.verifiedCompletedRevenueKobo, true)}
        {metric("Recorded expenses", finance?.recordedExpensesKobo, true)}
        {metric("Net profit", finance?.netProfitKobo, true)}
        {metric("Refunds", finance?.refundsKobo, true)}
        {metric("Outstanding orders", finance?.outstandingOrderKobo, true)}
        {metric("Cash awaiting verification", finance?.cashAwaitingVerificationKobo, true)}
        {metric("Wallet liability", finance?.walletLiabilityKobo, true)}
      </View>
      {finance?.netProfitKobo == null && <Copy>Profit is unavailable until the required cost records are complete.</Copy>}
      {dashboard.allowed?.includes("finance") && <Card>
        <Title>Payments</Title>
        <Button label="Load transactions" disabled={reportBusy} onPress={() => void paymentReport(false)} />
        <Button label="Export payments CSV" disabled={reportBusy} onPress={() => void paymentReport(true)} />
        <Button label="Open reconciliation on web" onPress={() => openWeb("/admin/reconciliation?" + query)} />
        {reportError && <Copy>{reportError}</Copy>}
        {payments?.key === key && (payments.rows.length === 0 ? <Copy>No payment records in this scope.</Copy> : <>
          <Copy>Transaction {paymentIndex + 1} of {payments.rows.length}</Copy>
          {Object.entries(payments.rows[paymentIndex]).map(([field, value]) => <Copy key={field}>
            {field.replace(/_kobo$/, "").replaceAll("_", " ")} · {typeof value === "number" && field.endsWith("_kobo") ? gasMoney(value) : String(value ?? "Unavailable")}
          </Copy>)}
          {paymentIndex > 0 && <Button label="Previous transaction" onPress={() => setPaymentIndex(value => value - 1)} />}
          {paymentIndex + 1 < payments.rows.length && <Button label="Next transaction" onPress={() => setPaymentIndex(value => value + 1)} />}
        </>)}
      </Card>}
      {dashboard.allowed?.includes("reports") && <Button label="Financial reports and export" onPress={() => openWeb("/admin/reports?" + query)} />}
    </>}
    {data && mode === "reports" && dashboard.allowed?.includes("reports") &&
      <Button label="Open reports and exports" onPress={() => openWeb("/admin/reports?" + query)} />}
  </View>;
}
