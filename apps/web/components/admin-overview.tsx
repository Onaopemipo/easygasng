"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  Wrench,
  UsersRound,
  Cylinder,
  Coins,
  TriangleAlert,
  Truck,
  HardHat,
  CalendarDays,
  Plus,
  Monitor,
  UserPlus,
  PackagePlus,
  ChartNoAxesCombined,
  ArrowUpRight,
  RefreshCw,
} from "lucide-react";
import { api, money, Notice, Loading } from "./ui";
const labels = (s: string) =>
  s.replaceAll("_", " ").replace(/^./, (v) => v.toUpperCase());
function period(range: string) {
  const end = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const start = new Date(end + "T00:00:00Z");
  if (range === "month") start.setUTCDate(1);
  else start.setUTCDate(start.getUTCDate() - (range === "7" ? 6 : 29));
  return { from: start.toISOString().slice(0, 10), to: end };
}
const colours = [
  "#0aac24",
  "#008aff",
  "#ffad00",
  "#ee4c69",
  "#8438ed",
  "#008987",
  "#748f34",
  "#76858e",
];
function Trend({ rows, from, to }: { rows: any[]; from: string; to: string }) {
  const points = [];
  for (
    let day = new Date(from + "T00:00:00Z");
    day <= new Date(to + "T00:00:00Z");
    day.setUTCDate(day.getUTCDate() + 1)
  ) {
    const date = day.toISOString().slice(0, 10);
    points.push({
      date,
      count: Number(rows.find((r) => r.date === date)?.count ?? 0),
    });
  }
  const max = Math.max(1, ...points.map((p) => p.count)),
    line = points
      .map(
        (p, i) =>
          `${i ? "L" : "M"}${25 + (i * 550) / Math.max(1, points.length - 1)},${175 - (p.count / max) * 145}`,
      )
      .join(" ");
  return (
    <>
      <svg
        role="img"
        aria-label={`Orders created per Lagos day, ${from} to ${to}`}
        viewBox="0 0 600 205"
      >
        <defs>
          <linearGradient id="admin-trend-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#69d743" stopOpacity=".65" />
            <stop offset="100%" stopColor="#69d743" stopOpacity=".05" />
          </linearGradient>
        </defs>
        {[30, 78, 126, 175].map((y) => (
          <line
            key={y}
            x1="25"
            x2="575"
            y1={y}
            y2={y}
            stroke="currentColor"
            opacity=".12"
          />
        ))}
        <path d={line + " L575,175 L25,175 Z"} fill="url(#admin-trend-fill)" />
        <path d={line} fill="none" stroke="#16a426" strokeWidth="3" />
        <text x="25" y="200" fill="currentColor" fontSize="15">
          {from.slice(5)}
        </text>
        <text x="510" y="200" fill="currentColor" fontSize="15">
          {to.slice(5)}
        </text>
      </svg>
      <details>
        <summary>Daily order counts</summary>
        <div className="admin-chart-text">
          {points.map((p) => (
            <span key={p.date}>
              {p.date}: {p.count}
            </span>
          ))}
        </div>
      </details>
    </>
  );
}
export default function AdminOverview({ user }: { user: any }) {
  const requestVersion = useRef(0);
  const [branchId, setBranchId] = useState("");
  const [range, setRange] = useState("month"),
    [page, setPage] = useState(1),
    [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [last, setLast] = useState("");
  const dates = period(range);
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      const version = ++requestVersion.current;
      setLoading(true);
      try {
        const response = await fetch(
          "/api/admin.dashboard?" +
            new URLSearchParams({
              ...period(range),
              ...(branchId ? { branchId } : {}),
              page: String(page),
            }),
          { signal, cache: "no-store" },
        );
        const result = await response.json();
        if (!response.ok)
          throw Object.assign(new Error(result.error), {
            status: response.status,
          });
        if (signal?.aborted || version !== requestVersion.current) return;
        setData(result);
        setLast(result.generatedAt);
        setError("");
      } catch (e: any) {
        if (e.name !== "AbortError" && version === requestVersion.current) {
          if ([401, 403].includes(e.status)) setData(null);
          setError(e.message ?? "Dashboard unavailable.");
        }
      } finally {
        if (!signal?.aborted && version === requestVersion.current)
          setLoading(false);
      }
    },
    [range, page, branchId],
  );
  useEffect(() => {
    const controller = new AbortController();
    let active = false;
    const load = async () => {
      if (active || document.hidden) return;
      active = true;
      await refresh(controller.signal);
      active = false;
    };
    void load();
    const timer = setInterval(load, 30000);
    window.addEventListener("easygas:committed", load);
    window.addEventListener("focus", load);
    document.addEventListener("visibilitychange", load);
    return () => {
      requestVersion.current++;
      controller.abort();
      clearInterval(timer);
      window.removeEventListener("easygas:committed", load);
      window.removeEventListener("focus", load);
      document.removeEventListener("visibilitychange", load);
    };
  }, [refresh]);
  const allowed = (id: string) => data?.allowed.includes(id),
    cards = [
      [
        "Orders",
        data?.orders?.count,
        ShoppingCart,
        "orders",
        "green",
        "Created in selected period",
      ],
      [
        "Service bookings",
        data?.services,
        Wrench,
        "bookings",
        "orange",
        "Created in selected period",
      ],
      [
        "Active customers",
        data?.customers,
        UsersRound,
        "customers",
        "blue",
        "Distinct customers with non-cancelled orders",
      ],
      [
        "Eligible cylinders",
        data?.cylinders,
        Cylinder,
        "cylinders",
        "purple",
        "Current unallocated company stock; inspection due date checked",
      ],
      [
        "Verified net receipts",
        data?.revenue,
        Coins,
        "finance",
        "teal",
        "Completed order/service receipts and verified POS, net of approved refunds",
      ],
      [
        "Open incidents",
        data?.incidents,
        TriangleAlert,
        "incidents",
        "pink",
        "Current open or acknowledged incidents",
      ],
    ];
  const actions = [
    ["New Order", "orders", ShoppingCart, ["owner", "manager", "sales"]],
    ["Retail POS", "pos", Monitor, ["owner", "manager", "sales"]],
    [
      "Service Bookings",
      "bookings",
      CalendarDays,
      ["owner", "service_manager"],
    ],
    ["Review Quotations", "quotations", Wrench, ["owner", "service_manager"]],
    ["Add Customer", "customers", UserPlus, ["owner", "manager"]],
    ["Receive Stock", "inventory", PackagePlus, ["owner", "inventory"]],
    [
      "Review Incidents",
      "incidents",
      TriangleAlert,
      ["owner", "manager", "service_manager", "safety_officer"],
    ],
    [
      "View Reports",
      "reports",
      ChartNoAxesCombined,
      [
        "owner",
        "manager",
        "finance",
        "inventory",
        "sales",
        "dispatcher",
        "administrator",
      ],
    ],
  ] as const;
  let offset = 0;
  return (
    <div className="admin-command">
      <section className="ac-welcome">
        <div>
          <p className="ac-eyebrow">YOUR EASYGAS OPERATIONS</p>
          <h1>Hello, {user.name?.split(" ")[0] ?? "there"}</h1>
          <p>Here’s what’s happening across your authorised workspace.</p>
        </div>
        <div className="ac-period">
          <span>
            <CalendarDays size={18} />
            {new Intl.DateTimeFormat("en-NG", {
              dateStyle: "medium",
              timeZone: "Africa/Lagos",
            }).format(new Date())}
          </span>
          <label>
            <span className="sr-only">Dashboard period</span>
            <select
              value={range}
              onChange={(e) => {
                setRange(e.target.value);
                setPage(1);
                setData(null);
              }}
            >
              <option value="month">This Month</option>
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
            </select>
          </label>
        </div>
      </section>
      <div className="ac-snapshot">
        {user.role === "owner" && (
          <label className="ac-branch-filter">
            <span className="sr-only">Dashboard branch</span>
            <select
              value={branchId}
              onChange={(e) => {
                setBranchId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All authorised branches</option>
              {data?.branches?.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <span>
          {data?.scope.label ?? "Authorised scope"} · {dates.from} – {dates.to}{" "}
          · Africa/Lagos
        </span>
        <button
          className="button secondary"
          onClick={() => refresh()}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
        <span role="status">
          {error
            ? "Stale / unavailable"
            : loading
              ? "Refreshing…"
              : last
                ? "Updated " +
                  new Date(last).toLocaleTimeString("en-NG", {
                    timeZone: "Africa/Lagos",
                  })
                : "Connecting…"}
        </span>
      </div>
      {error && <Notice type="error" message={error} />}{" "}
      {!data && loading ? (
        <Loading />
      ) : !data ? (
        <p>No dashboard snapshot available. Retry refresh.</p>
      ) : (
        <>
          <section className="ac-kpis" aria-label="Workspace metrics">
            {cards.map(([label, value, Icon, route, colour, note]: any) => {
              const content = (
                <>
                  <span className="ac-kpi-icon">
                    <Icon size={29} />
                  </span>
                  <div>
                    <span>{label}</span>
                    <strong>
                      {value === null || value === undefined
                        ? "Unavailable"
                        : route === "finance"
                          ? money(value)
                          : Number(value).toLocaleString("en-NG")}
                    </strong>
                    <small>
                      {["cylinders", "incidents"].includes(route)
                        ? "Current snapshot"
                        : "Selected period"}
                    </small>
                  </div>
                </>
              );
              return allowed(route) ? (
                <Link
                  className={"ac-kpi " + colour}
                  key={label}
                  href={"/admin/" + route}
                  title={note}
                >
                  {content}
                </Link>
              ) : (
                <div
                  className={"ac-kpi " + colour}
                  key={label}
                  title="Unavailable for this account"
                >
                  {content}
                </div>
              );
            })}
          </section>
          <details className="ac-definitions">
            <summary>Metric definitions and scope</summary>
            <dl>
              {cards.map(([label, , , , , note]: any) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{note}</dd>
                </div>
              ))}
            </dl>
            <p>
              Previous-period comparisons are unavailable. Values use authorised
              canonical records; receipts are not profit or a settlement
              statement.
            </p>
          </details>
          {!!Object.keys(data.errors).length && (
            <Notice
              type="error"
              message={
                "Some widgets are unavailable: " +
                Object.keys(data.errors).join(", ") +
                ". Other widgets remain usable."
              }
            />
          )}
          <div className="ac-top-grid">
            <section className="ac-panel">
              <h2>
                Order Trend <span>Created in period</span>
              </h2>
              {data.trend === null ? (
                <p>Unavailable for this snapshot.</p>
              ) : !data.trend.some((r: any) => Number(r.count) > 0) ? (
                <div className="ac-empty">
                  No orders recorded in this period.
                </div>
              ) : (
                <Trend rows={data.trend} from={dates.from} to={dates.to} />
              )}
            </section>
            <section className="ac-panel">
              <h2>Order Status</h2>
              {!data.orders ? (
                <p>Unavailable.</p>
              ) : !data.orders.count ? (
                <div className="ac-empty">No orders to break down.</div>
              ) : (
                <div className="ac-status-chart">
                  <svg
                    viewBox="0 0 140 140"
                    role="img"
                    aria-label={`${data.orders.count} orders by current status`}
                  >
                    <circle
                      cx="70"
                      cy="70"
                      r="51"
                      fill="none"
                      stroke="var(--border)"
                      strokeWidth="18"
                    />
                    {data.orders.statuses.map((s: any, i: number) => {
                      const percent = (s.count / data.orders.count) * 100,
                        previous = offset;
                      offset += percent;
                      return (
                        <circle
                          key={s.status}
                          cx="70"
                          cy="70"
                          r="51"
                          fill="none"
                          stroke={colours[i % colours.length]}
                          strokeWidth="18"
                          pathLength="100"
                          strokeDasharray={`${percent} ${100 - percent}`}
                          strokeDashoffset={-previous}
                          transform="rotate(-90 70 70)"
                        />
                      );
                    })}
                    <text
                      x="70"
                      y="69"
                      textAnchor="middle"
                      fill="currentColor"
                      fontSize="19"
                      fontWeight="800"
                    >
                      {data.orders.count}
                    </text>
                    <text
                      x="70"
                      y="87"
                      textAnchor="middle"
                      fill="currentColor"
                      fontSize="15"
                    >
                      Orders
                    </text>
                  </svg>
                  <ul>
                    {data.orders.statuses.map((s: any, i: number) => (
                      <li key={s.status}>
                        <span
                          style={{ background: colours[i % colours.length] }}
                        />
                        <span>{labels(s.status)}</span>
                        <strong>
                          {s.count} ·{" "}
                          {Math.round((s.count / data.orders.count) * 100)}%
                        </strong>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
            <section className="ac-panel">
              <h2>Operations Overview</h2>
              <dl className="ac-operations">
                {[
                  ["Active deliveries", data.operations?.deliveries, Truck],
                  [
                    "Appointments in period",
                    data.operations?.appointments,
                    CalendarDays,
                  ],
                  [
                    "Technicians on authorised work",
                    data.operations?.technicians,
                    HardHat,
                  ],
                  ["Drivers on delivery", data.operations?.drivers, Truck],
                  ["Open incidents", data.incidents, TriangleAlert],
                ].map(([label, value, Icon]: any) => (
                  <div key={label}>
                    <dt>
                      <Icon size={20} />
                      {label}
                    </dt>
                    <dd>{value ?? "Unavailable"}</dd>
                  </div>
                ))}
              </dl>
              <p className="ac-note">
                Current operations except appointments, which follow the
                selected period.
              </p>
            </section>
          </div>
          <div className="ac-lower-grid">
            <section className="ac-panel">
              <div className="ac-panel-heading">
                <h2>Recent Orders</h2>
                {allowed("orders") && (
                  <Link href="/admin/orders">
                    View All <ArrowUpRight size={16} />
                  </Link>
                )}
              </div>
              {data.recent?.rows.length ? (
                <>
                  <div className="ac-table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Customer</th>
                          <th>Items</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th>Assigned to</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recent.rows.map((o: any) => (
                          <tr key={o.id}>
                            <td>
                              <Link href={"/admin/orders?orderId=" + o.id}>
                                {o.reference}
                              </Link>
                            </td>
                            <td>{o.customer}</td>
                            <td>{o.items}</td>
                            <td>{money(o.total_kobo)}</td>
                            <td>
                              <span className={"ac-badge " + o.status}>
                                {labels(o.status)}
                              </span>
                            </td>
                            <td>{o.driver ?? "Unassigned"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="ac-pagination">
                    <button
                      disabled={page === 1 || loading}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </button>
                    <span>Page {page}</span>
                    <button
                      disabled={!data.recent.hasMore || loading}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </button>
                  </div>
                </>
              ) : (
                <div className="ac-empty">
                  {data.recent === null
                    ? "Recent orders unavailable."
                    : "No orders in the selected period."}
                </div>
              )}
            </section>
            <section className="ac-panel">
              <h2>Quick Actions</h2>
              <div className="ac-actions">
                {actions
                  .filter(
                    ([, route, , roles]) =>
                      allowed(route) &&
                      (roles as readonly string[]).includes(user.role),
                  )
                  .map(([label, route, Icon]) => (
                    <Link href={"/admin/" + route} key={label}>
                      <Icon size={25} />
                      <span>{label}</span>
                    </Link>
                  ))}
              </div>
              <p className="ac-note">
                Actions open the existing authorised workflows. New service
                requests and quotations remain controlled by the
                booking/assessment process.
              </p>
            </section>
            <section className="ac-retention">
              <div>
                <p className="ac-eyebrow">GROWTH & ENGAGEMENT</p>
                <h2>
                  {data.campaign?.title ??
                    "Build lasting customer relationships"}
                </h2>
                <p>
                  {data.campaign?.body ??
                    "No active approved campaign in this scope. Manage consent and approved campaigns in the existing workspace."}
                </p>
                {allowed("campaigns") && (
                  <Link className="button" href="/admin/campaigns">
                    Manage Campaigns <ArrowUpRight size={18} />
                  </Link>
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
