"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { FieldCaption } from "./field-caption";
import { api, Loading, Notice } from "./ui";
import { driverDate } from "../../../packages/business-rules/src/driver-experience";
import styles from "./driver-trip-controls.module.css";

type TripState = {
  trip: {
    id: string;
    vehicle_id: string;
    start_odometer: string | number;
    started_at: string;
    location_consent: boolean;
  } | null;
  vehicles: { id: string; label: string }[];
};

export default function DriverTripControls({
  disabled,
  onDone,
  onBusy,
}: {
  disabled: boolean;
  onDone: () => Promise<void>;
  onBusy: (busy: boolean) => void;
}) {
  const [data, setData] = useState<TripState | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const request = useRef<AbortController | null>(null);
  const writing = useRef(false);
  const pending = useRef<{ signature: string; key: string } | null>(null);
  const load = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setConfirmed(false);
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const result = await api("driver.location", undefined, {
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        setData(result);
        setConfirmed(true);
      }
    } catch (e: any) {
      if (request.current !== controller) return;
      setError(
        controller.signal.aborted
          ? "Trip status timed out. Refresh before making updates."
          : e.message,
      );
      if ([401, 403].includes(e.status)) setData(null);
    } finally {
      clearTimeout(timeout);
    }
  }, []);

  useEffect(() => {
    void load();
    const reconnect = () => {
      if (!writing.current) {
        setError("");
        void load();
      }
    };
    const offline = () => setConfirmed(false);
    window.addEventListener("online", reconnect);
    window.addEventListener("offline", offline);
    return () => {
      request.current?.abort();
      window.removeEventListener("online", reconnect);
      window.removeEventListener("offline", offline);
    };
  }, [load]);

  async function write(action: string, input: Record<string, unknown>) {
    if (writing.current || disabled || !confirmed) return;
    writing.current = true;
    setBusy(true);
    onBusy(true);
    setError("");
    setMessage("");
    const signature = action + JSON.stringify(input);
    if (pending.current?.signature !== signature)
      pending.current = { signature, key: crypto.randomUUID() };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      await api(
        action,
        { ...input, operationKey: pending.current.key },
        { signal: controller.signal },
      );
      pending.current = null;
      setMessage(
        action === "trip.start"
          ? "Trip started. Dispatch can now check this vehicle when assigning work."
          : action === "trip.end"
            ? "Trip ended."
            : "Location consent revoked for this trip.",
      );
    } catch (e: any) {
      setError(
        controller.signal.aborted
          ? "The update was not confirmed. Refresh trip status before retrying; do not assume it failed."
          : e.message,
      );
    } finally {
      clearTimeout(timeout);
      await Promise.all([load(), onDone()]);
      writing.current = false;
      setBusy(false);
      onBusy(false);
    }
  }
  function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    void write("trip.start", {
      vehicleId: String(values.get("vehicleId")),
      startOdometer: Number(values.get("startOdometer")),
      locationConsent: values.get("locationConsent") === "on",
    });
  }
  const blocked = disabled || busy || !confirmed;
  const trip = data?.trip;
  return (
    <div className={styles.panel}>
      <p>
        {trip
          ? "Review your current duty trip and close it when your work is complete."
          : "Start a duty trip so dispatch can assign work. Select your vehicle and enter its current odometer reading."}
      </p>
      <p className={styles.caption}>
        This page does not record GPS. Location consent is optional and does not
        grant device permission.
      </p>
      {error && <Notice type="error" message={error} />}
      {message && <Notice message={message} />}
      {!confirmed && (
        <Notice message="Trip status is unconfirmed. Reconnect and refresh before making changes." />
      )}
      <button
        type="button"
        className="button secondary"
        disabled={busy}
        onClick={() => {
          setError("");
          void load();
          void onDone();
        }}
      >
        Refresh trip status
      </button>
      {!data ? (
        !error && <Loading />
      ) : trip ? (
        <>
          <dl className={styles.details}>
            <div>
              <dt>Status</dt>
              <dd>{confirmed && !disabled ? "Active trip" : "Unconfirmed"}</dd>
            </div>
            <div>
              <dt>Vehicle</dt>
              <dd>
                {data.vehicles.find((v) => v.id === trip.vehicle_id)?.label ??
                  "Vehicle unavailable — contact dispatch"}
              </dd>
            </div>
            <div>
              <dt>Started</dt>
              <dd>{driverDate(trip.started_at)} WAT</dd>
            </div>
            <div>
              <dt>Start odometer</dt>
              <dd>{trip.start_odometer} km</dd>
            </div>
            <div>
              <dt>Location consent</dt>
              <dd>
                {trip.location_consent
                  ? "Granted for this trip"
                  : "Off for this trip"}
              </dd>
            </div>
          </dl>
          {trip.location_consent && (
            <button
              type="button"
              className="button secondary"
              disabled={blocked}
              onClick={() =>
                void write("trip.location.revoke", { tripId: trip.id })
              }
            >
              Revoke trip location consent
            </button>
          )}
          <form
            className={styles.panel}
            onSubmit={(event) => {
              event.preventDefault();
              const values = new FormData(event.currentTarget);
              void write("trip.end", {
                tripId: trip.id,
                endOdometer: Number(values.get("endOdometer")),
              });
            }}
          >
            <p>
              End your trip after delivery custody and any vehicle stock or LPG
              returns are reconciled. The server checks these records before
              closing it.
            </p>
            <fieldset disabled={blocked} className={styles.panel}>
              <label>
                <FieldCaption required>End odometer (km)</FieldCaption>
                <input
                  name="endOdometer"
                  type="number"
                  min={Number(trip.start_odometer)}
                  max="10000000"
                  step="any"
                  required
                />
              </label>
              <button className="button">
                {busy ? "Saving…" : "End trip"}
              </button>
            </fieldset>
          </form>
        </>
      ) : data.vehicles.length ? (
        <form className={styles.panel} onSubmit={start}>
          <fieldset disabled={blocked} className={styles.panel}>
            <label>
              <FieldCaption required>Vehicle</FieldCaption>
              <select name="vehicleId" required defaultValue="">
                <option value="" disabled>
                  Choose a vehicle
                </option>
                {data.vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <FieldCaption required>Start odometer (km)</FieldCaption>
              <input
                name="startOdometer"
                type="number"
                min="0"
                max="10000000"
                step="any"
                required
              />
            </label>
            <label data-field-type="checkbox">
              <input name="locationConsent" type="checkbox" />
              <span>Allow location capture for this trip (optional)</span>
            </label>
            <button className="button">
              {busy ? "Saving…" : "Start trip"}
            </button>
          </fieldset>
        </form>
      ) : (
        <p>
          No active LPG-suitable vehicle is available in your branch. Ask the
          business owner to register or review a suitable vehicle.
        </p>
      )}
    </div>
  );
}
