"use client";
import CreditCustomerSearch, {type CreditCustomer} from "./credit-customer-search";
import { confirmAction } from "./app-dialog";
import { PASSWORD_MIN_LENGTH } from "../../../packages/business-rules/src/password-policy";

import { FormInput } from "./password-input";
import { ChannelPreferences } from "./operations-completion";
import { MailDeliveryControls } from "./mail-delivery";
import { EasyRewardsReport } from "./easyrewards";
import React, { useState, useEffect, useRef, type FormEvent } from "react";
import Link from "./workspace-link";
import { useSearchParams } from "next/navigation";
import { AddressAreaFields } from "./address-area-fields";
import { api, Notice, Loading, Empty, money, Modal } from "./ui";
import { nairaToKobo } from "../../../packages/business-rules/src/pos-money";
import { gasMoney } from "../../../packages/business-rules/src/gas-pricing";
import { ShoppingCart, ReceiptText, Layers, LockKeyhole, Store, BarChart3, Headset, MessageSquare, Clock, Hourglass, CircleCheck, Search, Plus, CalendarDays, ArrowLeft } from "lucide-react";
import { ProductHeading } from "./product-workspace";
import { SupportAttachmentForm, SupportPagination, SupportSlaForm, useSupportRecords } from "./support-controls";
type Field = {
  name: string;
  label: string;
  type?: string;
  step?: string;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  value?: any;
  required?: boolean;
  options?: { value: string; label: string }[];
};
export function ActionForm({
  action,
  title,
  fields,
  onDone,
  onResult,
  submit = "Save",
  confirm,
  contextual = false,
}: {
  action: string;
  title: string;
  fields: Field[];
  onDone?: () => void;
  onResult?: (result: any) => void;
  submit?: string;
  confirm?: string;
  contextual?: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  const [dirty, setDirty] = useState(false);
  const lifecycle = useRef<AbortController|null>(null);
  useEffect(() => { lifecycle.current = new AbortController(); return () => lifecycle.current?.abort(); }, []);
  async function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (busy) return;
    setBusy(true);
    if (confirm && !(await confirmAction(confirm, { title: title, confirmLabel: submit === "Save" ? title : submit, signal: lifecycle.current?.signal }))) { setBusy(false); return; }
    setBusy(true);
    setError("");
    setSuccess("");
    const fd = new FormData(form),
      data: Record<string, any> = {};
    for (const f of fields) {
      const raw = fd.get(f.name);
      if (
        raw === "" &&
        f.required === false &&
        !["nullable", "nullable-number"].includes(f.type ?? "")
      )
        continue;
      if (f.type === "checkbox") data[f.name] = raw === "on";
      else if (f.type === "boolean-hidden") data[f.name] = raw === "true";
      else if (f.type === "number-hidden") data[f.name] = Number(raw);
      else if (f.type === "datetime-local") {
        const date = new Date(String(raw));
        if (!Number.isFinite(date.getTime())) {
          setError("Choose a valid date and time.");
          setBusy(false);
          return;
        }
        data[f.name] = date.toISOString();
      } else if (f.type === "naira") {
        try { data[f.name] = nairaToKobo(raw); }
        catch (error) { setError((error as Error).message); setBusy(false); return; }
      } else if (f.type === "money")
        data[f.name] = Math.round(Number(raw) * 100);
      else if (f.type === "number") data[f.name] = Number(raw);
      else if (f.type === "nullable-number")
        data[f.name] = raw === "" ? null : Number(raw);
      else if (f.type === "nullable") data[f.name] = raw === "" ? null : raw;
      else if (raw !== "" || f.required !== false) data[f.name] = raw;
    }
    for (const key of Object.keys(data)) {
      if (key.startsWith("address.") || key.startsWith("config.")) {
        const root = key.split(".")[0];
        data[root] ??= {};
        data[root][key.slice(root.length + 1)] = data[key];
        delete data[key];
      }
    }
    try {
      if (typeof data.config === "string")
        data.config = JSON.parse(data.config);
      if (action.startsWith("approval.") && typeof data.value === "string")
        data.value = JSON.parse(data.value);
      const result = await api(action, data);
      onResult?.(result);
      setSuccess(result.message ?? "Saved successfully.");
      if (result.signedOut) {
        window.location.assign("/login");
        return;
      }
      setDirty(false);
      onDone?.();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className={`surface workflow-form product-form ${contextual ? "support-dialog-form" : ""}`} onSubmit={send} onChange={contextual ? () => setDirty(true) : undefined} data-unsaved={contextual && dirty ? "true" : undefined}>
      {!contextual && <h3>{title}</h3>}
      {fields.map((f) =>
        action === "address.save" && f.name === "locationId" ? null : action ===
            "address.save" && f.name === "street" ? (
          <AddressAreaFields
            key={`${f.value ?? ""}:${fields.find((x) => x.name === "locationId")?.value ?? ""}`}
            street={f.value ?? ""}
            area={fields.find((x) => x.name === "locationId")?.value ?? ""}
            areaName="locationId"
            areas={(
              fields.find((x) => x.name === "locationId")?.options ?? []
            ).map((o) => ({ id: o.value, name: o.label }))}
          />
        ) : (
          <label key={f.name} data-field-type={f.type ?? "text"}>
            {!["hidden", "boolean-hidden", "number-hidden"].includes(f.type ?? "") && f.label}
            {f.options ? (
              <select
                name={f.name}
                defaultValue={f.value ?? ""}
                required={f.required !== false}
              >
                <option value="">Choose…</option>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : f.type === "textarea" ? (
              <textarea
                name={f.name}
                defaultValue={f.value ?? ""}
                required={f.required !== false}
                maxLength={2000}
              />
            ) : (
              <FormInput
                name={f.name}
                type={
                  ["nullable-number", "money"].includes(f.type ?? "")
                    ? "number"
                    : ["nullable", "naira"].includes(f.type ?? "")
                      ? "text"
                      : ["boolean-hidden", "number-hidden"].includes(f.type ?? "") ? "hidden" : (f.type ?? "text")
                }
                inputMode={f.type === "naira" ? "decimal" : undefined}
                defaultValue={
                  f.type === "checkbox" ? undefined : (f.value ?? "")
                }
                defaultChecked={
                  f.type === "checkbox" ? Boolean(f.value) : undefined
                }
                required={f.type !== "checkbox" && f.required !== false}
                min={
                  f.min ??
                  (["number", "money"].includes(f.type ?? "") ? 0 : undefined)
                }
                max={f.max}
                step={f.type === "money" ? "0.01" : f.step}
                minLength={f.type === "password" ? PASSWORD_MIN_LENGTH : f.minLength}
                maxLength={f.type === "password" ? 128 : (f.maxLength ?? 1000)}
                autoComplete={
                  f.type === "password" ? "new-password" : undefined
                }
              />
            )}
          </label>
        ),
      )}
      {error && <Notice type="error" message={error} />}{" "}
      {success && <Notice type="success" message={success} />}
      <button className="button" disabled={busy}>
        {busy ? "Saving…" : submit}
      </button>
    </form>
  );
}
function useRecords(action: string) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    setError("");
    api(action)
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [action, version]);
  return { data, error, reload: () => setVersion((v) => v + 1) };
}
export function AccountSettings() {
  const { data, error, reload } = useRecords("account.profile");
  if (error) return <Notice type="error" message={error} />;
  if (!data) return <Loading />;
  return (
    <div className="workflow-stack product-workspace">
      <ProductHeading eyebrow="YOUR ACCOUNT" title="Account & privacy" description="Manage your personal information, security and privacy preferences." />
      <Link href="/account">Back to your account</Link>
      <ActionForm
        action="account.update"
        title="Your profile"
        fields={[{ name: "name", label: "Full name", value: data.user.name }]}
        onDone={reload}
      />
      <section className="surface workflow-form">
        <h3>Email verification</h3>
        <p>
          {data.user.public_customer_id && (
            <>
              Customer ID: {data.user.public_customer_id}
              <br />
            </>
          )}
          {data.user.email} ·{" "}
          {data.user.verified ? "Verified" : "Awaiting verification"}
        </p>
        {!data.user.verified && (
          <ActionForm
            action="account.verification.send"
            title="Request verification"
            fields={[]}
            submit="Queue verification email"
          />
        )}
        <p className="muted">
          Email is queued locally. The installation operator can preview it with
          the local email command. External email delivery is not connected.
        </p>
      </section>
      <ActionForm
        action="account.password"
        title="Change password"
        fields={[
          {
            name: "currentPassword",
            label: "Current password",
            type: "password",
          },
          {
            name: "newPassword",
            label: `New password (at least ${PASSWORD_MIN_LENGTH} characters)`,
            type: "password",
          },
        ]}
        submit="Change password & sign out"
      />
      <h2>Saved addresses</h2>
      {data.addresses.map((a: any) => (
        <div className="surface workflow-form" key={a.id}>
          <strong>
            {a.label}
            {a.is_default ? " · Default" : ""}
          </strong>
          {!a.location_available && (
            <Notice message="This saved delivery location is temporarily unavailable for new orders." />
          )}
          <ActionForm
            action="address.default"
            title="Set default address"
            fields={[
              { name: "id", label: "Address", type: "hidden", value: a.id },
            ]}
            onDone={reload}
          />
          <ActionForm
            action="address.save"
            title="Edit address"
            fields={[
              { name: "id", label: "Address", type: "hidden", value: a.id },
              { name: "label", label: "Label", value: a.label },
              { name: "street", label: "Street", value: a.street },
              {
                name: "locationId",
                label: "Delivery location",
                value: a.location_id,
                options: data.deliveryLocations.map((l: any) => ({
                  value: l.id,
                  label: l.name,
                })),
              },
              { name: "phone", label: "Recipient phone", value: a.phone },
              {
                name: "building",
                label: "Building / house number",
                value: a.details?.building,
              },
              {
                name: "landmark",
                label: "Estate / landmark",
                value: a.details?.landmark,
                required: false,
              },
              {
                name: "directions",
                label: "Additional directions",
                value: a.details?.directions,
                required: false,
              },
            ]}
            onDone={reload}
          />

          <p>
            {a.street}, {a.zone} · {a.phone}
          </p>
          <ActionForm
            action="address.archive"
            title="Remove address"
            fields={[{ name: "id", label: "", type: "hidden", value: a.id }]}
            onDone={reload}
            submit="Remove"
          />
        </div>
      ))}
      <ActionForm
        action="address.save"
        title="Add delivery address"
        fields={[
          { name: "label", label: "Label (Home, Office…) " },
          { name: "street", label: "Street address" },
          {
            name: "locationId",
            label: "Delivery location",
            options: data.deliveryLocations.map((l: any) => ({
              value: l.id,
              label: l.name,
            })),
          },
          { name: "building", label: "Building / house number" },
          { name: "landmark", label: "Estate / landmark", required: false },
          {
            name: "directions",
            label: "Additional directions",
            required: false,
          },
          {
            name: "isDefault",
            label: "Use as default delivery address",
            type: "checkbox",
          },
          { name: "phone", label: "Mobile number", type: "tel" },
        ]}
        onDone={reload}
      />
      <ChannelPreferences />
      <ActionForm
        key={JSON.stringify(data.preferences)}
        action="preferences.save"
        title="Communication preferences"
        fields={[
          {
            name: "marketing",
            label: "Receive marketing messages",
            type: "checkbox",
            value: data.preferences.marketing,
          },
          {
            name: "refillReminders",
            label: "Receive refill reminders",
            type: "checkbox",
            value: data.preferences.refill_reminders,
          },
          {
            name: "serviceReminders",
            label: "Service follow-up reminders",
            type: "checkbox",
            value: data.preferences.service_reminders ?? true,
          },
          {
            name: "quietStart",
            label: "Quiet hours start (0–23, Lagos time)",
            type: "number",
            value: data.preferences.quiet_start,
          },
          {
            name: "quietEnd",
            label: "Quiet hours end (0–23, Lagos time)",
            type: "number",
            value: data.preferences.quiet_end,
          },
        ]}
        onDone={reload}
      />
      <h2>Active sessions</h2>
      {data.sessions.map((s: any) => (
        <ActionForm
          key={s.id}
          action="account.session.revoke"
          title={`${s.current ? "This session" : "Other session"} · started ${new Date(s.created_at).toLocaleString()}`}
          fields={[{ name: "id", label: "", type: "hidden", value: s.id }]}
          onDone={reload}
          submit="Sign out this session"
        />
      ))}
      <ActionForm
        action="reauth"
        title="Verify your identity for privacy requests"
        fields={[{ name: "password", label: "Password", type: "password" }]}
        submit="Verify"
      />
      <ActionForm
        action="privacy.request"
        title="Request your data or account deletion"
        fields={[
          {
            name: "kind",
            label: "Request",
            options: [
              { value: "export", label: "Export my personal data" },
              { value: "deletion", label: "Review deletion of my account" },
            ],
          },
          { name: "reason", label: "Details", type: "textarea" },
        ]}
        onDone={reload}
      />
      <DownloadPersonalData />
      <p className="muted">
        EasyGas currently retains all records. Deletion requests are recorded as
        retained, and your records are not erased. You can still export your
        personal data.
      </p>
      {data.privacyRequests.map((r: any) => (
        <p key={r.id}>
          {r.kind} · {r.status} · {new Date(r.created_at).toLocaleDateString()}
        </p>
      ))}
    </div>
  );
}
export function Recovery({
  mode,
}: {
  mode: "recover" | "reset" | "verify" | "invite";
}) {
  const [token, setToken] = useState("");
  useEffect(() => {
    setToken(
      new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "",
    );
    window.history.replaceState({}, "", window.location.pathname);
  }, []);
  return (
    <div className="container page workflow-stack">
      <h1>
        {mode === "recover"
          ? "Recover your account"
          : mode === "reset"
            ? "Choose a new password"
            : mode === "invite"
              ? "Accept your invitation"
              : "Verify your email"}
      </h1>
      <ActionForm
        key={token}
        action={
          mode === "recover"
            ? "account.recover"
            : mode === "reset"
              ? "account.reset"
              : mode === "invite"
                ? "invitation.accept"
                : "account.verify"
        }
        title={
          mode === "recover"
            ? "Enter your account email"
            : "Use the secure token from your email"
        }
        fields={
          mode === "recover"
            ? [{ name: "email", label: "Email", type: "email" }]
            : [
                { name: "token", label: "Secure token", value: token },
                {
                  ...(mode === "verify"
                    ? { name: "token", label: "Secure token", value: token }
                    : {
                        name: "password",
                        label: `New password (at least ${PASSWORD_MIN_LENGTH} characters)`,
                        type: "password",
                      }),
                },
              ].filter((f, i) => mode !== "verify" || i === 0)
        }
        submit={mode === "recover" ? "Queue recovery email" : "Continue"}
      />
      <Link href="/login">Return to sign in</Link>
    </div>
  );
}
const supportStatuses = [
  ["all", "All requests", MessageSquare],
  ["open", "Open", Clock],
  ["in_progress", "In progress", Hourglass],
  ["resolved", "Resolved", CircleCheck],
] as const;
const supportDate = new Intl.DateTimeFormat("en-NG", {
  dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Lagos",
});
export function SupportDesk({ staff = false }: { staff?: boolean }) {
  const orderId = useSearchParams().get("orderId") ?? "";
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [days, setDays] = useState("");
  const [page, setPage] = useState(1);
  const [messagePage, setMessagePage] = useState<number | "latest">("latest");
  const [sla, setSla] = useState("all");
  const [revision, refresh] = useState(0);
  const [form, setForm] = useState<"new" | "reply" | "note" | "manage" | "attachment" | "sla" | null>(null);
  const [feedback, setFeedback] = useState("");
  const [actionError, setActionError] = useState("");
  const [operationId, setOperationId] = useState("");
  const [editVersion, setEditVersion] = useState(0);
  const filters = new URLSearchParams({ view: "paged", search, status, days: days || "0", page: String(page), sla });
  const { data, error, pending } = useSupportRecords(`support.list?${filters}`, revision, true);
  const thread = useSupportRecords(selected ? `support.detail?id=${selected}&page=${messagePage}` : null, revision);
  const ticket = thread.data;
  const rows = data?.rows ?? [];
  const canAct = !staff || data?.canManage === true;
  const reload = () => refresh(v => v + 1);
  const resetList = () => { setSelected(null); setPage(1); };
  const openThread = (id: string) => { setSelected(id); setMessagePage("latest"); setActionError(""); };
  const done = () => {
    setFeedback(form === "new" ? "Request created." : form === "manage" ? "Request updated." : form === "note" ? "Internal note saved." : form === "attachment" ? "Image attached." : form === "sla" ? "SLA policy saved." : "Reply sent.");
    if (form === "reply" || form === "note") setMessagePage("latest");
    setForm(null);
    reload();
  };
  async function slaAction(enroll: boolean) {
    setActionError("");
    try {
      const result = await api(enroll ? "support.sla.enroll" : "support.sla.scan", enroll ? { id: ticket.id, version: ticket.version } : {});
      setFeedback(enroll ? "SLA targets applied." : `Checked ${result.checked} newly overdue requests.`);
      reload();
    } catch (e) { setActionError((e as Error).message); }
  }
  const title = form === "new" ? "New support request" : form === "manage" ? "Manage request" : form === "note" ? "Add internal note" : form === "attachment" ? "Attach image" : form === "sla" ? "Support SLA policy" : "Reply to request";
  const newButton = (label: string, secondary = false) =>
    <button className={`button ${secondary ? "secondary" : ""}`} type="button" onClick={() => setForm("new")}><Plus size={18} aria-hidden="true" />{label}</button>;
  return (
    <div className="workflow-stack product-workspace support-workspace support-desk">
      <header className="support-hero">
        <span className="support-hero-icon"><Headset aria-hidden="true" size={42} /></span>
        <div><span className="eyebrow">{staff ? "Customer experience" : "Help & support"}</span>
          <h1>{staff ? "Support Desk" : "Your support conversations"}</h1>
          <p>Keep every conversation and update in one place. Manage requests, track progress and reply faster.</p>
        </div>
      </header>
      {actionError && <Notice type="error" message={actionError} />}
      {feedback && <p role="status" className="support-feedback">{feedback}</p>}
      {error && <div><Notice type="error" message={error} /><button className="button secondary" onClick={reload}>Retry requests</button></div>}
      {!data && !error && <Loading />}
      {data && <>
        <section className="support-metrics" aria-label="Support request totals">
          {supportStatuses.map(([key, label, Icon]) => <article className="surface support-metric" key={key}>
            <span className={`support-metric-icon is-${key}`}><Icon size={25} aria-hidden="true" /></span>
            <div><span>{key === "all" ? "Total requests" : label}</span><strong>{data.totals[key === "all" ? "total" : key]}</strong></div>
          </article>)}
        </section>
        <section className="surface support-inbox" aria-label="Support inbox">
          <div className="support-inbox-top">
            <div className="support-status-controls" role="group" aria-label="Filter by request status">
              {supportStatuses.map(([key, label, Icon]) =>
                <button type="button" key={key} className={`support-status-control ${status === key ? "is-active" : ""}`}
                  aria-pressed={status === key} onClick={() => { setStatus(key); resetList(); }}>
                  <Icon size={17} aria-hidden="true" />{label} ({data.totals[key === "all" ? "total" : key]})
                </button>)}
            </div>
            {canAct && newButton("New request")}
          </div>
          <div className="support-filters" role="search" aria-label="Find support requests">
            <label className="support-search"><Search size={18} aria-hidden="true" /><FormInput aria-label="Search requests" type="search" maxLength={100} value={search}
              placeholder="Search by subject, customer or request ID…" onChange={e => { setSearch(e.target.value); resetList(); }} /></label>
            <select aria-label="Request status" value={status} onChange={e => { setStatus(e.target.value); resetList(); }}>
              <option value="all">All statuses</option>
              {supportStatuses.slice(1).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              <option value="closed">Closed</option>
            </select>
            <label className="support-search"><CalendarDays size={18} aria-hidden="true" />
              <select aria-label="Last activity date" value={days} onChange={e => { setDays(e.target.value); resetList(); }}>
                <option value="">All time</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option>
              </select>
            </label>
          </div>
          <div className="support-list-limit">
            {staff && <label>Service level <select aria-label="Service level" value={sla} onChange={e => { setSla(e.target.value); resetList(); }}><option value="all">All requests</option><option value="overdue">Overdue</option></select></label>}
            <span>{error ? "Updates paused · Showing last successful refresh" : `Auto-refreshes every 15 seconds · Last synced ${supportDate.format(new Date(data.syncedAt))} WAT`}</span>
            {data.canConfigureSla && staff && <div className="support-thread-actions"><button className="button secondary" onClick={() => setForm("sla")}>SLA policy</button><button className="button secondary" onClick={() => void slaAction(false)}>Check overdue requests</button></div>}
          </div>
          {pending ? <Loading /> : (rows.length || selected) ? (
            <div className={`support-layout ${selected ? "has-selection" : ""}`}>
              <section className="support-request-list" aria-label="Support requests">
                {rows.map((t: any) => <button type="button" className={`surface ticket-select ${selected === t.id ? "is-selected" : ""}`}
                  aria-pressed={selected === t.id} key={t.id} onClick={() => openThread(t.id)}>
                  <strong>{t.subject}</strong><span>{staff && t.customer_name ? t.customer_name + " · " : ""}{t.status.replaceAll("_", " ")}</span>
                  {staff && t.sla_overdue && <small>Overdue SLA</small>}{staff && t.assignee && <small>Assigned to {t.assignee}</small>}<small>{supportDate.format(new Date(t.updated_at))} WAT</small>
                </button>)}
                <SupportPagination page={data.page} pages={data.pages} label="Request pages" change={p => { setSelected(null); setPage(p); }} />
              </section>
              {selected && !ticket ? <section className="surface support-conversation"><button className="button secondary" onClick={() => setSelected(null)}>Back to requests</button>{thread.error ? <Notice type="error" message={thread.error} /> : <Loading />}</section> : !ticket ? <section className="support-placeholder"><Empty title="Select a conversation">Choose a request to see its messages.</Empty></section> :
                <section className="surface support-conversation" aria-label="Request conversation">
                  <button type="button" className="button secondary support-back" onClick={() => setSelected(null)}><ArrowLeft size={16} />Back to requests</button>
                  <header className="support-thread-header"><div><h2>{ticket.subject}</h2>
                    <p>{staff && ticket.customer_name ? ticket.customer_name + " · " : ""}{ticket.status.replaceAll("_", " ")}</p>
                    <small>Request ID: {ticket.id}</small>
                  </div>{staff && canAct && <button type="button" className="button secondary" onClick={() => { setEditVersion(ticket.version); setForm("manage"); }}>Manage request</button>}</header>
                  {thread.error && <Notice type="error" message="Conversation updates paused. Showing the last successful refresh." />}
                  {staff && <div className="support-sla-summary">
                    {ticket.response_due_at ? <><span>First response: {ticket.sla.response} · {supportDate.format(new Date(ticket.response_due_at))} WAT</span><span>Resolution: {ticket.sla.resolution} · {supportDate.format(new Date(ticket.resolution_due_at))} WAT</span></> : <span>SLA targets unconfigured for this request</span>}
                    {!ticket.response_due_at && data.canConfigureSla && !["resolved", "closed"].includes(ticket.status) && <button type="button" className="button secondary" onClick={() => void slaAction(true)}>Apply branch SLA</button>}
                  </div>}
                  <div className="support-thread" aria-live="polite">
                    <div className="support-message"><strong>Original request</strong><p>{ticket.message}</p></div>
                    {ticket.messages.map((m: any) => <div key={m.id} className={`support-message ${m.internal ? "internal" : ""}`}>
                      <strong>{m.author}{m.internal ? " · Internal note" : ""}</strong><p>{m.body}</p><small>{supportDate.format(new Date(m.created_at))} WAT</small>
                    </div>)}
                  </div>
                  <SupportPagination page={ticket.messagePage} pages={ticket.messagePages} label="Message pages" change={p => setMessagePage(p === ticket.messagePages ? "latest" : p)} />
                  {ticket.attachments.length > 0 && <section className="support-attachments" aria-label="Request attachments">
                    {ticket.attachments.map((attachment: any) => <a key={attachment.id} href={`/api/media/${attachment.id}`} target="_blank" rel="noreferrer">
                      {/* Authenticated image URLs must bypass the shared Next image cache. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/media/${attachment.id}`} loading="lazy" alt={attachment.alt} />
                      <span>{attachment.alt}{attachment.internal ? " · Staff only" : ""}</span>
                    </a>)}
                  </section>}
                  {canAct && ticket.status !== "closed" && <div className="support-thread-actions">
                    <button type="button" className="button" onClick={() => { setOperationId(crypto.randomUUID()); setForm("reply"); }}>Reply</button>
                    <button type="button" className="button secondary" onClick={() => setForm("attachment")}>Attach image</button>
                    {staff && <button type="button" className="button secondary" onClick={() => { setOperationId(crypto.randomUUID()); setForm("note"); }}>Add internal note</button>}
                  </div>}
                </section>}
            </div>
          ) : <div className="support-empty">
            <span className="support-empty-icon"><Headset size={48} aria-hidden="true" /></span>
            <h2>{data.totals.total ? "No matching requests" : "No support requests yet"}</h2>
            <p>{data.totals.total ? "Try another search, status or date range." : "Customer conversations and requests will appear here."}</p>
            {data.totals.total
              ? <button className="button secondary" onClick={() => { setStatus("all"); setSearch(""); setDays(""); setSla("all"); resetList(); }}>Clear filters</button>
              : canAct ? newButton("Create a Support Request", true) : null}
          </div>}
        </section>
      </>}
      {form && (form === "new" || form === "sla" || ticket) && <Modal title={title} onClose={() => setForm(null)}>
        {form === "note" && <p>Only authorised support staff can see this note.</p>}
        {form === "sla" ? <SupportSlaForm branch={data?.branch} done={done} /> : form === "attachment" ? <SupportAttachmentForm requestId={ticket.id} staff={staff} done={done} /> : <ActionForm contextual key={`${form}:${ticket?.id ?? orderId}`} title={title} onDone={done}
          action={form === "new" ? "support.create" : form === "manage" ? "support.update" : "support.reply"}
          onResult={result => { if (form === "new" && result.id) openThread(result.id); }}
          submit={form === "new" ? "Send request" : form === "note" ? "Save note" : form === "reply" ? "Send reply" : "Save changes"}
          fields={form === "new" ? [
            ...(staff ? [{ name: "customerRef", label: "Existing customer ID" }] : []),
            ...(!staff && orderId ? [{ name: "orderId", label: "Order", type: "hidden", value: orderId }] : []),
            { name: "subject", label: "Subject", value: !staff && orderId ? "Order delivery support" : "" },
            { name: "message", label: "How can we help?", type: "textarea" },
          ] : form === "manage" ? [
            { name: "id", label: "", type: "hidden", value: ticket.id },
            { name: "version", label: "", type: "number-hidden", value: editVersion },
            { name: "status", label: "Status", value: ticket.status, options: [...supportStatuses.slice(1).map(([value, label]) => ({ value, label })), { value: "closed", label: "Closed" }] },
            { name: "assigneeId", label: "Assign to staff account ID (optional)", required: false },
          ] : [
            { name: "id", label: "", type: "hidden", value: ticket.id },
            { name: "operationId", label: "", type: "hidden", value: operationId },
            { name: "body", label: form === "note" ? "Internal note" : "Message", type: "textarea" },
            ...(form === "note" ? [{ name: "internal", label: "", type: "boolean-hidden", value: "true" }] : []),
          ]} />}
      </Modal>}
    </div>
  );
}
export function OperationsWorkspace({
  isOwner = false,
}: {
  isOwner?: boolean;
}) {
  const [tab, setTab] = useState("purchasing");
  return (
    <div className="workflow-stack product-workspace operations-workspace">
      <ProductHeading eyebrow="BUSINESS OPERATIONS" title="Operations centre" description="Manage purchasing, catalogue and branch operations from one workspace." />
      <div className="workflow-tabs product-switcher" role="group" aria-label="Operations workspace">
        {[
          "purchasing",
          "catalogue",
          "cylinders",
          "branches",
          "staff",
          "maintenance",
          "delegations",
          ...(isOwner ? ["email"] : []),
        ].map((t) => (
          <button
            key={t}
            className={`button ${tab === t ? "" : "secondary"}`}
            aria-pressed={tab === t}
            onClick={() => setTab(t)}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <p className="muted">
        Each action is checked against your role and branch. Verify your
        password using your profile menu before a sensitive action.
      </p>
      {tab === "email" && isOwner ? (
        <MailDeliveryControls />
      ) : tab === "delegations" ? (
        <Delegations />
      ) : tab === "purchasing" ? (
        <Purchasing />
      ) : tab === "catalogue" ? (
        <CatalogueEditor />
      ) : tab === "cylinders" ? (
        <CylinderOperations />
      ) : tab === "branches" ? (
        <BranchOperations />
      ) : tab === "staff" ? (
        <StaffOperations />
      ) : (
        <Maintenance />
      )}
    </div>
  );
}
function Purchasing() {
  const { data, error, reload } = useRecords("purchasing"),
    { data: products } = useRecords("products.manage");
  if (error) return <Notice type="error" message={error} />;
  if (!data || !products) return <Loading />;
  return (
    <>
      <Notice message="Purchases use the shared Approval Centre. Approval is independent; receipt records actual incoming goods. Use Inventory for gas purchases, partial receipts and governed transfers." />
      <p>
        <Link href="/admin/inventory">Open Inventory management →</Link> ·{" "}
        <Link href="/admin/approvals">Review or cancel pending approval →</Link>
      </p>
      <div className="workflow-grid">
        <ActionForm
          action="supplier.create"
          title="Add supplier"
          fields={[
            { name: "branchId", label: "Branch ID", value: "lagos" },
            { name: "name", label: "Supplier name" },
            { name: "contact", label: "Contact details" },
          ]}
          onDone={reload}
        />
        <ActionForm
          action="purchase.create"
          title="Request a purchase"
          fields={[
            {
              name: "supplierId",
              label: "Supplier",
              options: data.suppliers
                .filter((s: any) => s.active)
                .map((s: any) => ({ value: s.id, label: s.name })),
            },
            {
              name: "productId",
              label: "Product",
              options: products.products
                .filter((p: any) => p.category !== "Gas refills")
                .map((p: any) => ({
                  value: p.id,
                  label: p.name,
                })),
            },
            { name: "quantity", label: "Quantity", type: "number" },
            { name: "unitCostKobo", label: "Unit cost (₦)", type: "money" },
          ]}
          onDone={reload}
        />
      </div>
      {data.orders.map((p: any) => (
        <div className="surface workflow-form" key={p.id}>
          <h3>
            {Number(p.quantity) / (p.gas ? 1000 : 1)} {p.gas ? "kg" : "units"} ·{" "}
            {p.product} · {p.supplier}
          </h3>
          <p>
            {p.status} · {Number(p.received_quantity) / (p.gas ? 1000 : 1)}{" "}
            {p.gas ? "kg" : "units"} received.{" "}
            {p.unit_cost_kobo !== undefined
              ? "Recorded cost " +
                money(
                  (Number(p.unit_cost_kobo) * Number(p.quantity)) /
                    (p.gas ? 1000 : 1),
                )
              : "Acquisition costs require finance access."}
          </p>
          {((p.status === "draft" &&
            data.permissions.canApprove &&
            p.requested_by !== data.permissions.userId) ||
            (p.status === "approved" && data.permissions.canReceive)) && (
            <ActionForm
              action="purchase.update"
              title="Next action"
              fields={[
                { name: "id", label: "", type: "hidden", value: p.id },
                {
                  name: "status",
                  label: "Action",
                  options: (p.status === "draft"
                    ? ["approved"]
                    : ["received"]
                  ).map((value) => ({ value, label: value })),
                },
                {
                  name: "invoiceReference",
                  label: "Supplier invoice reference (required for receipt)",
                  required: false,
                },
              ]}
              onDone={reload}
            />
          )}
        </div>
      ))}
    </>
  );
}
export function CatalogueEditor({
  initialId = "new",
  onSaved,
}: { initialId?: string; onSaved?: () => void } = {}) {
  const { data, error, reload } = useRecords("products.manage");
  const [selected, setSelected] = useState(initialId);
  if (error) return <Notice type="error" message={error} />;
  if (!data) return <Loading />;
  const p = data.products.find((p: any) => p.id === selected);
  return (
    <>
      <label>
        Product
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="new">Create new product</option>
          {data.products.map((p: any) => (
            <option value={p.id} key={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <ActionForm
        key={selected}
        action="product.save"
        title={p ? "Edit product content" : "Create unpublished product"}
        fields={[
          {
            name: "id",
            label:
              "Product identifier (lowercase letters, numbers and hyphens)",
            value: p?.id,
          },
          { name: "name", label: "Name", value: p?.name },
          {
            name: "description",
            label: "Description",
            type: "textarea",
            value: p?.description,
          },
          {
            name: "category",
            label: "Category",
            value: p?.category,
            options: (data.categories ?? []).map((value: string) => ({
              value,
              label: value,
            })),
          },
          {
            name: "sizeKg",
            label: "Size in kg (leave empty for accessories)",
            type: "nullable-number",
            value: p?.size_kg,
          },
          {
            name: "asset",
            label: "Illustration",
            value: p?.asset,
            options: ["cylinder", "burner", "hose", "regulator", "kit"].map(
              (value) => ({ value, label: value }),
            ),
          },
          {
            name: "safety",
            label: "Safety information",
            type: "textarea",
            value: p?.safety,
          },
        ]}
        onDone={() => {
          reload();
          onSaved?.();
        }}
      />
      <Notice message="New products start unpublished with no selling price or stock. Use Settings and the Approval Centre to approve price and publication, then receive stock." />
    </>
  );
}
function CylinderOperations() {
  const { data, error, reload } = useRecords("cylinders");
  const [selected, setSelected] = useState("");
  if (error) return <Notice type="error" message={error} />;
  if (!data) return <Loading />;
  const options = data.map((c: any) => ({
    value: c.id,
    label: `${c.serial} · ${c.status}`,
  }));
  return (
    <>
      <label>
        Cylinder
        <select value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">Choose cylinder…</option>
          {options.map((o: any) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      {selected && (
        <div className="workflow-grid">
          <ActionForm
            key={`inspection:${selected}`}
            action="cylinder.inspect"
            title="Record documented inspection"
            fields={[
              { name: "id", label: "", type: "hidden", value: selected },
              { name: "passed", label: "Inspection passed", type: "checkbox" },
              {
                name: "nextDue",
                label: "Next documented inspection date",
                type: "date",
              },
              {
                name: "notes",
                label: "Inspector findings and reference",
                type: "textarea",
              },
            ]}
            onDone={reload}
          />
          <ActionForm
            key={`fill:${selected}`}
            action="cylinder.fill"
            title="Record filling an eligible empty cylinder"
            fields={[
              { name: "id", label: "", type: "hidden", value: selected },
              {
                name: "reason",
                label: "Fill record / operator reference",
                type: "textarea",
              },
            ]}
            onDone={reload}
          />
          <ActionForm
            key={`custody:${selected}`}
            action="cylinder.custody"
            title="Issue or return cylinder"
            fields={[
              { name: "id", label: "", type: "hidden", value: selected },
              {
                name: "customerId",
                label: "Customer account ID (empty returns to branch)",
                type: "nullable",
                required: false,
              },
              {
                name: "reason",
                label: "Custody record / reference",
                type: "textarea",
              },
            ]}
            onDone={reload}
          />
        </div>
      )}
      <p>
        Only documented inspections are recorded. This interface does not issue
        safety certification or change gas stock.
      </p>
    </>
  );
}
function BranchOperations() {
  const { data, error, reload } = useRecords("branches"),
    { data: transfers, reload: reloadTransfers } = useRecords("transfers");
  if (error) return <Notice type="error" message={error} />;
  if (!data || !transfers) return <Loading />;
  const branches = data.map((b: any) => ({ value: b.id, label: b.name }));
  return (
    <>
      <ActionForm
        action="branch.create"
        title="Create branch"
        fields={[
          { name: "id", label: "Identifier" },
          { name: "name", label: "Branch name" },
        ]}
        onDone={reload}
      />
      <Notice message="New branches start with no stock, no prices and ordering disabled. Customer website checkout currently fulfils from Lagos." />
      <ActionForm
        action="transfer.create"
        title="Dispatch stock transfer"
        fields={[
          { name: "sourceBranch", label: "Source", options: branches },
          {
            name: "destinationBranch",
            label: "Destination",
            options: branches,
          },
          { name: "productId", label: "Product identifier" },
          { name: "quantity", label: "Quantity", type: "number" },
        ]}
        onDone={reloadTransfers}
      />
      {transfers.map((t: any) => (
        <div className="surface workflow-form" key={t.id}>
          <h3>
            {t.product_id} · {t.quantity}
          </h3>
          <p>
            {t.source_branch} → {t.destination_branch} · {t.status}
          </p>
          {t.status === "in_transit" && (
            <ActionForm
              action="transfer.receive"
              title="Confirm destination receipt"
              fields={[{ name: "id", label: "", type: "hidden", value: t.id }]}
              onDone={reloadTransfers}
            />
          )}
        </div>
      ))}
    </>
  );
}
function StaffOperations() {
  return (
    <div className="workflow-grid">
      <ActionForm
        action="staff.invite"
        title="Invite a colleague"
        fields={[
          { name: "email", label: "Email", type: "email" },
          { name: "name", label: "Name" },
          { name: "branchId", label: "Branch ID", value: "lagos" },
        ]}
        submit="Queue invitation"
      />
      <ActionForm
        action="staff.suspend"
        title="Suspend staff access"
        fields={[
          { name: "userId", label: "Staff account ID" },
          {
            name: "reason",
            label: "Reason (at least 10 characters)",
            type: "textarea",
          },
        ]}
        confirm="Suspend this colleague and revoke all their sessions?"
      />
      <Notice message="Accepted invitations create accounts without staff privileges. Use the protected staff-access setting and independent approval to grant a role. Owners cannot suspend themselves or other owners." />
    </div>
  );
}
function Maintenance() {
  const { data, error, reload } = useRecords("jobs");
  if (error) return <Notice type="error" message={error} />;
  return (
    <>
      <ActionForm
        action="jobs.run"
        title="Run local maintenance"
        fields={[]}
        submit="Run maintenance"
        onDone={reload}
      />
      <p>
        Expires stale approvals, activates due approved changes with authority
        checks, flags inspection dates, and creates eligible in-app refill
        reminders. A local worker command can run the same process continuously.
      </p>
      {data?.map((r: any) => (
        <section className="surface workflow-form" key={r.id}>
          <strong>
            {r.job} · {r.status}
          </strong>
          <small>{new Date(r.started_at).toLocaleString()}</small>
          <p>
            {Object.entries(r.detail)
              .map(([k, v]) => `${k}: ${v}`)
              .join(" · ")}
          </p>
        </section>
      ))}
    </>
  );
}
export function CreditWallet() {
  const { data: wallet, error, reload } = useRecords("wallet"),
    { data: program } = useRecords("rewards.program"),
    { data: credits, reload: reloadCredits } = useRecords("credits");
  if (error) return <Notice type="error" message={error} />;
  if (!wallet || !program || !credits) return <Loading />;
  return (
    <div className="workflow-stack product-workspace">
      <ProductHeading eyebrow="CUSTOMER CREDIT" title="Purchase credit & rewards" description="View purchase credit and manage your eligible rewards." />
      <div className="workflow-grid">
        <section className="surface workflow-form">
          <h2>{money(wallet.balanceKobo)}</h2>
          <p>Purchase credit balance</p>
          <p>
            {program.walletEnabled
              ? "Available for eligible orders at checkout."
              : "Spending is currently disabled by the business."}
          </p>
        </section>
        <section className="surface workflow-form">
          <h2>{wallet.points} points</h2>
          <p>
            {program.enabled
              ? `Earn one point per ${money(program.spendPerPoint)} of eligible verified product spend.`
              : "Reward earning is currently disabled."}
          </p>
          <p>Points are separate from wallet money.</p>
        </section>
      </div>
      <Notice message="Points are separate from monetary purchase credit. Point-to-wallet conversion is closed. See EasyRewards for your history and approved checkout offers." />
      <Link href="/rewards">View EasyRewards</Link>
      <h2>Credit and refund requests</h2>
      {credits.map((c: any) => (
        <section className="surface workflow-form" key={c.id}>
          <strong>
            {c.kind.replaceAll("_", " ")} · {money(c.amount_kobo)} · {c.status}
          </strong>
          {c.booking_id && (
            <p>
              Service refund scope:{" "}
              {c.service_refund_scope === "excess"
                ? "Reconciled excess only; completed-service rewards retained"
                : "Full service refund review; approved refund reverses service rewards"}
            </p>
          )}
          <p>{c.reason}</p>
        </section>
      ))}
      <h2>Wallet ledger</h2>
      {wallet.entries.map((e: any) => (
        <section className="surface workflow-form" key={e.id}>
          <strong>
            {money(e.amount_kobo)} · {e.kind.replaceAll("_", " ")}
          </strong>
          <small>{new Date(e.created_at).toLocaleString()}</small>
        </section>
      ))}
      <p className="muted">
        Bank-transfer top-ups are reviewed by finance. Bank withdrawals and
        transfers to other wallets are not supported. Refunds require customer
        consent and finance approval.
      </p>
    </div>
  );
}
export function CustomerCreditRequestForm({customer,onDone}:{customer:CreditCustomer;onDone:()=>void}) {
  return (<div className="credit-request-form"><ActionForm
        key={customer.id}
        action="credit.request"
        title="Record cash received for purchase credit"
        fields={[
          { name: "customerId", label: "", type:"hidden", value:customer.id },
          {name:"branchId",label:"",type:"hidden",value:customer.credit_branch_id},
          {
            name: "amountKobo",
            label: "Amount actually received (kobo)",
            type: "number",
          },
          { name: "receiptReference", label: "Unique receipt reference" },
          {
            name: "reason",
            label: "Receipt details and reason",
            type: "textarea",
          },
        ]}
        onDone={onDone}
        submit="Request independent verification"
      /></div>);
}
export function CreditManagement() {
  const [selectedCustomer, setSelectedCustomer] = useState<CreditCustomer | null>(null);
  const [dialog, setDialog] = useState<"credit" | "refund" | null>(null);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const query = new URLSearchParams({ view: "workspace", tab, q: search, page: String(page) });
  const { data, error, pending } = useSupportRecords("credits?" + query, revision, true);
  const reload = () => setRevision(value => value + 1);
  const c = pending ? undefined : data?.rows.find((row: any) => row.id === selectedId);
  const tabs = [["all", "All requests"], ["credits", "Credits"], ["refunds", "Refunds"], ["pending", "Pending"], ["completed", "Completed"]];
  const amount = (kobo: string) => {
    const value = BigInt(kobo);
    return `₦${(value / 100n).toLocaleString("en-NG")}.${String(value % 100n).padStart(2, "0")}`;
  };
  return (
    <div className="workflow-stack product-workspace">
      <ProductHeading eyebrow="FINANCE" title="Credits & Refunds" description="Find a customer, record purchase credit and review refund requests." />
      {error && <Notice type="error" message={error} />}
      {!data && !error && <Loading />}
      {data && <div className="finance-primary">
        {[
          ["Total credits", amount(data.summary.creditsKobo)],
          ["Refunds credited to wallets", amount(data.summary.refundsKobo)],
          ["Pending requests", data.summary.pending],
          ["Completed approvals", data.summary.completed],
        ].map(([label, value]) => <article className="surface finance-metric" key={label}><span>{label}</span><strong>{value}</strong></article>)}
      </div>}
      <div className="finance-panels">
        <section className="surface"><h2>Find a customer</h2><CreditCustomerSearch selected={selectedCustomer} onSelect={setSelectedCustomer} /></section>
        <section className="surface"><h2>Quick actions</h2><div className="finance-actions">
          <button className="button" disabled={!selectedCustomer?.credit_branch_id} onClick={() => setDialog("credit")}>Record credit</button>
          <button className="button secondary" onClick={() => setDialog("refund")}>Review refunds</button>
        </div>{!selectedCustomer?.credit_branch_id && <p>Select a customer with an authorised branch to record credit.</p>}</section>
      </div>
      <section className="surface support-inbox">
        <div className="support-status-controls" role="group" aria-label="Request status">
          {tabs.map(([key, label]) => <button type="button" key={key} className={`support-status-control ${key === tab ? "is-active" : ""}`} aria-pressed={key === tab} onClick={() => { setTab(key); setPage(1); }}>{label}{data ? ` (${data.summary[key]})` : ""}</button>)}
        </div>
        <label>Search requests<FormInput type="search" maxLength={100} value={search} placeholder="Customer, reference or request ID" onChange={event => { setSearch(event.target.value); setPage(1); }} /></label>
        {pending && data ? <Loading /> : data && <>
          {data.rows.length ? <div className="workflow-stack">
            {data.rows.map((row: any) => <button type="button" className="button secondary" key={row.id} onClick={() => setSelectedId(row.id)}>
              {row.customer_name} · {amount(String(row.amount_kobo))} · {row.kind.replaceAll("_", " ")} · {row.status === "approved" ? "Credited to wallet" : row.status}
            </button>)}
          </div> : <Empty title={data.summary.all ? "No matching requests" : "No credit or refund requests yet"}>Requests appear here when they are submitted for verification.</Empty>}
          <SupportPagination page={page} pages={Math.max(page, Math.ceil(data.total / 20))} change={setPage} label="Request pages" />
        </>}
      </section>
      {dialog === "credit" && selectedCustomer && <Modal title="Record purchase credit" onClose={() => setDialog(null)}>
        <ActionForm contextual action="reauth" title="Verify identity" fields={[{ name: "password", label: "Your password", type: "password" }]} submit="Verify identity" />
        <CustomerCreditRequestForm customer={selectedCustomer} onDone={() => { setDialog(null); reload(); }} />
      </Modal>}
      {dialog === "refund" && <Modal title="Review refund requests" onClose={() => setDialog(null)}>
        <p>Customers can request eligible refunds from their orders. Approved purchase-credit refunds post to the wallet. Provider-funded refunds require the provider workflow.</p>
        <button className="button" onClick={() => { setTab("refunds"); setPage(1); setDialog(null); }}>Show refund requests</button>
      </Modal>}
      {c && <Modal title="Request details" onClose={() => setSelectedId(null)}>
        <section className="surface workflow-form" key={c.id}>
          <h3>
            {c.customer_name} · {money(c.amount_kobo)} ·{" "}
            {c.kind.replaceAll("_", " ")}
          </h3>
          <p>
            {c.status} · {c.order_reference ?? c.receipt_reference}
          </p>
          <p>{c.reason}</p>
          {c.kind === "bank_transfer" && (
            <div className="stack">
              <strong>
                Confirm this receipt against the business bank statement before
                approving.
              </strong>
              <p>
                Sender: {c.funding_details?.senderName} · Transfer date:{" "}
                {c.funding_details?.transferDate}
              </p>
              <p>
                Destination: {c.funding_details?.bankName} ·{" "}
                {c.funding_details?.accountName} ·{" "}
                {c.funding_details?.accountNumber}
              </p>
            </div>
          )}
          {c.booking_id && (
            <p>
              Service refund scope:{" "}
              {c.service_refund_scope === "excess"
                ? "Reconciled excess only; service rewards retained"
                : "Full service review; approval reverses service rewards"}
            </p>
          )}
          {c.can_decide && <>
            <ActionForm contextual action="reauth" title="Verify identity" fields={[{ name: "password", label: "Your password", type: "password" }]} submit="Verify identity" />
            <ActionForm contextual
              action="credit.decide"
              title="Finance decision"
              fields={[
                { name: "id", label: "", type: "hidden", value: c.id },
                {
                  name: "decision",
                  label: "Decision",
                  options: [
                    { value: "approved", label: "Approve verified credit" },
                    { value: "rejected", label: "Reject request" },
                  ],
                },
                {
                  name: "reason",
                  label: "Evidence and reason",
                  type: "textarea",
                },
              ]}
              onDone={() => { setSelectedId(null); reload(); }}
            />
          </>}
        </section>
      </Modal>}
    </div>
  );
}
export function PointOfSale() {
  const { data, error, reload } = useRecords("pos");
  const [form, setForm] = useState<"sale" | "close" | "reports" | "verify" | "receipt" | null>(null);
  const [active, setActive] = useState<any>(null);
  const [receipt, setReceipt] = useState<any>(null);
  const [saleKey, setSaleKey] = useState(() => crypto.randomUUID());
  const [saleError, setSaleError] = useState("");
  const [lines, setLines] = useState([{ productId: "", quantity: "1" }]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const committing = useRef(false);
  const receipts = useRef<HTMLElement>(null);
  if (!data) return error ? <><Notice type="error" message={error} /><button className="button secondary" onClick={reload}>Retry POS</button></> : <Loading />;
  const shift = data.ownShift;
  const canRecord = data.canSell && shift?.branch_active === true;
  const products = data.products.filter((p: any) => p.published && !p.archived && Number(p.available) > 0 && Number(p.price_kobo) > 0);
  const startSale = () => { setSaleError(""); setForm("sale"); };
  const closeForm = () => { if (!committing.current) setForm(null); };
  async function sell(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (committing.current || !canRecord) return;
    const tender = new FormData(e.currentTarget).get("tender");
    committing.current = true;
    setBusy(true);
    setSaleError("");
    try {
      const r = await api("pos.sale", {
        shiftId: shift.id,
        items: lines.map(line => ({ productId: line.productId, quantity: Number(line.quantity) })),
        tenderedKobo: nairaToKobo(tender),
        idempotencyKey: saleKey,
      });
      setReceipt(r);
      setSaleKey(crypto.randomUUID());
      setLines([{ productId: "", quantity: "1" }]);
      setForm(null);
      reload();
    } catch (e: any) {
      setSaleError(e.message);
    } finally {
      committing.current = false;
      setBusy(false);
    }
  }
  const estimate = lines.reduce((total, line) => total + Number(products.find((p: any) => p.id === line.productId)?.price_kobo ?? 0) * Number(line.quantity), 0);
  const visible = data.sales.filter((r: any) => `${r.reference} ${r.cashier} ${r.branch_id}`.toLowerCase().includes(query.trim().toLowerCase()));
  const metrics = [
    ["Today’s sales", gasMoney(data.today.sales_kobo), ShoppingCart],
    ["Receipts today", String(data.today.receipts), ReceiptText],
    ["Stock impact", `${data.today.units} units`, Layers],
    ["Your till", shift ? (canRecord ? "Open" : "Branch inactive") : "Closed", LockKeyhole],
  ] as const;
  return <div className="workflow-stack product-workspace support-desk pos-workspace">
    <header className="support-hero"><span className="support-hero-icon"><Store size={42} aria-hidden="true" /></span>
      <div><span className="eyebrow">Sales</span><h1>Retail Point of Sale</h1><p>Record in-person cash sales, review receipts and submit your till for cash-up.</p></div>
    </header>
    {error && <Notice type="error" message={error} />}
    <section className="support-metrics" aria-label="POS metrics for today in Lagos">
      {metrics.map(([label, value, Icon]) => <article className="surface support-metric" key={label}>
        <span className="support-metric-icon"><Icon size={24} aria-hidden="true" /></span><div><span>{label}</span><strong>{value}</strong></div>
      </article>)}
    </section>
    <p className="support-list-limit">Today uses Africa/Lagos time. Cash collections are not verified revenue until cash-up.</p>
    {receipt && <Notice type="success" message={`Receipt ${receipt.reference} · Total ${gasMoney(receipt.total_kobo)} · Change ${gasMoney(receipt.change_kobo ?? Number(receipt.tendered_kobo) - Number(receipt.total_kobo))}`} />}
    <div className="pos-top-grid">
      <section className="surface pos-panel">
        <h2><Store size={21} aria-hidden="true" />{shift ? "Your active till" : "Open your till shift"}</h2>
        {shift ? <>
          <p>{shift.branch_name} · Opened {supportDate.format(new Date(shift.created_at))} WAT</p>
          <dl><dt>Opening float</dt><dd>{gasMoney(shift.opening_kobo)}</dd><dt>Expected cash including float</dt><dd>{gasMoney(shift.cash_in_till_kobo)}</dd></dl>
          {!canRecord && <p>Sales are unavailable for this till. Submit the counted cash to close it.</p>}
        </> : data.canSell && data.branches.length ? <ActionForm contextual action="pos.open" title="Open your till shift" submit="Open Till & Start Selling" onDone={reload}
          fields={[
            { name: "branchId", label: "Branch", value: data.branches.length === 1 ? data.branches[0].id : "", options: data.branches.map((b: any) => ({ value: b.id, label: b.name })) },
            { name: "openingKobo", label: "Opening cash float (₦)", type: "naira", value: "0" },
          ]} /> : <p>{data.canSell ? "No active branch is available for your till." : "Your role can review receipts and cash-up records."}</p>}
      </section>
      <section className="surface pos-panel"><h2>Quick actions</h2>
        <div className="pos-quick-grid">
          <button className="button secondary" disabled={!canRecord || !products.length} onClick={startSale}><ShoppingCart size={18} />New sale</button>
          <button className="button secondary" onClick={() => receipts.current?.focus()}><ReceiptText size={18} />View receipts</button>
          <button className="button secondary" disabled={!shift || !data.canSell} onClick={() => setForm("close")}><LockKeyhole size={18} />Close till</button>
          <button className="button secondary" onClick={() => setForm("reports")}><BarChart3 size={18} />Till reports</button>
        </div>
        {!canRecord ? <p>Open an authorised active till to record cash sales.</p> : !products.length && <p>No published, priced products with available stock.</p>}
      </section>
    </div>
    <section className="surface pos-panel" ref={receipts} tabIndex={-1} aria-label="Recent receipts">
      <h2>Recent receipts</h2>
      {data.sales.length > 0 && <FormInput type="search" aria-label="Search receipts" placeholder="Search receipt, cashier or branch" value={query} onChange={e => setQuery(e.target.value)} />}
      {!visible.length ? <div className="support-empty">
        <span className="support-empty-icon"><ReceiptText size={40} /></span>
        <h2>{data.sales.length ? "No matching receipts" : "No recent receipts"}</h2>
        <p>{data.sales.length ? "Try another search." : "Recorded cash sale receipts will appear here."}</p>
        {canRecord && products.length > 0 && !data.sales.length && <button className="button secondary" onClick={startSale}>Record a sale</button>}
      </div> : <div className="pos-receipts">{visible.map((r: any) => <button type="button" className="surface ticket-select" key={r.id} onClick={() => { setActive(r); setForm("receipt"); }}>
        <strong>{r.reference}</strong><span>{supportDate.format(new Date(r.created_at))} WAT · {r.cashier}</span><span>Cash · {r.shift_status === "verified" ? "Cash-up verified" : "Collected"}</span><strong>{gasMoney(r.total_kobo)}</strong>
      </button>)}</div>}
    </section>
    {form === "sale" && <Modal title="New cash sale" onClose={closeForm}>
      <form className="surface workflow-form product-form support-dialog-form" onSubmit={sell}>
        {lines.map((line, i) => <fieldset key={i} disabled={busy}>
          <legend>Item {i + 1}</legend>
          <label>Product<select required value={line.productId} onChange={e => setLines(lines.map((l, n) => n === i ? { ...l, productId: e.target.value } : l))}>
            <option value="">Choose a product</option>{products.map((p: any) => <option key={p.id} value={p.id}>{p.name} · {gasMoney(p.price_kobo)}</option>)}
          </select></label>
          <label>Quantity<FormInput required type="number" min={1} max={100} value={line.quantity} onChange={e => setLines(lines.map((l,n) => n === i ? { ...l, quantity: e.target.value } : l))} /></label>
          {lines.length > 1 && <button type="button" className="button secondary" onClick={() => setLines(lines.filter((_, n) => n !== i))}>Remove item</button>}
        </fieldset>)}
        {lines.length < 30 && <button type="button" className="button secondary" disabled={busy} onClick={() => setLines([...lines, { productId: "", quantity: "1" }])}>Add item</button>}
        <p aria-live="polite">Estimated total: {gasMoney(estimate)}. The server confirms prices and stock.</p>
        <label>Cash tendered (₦)<FormInput required name="tender" inputMode="decimal" disabled={busy} /></label>
        {saleError && <Notice type="error" message={saleError} />}
        <button className="button" disabled={busy}>{busy ? "Recording…" : "Record cash sale"}</button>
      </form>
    </Modal>}
    {form === "close" && shift && <Modal title="Close till" onClose={closeForm}>
      <p>Expected cash including float: {gasMoney(shift.cash_in_till_kobo)}. Enter the actual count for independent verification.</p>
      <ActionForm contextual action="pos.close" title="Close till" submit="Submit cash-up" onDone={() => { setForm(null); reload(); }}
        fields={[{ name: "shiftId", label: "", type: "hidden", value: shift.id }, { name: "countedKobo", label: "Counted cash (₦)", type: "naira" }, { name: "note", label: "Cash-up note", type: "textarea" }]} />
    </Modal>}
    {form === "reports" && <Modal title="Till reports" onClose={closeForm}>
      {!data.shifts.length && <p>No till shifts recorded.</p>}
      {data.shifts.map((s: any) => <section className="surface workflow-form" key={s.id}>
        <h3>{s.cashier} · {s.branch_id} · {s.status}</h3>
        <p>Opening float: {gasMoney(s.opening_kobo)}{s.expected_kobo != null ? ` · Expected ${gasMoney(s.expected_kobo)} · Counted ${gasMoney(s.counted_kobo)} · Variance ${gasMoney(Number(s.counted_kobo) - Number(s.expected_kobo))}` : ""}</p>
        {data.canVerify && s.status === "submitted" && s.cashier_id !== data.actorId &&
          <button className="button secondary" onClick={() => { setActive(s); setForm("verify"); }}>Verify cash-up</button>}
      </section>)}
    </Modal>}
    {form === "verify" && active && <Modal title="Independent cash-up verification" onClose={closeForm}>
      <ActionForm contextual action="reauth" title="Verify identity" fields={[{ name: "password", label: "Your password", type: "password" }]} submit="Verify identity" />
      <ActionForm contextual action="pos.verify" title="Verify cash-up" fields={[{ name: "shiftId", label: "", type: "hidden", value: active.id }]} submit="Verify reconciled shift"
        onDone={() => { setForm("reports"); reload(); }} />
    </Modal>}
    {form === "receipt" && active && <Modal title={active.reference} onClose={closeForm}>
      <p>{active.cashier} · {active.branch_id} · {supportDate.format(new Date(active.created_at))} WAT</p>
      <p>Cash {active.shift_status === "verified" ? "cash-up verified" : "collected; cash-up not yet verified"}</p>
      <dl><dt>Total</dt><dd>{gasMoney(active.total_kobo)}</dd><dt>Tendered</dt><dd>{gasMoney(active.tendered_kobo)}</dd><dt>Change</dt><dd>{gasMoney(Number(active.tendered_kobo) - Number(active.total_kobo))}</dd></dl>
    </Modal>}
  </div>;
}
export function RecurringOrders() {
  const { data: plans, error, reload } = useRecords("schedules"),
    { data: authorisations, reload: reloadAuthorisations } = useRecords(
      "schedule.authorisations",
    ),
    { data: catalogue } = useRecords("catalogue");
  if (error) return <Notice type="error" message={error} />;
  if (!plans || !authorisations || !catalogue) return <Loading />;
  return (
    <div className="workflow-stack product-workspace">
      <ProductHeading eyebrow="ORDER SCHEDULES" title="Authorised recurring orders" description="Review recurring orders and their customer authorisations." />
      <p>
        Create a <Link href="/schedules">refill plan</Link> first. Authorisation
        permits recurring cash-on-delivery orders within your maximum total. It
        never authorises an electronic debit. Pause a plan or revoke
        authorisation before generation to stop future orders.
      </p>
      <ActionForm
        action="reauth"
        title="Verify your password before authorising"
        fields={[{ name: "password", label: "Password", type: "password" }]}
      />
      <ActionForm
        action="schedule.authorise"
        title="Authorise a plan"
        fields={[
          {
            name: "scheduleId",
            label: "Active plan",
            options: plans
              .filter(
                (p: any) =>
                  p.status === "active" &&
                  !authorisations.some((a: any) => a.schedule_id === p.id),
              )
              .map((p: any) => ({
                value: p.id,
                label: `${p.product_name} · every ${p.interval_days} days`,
              })),
          },
          { name: "address.name", label: "Recipient name" },
          { name: "address.phone", label: "Nigerian mobile number" },
          { name: "address.street", label: "Street address" },
          {
            name: "address.zone",
            label: "Delivery area",
            options: catalogue.zones.map((z: string) => ({
              value: z,
              label: z,
            })),
          },
          {
            name: "window",
            label: "Delivery window",
            options: catalogue.windows.map((w: string) => ({
              value: w,
              label: w,
            })),
          },
          {
            name: "quantity",
            label: "Quantity per order",
            type: "number",
            value: 1,
          },
          {
            name: "maximumTotalKobo",
            label: "Maximum total per order including delivery (kobo)",
            type: "number",
          },
          {
            name: "consent",
            label:
              "I authorise these recurring cash-on-delivery orders within my maximum total. I can pause the plan or revoke authorisation.",
            type: "checkbox",
          },
        ]}
        onDone={() => {
          reload();
          reloadAuthorisations();
        }}
        submit="Authorise recurring COD orders"
      />
      {authorisations.map((a: any) => (
        <section className="surface workflow-form" key={a.id}>
          <h3>
            {a.product_id} · {a.active ? "Authorised" : "Revoked"}
          </h3>
          <p>
            {a.quantity} per order · maximum {money(a.maximum_total_kobo)} ·
            next date {new Date(a.next_date).toLocaleDateString()}
          </p>
          <p>{a.consent_text}</p>
          {a.active && (
            <ActionForm
              action="schedule.revoke"
              title="Stop future generation"
              fields={[{ name: "id", label: "", type: "hidden", value: a.id }]}
              submit="Revoke authorisation"
              onDone={reloadAuthorisations}
            />
          )}
          <ActionForm
            action="schedule.reschedule"
            title="Move next preferred date"
            fields={[
              { name: "id", label: "", type: "hidden", value: a.schedule_id },
              { name: "nextDate", label: "Future date", type: "date" },
            ]}
            onDone={() => {
              reload();
              reloadAuthorisations();
            }}
          />
        </section>
      ))}
    </div>
  );
}
export function Campaigns() {
  const { data, error, reload } = useRecords("campaigns");
  if (error) return <Notice type="error" message={error} />;
  if (!data) return <Loading />;
  return (
    <div className="workflow-stack product-workspace campaigns-workspace">
      <ProductHeading eyebrow="GROWTH & ENGAGEMENT" title="Customer campaigns" description="Create relevant messages, review delivery and manage approved campaigns." />
      <details className="surface product-disclosure"><summary>Rewards reconciliation</summary><div className="product-disclosure-body"><EasyRewardsReport /></div></details>
      <p>
        In-app messages only. Recipients must have opted into marketing and have
        an order in the branch. Delivery rechecks consent, active accounts and
        Lagos quiet hours.
      </p>
      <details className="surface product-disclosure"><summary>Create a campaign</summary>
      <ActionForm
        action="campaign.create"
        title="Draft a campaign"
        fields={[
          { name: "branchId", label: "Branch ID", value: "lagos" },
          { name: "title", label: "Title" },
          { name: "body", label: "Message", type: "textarea" },
          {
            name: "segment",
            label: "Audience",
            options: [
              { value: "all", label: "All opted-in customers" },
              { value: "inactive", label: "No orders in the last 30 days" },
              { value: "repeat", label: "At least two delivered orders" },
            ],
          },
        ]}
        onDone={reload}
      />
      </details>
      <h2 className="product-section-title">Campaign history <span className="product-result-count">{data.length} campaigns</span></h2>
      {data.length === 0 && <Empty title="No campaigns yet">Create your first draft above. Only eligible, opted-in customers receive approved messages.</Empty>}
      {data.map((c: any) => (
        <section className="surface workflow-form campaign-card" key={c.id}>
          <h3>
            {c.title} · {c.status}
          </h3>
          <p>{c.body}</p>
          <small>
            {c.recipients} selected · {c.sent} published in-app · {c.pending}{" "}
            pending · {c.skipped} skipped
          </small>
          <p>
            {c.returning_customers_30d} recipient(s) made a qualifying verified,
            delivered purchase within 30 days after publication. This is a
            time-based association, not proof that the campaign caused the
            purchase. Counts can overlap between campaigns.
          </p>
          {["draft", "approved"].includes(c.status) && (
            <ActionForm
              action="campaign.decide"
              title="Review campaign"
              fields={[
                { name: "id", label: "", type: "hidden", value: c.id },
                {
                  name: "decision",
                  label: "Decision",
                  options: (c.status === "draft"
                    ? ["approved", "cancelled"]
                    : ["cancelled"]
                  ).map((value) => ({ value, label: value })),
                },
              ]}
              onDone={reload}
            />
          )}
        </section>
      ))}
    </div>
  );
}

function DownloadPersonalData() {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <section>
      <button
        className="button secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const data = await api("account.export", {}),
              url = URL.createObjectURL(
                new Blob([JSON.stringify(data, null, 2)], {
                  type: "application/json",
                }),
              ),
              a = document.createElement("a");
            a.href = url;
            a.download = "easygas-personal-data.json";
            a.click();
            URL.revokeObjectURL(url);
          } catch (e: any) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        Download my personal data
      </button>
      {error && <Notice type="error" message={error} />}
    </section>
  );
}
function Delegations() {
  const { data, error, reload } = useRecords("delegations");
  if (error) return <Notice type="error" message={error} />;
  if (!data) return <Loading />;
  return (
    <div className="workflow-stack">
      <h2>Limited approval delegation</h2>
      <p>
        Only Level 2 catalogue publication and delivery-capacity reviews are
        supported. Financial and security authority cannot be delegated. A
        separate owner must approve each grant; the recipient cannot approve
        their own requests, grantor requests or redelegate granted authority.
      </p>
      <ActionForm
        action="delegation.request"
        title="Request a limited grant"
        fields={[
          { name: "delegateId", label: "Eligible colleague account ID" },
          {
            name: "key",
            label:
              "Setting key (delivery.capacity or publish.product-identifier)",
          },
          { name: "scope", label: "Branch ID", value: "lagos" },
          {
            name: "maximumValue",
            label: "Maximum capacity value (empty for publication)",
            type: "nullable-number",
            required: false,
          },
          {
            name: "startsAt",
            label: "Starts (your device time zone)",
            type: "datetime-local",
          },
          {
            name: "expiresAt",
            label: "Expires within seven days (your device time zone)",
            type: "datetime-local",
          },
          {
            name: "reason",
            label: "Reason (at least 10 characters)",
            type: "textarea",
          },
        ]}
        onDone={reload}
      />
      {data.map((d: any) => (
        <section className="surface workflow-form" key={d.id}>
          <h3>
            {d.label} · {d.status}
          </h3>
          <p>
            {d.grantor} → {d.delegate} · {d.scope}
          </p>
          <p>
            {new Date(d.starts_at).toLocaleString()} –{" "}
            {new Date(d.expires_at).toLocaleString()}
          </p>
          <p>{d.reason}</p>
          {d.status === "pending" && (
            <ActionForm
              action="delegation.decide"
              title="Independent owner review"
              fields={[
                { name: "id", label: "", type: "hidden", value: d.id },
                {
                  name: "decision",
                  label: "Decision",
                  options: [
                    { value: "approved", label: "Approve bounded grant" },
                    { value: "rejected", label: "Reject grant" },
                  ],
                },
                { name: "reason", label: "Review reason", type: "textarea" },
              ]}
              onDone={reload}
            />
          )}{" "}
          {["pending", "approved"].includes(d.status) && (
            <ActionForm
              action="delegation.revoke"
              title="Revoke grant"
              fields={[
                { name: "id", label: "", type: "hidden", value: d.id },
                {
                  name: "reason",
                  label: "Revocation reason",
                  type: "textarea",
                },
              ]}
              onDone={reload}
            />
          )}
        </section>
      ))}
    </div>
  );
}
export function NotificationInbox() {
  const { data, error, reload } = useRecords("me");
  if (error) return <Notice type="error" message={error} />;
  if (!data) return <Loading />;
  return (
    <div className="workflow-stack product-workspace notification-workspace">
      <ProductHeading eyebrow="YOUR UPDATES" title="Notifications" description="Order updates, support replies and reminders, together in one inbox." />
      <p className="product-result-count">{data.notifications.filter((n: any) => !n.read_at).length} unread · {data.notifications.length} total</p>
      {data.notifications.length ? (
        data.notifications.map((n: any) => (
          <article className={`surface workflow-form notification-card ${n.read_at ? "" : "is-unread"}`} key={n.id}>
            <h3>
              {n.title}
              {n.read_at ? "" : " · Unread"}
            </h3>
            <p>{n.body}</p>
            <small>{new Date(n.created_at).toLocaleString()}</small>
            {!n.read_at && (
              <ActionForm
                action="notifications.read"
                title=""
                fields={[
                  { name: "id", label: "", type: "hidden", value: n.id },
                ]}
                onDone={reload}
                submit="Mark read"
              />
            )}
          </article>
        ))
      ) : (
        <Empty title="You're all caught up">
          Order updates, reminders and support replies will appear here.
        </Empty>
      )}
    </div>
  );
}
