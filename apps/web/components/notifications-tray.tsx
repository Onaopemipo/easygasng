"use client";
import { EasyGasLoader } from "./easygas-loader";

import Link from "next/link";
import {
  Bell,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "./ui";

type Item = {
  id: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
  href?: string;
};
type Inbox = {
  items: Item[];
  total: number;
  unread: number;
  filteredTotal: number;
  page: number;
  pageSize: number;
  generatedAt: string;
};

export function NotificationsTray({
  onClose,
  onRead,
}: {
  onClose: () => void;
  onRead: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [page, setPage] = useState(1);
  const [inbox, setInbox] = useState<Inbox>();
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [readError, setReadError] = useState("");
  const [busy, setBusy] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement as HTMLElement | null;
    element?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      opener?.focus();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort("timeout"), 8000);
    let active = true;
    setLoading(true);
    setError("");
    api(`notifications.list?filter=${filter}&page=${page}`, undefined, {
      signal: controller.signal,
    })
      .then((result) => {
        if (active) setInbox(result);
      })
      .catch((failure) => {
        if (!active) return;
        if (failure.status === 401 || failure.status === 403)
          setInbox(undefined);
        setError(
          navigator.onLine
            ? "Could not load notifications. Try again."
            : "You’re offline. Reconnect and try again.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [filter, page, version]);

  async function mark(
    key: string,
    data: { id: string } | { ids: string[] } | { all: true },
  ) {
    setBusy(key);
    setReadError("");
    try {
      await api(
        "id" in data ? "notifications.read" : "notifications.read.bulk",
        data,
      );
      setSelected([]);
      setVersion((value) => value + 1);
      onRead();
    } catch {
      setReadError("Could not mark notifications as read. Try again.");
    } finally {
      setBusy("");
    }
  }

  const unread =
    inbox?.items.filter((item) => !item.read_at).map((item) => item.id) ?? [];
  const allSelected =
    unread.length > 0 && unread.every((id) => selected.includes(id));
  const disabled = loading || !!busy || !!error;
  const go = (next: number) => {
    setSelected([]);
    setReadError("");
    setPage(next);
  };

  return (
    <dialog
      ref={dialog}
      className="notification-panel notification-centre"
      aria-labelledby="notification-centre-heading"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section>
        <header>
          <span className="notification-symbol">
            <Bell size={20} />
          </span>
          <div>
            <h2 id="notification-centre-heading">Notifications</h2>
            <p>Updates from your EasyGas workspace.</p>
          </div>
          <button
            className="icon-button"
            aria-label="Close notifications"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>
        <div className="notification-filters" aria-label="Filter notifications">
          {(["all", "unread"] as const).map((value) => (
            <button
              key={value}
              aria-pressed={filter === value}
              disabled={!!busy}
              onClick={() => {
                setFilter(value);
                go(1);
              }}
            >
              {value === "all" ? "All" : "Unread"}
              {inbox
                ? ` (${value === "all" ? inbox.total : inbox.unread})`
                : ""}
            </button>
          ))}
        </div>
        {inbox && inbox.unread > 0 && (
          <div className="notification-tools">
            <label>
              <input
                type="checkbox"
                disabled={disabled || !unread.length}
                checked={allSelected}
                onChange={() => setSelected(allSelected ? [] : unread)}
              />{" "}
              Select unread on page
            </label>
            {selected.length ? (
              <button
                disabled={disabled}
                onClick={() => void mark("selected", { ids: selected })}
              >
                Mark selected as read
              </button>
            ) : (
              <button
                disabled={disabled}
                onClick={() => void mark("all", { all: true })}
              >
                <CheckCheck size={16} /> Mark all as read
              </button>
            )}
          </div>
        )}
        <div className="notification-list" aria-busy={loading}>
          {error && (
            <p role="alert">
              {error}{" "}
              <button onClick={() => setVersion((v) => v + 1)}>Retry</button>
              {inbox && (
                <small>
                  Last updated{" "}
                  {new Date(inbox.generatedAt).toLocaleTimeString("en-NG", {
                    timeZone: "Africa/Lagos",
                  })}{" "}
                  WAT
                </small>
              )}
            </p>
          )}
          {readError && <p role="alert">{readError}</p>}
          {loading && <EasyGasLoader size="sm" variant="section" label="Loading notifications" />}
          {!loading && !error && !inbox?.items.length && (
            <p>
              {filter === "unread"
                ? "No unread notifications."
                : "You’re all caught up."}
            </p>
          )}
          {!loading &&
            inbox?.items.map((item) => (
              <article
                key={item.id}
                className={item.read_at ? "" : "notification-unread"}
              >
                <div className="notification-item-heading">
                  {!item.read_at && (
                    <input
                      type="checkbox"
                      aria-label={`Select ${item.title}`}
                      checked={selected.includes(item.id)}
                      disabled={disabled}
                      onChange={() =>
                        setSelected((ids) =>
                          ids.includes(item.id)
                            ? ids.filter((id) => id !== item.id)
                            : [...ids, item.id],
                        )
                      }
                    />
                  )}
                  <strong>
                    {!item.read_at && (
                      <span className="notification-dot" aria-label="Unread" />
                    )}
                    {item.title}
                  </strong>
                </div>
                <p>{item.body}</p>
                <time dateTime={item.created_at}>
                  {new Date(item.created_at).toLocaleString("en-NG", {
                    timeZone: "Africa/Lagos",
                  })}{" "}
                  WAT
                </time>
                <div className="notification-row-actions">
                  {item.href && !error && (
                    <Link href={item.href} onClick={onClose}>
                      View order
                    </Link>
                  )}
                  {!item.read_at && (
                    <button
                      disabled={disabled}
                      onClick={() => void mark(item.id, { id: item.id })}
                    >
                      <Check size={15} />{" "}
                      {busy === item.id ? "Marking…" : "Mark as read"}
                    </button>
                  )}
                </div>
              </article>
            ))}
        </div>
        {inbox && inbox.filteredTotal > 0 && (
          <footer>
            <span>
              {(inbox.page - 1) * inbox.pageSize + 1}–
              {Math.min(inbox.page * inbox.pageSize, inbox.filteredTotal)} of{" "}
              {inbox.filteredTotal}
            </span>
            <button
              aria-label="Previous page"
              disabled={disabled || inbox.page <= 1}
              onClick={() => go(inbox.page - 1)}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              aria-label="Next page"
              disabled={
                disabled || inbox.page * inbox.pageSize >= inbox.filteredTotal
              }
              onClick={() => go(inbox.page + 1)}
            >
              <ChevronRight size={18} />
            </button>
          </footer>
        )}
      </section>
    </dialog>
  );
}
