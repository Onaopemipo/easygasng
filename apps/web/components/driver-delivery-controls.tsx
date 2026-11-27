"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { FieldCaption } from "./field-caption";
import { api, Notice } from "./ui";
import { deliveryFailureReasons } from "../../../packages/business-rules/src/order-tracking";
import styles from "./driver-trip-controls.module.css";
import { isDoorstepRefillOrder } from "../../../packages/business-rules/src/refill-workflow";

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
  const [loadConfirmed, setLoadConfirmed] = useState(false);
  useEffect(() => setLoadConfirmed(false), [order.id, order.tracking_version]);
  const [photoError, setPhotoError] = useState("");
  const [photoMessage, setPhotoMessage] = useState("");
  const [proofReady, setProofReady] = useState(false);
  const [proofChecking, setProofChecking] = useState(false);
  const [proofReadError, setProofReadError] = useState("");
  const [proofRevision, setProofRevision] = useState(0);
  const proofRead = useRef<AbortController | null>(null);
  useEffect(() => {
    setProofReady(false);
    setProofReadError("");
    if (order.attempt?.state !== "arrived") return;
    const controller = new AbortController();
    proofRead.current = controller;
    setProofChecking(true);
    const timeout = setTimeout(() => controller.abort(), 10000);
    let current = true;
    api(
      "delivery.photos?" +
        new URLSearchParams({ orderId: order.id, attemptId: order.attempt.id }),
      undefined,
      { signal: controller.signal },
    )
      .then((result) => {
        if (
          current &&
          proofRead.current === controller &&
          !controller.signal.aborted
        )
          setProofReady(result.photos.some((p:any)=>!order.daily_run || (order.daily_run.supplied_at && new Date(p.captured_at).getTime()>=new Date(order.daily_run.supplied_at).getTime())));
      })
      .catch((e) => {
        if (current && proofRead.current === controller)
          setProofReadError(
            controller.signal.aborted
              ? "Proof check timed out. Retry the check."
              : e.message,
          );
      })
      .finally(() => {
        clearTimeout(timeout);
        if (current && proofRead.current === controller)
          setProofChecking(false);
      });
    return () => {
      current = false;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [order.id, order.attempt?.id, order.attempt?.state, order.daily_run?.supplied_at, proofRevision]);
  const uploading = useRef(false);
  const blocked = disabled || photoBusy;
  const refill = isDoorstepRefillOrder(order);
  const collectCOD =
    refill &&
    order.payment_method === "cash_on_delivery" &&
    order.payment_status !== "verified";
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
      const previousRead = proofRead.current;
      proofRead.current = null;
      previousRead?.abort();
      setProofReadError("");
      setProofChecking(false);
      setProofReady(true);
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
        ["assigned", "picked_up"].includes(order.attempt?.state) &&
        (decision === "acknowledged" ||
          order.attempt?.state === "picked_up") && (
          <form
            className={styles.panel}
            onSubmit={(event) => {
              event.preventDefault();
              if ((!order.daily_run && !loadConfirmed) || blocked || lpg?.pickupReady === false)
                return;
              void write("driver.depart", {
                ...context,
                manifest: order.manifest,
                loadConfirmed: true,
              });
            }}
          >
            <h3>{order.daily_run?"Ready to go":"Load for this delivery"}</h3>
            <ul>
              {(order.manifest?.gas ?? []).map((line: any, index: number) => (
                <li key={index}>{Number(line.grams) / 1000} kg gas</li>
              ))}
              {(order.manifest?.items ?? []).map((item: any) => (
                <li key={item.product_id}>
                  {item.quantity} ×{" "}
                  {order.items?.find(
                    (r: any) => r.product_id === item.product_id,
                  )?.name ?? "Product"}
                </li>
              ))}
              {(!refill || (order.manifest?.items ?? []).length > 0) &&
                (order.manifest?.serials ?? []).map((serial: string) => (
                  <li key={serial}>Cylinder serial: {serial}</li>
                ))}
            </ul>
            <fieldset disabled={blocked || lpg?.pickupReady === false}>
              {!order.daily_run&&<label data-field-type="checkbox">
                <input
                  type="checkbox"
                  checked={loadConfirmed}
                  required
                  onChange={(e) => setLoadConfirmed(e.target.checked)}
                />
                <span>I checked the load for this order.</span>
              </label>}
              <button className="button" disabled={!order.daily_run&&!loadConfirmed}>
                Start delivery
              </button>
            </fieldset>
          </form>
        )}
      {order.status === "out_for_delivery" &&
        order.attempt?.state === "picked_up" && (
          <button
            type="button"
            className="button"
            disabled={blocked}
            onClick={() =>
              void write("delivery.arrived", {
                ...context,
                reason:
                  "Driver explicitly confirmed arrival at the delivery address",
              })
            }
          >
            I’ve arrived
          </button>
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
              <fieldset disabled={blocked||(!!order.daily_run&&!lpg?.handoverReady)} className={styles.panel}>
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
            {order.payment_status !== "verified" && !collectCOD && (
              <Notice message="Payment requires authorised operations review before handover can be completed. Drivers cannot verify or collect payment here." />
            )}
            <form
              className={styles.panel}
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                void write("driver.complete", {
                  ...context,
                  ...(refill ? {} : { code: String(form.get("code")) }),
                  ...(collectCOD
                    ? {
                        collectedKobo:
                          form.get("cashCollected") === "on"
                            ? Number(order.total_kobo)
                            : 0,
                      }
                    : {}),
                  handover: form.get("handover") === "on",
                });
              }}
            >
              <h3>{refill ? "Complete refill" : "Complete handover"}</h3>
              <p>
                {refill
                  ? "Record the supplied gas amount and upload a photo of the completed refill. No customer handover code is needed."
                  : "Upload authorised proof, then ask the customer for their six-digit code after handing over every item and the full gas quantity."}
              </p>
              {proofChecking && (
                <p role="status">Checking current-visit proof…</p>
              )}
              {proofReadError && (
                <>
                  <Notice type="error" message={proofReadError} />
                  <button
                    type="button"
                    className="button secondary"
                    disabled={blocked}
                    onClick={() => setProofRevision((n) => n + 1)}
                  >
                    Retry proof check
                  </button>
                </>
              )}
              <fieldset
                disabled={
                  blocked ||
                  !proofReady ||
                  lpg?.handoverReady === false ||
                  (!collectCOD && order.payment_status !== "verified")
                }
                className={styles.panel}
              >
                {!refill && (
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
                )}
                {collectCOD && (
                  <label data-field-type="checkbox">
                    <input name="cashCollected" type="checkbox" required />
                    <span>
                      I actually collected ₦
                      {(Number(order.total_kobo) / 100).toLocaleString()} in
                      cash for this order. Finance reconciliation remains
                      pending.
                    </span>
                  </label>
                )}
                <label data-field-type="checkbox">
                  <input name="handover" type="checkbox" required />
                  <span>
                    All items and the full gas quantity were physically handed
                    over.
                  </span>
                </label>
                <button className="button">
                  {refill ? "Complete refill" : "Complete delivery"}
                </button>
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
