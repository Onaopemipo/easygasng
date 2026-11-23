"use client";
import { DialogDraft, RecordPages, WorkspaceDialog, WorkspaceTabs } from "./compact-workspace";
import { TestimonialRecords, testimonialStatuses } from "./engagement-records";
import { FieldCaption } from "./field-caption";
import { EasyGasLoader } from "./easygas-loader";
import React, { useEffect, useState, useRef, type FormEvent } from "react";
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
            href="/account-settings?section=reviews#testimonials"
          >
            Share your experience →
          </Link>
        </div>
      )}
    </section>
  );
}
export function CustomerTestimonials({
  dialogClassName,
}: {
  dialogClassName?: string;
}) {
  const [showEditor, setShowEditor] = useState(false),
    [dirty, setDirty] = useState(false),
    [photo, setPhoto] = useState<string | null>(null),
    [page, setPage] = useState(0);
  useEffect(() => {
    if (!showEditor && !photo) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [showEditor, photo]);
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState<any>(null),
    [nameStyle, setNameStyle] = useState("first");
  const returnFocus = useRef(false);
  useEffect(() => {
    if (showEditor || photo) returnFocus.current = true;
    else if (!busy && returnFocus.current) {
      document
        .querySelector<HTMLButtonElement>(
          "#testimonials .testimonial-controls button:not(:disabled), #testimonials > button:not(:disabled)",
        )
        ?.focus();
      returnFocus.current = false;
    }
  }, [showEditor, photo, busy]);
  const openedFor = useRef("");
  async function load() {
    setError("");
    try {
      const search = new URLSearchParams(window.location.search),
        q = new URLSearchParams();
      if (search.get("testimonialOrder"))
        q.set("orderId", search.get("testimonialOrder")!);
      if (search.get("testimonialBooking"))
        q.set("bookingId", search.get("testimonialBooking")!);
      const response = await api("testimonials.mine" + (q.size ? "?" + q : ""));
      setData(response);
      if (q.size && openedFor.current !== q.toString()) {
        openedFor.current = q.toString();
        const existing = response.submissions.find(
          (r: any) =>
            (search.has("testimonialOrder") &&
              r.order_id === search.get("testimonialOrder")) ||
            (search.has("testimonialBooking") &&
              r.booking_id === search.get("testimonialBooking")),
        );
        if (existing && !["WITHDRAWN", "REJECTED"].includes(existing.status)) {
          setEditing(existing);
          setNameStyle(existing.name_style);
          setShowEditor(true);
        } else if (response.selectedTransaction) setShowEditor(true);
      }
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
      setShowEditor(false);
      setDirty(false);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section id="testimonials" className="surface">
      <h2>Your reviews</h2>
      <p>
        Your feedback is never public without your consent and moderation. You
        can withdraw publication at any time.
      </p>
      {error && <Notice message={error} />}
      {!data && error ? (
        <button className="button secondary" onClick={load}>
          Retry reviews
        </button>
      ) : !data ? (
        <EasyGasLoader
          size="sm"
          variant="section"
          label="Loading your feedback"
        />
      ) : (
        <>
          <div className="testimonial-grid">
            {data.submissions.slice(page * 5, page * 5 + 5).map((r: any) => (
              <article className="surface" key={r.id}>
                <strong>
                  {labels[r.status]} · {r.rating}/5
                </strong>
                {r.body.length > 140 ? (
                  <details className="review-content">
                    <summary>{r.body.slice(0, 140)}…</summary>
                    <p>{r.body}</p>
                  </details>
                ) : (
                  <p>{r.body}</p>
                )}
                <p>Public name: {r.display_name}</p>
                {r.status === "DRAFT" && <p>Saved privately. Choose Submit for review when you are ready for moderation.</p>}
                {r.latest_reason &&
                  ["REJECTED", "CHANGES_REQUESTED", "HIDDEN"].includes(
                    r.status,
                  ) && <p>Latest update: {r.latest_reason}</p>}
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
                  r.consent && (
                    <button
                      className="button secondary"
                      onClick={() => setPhoto(r.id)}
                    >
                      Add photo
                    </button>
                  )}

                {!["WITHDRAWN", "REJECTED"].includes(r.status) && (
                  <div className="testimonial-controls">
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() => {
                        setEditing(r);
                        setNameStyle(r.name_style);
                        setShowEditor(true);
                        setDirty(false);
                        setShowEditor(true);
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
          {(editing || data.orders.length + data.bookings.length > 0) &&
            !showEditor && (
              <button
                className="button testimonial-new"
                disabled={!data.policy.enabled}
                onClick={() => {
                  setEditing(null);
                  setNameStyle("first");
                  setDirty(false);
                  setShowEditor(true);
                }}
              >
                Write a review
              </button>
            )}
          {data.submissions.length > 5 && (
            <div className="testimonial-controls">
              <button
                className="button secondary"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous reviews
              </button>
              <span>
                Page {page + 1} of {Math.ceil(data.submissions.length / 5)}
              </span>
              <button
                className="button secondary"
                disabled={(page + 1) * 5 >= data.submissions.length}
                onClick={() => setPage((p) => p + 1)}
              >
                Next reviews
              </button>
            </div>
          )}
          {photo && (
            <Modal
              title="Add a review photo"
              className={dialogClassName}
              onClose={() => setPhoto(null)}
            >
              <ImageUpload
                testimonialId={photo}
                done={() => {
                  setPhoto(null);
                  load();
                }}
              />
            </Modal>
          )}
          {data.submissions.length === 0 && (
            <p>
              No reviews yet. Share your experience after a completed purchase
              or service.
            </p>
          )}
          {showEditor &&
          (editing || data.orders.length + data.bookings.length > 0) ? (
            <Modal
              title={editing ? "Edit your review" : "Write a review"}
              className={dialogClassName}
              onClose={() => {
                setShowEditor(false);
                setEditing(null);
                setDirty(false);
              }}
            >
              {error && <Notice type="error" message={error} />}
              <form
                key={editing?.id ?? "new"}
                onSubmit={save}
                className="testimonial-form"
                onChange={() => setDirty(true)}
                data-unsaved={dirty ? "true" : undefined}
              >
                <h3>
                  {editing ? "Edit your feedback" : "Share an experience"}
                </h3>
                {!editing && (
                  <label>
                    <FieldCaption required={true}>
                      Completed purchase or service
                    </FieldCaption>
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
                  <FieldCaption required={true}>Rating</FieldCaption>
                  <select name="rating" defaultValue={editing?.rating ?? 5}>
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} out of 5
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <FieldCaption required={true}>Your experience</FieldCaption>
                  <textarea
                    name="body"
                    required
                    minLength={data.policy.minimumLength}
                    maxLength={data.policy.maximumLength}
                    defaultValue={editing?.body}
                  />
                </label>
                <p>
                  Do not include phone numbers, email, links, addresses or
                  private details. All ratings are welcome.
                </p>
                <label>
                  <FieldCaption required={true}>Public name style</FieldCaption>
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
                    <FieldCaption required={true}>
                      Chosen display name
                    </FieldCaption>
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
                  />
                  <FieldCaption required={false}>
                    {" "}
                    I consent to this feedback and my selected display name
                    being published on EasyGas after review.
                  </FieldCaption>
                </label>
                <p>
                  Saving a draft does not publish your review. Changes to a
                  published review require another review before publication.
                </p>
                <button
                  className="button"
                  disabled={busy || !data.policy.enabled}
                >
                  Save draft
                </button>
              </form>
            </Modal>
          ) : null}
        </>
      )}
    </section>
  );
}
export function TestimonialManagement() {
  const [rows, setRows] = useState<any[]>([]),
    [success, setSuccess] = useState(""),
    [detailError, setDetailError] = useState(""),
    [decisionError, setDecisionError] = useState(""),
    [metrics, setMetrics] = useState<any>(null),
    [detail, setDetail] = useState<any>(null),
    [detailId, setDetailId] = useState<string | null>(null),
    [detailLoading, setDetailLoading] = useState(false),
    [detailTab, setDetailTab] = useState("review"),
    [tab, setTab] = useState("reviews"),
    [filterDialog, setFilterDialog] = useState(false),
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
  const generation = useRef(0),
    detailGeneration = useRef(0),
    moderationPending = useRef(false);
  useEffect(() => {
    // Reopening after password verification must not leave keyboard focus on the page behind the dialog.
    if (!detailId || decision || busy || detailLoading) return;
    document.querySelector<HTMLButtonElement>(
      '.testimonial-dialog [aria-label="Close dialog"]',
    )?.focus();
  }, [detailId, decision, busy, detailLoading]);
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
      q.set("limit", "8");
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
      if (current === generation.current) {
        setError(e.message);
        setRows([]);
        setTotal(0);
        setMetrics(null);
      }
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
  const commands: Record<string, string> = { APPROVED: "Approve testimonial", PUBLISHED: "Publish testimonial", HIDDEN: "Hide testimonial", REJECTED: "Reject testimonial", CHANGES_REQUESTED: "Request changes" };
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
  async function showDetail(id: string, message = "") {
    const current = ++detailGeneration.current;
    setError("");
    setDetailError("");
    setSuccess(message);
    setDetail(null);
    setDetailId(id);
    setDetailLoading(true);
    setDetailTab("review");
    try {
      const result = await api(
        "testimonial.detail?id=" + encodeURIComponent(id),
      );
      if (current === detailGeneration.current) setDetail(result);
    } catch (e: any) {
      if (current === detailGeneration.current) setDetailError(e.message);
    } finally {
      if (current === detailGeneration.current) setDetailLoading(false);
    }
  }
  function closeDetail() {
    detailGeneration.current++;
    setDetailId(null);
    setDetail(null);
    setDetailError("");
    setSuccess("");
  }
  function moderate(row: any, next: string) {
    if (moderationPending.current) return;
    setSuccess("");
    setDecisionError("");
    setDecision({ row, next });
  }
  async function confirmModeration(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (moderationPending.current || !decision) return;
    moderationPending.current = true;
    const fd = new FormData(e.currentTarget),
      reason = String(fd.get("category")) + ": " + String(fd.get("reason"));
    const { row, next } = decision;
    setBusy(true);
    setDecisionError("");
    try {
      await api("testimonial.transition", {
        id: row.id,
        revision: row.revision,
        status: next,
        reason,
      });
      setDecision(null);
      const message = next === "APPROVED"
        ? "Approved. Choose Publish testimonial to make this feedback public."
        : next === "PUBLISHED" ? "Testimonial published."
        : next === "HIDDEN" ? "Testimonial hidden from the website."
        : "Review decision saved.";
      await Promise.all([load(), showDetail(row.id, message)]);
    } catch (e: any) {
      setDecisionError(e.message);
    } finally {
      moderationPending.current = false;
      setBusy(false);
    }
  }
  const currentRow = detail
    ? { ...detail.versions[detail.versions.length - 1], ...detail.testimonial }
    : null;
  const actions: Record<string, string[]> = {
    PENDING_REVIEW: ["APPROVED", "CHANGES_REQUESTED", "REJECTED"],
    APPROVED: ["PUBLISHED", "HIDDEN"],
    PUBLISHED: ["HIDDEN"],
    HIDDEN: ["PUBLISHED"],
  };
  const count = (state: string) =>
    metrics?.counts.find((r: any) => r.status === state)?.count ?? 0;
  const publishedCount =
    metrics?.publishedRatings.reduce(
      (n: number, r: any) => n + Number(r.count),
      0,
    ) ?? 0;
  return (
    <section className="admin-compact growth-workspace testimonials-workspace">
      <div className="compact-toolbar">
        <div className="product-heading">
          <h1>Customer testimonials</h1>
          <p>Review feedback, consent and publication.</p>
        </div>
        <div className="compact-actions">
          <button className="button secondary" onClick={exportCsv}>
            Export{" "}
            {selected.length ? `selected (${selected.length})` : "filtered"} CSV
          </button>
          <button className="button secondary" onClick={() => void load()}>
            Refresh
          </button>
        </div>
      </div>
      {error && !detailId && !decision && (
        <Notice type="error" message={error} />
      )}
      {tab === "analytics" && <div className="compact-metrics">
        {[
          [
            "Submissions",
            metrics
              ? metrics.counts.reduce(
                  (n: number, r: any) => n + Number(r.count),
                  0,
                )
              : "—",
          ],
          ["Pending review", metrics ? count("PENDING_REVIEW") : "—"],
          ["Published", metrics ? count("PUBLISHED") : "—"],
          [
            "Published rating",
            publishedCount
              ? (
                  metrics.publishedRatings.reduce(
                    (n: number, r: any) =>
                      n + Number(r.rating) * Number(r.count),
                    0,
                  ) / publishedCount
                ).toFixed(1) + " / 5"
              : metrics ? "No ratings" : "—",
          ],
        ].map(([label, value]) => (
          <article className="surface" key={label}>
            <h3>{label}</h3>
            <strong>{value}</strong>
          </article>
        ))}
      </div>}
      <WorkspaceTabs
        label="Testimonial workspace"
        value={tab}
        onChange={setTab}
        tabs={[
          ["reviews", "Feedback"],
          ["analytics", "Analytics"],
        ]}
      />
      {tab === "reviews" ? (
        <section className="surface">
          <div
            className="growth-statuses"
            role="group"
            aria-label="Feedback status"
          >
            {[
              ["", "All feedback"],
              ["PENDING_REVIEW", "Pending review"],
              ["APPROVED", "Approved"],
              ["PUBLISHED", "Published"],
            ].map(([key, label]) => (
              <button
                className={`button ${status === key ? "" : "secondary"}`}
                aria-pressed={status === key}
                key={key}
                onClick={() => {
                  setStatus(key);
                  setPage(0);
                }}
              >
                {label}
                {metrics &&
                  ` (${key ? count(key) : metrics.counts.reduce((n: number, r: any) => n + Number(r.count), 0)})`}
              </button>
            ))}
          </div>
          <div className="compact-toolbar">
            <label className="compact-search">
              Search feedback
              <input
                type="search"
                maxLength={200}
                placeholder="Search name or feedback…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
              />
            </label>
            <button
              className="button secondary"
              onClick={() => setFilterDialog(true)}
            >
              Filters
              {[status, rating, since, sort !== "newest" ? sort : ""].filter(
                Boolean,
              ).length
                ? " · " +
                  [status, rating, since, sort !== "newest" ? sort : ""].filter(
                    Boolean,
                  ).length
                : ""}
            </button>
            {selected.length > 0 && (
              <button
                className="button secondary"
                onClick={() => setSelected([])}
              >
                Clear selection ({selected.length})
              </button>
            )}
          </div>
          {loading ? (
            <EasyGasLoader
              size="sm"
              variant="section"
              label="Loading testimonial records"
            />
          ) : error ? (
            <p>Records could not be loaded. Refresh to retry.</p>
          ) : (
            <>
              <p className="muted">{total} matching submissions</p>
              <TestimonialRecords
                rows={filtered}
                selected={selected}
                select={(row, checked) =>
                  setSelected(
                    checked
                      ? [...selected.filter((s) => s.id !== row.id), row]
                      : selected.filter((s) => s.id !== row.id),
                  )
                }
                open={(r) => void showDetail(r.id)}
              />
              {total > 8 && (
                <nav className="compact-pagination" aria-label="Feedback pages">
                  <button
                    className="button secondary"
                    disabled={page === 0}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </button>
                  <span>
                    Page {page + 1} of {Math.max(1, Math.ceil(total / 8))}
                  </span>
                  <button
                    className="button secondary"
                    disabled={(page + 1) * 8 >= total}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </button>
                </nav>
              )}
            </>
          )}
        </section>
      ) : (
        <>
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
                {metrics.turnaround?.average_hours != null
                  ? Number(metrics.turnaround.average_hours).toFixed(1) +
                    " hours"
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
            <h2>All submission states</h2>
            <div className="growth-statuses">
              {Object.entries(testimonialStatuses).map(([key, label]) => (
                <button
                  className="button secondary"
                  key={key}
                  onClick={() => {
                    setStatus(key);
                    setPage(0);
                    setTab("reviews");
                  }}
                >
                  {label}: {metrics ? count(key) : "—"}
                </button>
              ))}
            </div>
          </section>
        </>
      )}
      <WorkspaceDialog
        title="Feedback moderation rules"
        trigger="Moderation & consent rules"
      >
        <p>
          Approval and publication are separate actions. Confirm original
          feedback and consent before deciding. Negative ratings alone are not a
          reason to reject genuine feedback.
        </p>
        <p>
          Sensitive moderation requires recent password verification through
          your <Link href="/account">account controls</Link>. Settings follow
          independent approval. Retention and consent-withdrawal controls remain
          in effect.
        </p>
      </WorkspaceDialog>
      {filterDialog && (
        <Modal
          className="compact-dialog testimonial-dialog"
          title="Feedback filters"
          onClose={() => setFilterDialog(false)}
        >
          <div className="business-filters">
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
                {Object.entries(labels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
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
          </div>
          <button className="button" onClick={() => setFilterDialog(false)}>
            Done
          </button>
        </Modal>
      )}
      {decision && (
        <Modal
          className="compact-dialog testimonial-dialog"
          title={commands[decision.next]}
          busy={busy}
          onClose={() => setDecision(null)}
        >
          <p>
            Review the original customer feedback and consent before confirming.
            A negative rating is not a reason to reject a genuine review.
          </p>
          <blockquote>{decision.row.body}</blockquote>
          <DialogDraft key={decision.row.id + decision.next}>
            <form
              className="workflow-form product-form"
              onSubmit={confirmModeration}
              data-submit-pending={busy ? "true" : undefined}
            >
              <label>
                <FieldCaption required={true}>Review category</FieldCaption>
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
                <FieldCaption required={true}>Moderation reason</FieldCaption>
                <textarea
                  name="reason"
                  required
                  minLength={5}
                  maxLength={900}
                />
              </label>
              {decisionError && <Notice message={decisionError} />}
              <button className="button" disabled={busy}>
                {commands[decision.next]}
              </button>
            </form>
          </DialogDraft>
        </Modal>
      )}
      {detailId && !decision && (
        <Modal
          className="compact-dialog testimonial-dialog"
          title="Review customer feedback"
          busy={busy}
          onClose={closeDetail}
        >
          {(detailError || error) && <Notice type="error" message={detailError || error} />}
          {!detailLoading && detailError && <button className="button secondary" onClick={() => void showDetail(detailId)}>Retry feedback details</button>}
          {success && <Notice type="success" message={success} />}
          {detailLoading ? (
            <EasyGasLoader
              size="sm"
              variant="section"
              label="Loading feedback history"
            />
          ) : (
            detail &&
            currentRow && (
              <>
                <WorkspaceTabs
                  label="Feedback details"
                  value={detailTab}
                  onChange={setDetailTab}
                  tabs={[
                    ["review", "Review"],
                    ["history", "Versions & history"],
                  ]}
                />
                {detailTab === "review" ? (
                  <>
                    <h3>
                      {currentRow.display_name} · {currentRow.rating}/5
                    </h3>
                    <p>
                      {labels[currentRow.status]} · Consent:{" "}
                      {currentRow.consent ? "Granted" : "Not granted"}
                    </p>
                    <blockquote className="growth-message">
                      {currentRow.body}
                    </blockquote>
                    <section className="testimonial-publication" aria-label="Publication status">
                      <h3>{currentRow.status === "DRAFT" ? "Awaiting customer submission"
                        : currentRow.status === "PENDING_REVIEW" ? "Ready for moderation"
                        : currentRow.status === "APPROVED" ? "Ready to publish"
                        : currentRow.status === "PUBLISHED" ? "Published on the website"
                        : currentRow.status === "HIDDEN" ? "Hidden from the website"
                        : currentRow.status === "CHANGES_REQUESTED" ? "Awaiting customer changes"
                        : currentRow.status === "WITHDRAWN" ? "Customer withdrew consent" : "Review closed"}</h3>
                      <p>{currentRow.status === "DRAFT"
                        ? "This is a private draft. The customer must open Account → Your reviews and choose Submit for review. You can then approve it and publish it here. Consent alone does not submit a draft."
                        : currentRow.status === "PENDING_REVIEW"
                        ? "Check the original feedback and consent, then choose Approve testimonial. Approval keeps it private; Publish testimonial is the next separate step."
                        : currentRow.status === "APPROVED"
                        ? "This version is approved but is not public yet. Choose Publish testimonial and confirm the publication reason."
                        : currentRow.status === "PUBLISHED"
                        ? "This feedback is published. Choose Hide testimonial to remove it from public display."
                        : currentRow.status === "HIDDEN"
                        ? "This feedback is not publicly displayed. You can publish it again if its approved version and customer consent are still current."
                        : currentRow.status === "CHANGES_REQUESTED"
                        ? "The customer must edit their feedback and submit it for review again."
                        : currentRow.status === "WITHDRAWN"
                        ? "This feedback cannot be published after the customer withdraws consent."
                        : "Rejected feedback cannot be published."}</p>
                      {!currentRow.consent && <Notice message="Publication consent is not granted. Approval and publication are unavailable." />}
                    </section>
                    <div className="compact-actions">
                      {actions[currentRow.status]?.map((next) => (
                        <button
                          className={["APPROVED", "PUBLISHED"].includes(next) ? "button" : "button secondary"}
                          disabled={busy || (["APPROVED", "PUBLISHED"].includes(next) && !currentRow.consent)}
                          key={next}
                          onClick={() => moderate(currentRow, next)}
                        >
                          {next === "APPROVED"
                            ? "Approve testimonial"
                            : next === "PUBLISHED"
                              ? "Publish testimonial"
                              : next === "HIDDEN"
                                ? "Hide testimonial"
                                : next === "CHANGES_REQUESTED" ? "Request changes" : "Reject"}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <h3>Feedback versions</h3>
                    <RecordPages rows={detail.versions}>
                      {(versions) =>
                        versions.map((v: any) => (
                          <article className="surface" key={v.version}>
                            <h4>
                              Version {v.version} · {v.rating}/5
                            </h4>
                            <p>{v.body}</p>
                            <p>
                              Display name: {v.display_name} · Text consent:{" "}
                              {v.consent ? "Granted" : "Not granted"} · Photo
                              consent:{" "}
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
                        ))
                      }
                    </RecordPages>
                    <h3>Moderation events</h3>
                    <RecordPages rows={detail.events}>
                      {(events) =>
                        events.map((e: any, i: number) => (
                          <p key={i}>
                            {new Date(e.created_at).toLocaleString("en-NG", {
                              timeZone: "Africa/Lagos",
                            })}{" "}
                            (Lagos) · {e.from_status ?? "New"} → {e.to_status} ·{" "}
                            {e.reason}
                          </p>
                        ))
                      }
                    </RecordPages>
                  </>
                )}
              </>
            )
          )}
        </Modal>
      )}
    </section>
  );
}
