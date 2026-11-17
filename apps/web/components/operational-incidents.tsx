"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Eye,
  MoreHorizontal,
  PencilLine,
  Search,
  ShieldAlert,
} from "lucide-react";
import { api, Loading, Modal, Notice } from "./ui";
import { FieldCaption } from "./field-caption";
import { FormInput } from "./password-input";
import "./operational-incidents.css";

const statuses = {
  all: "All incidents",
  open: "Open",
  acknowledged: "Acknowledged",
  resolved: "Resolved",
} as const;
const severities = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
} as const;
type Status = Exclude<keyof typeof statuses, "all">;
type Severity = keyof typeof severities;
type Incident = {
  id: string;
  category: string;
  detail: string;
  status: Status;
  severity: Severity;
  branch_name: string | null;
  created_at: string;
};
type IncidentPage = {
  rows: Incident[];
  page: number;
  pageSize: number;
  total: number;
  counts: Record<keyof typeof statuses, number>;
  canManage: boolean;
};
type Popup = { incident: Incident; mode: "details" | "manage" };
const statusIcons = {
  all: ClipboardList,
  open: AlertTriangle,
  acknowledged: Clock3,
  resolved: CheckCircle2,
};
const date = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Lagos",
});
const titleFor = (category: string) => {
  const label = category.replaceAll("_", " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
};
function Badge({ value, label }: { value: string; label: string }) {
  return (
    <span className="incidents-badge" data-tone={value}>
      {label}
    </span>
  );
}

function IncidentActions({
  incident,
  canManage,
  onOpen,
}: {
  incident: Incident;
  canManage: boolean;
  onOpen: (mode: Popup["mode"]) => void;
}) {
  const id = useId(),
    anchor = useRef<HTMLButtonElement>(null),
    panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    function dismiss(event: Event) {
      if (event.target instanceof Node && panel.current?.contains(event.target))
        return;
      if (panel.current?.matches(":popover-open")) panel.current.hidePopover();
    }
    window.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      window.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [open]);
  function choose(mode: Popup["mode"]) {
    panel.current?.hidePopover();
    anchor.current?.focus();
    onOpen(mode);
  }
  return (
    <>
      <button
        ref={anchor}
        type="button"
        className="icon-button incidents-action"
        popoverTarget={id}
        aria-controls={id}
        aria-expanded={open}
        aria-label={`Actions for ${titleFor(incident.category)} · ${incident.id}`}
      >
        <MoreHorizontal size={20} aria-hidden="true" />
      </button>
      <div
        ref={panel}
        id={id}
        popover="auto"
        className="incidents-actions"
        onToggle={(event) => {
          const menu = event.currentTarget;
          const visible = menu.matches(":popover-open");
          setOpen(visible);
          if (!visible || !anchor.current) return;
          const rect = anchor.current.getBoundingClientRect();
          const { clientWidth: width, clientHeight: height } =
            document.documentElement;
          const left = Math.min(
            rect.right - menu.offsetWidth,
            width - menu.offsetWidth - 8,
          );
          const below = rect.bottom + 6;
          const top =
            below + menu.offsetHeight <= height - 8
              ? below
              : rect.top - menu.offsetHeight - 6;
          menu.style.left = `${Math.max(8, left)}px`;
          menu.style.top = `${Math.max(8, top)}px`;
        }}
      >
        <button type="button" onClick={() => choose("details")}>
          <Eye size={16} aria-hidden="true" /> View incident
        </button>
        {canManage && (
          <button type="button" onClick={() => choose("manage")}>
            <PencilLine size={16} aria-hidden="true" /> Record response
          </button>
        )}
      </div>
    </>
  );
}

