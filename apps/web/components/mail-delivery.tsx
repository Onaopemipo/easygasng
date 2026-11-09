"use client";
import { useEffect, useState } from "react";
import { api, Loading, Notice } from "./ui";
export function MailDeliveryControls() {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    setError("");
    api("mail.status")
      .then((r) => {
        if (active) setData(r);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [revision]);
  return (
    <section className="surface workflow-form">
      <h2>Transactional email delivery</h2>
      <p>
        SMTP acceptance does not prove inbox delivery. Unknown outcomes require
        review before retry. Verify your password in your profile before a
        sensitive action.
      </p>
      {error && <Notice type="error" message={error} />}
      <button
        className="button secondary"
        onClick={() => setRevision((r) => r + 1)}
        disabled={busy}
      >
        Refresh delivery status
      </button>
      {!data ? (
        !error && <Loading />
      ) : (
        <>
          <p>
            {data.enabled
              ? "SMTP enabled. Verify delivery with your configured provider."
              : "SMTP disabled. No external email is sent."}
          </p>
          {!data.messages.length && <p>No queued email messages.</p>}
          {data.messages.map((m: any) => (
            <article key={m.id} className="surface workflow-form">
              <p>
                Message {m.id} ·{" "}
                {m.status === "sent" ? "Accepted by SMTP" : m.status} ·{" "}
                {m.attempts} attempts
              </p>
              <p>{new Date(m.created_at).toLocaleString()}</p>
              {m.delivery_status === "sending" && (
                <>
                  <p>
                    Send in progress or awaiting reconciliation. Do not retry
                    while the original worker may still be running.
                  </p>
                  {m.lease_until && Date.parse(m.lease_until) <= Date.now() && (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const values = new FormData(e.currentTarget);
                        setBusy(true);
                        setError("");
                        try {
                          await api("mail.reconcile", {
                            id: m.id,
                            reason: values.get("reason"),
                            workerStopped: values.get("stopped") === "on",
                            providerOutcome: values.get("outcome"),
                          });
                          setRevision((r) => r + 1);
                        } catch (error: any) {
                          setError(error.message);
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      <label>
                        Provider outcome
                        <select name="outcome">
                          <option value="unknown">
                            Unknown — keep under review
                          </option>
                          <option value="accepted">
                            Provider confirmed acceptance
                          </option>
                          <option value="not_accepted">
                            Provider confirmed no acceptance
                          </option>
                        </select>
                      </label>
                      <label>
                        Provider investigation evidence
                        <textarea
                          name="reason"
                          minLength={20}
                          maxLength={1000}
                          required
                        />
                      </label>
                      <label>
                        <input type="checkbox" name="stopped" required /> I
                        stopped the original sending worker and checked the
                        provider record.
                      </label>
                      <button className="button secondary" disabled={busy}>
                        Record reconciliation
                      </button>
                    </form>
                  )}
                </>
              )}
              {m.status === "failed" &&
                m.delivery_status !== "sending" &&
                !m.lease_until &&
                m.attempts < 5 && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const values = new FormData(form);
                      setBusy(true);
                      setError("");
                      try {
                        await api("mail.retry", {
                          id: m.id,
                          reason: values.get("reason"),
                          acknowledgePossibleDuplicate:
                            values.get("ack") === "on",
                        });
                        setRevision((r) => r + 1);
                      } catch (e: any) {
                        setError(e.message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <label>
                      Review reason
                      <textarea
                        name="reason"
                        minLength={10}
                        maxLength={1000}
                        required
                      />
                    </label>
                    <label>
                      <input type="checkbox" name="ack" required /> I checked
                      the provider outcome and understand that retrying may send
                      a duplicate.
                    </label>
                    <button
                      className="button secondary"
                      disabled={busy || !data.enabled}
                    >
                      Authorise retry
                    </button>
                  </form>
                )}
            </article>
          ))}
        </>
      )}
    </section>
  );
}
