"use client";
import { FieldCaption } from "./field-caption";
import { EasyGasLoader } from "./easygas-loader";
import { ArrowLeft, ArrowRight, CalendarDays, ChevronDown, ClipboardList, Clock3, Info, ListChecks, MapPin, ShieldCheck, Wrench, CircleMinus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import {
  activeServiceSlots, assertServiceSelection, serviceAvailabilityMessage, serviceDetailText, serviceMoney, servicePrice, serviceSlotDay, serviceSlotTime, serviceSlotsQuery, type ServiceAvailability,
} from "../../../packages/business-rules/src/service-detail";
import TechniciansAvailability from "./technicians-availability";
import { lagosAppointment } from "../../../packages/business-rules/src/technicians-availability";
import { bookingPhone, bookingPhoneMessage } from "../../../packages/business-rules/src/booking-contact";
import { FormInput } from "./password-input";
import OrderInvoice from "./order-invoice";
import { AddressAreaFields } from "./address-area-fields";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "./workspace-link";
import { serviceReportHtml } from "../../../packages/business-rules/src/service-report";
import { BundleOffers } from "./bundles";
import { ServiceFollowups } from "./service-followups";
import { ImageUpload } from "./image-upload";
import { serviceMutation } from "./service-mutation";
import { api, Notice, Loading, money } from "./ui";
type Field = {
  name: string;
  label: string;
  type?: string;
  value?: any;
  options?: { value: string; label: string }[];
  required?: boolean;
  needsConsent?: boolean;
};
export function ServiceForm({
  title,
  fields,
  send,
  done,
  submit = "Save",
  review,
  prepareReview,
  bookingSelection,
  disabled = false,
  reviewKey,
  bookingAreas,
}: {
  title: string;
  fields: Field[];
  send: (v: any) => Promise<any>;
  done?: () => void;
  submit?: string;
  review?: (values: Record<string, any>) => ReactNode;
  prepareReview?: (values: Record<string, any>) => Promise<void>;
  bookingSelection?: { slotId: string; zone: string };
  disabled?: boolean;
  reviewKey?: string;
  bookingAreas?: { values: string[]; onRecognized: (area: string) => void };
}) {
  const [reviewValues, setReviewValues] = useState<Record<string, any> | null>(
    null,
  );
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const submitting = useRef(false);
  const currentReviewKey = useRef(reviewKey);
  currentReviewKey.current = reviewKey;
  useEffect(() => {
    setReviewValues(null);
  }, [reviewKey]);
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting.current || disabled) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    const form = e.currentTarget,
      fd = new FormData(form),
      v: Record<string, any> = {};
    try {
      for (const f of fields) {
        const raw = String(fd.get(f.name) ?? "");
        v[f.name] =
          f.type === "checkbox"
            ? fd.has(f.name)
            : f.type === "number"
              ? Number(raw)
              : f.type === "datetime-lagos"
                ? raw
                  ? lagosAppointment(raw)
                  : undefined
                : f.type === "datetime-local"
                  ? raw
                    ? new Date(raw).toISOString()
                    : undefined
                  : raw;
      }
      Object.assign(v, bookingSelection);
      if (review && !reviewValues) {
        await prepareReview?.(v);
        if (currentReviewKey.current === reviewKey) setReviewValues(v);
        return;
      }
      const r = await send(reviewValues ?? v);
      setMessage(r.message ?? (r.id ? "Saved. Reference: " + r.id : "Saved successfully."));
      setDirty(false);
      done?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <form
      className="surface workflow-form service-form product-form"
      data-unsaved={dirty ? "true" : undefined}
      onChange={() => setDirty(true)}
      onSubmit={save}
    >
      <h3>{title}</h3>
      <fieldset
        hidden={!!reviewValues}
        style={{
          border: 0,
          padding: 0,
          margin: 0,
          minWidth: 0,
          display: reviewValues ? "none" : "grid",
          gap: 16,
        }}
      >
        {fields.map((f) =>
          f.name === "street" && bookingAreas ? (
            <AddressAreaFields
              key={f.name}
              street={f.value ?? ""}
              areaLabel="Service area"
              areas={bookingAreas.values.map((value) => ({
                id: value,
                name: value,
              }))}
              onRecognizedArea={bookingAreas.onRecognized}
            />
          ) : fields.some((x) => x.name === "street") &&
            f.name === "zone" &&
            f.options ? null : f.name === "street" &&
            fields.some((x) => x.name === "zone" && x.options) ? (
            <AddressAreaFields
              key={`${f.value ?? ""}:${fields.find((x) => x.name === "zone")?.value ?? ""}`}
              street={f.value ?? ""}
              area={fields.find((x) => x.name === "zone")?.value ?? ""}
              areaLabel="Service area"
              areas={(fields.find((x) => x.name === "zone")?.options ?? []).map(
                (o) => ({ id: o.value, name: o.label }),
              )}
            />
          ) : (
            <label key={f.name} data-field-type={f.type ?? "text"}>
              {f.type !== "hidden" && <FieldCaption required={f.type === "checkbox" ? f.needsConsent === true : f.required !== false}>{f.label}</FieldCaption>}
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
                    f.type === "datetime-lagos"
                      ? "datetime-local"
                      : (f.type ?? "text")
                  }
                  defaultValue={
                    f.type === "checkbox" ? undefined : (f.value ?? "")
                  }
                  defaultChecked={
                    f.type === "checkbox" ? Boolean(f.value) : undefined
                  }
                  required={f.type !== "checkbox" && f.required !== false}
                  min={f.type === "number" ? 0 : undefined}
                  maxLength={2000}
                />
              )}
            </label>
          ),
        )}
      </fieldset>
      {reviewValues && review && (
        <section aria-label="Review booking">
          {review(reviewValues)}
          <button
            className="button secondary"
            type="button"
            onClick={() => setReviewValues(null)}
          >
            Back to details
          </button>
        </section>
      )}
      {error && <Notice type="error" message={error} />}{" "}
      {message && <Notice type="success" message={message} />}
      <button className="button" disabled={busy || disabled}>
        {busy ? "Saving…" : review && !reviewValues ? "Review booking" : submit}
      </button>
    </form>
  );
}
export default function ProfessionalServices({
  user,
  mode = "catalogue",
  publicPage = false,
  serviceId,
  onBundle,
}: {
  user: any;
  mode?: string;
  serviceId?: string;
  onBundle?: (b: any) => void;
  publicPage?: boolean;
}) {
  const search = useSearchParams();
  const staff = Boolean(
      !publicPage &&
        user &&
        ["owner", "manager", "technician", "finance"].includes(user.role),
    ),
    manager = staff && ["owner", "manager"].includes(user?.role);
  const canBook =
    user && (!publicPage || ["customer", "commercial"].includes(user.role));
  const loadBookings =
    Boolean(user) &&
    mode !== "incidents" &&
    !(publicPage && mode === "catalogue");
  const redesigned =
    mode === "technicians" &&
    process.env.NEXT_PUBLIC_EASYGAS_TECHNICIANS_UI !== "legacy" &&
    ["owner", "manager", "finance"].includes(user?.role);
  const [catalogue, setCatalogue] = useState<any[]>([]),
    [bookings, setBookings] = useState<any[]>([]),
    [workspace, setWorkspace] = useState<any>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [version, setVersion] = useState(0);
  const reload = () => setVersion((n) => n + 1);
  useEffect(() => {
    if (redesigned) return;
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([
      api("services.catalogue"),
      loadBookings ? api("bookings") : Promise.resolve([]),
      staff && mode !== "incidents"
        ? api("services.manage")
        : Promise.resolve(null),
    ])
      .then(([c, b, w]) => {
        if (active) {
          setCatalogue(c);
          setBookings(b);
          setWorkspace(w);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user?.id, version, staff, mode, redesigned, loadBookings]);
  if (redesigned) return <TechniciansAvailability user={user} />;
  const currentDetail =
    publicPage &&
    mode === "catalogue" &&
    catalogue.some((item) => item.id === serviceId);
  if (loading && !currentDetail) return <Loading page />;
  if (error)
    return (
      <>
        <Notice type="error" message={error} />
        <button className="button secondary" onClick={reload}>
          Try again
        </button>
      </>
    );
  const service = catalogue.find((s) => s.id === serviceId);
  if (publicPage && mode === "catalogue" && serviceId) {
    if (!service)
      return (
        <div className="service-details-v2">
          <Link className="text-link" href="/services">
            ← All services
          </Link>
          <h1>Service unavailable</h1>
          <p>This service is not currently listed.</p>
        </div>
      );
    const returnPath =
      "/services/" + serviceId + (search?.size ? "?" + search.toString() : "");
    return (
      <ServiceDetail
        service={service}
        booking={
          canBook ? (
            <BookingForm
              key={canBook.id + ":" + service.id}
              service={service}
              done={reload}
              customerId={canBook.id}
            />
          ) : user ? (
            <p>Sign in with a customer account to book an appointment.</p>
          ) : (
            <Link
              className="button"
              href={"/login?returnTo=" + encodeURIComponent(returnPath)}
            >
              Sign in to check appointments
            </Link>
          )
        }
      />
    );
  }
  return (
    <div className="service-workspace product-workspace">
      <div className="page-heading">
        <span className="eyebrow">
          {staff ? "DELIVERY & SERVICES" : "CARE FOR YOUR KITCHEN"}
        </span>
        <h1>
          {mode === "catalogue"
            ? staff
              ? "Manage services"
              : "Professional services"
            : mode === "quotations"
              ? "Service quotations"
              : mode === "technicians"
                ? "Technicians & availability"
                : mode === "incidents"
                  ? "Operational incidents"
                  : "Service bookings"}
        </h1>
        <p>
          {staff
            ? mode === "incidents"
              ? "Review incidents, follow up on evidence and manage authorised responses."
              : mode === "quotations"
                ? "Review service quotations and their approval and payment status."
                : "Manage service bookings, catalogue and assigned work using authorised business records."
            : "Book installation, maintenance and safety services for your kitchen."}
        </p>
      </div>
      {mode === "catalogue" && !serviceId && (
        <div className="button-row" aria-label="Service booking actions">
          <Link className="button" href="#available-services">
            Browse services &amp; book
          </Link>
          <Link
            className="button secondary"
            href={staff ? "/admin/bookings" : "/bookings"}
          >
            View my bookings
          </Link>
        </div>
      )}
      <nav className="service-tabs" aria-label="Professional services">
        <Link href="/services">Services</Link>
        <Link href={staff ? "/admin/bookings" : "/bookings"}>My bookings</Link>
        {staff && (
          <>
            <Link href="/admin/services">Manage services</Link>
            <Link href="/admin/technicians">Technicians</Link>
            <Link href="/admin/quotations">Quotations</Link>
            <Link href="/admin/incidents">Incidents</Link>
          </>
        )}
      </nav>
      {["customer", "commercial"].includes(user?.role) &&
        mode !== "catalogue" && <ServiceFollowups />}
      {mode === "incidents" ? (
        <Incidents />
      ) : mode === "technicians" &&
        ["owner", "manager"].includes(user?.role) &&
        workspace ? (
        <Technicians data={workspace} reload={reload} user={user} />
      ) : mode === "catalogue" ? (
        <>
          {!service && onBundle && <BundleOffers select={onBundle} />}
          {service ? (
            <>
              <ServiceDetail
                service={service}
                booking={
                  canBook ? (
                    <BookingForm
                      service={service}
                      done={reload}
                      customerId={canBook.id}
                    />
                  ) : (
                    <Link href="/login">Sign in to check appointments</Link>
                  )
                }
              />
            </>
          ) : (
            <div className="service-grid" id="available-services" tabIndex={-1}>
              {catalogue.map((s) => (
                <article className="surface service-card" key={s.id}>
                  <>
                    {s.image_id ? (
                      <img
                        className="catalogue-photo"
                        src={"/api/media/" + s.image_id}
                        alt={s.name}
                      />
                    ) : (
                      <div className="service-symbol" aria-hidden="true">
                        ✦
                      </div>
                    )}
                  </>
                  <h2>{s.name}</h2>
                  <p>{s.config.description}</p>
                  <p>
                    {s.config.priceKobo === null
                      ? "Assessment and quotation required"
                      : money(s.config.priceKobo)}
                  </p>
                  <Link className="button" href={"/services/" + s.id}>
                    View service & book →
                  </Link>
                </article>
              ))}
              {!catalogue.length && (
                <div className="surface">
                  <h2>Service appointments are being prepared</h2>
                  <p>
                    EasyGas must confirm service areas, pricing, qualified
                    personnel and approved checklists before appointments open.
                  </p>
                  <Link className="button secondary" href="/contact">
                    Contact EasyGas
                  </Link>
                </div>
              )}
            </div>
          )}
          {manager && workspace && (
            <>
              <h2>Business-managed service catalogue</h2>
              <Notice message="Draft services are not bookable. Configuration requires independent owner approval; safety checklists require an owner and a currently qualified safety reviewer." />
              {workspace.services.map((s: any) => (
                <ServiceEditor
                  key={s.id + ":" + version}
                  service={s}
                  done={reload}
                />
              ))}
            </>
          )}
        </>
      ) : (
        <>
          {!user ? (
            <Link
              className="button"
              href={
                "/login?returnTo=" +
                encodeURIComponent(
                  serviceId ? "/services/" + serviceId : "/bookings",
                )
              }
            >
              Sign in to view bookings
            </Link>
          ) : !bookings.length ? (
            <div className="surface">
              <h2>No appointments yet</h2>
              <p>Your confirmed records will appear here.</p>
              <Link href="/services" className="button secondary">
                Explore services
              </Link>
            </div>
          ) : (
            bookings
              .filter(
                (b) =>
                  mode !== "quotations" ||
                  b.status === "awaiting_customer_approval",
              )
              .map((b) => (
                <BookingCard
                  key={b.id + ":" + b.version}
                  booking={b}
                  user={user}
                  done={reload}
                />
              ))
          )}
        </>
      )}
    </div>
  );
}
function ServiceDetail({
  service,
  booking,
}: {
  service: any;
  booking: ReactNode;
}) {
  const config = service.config;
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [service.image_id]);
  const inclusions = serviceDetailText(config.inclusions);
  const coverage = Array.isArray(config.zones) ? config.zones.join(", ") : "";
  const notes = [
    Number.isInteger(config.cancellationHours)
      ? `Self-service changes close ${config.cancellationHours} hours before arrival.`
      : "",
    serviceDetailText(config.warranty) || "Warranty terms are not configured.",
  ].filter(Boolean);
  const sections = [
    { title: "What’s included", icon: ListChecks, content: inclusions },
    {
      title: "Exclusions",
      icon: CircleMinus,
      content: serviceDetailText(config.exclusions),
    },
    {
      title: "Prepare for your appointment",
      icon: ClipboardList,
      content: serviceDetailText(config.preparation),
    },
    { title: "Service coverage", icon: MapPin, content: coverage },
  ];
  return (
    <div className="service-details-v2">
      <Link className="service-detail-back text-link" href="/services">
        <ArrowLeft size={18} /> All services
      </Link>
      <section
        className="service-detail-hero"
        aria-labelledby="service-detail-title"
      >
        <div>
          <div className="service-detail-identity">
            <span className="service-detail-icon">
              <CalendarDays aria-hidden="true" />
            </span>
            <div>
              <h1 id="service-detail-title">{service.name}</h1>
              {config.description && <p>{config.description}</p>}
            </div>
          </div>
          <div className="service-detail-meta">
            <strong>{servicePrice(config)}</strong>
            <span>
              Call-out {serviceMoney(config.calloutKobo) ?? "unavailable"}
            </span>
            <span>
              <Clock3 size={17} aria-hidden="true" />
              {Number.isInteger(config.durationMinutes) &&
              config.durationMinutes > 0
                ? `${config.durationMinutes} minutes`
                : "Duration unavailable"}
            </span>
          </div>
        </div>
        {service.image_id && !imageFailed ? (
          <img
            className="service-detail-image"
            src={"/api/media/" + service.image_id}
            alt={service.name}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div
            className="service-detail-image service-detail-placeholder"
            aria-hidden="true"
          >
            <Wrench size={56} strokeWidth={1.3} />
          </div>
        )}
      </section>
      <div className="service-detail-columns">
        <div className="service-detail-information">
          {serviceDetailText(config.safety) && (
            <p className="surface service-detail-note">
              <ShieldCheck size={20} aria-hidden="true" />
              {config.safety}
            </p>
          )}
          {sections.map(({ title, icon: Icon, content }, index) => (
            <details
              className="surface service-detail-accordion"
              key={title}
              open={index === 0 && Boolean(content)}
            >
              <summary>
                <Icon size={20} aria-hidden="true" />
                <span>{title}</span>
                <ChevronDown size={17} aria-hidden="true" />
              </summary>
              <p>{content || "Details not configured."}</p>
            </details>
          ))}
        </div>
        <aside
          className="surface service-detail-booking"
          aria-labelledby="service-booking-title"
        >
          <h2 id="service-booking-title">
            <CalendarDays size={22} aria-hidden="true" /> Book this service
          </h2>
          {booking}
        </aside>
      </div>
      <p className="service-detail-note service-detail-policy">
        <Info size={18} aria-hidden="true" />
        {notes.join(" ")}
      </p>
    </div>
  );
}

function BookingForm({
  service,
  done,
  customerId,
}: {
  service: any;
  done: () => void;
  customerId: string;
}) {
  const [error, setError] = useState(""),
    [key, setKey] = useState(() => crypto.randomUUID()),
    [addresses, setAddresses] = useState<any[]>([]),
    [address, setAddress] = useState<any>(null),
    [availability, setAvailability] = useState<{
      zone: string;
      value: ServiceAvailability;
    } | null>(null),
    [zone, setZone] = useState(""),
    [day, setDay] = useState(""),
    [slotId, setSlotId] = useState(""),
    [details, setDetails] = useState(false),
    [retry, setRetry] = useState(0);
  const requestStorage = `easygas.booking.request.${customerId}.${service.id}`;
  useEffect(() => {
    try {
      const old = sessionStorage.getItem(requestStorage);
      if (old && /^[a-f0-9-]{36}$/.test(old)) setKey(old as any);
      else sessionStorage.setItem(requestStorage, key);
    } catch {}
  }, [requestStorage]);
  useEffect(() => {
    let active = true;
    api("account.profile")
      .then((p) => {
        if (active)
          setAddresses(
            p.addresses.filter(
              (a: any) =>
                a.location_available &&
                service.config.zones.some(
                  (z: string) => z.toLowerCase() === a.zone.toLowerCase(),
                ),
            ),
          );
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [customerId, service.id]);
  useEffect(() => {
    let active = true;
    let generation = 0;
    const refresh = async () => {
      const request = ++generation;
      try {
        const value = await api(serviceSlotsQuery(service, zone));
        if (active && request === generation && navigator.onLine) {
          setAvailability({ zone, value });
          setError("");
        }
      } catch (e: any) {
        if (active && request === generation) {
          setAvailability(null);
          setError(e.message);
        }
      }
    };
    const offline = () => {
      generation++;
      setAvailability(null);
      setError("You’re offline. Reconnect to check current appointments.");
    };
    void refresh();
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("offline", offline);
    window.addEventListener("online", refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", refresh);
    };
  }, [service.id, service.branch_id, service.version, zone, retry]);

  const current = availability?.zone === zone ? availability.value : null;
  const slots = activeServiceSlots(current?.slots ?? []);
  const days = [...new Set(slots.map(serviceSlotDay))];
  const daySlots = slots.filter((slot) => serviceSlotDay(slot) === day);
  const selected = daySlots.find((slot) => slot.id === slotId);
  const changed =
    current?.serviceVersion != null &&
    Number(current.serviceVersion) !== Number(service.version);
  const available =
    current?.status === "available" && slots.length > 0 && !changed && !error;
  const canProceed = Boolean(available && zone && selected);
  const recheck = async (v: Record<string, any>) => {
    const value: ServiceAvailability = await api(
      serviceSlotsQuery(service, v.zone),
    ).catch((failure) => {
      setAvailability(null);
      setError(failure.message);
      throw failure;
    });
    setAvailability({ zone: v.zone, value });
    assertServiceSelection(value, service.version, v.slotId);
  };
  return (
    <>
      {error ? (
        <Notice type="error" message={error} />
      ) : !current ? (
        <EasyGasLoader size="sm" variant="section" label="Checking appointment availability" />
      ) : changed ? (
        <Notice message="Service details or pricing changed. Refresh the service and review the current terms." />
      ) : !available ? (
        <p role="status">
          {
            serviceAvailabilityMessage[
              current.status === "available" ? "no_slots" : current.status
            ]
          }
        </p>
      ) : null}
      {(error || changed || (current && !available)) && (
        <div className="button-row">
          <button
            type="button"
            className="button secondary"
            onClick={changed ? done : () => setRetry((n) => n + 1)}
          >
            {changed ? "Refresh service details" : "Recheck availability"}
          </button>
          <Link className="text-link" href="/contact">
            Contact EasyGas
          </Link>
        </div>
      )}
      {(available || zone) && (
        <div className="service-detail-slot-fields">
          <label>
            <FieldCaption required={true}>Service area</FieldCaption>
            <select
              value={zone}
              onChange={(event) => {
                setZone(event.target.value);
                setDay("");
                setSlotId("");
                setAddress(null);
                setError("");
              }}
            >
              <option value="">Choose an area</option>
              {service.config.zones.map((area: string) => (
                <option key={area}>{area}</option>
              ))}
            </select>
          </label>
          <label>
            <FieldCaption required={true}>Appointment date</FieldCaption>
            <select
              value={days.includes(day) ? day : ""}
              disabled={!available || !zone}
              onChange={(event) => {
                setDay(event.target.value);
                setSlotId("");
              }}
            >
              <option value="">Select a date</option>
              {days.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label>
            <FieldCaption required={true}>Appointment time (Lagos)</FieldCaption>
            <select
              value={selected?.id ?? ""}
              disabled={!available || !day}
              onChange={(event) => setSlotId(event.target.value)}
            >
              <option value="">Select a time</option>
              {daySlots.map((slot) => (
                <option value={slot.id} key={slot.id}>
                  {serviceSlotTime(slot)}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {available && !details && (
        <button
          className="button service-detail-book-cta"
          type="button"
          disabled={!canProceed}
          onClick={() => setDetails(true)}
        >
          <CalendarDays size={18} aria-hidden="true" /> Book service{" "}
          <ArrowRight size={17} aria-hidden="true" />
        </button>
      )}
      <div hidden={!details} className="service-detail-contact-fields">
        {addresses.some((a) => a.zone.toLowerCase() === zone.toLowerCase()) && (
          <label className="surface" style={{ display: "grid", gap: 8 }}>
            <FieldCaption required={false}>Use a saved address</FieldCaption>
            <select
              aria-label="Saved service address"
              value={address?.id ?? ""}
              onChange={(e) =>
                setAddress(
                  addresses.find((a) => a.id === e.target.value) ?? null,
                )
              }
            >
              <option value="">Enter a new address</option>
              {addresses
                .filter((a) => a.zone.toLowerCase() === zone.toLowerCase())
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label} · {a.street}, {a.zone}
                  </option>
                ))}
            </select>
          </label>
        )}
        <ServiceForm
          key={address?.id ?? "new"}
          title="Request your appointment"
          submit="Confirm booking request"
          done={done}
          prepareReview={async (values) => {
            if (!bookingPhone(String(values.phone ?? "")))
              throw new Error(bookingPhoneMessage);
            await recheck(values);
          }}
          reviewKey={service.version + ":" + zone + ":" + slotId}
          bookingSelection={{ slotId, zone }}
          bookingAreas={{
            values: service.config.zones ?? [],
            onRecognized: (value) => {
              if (value !== zone) {
                setZone(value);
                setDay("");
                setSlotId("");
                setError("");
              }
            },
          }}
          disabled={!canProceed}
          review={(v) => (
            <>
              <h3>Review your booking request</h3>
              <p>
                {service.name} ·{" "}
                {slots.find((s) => s.id === v.slotId)?.starts_at
                  ? new Date(
                      slots.find((s) => s.id === v.slotId)?.starts_at ?? "",
                    ).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })
                  : "Choose appointment"}{" "}
                (Lagos time)
              </p>
              <p>
                {v.street}, {v.zone} · {v.phone}
              </p>
              <p>
                {v.type} · {v.concerns}
              </p>
              <p>
                {servicePrice(service.config)} · Call-out{" "}
                {serviceMoney(service.config.calloutKobo) ?? "unavailable"}
              </p>
              <p>
                Self-service changes close {service.config.cancellationHours}{" "}
                hours before arrival. {service.config.warranty}
              </p>
              <p>
                This is an appointment request. Payment and safety clearance are
                not confirmed by submitting it.
              </p>
            </>
          )}
          fields={[
            {
              name: "street",
              label: "Complete service address",
              type: "textarea",
              value: address?.street,
            },
            {
              name: "phone",
              label: "Contact mobile number",
              type: "tel",
              value: address?.phone,
            },
            {
              name: "brand",
              label: "Equipment brand",
              required: false,
            },
            { name: "type", label: "Equipment type" },
            {
              name: "burners",
              label: "Number of burners (0 if not applicable)",
              type: "number",
              value: 0,
            },
            {
              name: "newEquipment",
              label: "This is new equipment",
              type: "checkbox",
            },
            {
              name: "supplyPresent",
              label: "A gas supply arrangement is already present",
              type: "checkbox",
            },
            {
              name: "concerns",
              label: "Describe the equipment and your concerns",
              type: "textarea",
            },
            {
              name: "notes",
              label: "Additional instructions",
              type: "textarea",
              required: false,
            },
            {
              name: "combineWithProducts",
              label: "Confirm this appointment together with my product cart",
              type: "checkbox",
            },
          ]}
          send={async (v) => {
            const phone = bookingPhone(String(v.phone ?? ""));
            if (!phone) throw new Error(bookingPhoneMessage);
            const request = {
              serviceId: service.id,
              branchId: service.branch_id,
              serviceVersion: service.version,
              slotId: v.slotId,
              address: { street: v.street, zone: v.zone, phone },
              equipment: {
                brand: v.brand,
                type: v.type,
                burners: v.burners,
                newEquipment: v.newEquipment,
                supplyPresent: v.supplyPresent,
                concerns: v.concerns,
              },
              notes: v.notes,
              idempotencyKey: key,
              ...(new URLSearchParams(location.search).get("followup")
                ? {
                    followupId: new URLSearchParams(location.search).get(
                      "followup",
                    ),
                  }
                : {}),
              ...(new URLSearchParams(location.search).get("recommendation")
                ? {
                    recommendationId: new URLSearchParams(location.search).get(
                      "recommendation",
                    ),
                  }
                : {}),
            };
            const bundleId = new URLSearchParams(location.search).get("bundle");
            if (v.combineWithProducts || bundleId) {
              await recheck(v);
              const query = new URLSearchParams(location.search);
              const bundle = bundleId
                ? (await api("bundles")).find(
                    (offer: any) =>
                      offer.id === bundleId &&
                      offer.config.serviceId === service.id &&
                      offer.branch_id === service.branch_id &&
                      Number(offer.version) ===
                        Number(query.get("bundleVersion")) &&
                      Number(offer.serviceVersion) ===
                        Number(service.version) &&
                      Number(offer.totalKobo) ===
                        Number(query.get("bundleTotal")),
                  )
                : null;
              if (bundleId && !bundle)
                throw new Error(
                  "This bundle has changed or is unavailable. Return to services and review the current offer.",
                );
              const me = await api("me"),
                storage = "easygas.serviceDrafts." + me.user.id;
              const old = JSON.parse(sessionStorage.getItem(storage) ?? "[]");
              if (old.length >= 5)
                throw new Error(
                  "A linked request supports up to five appointments.",
                );
              sessionStorage.setItem(
                storage,
                JSON.stringify([
                  ...old,
                  {
                    request,
                    ...(bundle
                      ? {
                          bundleId: bundle.id,
                          bundleVersion: bundle.version,
                          bundleTotalKobo: bundle.totalKobo,
                        }
                      : {}),
                    name: service.name,
                    label: slots.find((s) => s.id === v.slotId)?.starts_at,
                    totalKobo: bundle
                      ? bundle.servicePriceKobo + bundle.calloutKobo
                      : service.config.pricingModel === "fixed"
                        ? service.config.priceKobo + service.config.calloutKobo
                        : null,
                  },
                ]),
              );
              window.location.assign("/combined-checkout");
              return { message: "Appointment added to your linked request." };
            }
            let result;
            try {
              result = await serviceMutation("booking.create", request);
            } catch (error: any) {
              if (error.status === 409) setRetry((n) => n + 1);
              throw error;
            }
            try {
              sessionStorage.removeItem(requestStorage);
            } catch {}
            window.location.assign("/bookings");
            return result;
          }}
        />
      </div>
    </>
  );
}
function ServiceEditor({
  service: s,
  done,
}: {
  service: any;
  done: () => void;
}) {
  const c = s.config;
  return (
    <details className="surface service-editor">
      <summary>
        <strong>{s.name}</strong> · {c.active ? "Open" : "Draft"} · version{" "}
        {s.version}
      </summary>
      <ServiceForm
        title="Propose service configuration"
        done={done}
        submit="Request independent approval"
        fields={[
          { name: "name", label: "Service name", value: c.name },
          {
            name: "description",
            label: "Description",
            type: "textarea",
            value: c.description,
          },
          {
            name: "active",
            label: "Open bookings after approval",
            type: "checkbox",
            value: c.active,
          },
          {
            name: "pricingModel",
            label: "Pricing model",
            value: c.pricingModel,
            options: [
              "fixed",
              "starting",
              "quote",
              "labour_materials",
              "custom",
            ].map((v) => ({ value: v, label: v.replaceAll("_", " ") })),
          },
          {
            name: "price",
            label: "Price in naira; blank for quotation",
            type: "text",
            value: c.priceKobo === null ? "" : c.priceKobo / 100,
            required: false,
          },
          {
            name: "callout",
            label: "Call-out charge in naira",
            type: "number",
            value: c.calloutKobo / 100,
          },
          {
            name: "durationMinutes",
            label: "Duration in minutes",
            type: "number",
            value: c.durationMinutes,
          },
          {
            name: "zones",
            label: "Service areas, separated by commas",
            value: c.zones.join(", "),
            required: false,
          },
          {
            name: "qualification",
            label: "Required qualification code",
            value: c.qualification,
          },
          {
            name: "preparation",
            label: "Customer preparation",
            value: c.preparation,
            type: "textarea",
          },
          {
            name: "safety",
            label: "Approved safety information",
            value: c.safety,
            type: "textarea",
          },
          {
            name: "cancellationHours",
            label: "Cancellation / reschedule cut-off in hours",
            type: "number",
            value: c.cancellationHours,
          },
          {
            name: "warranty",
            label: "Warranty terms",
            value: c.warranty,
            type: "textarea",
          },
          {
            name: "inclusions",
            label: "Included work",
            value: c.inclusions,
            type: "textarea",
          },
          {
            name: "exclusions",
            label: "Excluded work",
            value: c.exclusions,
            type: "textarea",
          },
          { name: "reason", label: "Reason for change" },
        ]}
        send={(v) =>
          api("services.propose", {
            serviceId: s.id,
            branchId: s.branch_id,
            version: s.version,
            reason: v.reason,
            config: {
              name: v.name,
              description: v.description,
              active: v.active,
              pricingModel: v.pricingModel,
              priceKobo:
                v.price.trim() === ""
                  ? null
                  : Math.round(Number(v.price) * 100),
              calloutKobo: Math.round(v.callout * 100),
              durationMinutes: v.durationMinutes,
              zones: v.zones
                .split(",")
                .map((s: string) => s.trim())
                .filter(Boolean),
              qualification: v.qualification,
              preparation: v.preparation,
              safety: v.safety,
              cancellationHours: v.cancellationHours,
              warranty: v.warranty,
              inclusions: v.inclusions,
              exclusions: v.exclusions,
            },
          })
        }
      />
      <ImageUpload serviceId={s.id} branchId={s.branch_id} done={done} />
      <ChecklistEditor service={s} done={done} />
    </details>
  );
}
function ChecklistEditor({
  service: s,
  done,
}: {
  service: any;
  done: () => void;
}) {
  const [checks, setChecks] = useState<any[]>(
      s.checklist.length
        ? s.checklist
        : [{ id: "inspection_1", label: "", required: true }],
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="surface workflow-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          await api("services.checklist.propose", {
            serviceId: s.id,
            branchId: s.branch_id,
            version: s.checklist_version + 1,
            checks,
            reason: "Qualified review requested for inspection requirements",
          });
          done();
        } catch (e: any) {
          setError(e.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3>Propose an inspection checklist</h3>
      <p>
        Only qualified personnel should define the actual inspection
        requirements. No checklist is pre-approved.
      </p>
      {checks.map((c, i) => (
        <div key={c.id}>
          <label>
            <FieldCaption required={true}>Inspection step {i + 1}</FieldCaption>
            <FormInput
              value={c.label}
              required
              minLength={5}
              maxLength={250}
              onChange={(e) =>
                setChecks(
                  checks.map((x, j) =>
                    j === i ? { ...x, label: e.target.value } : x,
                  ),
                )
              }
            />
          </label>
          <label>
            <FormInput
              type="checkbox"
              checked={c.required}
              onChange={(e) =>
                setChecks(
                  checks.map((x, j) =>
                    j === i ? { ...x, required: e.target.checked } : x,
                  ),
                )
              }
            /><FieldCaption required={false}>{" "}
            Required</FieldCaption>
          </label>
          <button
            type="button"
            className="text-link"
            disabled={checks.length === 1}
            onClick={() => setChecks(checks.filter((_, j) => j !== i))}
          >
            Remove step
          </button>
        </div>
      ))}
      <button
        type="button"
        className="button secondary"
        disabled={checks.length >= 40}
        onClick={() =>
          setChecks([
            ...checks,
            {
              id: "check_" + crypto.randomUUID().slice(0, 8),
              label: "",
              required: true,
            },
          ])
        }
      >
        Add inspection step
      </button>
      {error && <Notice type="error" message={error} />}
      <button className="button" disabled={busy}>
        Request owner and safety review
      </button>
    </form>
  );
}
function Technicians({
  data,
  user,
  reload,
}: {
  data: any;
  user: any;
  reload: () => void;
}) {
  return (
    <div className="service-grid" id="available-services" tabIndex={-1}>
      <div>
        <h2>Verified qualifications</h2>
        {data.qualifications.map((q: any) => (
          <div className="surface" key={q.id}>
            <strong>
              {data.staff.find((u: any) => u.id === q.user_id)?.name ??
                q.user_id}
            </strong>
            <p>
              {q.code} · expires {new Date(q.expires_at).toLocaleDateString()}
            </p>
            <p>{q.evidence}</p>
          </div>
        ))}
        {["owner"].includes(user.role) && (
          <ServiceForm
            title="Record independent qualification verification"
            done={reload}
            fields={[
              {
                name: "userId",
                label: "Technician / reviewer",
                options: data.staff.map((u: any) => ({
                  value: u.id,
                  label: u.name + " · " + u.role,
                })),
              },
              {
                name: "code",
                label:
                  "Qualification code, including safety_review for reviewers",
              },
              {
                name: "evidence",
                label: "Verification and document reference",
                type: "textarea",
              },
              {
                name: "expiresAt",
                label: "Documented expiry",
                type: "datetime-local",
              },
            ]}
            send={(v) => api("technician.qualify", v)}
          />
        )}
      </div>
      <div>
        <ServiceForm
          title="Create an available technician appointment"
          done={reload}
          fields={[
            {
              name: "serviceId",
              label: "Service",
              options: data.services.map((s: any) => ({
                value: s.id,
                label: s.name + " · " + s.config.durationMinutes + " min",
              })),
            },
            {
              name: "technicianId",
              label: "Technician",
              options: data.staff
                .filter((u: any) => u.role === "technician")
                .map((u: any) => ({ value: u.id, label: u.name })),
            },
            {
              name: "startsAt",
              label: "Appointment start (your device timezone)",
              type: "datetime-local",
            },
            {
              name: "endsAt",
              label: "Appointment end (your device timezone)",
              type: "datetime-local",
            },
          ]}
          send={(v) =>
            api("services.slot.create", {
              ...v,
              branchId: user.branchId ?? "lagos",
            })
          }
        />
        <h3>Upcoming availability</h3>
        {data.slots.map((s: any) => (
          <div className="surface" key={s.id}>
            <p>
              {data.services.find((x: any) => x.id === s.service_id)?.name} ·{" "}
              {new Date(s.starts_at).toLocaleString("en-NG", {
                timeZone: "Africa/Lagos",
              })}
            </p>
            <ServiceForm
              title={s.blocked ? "Unblock appointment" : "Block appointment"}
              fields={[{ name: "reason", label: "Reason" }]}
              done={reload}
              send={(v) =>
                api("services.slot.block", {
                  id: s.id,
                  blocked: !s.blocked,
                  reason: v.reason,
                })
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}
export function BookingCard({
  booking: b,
  user,
  done,
}: {
  booking: any;
  user: any;
  done: () => void;
}) {
  const customer = user.id === b.customer_id,
    tech = user.role === "technician",
    manager = ["owner", "manager"].includes(user.role),
    store = ["owner", "finance", "manager"].includes(user.role),
    finance = ["owner", "finance"].includes(user.role),
    q = b.quotes[0];
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [paymentKey] = useState(() => crypto.randomUUID());
  async function act(action: string, data: any) {
    setBusy(true);
    setError("");
    try {
      await serviceMutation(action, { bookingId: b.id, ...data });
      done();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const step =
    b.status === "pending_confirmation"
      ? "confirmed"
      : b.status === "confirmed"
        ? "assigned"
        : b.status === "assigned"
          ? "en_route"
          : b.status === "en_route"
            ? "in_progress"
            : null;
  function downloadReport() {
    const blob = new Blob([JSON.stringify(b.report.body, null, 2)], {
        type: "application/json",
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = b.reference + "-service-report.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <article className="surface service-booking">
      <div className="section-heading">
        <div>
          <span className="eyebrow">{b.reference}</span>
          <h2>{b.snapshot.name}</h2>
        </div>
        <span className="status-badge">{b.status.replaceAll("_", " ")}</span>
      </div>
      <p>
        {new Date(b.starts_at).toLocaleString("en-NG", {
          timeZone: "Africa/Lagos",
        })}{" "}
        (Lagos time)
      </p>
      <p>
        {b.address.street}, {b.address.zone} ·{" "}
        <a href={"tel:" + b.address.phone}>{b.address.phone}</a>
      </p>
      <p>
        {b.equipment.type} · {b.equipment.concerns}
      </p>
      <p>
        Total:{" "}
        {b.billing.totalKobo === null
          ? "Awaiting approved quotation"
          : money(b.billing.totalKobo)}{" "}
        · Verified paid {money(b.billing.paidKobo)} · Refunded{" "}
        {money(b.billing.refundedKobo)}{" "}
        {b.billing.overpaidKobo > 0 && (
          <>· Credit review due {money(b.billing.overpaidKobo)}</>
        )}
      </p>
      {b.technician?.name && <p>Assigned technician: {b.technician.name}</p>}
      <Link className="text-link" href="/support">
        Contact Support
      </Link>
      {error && <Notice type="error" message={error} />}{" "}
      {step &&
        ((manager && ["confirmed", "assigned"].includes(step)) ||
          (tech && ["en_route", "in_progress"].includes(step))) && (
          <button
            className="button"
            disabled={busy}
            onClick={() =>
              act("booking.transition", {
                status: step,
                reason:
                  "Appointment " +
                  step.replaceAll("_", " ") +
                  " recorded by authorised staff.",
              })
            }
          >
            {step === "in_progress"
              ? "Confirm arrival for assessment only"
              : step.replaceAll("_", " ")}
          </button>
        )}
      {(manager ||
        (customer &&
          Date.parse(b.starts_at) - Date.now() >=
            b.snapshot.cancellationHours * 3600000)) &&
        ["pending_confirmation", "confirmed", "assigned"].includes(
          b.status,
        ) && (
          <details>
            <summary>Change or cancel appointment</summary>
            <Reschedule b={b} done={done} />
            <ServiceForm
              title="Cancel appointment"
              fields={[{ name: "reason", label: "Cancellation reason" }]}
              done={done}
              send={(v) =>
                serviceMutation("booking.cancel", {
                  bookingId: b.id,
                  version: b.version,
                  ...v,
                })
              }
            />
          </details>
        )}
      {manager && !["completed", "cancelled", "failed"].includes(b.status) && (
        <details>
          <summary>Review a pre-work cancellation exception</summary>
          <p>
            Use for a late cancellation or on-site assessment before chargeable
            work. Independent finance approval applies to this exact booking
            revision. Issued materials, documented work and financial
            settlements require separate reconciliation.
          </p>
          {["request_review", "execute_review"].map((step) => (
            <ServiceForm
              key={step}
              title={
                step === "request_review"
                  ? "Request cancellation review"
                  : "Execute approved cancellation"
              }
              fields={[
                {
                  name: "reason",
                  label: "Customer request and cancellation evidence",
                },
              ]}
              done={done}
              send={(v) =>
                serviceMutation("booking.cancel." + step, {
                  bookingId: b.id,
                  version: b.version,
                  ...v,
                })
              }
            />
          ))}
        </details>
      )}
      {q && (
        <section className="quote-card">
          <h3>Quotation revision {q.revision}</h3>
          <p>
            {q.valid_until
              ? "Valid until " +
                new Date(q.valid_until).toLocaleString("en-NG", {
                  timeZone: "Africa/Lagos",
                })
              : "No expiry configured; request clarification from support if needed."}
          </p>
          <p>{q.notes}</p>
          <p>
            Labour {money(q.labour_kobo)} · Call-out {money(q.callout_kobo)}
          </p>
          {q.lines.map((l: any) => (
            <p key={l.productId}>
              {l.quantity} × {l.name} · {money(l.unitPriceKobo)}
            </p>
          ))}
          <strong>Maximum approved scope: {money(q.total_kobo)}</strong>
          <p>
            {q.approved === true
              ? "Customer approved"
              : q.approved === false
                ? "Customer declined"
                : "Awaiting customer decision"}
          </p>
          {customer &&
            q.approved === null &&
            (!q.valid_until || Date.parse(q.valid_until) > Date.now()) &&
            b.status === "awaiting_customer_approval" && (
              <div className="service-actions">
                <button
                  className="button"
                  disabled={busy}
                  onClick={() =>
                    act("booking.quote.decide", {
                      quoteId: q.id,
                      approved: true,
                    })
                  }
                >
                  Approve this quotation
                </button>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() =>
                    act("booking.quote.decide", {
                      quoteId: q.id,
                      approved: false,
                    })
                  }
                >
                  Decline quotation
                </button>
              </div>
            )}
        </section>
      )}
      {b.quotes.length > 1 && (
        <details>
          <summary>Previous quotation revisions</summary>
          {b.quotes.slice(1).map((old: any) => (
            <p key={old.id}>
              Revision {old.revision} · {money(old.total_kobo)} ·{" "}
              {old.approved === true
                ? "Approved"
                : old.approved === false
                  ? "Declined"
                  : "Superseded"}{" "}
              · {old.notes}
            </p>
          ))}
        </details>
      )}
      {tech &&
        ["in_progress", "awaiting_customer_approval"].includes(b.status) && (
          <QuoteForm b={b} done={done} />
        )}
      {b.materials.map((m: any) => (
        <div className="quote-card" key={m.id}>
          <h3>{m.name}</h3>
          <p>
            {m.quantity} units · {m.state.replaceAll("_", " ")}
          </p>
          {store && m.state === "reserved" && (
            <ServiceForm
              title="Issue approved materials"
              fields={[
                {
                  name: "cost",
                  label: "Actual unit cost in naira",
                  type: "number",
                },
              ]}
              done={done}
              send={(v) =>
                serviceMutation("service.material.issue", {
                  bookingId: b.id,
                  materialId: m.id,
                  unitCostKobo: Math.round(v.cost * 100),
                })
              }
            />
          )}{" "}
          {tech && m.state === "issued" && (
            <ServiceForm
              title="Record actual materials usage"
              fields={[
                { name: "used", label: "Units used", type: "number" },
                {
                  name: "damaged",
                  label: "Units damaged",
                  type: "number",
                  value: 0,
                },
              ]}
              done={done}
              send={(v) =>
                serviceMutation("service.material.usage", {
                  bookingId: b.id,
                  materialId: m.id,
                  ...v,
                })
              }
            />
          )}{" "}
          {["owner", "finance"].includes(user.role) &&
            m.state === "issued" && (
              <details>
                <summary>Recover stopped-work material custody</summary>
                <p>
                  Record actual counts only. Owner and finance approval is
                  required. Recovery never authorises further work or changes
                  customer charges.
                </p>
                {(user.role === "finance"
                  ? ["request", "execute"]
                  : ["execute"]
                ).map((step) => (
                  <ServiceForm
                    key={step}
                    title={
                      step === "request"
                        ? "Request independent material recovery review"
                        : "Execute approved material recovery"
                    }
                    fields={[
                      {
                        name: "used",
                        label: "Actual units used",
                        type: "number",
                        value: 0,
                      },
                      {
                        name: "damaged",
                        label: "Actual units damaged",
                        type: "number",
                        value: 0,
                      },
                      {
                        name: "missing",
                        label: "Actual units missing",
                        type: "number",
                        value: 0,
                      },
                      {
                        name: "returned",
                        label: "Safe unused units actually returned",
                        type: "number",
                        value: 0,
                      },
                      {
                        name: "damagedReturned",
                        label: "Damaged units actually returned to quarantine",
                        type: "number",
                        value: 0,
                      },
                      { name: "evidence", label: "Independent count evidence" },
                      { name: "reason", label: "Recovery reason" },
                    ]}
                    done={done}
                    send={(v) =>
                      serviceMutation("service.material.recovery." + step, {
                        bookingId: b.id,
                        materialId: m.id,
                        version: b.version,
                        ...v,
                      })
                    }
                  />
                ))}
              </details>
            )}
          {store && m.state === "usage_recorded" && (
            <ServiceForm
              title="Confirm physical return and reconcile"
              fields={[
                {
                  name: "returned",
                  label: "Unused units received",
                  type: "number",
                },
                { name: "reason", label: "Return inspection/reference" },
              ]}
              done={done}
              send={(v) =>
                serviceMutation("service.material.return", {
                  bookingId: b.id,
                  materialId: m.id,
                  ...v,
                })
              }
            />
          )}
        </div>
      ))}
      {tech &&
        ["in_progress", "awaiting_customer_approval"].includes(b.status) && (
          <section className="quote-card">
            <h3>Assessment and work authorisation</h3>
            <p>
              Arrival permits assessment only. Current work phase:{" "}
              {b.work_phase}. Successful work requires consented evidence,
              independent quotation approval, customer acceptance and verified
              payment.
            </p>
            <ServiceForm
              title="Verify password for quotation review"
              fields={[
                {
                  name: "password",
                  label: "Current password",
                  type: "password",
                },
              ]}
              send={(v) => api("reauth", v)}
            />
            {q && (
              <ServiceForm
                title="Submit latest quote for independent business approval"
                fields={[{ name: "reason", label: "Scope and review reason" }]}
                done={done}
                send={(v) =>
                  serviceMutation("booking.quote.request_review", {
                    bookingId: b.id,
                    quoteId: q.id,
                    reason: v.reason,
                  })
                }
              />
            )}
            <ServiceForm
              title="Start authorised service work"
              fields={[
                {
                  name: "reason",
                  label: "Confirm authorised scope and safe work conditions",
                },
              ]}
              done={done}
              send={(v) =>
                serviceMutation("booking.work.start", {
                  bookingId: b.id,
                  version: b.version,
                  reason: v.reason,
                })
              }
            />
          </section>
        )}
      {tech && b.status === "in_progress" && !b.report && (
        <ReportForm b={b} done={done} />
      )}
      {b.snapshot.bundleId && (
        <p>
          Original bundled service saving:{" "}
          {money(b.snapshot.bundleDiscountKobo)}. Additional quoted work
          requires your approval.
        </p>
      )}
      {b.images?.length > 0 && (
        <div className="service-grid" id="available-services" tabIndex={-1}>
          {b.images.map((m: any) => (
            <img
              className="catalogue-photo"
              src={"/api/media/" + m.id}
              alt={m.alt}
              key={m.id}
            />
          ))}
        </div>
      )}
      {(customer || tech) &&
        !b.report &&
        !["cancelled", "failed", "completed"].includes(b.status) && (
          <ImageUpload bookingId={b.id} done={done} />
        )}
      {(customer ||
        ["owner", "finance", "manager"].includes(
          user.role,
        )) && (
        <OrderInvoice
          bookingId={b.id}
          canIssue={["owner", "finance"].includes(user.role)}
        />
      )}
      {["failed", "cancelled"].includes(b.status) && (
        <section className="panel">
          <h3>Financial exception review</h3>
          <p>
            The unsuccessful/cancelled service outcome stays unchanged. Only a
            separately approved, customer-agreed settlement can establish
            reviewed charges.
          </p>
          {user.role === "manager" && (
            <ServiceForm
              title="Propose an exception settlement"
              fields={[
                {
                  name: "amount",
                  label: "Agreed settlement for review (₦)",
                  type: "number",
                },
                {
                  name: "evidence",
                  label: "Actual report and settlement evidence",
                },
                { name: "reason", label: "Settlement reason" },
              ]}
              done={done}
              send={(v) =>
                serviceMutation("booking.settlement.propose", {
                  bookingId: b.id,
                  version: b.version,
                  amountKobo: Math.round(v.amount * 100),
                  evidence: v.evidence,
                  reason: v.reason,
                })
              }
            />
          )}
          {b.settlements?.map((s: any, i: number) => (
            <article className="quote-card" key={s.id}>
              <h4>
                Settlement revision {s.revision}: {money(s.amount_kobo)}
              </h4>
              <p>
                {s.reason} · Business review:{" "}
                {s.business_approved ? "approved" : "pending"} · Customer
                decision:{" "}
                {s.accepted === null
                  ? "pending"
                  : s.accepted
                    ? "accepted"
                    : "declined"}
              </p>
              {customer && i === 0 && s.accepted === null && (
                <ServiceForm
                  title="Review this exact settlement"
                  fields={[
                    {
                      name: "accepted",
                      label:
                        "I agree to this exact financial settlement (uncheck to decline)",
                      type: "checkbox",
                    },
                    { name: "notes", label: "Your decision notes" },
                  ]}
                  done={done}
                  send={(v) =>
                    serviceMutation("booking.settlement.consent", {
                      bookingId: b.id,
                      settlementId: s.id,
                      ...v,
                    })
                  }
                />
              )}
            </article>
          ))}
        </section>
      )}
      {b.report && (
        <section className="service-report">
          <h3>Service report · {b.report.outcome.replaceAll("_", " ")}</h3>
          <p>{b.report.body.findings}</p>
          <p>{b.report.body.workPerformed}</p>
          {b.report.body.responses.map((r: any) => (
            <p key={r.id}>
              {b.report.body.checklist.find((c: any) => c.id === r.id)?.label}:{" "}
              {r.passed ? "Passed" : "Failed"} — {r.notes}
            </p>
          ))}
          <p>{b.report.body.recommendations}</p>
          <p>
            {["success", "recommendations"].includes(b.report.outcome)
              ? "Final documented scope"
              : "Documented ceiling for financial review"}{" "}
            {money(b.report.body.invoiceTotalKobo)}. This record is not
            independent regulatory certification.
          </p>
          <button className="button secondary" onClick={downloadReport}>
            Download report data
          </button>
          <button
            className="button secondary"
            onClick={() => {
              const w = window.open("", "_blank");
              if (w) {
                w.document.write(serviceReportHtml(b.report.body));
                w.document.close();
                w.focus();
                w.print();
              } else
                setError("Allow the report window to print or save a PDF.");
            }}
          >
            Print / save PDF report
          </button>
          {b.dispute && (
            <Notice
              message={`Service dispute: ${b.dispute.status}. Charges remain on review while the dispute is open. Financial corrections and refunds require separate approvals.`}
            />
          )}
          {customer && (!b.dispute || b.dispute.status === "resolved") && (
            <ServiceForm
              title="Report a concern with this service"
              fields={[{ name: "reason", label: "Describe your concern" }]}
              done={done}
              send={(v) =>
                serviceMutation("booking.dispute", { bookingId: b.id, ...v })
              }
            />
          )}
          {customer && b.status === "awaiting_acknowledgement" && (
            <ServiceForm
              title="Acknowledge your service report"
              fields={[
                {
                  name: "accepted",
                  label: "I acknowledge the documented service",
                  type: "checkbox",
                },
                { name: "notes", label: "Acknowledgement / concern" },
              ]}
              done={done}
              send={(v) =>
                serviceMutation("booking.acknowledge", {
                  bookingId: b.id,
                  ...v,
                })
              }
            />
          )}
        </section>
      )}
      {customer && b.billing.walletEnabled && b.billing.dueKobo > 0 && (
        <ServiceForm
          title="Pay approved charges with purchase credit"
          fields={[
            {
              name: "amount",
              label: "Amount in naira (partial payment allowed)",
              type: "number",
            },
          ]}
          done={done}
          send={(v) =>
            serviceMutation("booking.wallet.pay", {
              bookingId: b.id,
              amountKobo: Math.round(v.amount * 100),
              idempotencyKey: paymentKey,
            })
          }
        />
      )}
      {tech && b.billing.dueKobo > 0 && (
        <ServiceForm
          title="Record cash actually collected"
          fields={[
            { name: "amount", label: "Amount in naira", type: "number" },
            { name: "reference", label: "Unique receipt reference" },
          ]}
          done={done}
          send={(v) =>
            serviceMutation("booking.cash.record", {
              bookingId: b.id,
              amountKobo: Math.round(v.amount * 100),
              reference: v.reference,
            })
          }
        />
      )}
      {b.cashCollections.map((c: any) => (
        <div className="quote-card" key={c.id}>
          <p>
            {c.reference} · {money(c.amount_kobo)} ·{" "}
            {c.verified_at
              ? "Independently verified"
              : "Awaiting independent finance verification"}
          </p>
          {finance && !c.verified_at && (
            <button
              className="button"
              disabled={busy}
              onClick={() => act("booking.cash.verify", { collectionId: c.id })}
            >
              Verify actual cash receipt
            </button>
          )}
        </div>
      ))}
      {customer &&
        b.billing.paidKobo > b.billing.refundedKobo &&
        ["completed", "failed", "cancelled"].includes(b.status) && (
          <ServiceForm
            title="Request a reviewed refund"
            fields={[
              {
                name: "refundScope",
                label: "Refund review scope",
                value: b.billing.overpaidKobo > 0 ? "excess" : "service",
                options: [
                  { value: "service", label: "Full service refund review" },
                  {
                    value: "excess",
                    label: "Excess payment only (reconciled charges)",
                  },
                ],
              },
              {
                name: "acceptWalletCredit",
                needsConsent: true,
                label:
                  "I accept restricted EasyGas purchase credit for an approved refund",
                type: "checkbox",
              },
              { name: "reason", label: "Refund reason" },
            ]}
            done={done}
            send={(v) =>
              serviceMutation("booking.refund.request", {
                bookingId: b.id,
                ...v,
              })
            }
          />
        )}
      {customer && b.status === "completed" && (
        <ServiceForm
          title="Review this completed service"
          fields={[
            { name: "rating", label: "Rating", type: "number" },
            { name: "body", label: "Your feedback", type: "textarea" },
          ]}
          done={done}
          send={(v) =>
            serviceMutation("booking.feedback", { bookingId: b.id, ...v })
          }
        />
      )}
      {b.status === "completed" && (tech || manager) && (
        <ServiceForm
          title="Record a documented follow-up"
          fields={[
            { name: "dueDate", label: "Follow-up date", type: "date" },
            {
              name: "reason",
              label: "Documented reason; no automatic paid work",
              type: "textarea",
            },
          ]}
          done={done}
          send={(v) =>
            api("service.followup.create", { bookingId: b.id, ...v })
          }
        />
      )}
      <details>
        <summary>Appointment history</summary>
        {b.events.map((e: any, i: number) => (
          <p key={i}>
            {new Date(e.created_at).toLocaleString("en-NG", {
              timeZone: "Africa/Lagos",
            })}{" "}
            · {e.status.replaceAll("_", " ")} · {e.note}
          </p>
        ))}
      </details>
    </article>
  );
}
function Reschedule({ b, done }: { b: any; done: () => void }) {
  const [slots, setSlots] = useState<any[]>([]);
  useEffect(() => {
    api(
      "services.slots?" +
        new URLSearchParams({ serviceId: b.service_id, branchId: b.branch_id }),
    )
      .then(setSlots)
      .catch(() => setSlots([]));
  }, [b.service_id, b.branch_id]);
  return slots.length ? (
    <ServiceForm
      title="Reschedule with an available technician"
      fields={[
        {
          name: "slotId",
          label: "New appointment",
          options: slots.map((s) => ({
            value: s.id,
            label: new Date(s.starts_at).toLocaleString("en-NG", {
              timeZone: "Africa/Lagos",
            }),
          })),
        },
        { name: "reason", label: "Reason" },
      ]}
      done={done}
      send={(v) =>
        serviceMutation("booking.reschedule", {
          bookingId: b.id,
          version: b.version,
          ...v,
        })
      }
    />
  ) : (
    <p>No alternative appointments currently available.</p>
  );
}
function QuoteForm({ b, done }: { b: any; done: () => void }) {
  const [products, setProducts] = useState<any[]>([]),
    [lines, setLines] = useState<number[]>([]);
  useEffect(() => {
    api("products.manage")
      .then((r) => setProducts(r.products))
      .catch(() => setProducts([]));
  }, []);
  return (
    <section className="quote-card">
      <div className="service-actions">
        <button
          className="button secondary"
          disabled={lines.length >= 20}
          onClick={() => setLines([...lines, lines.length])}
        >
          Add quoted material
        </button>
        <button
          className="button secondary"
          disabled={!lines.length}
          onClick={() => setLines(lines.slice(0, -1))}
        >
          Remove last material
        </button>
      </div>
      <ServiceForm
        title="Propose the full revised scope"
        fields={[
          {
            name: "validUntil",
            label: "Quotation valid until (your local time)",
            type: "datetime-local",
            required: false,
          },
          {
            name: "labour",
            label: "Full labour charge in naira",
            type: "number",
          },
          {
            name: "notes",
            label: "Assessment, scope and reason for changes",
            type: "textarea",
          },
          ...lines.flatMap((_, i) => [
            {
              name: "product_" + i,
              label: "Material " + (i + 1),
              options: products
                .filter(
                  (p) =>
                    !["Gas refills", "Empty cylinders", "Bundles"].includes(
                      p.category,
                    ),
                )
                .map((p) => ({ value: p.id, label: p.name })),
            },
            {
              name: "quantity_" + i,
              label: "Quantity " + (i + 1),
              type: "number",
              value: 1,
            },
          ]),
        ]}
        done={done}
        submit="Send quotation for customer approval"
        send={(v) =>
          serviceMutation("booking.quote", {
            bookingId: b.id,
            validUntil: v.validUntil,
            labourKobo: Math.round(v.labour * 100),
            notes: v.notes,
            lines: lines.map((_, i) => ({
              productId: v["product_" + i],
              quantity: v["quantity_" + i],
            })),
          })
        }
      />
    </section>
  );
}
function ReportForm({ b, done }: { b: any; done: () => void }) {
  return (
    <ServiceForm
      title="Record findings and submit the service report"
      fields={[
        {
          name: "outcome",
          label: "Overall outcome",
          options: [
            "success",
            "recommendations",
            "further_assessment",
            "unsafe",
            "unable",
          ].map((v) => ({ value: v, label: v.replaceAll("_", " ") })),
        },
        ...b.checklist.flatMap((c: any) => [
          {
            name: c.id,
            label: c.label,
            required: c.required,
            options: [
              { value: "passed", label: "Passed" },
              { value: "failed", label: "Failed" },
            ],
          },
          {
            name: c.id + "_notes",
            label: "Evidence / notes for " + c.label,
            required: c.required,
          },
        ]),
        { name: "findings", label: "Findings", type: "textarea" },
        {
          name: "workPerformed",
          label: "Work actually performed",
          type: "textarea",
        },
        {
          name: "recommendations",
          label: "Qualified recommendations / follow-up",
          type: "textarea",
          required: false,
        },
      ]}
      done={done}
      submit="Submit immutable service report"
      send={(v) =>
        serviceMutation("booking.report", {
          bookingId: b.id,
          outcome: v.outcome,
          responses: b.checklist
            .filter((c: any) => v[c.id])
            .map((c: any) => ({
              id: c.id,
              passed: v[c.id] === "passed",
              notes: v[c.id + "_notes"],
            })),
          findings: v.findings,
          workPerformed: v.workPerformed,
          recommendations: v.recommendations,
        })
      }
    />
  );
}
function Incidents() {
  const [rows, setRows] = useState<any[]>([]),
    [error, setError] = useState(""),
    [version, setVersion] = useState(0);
  useEffect(() => {
    api("incidents")
      .then(setRows)
      .catch((e) => setError(e.message));
  }, [version]);
  return (
    <>
      {error && <Notice type="error" message={error} />}{" "}
      {!rows.length && !error && <p>No operational incidents recorded.</p>}
      {rows.map((r) => (
        <article className="surface" key={r.id}>
          <h2>
            {r.severity} · {r.category.replaceAll("_", " ")}
          </h2>
          <p>{r.detail}</p>
          <p>{r.status}</p>
          <ServiceForm
            title="Record incident response"
            fields={[
              {
                name: "status",
                label: "Status",
                options: [
                  { value: "acknowledged", label: "Acknowledged" },
                  { value: "resolved", label: "Resolved" },
                ],
              },
              {
                name: "note",
                label: "Corrective action / evidence",
                type: "textarea",
              },
            ]}
            done={() => setVersion((n) => n + 1)}
            send={(v) => api("incident.update", { id: r.id, ...v })}
          />
        </article>
      ))}
    </>
  );
}
