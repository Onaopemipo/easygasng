"use client";
import { isDoorstepRefillOrder } from "../../../packages/business-rules/src/refill-workflow";
import React from "react";
import { FieldCaption } from "./field-caption";
import { Notice } from "./ui";
import styles from "./driver-trip-controls.module.css";

export function lpgReadiness(order: any, bulk: any) {
  const gas =
    (order?.gas_lines?.length ?? order?.manifest?.gas?.length ?? 0) > 0;
  const required = gas && bulk?.required;
  const load = bulk?.loads?.find((l: any) =>
    l.allocations.some((a: any) => a.order_id === order?.id),
  );
  const allocation = load?.allocations.find(
    (a: any) => a.order_id === order?.id,
  );
  const active = load?.state === "active" && Boolean(load.acknowledged_by);
  return {
    required,
    load,
    allocation,
    pickupReady: !required || (active && allocation?.state === "allocated"),
    handoverReady:
      !required ||
      (active &&
        allocation?.state === "dispensed" &&
        Number(allocation.dispensed_grams) === Number(allocation.grams)),
  };
}
export default function DriverLPGControls({
  bulk,
  order,
  disabled,
  write,
}: {
  bulk: any;
  order?: any;
  disabled: boolean;
  write: (action: string, input: Record<string, unknown>) => Promise<void>;
}) {
  const ready = order ? lpgReadiness(order, bulk) : null;
  const load =
    ready?.load ??
    (!order ? bulk?.loads?.find((l: any) => l.state !== "reconciled") : null);
  if (order && !ready?.required) return null;
  if (!order && !load) return null;
  function submit(e: React.FormEvent<HTMLFormElement>, action: string) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (action === "bulk.dispense" && form.get("supplied") !== "on") return;
    void write(action, {
      loadId: load.id,
      version: Number(load.version),
      reason: action === "bulk.dispense" ? "Driver explicitly confirmed full allocated supply and recorded the observed cumulative meter reading" : String(form.get("reason")),
      ...(action === "bulk.collection.record"
        ? {
            orderId: order.id,
            amountKobo: Math.round(Number(form.get("cash")) * 100),
          }
        : action === "bulk.dispense"
          ? { orderId: order.id, meterReadingGrams: Number(form.get("meter")) }
          : action === "bulk.load.acknowledge"
            ? {
                returnGrams: Number(form.get("mass")),
                meterReadingGrams: Number(form.get("meter")),
              }
            : { returnGrams: Number(form.get("mass")) }),
    });
  }
  return (
    <section className={styles.panel} aria-label="Vehicle LPG custody">
      <h3>Vehicle LPG</h3>
      {order && (
        <p>
          Fill the customer's cylinder at their address with the ordered gas
          amount. No customer-cylinder serial registration is required. Record
          the quantity supplied, then take the refill photo.
        </p>
      )}

      {!load ? (
        <Notice
          type="error"
          message="Dispatch must issue a measured vehicle load for this order. If you have already departed, ask authorised staff to use Recover missing LPG custody. Do not complete handover or invent meter readings."
        />
      ) : (
        <>
          <p>
            {load.label} · {Number(load.loaded_grams) / 1000} kg loaded ·{" "}
            {String(load.state).replaceAll("_", " ")}
          </p>
          <p>
            Recorded cumulative meter:{" "}
            {Number(load.meter_reading_grams).toLocaleString()} g. Enter your
            actual observed measurements below.
          </p>
          {!bulk.enabled && (
            <Notice message="LPG operations are unavailable. Contact dispatch; custody history is retained." />
          )}
          {load.state === "issued" && (
            <form
              onSubmit={(e) => submit(e, "bulk.load.acknowledge")}
              className={styles.panel}
            >
              <h4>Acknowledge measured load</h4>
              <fieldset
                disabled={disabled || !bulk.enabled}
                className={styles.panel}
              >
                <label>
                  <FieldCaption required>Observed loaded mass (g)</FieldCaption>
                  <input name="mass" type="number" min="1" step="1" required />
                </label>
                <label>
                  <FieldCaption required>
                    Observed cumulative meter (g)
                  </FieldCaption>
                  <input name="meter" type="number" min="0" step="1" required />
                </label>
                <label>
                  <FieldCaption required>Measurement evidence</FieldCaption>
                  <textarea
                    name="reason"
                    minLength={10}
                    maxLength={500}
                    required
                  />
                </label>
                <label data-field-type="checkbox">
                  <input type="checkbox" required />
                  <span>
                    I independently checked the vehicle load and meter readings.
                  </span>
                </label>
                <button className="button">Acknowledge LPG custody</button>
              </fieldset>
            </form>
          )}
          {order && ready?.allocation && (
            <p>
              Order allocation: {Number(ready.allocation.grams) / 1000} kg ·{" "}
              {ready.allocation.state}.
            </p>
          )}
          {order &&
            !isDoorstepRefillOrder(order) &&
            order.payment_method === "cash_on_delivery" &&
            order.payment_status !== "verified" &&
            load.state === "active" &&
            order.attempt?.state === "arrived" && (
              <details>
                <summary>Record cash actually collected</summary>
                <form
                  className={styles.panel}
                  onSubmit={(e) => submit(e, "bulk.collection.record")}
                >
                  <p>
                    Record actual collection only. Finance reconciles it
                    independently after delivery. Do not collect again if a
                    payment is already recorded or under review.
                  </p>
                  <fieldset
                    disabled={disabled || !bulk.enabled}
                    className={styles.panel}
                  >
                    <label>
                      <FieldCaption required>
                        Cash physically collected (₦)
                      </FieldCaption>
                      <input
                        name="cash"
                        type="number"
                        min="0.01"
                        step="0.01"
                        required
                      />
                    </label>
                    <label>
                      <FieldCaption required>Collection evidence</FieldCaption>
                      <textarea
                        name="reason"
                        minLength={10}
                        maxLength={500}
                        required
                      />
                    </label>
                    <button className="button secondary">
                      Record collection for finance review
                    </button>
                  </fieldset>
                </form>
              </details>
            )}
          {order &&
            load.state === "active" &&
            ready?.allocation?.state === "allocated" &&
            (order.attempt?.state === "arrived" ? (
              <form
                onSubmit={(e) => submit(e, "bulk.dispense")}
                className={styles.panel}
              >
                <h4>Record metered dispensing</h4>
                <p>
                  Record the actual cumulative mass reading after dispensing
                  this order. The difference must equal its authorised
                  allocation. The approved payment policy and current meter
                  calibration are checked on save.
                </p>
                <fieldset
                  disabled={disabled || !bulk.enabled}
                  className={styles.panel}
                >
                  <label>
                    <FieldCaption required>
                      New cumulative meter reading (g)
                    </FieldCaption>
                    <input
                      name="meter"
                      type="number"
                      min={Number(load.meter_reading_grams) + 1}
                      step="1"
                      required
                    />
                  </label>
                  <label data-field-type="checkbox">
                    <input type="checkbox" name="supplied" required />
                    <span>
                      I physically dispensed the full ordered gas quantity at
                      the customer’s address.
                    </span>
                  </label>
                  <button className="button">Save metered dispensing</button>
                </fieldset>
              </form>
            ) : (
              <p>Record arrival before metered dispensing.</p>
            ))}
          {order && ready?.handoverReady && (
            <Notice message="The full allocated LPG quantity is recorded as dispensed. Continue with proof and customer handover below." />
          )}
          {!order && ["issued", "active"].includes(load.state) && (
            <details>
              <summary>Declare measured LPG return</summary>
              <form
                onSubmit={(e) => submit(e, "bulk.return.declare")}
                className={styles.panel}
              >
                <p>
                  At the depot, measure the remaining load. Authorised staff
                  must independently receive and reconcile it before the trip
                  can close.
                </p>
                <fieldset
                  disabled={disabled || !bulk.enabled}
                  className={styles.panel}
                >
                  <label>
                    <FieldCaption required>
                      Measured remaining mass (g)
                    </FieldCaption>
                    <input
                      name="mass"
                      type="number"
                      min="0"
                      step="1"
                      required
                    />
                  </label>
                  <label>
                    <FieldCaption required>Return evidence</FieldCaption>
                    <textarea
                      name="reason"
                      minLength={10}
                      maxLength={500}
                      required
                    />
                  </label>
                  <button className="button secondary">
                    Declare LPG return
                  </button>
                </fieldset>
              </form>
            </details>
          )}
          {!order && ["returning", "held"].includes(load.state) && (
            <p>
              Awaiting independent depot receipt and stock reconciliation.
              Contact dispatch before ending your trip.
            </p>
          )}
        </>
      )}
    </section>
  );
}
