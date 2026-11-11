"use client";
import CreditCustomerSearch, {type CreditCustomer} from "./credit-customer-search";
import { confirmAction } from "./app-dialog";
import { PASSWORD_MIN_LENGTH } from "../../../packages/business-rules/src/password-policy";

import { FormInput } from "./password-input";
import { ChannelPreferences } from "./operations-completion";
import { MailDeliveryControls } from "./mail-delivery";
import { EasyRewardsReport, SmartRewardOffers } from "./easyrewards";
import React, { useState, useEffect, useRef, type FormEvent } from "react";
import Link from "./workspace-link";
import { useSearchParams } from "next/navigation";
import { AddressAreaFields } from "./address-area-fields";
import { api, Notice, Loading, Empty, money, Modal } from "./ui";
import { ProductHeading } from "./product-workspace";
import { Headset, MessageSquare, Clock, Hourglass, CircleCheck, Search, Plus, CalendarDays, ArrowLeft } from "lucide-react";
import { SupportAttachmentForm, SupportPagination, SupportSlaForm, useSupportRecords } from "./support-controls";
type Field = {
  name: string;
  label: string;
  type?: string;
  step?: string;
  min?: number;
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
                step={f.type === "money" ? "0.01" : f.step}
                minLength={f.type === "password" ? PASSWORD_MIN_LENGTH : undefined}
                maxLength={f.type === "password" ? 128 : 1000}
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
    <div className="container page narrow workflow-stack">
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
export function RefillProfiles({
  embedded = false,
}: { embedded?: boolean } = {}) {
  const { data, error, reload } = useRecords("refill.profiles"),
    { data: catalogue } = useRecords("catalogue");
  if (error) return <Notice type="error" message={error} />;
  if (!data || !catalogue) return <Loading />;
  return (
    <div className="workflow-stack">
      {embedded ? (
        <h2>Your cooking gas profiles</h2>
      ) : (
        <ProductHeading eyebrow="YOUR KITCHEN" title="Cooking gas profiles" description="Manage refill profiles and review estimates based on your verified deliveries." />
      )}
      <SmartRewardOffers />
      <p>
        Estimates use delivered, independently verified single-cylinder
        purchases for the selected refill size. They are not sensor readings.
      </p>
      {data.map((p: any) => (
        <section className="surface workflow-form" key={p.id}>
          <h2>
            {p.label} · {p.product_name}
          </h2>
          <p>{p.forecast.reason}</p>
          {p.lastVerifiedRefill && (
            <p>
              Last verified refill:{" "}
              {new Date(p.lastVerifiedRefill.date).toLocaleDateString("en-NG")}{" "}
              · {p.lastVerifiedRefill.kg} kg
              {p.typicalIntervalDays
                ? ` · Typical interval: ${p.typicalIntervalDays} days`
                : ""}
            </p>
          )}
          {p.history?.length > 0 && (
            <details>
              <summary>View verified refill history</summary>
              <ul>
                {p.history.map((r: any) => (
                  <li key={r.orderId}>
                    {new Date(r.date).toLocaleDateString("en-NG")} · {r.kg} kg ·{" "}
                    <Link href="/orders">View orders</Link>
                  </li>
                ))}
              </ul>
            </details>
          )}
          {p.forecast.available && (
            <>
              <h3>
                Estimated {p.forecast.estimatedPercent}% remaining ·{" "}
                {p.forecast.daysLeft} days
              </h3>
              <p>
                Confidence: {p.forecast.confidence} · estimated refill{" "}
                {new Date(p.forecast.nextDate).toLocaleDateString()}
              </p>
            </>
          )}
          <ActionForm
            action="refill.feedback"
            title="Tell us how much gas is left"
            fields={[
              { name: "profileId", label: "", type: "hidden", value: p.id },
              {
                name: "state",
                label: "Current supply",
                options: [
                  { value: "still_available", label: "Still have gas" },
                  { value: "low", label: "Almost empty" },
                  { value: "empty", label: "Gas finished" },
                  {
                    value: "already_refilled",
                    label: "Already refilled (self-report)",
                  },
                  {
                    value: "remind_later",
                    label: "Remind me later (pause for 24 hours)",
                  },
                ],
              },
            ]}
            onDone={reload}
          />
          {p.reminderState?.reason && (
            <p role="status">
              {p.reminderState.reason}
              {p.reminderState.until
                ? ` Until ${new Date(p.reminderState.until).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}.`
                : ""}
            </p>
          )}
          {p.feedback.map((f: any, i: number) => (
            <small key={i}>
              {f.state.replaceAll("_", " ")} ·{" "}
              {new Date(f.created_at).toLocaleDateString()}{" "}
            </small>
          ))}
        </section>
      ))}
      <ActionForm
        action="refill.profile.create"
        title="Add consumption profile"
        fields={[
          { name: "label", label: "Profile name" },
          {
            name: "productId",
            label: "Refill size",
            options: catalogue.products
              .filter((p: any) => p.category === "Gas refills")
              .map((p: any) => ({ value: p.id, label: p.name })),
          },
          {
            name: "householdSize",
            label: "People served",
            type: "number",
            value: 1,
          },
          {
            name: "cookingDays",
            label: "Cooking days per week",
            type: "number",
            value: 7,
          },
        ]}
        onDone={reload}
      />
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
  const { data, error, reload } = useRecords("credits");
  const [selectedCustomer,setSelectedCustomer]=useState<CreditCustomer|null>(null);
  if (error) return <Notice type="error" message={error} />;
  if (!data) return <Loading />;
  return (
    <div className="workflow-stack product-workspace">
      <ProductHeading eyebrow="FINANCE" title="Credits & refunds" description="Find a customer, record purchase credit and review refunds." />
      <CreditCustomerSearch selected={selectedCustomer} onSelect={setSelectedCustomer} />
      {selectedCustomer && selectedCustomer.credit_branch_id ? <CustomerCreditRequestForm key={selectedCustomer.id} customer={selectedCustomer} onDone={reload} /> : selectedCustomer ? <Notice message="This customer needs an authorised branch before purchase credit can be recorded." /> : <p>Select a customer above to record purchase credit.</p>}
      <h2>{selectedCustomer ? `Credit and refund requests for ${selectedCustomer.name}` : "Credit and refund requests"}</h2>
      {selectedCustomer && !data.some((c:any)=>c.customer_id===selectedCustomer.id) && <p>No credit or refund requests for this customer.</p>}
      {data.filter((c:any)=>!selectedCustomer||c.customer_id===selectedCustomer.id).map((c: any) => (
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
          {c.status === "pending" && (
            <ActionForm
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
              onDone={reload}
            />
          )}
        </section>
      ))}
    </div>
  );
}
export function PointOfSale() {
  const { data, error, reload } = useRecords("pos"),
    { data: unusedCatalogue } = useRecords("catalogue");
  const [receipt, setReceipt] = useState<any>(null),
    [saleKey, setSaleKey] = useState(() => crypto.randomUUID()),
    [saleError, setSaleError] = useState(""),
    [busy, setBusy] = useState(false);
  if (error) return <Notice type="error" message={error} />;
  if (!data) return <Loading />;
  const open = data.shifts.filter((s: any) => s.status === "open");
  async function sell(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setSaleError("");
    const f = new FormData(e.currentTarget);
    try {
      const r = await api("pos.sale", {
        shiftId: f.get("shiftId"),
        items: [
          {
            productId: f.get("productId"),
            quantity: Number(f.get("quantity")),
          },
        ],
        tenderedKobo: Number(f.get("tenderedKobo")),
        idempotencyKey: saleKey,
      });
      setReceipt(r);
      setSaleKey(crypto.randomUUID());
      reload();
    } catch (e: any) {
      setSaleError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="workflow-stack product-workspace">
      <ProductHeading eyebrow="SALES" title="Retail point of sale" description="Record an in-person sale and its payment using the existing stock records." />
      <p>
        Cash sales reduce available stock immediately. Revenue is verified
        through independent shift cash-up.
      </p>
      <ActionForm
        action="pos.open"
        title="Open your till shift"
        fields={[
          { name: "branchId", label: "Branch ID", value: "lagos" },
          {
            name: "openingKobo",
            label: "Opening cash float (kobo)",
            type: "number",
            value: 0,
          },
        ]}
        onDone={reload}
      />
      {open.length > 0 && (
        <form className="surface workflow-form product-form" onSubmit={sell}>
          <h2>Record cash sale</h2>
          <label>
            Open shift
            <select name="shiftId" required>
              {open.map((s: any) => (
                <option value={s.id} key={s.id}>
                  {s.cashier} · {s.branch_id}
                </option>
              ))}
            </select>
          </label>
          <label>
            Product
            <select name="productId" required>
              {data.products
                .filter((p: any) => p.published && p.available > 0)
                .map((p: any) => (
                  <option value={p.id} key={p.id}>
                    {p.name} · {money(p.price_kobo)}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Quantity
            <FormInput
              name="quantity"
              type="number"
              min={1}
              max={100}
              defaultValue={1}
              required
            />
          </label>
          <label>
            Cash tendered (kobo)
            <FormInput name="tenderedKobo" type="number" min={1} required />
          </label>
          {saleError && <Notice type="error" message={saleError} />}
          <button className="button" disabled={busy}>
            {busy ? "Recording…" : "Record sale"}
          </button>
          {receipt && (
            <Notice
              type="success"
              message={`${receipt.reference} · total ${money(receipt.total_kobo)} · change ${money(receipt.change_kobo ?? Number(receipt.tendered_kobo) - Number(receipt.total_kobo))}`}
            />
          )}
        </form>
      )}
      {data.shifts.map((s: any) => (
        <section className="surface workflow-form" key={s.id}>
          <h3>
            {s.cashier} · {s.status}
          </h3>
          <small>Shift ID: {s.id}</small>
          <p>
            Opening: {money(s.opening_kobo)}
            {s.expected_kobo !== null
              ? ` · Expected: ${money(s.expected_kobo)} · Counted: ${money(s.counted_kobo)}`
              : ""}
          </p>
          {s.status === "open" && (
            <ActionForm
              action="pos.close"
              title="Submit cash-up"
              fields={[
                { name: "shiftId", label: "", type: "hidden", value: s.id },
                {
                  name: "countedKobo",
                  label: "Total counted cash including float (kobo)",
                  type: "number",
                },
                { name: "note", label: "Cash-up note", type: "textarea" },
              ]}
              onDone={reload}
            />
          )}{" "}
          {s.status === "submitted" && (
            <ActionForm
              action="pos.verify"
              title="Independent finance verification"
              fields={[
                { name: "shiftId", label: "", type: "hidden", value: s.id },
              ]}
              onDone={reload}
              submit="Verify reconciled shift"
            />
          )}
        </section>
      ))}
      <h2>Recent receipts</h2>
      {data.sales.map((s: any) => (
        <p key={s.id}>
          {s.reference} · {money(s.total_kobo)} ·{" "}
          {new Date(s.created_at).toLocaleString()}
        </p>
      ))}
    </div>
  );
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
