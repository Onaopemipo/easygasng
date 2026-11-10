"use client";
import { useEffect, useRef, useState } from "react";
import Link from "./workspace-link";
import { navigationItems } from "../../../packages/business-rules/src/admin-navigation";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  HardHat,
  Plus,
  Search,
  UsersRound,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { api, Loading, Modal, Notice } from "./ui";
import { serviceMutation } from "./service-mutation";
import { ServiceForm } from "./professional-services";
import type {
  TechnicianDirectoryRow,
  TechnicianScheduleRow,
  TechnicianWorkspaceData,
} from "../../../packages/business-rules/src/technicians-availability";
const local = (v: string) =>
  new Date(v).toLocaleString("en-NG", {
    timeZone: "Africa/Lagos",
    dateStyle: "medium",
    timeStyle: "short",
  });
const pretty = (v: string) => v.replaceAll("_", " ");
export default function TechniciansAvailability({ user }: { user: any }) {
  const [showFilters, setShowFilters] = useState(false);
  const [data, setData] = useState<TechnicianWorkspaceData | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [refresh, setRefresh] = useState(0),
    [q, setQ] = useState(""),
    [query, setQuery] = useState(""),
    [branch, setBranch] = useState(user.branchId || user.branch_id || "lagos"),
    [status, setStatus] = useState("all"),
    [qualification, setQualification] = useState("all"),
    [serviceId, setServiceId] = useState(""),
    [date, setDate] = useState(""),
    [page, setPage] = useState(1),
    [schedulePage, setSchedulePage] = useState(1),
    [modal, setModal] = useState(""),
    [target, setTarget] = useState<TechnicianDirectoryRow | null>(null),
    [slot, setSlot] = useState<TechnicianScheduleRow | null>(null),
    [message, setMessage] = useState("");
  const rail = useRef<HTMLElement>(null);
  useEffect(() => {
    const t = setTimeout(() => setQuery(q), 250);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    setPage(1);
  }, [query, branch, status, qualification, serviceId, date]);
  useEffect(() => {
    setSchedulePage(1);
  }, [branch, date]);
  useEffect(() => {
    let live = true;
    setBusy(true);
    api(
      "technicians.workspace?" +
        new URLSearchParams({
          q: query,
          branchId: branch,
          status,
          qualification,
          serviceId,
          ...(date ? { date } : {}),
          page: String(page),
          schedulePage: String(schedulePage),
        }),
    )
      .then((d) => {
        if (live) {
          setData(d);
          setError("");
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setBusy(false);
      });
    return () => {
      live = false;
    };
  }, [
    query,
    branch,
    status,
    qualification,
    serviceId,
    date,
    page,
    schedulePage,
    refresh,
  ]);
  useEffect(() => {
    const t = setInterval(() => {
      if (!document.hidden && !modal) setRefresh((n) => n + 1);
    }, 60000);
    return () => clearInterval(t);
  }, [modal]);
  const close = () => {
      setModal("");
      setTarget(null);
      setSlot(null);
    },
    done = () => {
      close();
      setRefresh((n) => n + 1);
      setMessage("Your change was saved. The workspace is refreshing.");
    };
  if (!data)
    return error ? (
      <>
        <Notice type="error" message={error} />
        <button className="button" onClick={() => setRefresh((n) => n + 1)}>
          Try again
        </button>
      </>
    ) : (
      <Loading page />
    );
  const permissions = data.permissions,
    techOptions = data.people
      .filter((p) => p.active)
      .map((p) => ({ value: p.id, label: p.name }));
  const branchOptions = data.branches
    .filter((b) => b.active)
    .map((b) => ({ value: b.id, label: b.name }));
  return (
    <div className="technicians-workspace">
      <header className="technicians-heading">
        <div className="technicians-title">
          <span className="technicians-icon">
            <HardHat size={32} />
          </span>
          <div>
            <h1>Technicians &amp; Availability</h1>
            <p>
              Manage your technicians, qualifications and service availability
              in one place.
            </p>
          </div>
        </div>
        <div className="button-row">
          <button
            className="button secondary"
            onClick={() => {
              rail.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              });
              rail.current?.focus();
            }}
          >
            <CalendarDays size={18} /> Availability
          </button>
          {permissions.verify && (
            <button
              className="button secondary"
              onClick={() => setModal("verify")}
            >
              Verify qualification
            </button>
          )}
          {permissions.invite && (
            <button className="button" onClick={() => setModal("invite")}>
              <Plus size={18} /> Add Technician
            </button>
          )}
        </div>
      </header>
      <nav className="service-tabs" aria-label="Professional services">
        <Link href="/services">Services</Link>
        {[
          ["bookings", "My Bookings"],
          ["services", "Manage Services"],
          ["technicians", "Technicians"],
          ["quotations", "Quotations"],
          ["incidents", "Incidents"],
        ]
          .filter(([id]) =>
            navigationItems
              .find((item) => item.id === id)
              ?.roles.includes(user.role),
          )
          .map(([id, label]) => (
            <Link
              key={id}
              href={`/admin/${id}`}
              aria-current={id === "technicians" ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
      </nav>
      {error && (
        <Notice
          type="error"
          message={`${error} Showing the last confirmed data. Refresh to try again.`}
        />
      )}
      {message && <Notice type="success" message={message} />}
      <div className="technicians-meta">
        <span role="status">
          {busy
            ? "Updating…"
            : `Updated ${local(data.generatedAt)} · Africa/Lagos`}
        </span>
        <button
          className="text-link"
          disabled={busy}
          onClick={() => setRefresh((n) => n + 1)}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>
      <section className="technicians-kpis" aria-label="Technician summary">
        {[
          [UsersRound, "Total Technicians", data.summary.total, "all"],
          [CheckCircle2, "Active", data.summary.active, "active"],
          [
            CalendarDays,
            "On Assignment",
            data.summary.onAssignment,
            "assigned",
          ],
          [
            Clock3,
            date ? "Available on selected date" : "Available Today",
            data.summary.availableToday,
            "available",
          ],
        ].map(([Icon, label, value, filter]: any) => (
          <button
            key={filter}
            className="surface technicians-kpi"
            onClick={() => setStatus(filter)}
            aria-pressed={status === filter}
          >
            <span className="technicians-icon">
              <Icon size={25} />
            </span>
            <span>
              {label}
              <strong>{value}</strong>
            </span>
          </button>
        ))}
      </section>
      <div className="technicians-columns">
        <section className="surface technicians-directory" aria-busy={busy}>
          <div className="section-heading">
            <h2>Technicians</h2>
            <div className="button-row">
              {["all", "active", "inactive"].map((v) => (
                <button
                  key={v}
                  className={"button " + (status === v ? "" : "secondary")}
                  onClick={() => setStatus(v)}
                  aria-pressed={status === v}
                >
                  {pretty(v)}
                </button>
              ))}
            </div>
          </div>
          <div className="technicians-filters">
            <label className="technicians-search">
              <span>
                <Search size={16} /> Search technicians
              </span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Name, ID or qualification"
              />
            </label>
            <button
              className="button secondary"
              aria-expanded={showFilters}
              onClick={() => setShowFilters((v) => !v)}
            >
              Filters
            </button>
            {showFilters && (
              <div className="technicians-advanced-filters">
                {" "}
                <label>
                  Branch
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                  >
                    {user.role === "owner" && (
                      <option value="">All authorised branches</option>
                    )}
                    {data.branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Qualifications
                  <select
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                  >
                    {["all", "verified", "expired", "missing"].map((v) => (
                      <option key={v} value={v}>
                        {pretty(v)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Service
                  <select
                    value={serviceId}
                    onChange={(e) => setServiceId(e.target.value)}
                  >
                    <option value="">All services</option>
                    {data.services.map((s) => (
                      <option key={s.id + s.branch_id} value={s.id}>
                        {s.name} · {s.branch_id}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </div>
          <div
            className="technicians-table"
            role="table"
            aria-label="Technicians"
          >
            <div className="technicians-row technicians-table-head" role="row">
              <span role="columnheader">Technician</span>
              <span role="columnheader">Skills / qualifications</span>
              <span role="columnheader">Status</span>
              <span role="columnheader">Actions</span>
            </div>
            {data.people.map((p) => (
              <div className="technicians-row" role="row" key={p.id}>
                <div role="cell">
                  <strong>{p.name}</strong>
                  <small title={p.id}>ID: {p.id.slice(0, 8)}</small>
                  <small>
                    {data.branches.find((b) => b.id === p.branch_id)?.name ||
                      p.branch_id}
                  </small>
                </div>
                <div role="cell">
                  <span>
                    {p.qualifications
                      .filter((q) => q.verified)
                      .map((q) => pretty(q.code))
                      .join(" · ") || "No verified qualifications"}
                  </span>
                  <small>
                    <ShieldCheck size={14} />{" "}
                    {p.qualifications.filter((q) => q.verified).length} current
                    verified
                  </small>
                </div>
                <div role="cell">
                  <span
                    className={
                      "technicians-status " +
                      (!p.active
                        ? "inactive"
                        : p.on_assignment
                          ? "assigned"
                          : p.available_today
                            ? "available"
                            : "")
                    }
                  >
                    {!p.active
                      ? "Inactive"
                      : p.on_assignment
                        ? "On Assignment"
                        : p.available_today
                          ? "Available"
                          : "Not schedulable today"}
                  </span>
                </div>
                <div role="cell">
                  <button
                    className="button secondary"
                    aria-label={`View ${p.name}`}
                    onClick={() => {
                      setTarget(p);
                      setModal("details");
                    }}
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
          {!data.people.length && (
            <p className="technicians-empty">
              No technicians match these filters.
            </p>
          )}
          <div className="technicians-pagination">
            <span>{data.total} matching technicians</span>
            <button
              className="button secondary"
              disabled={page <= 1 || busy}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <span>Page {page}</span>
            <button
              className="button secondary"
              disabled={page * data.pageSize >= data.total || busy}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </section>
        <aside
          className="surface technicians-schedule"
          ref={rail}
          tabIndex={-1}
        >
          <div className="section-heading">
            <h2>
              <CalendarDays size={22} /> Upcoming Availability
            </h2>
          </div>
          <label>
            Calendar date (Africa/Lagos)
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                if (e.target.value) e.currentTarget.blur();
              }}
            />
          </label>
          {date && (
            <button className="text-link" onClick={() => setDate("")}>
              Show all upcoming dates
            </button>
          )}
          {permissions.schedule && (
            <button className="button" onClick={() => setModal("availability")}>
              <Plus size={16} /> Create availability
            </button>
          )}
          {!data.schedule.length && (
            <p className="technicians-empty">
              No upcoming appointments for this selection.
            </p>
          )}
          {data.schedule.map((s) => (
            <article className="technicians-slot" key={s.id}>
              <div className="technicians-date">
                <strong>
                  {new Date(s.starts_at).toLocaleDateString("en-NG", {
                    timeZone: "Africa/Lagos",
                    day: "2-digit",
                  })}
                </strong>
                {new Date(s.starts_at).toLocaleDateString("en-NG", {
                  timeZone: "Africa/Lagos",
                  month: "short",
                })}
              </div>
              <div>
                <strong>{s.service_name}</strong>
                <small>
                  {local(s.starts_at)} –{" "}
                  {new Date(s.ends_at).toLocaleTimeString("en-NG", {
                    timeZone: "Africa/Lagos",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </small>
                <small>
                  {s.technician_name} · {s.branch_id}
                </small>
                <span className="technicians-status">
                  {s.blocked
                    ? "Blocked"
                    : s.bookings
                      ? `${s.bookings} reserved booking(s)`
                      : !s.eligible
                        ? "Not eligible for booking"
                        : "Available slot"}
                </span>
                <small>Capacity {s.capacity}</small>
                {permissions.schedule && (
                  <button
                    className="text-link"
                    onClick={() => {
                      setSlot(s);
                      setModal("block");
                    }}
                  >
                    {s.blocked ? "Unblock" : "Block"} appointment
                  </button>
                )}
              </div>
            </article>
          ))}
          <div className="technicians-pagination">
            <button
              className="button secondary"
              disabled={schedulePage <= 1 || busy}
              onClick={() => setSchedulePage((p) => p - 1)}
            >
              Previous
            </button>
            <span>{schedulePage}</span>
            <button
              className="button secondary"
              disabled={schedulePage * 10 >= data.scheduleTotal || busy}
              onClick={() => setSchedulePage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </aside>
      </div>
      {modal && (
        <Modal
          title={
            modal === "invite"
              ? "Add Technician"
              : modal === "availability"
                ? "Create availability"
                : modal === "block"
                  ? "Manage appointment"
                  : modal === "verify"
                    ? "Independent qualification verification"
                    : modal === "revoke"
                      ? "Revoke qualification"
                      : modal === "edit"
                        ? "Edit technician"
                        : target?.name || "Technician details"
          }
          onClose={close}
        >
          {modal === "invite" ? (
            <>
              <p>
                Invite a colleague or link an existing identity. Technician
                access is granted through the existing staff access workflow
                after acceptance; an invitation does not grant qualifications.
              </p>
              <ServiceForm
                title="Invite a new colleague"
                fields={[
                  { name: "name", label: "Full name" },
                  { name: "email", label: "Email", type: "email" },
                  {
                    name: "branchId",
                    label: "Branch",
                    options: branchOptions,
                    value: branch,
                  },
                ]}
                send={(v) => api("staff.invite", v)}
                done={() => {
                  setMessage(
                    "Invitation created. Review its status and approved access in Staff Management.",
                  );
                  close();
                }}
                submit="Create invitation"
              />
              <Link className="button secondary" href="/admin/staff">
                Find existing account / review invitations
              </Link>
            </>
          ) : modal === "availability" ? (
            <>
              <p>
                Times are Africa/Lagos (WAT), regardless of your device
                timezone. Use the search and branch filters to find the
                technician first. The server rechecks qualification and
                conflicts.
              </p>
              <ServiceForm
                title="New available appointment"
                fields={[
                  {
                    name: "serviceId",
                    label: "Service",
                    options: data.services
                      .filter((s) => s.branch_id === branch && s.config.active)
                      .map((s) => ({
                        value: s.id,
                        label:
                          s.name + " · " + s.config.durationMinutes + " min",
                      })),
                  },
                  {
                    name: "technicianId",
                    label: "Active technician in current results",
                    options: techOptions.filter(
                      (o) =>
                        data.people.find((p) => p.id === o.value)?.branch_id ===
                        branch,
                    ),
                  },
                  {
                    name: "startsAt",
                    label: "Start (Africa/Lagos)",
                    type: "datetime-lagos",
                  },
                  {
                    name: "endsAt",
                    label: "End (Africa/Lagos)",
                    type: "datetime-lagos",
                  },
                ]}
                send={(v) =>
                  serviceMutation("services.slot.create", {
                    ...v,
                    branchId: branch,
                    startsAt: v.startsAt,
                    endsAt: v.endsAt,
                  })
                }
                done={done}
              />
            </>
          ) : modal === "block" && slot ? (
            <>
              <p>
                {slot.service_name} · {local(slot.starts_at)}
              </p>
              <p>
                {slot.bookings
                  ? "This appointment has a booking. Reschedule it with the customer before blocking."
                  : "No active booking is recorded for this slot. The server checks again before saving."}
              </p>
              <ServiceForm
                title={
                  slot.blocked ? "Unblock appointment" : "Block appointment"
                }
                fields={[{ name: "reason", label: "Reason" }]}
                send={(v) =>
                  serviceMutation("services.slot.block", {
                    id: slot.id,
                    blocked: !slot.blocked,
                    reason: v.reason,
                  })
                }
                done={done}
              />
            </>
          ) : modal === "verify" ? (
            <>
              <p>
                Only an authorised independent verifier can record this. Verify
                your identity before continuing. Evidence must be genuine and
                expiry documented.
              </p>
              <ServiceForm
                title="Record verification"
                fields={[
                  {
                    name: "userId",
                    label: "Technician / reviewer",
                    options: data.verificationTargets
                      .filter((o) => o.id !== user.id)
                      .map((o) => ({
                        value: o.id,
                        label: o.name + " · " + pretty(o.role),
                      })),
                    value: target?.id,
                  },
                  { name: "code", label: "Qualification code" },
                  {
                    name: "evidence",
                    label:
                      "Issuing authority, verification method and document reference",
                    type: "textarea",
                  },
                  {
                    name: "expiresAt",
                    label: "Documented expiry (Africa/Lagos)",
                    type: "datetime-lagos",
                  },
                ]}
                send={(v) => serviceMutation("technician.qualify", v)}
                done={done}
              />
            </>
          ) : modal === "edit" && target ? (
            <ServiceForm
              title="Edit name"
              fields={[
                { name: "name", label: "Full name", value: target.name },
                { name: "reason", label: "Reason for change" },
              ]}
              send={(v) => api("staff.edit", { ...v, userId: target.id })}
              done={done}
            />
          ) : modal === "revoke" && target ? (
            <ServiceForm
              title="Revoke current verification"
              fields={[
                {
                  name: "id",
                  label: "Qualification",
                  options: target.qualifications
                    .filter((q) => q.verified)
                    .map((q) => ({ value: q.id, label: pretty(q.code) })),
                },
                { name: "reason", label: "Reason for revocation" },
              ]}
              send={(v) => serviceMutation("technician.revoke", v)}
              done={done}
            />
          ) : (
            target && (
              <>
                <p>
                  {target.id} · {target.branch_id}
                </p>
                <p>
                  Assignment availability:{" "}
                  {target.technician_available ? "Enabled" : "Disabled"} ·
                  Account: {target.active ? "Active" : "Inactive"}
                </p>
                <h3>Qualifications</h3>
                {target.qualifications.length ? (
                  target.qualifications.map((q) => (
                    <p key={q.id}>
                      <strong>{pretty(q.code)}</strong> ·{" "}
                      {q.verified
                        ? "Verified"
                        : "Expired or no longer eligible"}
                      <br />
                      Valid until {local(q.expires_at)}
                      {q.evidence && (
                        <span className="technicians-evidence">
                          Verification reference: {q.evidence}
                        </span>
                      )}
                    </p>
                  ))
                ) : (
                  <p>No qualification records.</p>
                )}
                <div className="button-row">
                  {permissions.edit && (
                    <button
                      className="button secondary"
                      onClick={() => setModal("edit")}
                    >
                      Edit name
                    </button>
                  )}
                  {permissions.verify && target.id !== user.id && (
                    <>
                      <button
                        className="button"
                        onClick={() => setModal("verify")}
                      >
                        Verify qualification
                      </button>
                      <button
                        className="button secondary"
                        onClick={() => setModal("revoke")}
                      >
                        Revoke qualification
                      </button>
                    </>
                  )}
                </div>
                {permissions.edit && (
                  <Link className="text-link" href="/admin/staff">
                    Manage approved role, branch and account status
                  </Link>
                )}
                <button
                  className="button secondary"
                  onClick={() => {
                    setQ(target.id);
                    close();
                    rail.current?.focus();
                  }}
                >
                  View schedule and directory
                </button>
              </>
            )
          )}
          {["invite", "verify", "edit", "revoke"].includes(modal) && (
            <ServiceForm
              title="Verify your identity if requested"
              fields={[
                {
                  name: "password",
                  label: "Current password",
                  type: "password",
                },
              ]}
              send={(v) => api("reauth", v)}
              submit="Verify identity"
            />
          )}
        </Modal>
      )}
    </div>
  );
}
