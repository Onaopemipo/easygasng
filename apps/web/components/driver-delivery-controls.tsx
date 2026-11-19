"use client";
import { useRef, useState, type FormEvent } from "react";
import { FieldCaption } from "./field-caption";
import { Notice } from "./ui";
import { deliveryFailureReasons } from "../../../packages/business-rules/src/order-tracking";
import styles from "./driver-trip-controls.module.css";

export default function DriverDeliveryControls({
  order,
  decision,
  disabled,
  write,
  refresh,
  lpg,
}: {
  lpg?: { pickupReady: boolean; handoverReady: boolean };
  order: any;
  decision?: string;
  disabled: boolean;
  write: (action: string, input: Record<string, unknown>) => Promise<void>;
  refresh: () => Promise<void>;
}) {
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoMessage, setPhotoMessage] = useState("");
  const uploading = useRef(false);
  const blocked = disabled || photoBusy;
  const context = { orderId: order.id, version: order.tracking_version };
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (blocked || uploading.current) return;
    const form = new FormData(event.currentTarget);
    const file = form.get("image");
    if (
      !(file instanceof File) ||
      file.size > 4000000 ||
      !["image/png", "image/jpeg", "image/webp"].includes(file.type)
    ) {
      setPhotoError("Choose a PNG, JPEG or WebP photo under 4 MB.");
      return;
    }
    form.set("orderId", order.id);
    uploading.current = true;
    setPhotoBusy(true);
    setPhotoError("");
    setPhotoMessage("");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch("/api/media", {
        method: "POST",
        body: form,
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error ?? "Proof photo upload was not confirmed.",
        );
      setPhotoMessage("Proof photo uploaded for this order.");
      await refresh();
    } catch (e: any) {
      setPhotoError(
        controller.signal.aborted
          ? "Upload was not confirmed. Reconnect and retry the same photo; delivery is not complete."
          : e.message,
      );
    } finally {
      clearTimeout(timeout);
      uploading.current = false;
      setPhotoBusy(false);
    }
  }
  function movement(
    event: FormEvent<HTMLFormElement>,
    action: string,
    extra: Record<string, unknown> = {},
  ) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    void write(action, {
      ...context,
      reason: String(form.get("reason")),
      ...extra,
    });
  }
  return (
    <div className={styles.panel}>
      {order.status === "assigned" &&
        order.attempt?.state === "assigned" &&
        decision === "acknowledged" && (
          <form
            className={styles.panel}
            onSubmit={(event) =>
              movement(event, "delivery.pickup", { manifest: order.manifest })
            }
          >
            <h3>Inspected pickup</h3>
            <ul>
              {(order.manifest?.items ?? []).map((item: any) => (
                <li key={item.product_id}>
                  {item.quantity} ×{" "}
                  {order.items?.find(
                    (row: any) => row.product_id === item.product_id,
                  )?.name ?? item.product_id}
                </li>
              ))}
              {(order.manifest?.gas ?? []).map((line: any) => (
                <li key={line.id}>
                  {Number(line.grams) / 1000} kg gas ·{" "}
                  {Number(line.capacity_grams) / 1000} kg cylinder capacity
                </li>
              ))}
              {(order.manifest?.serials ?? []).map((serial: string) => (
                <li key={serial}>Cylinder serial: {serial}</li>
              ))}
            </ul>
            <fieldset
              disabled={blocked || lpg?.pickupReady === false}
              className={styles.panel}
            >
              <label data-field-type="checkbox">
                <input type="checkbox" required />
                <span>
                  I inspected and received every listed item, gas quantity and
                  cylinder serial.
                </span>
              </label>
              <label>
                <FieldCaption required>Pickup note</FieldCaption>
                <textarea
                  name="reason"
                  required
                  minLength={5}
                  maxLength={500}
                />
              </label>
              <button className="button">Confirm inspected pickup</button>
            </fieldset>
          </form>
        )}
      {order.status === "assigned" && order.attempt?.state === "picked_up" && (
        <button
          type="button"
          className="button"
          disabled={blocked || lpg?.pickupReady === false}
          onClick={() =>
            void write("order.transition", {
              id: order.id,
              version: order.tracking_version,
              status: "out_for_delivery",
              note: "Driver confirms inspected pickup and departure",
            })
          }
        >
          Start delivery
        </button>
      )}
      {order.status === "out_for_delivery" &&
        order.attempt?.state === "picked_up" && (
          <form
            className={styles.panel}
            onSubmit={(event) => movement(event, "delivery.arrived")}
          >
            <fieldset disabled={blocked} className={styles.panel}>
              <label>
                <FieldCaption required>Arrival note</FieldCaption>
                <textarea
                  name="reason"
                  required
                  minLength={5}
                  maxLength={500}
                />
              </label>
              <button className="button">Confirm arrival</button>
            </fieldset>
          </form>
        )}
      {order.status === "out_for_delivery" &&
        order.attempt?.state === "arrived" && (
          <>
            <form className={styles.panel} onSubmit={upload}>
              <h3>Proof of delivery</h3>
              <p>
                Photograph the delivered items with customer consent. Avoid
                faces and home interiors. Uploading proof does not complete
                delivery.
              </p>
              <fieldset disabled={blocked} className={styles.panel}>
                <label>
                  <FieldCaption required>Proof photo</FieldCaption>
                  <input
                    type="file"
                    name="image"
                    accept="image/jpeg,image/png,image/webp"
                    capture="environment"
                    required
                  />
                </label>
                <label>
                  <FieldCaption required>Proof description</FieldCaption>
                  <input name="alt" minLength={3} maxLength={250} required />
                </label>
                <label data-field-type="checkbox">
                  <input name="photoConsent" type="checkbox" required />
                  <span>Customer consented to this evidence photo.</span>
                </label>
                <button className="button secondary">
                  {photoBusy ? "Uploading…" : "Upload proof photo"}
                </button>
              </fieldset>
              {photoError && <Notice type="error" message={photoError} />}
              {photoMessage && <Notice message={photoMessage} />}
            </form>
            {order.payment_status !== "verified" && (
              <Notice message="Payment requires authorised operations review before handover can be completed. Drivers cannot verify or collect payment here." />
            )}
            <form
              className={styles.panel}
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                void write("driver.complete", {
                  ...context,
                  code: String(form.get("code")),
                  handover: form.get("handover") === "on",
                });
              }}
            >
              <h3>Complete handover</h3>
              <p>
                Upload authorised proof, then ask the customer for their
                six-digit code after handing over every item and the full gas
                quantity.
              </p>
              <fieldset
                disabled={
                  blocked ||
                  lpg?.handoverReady === false ||
                  order.payment_status !== "verified"
                }
                className={styles.panel}
              >
                <label>
                  <FieldCaption required>
                    Customer six-digit handover code
                  </FieldCaption>
                  <input
                    name="code"
                    inputMode="numeric"
                    autoComplete="off"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                  />
                </label>
                <label data-field-type="checkbox">
                  <input name="handover" type="checkbox" required />
                  <span>
                    All items and the full gas quantity were physically handed
                    over.
                  </span>
                </label>
                <button className="button">Complete delivery</button>
              </fieldset>
            </form>
          </>
        )}
      {["assigned", "out_for_delivery"].includes(order.status) && (
        <details>
          <summary>Delivery problem or dispatch help</summary>
          <form
            className={styles.panel}
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void write("order.transition", {
                id: order.id,
                version: order.tracking_version,
                status: "delivery_failed",
                failureReason: String(form.get("failureReason")),
                note: String(form.get("reason")),
              });
            }}
          >
            <fieldset disabled={blocked} className={styles.panel}>
              <label>
                <FieldCaption required>Failure category</FieldCaption>
                <select name="failureReason">
                  {deliveryFailureReasons.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <FieldCaption required>Failure note</FieldCaption>
                <textarea
                  name="reason"
                  minLength={5}
                  maxLength={500}
                  required
                />
              </label>
              <button className="button secondary">
                Report failed delivery
              </button>
            </fieldset>
          </form>
          <form
            className={styles.panel}
            onSubmit={(event) => movement(event, "delivery.help")}
          >
            <fieldset disabled={blocked} className={styles.panel}>
              <label>
                <FieldCaption required>Help request</FieldCaption>
                <textarea
                  name="reason"
                  minLength={5}
                  maxLength={500}
                  required
                />
              </label>
              <button className="button secondary">
                Request dispatch help
              </button>
            </fieldset>
          </form>
        </details>
      )}
    </div>
  );
}
