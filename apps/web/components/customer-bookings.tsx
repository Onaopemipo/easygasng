"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Clock,
  Headset,
  Lightbulb,
  MapPin,
  Plus,
  ShieldCheck,
  Wrench,
  Flame,
  ChevronRight,
} from "lucide-react";
import { api, Loading, Modal, Notice, money } from "./ui";
import { BookingCard } from "./professional-services";
import { ServiceFollowups } from "./service-followups";
import "./customer-bookings.css";
import { HostedPayment } from "./hosted-payment";
const tabs = ["Upcoming", "Awaiting Action", "Completed", "Cancelled"];
export default function CustomerBookings({ user }: { user: any }) {
  const [catalogue, setCatalogue] = useState<any[] | null>(null),
    [bookings, setBookings] = useState<any[] | null>(null),
    [errors, setErrors] = useState<Record<string, string>>({}),
    [version, setVersion] = useState(0),
    [view, setView] = useState("bookings"),
    [tab, setTab] = useState("Upcoming"),
    [selected, setSelected] = useState<string | null>(null),
    [coverage, setCoverage] = useState(false),
    [recovery, setRecovery] = useState("");
  const workspace = useRef<HTMLElement>(null),
    requestedSource = useRef("");
  useEffect(() => {
    if (!bookings) return;
    const source = new URLSearchParams(window.location.search).get("bookingId");
    if (!source) return;
    const key = user.id + ":" + source;
    if (requestedSource.current === key) return;
    requestedSource.current = key;
    if (bookings.some((b) => b.id === source)) setSelected(source);
    else
      setErrors((v) => ({
        ...v,
        source:
          "The requested booking is unavailable in your account. Contact support for an older service record.",
      }));
  }, [bookings, user.id]);
  useEffect(() => {
    const controller = new AbortController();
    setErrors({});
    setBookings(null);
    setCatalogue(null);
    for (const [name, action, setter] of [
      ["catalogue", "services.catalogue", setCatalogue],
      ["bookings", "bookings", setBookings],
    ] as const) {
      api(action, undefined, { signal: controller.signal })
        .then(setter)
        .catch((e) => {
          if (!controller.signal.aborted)
            setErrors((v) => ({ ...v, [name]: e.message }));
        });
    }
    return () => controller.abort();
  }, [user.id, version]);
  useEffect(() => {
    let live = true;
    try {
      const prefix = `easygas.booking.request.${user.id}.`;
      const keys = Object.keys(sessionStorage).filter((k) =>
        k.startsWith(prefix),
      );
      for (const k of keys) {
        const key = sessionStorage.getItem(k);
        if (key)
          api("booking.recover?key=" + encodeURIComponent(key))
            .then((r) => {
              if (live && r.status === "COMMITTED") {
                setRecovery(
                  "Your earlier appointment request was saved: " +
                    r.reference +
                    ". It is listed in My Bookings.",
                );
                sessionStorage.removeItem(k);
              }
            })
            .catch(() => {});
      }
    } catch {}
    return () => {
      live = false;
    };
  }, [user.id, version]);
  const reload = () => setVersion((v) => v + 1),
    detail = bookings?.find((b) => b.id === selected);
  function activate(next: string) {
    setView(next);
    workspace.current?.scrollIntoView({ behavior: "auto", block: "start" });
  }
  const rows = (bookings ?? []).filter((b) =>
    tab === "Completed"
      ? b.status === "completed"
      : tab === "Cancelled"
        ? ["cancelled", "failed"].includes(b.status)
        : tab === "Awaiting Action"
          ? b.status === "awaiting_acknowledgement" ||
            (b.status === "awaiting_customer_approval" &&
              b.quotes?.[0]?.approved == null)
          : !["completed", "cancelled", "failed"].includes(b.status),
  );
  const label = (status: string) =>
    status === "failed" ? "Unable to complete" : status.replaceAll("_", " ");
  const date = (value: string) =>
    new Date(value).toLocaleString("en-NG", {
      timeZone: "Africa/Lagos",
      dateStyle: "medium",
      timeStyle: "short",
    });
  return (
    <div className="customer-bookings">
      <section className="bk-hero">
        <div>
          <span className="eyebrow">PROFESSIONAL SERVICE FOR A SAFER HOME</span>
          <h1>Service bookings</h1>
          <p>
            From cooker servicing and installations to gas safety checks,
            EasyGas helps you keep your cooking equipment properly maintained.
          </p>
          <div className="bk-actions">
            <button className="button" onClick={() => activate("services")}>
              Book a Service
              <ArrowRight size={19} />
            </button>
            <button
              className="button secondary"
              onClick={() => activate("bookings")}
            >
              View My Bookings
            </button>
          </div>
        </div>
        <svg
          viewBox="0 0 300 220"
          className="bk-hero-art"
          role="img"
          aria-label="Cooking equipment care illustration"
        >
          <path d="M40 170h220v30H40z" fill="#b9e1c4" />
          <rect x="50" y="100" width="200" height="70" rx="14" fill="#f8fff8" />
          <ellipse cx="106" cy="130" rx="35" ry="18" fill="#133c30" />
          <ellipse cx="195" cy="130" rx="30" ry="17" fill="#133c30" />
          <path d="M87 72h42l-5 42H92z" fill="#e6bc73" />
          <path
            d="M82 72h52M94 63h28"
            stroke="#fff"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <path
            d="M186 59q-14 13 0 26M203 45q-14 16 0 33"
            stroke="#c3e9b6"
            strokeWidth="7"
            fill="none"
          />
          <circle cx="225" cy="155" r="5" fill="#ff951a" />
        </svg>
        <aside>
          <p>
            <ShieldCheck />
            Service eligibility checked
          </p>
          <p>
            <Wrench />
            Equipment care and assessment
          </p>
          <p>
            <Clock />
            Available appointment scheduling
          </p>
          <p>
            <Headset />
            Home services in configured areas
          </p>
        </aside>
      </section>
      {recovery && <Notice message={recovery} />}
      {errors.catalogue ? (
        <Notice type="error" message={errors.catalogue} />
      ) : catalogue === null ? (
        <Loading />
      ) : (
        <div className="bk-categories">
          {catalogue.map((s, i) => (
            <Link href={"/services/" + s.id} className="bk-category" key={s.id}>
              <div className={"bk-category-art art-" + i}>
                {s.image_id ? (
                  <img src={"/api/media/" + s.image_id} alt="" />
                ) : (
                  <Wrench size={38} />
                )}
              </div>
              <div>
                <h2>{s.name}</h2>
                <p>{s.config.description}</p>
                <span>
                  {s.config.priceKobo === null
                    ? "Quotation required"
                    : `${s.config.pricingModel === "starting" ? "From " : ""}${money(s.config.priceKobo)}`}{" "}
                  · {s.config.durationMinutes} min
                </span>
                <ArrowRight size={18} />
              </div>
            </Link>
          ))}
        </div>
      )}
      <section
        ref={workspace}
        id="my-bookings"
        className="bk-workspace"
        aria-label="Service booking workspace"
      >
        <div className="bk-workspace-heading">
          <div className="bk-switch">
            <button
              aria-pressed={view === "bookings"}
              onClick={() => setView("bookings")}
            >
              My bookings
            </button>
            <button
              aria-pressed={view === "services"}
              onClick={() => setView("services")}
            >
              Services
            </button>
          </div>
          <Link className="button" href="/services">
            <Plus size={18} />
            Book a New Service
          </Link>
        </div>
        {view === "services" ? (
          <div className="bk-services">
            <h2>Choose your service</h2>
            <p>
              Only active, business-approved services appear here. Review the
              service details, coverage, charges and cancellation terms before
              selecting a real appointment.
            </p>
            {catalogue?.length
              ? catalogue.map((s) => (
                  <Link
                    className="bk-service-row"
                    key={s.id}
                    href={"/services/" + s.id}
                  >
                    <Wrench />
                    <span>
                      <strong>{s.name}</strong>
                      <small>
                        {s.config.zones.join(", ")} · {s.config.durationMinutes}{" "}
                        minutes
                      </small>
                    </span>
                    <ChevronRight />
                  </Link>
                ))
              : catalogue && (
                  <Notice message="Service appointments are being prepared. EasyGas must approve availability, pricing and safety checklists before bookings open." />
                )}
          </div>
        ) : (
          <>
            <div role="tablist" aria-label="Booking status" className="bk-tabs">
              {tabs.map((t, i) => (
                <button
                  key={t}
                  role="tab"
                  id={"bk-tab-" + i}
                  aria-controls="bk-panel"
                  aria-selected={tab === t}
                  tabIndex={tab === t ? 0 : -1}
                  onClick={() => setTab(t)}
                  onKeyDown={(e) => {
                    const n =
                      e.key === "ArrowRight"
                        ? (i + 1) % 4
                        : e.key === "ArrowLeft"
                          ? (i + 3) % 4
                          : e.key === "Home"
                            ? 0
                            : e.key === "End"
                              ? 3
                              : null;
                    if (n !== null) {
                      e.preventDefault();
                      setTab(tabs[n]);
                      document.getElementById("bk-tab-" + n)?.focus();
                    }
                  }}
                >
                  {t}
                  {bookings && t === "Awaiting Action"
                    ? ` (${bookings.filter((b) => b.status === "awaiting_acknowledgement" || (b.status === "awaiting_customer_approval" && b.quotes?.[0]?.approved == null)).length})`
                    : ""}
                </button>
              ))}
            </div>
            <div
              role="tabpanel"
              id="bk-panel"
              aria-labelledby={"bk-tab-" + tabs.indexOf(tab)}
              tabIndex={0}
            >
              {errors.bookings ? (
                <Notice type="error" message={errors.bookings} />
              ) : bookings === null ? (
                <Loading />
              ) : rows.length ? (
                <div className="bk-appointments">
                  {rows.map((b) => (
                    <article className="bk-appointment" key={b.id}>
                      <div className="bk-card-top">
                        <span className="bk-icon">
                          <CalendarDays />
                        </span>
                        <span className={"bk-status state-" + b.status}>
                          {label(b.status)}
                        </span>
                      </div>
                      <h2>{b.snapshot.name}</h2>
                      <p className="bk-reference">{b.reference}</p>
                      <p>
                        <Clock size={17} />
                        {date(b.starts_at)} –{" "}
                        {new Date(b.ends_at).toLocaleTimeString("en-NG", {
                          timeZone: "Africa/Lagos",
                          timeStyle: "short",
                        })}{" "}
                        (Lagos)
                      </p>
                      <p>
                        <MapPin size={17} />
                        {b.address.street}, {b.address.zone}
                      </p>
                      {b.technician?.name && (
                        <p>Technician: {b.technician.name}</p>
                      )}
                      <p>
                        {b.billing.totalKobo === null
                          ? "Awaiting approved quotation"
                          : money(b.billing.totalKobo)}{" "}
                        · Verified paid {money(b.billing.paidKobo)}
                      </p>
                      {b.report && (
                        <p>
                          Recorded outcome:{" "}
                          {b.report.body.outcome ??
                            b.report.outcome ??
                            "View report"}
                        </p>
                      )}
                      <div className="bk-actions">
                        {b.status === "completed" && (
                          <Link
                            className="text-link"
                            href={`/account-settings?testimonialBooking=${encodeURIComponent(b.id)}#testimonials`}
                          >
                            Share your experience
                          </Link>
                        )}
                        <button
                          className="button secondary"
                          onClick={() => setSelected(b.id)}
                        >
                          View Details
                          <ArrowRight size={17} />
                        </button>
                        {["completed", "cancelled", "failed"].includes(
                          b.status,
                        ) && (
                          <Link
                            className="text-link"
                            href={"/services/" + b.service_id}
                          >
                            Book Again
                          </Link>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="bk-empty-grid">
                  <article>
                    <CalendarDays className="bk-icon" />
                    <div>
                      <h2>
                        {tab === "Upcoming"
                          ? "No upcoming appointments"
                          : tab === "Awaiting Action"
                            ? "No bookings awaiting action"
                            : tab === "Completed"
                              ? "Your service history starts here"
                              : "No cancelled appointments"}
                      </h2>
                      <p>
                        {tab === "Upcoming"
                          ? "Your scheduled EasyGas services will appear here. Need help with your cooker or cylinder?"
                          : tab === "Completed"
                            ? "Once a service is completed, you’ll find your reports and previous appointments here."
                            : "Recorded appointments in this category will appear here."}
                      </p>
                      <Link className="button secondary" href="/services">
                        Book a Service
                        <ArrowRight size={18} />
                      </Link>
                    </div>
                  </article>
                  {tab === "Upcoming" && (
                    <article>
                      <ClipboardList className="bk-icon" />
                      <div>
                        <h2>Service history</h2>
                        <p>
                          Review completed and cancelled appointments, reports
                          and previous service outcomes.
                        </p>
                        <button
                          className="button secondary"
                          onClick={() => setTab("Completed")}
                        >
                          Explore history
                          <ArrowRight size={18} />
                        </button>
                      </div>
                    </article>
                  )}
                </div>
              )}
            </div>
          </>
        )}
        {(errors.bookings || errors.catalogue) && (
          <button className="button secondary" onClick={reload}>
            Retry loading services and bookings
          </button>
        )}
      </section>
      <ServiceFollowups />
      <div className="bk-help">
        {[
          [
            Headset,
            "Need help?",
            "Need assistance with a booking, appointment change, or service question?",
            "Contact Support",
            "/support",
          ],
          [
            Lightbulb,
            "Tips for a safer kitchen",
            "Find EasyGas help on cooking equipment care and approved safety guidance.",
            "View Safety Tips",
            "/help",
          ],
          [
            MapPin,
            "Service coverage",
            "Home services are available only in locations configured for each active service.",
            "Check Coverage",
            null,
          ],
        ].map(([Icon, title, text, cta, href]: any) => (
          <article key={title}>
            <Icon className="bk-icon" />
            <div>
              <h2>{title}</h2>
              <p>{text}</p>
              {href ? (
                <Link className="button secondary" href={href}>
                  {cta}
                  <ArrowRight size={18} />
                </Link>
              ) : (
                <button
                  className="button secondary"
                  onClick={() => setCoverage(true)}
                >
                  {cta}
                  <ArrowRight size={18} />
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      {detail && (
        <Modal
          title={detail.reference + " · " + detail.snapshot.name}
          onClose={() => setSelected(null)}
        >
          {detail.billing?.dueKobo > 0 && (
            <HostedPayment purpose="service" bookingId={detail.id} />
          )}
          <BookingCard
            key={detail.id + ":" + detail.version}
            booking={detail}
            user={user}
            done={reload}
          />
        </Modal>
      )}
      {coverage && (
        <Modal
          title="Active service coverage"
          onClose={() => setCoverage(false)}
        >
          {catalogue?.length ? (
            catalogue.map((s) => (
              <section key={s.id}>
                <h3>{s.name}</h3>
                <p>{s.config.zones.join(", ") || "No locations configured"}</p>
                <Link href={"/services/" + s.id}>Review availability</Link>
              </section>
            ))
          ) : (
            <p>
              No active service coverage is currently configured. Contact
              EasyGas for assistance.
            </p>
          )}
        </Modal>
      )}
    </div>
  );
}
