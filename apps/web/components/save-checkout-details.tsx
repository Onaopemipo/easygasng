"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { CheckoutDetailsOffer } from "../../../packages/business-rules/src/checkout-delivery";
import { api, Notice } from "./ui";

export function SaveCheckoutDetails({ orderId }: { orderId: string }) {
  const [offer, setOffer] = useState<CheckoutDetailsOffer>();
  const [status, setStatus] = useState<"ready" | "saving" | "saved" | "skipped">("ready");
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    api("account.checkout-details", { orderId }, { signal: controller.signal })
      .then((details: CheckoutDetailsOffer) => {
        if (!controller.signal.aborted) setOffer(details);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [orderId]);
  if ((!offer?.phone && !offer?.address) || status === "skipped") return null;
  if (status === "saved") return <p role="status">Your delivery details were saved for future orders.</p>;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!offer || status === "saving") return;
    const values = new FormData(event.currentTarget);
    const phone = values.has("savePhone");
    const address = values.has("saveAddress");
    if (!phone && !address) {
      setError("Choose what you’d like to save, or select Use for this order only.");
      return;
    }
    setStatus("saving");
    setError("");
    try {
      await api("account.checkout-details", { orderId, save: { phone, address, version: offer.version } });
      setStatus("saved");
    } catch (error) {
      setStatus("ready");
      setError(error instanceof Error ? error.message : "We couldn’t save your delivery details. Please try again.");
    }
  }

  return (
    <form className="surface checkout-form" onSubmit={submit}>
      <h2>Save delivery details for next time?</h2>
      {offer.phone && <label>
        <input type="checkbox" name="savePhone" disabled={status === "saving"} />
        <span>Use {offer.phone} as my delivery phone number</span>
      </label>}
      {offer.address && <label>
        <input type="checkbox" name="saveAddress" disabled={status === "saving"} />
        <span>Save {offer.address.street}, {offer.address.zone} for {offer.address.recipient}</span>
      </label>}
      {offer.address && <p className="muted">A saved address includes its recipient and contact number.</p>}
      {error && <Notice type="error" message={error} />}
      <div className="button-row">
        <button className="button" disabled={status === "saving"}>{status === "saving" ? "Saving…" : "Save selected details"}</button>
        <button type="button" className="button secondary" disabled={status === "saving"} onClick={() => setStatus("skipped")}>
          Use for this order only
        </button>
      </div>
    </form>
  );
}
