"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, Loading, Notice, money, Empty, Modal, ProductArt } from "./ui";
import { ActionForm } from "./workflows";
import {
  gasReportCsv,
  gasReportExcel,
  gasReportHtml,
} from "../../../packages/business-rules/src/gas-report-export";
const labels: Record<string, string> = {
  sales: "Sales summary",
  gas: "Gas sales by kilogram",
  products: "Product sales",
  cylinders: "Cylinder sales",
  accessories: "Accessories sales",
  valuation: "Inventory valuation",
  movements: "Stock movements",
  low_stock: "Low-stock report",
  stocktakes: "Stocktake variances",
  purchases: "Supplier purchases",
  deliveries: "Delivery performance",
  locations: "Revenue by location",
  customers: "Customer purchasing",
  refills: "Refill history",
  services: "Service revenue",
  technicians: "Technician performance",
  expenses: "Expense summary",
  profit: "Profitability availability",
  payments: "Payment reconciliation",
  wallet: "Wallet liability",
  loyalty: "Loyalty points liability",
  branches: "Branch performance",
  audit: "Audit and adjustments",
};
const financial = new Set([
  "sales",
  "gas",
  "products",
  "cylinders",
  "accessories",
  "valuation",
  "purchases",
  "expenses",
  "profit",
  "payments",
  "wallet",
  "loyalty",
  "branches",
  "customers",
  "locations",
  "services",
  "technicians",
]);
const title = (key: string) =>
  key
    .replace(/_kobo$/, " (₦)")
    .replaceAll("_", " ")
    .replaceAll(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
function cell(v: any) {
  if (v === null || v === undefined) return "Unavailable";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
function Table({
  rows,
  columns,
  onDetail,
}: {
  rows: any[];
  columns?: string[];
  onDetail?: (row: any) => void;
}) {
  const cols = columns ?? Object.keys(rows[0] ?? {});
  return rows.length ? (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c}>{title(c)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id ?? i}>
              {cols.map((c) => (
                <td key={c}>
                  {c === "name" && onDetail ? (
                    <button
                      type="button"
                      className="text-link"
                      onClick={() => onDetail(r)}
                    >
                      {cell(r[c])} →
                    </button>
                  ) : c.endsWith("_kobo") && r[c] !== null ? (
                    money(r[c])
                  ) : (
                    cell(r[c])
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty title="No recorded activity">
      Records appear here after authorised business transactions.
    </Empty>
  );
}
function useBusiness() {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [live, setLive] = useState("Connecting"),
    [updated, setUpdated] = useState(0);
  const reload = useCallback(async () => {
    try {
      const d = await api("business.snapshot");
      setData(d);
      setError("");
      setUpdated(Date.now());
    } catch (e: any) {
      setData(null);
      setError(e.message);
    }
  }, []);
  useEffect(() => {
    let active = true;
    let source: EventSource | undefined;
    const receive = (event: MessageEvent) => {
      if (!active) return;
      try {
        setData(JSON.parse(event.data));
        setUpdated(Date.now());
        setError("");
        setLive("Live · committed records");
      } catch {
        setLive("Refresh needed");
      }
    };
    source = new EventSource("/api/business-live");
    source.addEventListener("snapshot", receive as EventListener);
    source.addEventListener("heartbeat", () => {
      if (active) {
        setUpdated(Date.now());
        setLive("Live · committed records");
      }
    });
    source.addEventListener("revoked", () => {
      setData(null);
      setError(
        "Access changed or expired. Sign in again to reload authorised information.",
      );
      source?.close();
    });
    source.onerror = () => {
      if (active) {
        setData(null);
        setLive("Reconnecting · fallback refresh active");
      }
    };
    void reload();
    const timer = setInterval(() => {
      if (active) void reload();
    }, 30000);
    return () => {
      active = false;
      source?.close();
      clearInterval(timer);
    };
  }, [reload]);
  return { data, error, live, updated, reload };
}
export function BusinessCentre({
  mode,
  user,
  inventoryTab,
}: {
  mode: "overview" | "inventory" | "finance" | "reports";
  user: any;
  inventoryTab?: string;
}) {
  const { data, error, live, updated, reload } = useBusiness(),
    [tab, setTab] = useState(inventoryTab ?? "stock"),
    [search, setSearch] = useState(""),
    [category, setCategory] = useState(""),
    [sort, setSort] = useState("name"),
    [page, setPage] = useState(0),
    [selectedProduct, setSelectedProduct] = useState<any>(null),
    [selectedStocktake, setSelectedStocktake] = useState<any>(null),
    [report, setReport] = useState("movements"),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [result, setResult] = useState<any>(null),
    [reportError, setReportError] = useState(""),
    [branchFilter, setBranchFilter] = useState(""),
    [location, setLocation] = useState(""),
    [status, setStatus] = useState(""),
    [payment, setPayment] = useState(""),
    [customerCategory, setCustomerCategory] = useState("");
  const branchId = user.branchId ?? user.branch_id ?? "lagos";
  const rows = useMemo(() => {
    const list = (data?.inventory ?? []).filter(
      (r: any) =>
        (!search ||
          `${r.name} ${r.sku} ${r.branch_id}`
            .toLowerCase()
            .includes(search.toLowerCase())) &&
        (!category || r.category === category),
    );
    return list.sort((a: any, b: any) =>
      sort === "available"
        ? Number(a.available) - Number(b.available)
        : String(a.name).localeCompare(String(b.name)),
    );
  }, [data, search, category, sort]);
  useEffect(() => {
    setPage(0);
  }, [search, category, sort]);
  useEffect(() => {
    setResult(null);
    setReportError("");
  }, [data?.role, data?.scope]);
  const filters = () => ({
    ...(branchFilter ? { branchId: branchFilter } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(location ? { locationId: location } : {}),
    ...(status ? { orderStatus: status } : {}),
    ...(payment ? { paymentStatus: payment } : {}),
    ...(customerCategory ? { customerCategory } : {}),
    ...(category ? { category } : {}),
    report,
  });
  async function run(format?: "csv" | "excel" | "print") {
    setReportError("");
    try {
      const r = await api(format ? "business.export" : "business.report", {
        ...filters(),
        ...(format ? { format } : {}),
      });
      setResult(r);
      if (format) {
        const keys = Object.keys(r.rows[0] ?? {});
        const table = [
          keys,
          ...r.rows.map((x: any) =>
            keys.map((k) =>
              typeof x[k] === "object" ? JSON.stringify(x[k]) : x[k],
            ),
          ),
        ];
        if (format === "print") {
          const w = window.open("", "_blank");
          if (!w) throw new Error("Allow the report print window.");
          w.document.write(
            gasReportHtml(table).replaceAll(
              "gas and delivery report",
              labels[report],
            ),
          );
          w.document.close();
          w.print();
        } else {
          const blob = new Blob(
              [format === "csv" ? gasReportCsv(table) : gasReportExcel(table)],
              {
                type:
                  format === "csv"
                    ? "text/csv;charset=utf-8"
                    : "application/xml",
              },
            ),
            url = URL.createObjectURL(blob),
            a = document.createElement("a");
          a.href = url;
          a.download = `easygas-${report}.${format === "csv" ? "csv" : "xml"}`;
          a.click();
          URL.revokeObjectURL(url);
        }
      }
    } catch (e: any) {
      setResult(null);
      setReportError(e.message);
    }
  }
  if (error) return <Notice type="error" message={error} />;
  if (!data) return <Loading />;
  const opts = data.inventory
    .map((i: any) => ({
      value: i.product_id,
      label: i.name + " · " + i.branch_id,
    }))
    .filter(
      (x: any, i: number, a: any[]) =>
        a.findIndex((y) => y.value === x.value) === i,
    );
  const base = [
    { name: "branchId", label: "Branch ID", value: branchId },
    { name: "gas", label: "Bulk gas (quantities in kg)", type: "checkbox" },
    {
      name: "productId",
      label: "Physical product (leave blank for bulk gas)",
      required: false,
      options: opts,
    },
  ];
  const evidence = [
    { name: "reference", label: "Unique operation reference" },
    { name: "reason", label: "Business reason", type: "textarea" },
    {
      name: "evidence",
      label: "Inspection / document reference",
      type: "textarea",
    },
  ];
  const inventoryWrite = data.permissions.inventoryWrite,
    financeWrite = data.permissions.financeWrite;
  const reports = Object.keys(labels).filter(
    (k) =>
      (!financial.has(k) || financeWrite) &&
      (!["wallet", "loyalty", "branches", "audit"].includes(k) ||
        user.role === "owner") &&
      (k !== "refills" || ["owner", "manager"].includes(user.role)),
  );
  return (
    <div className="business-centre">
      <section className="business-heading">
        <div>
          <p className="eyebrow">EASYGAS BUSINESS</p>
          <h1>
            {mode === "overview"
              ? "Business overview"
              : mode === "inventory"
                ? "Inventory management"
                : mode === "finance"
                  ? "Finance & expenses"
                  : "Reports & analytics"}
          </h1>
          <p>
            {mode === "inventory"
              ? "Gas in kilograms. Physical goods in units. Every change traceable."
              : "Committed business records, with access matched to your role and branch."}
          </p>
        </div>
        <button className="button secondary" onClick={reload}>
          Refresh records
        </button>
      </section>
      <div className="business-live" role="status">
        <span className="status-dot" />
        {live} · {data.scope} ·{" "}
        {updated ? new Date(updated).toLocaleTimeString() : ""}
      </div>
      {(!data.completeness.orders ||
        !data.completeness.services ||
        !data.completeness.expenses) && (
        <Notice message="A reporting dataset reached its limit. Dependent totals are unavailable; use a narrower date range in Reports for complete results." />
      )}
      {mode === "overview" && (
        <>
          <div className="business-kpis">
            {data.permissions.revenue && (
              <Kpi
                label="Verified completed revenue"
                value={
                  data.finance.verifiedCompletedRevenueKobo === null
                    ? "Unavailable"
                    : money(data.finance.verifiedCompletedRevenueKobo)
                }
                href="/admin/reports"
                note="Historical receipts, less approved refunds"
              />
            )}
            <Kpi
              label="Recorded orders"
              value={data.overview.orderCount}
              href="/admin/orders"
              note="Current authorised scope"
            />
            <Kpi
              label="Available gas"
              value={`${data.overview.gasAvailableKg} kg`}
              href="/admin/inventory"
              note={`${data.overview.gasReservedKg} kg reserved`}
            />
            <Kpi
              label="Pending deliveries"
              value={Object.entries(data.overview.orders)
                .filter(([s]) => !["delivered", "cancelled"].includes(s))
                .reduce((n, [, v]) => n + Number(v), 0)}
              href="/admin/deliveries"
              note="Includes failed deliveries requiring review"
            />
          </div>
          <div className="business-grid">
            <section className="surface">
              <h2>Order performance</h2>
              {Object.entries(data.overview.orders).map(([s, v]) => (
                <div className="business-bar" key={s}>
                  <span>{title(s)}</span>
                  <meter
                    min={0}
                    max={Math.max(1, data.overview.orderCount)}
                    value={Number(v)}
                    aria-label={s}
                  />
                  <strong>{Number(v)}</strong>
                </div>
              ))}
              {!data.overview.orderCount && (
                <p>No recorded orders in this scope.</p>
              )}
              <Link href="/admin/orders">View orders →</Link>
            </section>
            <section className="surface">
              <h2>Stock needing attention</h2>
              <p>
                {data.overview.lowStock} products at or below configured
                thresholds · {data.overview.outOfStock} out of stock.
              </p>
              {data.alerts.slice(0, 5).map((a: any) => (
                <p key={a.id}>
                  <Link href={a.href}>{a.reason}</Link>
                </p>
              ))}
              <Link href="/admin/inventory">Review inventory →</Link>
            </section>
          </div>
          <div className="business-grid">
            <section className="surface">
              <h2>Live business activity</h2>
              <p>Only committed events from your authorised scope.</p>
              {data.activity.slice(0, 10).map((a: any) => (
                <div className="business-activity" key={a.id}>
                  <strong>{title(a.event_type)}</strong>
                  <Link href={a.href}>{a.reference ?? "View record"} →</Link>
                  <time>{new Date(a.created_at).toLocaleString()}</time>
                </div>
              ))}
              {!data.activity.length && <p>No activity yet.</p>}
            </section>
            <section className="surface">
              <h2>Operations at a glance</h2>
              <dl className="business-detail">
                <div>
                  <dt>Customers with orders</dt>
                  <dd>{data.overview.customerCount}</dd>
                </div>
                <div>
                  <dt>Filled / empty cylinders</dt>
                  <dd>
                    {data.overview.filledCylinders} /{" "}
                    {data.overview.emptyCylinders}
                  </dd>
                </div>
                <div>
                  <dt>Cylinders needing safety review</dt>
                  <dd>{data.overview.unsafeCylinders}</dd>
                </div>
                {Object.entries(data.overview.serviceCounts).map(([s, v]) => (
                  <div key={s}>
                    <dt>Service · {title(s)}</dt>
                    <dd>{Number(v)}</dd>
                  </div>
                ))}
              </dl>
              <Link href="/admin/bookings">Review service jobs →</Link>
              <p>
                <Link href="/admin/operations">
                  Refill forecasts and supplier workspace →
                </Link>
              </p>
            </section>
          </div>
          {data.permissions.revenue && (
            <>
              <div className="business-kpis">
                {[
                  ["Today", data.analytics.orderRevenueTodayKobo],
                  ["Yesterday", data.analytics.orderRevenueYesterdayKobo],
                  ["Last 7 days", data.analytics.orderRevenueWeekKobo],
                  ["This month", data.analytics.orderRevenueMonthKobo],
                ].map(([label, value]) => (
                  <Kpi
                    key={String(label)}
                    label={String(label) + " · delivered order revenue"}
                    value={money(Number(value))}
                    href="/admin/reports"
                    note="Verified net order receipts; documented delivery date"
                  />
                ))}
              </div>
              <section className="surface">
                <h2>Recorded sales trend</h2>
                {data.analytics.dailyOrderRevenue.slice(-14).map((d: any) => (
                  <div className="business-bar" key={d.date}>
                    <span>{d.date}</span>
                    <meter
                      min={0}
                      max={Math.max(
                        1,
                        ...data.analytics.dailyOrderRevenue.map(
                          (x: any) => x.amountKobo,
                        ),
                      )}
                      value={d.amountKobo}
                      aria-label={d.date}
                    />
                    <strong>{money(d.amountKobo)}</strong>
                  </div>
                ))}
                <p>
                  Repeat purchase rate:{" "}
                  {data.analytics.repeatPurchaseRate === null
                    ? "Unavailable"
                    : Math.round(data.analytics.repeatPurchaseRate * 100) +
                      "%"}{" "}
                  · Returning customers: {data.analytics.returningCustomers}
                </p>
                <p>{data.analytics.limitations}</p>
              </section>
              <FinanceCards data={data} />
            </>
          )}
        </>
      )}
      {mode === "inventory" && (
        <>
          <div className="business-kpis">
            <Kpi
              label="Physical stock"
              value={`${data.overview.physicalUnits} units`}
              href="/admin/inventory"
              note={`${data.overview.reservedUnits} units reserved`}
            />
            <Kpi
              label="Available gas"
              value={`${data.overview.gasAvailableKg} kg`}
              href="/admin/inventory"
              note={`${data.overview.gasReservedKg} kg reserved`}
            />
            <Kpi
              label="Held / damaged stock"
              value={`${data.overview.heldUnits} units`}
              href="/admin/inventory"
              note={`${data.overview.heldGasKg} kg gas held`}
            />
            <Kpi
              label="Inventory value"
              value={
                data.finance.inventoryValueKobo === null ||
                data.finance.inventoryValueKobo === undefined
                  ? "Unavailable"
                  : money(data.finance.inventoryValueKobo)
              }
              href="/admin/reports"
              note="Approved method and complete acquisition costs required"
            />
          </div>
          <div className="settings-tabs">
            {[
              "stock",
              "receipts",
              "adjustments",
              "returns",
              "transfers",
              "purchases",
              "history",
            ].map((t) => (
              <button
                className={tab === t ? "active" : ""}
                onClick={() => setTab(t)}
                key={t}
              >
                {title(t)}
              </button>
            ))}
          </div>
          {tab === "stock" && (
            <section className="surface">
              <h2>Current stock</h2>
              <div className="business-filters">
                <label>
                  Search products
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Name, SKU or branch"
                  />
                </label>
                <label>
                  Category
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="">All categories</option>
                    {[
                      ...new Set<string>(
                        data.inventory.map((i: any) => i.category),
                      ),
                    ].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Sort
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="name">Product name</option>
                    <option value="available">Available stock</option>
                  </select>
                </label>
              </div>
              <Table
                rows={rows.slice(page * 20, (page + 1) * 20)}
                onDetail={setSelectedProduct}
                columns={[
                  "name",
                  "sku",
                  "category",
                  "branch_id",
                  "quantity",
                  "available",
                  "reserved",
                  "threshold",
                  "price_kobo",
                ]}
              />
              <div className="business-actions">
                <button
                  className="button secondary"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </button>
                <span>
                  Page {page + 1} · {rows.length} records
                </span>
                <button
                  className="button secondary"
                  disabled={(page + 1) * 20 >= rows.length}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
                <Link href="/admin/reports">Export authorised reports →</Link>
              </div>
              <h3>Bulk gas balances</h3>
              <Table
                rows={data.gas.map((g: any) => ({
                  branch: g.branch_id,
                  on_hand_kg: Number(g.grams) / 1000,
                  reserved_kg: Number(g.reserved_grams) / 1000,
                  available_kg: Number(g.available_grams) / 1000,
                  threshold_kg:
                    g.threshold_grams === null
                      ? null
                      : Number(g.threshold_grams) / 1000,
                }))}
              />
              <h3>Service material reservations and usage</h3>
              <Table rows={data.materials} />
              <p>
                <Link href="/admin/bookings">
                  Manage material issue and reconciliation in the original
                  service job →
                </Link>
              </p>
              <h3>Replenishment review</h3>
              <Table rows={data.recommendations} />
            </section>
          )}
          {tab === "receipts" && (
            <>
              {inventoryWrite && (
                <ActionForm
                  action="inventory.receipt"
                  title="Record verified incoming stock"
                  onDone={reload}
                  fields={[
                    ...base,
                    {
                      name: "quantity",
                      label: "Quantity (kg gas / physical units)",
                      type: "number",
                      step: "0.001",
                    },
                    {
                      name: "unitCostKobo",
                      label: "Acquisition cost per kg / unit (₦)",
                      type: "money",
                      required: false,
                    },
                    {
                      name: "supplierId",
                      label: "Supplier (optional)",
                      required: false,
                      options: data.suppliers
                        .filter((s: any) => s.active)
                        .map((s: any) => ({
                          value: s.id,
                          label: s.name + " · " + s.branch_id,
                        })),
                    },
                    {
                      name: "purchaseId",
                      label: "Approved purchase ID (optional)",
                      required: false,
                    },
                    {
                      name: "receivedDate",
                      label: "Delivery date",
                      type: "date",
                    },
                    {
                      name: "receivingPassed",
                      label: "Documented receiving checks passed",
                      type: "checkbox",
                    },
                    ...evidence,
                  ]}
                  submit="Confirm receipt"
                />
              )}
              <Table
                rows={data.permissions.costs ? data.receipts : []}
                columns={[
                  "reference",
                  "branch_id",
                  "quantity",
                  "gas",
                  "unit_cost_kobo",
                  "received_date",
                ]}
              />
            </>
          )}
          {tab === "adjustments" && (
            <>
              {inventoryWrite && (
                <ActionForm
                  action="inventory.stocktake.create"
                  title="Create a physical count session"
                  onDone={reload}
                  fields={[
                    { name: "branchId", label: "Branch", value: branchId },
                    {
                      name: "category",
                      label: "Product category (optional)",
                      required: false,
                      options: [
                        ...new Set<string>(
                          data.inventory.map((i: any) => i.category),
                        ),
                      ].map((value) => ({ value, label: value })),
                    },
                    {
                      name: "includeGas",
                      label: "Include bulk gas count",
                      type: "checkbox",
                      value: true,
                    },
                    {
                      name: "reference",
                      label: "Unique count-sheet reference",
                    },
                    {
                      name: "reason",
                      label: "Count purpose",
                      type: "textarea",
                    },
                  ]}
                />
              )}
              <Table
                rows={data.stocktakes}
                columns={[
                  "id",
                  "reference",
                  "branch_id",
                  "status",
                  "created_at",
                ]}
              />
              {inventoryWrite &&
                data.stocktakes.map((s: any) => (
                  <button
                    className="button secondary"
                    key={s.id}
                    onClick={() => setSelectedStocktake(s)}
                  >
                    {s.status === "open"
                      ? "Count / print"
                      : "Review count sheet"}{" "}
                    · {s.reference}
                  </button>
                ))}
              <Notice message="Corrections and stocktakes stay pending until independently approved. Stale counts fail safely. Protective quarantine removes unsafe unreserved stock immediately." />
              {inventoryWrite && (
                <div className="business-grid">
                  {[
                    {
                      action: "inventory.adjust",
                      label: "Request stock correction",
                      qty: "Signed adjustment (kg / units)",
                      min: -1000000,
                    },
                    {
                      action: "inventory.stocktake",
                      label: "Submit physical stocktake",
                      qty: "Actual counted stock (kg / units)",
                      min: 0,
                    },
                    {
                      action: "inventory.quarantine",
                      label: "Quarantine unsafe stock",
                      qty: "Quantity to quarantine",
                      min: 0,
                    },
                    {
                      action: "inventory.threshold",
                      label: "Request reorder threshold",
                      qty: "New threshold (kg / units)",
                      min: 0,
                    },
                  ].map((x) => (
                    <ActionForm
                      key={x.action}
                      action={x.action}
                      title={x.label}
                      onDone={reload}
                      submit="Submit"
                      fields={[
                        ...base,
                        {
                          name: "quantity",
                          label: x.qty,
                          type: "number",
                          min: x.min,
                          step: "0.001",
                        },
                        ...evidence,
                      ]}
                    />
                  ))}
                </div>
              )}
              <Table
                rows={data.operations.filter((o: any) =>
                  [
                    "adjustment",
                    "stocktake",
                    "threshold",
                    "quarantine",
                  ].includes(o.kind),
                )}
                columns={[
                  "reference",
                  "kind",
                  "branch_id",
                  "payload",
                  "approval_status",
                  "applied_at",
                ]}
              />
              <Link href="/admin/approvals">Open Approval Centre →</Link>
            </>
          )}
          {tab === "returns" && (
            <>
              <Notice message="Returns are unsaleable until condition checks and independent release approval. Cancelled orders and unused technician materials use their original reconciliation workflows. Cylinders use serial inspections and custody." />
              {inventoryWrite && (
                <div className="business-grid">
                  <ActionForm
                    action="inventory.return"
                    title="Record physical return into hold"
                    onDone={reload}
                    fields={[
                      ...base,
                      {
                        name: "quantity",
                        label: "Actual recovered quantity",
                        type: "number",
                        step: "0.001",
                      },
                      {
                        name: "kind",
                        label: "Return type",
                        options: ["customer", "cylinder"].map((value) => ({
                          value,
                          label: title(value),
                        })),
                      },
                      ...evidence,
                    ]}
                  />
                  <ActionForm
                    action="inventory.release"
                    title="Request verified return release"
                    onDone={reload}
                    fields={[
                      ...base,
                      { name: "holdId", label: "Held return ID" },
                      {
                        name: "quantity",
                        label: "Verified eligible quantity",
                        type: "number",
                        step: "0.001",
                      },
                      ...evidence,
                    ]}
                  />
                </div>
              )}
              {inventoryWrite && (
                <ActionForm
                  action="inventory.disposition"
                  title="Request supplier return or held-stock write-off"
                  onDone={reload}
                  fields={[
                    { name: "holdId", label: "Held-stock ID" },
                    {
                      name: "quantity",
                      label: "Quantity (kg / units)",
                      type: "number",
                      step: "0.001",
                    },
                    {
                      name: "disposition",
                      label: "Disposition",
                      options: [
                        {
                          value: "supplier_return",
                          label: "Physical supplier return",
                        },
                        { value: "write_off", label: "Documented write-off" },
                      ],
                    },
                    ...evidence,
                  ]}
                />
              )}{" "}
              {user.role === "owner" && (
                <ActionForm
                  action="technician.qualify"
                  title="Independently verify an inspector qualification"
                  onDone={reload}
                  fields={[
                    { name: "userId", label: "Employee ID" },
                    {
                      name: "code",
                      label: "Qualification purpose",
                      options: [
                        {
                          value: "cylinder_inspection",
                          label: "Cylinder inspection",
                        },
                        {
                          value: "inventory_safety",
                          label: "Safe release of held inventory",
                        },
                      ],
                    },
                    {
                      name: "evidence",
                      label:
                        "Actual independently checked qualification evidence",
                      type: "textarea",
                    },
                    {
                      name: "expiresAt",
                      label: "Documented expiry",
                      type: "datetime-local",
                    },
                  ]}
                />
              )}
              <Table rows={data.holds} />
              <Link href="/admin/operations">
                Cylinder inspections and technician material reconciliation →
              </Link>
            </>
          )}
          {tab === "transfers" && (
            <>
              <Notice message="Approval reserves source stock. Dispatch moves it into transit. An independent destination receiver records actual quantities; shortages and damage remain visible." />
              {inventoryWrite && (
                <ActionForm
                  action="transfer.create"
                  title="Request transfer"
                  onDone={reload}
                  fields={[
                    {
                      name: "sourceBranch",
                      label: "Source branch",
                      value: branchId,
                    },
                    { name: "destinationBranch", label: "Destination branch" },
                    ...base.filter((f) => f.name !== "branchId"),
                    {
                      name: "quantity",
                      label: "Quantity (kg / units)",
                      type: "number",
                      step: "0.001",
                    },
                    { name: "reference", label: "Unique transfer reference" },
                    {
                      name: "reason",
                      label: "Business reason",
                      type: "textarea",
                    },
                  ]}
                />
              )}
              <Table
                rows={data.transfers}
                columns={[
                  "id",
                  "source_branch",
                  "destination_branch",
                  "product_id",
                  "gas",
                  "quantity",
                  "received_quantity",
                  "damaged_quantity",
                  "status",
                ]}
              />
              <p>
                Transfer evidence uses grams for gas and units for physical
                goods.
              </p>
              {inventoryWrite && (
                <div className="business-grid">
                  <ActionForm
                    action="transfer.dispatch"
                    title="Dispatch approved transfer"
                    onDone={reload}
                    fields={[
                      { name: "id", label: "Transfer ID" },
                      { name: "reason", label: "Dispatch evidence" },
                    ]}
                  />
                  <ActionForm
                    action="transfer.receive"
                    title="Receive transferred stock"
                    onDone={reload}
                    fields={[
                      { name: "id", label: "Transfer ID" },
                      {
                        name: "quantity",
                        label: "Good quantity actually received (kg / units)",
                        type: "number",
                        step: "0.001",
                      },
                      {
                        name: "damaged",
                        label: "Damaged quantity (kg / units)",
                        type: "number",
                        step: "0.001",
                        value: 0,
                      },
                      { name: "reference", label: "Unique receipt reference" },
                      {
                        name: "reason",
                        label: "Count and condition evidence",
                        type: "textarea",
                      },
                    ]}
                  />
                  <ActionForm
                    action="transfer.cancel"
                    title="Cancel undisbursed transfer"
                    onDone={reload}
                    fields={[
                      { name: "id", label: "Transfer ID" },
                      { name: "reason", label: "Cancellation reason" },
                    ]}
                  />
                </div>
              )}
              <Link href="/admin/approvals">Review transfer approvals →</Link>
            </>
          )}
          {tab === "purchases" && (
            <>
              <Link href="/admin/operations">
                Supplier profiles and existing purchase workspace →
              </Link>
              {inventoryWrite && (
                <ActionForm
                  action="purchase.create"
                  title="Request supplier purchase"
                  onDone={reload}
                  fields={[
                    {
                      name: "supplierId",
                      label: "Supplier",
                      options: data.suppliers
                        .filter((s: any) => s.active)
                        .map((s: any) => ({
                          value: s.id,
                          label: s.name + " · " + s.branch_id,
                        })),
                    },
                    ...base.filter((f) => f.name !== "branchId"),
                    {
                      name: "quantity",
                      label: "Purchase quantity (kg / units)",
                      type: "number",
                      step: "0.001",
                    },
                    {
                      name: "unitCostKobo",
                      label: "Unit acquisition cost (₦ per kg / unit)",
                      type: "money",
                    },
                    { name: "reference", label: "Unique purchase reference" },
                    { name: "reason", label: "Business reason" },
                  ]}
                />
              )}
              {inventoryWrite && (
                <ActionForm
                  action="supplier.create"
                  title="Add supplier"
                  onDone={reload}
                  fields={[
                    { name: "branchId", label: "Branch", value: branchId },
                    { name: "name", label: "Supplier name" },
                    { name: "contact", label: "Business contact details" },
                  ]}
                />
              )}
              <Table rows={data.suppliers} />
              {["owner", "manager"].includes(user.role) && (
                <ActionForm
                  action="supplier.update"
                  title="Manage supplier"
                  onDone={reload}
                  fields={[
                    {
                      name: "id",
                      label: "Supplier",
                      options: data.suppliers.map((s: any) => ({
                        value: s.id,
                        label: s.name,
                      })),
                    },
                    { name: "name", label: "Supplier name" },
                    { name: "contact", label: "Business contact details" },
                    {
                      name: "active",
                      label: "Active supplier",
                      type: "checkbox",
                    },
                  ]}
                />
              )}
              <Table
                rows={data.purchases}
                columns={[
                  "id",
                  "supplier",
                  "branch_id",
                  "product_id",
                  "gas",
                  "quantity",
                  "received_quantity",
                  "unit_cost_kobo",
                  "status",
                  "payment_status",
                ]}
              />
              <p>
                Use Verified incoming stock with the approved purchase ID for
                partial receipts. Purchase quantities are stored as grams for
                gas.
              </p>
              <Link href="/admin/approvals">Review purchase approvals →</Link>
            </>
          )}
          {tab === "history" && (
            <section className="surface">
              <h2>Immutable stock movements</h2>
              <Table
                rows={data.movements}
                columns={[
                  "created_at",
                  "branch_id",
                  "product_id",
                  "quantity",
                  "unit",
                  "kind",
                  "reference",
                  "reason",
                ]}
              />
            </section>
          )}
        </>
      )}
      {mode === "finance" && (
        <>
          {!financeWrite ? (
            <Notice
              type="error"
              message="Financial records require owner or finance authority."
            />
          ) : (
            <>
              <FinanceCards data={data} />
              {user.role === "owner" && (
                <details className="surface">
                  <summary>Manage expense categories</summary>
                  <ActionForm
                    action="expense.category"
                    title="Add or activate an expense category"
                    onDone={reload}
                    fields={[
                      {
                        name: "id",
                        label:
                          "Category identifier (lowercase letters, numbers and hyphens)",
                      },
                      { name: "label", label: "Category label" },
                      {
                        name: "active",
                        label: "Active category",
                        type: "checkbox",
                        value: true,
                      },
                    ]}
                  />
                  <p>
                    Existing category labels are retained for historical
                    records. Use a new identifier for a renamed category.
                  </p>
                </details>
              )}
              <Notice message="Approval does not pay an expense. Recording and actual payment evidence are separate. No payment provider is connected. Procurement expenses may overlap with stock costs; profit remains unavailable." />
              <div className="business-grid">
                <ActionForm
                  action="expense.create"
                  title="Submit expense for independent approval"
                  onDone={reload}
                  fields={[
                    { name: "branchId", label: "Branch", value: branchId },
                    {
                      name: "categoryId",
                      label: "Category",
                      options: data.categories
                        .filter((c: any) => c.active)
                        .map((c: any) => ({ value: c.id, label: c.label })),
                    },
                    { name: "amountKobo", label: "Amount (₦)", type: "money" },
                    { name: "date", label: "Expense date", type: "date" },
                    { name: "payee", label: "Supplier / payee" },
                    {
                      name: "description",
                      label: "Business description",
                      type: "textarea",
                    },
                    {
                      name: "method",
                      label: "Recorded payment method",
                      options: [
                        { value: "cash", label: "Cash evidence" },
                        { value: "bank_record", label: "Bank record" },
                        { value: "other", label: "Other documented method" },
                      ],
                    },
                    {
                      name: "evidence",
                      label: "Receipt / supporting document reference",
                    },
                    { name: "reference", label: "Unique expense reference" },
                    {
                      name: "draft",
                      label: "Save draft before submitting",
                      type: "checkbox",
                    },
                  ]}
                />
                <section className="surface">
                  <h2>Expense controls</h2>
                  <p>
                    Submit → independent approval → record → verify actual
                    payment. Corrections preserve the original event history.
                  </p>
                  <Link href="/admin/approvals">Open Approval Centre →</Link>
                  {["record", "pay", "reverse"].map((action) => (
                    <ActionForm
                      key={action}
                      action={"expense." + action}
                      title={
                        action === "pay"
                          ? "Verify actual payment evidence"
                          : title(action) + " expense"
                      }
                      onDone={reload}
                      fields={[
                        { name: "id", label: "Expense ID" },
                        {
                          name: "reference",
                          label: "Unique evidence / operation reference",
                        },
                        {
                          name: "reason",
                          label: "Evidence and reason",
                          type: "textarea",
                        },
                      ]}
                    />
                  ))}
                </section>
              </div>
              <Table
                rows={data.expenses}
                columns={[
                  "id",
                  "reference",
                  "expense_date",
                  "category",
                  "payee",
                  "amount_kobo",
                  "status",
                  "approval_state",
                ]}
              />
              <Link href="/admin/reconciliation">
                Verified payment ledger and cash reconciliation →
              </Link>
            </>
          )}
        </>
      )}
      {mode === "reports" && (
        <section className="surface">
          <h2>Reporting centre</h2>
          <div className="business-filters">
            <label>
              Report
              <select
                value={report}
                onChange={(e) => {
                  setReport(e.target.value);
                  setResult(null);
                }}
              >
                {reports.map((r) => (
                  <option key={r} value={r}>
                    {labels[r]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Branch
              {user.role === "owner" ? (
                <input
                  value={branchFilter}
                  onChange={(e) => {
                    setBranchFilter(e.target.value);
                    setResult(null);
                  }}
                  placeholder="All authorised branches"
                />
              ) : (
                <input readOnly value={branchId} />
              )}
            </label>
            <label>
              Date range
              <select
                defaultValue="custom"
                onChange={(e) => {
                  const d = new Intl.DateTimeFormat("en-CA", {
                      timeZone: "Africa/Lagos",
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    }).format(new Date()),
                    today = new Date(d + "T12:00:00Z"),
                    date = (v: Date) => v.toISOString().slice(0, 10),
                    value = e.target.value;
                  let start = d,
                    end = d;
                  if (value === "yesterday") {
                    today.setUTCDate(today.getUTCDate() - 1);
                    start = end = date(today);
                  }
                  if (value === "7" || value === "30") {
                    today.setUTCDate(today.getUTCDate() - Number(value) + 1);
                    start = date(today);
                  }
                  if (value === "month") start = d.slice(0, 7) + "-01";
                  if (value === "previous") {
                    today.setUTCDate(0);
                    end = date(today);
                    start = end.slice(0, 7) + "-01";
                  }
                  setFrom(value === "custom" ? "" : start);
                  setTo(value === "custom" ? "" : end);
                  setResult(null);
                }}
              >
                <option value="custom">Custom / all recorded history</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="month">This month</option>
                <option value="previous">Previous month</option>
              </select>
            </label>
            <label>
              Product category
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setResult(null);
                }}
              >
                <option value="">All categories</option>
                {[
                  ...new Set<string>(
                    data.inventory.map((i: any) => i.category),
                  ),
                ].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              From
              <input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setResult(null);
                }}
              />
            </label>
            <label>
              To
              <input
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setResult(null);
                }}
              />
            </label>
            <label>
              Delivery location ID
              <input
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setResult(null);
                }}
              />
            </label>
            <label>
              Order status
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setResult(null);
                }}
              >
                <option value="">All</option>
                {[
                  "placed",
                  "accepted",
                  "preparing",
                  "assigned",
                  "out_for_delivery",
                  "delivered",
                  "failed",
                  "cancelled",
                ].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              Payment
              <select
                value={payment}
                onChange={(e) => {
                  setPayment(e.target.value);
                  setResult(null);
                }}
              >
                <option value="">All</option>
                {["unpaid", "collected", "verified", "refunded"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              Customer category
              <select
                value={customerCategory}
                onChange={(e) => {
                  setCustomerCategory(e.target.value);
                  setResult(null);
                }}
              >
                <option value="">All</option>
                <option value="customer">Customer</option>
                <option value="commercial">Commercial</option>
              </select>
            </label>
          </div>
          <div className="business-actions">
            <button className="button" onClick={() => run()}>
              Generate report
            </button>
            {["owner", "finance", "manager"].includes(user.role) && (
              <>
                <button className="button secondary" onClick={() => run("csv")}>
                  CSV
                </button>
                <button
                  className="button secondary"
                  onClick={() => run("excel")}
                >
                  Excel XML
                </button>
                <button
                  className="button secondary"
                  onClick={() => run("print")}
                >
                  Print / save PDF
                </button>
              </>
            )}
          </div>
          {reportError && <Notice type="error" message={reportError} />}
          <p>
            Money fields are kobo in exports. Choose a date range within the
            recorded history. Current inventory and liabilities are
            point-in-time views.
          </p>
          {result && (
            <>
              <h3>{labels[result.report]}</h3>
              <p>
                {result.scope} · Generated{" "}
                {new Date(result.generatedAt).toLocaleString()}
              </p>
              <Table rows={result.rows} />
              {result.limitations.map((l: string) => (
                <p key={l}>{l}</p>
              ))}
            </>
          )}
          {["owner", "finance", "manager"].includes(user.role) && (
            <ActionForm
              action="report.schedule"
              title="Schedule in-app report availability"
              onDone={reload}
              fields={[
                { name: "branchId", label: "Branch", value: branchId },
                {
                  name: "report",
                  label: "Report",
                  options: reports.map((value) => ({
                    value,
                    label: labels[value],
                  })),
                },
                {
                  name: "frequency",
                  label: "Frequency",
                  options: ["daily", "weekly", "monthly"].map((value) => ({
                    value,
                    label: title(value),
                  })),
                },
              ]}
            />
          )}
          <Table
            rows={data.schedules}
            columns={["id", "report", "frequency", "next_run", "active"]}
          />
          <Table rows={data.reportDeliveries} />
          {data.reportDeliveries
            .filter((d: any) => d.status === "available_in_app")
            .map((d: any) => (
              <button
                className="button secondary"
                key={d.id}
                onClick={async () => {
                  try {
                    setResult(await api("report.delivery", { id: d.id }));
                    setReportError("");
                  } catch (e: any) {
                    setReportError(e.message);
                    setResult(null);
                  }
                }}
              >
                Open scheduled report ·{" "}
                {new Date(d.scheduled_for).toLocaleDateString()}
              </button>
            ))}
          {data.schedules.some((s: any) => s.active) && (
            <ActionForm
              action="report.schedule.cancel"
              title="Cancel your report schedule"
              onDone={reload}
              fields={[{ name: "id", label: "Schedule ID" }]}
            />
          )}
        </section>
      )}
      {selectedProduct && (
        <Modal
          title={selectedProduct.name}
          onClose={() => setSelectedProduct(null)}
        >
          <ProductArt product={selectedProduct} />
          <p>
            {selectedProduct.sku} · {selectedProduct.branch_id} ·{" "}
            {selectedProduct.category}
          </p>
          <h3>Movement history</h3>
          <Table
            rows={data.movements.filter(
              (m: any) =>
                m.product_id === selectedProduct.product_id &&
                m.branch_id === selectedProduct.branch_id,
            )}
          />
          <p>
            <Link href="/admin/products">Manage product details →</Link>
          </p>
          {data.permissions.costs && (
            <>
              <h3>Historical acquisition receipts</h3>
              <Table
                rows={data.receipts.filter(
                  (r: any) =>
                    r.product_id === selectedProduct.product_id &&
                    r.branch_id === selectedProduct.branch_id,
                )}
              />
            </>
          )}
        </Modal>
      )}
      {selectedStocktake && (
        <Modal
          title={"Stocktake · " + selectedStocktake.reference}
          onClose={() => setSelectedStocktake(null)}
        >
          <StocktakeCounter
            session={selectedStocktake}
            onDone={() => {
              setSelectedStocktake(null);
              void reload();
            }}
          />
        </Modal>
      )}
    </div>
  );
}
function StocktakeCounter({
  session,
  onDone,
}: {
  session: any;
  onDone: () => void;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function print() {
    try {
      const r = await api("inventory.stocktake.sheet", { id: session.id }),
        keys = Object.keys(r.rows[0] ?? {}),
        w = window.open("", "_blank");
      if (!w) throw new Error("Allow the count-sheet print window.");
      w.document.write(
        gasReportHtml([
          keys,
          ...r.rows.map((x: any) => keys.map((k) => x[k])),
        ]).replaceAll("gas and delivery report", "Inventory count sheet"),
      );
      w.document.close();
      w.print();
    } catch (e: any) {
      setError(e.message);
    }
  }
  return (
    <>
      <p>
        {session.branch_id} · {session.status}. Stock movements after this
        snapshot require a new count; reservations are preserved.
      </p>
      <button type="button" className="button secondary" onClick={print}>
        Print count sheet / save PDF
      </button>
      {error && <Notice type="error" message={error} />}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const fd = new FormData(e.currentTarget);
          try {
            await api("inventory.stocktake.submit", {
              id: session.id,
              counts: session.snapshot.map((r: any, i: number) => ({
                gas: r.gas,
                ...(r.productId ? { productId: r.productId } : {}),
                counted: Number(fd.get("count-" + i)),
                reason: String(fd.get("reason")),
                evidence: String(fd.get("evidence")),
              })),
            });
            onDone();
          } catch (e: any) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {session.snapshot.map((r: any, i: number) => (
          <label key={r.productId ?? "gas"}>
            {r.name} · {r.gas ? "kg" : "units"} · recorded{" "}
            {r.quantity / (r.gas ? 1000 : 1)}
            <input
              name={"count-" + i}
              defaultValue={
                session.status === "open"
                  ? undefined
                  : Number(
                      session.counts?.find(
                        (c: any) =>
                          c.gas === r.gas &&
                          (c.product_id ?? undefined) === r.productId,
                      )?.counted ?? 0,
                    ) / (r.gas ? 1000 : 1)
              }
              type="number"
              min="0"
              step={r.gas ? "0.001" : "1"}
              required
              disabled={session.status !== "open"}
            />
          </label>
        ))}
        {session.status === "open" && (
          <>
            <label>
              Count/variance explanation
              <textarea name="reason" required minLength={5} />
            </label>
            <label>
              Signed count sheet / supporting evidence
              <textarea name="evidence" required minLength={5} />
            </label>
            <button className="button" disabled={busy}>
              {busy ? "Submitting…" : "Submit all counts for review"}
            </button>
          </>
        )}
      </form>
    </>
  );
}
function Kpi({
  label,
  value,
  note,
  href,
}: {
  label: string;
  value: any;
  note: string;
  href: string;
}) {
  return (
    <Link className="surface business-kpi" href={href}>
      <span>{label}</span>
      <strong>{value ?? "Unavailable"}</strong>
      <p>{note}</p>
    </Link>
  );
}
function FinanceCards({ data }: { data: any }) {
  return (
    <div className="business-kpis">
      {Object.entries(data.finance).map(([key, value]) => (
        <Kpi
          key={key}
          label={title(key.replace(/Kobo$/, ""))}
          value={
            value === null
              ? "Unavailable"
              : key.endsWith("Kobo")
                ? money(Number(value))
                : value
          }
          note={
            key.includes("Profit") || key.includes("Value")
              ? "Complete recorded costs required"
              : "Authoritative recorded inputs"
          }
          href="/admin/reports"
        />
      ))}
    </div>
  );
}
