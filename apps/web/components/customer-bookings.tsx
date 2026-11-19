"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "./workspace-link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  Search,
  Plus,
  Wrench,
  ChevronRight,
  CheckCircle2,
  Inbox,
  MapPin,
} from "lucide-react";
import { api, Loading, Modal, Notice, money } from "./ui";
import { BookingCard } from "./professional-services";
import { ServiceFollowups } from "./service-followups";
import { HostedPayment } from "./hosted-payment";
import { useCustomerResource } from "./customer-data";
import { ServiceRequestDialog } from "./service-request";
import { servicePrice } from "../../../packages/business-rules/src/service-detail";
import "./customer-bookings.css";
const filters = [
  "Upcoming",
  "Awaiting action",
  "Completed",
  "Cancelled",
  "All",
] as const;
export function bookingMatches(b: any, filter: string, query: string) {
  const status =
    filter === "Completed"
      ? b.status === "completed"
      : filter === "Cancelled"
        ? ["cancelled", "failed"].includes(b.status)
        : filter === "Awaiting action"
          ? b.status === "awaiting_acknowledgement" ||
            (b.status === "awaiting_customer_approval" &&
              b.quotes?.[0]?.approved == null)
          : filter === "Upcoming"
            ? !["completed", "cancelled", "failed"].includes(b.status)
            : true;
  return (
    status &&
    [
      b.reference,
      b.snapshot.name,
      b.address.zone,
      b.status.replaceAll("_", " "),
    ].some((x) =>
      String(x ?? "")
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
    )
  );
}
function statusLabel(b: any) {
  return b.schedule_pending && b.status === "pending_confirmation"
    ? "Awaiting confirmation"
    : b.status === "failed"
      ? "Unable to complete"
      : b.status.replaceAll("_", " ");
}
const date = (v: string) =>
  new Date(v).toLocaleString("en-NG", {
    timeZone: "Africa/Lagos",
    dateStyle: "medium",
    timeStyle: "short",
  });
