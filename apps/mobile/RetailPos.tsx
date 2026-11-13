import { EasyGasLoader } from "./EasyGasLoader";
import React, { useEffect, useRef, useState } from "react";
import { randomUUID } from "expo-crypto";
import { ContextSheet } from "./ContextSheet";
import { NativeForm } from "./Workflows";
import { Card, Copy, Title } from "./CustomerUI";
import { View, Pressable } from "./surfaces";
import { Text } from "./typography";
import { useTheme } from "./theme";
import { gasMoney } from "../../packages/business-rules/src/gas-pricing";
import { nairaToKobo } from "../../packages/business-rules/src/pos-money";
import { friendlyMessage } from "../../packages/business-rules/src/friendly-message";

export const canOpenRetailPos = (role?: string) =>
  ["owner", "manager", "finance"].includes(role ?? "");

export default function RetailPos({ api }: { api: (action: string, data?: any) => Promise<any> }) {
  const { colors } = useTheme();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [version, setVersion] = useState(0);
  const [sheet, setSheet] = useState<"open" | "sale" | "close" | "reports" | "receipts" | "verify" | null>(null);
  const [active, setActive] = useState<any>(null);
  const key = useRef(randomUUID());
  const committing = useRef(false);
  const refresh = () => setVersion(v => v + 1);
  useEffect(() => {
    let live = true;
    setError("");
    api("pos").then(result => { if (live) setData(result); }).catch(e => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [version]);
  const action = (label: string, press: () => void, disabled = false) => <Pressable
    accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={press}
    style={{ minHeight: 44, marginVertical: 4, borderRadius: 12, padding: 12, justifyContent: "center", backgroundColor: colors.button, opacity: disabled ? .5 : 1 }}>
    <Text preserveColor style={{ color: colors.onButton, fontWeight: "700" }}>{label}</Text>
  </Pressable>;
  const shift = data?.ownShift;
  const canSell = data?.canSell && shift?.branch_active === true;
  const products = (data?.products ?? []).filter((p: any) => p.published && !p.archived && Number(p.available) > 0 && Number(p.price_kobo) > 0);
  async function mutate(name: string, values: any) {
    if (committing.current) throw new Error("Please wait for the current request.");
    committing.current = true;
    try {
      if (name === "pos.open") return await api(name, { ...values, openingKobo: nairaToKobo(values.openingKobo) });
      if (name === "pos.close") return await api(name, { ...values, countedKobo: nairaToKobo(values.countedKobo) });
      if (name === "pos.sale") {
        const result = await api(name, { shiftId: shift.id, items: [{ productId: values.productId, quantity: Number(values.quantity) }], tenderedKobo: nairaToKobo(values.tender), idempotencyKey: key.current });
        key.current = randomUUID();
        setFeedback(`Receipt ${result.reference} · Change ${gasMoney(result.change_kobo ?? Number(result.tendered_kobo) - Number(result.total_kobo))}`);
        return result;
      }
      return await api(name, values);
    } finally { committing.current = false; }
  }
  const close = () => { if (!committing.current) setSheet(null); };
  const done = () => { setSheet(null); refresh(); };
  return <>
    <Title>Retail Point of Sale</Title>
    <Copy>Cash sales and till reconciliation. Internet access is required.</Copy>
    {feedback && <Text accessibilityLiveRegion="polite">{feedback}</Text>}
    {error && <><Text accessibilityRole="alert">{friendlyMessage(error)}</Text>{action("Retry POS", refresh)}</>}
    {!data && !error && <EasyGasLoader variant="section" label="Loading POS records" />}
    {data && <>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {[
          ["Today’s sales", gasMoney(data.today.sales_kobo)], ["Receipts today", data.today.receipts],
          ["Stock impact", `${data.today.units} units`], ["Your till", shift ? (canSell ? "Open" : "Branch inactive") : "Closed"],
        ].map(([label, value]) => <View key={label} style={{ flexBasis: "45%", flexGrow: 1 }}><Card><Copy>{label}</Copy><Title>{String(value)}</Title></Card></View>)}
      </View>
      <Copy>Today uses Africa/Lagos. Collections are not verified revenue until cash-up.</Copy>
      {shift && <Card><Title>{shift.branch_name}</Title><Copy>Expected cash including float: {gasMoney(shift.cash_in_till_kobo)}</Copy></Card>}
      {shift ? action("New cash sale", () => setSheet("sale"), !canSell || !products.length)
        : data.canSell && action("Open till", () => setSheet("open"), !data.branches.length)}
      {shift && data.canSell && action("Close till", () => setSheet("close"))}
      {action("View receipts", () => setSheet("receipts"))}
      {action("Till reports", () => setSheet("reports"))}
      {sheet === "open" && <ContextSheet title="Open till" onClose={close}>
        <NativeForm api={mutate} action="pos.open" title="Till details" onDone={done} fields={[
          { name: "branchId", label: "Branch", value: data.branches.length === 1 ? data.branches[0].id : "", options: data.branches.map((b: any) => ({ value: b.id, label: b.name })) },
          { name: "openingKobo", label: "Opening float (₦)", value: "0" },
        ]} />
      </ContextSheet>}
      {sheet === "sale" && shift && <ContextSheet title="New cash sale" onClose={close}>
        <NativeForm api={mutate} action="pos.sale" title="Cash sale details" onDone={done} fields={[
          { name: "productId", label: "Product", options: products.map((p: any) => ({ value: p.id, label: `${p.name} · ${gasMoney(p.price_kobo)}` })) },
          { name: "quantity", label: "Quantity", type: "number", value: 1 },
          { name: "tender", label: "Cash tendered (₦)" },
        ]} />
      </ContextSheet>}
      {sheet === "close" && shift && <ContextSheet title="Close till" onClose={close}>
        <Copy>Expected cash: {gasMoney(shift.cash_in_till_kobo)}. Count actual cash including the float.</Copy>
        <NativeForm api={mutate} action="pos.close" title="Submit cash-up" onDone={done} fields={[
          { name: "shiftId", label: "", type: "hidden", value: shift.id },
          { name: "countedKobo", label: "Counted cash (₦)" }, { name: "note", label: "Cash-up note", type: "textarea" },
        ]} />
      </ContextSheet>}
      {sheet === "receipts" && <ContextSheet title="Recent receipts" onClose={close}>
        {!data.sales.length && <Copy>No recent receipts</Copy>}
        {data.sales.map((r: any) => <Card key={r.id}><Title>{r.reference}</Title><Copy>{gasMoney(r.total_kobo)} · Cash {r.shift_status === "verified" ? "cash-up verified" : "collected"}</Copy></Card>)}
      </ContextSheet>}
      {sheet === "reports" && <ContextSheet title="Till reports" onClose={close}>
        {!data.shifts.length && <Copy>No till shifts recorded.</Copy>}
        {data.shifts.map((r: any) => <Card key={r.id}><Title>{r.cashier} · {r.status}</Title><Copy>Float {gasMoney(r.opening_kobo)}{r.expected_kobo != null ? ` · Expected ${gasMoney(r.expected_kobo)} · Counted ${gasMoney(r.counted_kobo)}` : ""}</Copy>
          {data.canVerify && r.status === "submitted" && r.cashier_id !== data.actorId && action("Verify cash-up", () => { setActive(r); setSheet("verify"); })}
        </Card>)}
      </ContextSheet>}
      {sheet === "verify" && active && <ContextSheet title="Independent cash-up verification" onClose={close}>
        <NativeForm api={mutate} action="reauth" title="Verify identity" fields={[{ name: "password", label: "Your password", type: "password" }]} />
        <NativeForm api={mutate} action="pos.verify" title="Verify reconciled shift" fields={[{ name: "shiftId", label: "", type: "hidden", value: active.id }]} onDone={done} />
      </ContextSheet>}
    </>}
  </>;
}
