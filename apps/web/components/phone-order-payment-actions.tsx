"use client";
import { useState } from "react";
import { api, Notice } from "./ui";
import { phonePaymentShareLinks } from "../../../packages/business-rules/src/phone-payment-share";
export default function PhoneOrderPaymentActions({
  orderId,
  initialLink,
  onSaved,
}: {
  orderId: string;
  initialLink?: any;
  onSaved?: () => void;
}) {
  const [link, setLink] = useState<any>(initialLink ?? null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [shareConsent, setShareConsent] = useState(false);
  const shareLinks = link ? phonePaymentShareLinks(link) : null;
  async function act(action: string, input: any = {}) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await api(action, { orderId, ...input });
      if (r.url) setLink(r);
      if (r.revoked) {
        setLink(null);
        setMessage("Private payment link revoked.");
      } else if (r.message) setMessage(r.message);
      onSaved?.();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="panel stack"
      data-submit-pending={busy ? "true" : undefined}
    >
      <h3>Share the payment link</h3>
      <p>
        The customer confirms their basic profile and address, then pays. The
        order is confirmed only after provider verification. Every phone order
        requires payment before dispatch.
      </p>
      {error && <Notice type="error" message={error} />}{" "}
      {message && <Notice message={message} />}
      {!link ? (
        <button
          type="button"
          className="button"
          disabled={busy}
          onClick={() => act("order.phone.payment.create")}
        >
          {busy ? "Checking…" : "Generate payment link"}
        </button>
      ) : (
        <>
          <label>
            Private customer payment link
            <input
              readOnly
              value={link.url}
              onFocus={(e) => e.currentTarget.select()}
            />
          </label>
          <p>
            Keep this link private. Expires{" "}
            {new Date(link.expiresAt).toLocaleString()}.
          </p>
          {shareLinks && (shareLinks.whatsapp || shareLinks.email) && (
            <>
              <label>
                <input
                  type="checkbox"
                  checked={shareConsent}
                  onChange={(e) => setShareConsent(e.target.checked)}
                />{" "}
                The customer asked to receive this order’s payment link.
              </label>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {shareLinks.whatsapp && (
                  <button
                    type="button"
                    className="button"
                    disabled={busy || !shareConsent}
                    onClick={() =>
                      window.open(
                        shareLinks.whatsapp!,
                        "_blank",
                        "noopener,noreferrer",
                      )
                    }
                  >
                    Open WhatsApp
                  </button>
                )}
                {shareLinks.email && (
                  <button
                    type="button"
                    className="button secondary"
                    disabled={busy || !shareConsent}
                    onClick={() => {
                      window.location.href = shareLinks.email!;
                    }}
                  >
                    Open email draft
                  </button>
                )}
              </div>
              <p>
                Opens your messaging app with the link. Review and send it
                there.
              </p>
            </>
          )}
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link.url);
                setMessage("Private link copied.");
              } catch {
                setError("Select and copy the private link above.");
              }
            }}
          >
            Copy payment link
          </button>
          <details>
            <summary>Send with the configured messaging service</summary>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void act("order.phone.payment.send", {
                  channel: f.get("channel"),
                  consent: f.get("consent") === "on",
                });
              }}
            >
              <fieldset disabled={busy}>
                <label>
                  Send by
                  <select name="channel" required>
                    <option value="email">Email</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </label>
                <label>
                  <input name="consent" type="checkbox" required /> The customer
                  requested this transactional order/payment message.
                </label>
                <button className="button">
                  {busy ? "Queuing…" : "Send payment link"}
                </button>
              </fieldset>
            </form>
          </details>
          <button
            type="button"
            className="text-link"
            disabled={busy}
            onClick={() => act("order.phone.payment.revoke")}
          >
            Revoke this private link
          </button>
        </>
      )}
    </section>
  );
}