export function BookingSummaries({
  rows,
  open,
}: {
  rows: any[];
  open: (id: string) => void;
}) {
  return (
    <div className="bk-list">
      {rows.map((b) => (
        <button
          key={b.id}
          onClick={() => open(b.id)}
          aria-label={`View ${b.snapshot.name}, ${b.reference}`}
        >
          <span className="bk-icon-mini">
            <CalendarDays size={18} />
          </span>
          <span>
            <strong>{b.snapshot.name}</strong>
            <small>{b.reference}</small>
          </span>
          <span className="bk-time">
            <small>
              {b.schedule_pending ? "Preferred visit" : "Appointment"}
            </small>
            <strong>{date(b.starts_at)}</strong>
          </span>
          <span className={"bk-badge state-" + b.status}>{statusLabel(b)}</span>
          <ChevronRight size={17} />
        </button>
      ))}
    </div>
  );
}
export default function CustomerBookings({ user }: { user: any }) {
  const identity = [user.id, user.role, user.branchId].join(":");
  const source = useSearchParams().get("bookingId");
  const bookingsRead = useCustomerResource("bookings", identity),
    catalogueRead = useCustomerResource("services.catalogue", identity);
  const bookings: any[] = bookingsRead.data ?? [],
    catalogue: any[] = catalogueRead.data ?? [];
  const [view, setView] = useState("bookings"),
    [filter, setFilter] = useState("Upcoming"),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState<string | null>(null),
    [choose, setChoose] = useState(false),
    [service, setService] = useState<any>(null),
    [recovery, setRecovery] = useState(""),
    [older, setOlder] = useState<any>(null),
    [sourceError, setSourceError] = useState("");
  const sourceRead = useRef("");
  const detail =
    bookings.find((b) => b.id === selected) ??
    (older?.id === selected ? older : null);
  const rows = bookings.filter((b) => bookingMatches(b, filter, query)),
    pages = Math.max(1, Math.ceil(rows.length / 6)),
    activePage = Math.min(page, pages);
  useEffect(() => {
    setPage(1);
  }, [filter, query]);
  useEffect(() => {
    if (!bookingsRead.data) return;
    const id = source;
    if (!id || sourceRead.current === identity + id) return;
    sourceRead.current = identity + id;
    if (bookings.some((b) => b.id === id)) {
      setSelected(id);
      return;
    }
    let live = true,
      finished = false;
    const controller = new AbortController();
    api("bookings?id=" + encodeURIComponent(id), undefined, {
      signal: controller.signal,
    })
      .then((r) => {
        if (!live) return;
        finished = true;
        if (r[0]) {
          setOlder(r[0]);
          setSelected(r[0].id);
        } else
          setSourceError("This booking could not be found in your account.");
      })
      .catch((e) => {
        if (live && !controller.signal.aborted) {
          finished = true;
          setSourceError(e.message);
        }
      });
    return () => {
      live = false;
      controller.abort();
      if (!finished) sourceRead.current = "";
    };
  }, [bookingsRead.data, identity, source]);
  useEffect(() => {
    let live = true;
    try {
      const prefix = `easygas.booking.request.${user.id}.`;
      for (const k of Object.keys(sessionStorage).filter((k) =>
        k.startsWith(prefix),
      )) {
        const key = sessionStorage.getItem(k);
        if (key)
          api("booking.recover?key=" + encodeURIComponent(key))
            .then((r) => {
              if (live && r.status === "COMMITTED") {
                setRecovery(
                  `Your earlier request ${r.reference} was saved. It appears in your bookings.`,
                );
                sessionStorage.removeItem(k);
                bookingsRead.retry();
              }
            })
            .catch(() => {});
      }
    } catch {}
    return () => {
      live = false;
    };
  }, [identity]);
  useEffect(() => {
    if (!detail && !choose && !service) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [Boolean(detail), choose, Boolean(service)]);
  const reload = () => {
    bookingsRead.retry();
    if (older)
      api("bookings?id=" + encodeURIComponent(older.id))
        .then((r) => setOlder(r[0] ?? null))
        .catch((e) => setSourceError(e.message));
  };
  return (
    <div className="customer-bookings bk-clean">
      <header className="bk-heading">
        <div>
          <span className="eyebrow">SERVICE APPOINTMENTS</span>
          <h1>Service bookings</h1>
          <p>Book a visit and keep track of your equipment care.</p>
        </div>
        <button className="button" onClick={() => setChoose(true)}>
          <Plus size={17} />
          Book a service
        </button>
      </header>
      {recovery && <Notice type="success" message={recovery} />}{" "}
      {sourceError && <Notice type="error" message={sourceError} />}
      <div className="bk-view-nav" aria-label="Service workspace">
        <button
          aria-pressed={view === "bookings"}
          onClick={() => setView("bookings")}
        >
          <CalendarDays size={16} />
          My bookings<span>{bookingsRead.data ? bookings.length : "—"}</span>
        </button>
        <button
          aria-pressed={view === "services"}
          onClick={() => setView("services")}
        >
          <Wrench size={16} />
          Explore services
        </button>
        <Link href="/support">
          Need help?
          <ArrowRight size={14} />
        </Link>
      </div>
      {view === "bookings" ? (
        <section className="bk-inbox" aria-label="My service bookings">
          <div className="bk-toolbar">
            <div className="bk-filters" aria-label="Booking status">
              {filters.map((f) => (
                <button
                  key={f}
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}
                >
                  {f}
                  <span>
                    {bookingsRead.data
                      ? bookings.filter((b) => bookingMatches(b, f, "")).length
                      : "—"}
                  </span>
                </button>
              ))}
            </div>
            <label className="bk-search">
              <Search size={16} />
              <input
                aria-label="Search bookings"
                placeholder="Search bookings…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                type="search"
                maxLength={100}
              />
            </label>
          </div>
          {bookingsRead.error ? (
            <div className="bk-empty">
              <Notice type="error" message={bookingsRead.error} />
              <button className="button secondary" onClick={bookingsRead.retry}>
                Retry bookings
              </button>
            </div>
          ) : bookingsRead.loading ? (
            <Loading label="Loading your bookings" />
          ) : rows.length ? (
            <>
              <BookingSummaries
                rows={rows.slice((activePage - 1) * 6, activePage * 6)}
                open={setSelected}
              />
              <footer className="bk-pagination">
                <span>
                  {(activePage - 1) * 6 + 1}–
                  {Math.min(activePage * 6, rows.length)} of {rows.length}{" "}
                  bookings
                  {bookings.length >= 100 ? " · Latest 100 records" : ""}
                </span>
                <div>
                  <button
                    disabled={activePage === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Previous
                  </button>
                  <span>
                    {activePage} / {pages}
                  </span>
                  <button
                    disabled={activePage === pages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </footer>
            </>
          ) : (
            <div className="bk-empty">
              <span>
                <Inbox size={28} />
              </span>
              <h2>
                {query
                  ? "No matching bookings"
                  : filter === "Upcoming"
                    ? "No upcoming bookings"
                    : filter === "Awaiting action"
                      ? "You’re all caught up"
                      : `No ${filter.toLowerCase()} bookings`}
              </h2>
              <p>
                {query
                  ? "Try a service name, reference or area."
                  : filter === "Awaiting action"
                    ? "Nothing needs your attention right now."
                    : "Choose a service and send us your preferred visit time. We’ll arrange the rest."}
              </p>
              {query ? (
                <button
                  className="button secondary"
                  onClick={() => setQuery("")}
                >
                  Clear search
                </button>
              ) : (
                <button className="button" onClick={() => setChoose(true)}>
                  Book a service
                  <ArrowRight size={16} />
                </button>
              )}
            </div>
          )}
        </section>
      ) : (
        <ServiceChoices
          catalogue={catalogue}
          loading={catalogueRead.loading}
          error={catalogueRead.error}
          retry={catalogueRead.retry}
          choose={setService}
        />
      )}
      <details className="bk-reminders">
        <summary>
          <Clock3 size={16} />
          Service reminders
        </summary>
        <ServiceFollowups />
      </details>
      <p className="bk-footer-note">
        <CheckCircle2 size={15} />
        Have a preferred date? Request a visit — EasyGas will confirm the time
        and provider.
      </p>
      {choose && (
        <Modal
          title="Choose a service"
          className="bk-detail-overlay"
          onClose={() => setChoose(false)}
        >
          <ServiceChoices
            catalogue={catalogue}
            loading={catalogueRead.loading}
            error={catalogueRead.error}
            retry={catalogueRead.retry}
            choose={(s) => {
              setChoose(false);
              setService(s);
            }}
          />
        </Modal>
      )}
      {service && (
        <ServiceRequestDialog
          key={identity + service.id}
          service={service}
          customerId={user.id}
          onClose={() => setService(null)}
          onCreated={reload}
          onView={(r) => {
            setService(null);
            setSelected(r.id);
            setView("bookings");
            setFilter("Upcoming");
            reload();
          }}
        />
      )}
      {detail && (
        <Modal
          title="Booking details"
          className="bk-detail-overlay"
          onClose={() => setSelected(null)}
        >
          {!detail.schedule_pending && detail.billing?.dueKobo > 0 && (
            <HostedPayment purpose="service" bookingId={detail.id} />
          )}
          <BookingCard
            key={detail.id + ":" + detail.version}
            compact
            booking={detail}
            user={user}
            done={reload}
          />
        </Modal>
      )}
    </div>
  );
}
function ServiceChoices({
  catalogue,
  loading,
  error,
  retry,
  choose,
}: {
  catalogue: any[];
  loading: boolean;
  error: string;
  retry: () => void;
  choose: (s: any) => void;
}) {
  if (error)
    return (
      <>
        <Notice type="error" message={error} />
        <button className="button secondary" onClick={retry}>
          Retry services
        </button>
      </>
    );
  if (loading) return <Loading label="Loading services" />;
  if (!catalogue.length)
    return (
      <div className="bk-empty">
        <Wrench size={28} />
        <h2>Services are being prepared</h2>
        <p>Contact EasyGas for help with a service request.</p>
        <Link className="button secondary" href="/support">
          Contact support
        </Link>
      </div>
    );
  return (
    <div className="bk-service-choices">
      {catalogue.map((s) => (
        <article key={s.branch_id + ":" + s.id}>
          <span className="bk-service-icon">
            <Wrench size={21} />
          </span>
          <div>
            <h2>{s.name}</h2>
            <p>{s.config.description}</p>
            <small>
              <MapPin size={13} />
              {s.config.zones.join(", ")}
            </small>
            <div className="bk-choice-footer">
              <strong>{servicePrice(s.config)}</strong>
              <span>{s.config.durationMinutes} min</span>
              <Link className="bk-service-details" href={"/services/" + s.id}>
                View details
              </Link>
              <button className="button secondary" onClick={() => choose(s)}>
                Book service
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
