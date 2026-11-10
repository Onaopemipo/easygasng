"use client";
import { useEffect, useState } from "react";
import Link from "./workspace-link";
import { api, Notice, Loading } from "./ui";
export function ServiceFollowups() {
  const [rows, setRows] = useState<any[]>([]),
    [error, setError] = useState(""),
    [version, setVersion] = useState(0),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api("service.followups")
      .then((r) => {
        if (active) setRows(r);
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
  }, [version]);
  return (
    <section className="surface">
      <h2>Service follow-ups</h2>
      {error && (
        <>
          <Notice type="error" message={error} />
          <button
            className="button secondary"
            onClick={() => setVersion((v) => v + 1)}
          >
            Retry follow-ups
          </button>
        </>
      )}{" "}
      {loading ? (
        <Loading />
      ) : (
        !error &&
        !rows.length && (
          <>
            <h3>No follow-ups needed</h3>
            <p>
              Any recommended follow-up from your completed services will appear
              here. No recorded follow-up is not a safety clearance.
            </p>
          </>
        )
      )}
      {rows.map((f) => (
        <article className="quote-card" key={f.id}>
          <h3>
            {f.name} · {new Date(f.due_date).toLocaleDateString()}
          </h3>
          <p>{f.reason}</p>
          {f.dismissed_at ? (
            <p>Dismissed</p>
          ) : f.rebooked_id ? (
            <p>Linked appointment requested</p>
          ) : (
            <>
              <Link
                className="button secondary"
                href={"/services/" + f.service_id + "?followup=" + f.id}
              >
                Review appointments
              </Link>
              <button
                className="button secondary"
                onClick={() =>
                  api("service.followup.dismiss", { id: f.id })
                    .then(() => setVersion((v) => v + 1))
                    .catch((e) => setError(e.message))
                }
              >
                Dismiss reminder
              </button>
            </>
          )}
        </article>
      ))}
    </section>
  );
}
