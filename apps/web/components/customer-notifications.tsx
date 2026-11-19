"use client";
import React, { useEffect, useId, useRef, useState } from "react";
import {
  Bell,
  Search,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  RefreshCw,
  SlidersHorizontal,
  Package,
  CreditCard,
  MessageSquare,
  Clock3,
  KeyRound,
  X,
} from "lucide-react";
import Link from "./workspace-link";
import { api, Notice, Loading } from "./ui";
import { useCustomerResource } from "./customer-data";
import {
  notificationKind,
  notificationPreview,
  notificationTime,
  notificationDestination,
  type NotificationItem,
  type NotificationPage,
} from "../../../packages/business-rules/src/customer-notifications";
import styles from "./customer-notifications.module.css";
const icons = {
  order: Package,
  payment: CreditCard,
  support: MessageSquare,
  reminder: Clock3,
  code: KeyRound,
  account: Bell,
};
const labels = {
  order: "Order update",
  payment: "Payment update",
  support: "Support",
  reminder: "Reminder",
  code: "Delivery & security",
  account: "Account update",
};
const timestamp = (value: string) =>
  new Date(value).toLocaleString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Lagos",
  }) + " (Lagos)";

function NotificationDetail({
  item,
  read,
  busy,
  error,
  onRead,
  onClose,
}: {
  item: NotificationItem;
  read: boolean;
  busy: boolean;
  error: string;
  onRead: () => Promise<boolean>;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    close = useRef<HTMLButtonElement>(null),
    titleId = useId();
  const kind = notificationKind(item),
    Icon = icons[kind],
    destination = notificationDestination(item.href);
  useEffect(() => {
    const element = dialog.current,
      opener = document.activeElement as HTMLElement | null,
      overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    const keepFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !element?.open) return;
      const targets = Array.from(
        element.querySelectorAll<HTMLElement>("button:not(:disabled), a[href]"),
      );
      const first = targets[0],
        last = targets[targets.length - 1];
      if (!first) return;
      if (
        !element.contains(document.activeElement) ||
        (event.shiftKey && document.activeElement === first)
      ) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", keepFocus, true);
    return () => {
      document.removeEventListener("keydown", keepFocus, true);
      element?.close();
      document.body.style.overflow = overflow;
      if (opener?.isConnected) opener.focus();
      else
        document
          .querySelector<HTMLButtonElement>(
            'button[data-notification-filter][aria-pressed="true"]',
          )
          ?.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <header className={styles.dialogHeader}>
        <span className={`${styles.kindIcon} ${styles[kind] ?? ""}`}>
          <Icon size={21} />
        </span>
        <div>
          <span className={styles.category}>{labels[kind]}</span>
          <h2 id={titleId}>{item.title}</h2>
        </div>
        <button
          ref={close}
          className={styles.iconButton}
          aria-label="Close notification"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </header>
      <div className={styles.detailBody}>
        <div className={styles.detailMeta}>
          <time dateTime={item.created_at}>{timestamp(item.created_at)}</time>
          <span
            role="status"
            className={read ? styles.readBadge : styles.unreadBadge}
          >
            {read ? "Read" : "Unread"}
          </span>
        </div>
        <p className={styles.message}>{item.body}</p>
        {error && <Notice type="error" message={error} />}
      </div>
      <footer className={styles.dialogFooter}>
        {!read ? (
          <button
            className="button secondary"
            disabled={busy}
            onClick={async () => {
              if (await onRead()) close.current?.focus();
            }}
          >
            <Check size={16} />
            {busy ? "Marking as read…" : "Mark as read"}
          </button>
        ) : (
          <span className={styles.readConfirmation}>
            <CheckCheck size={16} />
            Marked as read
          </span>
        )}
        {destination && (
          <Link className="button" href={destination}>
            View order
            <ArrowUpRight size={16} />
          </Link>
        )}
      </footer>
    </dialog>
  );
}

/** Presentation is separate from the existing recipient-scoped inbox and read actions. */
export function NotificationList({
  data,
  filter,
  query,
  busy,
  onOpen,
  onRead,
}: {
  data: NotificationPage;
  filter: string;
  query: string;
  busy: boolean;
  onOpen: (item: NotificationItem) => void;
  onRead: (id: string) => void;
}) {
  if (!data.items.length)
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>
          <Bell size={28} />
        </span>
        <h2>
          {query
            ? "No matching notifications"
            : filter === "unread"
              ? "You're all caught up"
              : "Your inbox is ready"}
        </h2>
        <p>
          {query
            ? "Try another search or switch to all notifications."
            : filter === "unread"
              ? "You have no unread notifications."
              : "Order updates, payment confirmations and reminders will appear here."}
        </p>
      </div>
    );
  return (
    <ul className={styles.list}>
      {data.items.map((item) => {
        const kind = notificationKind(item),
          Icon = icons[kind];
        return (
          <li
            key={item.id}
            className={`${styles.row} ${item.read_at ? "" : styles.unread}`}
          >
            <button
              className={styles.openMessage}
              disabled={busy}
              data-notification-open={item.id}
              onClick={() => onOpen(item)}
              aria-label={`${item.title}${item.read_at ? "" : ", unread"}. Open notification`}
            >
              <span className={`${styles.kindIcon} ${styles[kind] ?? ""}`}>
                <Icon size={19} aria-hidden="true" />
              </span>
              <span className={styles.summary}>
                <span className={styles.title}>{item.title}</span>
                <span className={styles.preview}>
                  {notificationPreview(item)}
                </span>
              </span>
              <span className={styles.when}>
                <time
                  dateTime={item.created_at}
                  title={timestamp(item.created_at)}
                >
                  {notificationTime(item.created_at)}
                </time>
                {!item.read_at && (
                  <span className={styles.dot} aria-hidden="true" />
                )}
              </span>
            </button>
            <span className={styles.readAction}>
              {!item.read_at && (
                <button
                  className={styles.iconButton}
                  disabled={busy}
                  aria-label={`Mark ${item.title} as read`}
                  title="Mark as read"
                  onClick={() => onRead(item.id)}
                >
                  <Check size={17} />
                </button>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function NotificationInbox({ identity = "" }: { identity?: string }) {
  const [filter, setFilter] = useState<"all" | "unread">("all"),
    [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState<NotificationItem | null>(null),
    [acknowledged, setAcknowledged] = useState<Set<string>>(() => new Set()),
    [busy, setBusy] = useState(false),
    [readError, setReadError] = useState("");
  const alive = useRef(false),
    pending = useRef(false),
    afterReadFocus = useRef<string | null>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (search.trim() === query) return;
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search, query]);
  useEffect(() => {
    setSelected(null);
    setReadError("");
  }, [filter, page, query]);
  const params = new URLSearchParams({
    filter,
    page: String(page),
    search: query,
  });
  const { data, error, loading, retry } = useCustomerResource(
    `notifications.list?${params}`,
    identity,
  ) as {
    data: NotificationPage | null;
    error: string;
    loading: boolean;
    retry: () => void;
  };
  useEffect(() => {
    if (error && !data) {
      setSelected(null);
      setReadError("");
    }
  }, [error, data]);
  useEffect(() => {
    if (!data || !afterReadFocus.current) return;
    const targetId = afterReadFocus.current;
    afterReadFocus.current = null;
    if (document.activeElement === document.body) {
      const target =
        targetId === "filter"
          ? null
          : document.querySelector<HTMLButtonElement>(
              `button[data-notification-open="${targetId}"]`,
            );
      (
        target ??
        document.querySelector<HTMLButtonElement>(
          'button[data-notification-filter][aria-pressed="true"]',
        )
      )?.focus();
    }
  }, [data]);
  async function mark(id?: string, restoreFocus = false) {
    if (pending.current || !data) return false;
    pending.current = true;
    setBusy(true);
    setReadError("");
    try {
      await api("notifications.read.bulk", id ? { ids: [id] } : { all: true });
      if (alive.current && restoreFocus)
        afterReadFocus.current = id ?? "filter";
      if (alive.current)
        setAcknowledged(
          (previous) =>
            new Set([
              ...previous,
              ...(id ? [id] : data.items.map((item) => item.id)),
            ]),
        );
      return true; // The shared resource refreshes from the committed API event.
    } catch (e: any) {
      if (alive.current) {
        setReadError("Couldn’t update the read status. Please try again.");
        if ([401, 403].includes(e.status)) {
          setSelected(null);
          retry();
        }
      }
      return false;
    } finally {
      pending.current = false;
      if (alive.current) setBusy(false);
    }
  }
  function open(item: NotificationItem) {
    setSelected(item);
    setReadError("");
  }
  const pages = data
    ? Math.max(1, Math.ceil(data.filteredTotal / data.pageSize))
    : 1;
  return (
    <div className={styles.workspace}>
      <header className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>YOUR UPDATES</span>
          <h1>
            Notifications
            {data && data.unread > 0 && (
              <span className={styles.count}>{data.unread}</span>
            )}
          </h1>
          <p>Your deliveries, payments and account updates, in one place.</p>
        </div>
        <Link
          className={`button secondary ${styles.preferences}`}
          href="/account-settings?section=notifications"
        >
          <SlidersHorizontal size={16} />
          Preferences
        </Link>
      </header>
      {readError && !selected && <Notice type="error" message={readError} />}
      <section
        className={styles.panel}
        aria-label="Notification inbox"
        aria-busy={loading}
      >
        <div className={styles.toolbar}>
          <div className={styles.tabs} aria-label="Filter notifications">
            <button
              data-notification-filter=""
              aria-pressed={filter === "all"}
              onClick={() => {
                setFilter("all");
                setPage(1);
              }}
            >
              All notifications{data && <span>{data.total}</span>}
            </button>
            <button
              data-notification-filter=""
              aria-pressed={filter === "unread"}
              onClick={() => {
                setFilter("unread");
                setPage(1);
              }}
            >
              Unread{data && <span>{data.unread}</span>}
            </button>
          </div>
          <div className={styles.tools}>
            <button
              className={styles.markAll}
              disabled={busy || !data?.unread}
              onClick={() => mark(undefined, true)}
              title="Mark every notification in your inbox as read"
            >
              <CheckCheck size={16} />
              {busy ? "Updating…" : "Mark all as read"}
            </button>
            <button
              className={styles.iconButton}
              aria-label="Refresh notifications"
              onClick={retry}
              disabled={loading || busy}
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
        <div className={styles.searchRow}>
          <label className={styles.search}>
            <Search size={17} />
            <input
              type="search"
              aria-label="Search notifications"
              placeholder="Search notifications…"
              maxLength={100}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <span className={styles.resultCount} role="status">
            {data
              ? `${data.filteredTotal} ${data.filteredTotal === 1 ? "notification" : "notifications"}`
              : ""}
          </span>
        </div>
        {error ? (
          <div className={styles.error}>
            <Notice
              type="error"
              message="Couldn’t load your notifications. Please try again."
            />
            <button className="button secondary" onClick={retry}>
              Try again
            </button>
          </div>
        ) : loading || !data ? (
          <div className={styles.empty}>
            <Loading label="Loading notifications" />
          </div>
        ) : (
          <>
            <NotificationList
              data={data}
              filter={filter}
              query={query}
              busy={busy}
              onOpen={open}
              onRead={(id) => mark(id, true)}
            />
            {data.filteredTotal > 0 && (
              <footer className={styles.pagination}>
                <span>
                  {(data.page - 1) * data.pageSize + 1}–
                  {Math.min(data.page * data.pageSize, data.filteredTotal)} of{" "}
                  {data.filteredTotal}
                </span>
                <div>
                  <button
                    className={styles.iconButton}
                    aria-label="Previous notifications page"
                    disabled={busy || data.page <= 1}
                    onClick={() => setPage(data.page - 1)}
                  >
                    <ChevronLeft size={17} />
                  </button>
                  <span>
                    Page {data.page} of {pages}
                  </span>
                  <button
                    className={styles.iconButton}
                    aria-label="Next notifications page"
                    disabled={busy || data.page >= pages}
                    onClick={() => setPage(data.page + 1)}
                  >
                    <ChevronRight size={17} />
                  </button>
                </div>
              </footer>
            )}
          </>
        )}
      </section>

      {selected && data && (
        <NotificationDetail
          key={selected.id}
          item={selected}
          read={
            Boolean(selected.read_at) ||
            acknowledged.has(selected.id) ||
            Boolean(data.items.find((item) => item.id === selected.id)?.read_at)
          }
          busy={busy}
          error={readError}
          onRead={() => mark(selected.id)}
          onClose={() => {
            setSelected(null);
            setReadError("");
          }}
        />
      )}
    </div>
  );
}
