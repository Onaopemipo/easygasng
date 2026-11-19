"use client";
import React, { useEffect, useRef, useState, type FormEvent } from "react";
import { CalendarDays, Check, ChevronLeft, ArrowRight } from "lucide-react";
import { Modal, api, Notice } from "./ui";
import { serviceMutation } from "./service-mutation";
import {
  servicePrice,
  serviceMoney,
} from "../../../packages/business-rules/src/service-detail";
import { lagosAppointment } from "../../../packages/business-rules/src/technicians-availability";
import {
  bookingPhone,
  bookingPhoneMessage,
} from "../../../packages/business-rules/src/booking-contact";

export type ServiceRequestReceipt = { id: string; reference: string };
export function ServiceRequestLauncher({
  service,
  customerId,
  done,
}: {
  service: any;
  customerId: string;
  done: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <p className="sr-intro">
        Choose your preferred visit time. We’ll arrange a provider and confirm
        your appointment.
      </p>
      <button className="button sr-launch" onClick={() => setOpen(true)}>
        <CalendarDays size={17} />
        Book service
        <ArrowRight size={16} />
      </button>
      {open && (
        <ServiceRequestDialog
          service={service}
          customerId={customerId}
          onClose={() => setOpen(false)}
          onCreated={done}
          onView={(r) =>
            window.location.assign(
              "/bookings?bookingId=" + encodeURIComponent(r.id),
            )
          }
        />
      )}
    </>
  );
}
export function ServiceRequestDialog({
  service,
  customerId,
  onClose,
  onCreated,
  onView,
}: {
  service: any;
  customerId: string;
  onClose: () => void;
  onCreated: (receipt: ServiceRequestReceipt) => void;
  onView: (receipt: ServiceRequestReceipt) => void;
}) {
  const [addresses, setAddresses] = useState<any[]>([]),
    [review, setReview] = useState<any>(null),
    [receipt, setReceipt] = useState<ServiceRequestReceipt | null>(null),
    [busy, setBusy] = useState(false),
    [recovering, setRecovering] = useState(true),
    [error, setError] = useState(""),
    [dirty, setDirty] = useState(false),
    [addressKey, setAddressKey] = useState(""),
    [uncertain, setUncertain] = useState(false);
  const wasReview = useRef(false);
  const key = useRef<string>(""),
    lock = useRef(false),
    draft = useRef<Record<string, any>>({}),
    content = useRef<HTMLDivElement>(null);
  const storage = `easygas.booking.request.${customerId}.${service.id}`;
  const address = addresses.find((a) => a.id === addressKey);
  const today = new Date(Date.now() + 3600000).toISOString().slice(0, 10),
    maxDay = new Date(Date.now() + 180 * 86400000 + 3600000)
      .toISOString()
      .slice(0, 10);
  useEffect(() => {
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = before;
    };
  }, []);
  useEffect(() => {
    if (review || receipt) {
      content.current?.querySelector<HTMLElement>("button")?.focus();
      wasReview.current = true;
    } else if (wasReview.current) {
      content.current?.querySelector<HTMLElement>("input")?.focus();
      wasReview.current = false;
    }
  }, [review, receipt]);
  useEffect(() => {
    const controller = new AbortController();
    let live = true;
    api("account.profile", undefined, { signal: controller.signal })
      .then((p) => {
        if (live)
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
    (async () => {
      let previous = "";
      try {
        previous = sessionStorage.getItem(storage) ?? "";
      } catch {}
      key.current = /^[a-f0-9-]{36}$/i.test(previous)
        ? previous
        : crypto.randomUUID();
      if (previous)
        try {
          const r = await api(
            "booking.recover?key=" + encodeURIComponent(key.current),
            undefined,
            { signal: controller.signal },
          );
          if (live && r.status === "COMMITTED") {
            setReceipt(r);
            onCreated(r);
            try {
              sessionStorage.removeItem(storage);
            } catch {}
          }
        } catch (e: any) {
          if (live) {
            setError(
              "We couldn’t check your earlier request. Retry the check before booking again.",
            );
            setUncertain(true);
          }
        }
      if (live) setRecovering(false);
    })();
    return () => {
      live = false;
      controller.abort();
    };
  }, [customerId, service.id]);
  async function recover() {
    setBusy(true);
    setError("");
    try {
      const r = await api(
        "booking.recover?key=" + encodeURIComponent(key.current),
      );
      if (r.status === "COMMITTED") {
        setReceipt(r);
        onCreated(r);
        setDirty(false);
        try {
          sessionStorage.removeItem(storage);
        } catch {}
      }
      setUncertain(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function prepare(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    try {
      draft.current = Object.fromEntries(fd);
      const phone = bookingPhone(String(fd.get("phone") ?? ""));
      if (!phone) throw new Error(bookingPhoneMessage);
      const preferredStart = lagosAppointment(
        String(fd.get("date")) + "T" + String(fd.get("time")),
      );
      if (Date.parse(preferredStart) <= Date.now())
        throw new Error("Choose a preferred time in the future.");
      const search = new URLSearchParams(window.location.search);
      draft.current = Object.fromEntries(fd);
      setReview({
        serviceId: service.id,
        branchId: service.branch_id,
        serviceVersion: service.version,
        preferredStart,
        address: {
          street: String(fd.get("street")).trim(),
          zone: String(fd.get("zone")),
          phone,
        },
        equipment: {
          type: String(fd.get("type")),
          concerns: String(fd.get("concerns")).trim(),
          brand: String(fd.get("brand") ?? ""),
          burners: Number(fd.get("burners") ?? 0),
          newEquipment: fd.has("newEquipment"),
          supplyPresent: fd.has("supplyPresent"),
        },
        notes: "",
        idempotencyKey: key.current,
        ...(search.get("followup")
          ? { followupId: search.get("followup") }
          : {}),
        ...(search.get("recommendation")
          ? { recommendationId: search.get("recommendation") }
          : {}),
      });
    } catch (e: any) {
      setError(e.message);
    }
  }
  async function submit() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      try {
        sessionStorage.setItem(storage, key.current);
      } catch {}
      const r = await serviceMutation("booking.create", review);
      setReceipt(r);
      setDirty(false);
      onCreated(r);
      try {
        sessionStorage.removeItem(storage);
      } catch {}
    } catch (e: any) {
      setError(e.message);
      setUncertain(true);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <Modal
      title={
        receipt
          ? "Booking request received"
          : review
            ? "Review your request"
            : "Book a service"
      }
      className="service-request-overlay"
      onClose={onClose}
    >
      <div ref={content}>
        {error && <Notice type="error" message={error} />}
        {receipt ? (
          <div className="sr-success">
            <span>
              <Check size={25} />
            </span>
            <h3>We’ll take it from here</h3>
            <p>
              Your request <strong>{receipt.reference}</strong> is awaiting
              confirmation. EasyGas will arrange a provider and confirm the
              visit time.
            </p>
            <button className="button" onClick={() => onView(receipt)}>
              View my booking
              <ArrowRight size={16} />
            </button>
          </div>
        ) : recovering ? (
          <p role="status">Preparing your booking…</p>
        ) : uncertain ? (
          <div className="sr-recovery">
            <p>
              Check whether your request was saved before making any changes.
              This prevents duplicate bookings.
            </p>
            <button className="button" disabled={busy} onClick={recover}>
              {busy ? "Checking…" : "Check request status"}
            </button>
          </div>
        ) : review ? (
          <div className="sr-review" data-unsaved={dirty ? "true" : undefined}>
            <div className="sr-service">
              <CalendarDays size={20} />
              <div>
                <strong>{service.name}</strong>
                <small>
                  {servicePrice(service.config)}
                  {service.config.calloutKobo > 0
                    ? ` + ${serviceMoney(service.config.calloutKobo)} call-out`
                    : ""}
                </small>
              </div>
            </div>
            <dl>
              <div>
                <dt>Preferred visit</dt>
                <dd>
                  {new Date(review.preferredStart).toLocaleString("en-NG", {
                    timeZone: "Africa/Lagos",
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}{" "}
                  · Lagos time
                </dd>
              </div>
              <div>
                <dt>Address</dt>
                <dd>
                  {review.address.street}
                  {review.address.street
                    .toLowerCase()
                    .endsWith(review.address.zone.toLowerCase())
                    ? ""
                    : ", " + review.address.zone}
                </dd>
              </div>
              <div>
                <dt>Contact phone</dt>
                <dd>{review.address.phone}</dd>
              </div>
              <div>
                <dt>Equipment</dt>
                <dd>
                  {review.equipment.type} · {review.equipment.concerns}
                </dd>
              </div>
            </dl>
            <p className="sr-note">
              Your preferred time is a request. We’ll confirm scheduling and
              provider arrangements before the visit. No payment is collected
              with this request.
            </p>
            <div className="sr-footer">
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => setReview(null)}
              >
                <ChevronLeft size={16} />
                Edit details
              </button>
              <button className="button" disabled={busy} onClick={submit}>
                {busy ? "Submitting…" : "Submit booking request"}
              </button>
            </div>
          </div>
        ) : (
          <form
            className="sr-form"
            onSubmit={prepare}
            data-unsaved={dirty ? "true" : undefined}
            onChange={() => setDirty(true)}
          >
            <div className="sr-service">
              <CalendarDays size={20} />
              <div>
                <strong>{service.name}</strong>
                <small>
                  {servicePrice(service.config)}
                  {service.config.calloutKobo > 0
                    ? ` + ${serviceMoney(service.config.calloutKobo)} call-out`
                    : ""}{" "}
                  · {service.config.durationMinutes} min
                </small>
              </div>
            </div>
            <p className="sr-intro">
              Tell us what you need and when suits you. EasyGas will confirm
              your appointment.
            </p>
            <div className="sr-grid">
              <label>
                Preferred date
                <input
                  name="date"
                  type="date"
                  required
                  min={today}
                  max={maxDay}
                  defaultValue={draft.current.date ?? ""}
                />
              </label>
              <label>
                Preferred time (Lagos)
                <select
                  name="time"
                  required
                  defaultValue={draft.current.time ?? ""}
                >
                  <option value="" disabled>
                    Choose a time
                  </option>
                  {Array.from({ length: 10 }, (_, i) => i + 8).map((h) => (
                    <option value={String(h).padStart(2, "0") + ":00"} key={h}>
                      {String(h).padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {addresses.length > 0 && (
              <label>
                Saved address
                <select
                  aria-label="Saved service address"
                  value={addressKey}
                  onChange={(e) => {
                    draft.current = {
                      ...draft.current,
                      street: undefined,
                      zone: undefined,
                      phone: undefined,
                    };
                    setAddressKey(e.target.value);
                  }}
                >
                  <option value="">Enter another address</option>
                  {addresses.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label} · {a.zone}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div key={addressKey} className="sr-address">
              <label>
                Service address
                <textarea
                  name="street"
                  required
                  minLength={8}
                  maxLength={250}
                  defaultValue={draft.current.street ?? address?.street ?? ""}
                  autoComplete="street-address"
                />
              </label>
              <div className="sr-grid">
                <label>
                  Service area
                  <select
                    name="zone"
                    required
                    defaultValue={draft.current.zone ?? address?.zone ?? ""}
                  >
                    <option value="" disabled>
                      Choose an area
                    </option>
                    {service.config.zones.map((z: string) => (
                      <option key={z}>{z}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Contact phone
                  <input
                    name="phone"
                    type="tel"
                    required
                    autoComplete="tel"
                    defaultValue={draft.current.phone ?? address?.phone ?? ""}
                    placeholder="08012345678"
                    maxLength={20}
                  />
                </label>
              </div>
            </div>
            <label>
              Equipment
              <input
                name="type"
                defaultValue={draft.current.type ?? ""}
                required
                minLength={2}
                maxLength={100}
                placeholder="e.g. Four-burner gas cooker"
              />
            </label>
            <label>
              How can we help?
              <textarea
                name="concerns"
                defaultValue={draft.current.concerns ?? ""}
                required
                minLength={5}
                maxLength={2000}
                placeholder="Describe the installation, maintenance or issue."
              />
            </label>
            <details className="sr-optional">
              <summary>Additional equipment details (optional)</summary>
              <div className="sr-grid">
                <label>
                  Brand
                  <input
                    name="brand"
                    defaultValue={draft.current.brand ?? ""}
                    maxLength={100}
                  />
                </label>
                <label>
                  Number of burners
                  <input
                    name="burners"
                    type="number"
                    min={0}
                    max={20}
                    defaultValue={draft.current.burners ?? 0}
                  />
                </label>
              </div>
              <label className="sr-check">
                <input
                  name="newEquipment"
                  defaultChecked={!!draft.current.newEquipment}
                  type="checkbox"
                />
                This is new equipment
              </label>
              <label className="sr-check">
                <input
                  name="supplyPresent"
                  defaultChecked={!!draft.current.supplyPresent}
                  type="checkbox"
                />
                Gas supply is present
              </label>
            </details>
            <div className="sr-footer">
              <span>Scheduling is confirmed by EasyGas.</span>
              <button className="button">
                Review request
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}

export function CustomerServiceCatalogue({
  catalogue,
  customerId,
}: {
  catalogue: any[];
  customerId?: string;
}) {
  return (
    <div className="customer-service-catalogue">
      <header>
        <div>
          <span className="eyebrow">PROFESSIONAL SERVICES</span>
          <h1>Care for your kitchen</h1>
          <p>Installation, servicing and safety checks, arranged around you.</p>
        </div>
        <a className="button secondary" href="/bookings">
          My bookings
          <ArrowRight size={15} />
        </a>
      </header>
      <div className="csc-grid">
        {catalogue.map((s) => (
          <article key={s.id}>
            <span className="csc-icon">
              <CalendarDays size={23} />
            </span>
            <h2>
              <a href={"/services/" + s.id}>{s.name}</a>
            </h2>
            <p>{s.config.description}</p>
            <div className="csc-price">
              <strong>{servicePrice(s.config)}</strong>
              <span>{s.config.durationMinutes} min</span>
            </div>
            <div className="csc-actions">
              <a href={"/services/" + s.id}>
                View details
                <ArrowRight size={14} />
              </a>
              {customerId ? (
                <ServiceRequestLauncher
                  service={s}
                  customerId={customerId}
                  done={() => {}}
                />
              ) : (
                <a
                  className="button"
                  href={
                    "/login?returnTo=" + encodeURIComponent("/services/" + s.id)
                  }
                >
                  Book service
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
      {!catalogue.length && (
        <p className="sr-note">
          No services are currently listed. Contact EasyGas for help with a
          service request.
        </p>
      )}
      <p className="csc-note">
        Send your preferred visit time. We’ll arrange a provider and confirm
        your appointment.
      </p>
    </div>
  );
}
