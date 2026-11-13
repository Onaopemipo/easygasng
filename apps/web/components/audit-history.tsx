"use client";
import React, { useEffect, useRef, useState } from "react";
import { FormInput } from "./password-input";
import { ProductHeading } from "./product-workspace";
import { api, Empty, Loading, Notice } from "./ui";
type Page = {
  rows: any[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  snapshot: string;
  firstCursor: string | null;
  lastCursor: string | null;
};
export default function AuditHistory({ refresh = 0 }: { refresh?: number }) {
  const [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    [pageSize, setPageSize] = useState(25),
    [data, setData] = useState<Page | null>(null),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  const anchor = useRef<{ key: string; value?: string }>({ key: "" });
  const position = useRef<{
    key: string;
    value: string;
    direction: "older" | "newer";
  } | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    let live = true;
    setData(null);
    setError("");
    const key = JSON.stringify([search, pageSize, refresh, retry]);
    if (anchor.current.key !== key) anchor.current = { key };
    const params = new URLSearchParams({
      view: "paged",
      page: String(page),
      pageSize: String(pageSize),
      q: search,
    });
    if (anchor.current.value) params.set("snapshot", anchor.current.value);
    if (position.current?.key === key) {
      params.set("cursor", position.current.value);
      params.set("direction", position.current.direction);
    }
    api("audit?" + params)
      .then((result: Page) => {
        if (live) {
          anchor.current = { key, value: result.snapshot };
          setData(result);
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [page, pageSize, search, refresh, retry]);
  const busy = !data && !error;
  return (
    <section className="product-workspace audit-history">
      <ProductHeading
        eyebrow="ADMINISTRATION & CONTROL"
        title="Audit History"
        description="Review append-only security and business activity, newest first."
      />
      <div className="surface audit-history-panel">
        <div
          className="product-toolbar"
          role="search"
          aria-label="Search audit history"
        >
          <label>
            Search history
            <FormInput
              type="search"
              value={query}
              placeholder="Action, actor, outcome or target…"
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label>
            Rows per page
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {[10, 25, 50, 100].map((n) => (
                <option value={n} key={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => {
              setPage(1);
              setRetry((n) => n + 1);
            }}
          >
            Refresh history
          </button>
        </div>
        {data && (
          <p className="muted">
            Activity through{" "}
            {new Date(data.snapshot).toLocaleString("en-NG", {
              timeZone: "Africa/Lagos",
            })}{" "}
            (Lagos). Refresh to include newer activity.
          </p>
        )}
        {error ? (
          <>
            <Notice type="error" message={error} />
            <button
              className="button secondary"
              onClick={() => setRetry((n) => n + 1)}
            >
              Try again
            </button>
          </>
        ) : busy ? (
          <Loading label="Loading audit history" />
        ) : data?.rows.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {["Action", "Actor", "Outcome", "Target", "Time"].map(
                    (label) => (
                      <th key={label} scope="col">
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.action}</strong>
                    </td>
                    <td>{r.actor ?? "Unauthenticated / system"}</td>
                    <td>
                      <span
                        className={`status ${r.outcome === "denied" ? "rejected" : "active"}`}
                      >
                        {r.outcome}
                      </span>
                    </td>
                    <td>
                      <code className="small-code">{r.target}</code>
                    </td>
                    <td>
                      {new Date(r.created_at).toLocaleString("en-NG", {
                        timeZone: "Africa/Lagos",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title={search ? "No matching activity" : "No recorded activity"}
          >
            {search
              ? "Try a different action, actor or target."
              : "Security and business activity will appear here."}
          </Empty>
        )}
        <nav className="iw-pager" aria-label="Audit history pagination">
          {data && (
            <span role="status">
              { `Showing ${data.total ? (data.page - 1) * data.pageSize + 1 : 0}–${Math.min(data.page * data.pageSize, data.total)} of ${data.total} records` }
            </span>
          )}
          <button
            className="button secondary"
            disabled={!data || data.page <= 1}
            onClick={() => {
              position.current = null;
              setPage(1);
            }}
          >
            First
          </button>
          <button
            className="button secondary"
            disabled={!data || data.page <= 1}
            onClick={() => {
              position.current = data?.firstCursor
                ? {
                    key: anchor.current.key,
                    value: data.firstCursor,
                    direction: "newer",
                  }
                : null;
              setPage(data!.page - 1);
            }}
          >
            Previous
          </button>
          <span>
            Page {data?.page ?? page} of {data?.totalPages ?? "…"}
          </span>
          <button
            className="button secondary"
            disabled={!data || data.page >= data.totalPages}
            onClick={() => {
              position.current = data?.lastCursor
                ? {
                    key: anchor.current.key,
                    value: data.lastCursor,
                    direction: "older",
                  }
                : null;
              setPage(data!.page + 1);
            }}
          >
            Next
          </button>
          <button
            className="button secondary"
            disabled={!data || data.page >= data.totalPages}
            onClick={() => {
              position.current = null;
              setPage(data!.totalPages);
            }}
          >
            Last
          </button>
        </nav>
      </div>
    </section>
  );
}
