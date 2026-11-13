"use client";
import { EasyGasLoader } from "./easygas-loader";
import { useEffect, useState, useRef, type FormEvent } from "react";
import { ImageUpload } from "./image-upload";
import { api, Notice, Modal } from "./ui";
import Link from "./workspace-link";
const labels: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_REVIEW: "Pending review",
  APPROVED: "Approved",
  PUBLISHED: "Published",
  REJECTED: "Rejected",
  CHANGES_REQUESTED: "Changes requested",
  HIDDEN: "Hidden",
  WITHDRAWN: "Withdrawn",
};
export function PublicTestimonials({
  initialRows = [],
}: {
  initialRows?: any[];
}) {
  const [rows, setRows] = useState<any[]>(initialRows),
    [index, setIndex] = useState(0),
    [error, setError] = useState("");
  useEffect(() => {
    api("testimonials.public")
      .then(setRows)
      .catch(() => setError("Customer feedback is temporarily unavailable."));
  }, []);
  const visible = rows.slice(index, index + 3);
  return (
    <section className="container testimonial-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">TRUSTED BY HOMES AND BUSINESSES</span>
          <h2>What our customers say</h2>
        </div>
        <div className="testimonial-controls">
          <button
            className="icon-button"
            aria-label="Previous testimonials"
            disabled={index === 0}
            onClick={() => setIndex(Math.max(0, index - 3))}
          >
            ←
          </button>
          <button
            className="icon-button"
            aria-label="Next testimonials"
            disabled={index + 3 >= rows.length}
            onClick={() => setIndex(index + 3)}
          >
            →
          </button>
        </div>
      </div>
      {error ? (
        <Notice message={error} />
      ) : rows.length ? (
        <div className="testimonial-grid">
          {visible.map((r, i) => (
            <figure className="surface" key={index + i}>
              <span className="testimonial-quote" aria-hidden="true">
                “
              </span>
              <blockquote>{r.body}</blockquote>
              <p
                aria-label={`${r.rating} out of 5 stars`}
                className="testimonial-stars"
              >
                {"★".repeat(r.rating)}
                {"☆".repeat(5 - r.rating)}
              </p>
              {r.image_url && (
                <img
                  src={r.image_url}
                  alt={`Photo shared by ${r.display_name}`}
                  loading="lazy"
                  width="64"
                  height="64"
                  className="testimonial-photo"
                />
              )}
              <figcaption>
                <strong>{r.display_name}</strong>
                {r.public_location && <p>{r.public_location}</p>}
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <div className="surface">
          <h3>Have you ordered gas or booked a service?</h3>
          <p>
            Share your experience after a completed purchase or service. We
            publish customer feedback only with permission and after review.
          </p>
          <Link
            className="button secondary"
            href="/account-settings#testimonials"
          >
            Share your experience →
          </Link>
        </div>
      )}
    </section>
  );
}
export function CustomerTestimonials() {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState<any>(null),
    [nameStyle, setNameStyle] = useState("first");
  async function load() {
    try {
      const search = new URLSearchParams(window.location.search),
        q = new URLSearchParams();
      if (search.get("testimonialOrder"))
        q.set("orderId", search.get("testimonialOrder")!);
      if (search.get("testimonialBooking"))
        q.set("bookingId", search.get("testimonialBooking")!);
      setData(await api("testimonials.mine" + (q.size ? "?" + q : "")));
    } catch (e: any) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function act(row: any, status: string) {
    setBusy(true);
    setError("");
    try {
      await api("testimonial.transition", {
        id: row.id,
        revision: row.revision,
        status,
      });
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const content = {
        rating: Number(fd.get("rating")),
        body: String(fd.get("body")),
        nameStyle: String(fd.get("nameStyle")),
        displayName: String(fd.get("displayName") ?? "Customer"),
        consent: fd.get("consent") === "on",
      };
      if (editing)
        await api("testimonial.edit", {
          id: editing.id,
          revision: editing.revision,
          content,
        });
      else {
        const [kind, ...rest] = String(fd.get("transaction")).split(":");
        await api("testimonial.create", {
          [kind === "order" ? "orderId" : "bookingId"]: rest.join(":"),
          content,
        });
      }
      setEditing(null);
      await load();
      (e.target as HTMLFormElement).reset();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section id="testimonials" className="surface">
      <h2>Your testimonials</h2>
      <p>
        The latest 100 submissions are shown here. Your identity-verified
        personal data export below includes the complete version and consent
        history.
      </p>
      <p>
        Your feedback is never public without your consent and moderation. You
        can withdraw publication at any time.
      </p>
      {error && <Notice message={error} />}
      {!data ? (
        <EasyGasLoader size="sm" variant="section" label="Loading your feedback" />
      ) : (
        <>
          <div className="testimonial-grid">
            {data.submissions.map((r: any) => (
              <article className="surface" key={r.id}>
                <strong>
                  {labels[r.status]} · {r.rating}/5
                </strong>
                <p>{r.body}</p>
                <p>Public name: {r.display_name}</p>
                {r.latest_reason && <p>Latest update: {r.latest_reason}</p>}
                {r.image_id && (
                  <img
                    src={`/api/media/${r.image_id}`}
                    alt="Your testimonial photo"
                    width="64"
                    height="64"
                    className="testimonial-photo"
                  />
                )}
                {data.policy.imagesEnabled &&
                  r.status === "DRAFT" &&
                  r.consent && <ImageUpload testimonialId={r.id} done={load} />}

                {!["WITHDRAWN", "REJECTED"].includes(r.status) && (
                  <div className="testimonial-controls">
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() => {
                        setEditing(r);
                        setNameStyle(r.name_style);
                      }}
                    >
                      Edit feedback
                    </button>
                    {["DRAFT", "CHANGES_REQUESTED"].includes(r.status) && (
                      <button
                        className="button"
                        disabled={busy || !r.consent}
                        onClick={() => act(r, "PENDING_REVIEW")}
                      >
                        Submit for review
                      </button>
                    )}
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() => act(r, "WITHDRAWN")}
                    >
                      Withdraw consent
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
          {editing || data.orders.length + data.bookings.length > 0 ? (
            <form
              key={editing?.id ?? "new"}
              onSubmit={save}
              className="testimonial-form"
            >
              <h3>{editing ? "Edit your feedback" : "Share an experience"}</h3>
              {!editing && (
                <label>
                  Completed purchase or service
                  <select
                    name="transaction"
                    required
                    defaultValue={data.selectedTransaction}
                  >
                    <option value="">Choose a completed transaction</option>
                    {data.orders.map((r: any) => (
                      <option key={r.id} value={"order:" + r.id}>
                        Order {r.reference}
                      </option>
                    ))}
                    {data.bookings.map((r: any) => (
                      <option key={r.id} value={"booking:" + r.id}>
                        Service {r.reference}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                Rating
                <select name="rating" defaultValue={editing?.rating ?? 5}>
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n} out of 5
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Your experience
                <textarea
                  name="body"
                  required
                  minLength={data.policy.minimumLength}
                  maxLength={data.policy.maximumLength}
                  defaultValue={editing?.body}
                />
              </label>
              <p>
                Do not include phone numbers, email, links, addresses or private
                details. All ratings are welcome.
              </p>
              <label>
                Public name style
                <select
                  name="nameStyle"
                  value={nameStyle}
                  onChange={(e) => setNameStyle(e.target.value)}
                >
                  <option value="first">First name</option>
                  <option value="initials">Initials</option>
                  <option value="custom">Chosen display name</option>
                </select>
              </label>
              {nameStyle === "custom" && (
                <label>
                  Chosen display name
                  <input
                    name="displayName"
                    required
                    minLength={2}
                    maxLength={60}
                    defaultValue={editing?.display_name ?? ""}
                  />
                </label>
              )}
              <label className="testimonial-consent">
                <input
                  name="consent"
                  type="checkbox"
                  defaultChecked={editing?.consent ?? false}
                />{" "}
                I consent to this feedback and my selected display name being
                published on EasyGas after review.
              </label>
              <p>
                Photo uploads can be added to a saved draft when enabled by the
                business. Saving a draft does not publish it. Editing a
                published testimonial removes it from public view until it is
                reviewed again.
              </p>
              <button
                className="button"
                disabled={busy || !data.policy.enabled}
              >
                Save draft
              </button>
              {editing && (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    setEditing(null);
                    setNameStyle("first");
                  }}
                >
                  Cancel editing
                </button>
              )}
            </form>
          ) : (
            <p>
              No eligible purchases or services are available for a new
              testimonial yet.
            </p>
          )}
        </>
      )}
    </section>
  );
}
export function TestimonialManagement() {
  const [rows, setRows] = useState<any[]>([]),
    [metrics, setMetrics] = useState<any>(null),
    [detail, setDetail] = useState<any>(null),
    [decision, setDecision] = useState<any>(null),
    [loading, setLoading] = useState(true),
    [selected, setSelected] = useState<any[]>([]),
    [total, setTotal] = useState(0),
    [since, setSince] = useState(""),
    [sort, setSort] = useState("newest"),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [rating, setRating] = useState(""),
    [page, setPage] = useState(0),
    [busy, setBusy] = useState(false);
  const generation = useRef(0);
  function filters() {
    const q = new URLSearchParams({ sort });
    if (search.trim()) q.set("q", search.trim());
    if (status) q.set("status", status);
    if (rating) q.set("rating", rating);
    if (since) q.set("since", since);
    return q;
  }
  async function load() {
    const current = ++generation.current;
    setLoading(true);
    try {
      const q = filters();
      q.set("page", String(page));
      q.set("limit", "10");
      const [list, stats] = await Promise.all([
        api("testimonials.manage?" + q),
        api("testimonials.analytics"),
      ]);
      if (current !== generation.current) return;
      setError("");
      setRows(list.rows);
      setTotal(list.total);
      setMetrics(stats);
    } catch (e: any) {
      if (current === generation.current) setError(e.message);
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }
  useEffect(() => {
    const timer = setTimeout(load, 180);
    return () => {
      clearTimeout(timer);
      generation.current++;
    };
  }, [search, status, rating, since, sort, page]);
  const filtered = rows;
  async function exportCsv() {
    setError("");
    try {
      const cells = (v: any) =>
        '"' +
        (/^[\s]*[=+\-@]/.test(String(v ?? "")) ? "'" : "") +
        String(v ?? "").replaceAll('"', '""') +
        '"';
      const list: any[] = selected.length
        ? selected
        : (await api("testimonials.export?" + filters())).rows;
      const csv = [
        ["Display name", "Rating", "Feedback", "Status", "Consent", "Created"],
        ...list.map((r) => [
          r.display_name,
          r.rating,
          r.body,
          r.status,
          r.consent,
          r.created_at,
        ]),
      ]
        .map((row) => row.map(cells).join(","))
        .join("\r\n");
      const url = URL.createObjectURL(
        new Blob([csv], { type: "text/csv;charset=utf-8" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "easygas-testimonials.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message);
    }
  }
  async function showDetail(id: string) {
    try {
      setDetail(await api("testimonial.detail?id=" + encodeURIComponent(id)));
    } catch (e: any) {
      setError(e.message);
    }
  }
  function moderate(row: any, next: string) {
    setError("");
    setDecision({ row, next });
  }
  async function confirmModeration(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget),
      reason = String(fd.get("category")) + ": " + String(fd.get("reason"));
    const { row, next } = decision;
    setBusy(true);
    setError("");
    try {
      await api("testimonial.transition", {
        id: row.id,
        revision: row.revision,
        status: next,
        reason,
      });
      setDecision(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <h1>Customer Testimonials</h1>
        <p>
          Review authentic customer feedback, consent and publication. Approval
          and publication are separate actions.
        </p>
      </div>
      {error && <Notice message={error} />}
      <div className="metric-grid">
        {Object.keys(labels).map((s) => (
          <article className="surface" key={s}>
            <h3>{labels[s]}</h3>
            <strong>
              {metrics
                ? (metrics.counts.find((r: any) => r.status === s)?.count ?? 0)
                : "—"}
            </strong>
          </article>
        ))}
      </div>
      {metrics && (
        <section className="surface">
          <h2>Published rating distribution</h2>
          <p>
            Retention review due: {metrics.retention?.due ?? 0} · Total
            submissions:{" "}
            {metrics.counts.reduce((n: number, r: any) => n + r.count, 0)} ·
            Average published rating:{" "}
            {metrics.publishedRatings.reduce(
              (n: number, r: any) => n + r.count,
              0,
            )
              ? (
                  metrics.publishedRatings.reduce(
                    (n: number, r: any) => n + r.rating * r.count,
                    0,
                  ) /
                  metrics.publishedRatings.reduce(
                    (n: number, r: any) => n + r.count,
                    0,
                  )
                ).toFixed(1)
              : "No published ratings"}{" "}
            · Average approval time:{" "}
            {metrics.turnaround?.average_hours
              ? Number(metrics.turnaround.average_hours).toFixed(1) + " hours"
              : "No approval history"}
          </p>
          <p>
            {metrics.publishedRatings
              .map((r: any) => `${r.rating} stars: ${r.count}`)
              .join(" · ") || "No published ratings yet."}
          </p>
          <h3>Submissions over the last six months</h3>
          <p>
            {metrics.monthly
              .map((r: any) => `${r.month}: ${r.count}`)
              .join(" · ") || "No submissions in this period."}
          </p>
        </section>
      )}
      <section className="surface">
        <div className="testimonial-controls">
          <label>
            Submitted on or after
            <input
              type="date"
              value={since}
              onChange={(e) => {
                setSince(e.target.value);
                setPage(0);
              }}
            />
          </label>
          <label>
            Sort
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(0);
              }}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="rating">Lowest rating first</option>
            </select>
          </label>
          <button className="button secondary" onClick={exportCsv}>
            Export {selected.length ? "selected" : "filtered"} CSV
          </button>
          <label>
            Search feedback
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </label>
          <label>
            Status
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(0);
              }}
            >
              <option value="">All statuses</option>
              {Object.entries(labels).map(([k, v]) => (
                <option value={k} key={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            Rating
            <select
              value={rating}
              onChange={(e) => {
                setRating(e.target.value);
                setPage(0);
              }}
            >
              <option value="">All ratings</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
        {loading && <EasyGasLoader size="sm" variant="section" label="Loading testimonial records" />}
        <p>
          {total} matching submissions. Page {page + 1} of{" "}
          {Math.max(1, Math.ceil(total / 10))}.
        </p>
        {filtered.map((r) => (
          <article className="surface" key={r.id}>
            <label className="testimonial-consent">
              <input
                type="checkbox"
                aria-label={`Select feedback from ${r.display_name}`}
                checked={selected.some((x) => x.id === r.id)}
                onChange={(e) =>
                  setSelected(
                    e.target.checked
                      ? [...selected, r]
                      : selected.filter((x) => x.id !== r.id),
                  )
                }
              />
              Select feedback
            </label>
            <button
              className="button secondary"
              onClick={() => showDetail(r.id)}
            >
              Review original & history
            </button>
            <h3>
              {r.display_name} · {r.rating}/5 · {labels[r.status]}
            </h3>
            <p>{r.body}</p>
            <p>
              Consent: {r.consent ? "Granted" : "Not granted"} · Version{" "}
              {r.current_version} · Revision {r.revision}
            </p>
            <div className="testimonial-controls">
              {(
                {
                  PENDING_REVIEW: ["APPROVED", "CHANGES_REQUESTED", "REJECTED"],
                  APPROVED: ["PUBLISHED", "HIDDEN"],
                  PUBLISHED: ["HIDDEN"],
                  HIDDEN: ["PUBLISHED"],
                } as Record<string, string[]>
              )[r.status]?.map((next) => (
                <button
                  className="button secondary"
                  disabled={busy}
                  key={next}
                  onClick={() => moderate(r, next)}
                >
                  {labels[next]}
                </button>
              ))}
            </div>
          </article>
        ))}
        <div className="testimonial-controls">
          <button
            className="button secondary"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span>Page {page + 1}</span>
          <button
            className="button secondary"
            disabled={(page + 1) * 10 >= total}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
        <p>
          Sensitive moderation requires recent password verification through
          your account controls. Settings follow the shared independent approval
          workflow.
        </p>
      </section>
      {decision && (
        <Modal
          title={`${labels[decision.next]} testimonial`}
          onClose={() => setDecision(null)}
        >
          <p>
            Review the original customer feedback and consent before confirming.
            A negative rating is not a reason to reject a genuine review.
          </p>
          <blockquote>{decision.row.body}</blockquote>
          <form onSubmit={confirmModeration}>
            <label>
              Review category
              <select name="category" required>
                <option value="Authenticity and consent">
                  Authenticity and consent
                </option>
                <option value="Privacy">Privacy</option>
                <option value="Abuse or unsafe content">
                  Abuse or unsafe content
                </option>
                <option value="Eligibility or requested correction">
                  Eligibility or requested correction
                </option>
              </select>
            </label>
            <label>
              Moderation reason
              <textarea name="reason" required minLength={5} maxLength={900} />
            </label>
            {error && <Notice message={error} />}
            <button className="button" disabled={busy}>
              Confirm {labels[decision.next].toLowerCase()}
            </button>
          </form>
        </Modal>
      )}
      {detail && (
        <Modal
          title="Original feedback & moderation history"
          onClose={() => setDetail(null)}
        >
          <h3>Feedback versions</h3>
          {detail.versions.map((v: any) => (
            <article className="surface" key={v.version}>
              <h4>
                Version {v.version} · {v.rating}/5
              </h4>
              <p>{v.body}</p>
              <p>
                Display name: {v.display_name} · Text consent:{" "}
                {v.consent ? "Granted" : "Not granted"} · Photo consent:{" "}
                {v.photo_consent ? "Granted" : "Not granted"}
              </p>
              {v.image_id && (
                <img
                  src={`/api/media/${v.image_id}`}
                  alt="Customer supplied moderation photo"
                  width="160"
                  height="160"
                />
              )}
            </article>
          ))}
          <h3>Immutable moderation events</h3>
          {detail.events.map((e: any, i: number) => (
            <p key={i}>
              {new Date(e.created_at).toLocaleString()} ·{" "}
              {e.from_status ?? "New"} → {e.to_status} · {e.reason}
            </p>
          ))}
        </Modal>
      )}
    </>
  );
}
