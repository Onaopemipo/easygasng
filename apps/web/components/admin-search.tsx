"use client";
import { useEffect, useRef, useState } from "react";
import Link from "./workspace-link";
import { Search, X } from "lucide-react";
export default function AdminSearch({ identity }: { identity: string }) {
  const [q, setQ] = useState(""),
    [page, setPage] = useState(1),
    [result, setResult] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [open, setOpen] = useState(false);
  const region = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setQ("");
    setResult(null);
    setOpen(false);
  }, [identity]);
  useEffect(() => {
    const controller = new AbortController();
    if (q.trim().length < 2) {
      setResult(null);
      setError("");
      setBusy(false);
      return () => controller.abort();
    }
    setResult(null);
    setBusy(true);
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(
          "/api/admin.search?" +
            new URLSearchParams({ q: q.trim(), page: String(page) }),
          { signal: controller.signal, cache: "no-store" },
        );
        const value = await r.json();
        if (!r.ok) throw new Error(value.error ?? "Search unavailable.");
        if (!controller.signal.aborted) {
          setResult(value);
          setError("");
        }
      } catch (e: any) {
        if (e.name !== "AbortError" && !controller.signal.aborted)
          setError(e.message);
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, page, identity]);
  return (
    <div
      className="ac-global-search"
      ref={region}
      onBlur={(e) => {
        if (!region.current?.contains(e.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setOpen(false);
          region.current?.querySelector("input")?.focus();
        }
      }}
    >
      <Search size={20} aria-hidden="true" />
      <input
        type="search"
        aria-label="Search permitted business records"
        placeholder="Search orders, customers, cylinders, services, staff…"
        value={q}
        onFocus={() => setOpen(true)}
        aria-expanded={open && q.trim().length >= 2}
        aria-controls="admin-search-results"
        onChange={(e) => {
          setQ(e.target.value);
          setPage(1);
          setOpen(true);
        }}
      />
      {q && (
        <button
          aria-label="Clear workspace search"
          onClick={() => {
            setQ("");
            region.current?.querySelector("input")?.focus();
          }}
        >
          <X size={18} />
        </button>
      )}
      {open && q.trim().length >= 2 && (
        <section
          id="admin-search-results"
          className="ac-search-results"
          aria-label="Search results"
        >
          <p role="status">
            {busy
              ? "Searching authorised records…"
              : error ||
                (!result?.results.length
                  ? "No matching permitted records."
                  : "Search results")}
          </p>
          {result?.results.map((r: any) => (
            <Link
              key={r.type + ":" + r.id + ":" + r.detail}
              href={r.href}
              onClick={() => setOpen(false)}
            >
              <span>
                {r.label}
                <small>
                  {r.type} · {r.detail}
                </small>
              </span>
              <span aria-hidden="true">→</span>
            </Link>
          ))}
          {result && (
            <div className="ac-pagination">
              <button
                disabled={page === 1 || busy}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span>Page {page}</span>
              <button
                disabled={!result.mayHaveMore || busy}
                onClick={() => setPage((p) => p + 1)}
              >
                More results
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
