"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "./workspace-link";
import {
  UsersRound,
  ShoppingBag,
  Clock,
  UserRoundX,
  Plus,
  Search,
  Mail,
  Phone,
  ArrowRight,
  Download,
  ChevronLeft,
  ChevronRight,
  EllipsisVertical,
} from "lucide-react";
import { api, Modal, Notice, Loading, money } from "./ui";
import "./customer-management.css";

function positionActions(panel: HTMLElement) {
  const trigger = panel.previousElementSibling;
  if (!trigger) return;
  const anchor = trigger.getBoundingClientRect();
  const { width, height } = panel.getBoundingClientRect();
  const viewport = document.documentElement;
  const gap = 8;
  const below = anchor.bottom + gap;
  const above = anchor.top - height - gap;
  const top = below + height <= viewport.clientHeight - gap ? below : above;
  const left = Math.min(anchor.right - width, viewport.clientWidth - width - gap);
  panel.style.left = `${Math.max(gap, left)}px`;
  panel.style.top = `${Math.max(gap, Math.min(top, viewport.clientHeight - height - gap))}px`;
}

export default function CustomerManagement() {
  const openActions = useRef<HTMLElement | null>(null);
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [status, setStatus] = useState("all"),
    [location, setLocation] = useState("all"),
    [sort, setSort] = useState("newest"),
    [page, setPage] = useState(1),
    [size, setSize] = useState(10),
    [selected, setSelected] = useState<string[]>([]),
    [modal, setModal] = useState<any>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function load() {
    setError("");
    try {
      setData(await api("customers.manage"));
    } catch (e: any) {
      setData(null);
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    const dismissActions = (event: Event) => {
      const panel = openActions.current;
      if (panel?.isConnected && event.target !== panel) panel.hidePopover();
    };
    window.addEventListener("scroll", dismissActions, true);
    window.addEventListener("resize", dismissActions);
    return () => {
      window.removeEventListener("scroll", dismissActions, true);
      window.removeEventListener("resize", dismissActions);
    };
  }, []);
  useEffect(() => {
    setPage(1);
    setSelected([]);
  }, [query, status, location, sort, size]);
  const customers: any[] = data?.customers ?? [];
  const state = (c: any) =>
    !c.active ? "Suspended" : c.orders > 0 ? "Active" : "Inactive";
  const rows = customers
    .filter(
      (c) =>
        (status === "all" || state(c) === status) &&
        (location === "all" || c.branch_id === location) &&
        [c.name, c.email, c.phone, c.location, c.public_customer_id]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : (sort === "oldest" ? 1 : -1) *
          (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    );
  const pages = Math.max(1, Math.ceil(rows.length / size)),
    current = Math.min(page, pages),
    visible = rows.slice((current - 1) * size, current * size);
  function exportCsv() {
    const escape = (v: any) =>
      '"' +
      (/^[\s]*[=+\-@]/.test(String(v ?? "")) ? "'" : "") +
      String(v ?? "").replaceAll('"', '""') +
      '"';
    const entries = selected.length
      ? rows.filter((c) => selected.includes(c.id))
      : rows;
    const csv = [
      [
        "Customer ID",
        "Name",
        "Email",
        "Phone",
        "Location",
        "Orders",
        "Verified payments (NGN)",
        "Joined",
        "Status",
      ],
      ...entries.map((c) => [
        c.public_customer_id ?? c.id,
        c.name,
        c.email,
        c.phone,
        c.location,
        c.orders,
        Number(c.spent_kobo) / 100,
        c.created_at,
        state(c),
      ]),
    ]
      .map((r) => r.map(escape).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "easygas-customers.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  async function detail(id: string) {
    setBusy(true);
    try {
      setModal({
        detail: await api("customers.detail?id=" + encodeURIComponent(id)),
      });
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const result = await api(
        modal.id ? "customers.update" : "customers.create",
        modal.id
          ? { id: modal.id, name: f.get("name") }
          : {
              name: f.get("name"),
              email: f.get("email"),
              branchId: f.get("branchId"),
            },
      );
      setMessage(result.message ?? "Customer updated.");
      setModal(null);
      await load();
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="customer-management">
      <div className="cm-heading">
        <div>
          <h1>Customers</h1>
          <p>
            Manage your customers, view their activity and support their cooking
            gas journey.
          </p>
        </div>
        <button
          className="button"
          onClick={() => {
            setMessage("");
            setModal({ create: true });
          }}
        >
          <Plus size={19} />
          Add Customer
        </button>
      </div>
      {message && <Notice message={message} />}
      {error && (
        <>
          <Notice type="error" message={error} />
          <button onClick={load}>Retry</button>
        </>
      )}
      {data && <div className="cm-metrics">
        {[
          [
            UsersRound,
            "Total Customers",
            customers.length,
            "All registered customers",
          ],
          [
            ShoppingBag,
            "Active Customers",
            customers.filter((c) => c.active && c.orders > 0).length,
            "Placed at least one order",
          ],
          [
            Clock,
            "New Customers",
            customers.filter(
              (c) =>
                Date.now() - new Date(c.created_at).getTime() < 30 * 86400000,
            ).length,
            "In the last 30 days",
          ],
          [
            UserRoundX,
            "Inactive Customers",
            customers.filter((c) => c.active && !c.orders).length,
            "No orders yet",
          ],
        ].map(([Icon, title, count, caption]: any, i) => (
          <div className="cm-metric" key={title}>
            <span className={"cm-icon tone-" + i}>
              <Icon size={29} />
            </span>
            <div>
              <span>{title}</span>
              <strong>{count}</strong>
              <small>{caption}</small>
            </div>
          </div>
        ))}
      </div>}
      {data ? <section className="cm-directory">
        <div className="cm-filters">
          <label className="cm-search">
            <Search size={20} />
            <input
              aria-label="Search customers"
              placeholder="Search customers…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select
            aria-label="Customer status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {["all", "Active", "Inactive", "Suspended"].map((v) => (
              <option key={v} value={v}>
                {v === "all" ? "All statuses" : v}
              </option>
            ))}
          </select>
          <select
            aria-label="Customer location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          >
            <option value="all">All locations</option>
            {data?.branches.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Sort customers"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="newest">Join date (newest)</option>
            <option value="oldest">Join date (oldest)</option>
            <option value="name">Name (A–Z)</option>
          </select>
          <button
            className="button secondary"
            onClick={() => {
              setQuery("");
              setStatus("all");
              setLocation("all");
              setSort("newest");
              setPage(1);
              setSelected([]);
            }}
          >
            Reset
          </button>
        </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      aria-label="Select page"
                      checked={
                        visible.length > 0 &&
                        visible.every((c) => selected.includes(c.id))
                      }
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [
                                ...new Set([
                                  ...selected,
                                  ...visible.map((c) => c.id),
                                ]),
                              ]
                            : selected.filter(
                                (id) => !visible.some((c) => c.id === id),
                              ),
                        )
                      }
                    />
                  </th>
                  {[
                    "Customer",
                    "Contact Information",
                    "Orders",
                    "Total Spent",
                    "Joined",
                    "Status",
                    "Actions",
                  ].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={"Select " + c.name}
                        checked={selected.includes(c.id)}
                        onChange={(e) =>
                          setSelected(
                            e.target.checked
                              ? [...selected, c.id]
                              : selected.filter((id) => id !== c.id),
                          )
                        }
                      />
                    </td>
                    <td>
                      <div className="cm-person">
                        <span className="cm-avatar">
                          {c.name
                            .split(" ")
                            .map((n: string) => n[0])
                            .slice(0, 2)
                            .join("")}
                        </span>
                        <div>
                          <strong>{c.name}</strong>
                          <small>{c.public_customer_id ?? c.id}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="cm-contact">
                        <span>
                          <Mail size={17} />
                          {c.email}
                        </span>
                        <span>
                          <Phone size={17} />
                          {c.phone || "Not provided"}
                        </span>
                      </div>
                    </td>
                    <td>
                      <strong>{c.orders}</strong>
                      <small>orders</small>
                    </td>
                    <td>
                      <strong>{money(c.spent_kobo)}</strong>
                    </td>
                    <td>
                      {new Date(c.created_at).toLocaleDateString("en-GB")}
                      <small>{c.location || "No assigned branch"}</small>
                    </td>
                    <td>
                      <span className={"cm-status " + state(c).toLowerCase()}>
                        {state(c)}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="cm-action-trigger"
                        aria-label={"Actions for " + c.name}
                        popoverTarget={`customer-actions-${c.id}`}
                      >
                        <EllipsisVertical size={20} aria-hidden="true" />
                      </button>
                      <div
                        id={`customer-actions-${c.id}`}
                        className="cm-action-popover"
                        popover="auto"
                        onToggle={(event) => {
                          const panel = event.currentTarget;
                          if (event.newState === "open") {
                            positionActions(panel);
                            openActions.current = panel;
                          } else if (openActions.current === panel) {
                            openActions.current = null;
                          }
                        }}
                      >
                        <button
                          type="button"
                          disabled={busy}
                          onClick={(event) => {
                            event.currentTarget.parentElement?.hidePopover();
                            detail(c.id);
                          }}
                        >
                          View details
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.currentTarget.parentElement?.hidePopover();
                            setMessage("");
                            setModal(c);
                          }}
                        >
                          Edit customer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!visible.length && (
              <p className="cm-empty">No customers match these filters.</p>
            )}
          </div>
        <div className="cm-pagination">
          <span>
            Showing {rows.length ? (current - 1) * size + 1 : 0}–
            {Math.min(current * size, rows.length)} of {rows.length} customers
            {selected.length ? ` · ${selected.length} selected` : ""}
          </span>
          <div>
            <button
              aria-label="Previous page"
              disabled={current === 1}
              onClick={() => setPage(current - 1)}
            >
              <ChevronLeft size={18} />
            </button>
            <span className="cm-page">{current}</span>
            <button
              aria-label="Next page"
              disabled={current === pages}
              onClick={() => setPage(current + 1)}
            >
              <ChevronRight size={18} />
            </button>
            <select
              aria-label="Customers per page"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
            >
              {[10, 25, 50].map((n) => (
                <option key={n} value={n}>
                  {n} per page
                </option>
              ))}
            </select>
          </div>
        </div>
      </section> : !error && <Loading page label="Loading customer records" />}
      <div className="cm-shortcuts">
        {[
          [
            UsersRound,
            "Customer Support",
            "View customer enquiries and support conversations.",
            "Open Support Desk",
            "/admin/support",
          ],
          [
            ShoppingBag,
            "Customer Insights",
            "Understand customer activity and ordering patterns.",
            "View Reports",
            "/admin/reports",
          ],
          [
            Download,
            "Export Customers",
            "Download the filtered customer list, or selected rows, for offline analysis.",
            "Export CSV",
            null,
          ],
        ].map(([Icon, title, text, label, href]: any, i) => (
          <section key={title}>
            <div>
              <span className={"cm-icon tone-" + i}>
                <Icon size={28} />
              </span>
              <div>
                <h2>{title}</h2>
                <p>{text}</p>
              </div>
            </div>
            {href ? (
              <Link className="button secondary" href={href}>
                {label}
                <ArrowRight size={18} />
              </Link>
            ) : (
              <button
                className="button secondary"
                disabled={!data || !!error}
                onClick={exportCsv}
              >
                {label}
                <ArrowRight size={18} />
              </button>
            )}
          </section>
        ))}
      </div>
      {modal && (
        <Modal
          title={
            modal.detail
              ? "Customer details"
              : modal.id
                ? "Edit customer"
                : "Add Customer"
          }
          onClose={() => setModal(null)}
        >
          {modal.detail ? (
            <>
              <h3>{modal.detail.customer.name}</h3>
              <p>{modal.detail.customer.email}</p>
              <p>
                Verified payments: {money(modal.detail.customer.spent_kobo)}.
                Refunds are reported separately in Finance.
              </p>
              {modal.detail.latestDeliveryPhoto&&<figure><img style={{maxWidth:240}} src={"/api/media/"+modal.detail.latestDeliveryPhoto.id} alt={modal.detail.latestDeliveryPhoto.alt}/><figcaption>Latest eligible delivery photo · {modal.detail.latestDeliveryPhoto.reference}. Earlier photos remain with their orders under retention policy.</figcaption></figure>}
              <h3>Recent orders</h3>
              {modal.detail.orders.length ? (
                modal.detail.orders.map((o: any) => (
                  <p key={o.reference}>
                    {o.reference} · {o.status} · {o.payment_status} ·{" "}
                    {money(o.total_kobo)}
                  </p>
                ))
              ) : (
                <p>No orders yet.</p>
              )}
              <Link className="button secondary" href="/admin/orders">
                Open Orders
              </Link>
            </>
          ) : (
            <form onSubmit={save} className="cm-form">
              <label>
                Full name
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={120}
                  defaultValue={modal.name ?? ""}
                />
              </label>
              {!modal.id && (
                <>
                  <label>
                    Email
                    <input name="email" type="email" required maxLength={200} />
                  </label>
                  <label>
                    Branch
                    <select name="branchId" required>
                      <option value="">Choose branch</option>
                      {data?.branches.map((b: any) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p>
                    The customer will receive an acceptance link and a temporary
                    password. They’ll choose their own password at first sign-in.
                  </p>
                </>
              )}
              {message && <Notice type="error" message={message} />}
              <button disabled={busy} className="button">
                {busy ? "Saving…" : "Save customer"}
              </button>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