export default function OperationalIncidents({ refresh }: { refresh: number }) {
  const [data, setData] = useState<IncidentPage | null>(null);
  const [status, setStatus] = useState<keyof typeof statuses>("all");
  const [severity, setSeverity] = useState<Severity | "all">("all");
  const [search, setSearch] = useState(""),
    [query, setQuery] = useState("");
  const [page, setPage] = useState(1),
    [version, reload] = useState(0);
  const [waiting, setWaiting] = useState(true),
    [error, setError] = useState("");
  const [popup, setPopup] = useState<Popup | null>(null),
    [notice, setNotice] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const saveInProgress = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.trim() !== query) {
        setPage(1);
        setQuery(search.trim());
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [search, query]);
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      view: "workspace",
      status,
      severity,
      q: query,
      page: String(page),
    });
    setWaiting(true);
    setError("");
    api(`incidents?${params}`, undefined, { signal: controller.signal })
      .then((result: IncidentPage) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err.message);
          setData(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setWaiting(false);
      });
    return () => controller.abort();
  }, [status, severity, query, page, version, refresh]);
  function reset() {
    setStatus("all");
    setSeverity("all");
    setSearch("");
    setQuery("");
    setPage(1);
  }
  function saved() {
    setPopup(null);
    setNotice("Incident response saved.");
    reload((n) => n + 1);
    requestAnimationFrame(() => heading.current?.focus());
  }

  return (
    <div className="incidents-workspace">
      <header className="incidents-heading">
        <div className="incidents-icon">
          <ShieldAlert size={26} aria-hidden="true" />
        </div>
        <div>
          <h1>Operational incidents</h1>
          <p>Review reported incidents and record follow-up actions.</p>
        </div>
      </header>
      {data && (
        <div
          className="incidents-metrics"
          aria-label="Filter by incident status"
        >
          {(Object.keys(statuses) as (keyof typeof statuses)[]).map((value) => {
            const Icon = statusIcons[value];
            return (
              <button
                key={value}
                type="button"
                className="incidents-metric"
                aria-pressed={status === value}
                onClick={() => {
                  setStatus(value);
                  setPage(1);
                }}
              >
                <span className="incidents-icon" data-tone={value}>
                  <Icon size={20} aria-hidden="true" />
                </span>
                <span>
                  {statuses[value]}
                  <strong>{data.counts[value]}</strong>
                </span>
              </button>
            );
          })}
        </div>
      )}
      <section
        className="incidents-list surface"
        aria-labelledby="incident-list-title"
      >
        <div className="incidents-toolbar">
          <h2 id="incident-list-title" ref={heading} tabIndex={-1}>
            Incident register
          </h2>
          <div className="incidents-filters">
            <label className="incidents-search">
              <Search size={18} aria-hidden="true" />
              <input
                aria-label="Search incidents"
                placeholder="Search incidents…"
                type="search"
                value={search}
                maxLength={120}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <select
              aria-label="Filter by severity"
              value={severity}
              onChange={(e) => {
                setSeverity(e.target.value as Severity | "all");
                setPage(1);
              }}
            >
              <option value="all">All severities</option>
              {Object.entries(severities).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {(status !== "all" || severity !== "all" || search !== "") && (
              <button
                type="button"
                className="button secondary"
                onClick={reset}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
        {notice && (
          <div className="incidents-notice">
            <Notice type="success" message={notice} />
          </div>
        )}
        {error ? (
          <div className="incidents-empty">
            <Notice type="error" message={error} />
            <button
              type="button"
              className="button secondary"
              onClick={() => reload((n) => n + 1)}
            >
              Try again
            </button>
          </div>
        ) : waiting ? (
          <div className="incidents-empty">
            <Loading label="Loading incidents" />
          </div>
        ) : data && data.rows.length === 0 ? (
          <div className="incidents-empty">
            <ClipboardList size={28} aria-hidden="true" />
            <h3>
              {data.counts.all
                ? "No matching incidents"
                : "No operational incidents recorded"}
            </h3>
            <p>
              {data.counts.all
                ? "Try a different search or clear your filters."
                : "Reported incidents will appear here."}
            </p>
          </div>
        ) : (
          data && (
            <>
              <div>
                <table
                  className="incidents-table"
                  role="table"
                  aria-labelledby="incident-list-title"
                >
                  <thead role="rowgroup">
                    <tr role="row">
                      <th scope="col">Incident</th>
                      <th scope="col">Severity</th>
                      <th scope="col">Status</th>
                      <th scope="col">Branch</th>
                      <th scope="col">Reported (WAT)</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody role="rowgroup">
                    {data.rows.map((incident) => (
                      <tr key={incident.id} role="row">
                        <td role="cell" className="incidents-summary">
                          <strong>{titleFor(incident.category)}</strong>
                          <small>{incident.detail}</small>
                        </td>
                        <td role="cell">
                          <span className="incidents-cell-label">Severity</span>
                          <Badge
                            value={incident.severity}
                            label={severities[incident.severity]}
                          />
                        </td>
                        <td role="cell">
                          <span className="incidents-cell-label">Status</span>
                          <Badge
                            value={incident.status}
                            label={statuses[incident.status]}
                          />
                        </td>
                        <td role="cell">
                          <span className="incidents-cell-label">Branch</span>
                          {incident.branch_name ?? "Business-wide"}
                        </td>
                        <td role="cell">
                          <span className="incidents-cell-label">Reported (WAT)</span>
                          <time dateTime={incident.created_at}>
                            {date.format(new Date(incident.created_at))}
                          </time>
                        </td>
                        <td role="cell" className="incidents-row-actions">
                          <IncidentActions
                            incident={incident}
                            canManage={data.canManage}
                            onOpen={(mode) => {
                              setNotice("");
                              setPopup({ incident, mode });
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <footer
                className="incidents-pagination"
                aria-label="Incident pagination"
              >
                <span role="status">
                  Showing {(data.page - 1) * data.pageSize + 1}–
                  {Math.min(data.page * data.pageSize, data.total)} of{" "}
                  {data.total} incidents
                </span>
                <div>
                  <button
                    type="button"
                    className="button secondary"
                    disabled={data.page === 1}
                    onClick={() => setPage(data.page - 1)}
                  >
                    <ArrowLeft size={15} aria-hidden="true" /> Previous
                  </button>
                  <button
                    type="button"
                    className="button secondary"
                    disabled={data.page * data.pageSize >= data.total}
                    onClick={() => setPage(data.page + 1)}
                  >
                    Next <ArrowRight size={15} aria-hidden="true" />
                  </button>
                </div>
              </footer>
            </>
          )
        )}
      </section>
      {popup && (
        <Modal
          className="incident-popup"
          title={
            popup.mode === "manage"
              ? "Record incident response"
              : "Incident details"
          }
          onClose={() => {
            if (!saveInProgress.current) setPopup(null);
          }}
        >
          <IncidentDetails incident={popup.incident} />
          {popup.mode === "manage" && data?.canManage && (
            <IncidentResponse
              incident={popup.incident}
              saving={saveInProgress}
              onSaved={saved}
            />
          )}
        </Modal>
      )}
    </div>
  );
}

function IncidentDetails({ incident }: { incident: Incident }) {
  return (
    <section className="incident-details">
      <h3>{titleFor(incident.category)}</h3>
      <div className="incident-tags">
        <Badge
          value={incident.severity}
          label={severities[incident.severity]}
        />
        <Badge value={incident.status} label={statuses[incident.status]} />
      </div>
      <p>{incident.detail}</p>
      <dl>
        <div>
          <dt>Incident ID</dt>
          <dd>{incident.id}</dd>
        </div>
        <div>
          <dt>Branch</dt>
          <dd>{incident.branch_name ?? "Business-wide"}</dd>
        </div>
        <div>
          <dt>Reported</dt>
          <dd>
            <time dateTime={incident.created_at}>
              {date.format(new Date(incident.created_at))} WAT
            </time>
          </dd>
        </div>
      </dl>
    </section>
  );
}

function IncidentResponse({
  incident,
  saving,
  onSaved,
}: {
  incident: Incident;
  saving: { current: boolean };
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [dirty, setDirty] = useState(false),
    [verify, setVerify] = useState(false);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current) return;
    const form = event.currentTarget,
      fields = new FormData(form);
    const note = String(fields.get("note") ?? "").trim();
    if (note.length < 5) {
      setError(
        "Enter at least five characters describing the action taken or the evidence reviewed.",
      );
      return;
    }
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      if (verify) await api("reauth", { password: fields.get("password") });
      await api("incident.update", {
        id: incident.id,
        status: fields.get("status"),
        note,
      });
      onSaved();
    } catch (err) {
      const failure = err as Error & { code?: string };
      if (failure.code === "REAUTH_REQUIRED") setVerify(true);
      const password = form.elements.namedItem("password");
      if (password instanceof HTMLInputElement) password.value = "";
      setError(failure.message);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  return (
    <form
      className="incident-response"
      onSubmit={save}
      onChange={() => setDirty(true)}
      data-unsaved={dirty ? "true" : undefined}
    >
      <label>
        <FieldCaption required>Status</FieldCaption>
        <select
          name="status"
          required
          defaultValue={incident.status === "open" ? "" : incident.status}
        >
          <option value="" disabled>
            Choose a status
          </option>
          <option value="acknowledged">Acknowledged</option>
          <option value="resolved">Resolved</option>
        </select>
      </label>
      <label>
        <FieldCaption required>Corrective action / evidence</FieldCaption>
        <textarea
          name="note"
          required
          minLength={5}
          maxLength={2000}
          rows={4}
          placeholder="Describe the action taken or record the evidence you reviewed."
        />
      </label>
      {verify && (
        <label>
          <FieldCaption required>Confirm your password</FieldCaption>
          <FormInput
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </label>
      )}
      {error && <Notice type="error" message={error} />}
      <button type="submit" className="button" disabled={busy}>
        {busy ? "Saving response…" : "Save response"}
      </button>
    </form>
  );
}
