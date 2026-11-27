"use client";
import { AssignmentResponseActions } from "./assignment-response-actions";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  Wrench,
  Play,
  CircleCheck,
  Clock3,
  ChevronRight,
  ArrowLeft,
  RefreshCw,
  Headphones,
  ShieldCheck,
  Wifi,
  UserRound,
  ClipboardList,
} from "lucide-react";
import Link from "./workspace-link";
import { api, Loading, Notice } from "./ui";
import { BookingCard, ServiceForm } from "./professional-services";
import { serviceMutation } from "./service-mutation";
import { ActionForm } from "./workflows";
import { useTheme } from "./theme-provider";
import {
  technicianStatus,
  technicianRange,
} from "../../../packages/business-rules/src/technician-mobile";
import {
  technicianCount,
  technicianDate,
  technicianGreeting,
  technicianReviewLabel,
  technicianTerminal,
  technicianTone,
} from "../../../packages/business-rules/src/technician-presentation";
import styles from "./technician-workspace.module.css";
const views = ["home", "jobs", "history", "profile"] as const;
type WorkspaceView = (typeof views)[number];
const labels = {
  home: "Home",
  jobs: "Jobs",
  history: "History",
  profile: "Profile",
};

export default function TechnicianWorkspace({ user }: { user: any }) {
  const router = useRouter(),
    params = useSearchParams(),
    appearance = useTheme();
  const view: WorkspaceView = views.includes(
    params.get("view") as WorkspaceView,
  )
    ? (params.get("view") as WorkspaceView)
    : "home";
  const selected = params.get("bookingId");
  const [snapshot, setSnapshot] = useState<any>(null),
    [list, setList] = useState<any>(null),
    [detail, setDetail] = useState<any>(null);
  const [q, setQ] = useState(""),
    [filter, setFilter] = useState("active"),
    [period, setPeriod] = useState("30"),
    [page, setPage] = useState(1);
  const [error, setError] = useState(""),
    [detailError, setDetailError] = useState(""),
    [loading, setLoading] = useState(true),
    [stale, setStale] = useState(true),
    [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(false),
    [detailPending, setDetailPending] = useState(false);
  const currentGeneration = useRef(0),
    writing = useRef(false);
  const restricted = useRef<Promise<any> | null>(null);
  const refresh = useCallback(() => setRevision((n) => n + 1), []);
  const history = view === "history",
    listView = history || view === "jobs";
  const range = technicianRange(period);
  function navigate(dest: WorkspaceView, id?: string) {
    const search = new URLSearchParams({ view: dest });
    if (id) search.set("bookingId", id);
    router.push("/admin/bookings?" + search);
  }
  useEffect(() => {
    setQ("");
    setFilter("active");
    setPage(1);
    setList(null);
  }, [view, user.id]);
  useEffect(() => {
    const controller = new AbortController(),
      generation = ++currentGeneration.current;
    setLoading(true);
    setStale(true);
    const timer = setTimeout(
      async () => {
        try {
          restricted.current ??= api("technician.restrict", {});
          await restricted.current;
          const query = new URLSearchParams({
            filter: history ? "past" : filter,
            page: String(page),
            ...(q ? { q } : {}),
            ...(history ? { from: range.from, to: range.to } : {}),
          });
          const [s, rows] = await Promise.all([
            api("technician.snapshot", undefined, {
              signal: AbortSignal.any([
                controller.signal,
                AbortSignal.timeout(20000),
              ]),
            }),
            listView
              ? api("technician.jobs?" + query, undefined, {
                  signal: AbortSignal.any([
                    controller.signal,
                    AbortSignal.timeout(20000),
                  ]),
                })
              : Promise.resolve(null),
          ]);
          if (
            controller.signal.aborted ||
            generation !== currentGeneration.current
          )
            return;
          setSnapshot(s);
          setList(rows);
          setStale(false);
          setError("");
        } catch (e: any) {
          if (
            controller.signal.aborted ||
            generation !== currentGeneration.current
          )
            return;
          if ([401, 403].includes(e.status)) {
            setSnapshot(null);
            setDetail(null);
          }
          setList(null);
          setError(
            e.message ||
              "Information could not be confirmed. Refresh to retry.",
          );
        } finally {
          if (
            !controller.signal.aborted &&
            generation === currentGeneration.current
          )
            setLoading(false);
        }
      },
      q ? 250 : 0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    user.id,
    user.branchId,
    history,
    listView,
    q,
    filter,
    page,
    range.from,
    range.to,
    revision,
  ]);
  useEffect(() => {
    const resume = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", resume);
    const timer = setInterval(resume, 60000);
    return () => {
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", resume);
      clearInterval(timer);
    };
  }, [refresh]);
  useEffect(() => {
    const controller = new AbortController();
    setDetailError("");
    setDetailPending(!!selected);
    if (!selected) return () => controller.abort();
    api("bookings?id=" + encodeURIComponent(selected), undefined, {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]),
    })
      .then((rows) => {
        if (controller.signal.aborted) return;
        const owned = rows.find((b: any) => b.id === selected);
        if (!owned) {
          setDetail(null);
          throw new Error(
            "This assignment is no longer accessible. Return to your jobs.",
          );
        }
        setDetail(owned);
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          if ([401, 403].includes(e.status)) setDetail(null);
          setDetailError(e.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setDetailPending(false);
      });
    return () => controller.abort();
  }, [selected, user.id, user.branchId, revision]);
  async function availability() {
    if (writing.current || stale || !snapshot) return;
    writing.current = true;
    setBusy(true);
    try {
      await serviceMutation("technician.availability", {
        available: !snapshot.profile.technician_available,
      });
      refresh();
    } catch (e: any) {
      setError(e.message);
      setStale(true);
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }
  const s = snapshot?.summary,
    p = snapshot?.profile;
  function jobRow(job: any) {
    return (
      <button
        className={styles.job}
        key={job.id}
        onClick={() =>
          navigate(technicianTerminal(job.status) ? "history" : "jobs", job.id)
        }
      >
        <span className={styles.jobIcon}>
          <Wrench size={22} aria-hidden="true" />
        </span>
        <span className={styles.jobText}>
          <strong>{job.reference}</strong>
          <span>{job.service}</span>
          <small>
            {technicianDate(job.starts_at)} WAT ·{" "}
            {job.address?.zone || "Location unavailable"}
          </small>
          {history && (
            <small>
              {job.history_at
                ? "Closed " + technicianDate(job.history_at) + " WAT"
                : "Historical event date unavailable"}
            </small>
          )}
        </span>
        <span className={styles.badge} data-tone={technicianTone(job)}>
          {technicianStatus(job)}
        </span>
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    );
  }
  return (
    <section className={styles.workspace} aria-label="Technician workspace">
      <header className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>YOUR SERVICE WORKSPACE</span>
          <h1>
            {view === "home" ? (
              <>
                {technicianGreeting(snapshot?.generatedAt)},{" "}
                <span>{p?.name || user.name}</span>
              </>
            ) : (
              labels[view]
            )}
          </h1>
          <p>
            {view === "home"
              ? "Your service overview. Clear priorities for the day ahead."
              : view === "history"
                ? "Your closed jobs, reports and retained evidence."
                : view === "jobs"
                  ? "Review and manage your assigned service jobs."
                  : "Your account, qualifications and preferences."}
          </p>
        </div>
        <div className={styles.date}>
          <CalendarDays size={18} />
          {technicianDate(snapshot?.generatedAt, true)}
          <small>Africa/Lagos</small>
        </div>
      </header>
      <nav className={styles.tabs} aria-label="Technician workspace views">
        {views.map((v) => (
          <button
            key={v}
            aria-current={view === v ? "page" : undefined}
            disabled={busy}
            onClick={() => navigate(v)}
          >
            {labels[v]}
          </button>
        ))}
        <button
          onClick={refresh}
          disabled={loading || busy}
          aria-label="Refresh technician information"
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </nav>
      {error && <Notice type="error" message={error} />}
      {stale && snapshot && (
        <Notice message="Last confirmed information. Refresh before making changes; connectivity, availability and work authorisation are separate." />
      )}
      {loading && !snapshot ? (
        <Loading />
      ) : !snapshot ? (
        <div className={styles.card}>
          <h2>Workspace unavailable</h2>
          <p>Your records could not be confirmed.</p>
          <button className="button" onClick={refresh}>
            Try again
          </button>
        </div>
      ) : selected ? (
        <section className={styles.detail}>
          <button className="button secondary" onClick={() => navigate(view)}>
            <ArrowLeft size={18} />
            Back to {labels[view].toLowerCase()}
          </button>
          {detailError && <Notice type="error" message={detailError} />}
          {detail?.id !== selected && !detailError && <Loading />}
          {detail?.id === selected && (
            <fieldset
              disabled={stale || loading || detailPending || !!detailError}
              className={styles.detailFields}
            >
              <h2>Job details · {detail.reference}</h2>
              {detail.status === "assigned" &&
                detail.assignment_response === "pending" && (
                  <AssignmentResponseActions
                    key={detail.id + ":" + detail.version}
                    disabled={
                      stale || loading || detailPending || !!detailError
                    }
                    declineDecision="declined"
                    send={(values) =>
                      serviceMutation("booking.assignment.respond", {
                        bookingId: detail.id,
                        version: detail.version,
                        ...values,
                      })
                    }
                    done={refresh}
                  />
                )}
              <BookingCard
                booking={detail}
                user={{ ...user, technician_service_only: true }}
                done={refresh}
              />
            </fieldset>
          )}
        </section>
      ) : view === "home" ? (
        <div className={styles.columns}>
          <div className={styles.main}>
            <div className={styles.metrics}>
              {[
                ["Assigned jobs", s.assigned, CalendarDays],
                ["In progress", s.in_progress, Play],
                ["Completed today", s.completed_today, CircleCheck],
                ["Upcoming", s.upcoming, Clock3],
              ].map(([title, value, Icon]: any, i) => (
                <div className={styles.metric} key={title} data-tone={i}>
                  <Icon size={23} aria-hidden="true" />
                  <span>{title}</span>
                  <strong>{technicianCount(value)}</strong>
                </div>
              ))}
            </div>
            <p className={styles.caption}>
              Your current branch only. Assigned: confirmed or assigned; in
              progress includes approval/acknowledgement; upcoming excludes
              declined assignments. Completed today uses recorded terminal
              events in Lagos.
            </p>
            <section className={`${styles.card} ${styles.appointment}`}>
              <div className={styles.sectionTitle}>
                <h2>
                  <CalendarDays size={21} />
                  Next appointment
                </h2>
                {snapshot.nextAppointment && (
                  <span className={styles.badge}>
                    {snapshot.nextAppointment.reference}
                  </span>
                )}
              </div>
              {snapshot.nextAppointment ? (
                <>
                  <h3>{snapshot.nextAppointment.service}</h3>
                  <p>
                    {[
                      snapshot.nextAppointment.address?.street,
                      snapshot.nextAppointment.address?.zone,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  <p>
                    {technicianDate(snapshot.nextAppointment.starts_at)} WAT
                  </p>
                  <span
                    className={styles.badge}
                    data-tone={technicianTone(snapshot.nextAppointment)}
                  >
                    {technicianStatus(snapshot.nextAppointment)}
                  </span>
                  <div className={styles.actions}>
                    <button
                      className="button"
                      onClick={() =>
                        navigate("jobs", snapshot.nextAppointment.id)
                      }
                    >
                      {technicianReviewLabel(snapshot.nextAppointment)}
                      <ChevronRight size={18} />
                    </button>
                    <Link href="/admin/services" className="button secondary">
                      Professional Services
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.emptyIcon}>
                    <CalendarDays size={30} />
                  </div>
                  <h3>No assigned appointments yet</h3>
                  <p>Your next assigned appointment will appear here.</p>
                  <button className="button secondary" onClick={refresh}>
                    Refresh assignments
                  </button>
                </>
              )}
            </section>
            <section className={styles.card}>
              <div className={styles.sectionTitle}>
                <h2>
                  <ClipboardList size={21} />
                  Today’s jobs
                </h2>
                <button
                  className={styles.textButton}
                  onClick={() => navigate("jobs")}
                >
                  View all jobs →
                </button>
              </div>
              {snapshot.today.rows.length ? (
                snapshot.today.rows.map(jobRow)
              ) : (
                <p className={styles.empty}>No appointments scheduled today.</p>
              )}
              {snapshot.today.total > 5 && (
                <p className={styles.caption}>
                  Showing5 of {snapshot.today.total} scheduled jobs.
                </p>
              )}
            </section>
          </div>
          <aside className={styles.rail}>
            <section className={styles.availability}>
              <div className={styles.sectionTitle}>
                <h2>
                  {p.technician_available
                    ? "Available for assignments"
                    : "Unavailable for assignments"}
                </h2>
                <button
                  role="switch"
                  aria-checked={!!p.technician_available}
                  aria-label="Available for service assignments"
                  className={styles.switch}
                  disabled={stale || busy}
                  onClick={availability}
                >
                  <span />
                </button>
              </div>
              <p>
                Assignment preference only. Qualifications, schedule and work
                approval still apply.
              </p>
              <Wrench
                className={styles.watermark}
                size={90}
                aria-hidden="true"
              />
            </section>
            <section className={styles.card}>
              <h2>
                <Wifi size={20} />
                Connection & eligibility
              </h2>
              <dl className={styles.facts}>
                <dt>Backend</dt>
                <dd>{stale ? "Unconfirmed" : "Connected"}</dd>
                <dt>Last confirmed</dt>
                <dd>{technicianDate(snapshot.generatedAt)} WAT</dd>
                <dt>Branch</dt>
                <dd>{p.branch_id}</dd>
              </dl>
              <p className={styles.caption}>
                Connection does not establish availability or permission to
                start work.
              </p>
            </section>
            <section className={styles.card}>
              <h2>Quick actions</h2>
              <div className={styles.quick}>
                <button onClick={() => navigate("jobs")}>
                  <CalendarDays />
                  View jobs
                </button>
                <Link href="/admin/services">
                  <Wrench />
                  Professional Services
                </Link>
                <Link href="/contact">
                  <Headphones />
                  Contact support
                </Link>
                <button onClick={() => navigate("profile")}>
                  <ShieldCheck />
                  Qualifications
                </button>
              </div>
              <p className={styles.caption}>
                Safety incidents and service reports stay inside the assigned
                job.
              </p>
            </section>
            {snapshot.today.total > 0 && (
              <section className={styles.card}>
                <h2>
                  <CircleCheck size={21} />
                  Today’s scheduled progress
                </h2>
                <strong>
                  {snapshot.today.completed} of {snapshot.today.total} completed
                </strong>
                <progress
                  max={snapshot.today.total}
                  value={snapshot.today.completed}
                  aria-label="Completed appointments scheduled today"
                />
                <p className={styles.caption}>{snapshot.today.basis}</p>
              </section>
            )}
          </aside>
        </div>
      ) : listView ? (
        <section className={styles.card}>
          <div className={styles.filters}>
            <label>
              Search jobs
              <input
                type="search"
                maxLength={100}
                placeholder="Reference, service or customer"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            {!history && (
              <label>
                Job status
                <select
                  value={filter}
                  onChange={(e) => {
                    setFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="active">All active jobs</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">
                    In progress / awaiting action
                  </option>
                  <option value="upcoming">Upcoming</option>
                </select>
              </label>
            )}
            {history && (
              <label>
                History period
                <select
                  value={period}
                  onChange={(e) => {
                    setPeriod(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="7">Last7 days</option>
                  <option value="30">Last30 days</option>
                  <option value="90">Last90 days</option>
                  <option value="month">This month</option>
                </select>
              </label>
            )}
          </div>
          {loading ? (
            <Loading />
          ) : list ? (
            <>
              <p className={styles.caption}>
                {list.total} matching {history ? "closed" : "assigned"} jobs.{" "}
                {list.periodBasis}
                {history ? ` · ${range.from} – ${range.to} (Lagos)` : ""}.
              </p>
              {list.rows.length ? (
                list.rows.map(jobRow)
              ) : (
                <div className={styles.empty}>
                  <Wrench size={28} />
                  <h2>
                    {history
                      ? "No closed jobs in this period"
                      : "No matching assigned jobs"}
                  </h2>
                  <p>
                    {q
                      ? "Try another search."
                      : "Your confirmed records will appear here."}
                  </p>
                </div>
              )}
              <div className={styles.pagination}>
                <button
                  className="button secondary"
                  disabled={page === 1}
                  onClick={() => setPage((n) => n - 1)}
                >
                  Previous
                </button>
                <span>Page {list.page}</span>
                <button
                  className="button secondary"
                  disabled={!list.hasMore}
                  onClick={() => setPage((n) => n + 1)}
                >
                  Next
                </button>
              </div>
            </>
          ) : (
            <p>Job records unavailable. Refresh to retry.</p>
          )}
        </section>
      ) : (
        <fieldset disabled={stale || loading} className={styles.profileGrid}>
          <section className={styles.card}>
            <div className={styles.identity}>
              <span>
                <UserRound size={30} />
              </span>
              <div>
                <h2>{p.name}</h2>
                <p>Technician · {p.branch_id}</p>
                <small>
                  {p.active ? "Active account" : "Inactive account"}
                </small>
              </div>
            </div>
            <p>{p.email}</p>
            <p className={styles.caption}>
              Role, branch and qualifications are managed by authorised
              operations.
            </p>
            <Link href="/account-settings" className="button secondary">
              Account & security
            </Link>
            <ActionForm
              action="account.update"
              title="Update your name"
              onDone={refresh}
              fields={[{ name: "name", label: "Your name", value: p.name }]}
            />
          </section>
          <section className={styles.card}>
            <h2>
              <ShieldCheck size={21} />
              Qualifications
            </h2>
            <p className={styles.caption}>
              Independently verified by operations. Expiry alone does not
              establish eligibility for a job.
            </p>
            {snapshot.qualifications.length ? (
              snapshot.qualifications.map((v: any) => (
                <div className={styles.qualification} key={v.code}>
                  <strong>{v.code.replaceAll("_", " ")}</strong>
                  <span className={styles.badge}>
                    {v.verified ? "Verified current" : "Not currently verified"}
                  </span>
                  <small>Expires {technicianDate(v.expires_at)} WAT</small>
                </div>
              ))
            ) : (
              <p>No qualification records available. Contact operations.</p>
            )}
          </section>
          <section className={styles.card}>
            <h2>Appearance & support</h2>
            <label>
              Appearance
              <select
                value={appearance.theme}
                onChange={(e) =>
                  appearance.setTheme(
                    e.target.value as "light" | "dark" | "system",
                  )
                }
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </label>
            <Link href="/support" className="button secondary">
              Help & support
            </Link>
            <p className={styles.caption}>
              Use the account menu to sign out. No vehicle, earnings or
              administrative controls.
            </p>
          </section>
          <section className={styles.card}>
            <h2>Notification preferences</h2>
            <p className={styles.caption}>
              Essential assignment/security alerts remain in your inbox.
              Optional reminders depend on configured providers.
            </p>
            <ActionForm
              key={user.id}
              action="preferences.save"
              title="Optional reminders"
              onDone={refresh}
              fields={[
                {
                  name: "marketing",
                  label: "Optional marketing",
                  type: "checkbox",
                  value: snapshot.preferences?.marketing ?? false,
                },
                {
                  name: "refillReminders",
                  label: "Refill reminders",
                  type: "checkbox",
                  value: snapshot.preferences?.refill_reminders ?? false,
                },
                {
                  name: "serviceReminders",
                  label: "Service reminders",
                  type: "checkbox",
                  value: snapshot.preferences?.service_reminders ?? false,
                },
                {
                  name: "quietStart",
                  label: "Quiet hours start (0–23)",
                  type: "number",
                  value: snapshot.preferences?.quiet_start ?? 21,
                },
                {
                  name: "quietEnd",
                  label: "Quiet hours end (0–23)",
                  type: "number",
                  value: snapshot.preferences?.quiet_end ?? 8,
                },
              ]}
            />
          </section>
        </fieldset>
      )}
    </section>
  );
}
