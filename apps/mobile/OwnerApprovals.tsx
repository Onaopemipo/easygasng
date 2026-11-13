import { EasyGasLoader } from "./EasyGasLoader";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { TextInput } from "./typography";
import { Pressable } from "./surfaces";
import { Button, Card, Copy, Title } from "./CustomerUI";
import { gasMoney } from "../../packages/business-rules/src/gas-pricing";

type Request = {
  id: string; key: string; value_type: string; label: string; scope: string; status: string; risk: number;
  requester: string; reason: string; previous_value: unknown; proposed_value: unknown;
  can_approve: boolean; effective_at: string; failure_reason?: string;
  business_operation?: { kind: string; reference: string; payload: Record<string, unknown> };
  decisions: { approver: string; decision: string; reason: string }[];
};
type Queue = {
  rows: Request[];
  page: number;
  pageSize: number;
  total: number;
};

function displayValue(value: unknown, money = false): string {
  if (value == null) return "Unavailable";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return money ? gasMoney(value) : String(value);
  if (Array.isArray(value)) return value.map(item => displayValue(item, money)).join(", ");
  if (typeof value === "object") return Object.entries(value).map(([key, item]) =>
    key.replace(/([a-z])([A-Z])/g, "$1 $2").replaceAll("_", " ") + ": " + displayValue(item, /kobo$/i.test(key)),
  ).join("\n");
  return String(value);
}
export function OwnerApprovals({ api, branchId }: {
  branchId: string;
  api: (action: string, data?: unknown) => Promise<any>;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("pending");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ key: string; queue?: Queue }>();
  const [selected, setSelected] = useState<Request>();
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [verify, setVerify] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [decision, setDecision] = useState<"approve" | "reject" | "request_changes">();
  async function submit() {
    if (!selected || !decision || busy) return;
    if (decision !== "approve" && !reason.trim()) {
      setMessage("Enter a reason for this decision.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      if (verify) await api("reauth", { password });
      setPassword("");
      setVerify(false);
      const response = await api("approval.decide", { id: selected.id, decision, reason: reason.trim() });
      setSelected(undefined);
      setDecision(undefined);
      setResult(undefined);
      setRevision(value => value + 1);
      setMessage(response?.status ? "Request status: " + response.status.replaceAll("_", " ") : "Decision recorded. Check the request for its execution status.");
    } catch (err: any) {
      setPassword("");
      if (err.code === "REAUTH_REQUIRED") setVerify(true);
      if (err.status === 403 || err.status === 409) {
        setSelected(undefined);
        setDecision(undefined);
        setResult(undefined);
        setRevision(value => value + 1);
      }
      setMessage(err.message || "Couldn’t save the decision.");
    } finally {
      setBusy(false);
    }
  }
  const key = new URLSearchParams({ view: "paged", q: search.trim(), filter, page: String(page), pageSize: "10", ...(branchId ? { branchId } : {}) }).toString();

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      api(`approvals?${key}`)
        .then(queue => { if (active) setResult({ key, queue }); })
        .catch(() => { if (active) setResult({ key }); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [key, revision]);

  const current = result?.key === key ? result : undefined;
  const queue = current?.queue;

  const inputStyle = { borderWidth: 1, borderRadius: 10, padding: 12 };
  const money = selected?.value_type === "money" || Boolean(selected?.key.startsWith("price.")) ||
    ["delivery.fee", "wallet.maximum", "gas.price_per_kg"].includes(selected?.key ?? "");
  if (selected) return <Card>
    <Button label="Back to requests" disabled={busy} onPress={() => { setSelected(undefined); setMessage(""); setPassword(""); setVerify(false); setDecision(undefined); }} />
    <Title>{selected.label}</Title>
    <Copy>{selected.requester} · {selected.scope} · Level {selected.risk}</Copy>
    <Copy>{selected.status.replaceAll("_", " ")}</Copy>
    <Copy>Effective {new Date(selected.effective_at).toLocaleDateString("en-NG", { timeZone: "Africa/Lagos" })}</Copy>
    <Copy>{selected.reason}</Copy>
    <Card><Title>Current at submission</Title><Copy>{displayValue(selected.previous_value, money)}</Copy></Card>
    <Card><Title>Proposed change</Title><Copy>{displayValue(selected.proposed_value, money)}</Copy></Card>
    {selected.business_operation && <Card>
      <Title>Supporting evidence</Title>
      <Copy>{selected.business_operation.reference} · {selected.business_operation.kind.replaceAll("_", " ")}</Copy>
      <Copy>{displayValue(selected.business_operation.payload)}</Copy>
    </Card>}
    {selected.failure_reason && <Copy>{selected.failure_reason}</Copy>}
    {selected.decisions.map((item, index) => <Copy key={index}>{item.approver} · {item.decision.replaceAll("_", " ")} · {item.reason}</Copy>)}
    {selected.can_approve && <>
      <TextInput accessibilityLabel="Decision reason" placeholder="Reason for decision" style={inputStyle}
        value={reason} maxLength={1000} onChangeText={setReason} multiline />
      {!decision ? <>
        <Button label="Approve" onPress={() => setDecision("approve")} />
        <Button label="Reject" onPress={() => setDecision("reject")} />
        <Button label="Request changes" onPress={() => setDecision("request_changes")} />
      </> : <>
        <Copy>Confirm {decision.replaceAll("_", " ")}. Execution follows the request’s approval rules.</Copy>
        {verify && <TextInput accessibilityLabel="Verify password" placeholder="Enter your password"
          secureTextEntry style={inputStyle} value={password} onChangeText={setPassword} />}
        <Button label={busy ? "Saving…" : verify ? "Verify and confirm" : "Confirm decision"} disabled={busy || (verify && !password)} onPress={() => void submit()} />
        <Button label="Cancel decision" disabled={busy} onPress={() => { setDecision(undefined); setVerify(false); setPassword(""); setMessage(""); }} />
      </>}
    </>}
    {message && <Copy>{message}</Copy>}
  </Card>;
  return <Card>
    <Title>Approval Centre</Title>
    {message && <Copy>{message}</Copy>}
    <TextInput accessibilityLabel="Search approval requests" placeholder="Search requests"
      style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
      value={search} maxLength={100} onChangeText={value => { setSearch(value); setPage(1); }} />
    <View style={{ gap: 8 }}>
      <Button label={filter === "pending" ? "Show all requests" : "Show requests awaiting review"} onPress={() => {
        setFilter(filter === "pending" ? "all" : "pending");
        setPage(1);
      }} />
      <Button label={filter === "high" ? "Show all risk levels" : "High risk"} onPress={() => {
        setFilter(filter === "high" ? "all" : "high");
        setPage(1);
      }} />
    </View>
    {!current ? <EasyGasLoader variant="section" label="Loading approval requests" /> : !queue ? <>
      <Copy>Couldn’t load requests. Check your connection and try again.</Copy>
      <Button label="Retry" onPress={() => { setResult(undefined); setRevision(value => value + 1); }} />
    </> : <>
      {queue.rows.length === 0 && <Copy>No requests match this view.</Copy>}
      {queue.rows.map(row => <Pressable accessibilityRole="button" key={row.id} onPress={() => { setSelected(row); setReason(""); setMessage(""); }}><Card>
        <Copy>{row.label}</Copy>
        <Copy>{row.scope} · Level {row.risk} · {row.status.replaceAll("_", " ").toLowerCase()}</Copy>
      </Card></Pressable>)}
      {queue.total > queue.pageSize && <Copy>Page {queue.page} of {Math.ceil(queue.total / queue.pageSize)}</Copy>}
      {queue.page > 1 && <Button label="Previous page" onPress={() => setPage(queue.page - 1)} />}
      {queue.page * queue.pageSize < queue.total && <Button label="Next page" onPress={() => setPage(queue.page + 1)} />}
    </>}
  </Card>;
}
