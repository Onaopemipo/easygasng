"use client";
import { VehicleManifestPanel } from "./vehicle-manifest-panel";
import { OperationForm } from "./operations-completion";
import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "./workspace-link";
import {
  Box,
  Layers,
  Flame,
  ShieldAlert,
  ArrowRightLeft,
  Download,
  Plus,
  History,
  PackagePlus,
  SlidersHorizontal,
  TriangleAlert,
  ArrowDownToLine,
} from "lucide-react";
import { BusinessCentre } from "./business-centre";
import { Loading, Notice, money, ProductArt } from "./ui";
import { ActionLoadingIndicator } from "./easygas-loader";
const tabs = [
  "stock",
  "receipts",
  "adjustments",
  "returns",
  "transfers",
  "purchases",
  "history",
];
const label = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
function amount(v: any, unit: string) {
  return new Intl.NumberFormat("en-NG", { maximumFractionDigits: 3 }).format(
    Number(v) / (unit === "grams" ? 1000 : 1),
  );
}
function ValueChart({ valuation }: { valuation: any }) {
  const colors = ["#008e35", "#0077d8", "#a337e0", "#e8a400", "#d63358"];
  let end = 0;
  const segments = valuation.categories.map((v: any, i: number) => {
    const start = end;
    end += (100 * Number(v.value)) / Number(valuation.totalKobo);
    return `${colors[i % colors.length]} ${start}% ${end}%`;
  });
  if (!valuation.totalKobo)
    return <p>No positive acquisition value recorded.</p>;
  return (
    <div className="iw-value-chart">
      <div
        className="iw-donut"
        role="img"
        aria-label={`Acquisition value by category, total ${money(valuation.totalKobo)}`}
        style={{ background: `conic-gradient(${segments.join(",")})` }}
      >
        <span>{money(valuation.totalKobo)}</span>
      </div>
      <div>
        {valuation.categories.map((v: any) => (
          <div className="iw-value-row" key={v.name}>
            <span>
              {v.name} · {((100 * v.value) / valuation.totalKobo).toFixed(1)}%
            </span>
            <strong>{money(v.value)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
export default function InventoryWorkspace({ user }: { user: any }) {
  const search = useSearchParams(),
    router = useRouter(),
    query = search.toString(),
    current = search.get("tab") ?? "stock",
    tab = tabs.includes(current) ? current : "stock";
  const [data, setData] = useState<any>(null),
    [moves, setMoves] = useState<any>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [exporting, setExporting] = useState(false),
    [exportError, setExportError] = useState("");
  const version = useRef(0),
    q = search.get("q") ?? "",
    category = search.get("category") ?? "all",
    status = search.get("status") ?? "all",
    sort = search.get("sort") ?? "name",
    branchId = search.get("branchId") ?? "",
    page = Number(search.get("page") ?? 1);
  const parameters = useCallback(() => {
    const p = new URLSearchParams();
    for (const k of [
      "q",
      "category",
      "status",
      "sort",
      "branchId",
      "page",
      "from",
      "to",
      "kind",
    ]) {
      const v = new URLSearchParams(query).get(k);
      if (v) p.set(k, v);
    }
    return p;
  }, [query]);
  function change(values: Record<string, string>) {
    const p = new URLSearchParams(query);
    if (!("page" in values)) p.delete("page");
    for (const [k, v] of Object.entries(values)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    router.replace("/admin/inventory" + (p.size ? "?" + p : ""), {
      scroll: false,
    });
  }
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const n = ++version.current;
      setLoading(true);
      try {
        const p = parameters();
        p.delete("from");
        p.delete("to");
        p.delete("kind");
        if (tab === "history") p.set("page", "1");
        const response = await fetch("/api/inventory.workspace?" + p, {
            signal,
            cache: "no-store",
          }),
          r = await response.json();
        if (!response.ok)
          throw Object.assign(new Error(r.error ?? "Inventory unavailable."), {
            status: response.status,
          });
        let history = null;
        if (tab === "history" && r.permissions.history) {
          const m = await fetch("/api/inventory.movements?" + parameters(), {
            signal,
            cache: "no-store",
          });
          history = await m.json();
          if (!m.ok)
            throw Object.assign(new Error(history.error), { status: m.status });
        }
        if (signal?.aborted || n !== version.current) return;
        setData(r);
        setMoves(history);
        setError("");
      } catch (e: any) {
        if (e.name !== "AbortError" && n === version.current) {
          if ([401, 403].includes(e.status)) {
            setData(null);
            setMoves(null);
            if (e.status === 401) router.replace("/login");
          }
          setError(e.message);
        }
      } finally {
        if (!signal?.aborted && n === version.current) setLoading(false);
      }
    },
    [parameters, tab, router],
  );
  useEffect(() => {
    const c = new AbortController();
    let active = false;
    const refresh = async () => {
      if (document.hidden || active) return;
      active = true;
      await load(c.signal);
      active = false;
    };
    const debounce = setTimeout(refresh, 250),
      timer = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    window.addEventListener("easygas:committed", refresh);
    return () => {
      version.current++;
      c.abort();
      clearTimeout(debounce);
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("easygas:committed", refresh);
    };
  }, [load]);
  async function download() {
    setExporting(true);
    setExportError("");
    try {
      const p = parameters();
      p.delete("page");
      const r = await fetch("/api/inventory.export?" + p, {
          cache: "no-store",
        }),
        v = await r.json();
      if (!r.ok) throw new Error(v.error);
      const url = URL.createObjectURL(
        new Blob([v.csv], { type: "text/csv;charset=utf-8" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = "easygas-inventory.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setExportError(e.message);
    } finally {
      setExporting(false);
    }
  }
  const s = data?.summary,
    write = data?.permissions.write,
    counts = (family: string) =>
      data?.categories.find((x: any) => x.family === family)?.count ?? 0;
  const cards = [
    [
      "Physical stock",
      s ? amount(s.physical, "units") + " units" : "Unavailable",
      Layers,
      "green",
      s
        ? amount(s.reserved, "units") + " units reserved"
        : "Authorised records only",
    ],
    [
      "Available gas",
      s ? amount(s.gas_available, "grams") + " kg" : "Unavailable",
      Flame,
      "blue",
      "Bulk LPG only",
    ],
    [
      "Held / damaged",
      s ? amount(s.held, "units") + " units" : "Unavailable",
      ShieldAlert,
      "orange",
      s ? amount(s.gas_held, "grams") + " kg held" : "Unsaleable stock",
    ],
    [
      "Reorder alerts",
      s ? String(s.alerts) : "Unavailable",
      TriangleAlert,
      "pink",
      "At/below reorder level",
    ],
    [
      "Eligible stock value",
      data?.valuation.totalKobo == null
        ? "Unavailable"
        : money(data.valuation.totalKobo),
      Box,
      "purple",
      "Acquisition costs only",
    ],
  ];
  function toolbar() {
    return (
      <div className="iw-filters">
        <label>
          Search
          <input
            maxLength={100}
            placeholder="Product, SKU or branch"
            value={q}
            onChange={(e) => change({ q: e.target.value })}
          />
        </label>
        <label>
          Branch
          <select
            value={
              branchId ||
              (user.role === "owner"
                ? ""
                : (user.branchId ?? user.branch_id ?? ""))
            }
            onChange={(e) => change({ branchId: e.target.value })}
          >
            {user.role === "owner" && (
              <option value="">All authorised branches</option>
            )}
            {data?.branches.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.name}
                {!b.active ? " (inactive)" : ""}
              </option>
            ))}
          </select>
        </label>
        {tab === "stock" && (
          <>
            <label>
              Stock state
              <select
                value={status}
                onChange={(e) => change({ status: e.target.value })}
              >
                {[
                  ["all", "All stock states"],
                  ["healthy", "Healthy"],
                  ["shortage", "At/below reorder threshold"],
                  ["low", "Low stock (positive)"],
                  ["out", "Out of stock"],
                  ["held", "Held / damaged"],
                  ["reserved", "Reserved"],
                ].map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Sort
              <select
                value={sort}
                onChange={(e) => change({ sort: e.target.value })}
              >
                <option value="name">Product name</option>
                <option value="available">Available ascending</option>
                <option value="available_desc">Available descending</option>
                <option value="branch">Branch name</option>
              </select>
            </label>
          </>
        )}
        {tab === "history" && (
          <>
            <label>
              From
              <input
                type="date"
                value={search.get("from") ?? ""}
                onChange={(e) => change({ from: e.target.value })}
              />
            </label>
            <label>
              To
              <input
                type="date"
                value={search.get("to") ?? ""}
                onChange={(e) => change({ to: e.target.value })}
              />
            </label>
            <label>
              Movement kind
              <input
                maxLength={80}
                value={search.get("kind") ?? ""}
                onChange={(e) => change({ kind: e.target.value })}
              />
            </label>
          </>
        )}
        <button
          className="button secondary"
          onClick={() =>
            router.replace("/admin/inventory?tab=" + tab, { scroll: false })
          }
        >
          Clear filters
        </button>
      </div>
    );
  }
  function pager(total: number) {
    return (
      <div className="iw-pager">
        <span>
          {total === 0
            ? "No matching records"
            : `Showing ${(page - 1) * 20 + 1}–${Math.min(page * 20, total)} of ${total} records`}
        </span>
        <button
          disabled={page <= 1 || loading}
          onClick={() => change({ page: String(page - 1) })}
          className="button secondary"
        >
          Previous
        </button>
        <span aria-live="polite">Page {page}</span>
        <button
          disabled={page * 20 >= total || loading}
          onClick={() => change({ page: String(page + 1) })}
          className="button secondary"
        >
          Next
        </button>
      </div>
    );
  }
  if (!data) {
    return error && !loading ? (
      <section className="inventory-workspace">
        <h1>Inventory</h1>
        <Notice type="error" message={error} />
        <button className="button secondary" onClick={() => load()}>Retry inventory</button>
      </section>
    ) : <Loading page label="Loading inventory records" />;
  }
  return (
    <div className="inventory-workspace">
      {["owner", "finance", "manager"].includes(user.role) && (
        <VehicleManifestPanel user={user} Form={OperationForm} />
      )}
      <section className="iw-heading">
        <div className="iw-title-icon">
          <Box size={30} />
        </div>
        <div>
          <h1>Inventory</h1>
          <p>
            Monitor stock levels, acquisition values and movements. Gas in kg;
            physical goods in units.
          </p>
        </div>
        <div className="iw-top-actions">
          {data?.permissions.history && (
            <button
              className="button secondary"
              onClick={() => change({ tab: "history" })}
            >
              <ArrowRightLeft size={18} />
              Stock Movement
            </button>
          )}
          {data?.permissions.export && (
            <button
              className="button secondary"
              disabled={exporting}
              onClick={download}
            >
              <Download size={18} />
              {exporting ? "Exporting…" : "Export Stock CSV"}
            </button>
          )}
          {write && (
            <button
              className="button"
              onClick={() => change({ tab: "receipts" })}
            >
              <Plus size={18} />
              Add Stock
            </button>
          )}
        </div>
      </section>
      <div className="iw-freshness" role="status">
        {loading
          ? <ActionLoadingIndicator label="Refreshing inventory records" />
          : error
            ? "Stale / unavailable — " + error
            : `As of ${new Date(data.generatedAt).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })} · Africa/Lagos · ${data.scope}`}
        <button
          className="button secondary"
          disabled={loading}
          onClick={() => load()}
        >
          Refresh
        </button>
      </div>
      {exportError && <p role="alert">{exportError}</p>}
      <section className="iw-kpis" aria-label="Inventory metrics">
        {cards.map(([name, value, Icon, color, note]: any) => (
          <div key={name} className={"ac-kpi " + color}>
            <span className="ac-kpi-icon">
              <Icon size={28} />
            </span>
            <div>
              <span>{name}</span>
              <strong>{value}</strong>
              <small>{note}</small>
            </div>
          </div>
        ))}
      </section>
      <p className="iw-scope-note">
        Cards cover the selected branch scope, before table filters. Physical
        on-hand includes held goods; available stock excludes holds already
        removed by the ledger. Cylinder quantities do not certify serial
        eligibility.
      </p>
      <div
        className="iw-tabs"
        role="tablist"
        aria-label="Inventory workflows"
        onKeyDown={(e) => {
          if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
            e.preventDefault();
            let i = tabs.indexOf(tab);
            i =
              e.key === "Home"
                ? 0
                : e.key === "End"
                  ? 6
                  : (i + (e.key === "ArrowRight" ? 1 : 6)) % 7;
            change({ tab: tabs[i] });
            (e.currentTarget.children[i] as HTMLElement)?.focus();
          }
        }}
      >
        {tabs.map((t) => (
          <button
            role="tab"
            aria-selected={tab === t}
            aria-controls={"inventory-" + t}
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => change({ tab: t })}
          >
            {label(t)}
          </button>
        ))}
      </div>
      {["stock", "history"].includes(tab) ? (
        <div className="iw-layout">
          <div className="iw-primary">
            <section
              className="iw-panel"
              role="tabpanel"
              id={"inventory-" + tab}
              aria-label={label(tab)}
            >
              {tab === "stock" && (
                <div className="iw-categories" aria-label="Stock categories">
                  {[
                    ["all", "All stock records"],
                    ["gas", "Gas"],
                    ["cylinders", "Cylinders"],
                    ["accessories", "Accessories"],
                    ["other", "Other physical / kits"],
                  ].map(([v, t]) => (
                    <button
                      key={v}
                      aria-pressed={category === v}
                      className={category === v ? "active" : ""}
                      onClick={() => change({ category: v })}
                    >
                      {t}
                      {data
                        ? " (" +
                          (v === "all"
                            ? data.categories.reduce(
                                (n: number, c: any) => n + c.count,
                                0,
                              )
                            : counts(v)) +
                          ")"
                        : ""}
                    </button>
                  ))}
                </div>
              )}
              {toolbar()}
              {tab === "stock" ? (
                <>
                  <div className="table-scroll iw-stock">
                    <table>
                      <caption className="sr-only">
                        Authoritative branch stock; kg and units are separate.
                      </caption>
                      <thead>
                        <tr>
                          {[
                            "Product / Item",
                            "SKU",
                            "Category",
                            "Branch / Location",
                            "On hand",
                            "Reserved",
                            "Available",
                            "Held",
                            "Reorder level",
                            "Status",
                            "Actions",
                          ].map((h) => (
                            <th key={h} scope="col">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data?.rows.map((r: any) => {
                          const state =
                            Number(r.available) === 0
                              ? "Out of stock"
                              : r.threshold === null
                                ? "Threshold unset"
                                : Number(r.available) <= Number(r.threshold)
                                  ? "Low stock"
                                  : "Healthy";
                          return (
                            <tr key={r.branch_id + ":" + r.sku}>
                              <td>
                                <div className="iw-product">
                                  <ProductArt product={r} />
                                  <strong>{r.name}</strong>
                                </div>
                              </td>
                              <td>{r.sku}</td>
                              <td>{r.category}</td>
                              <td>{r.branch}</td>
                              {[
                                "on_hand",
                                "reserved",
                                "available",
                                "held",
                                "threshold",
                              ].map((k) => (
                                <td key={k}>
                                  {r[k] === null
                                    ? "Unconfigured"
                                    : amount(r[k], r.unit) +
                                      " " +
                                      (r.unit === "grams" ? "kg" : "units")}
                                </td>
                              ))}
                              <td>
                                <span
                                  className={
                                    "iw-state " +
                                    (state === "Healthy"
                                      ? "healthy"
                                      : state === "Out of stock"
                                        ? "out"
                                        : "warning")
                                  }
                                >
                                  {state}
                                </span>
                              </td>
                              <td>
                                <details>
                                  <summary aria-label={"Actions for " + r.name}>
                                    •••
                                  </summary>
                                  <div className="iw-row-menu">
                                    {r.asset === "cylinder" &&
                                      data.permissions.cylinders && (
                                        <Link href="/admin/cylinders">
                                          Serials and custody
                                        </Link>
                                      )}
                                    {r.asset !== "gas" &&
                                      data.permissions.products && (
                                        <Link href="/admin/products">
                                          Product catalogue
                                        </Link>
                                      )}
                                    {data.permissions.history && (
                                      <button
                                        onClick={() =>
                                          change({
                                            tab: "history",
                                            q: r.sku,
                                            branchId: r.branch_id,
                                          })
                                        }
                                      >
                                        Movement history
                                      </button>
                                    )}
                                    {write &&
                                      [
                                        "receipts",
                                        "adjustments",
                                        "returns",
                                        "transfers",
                                      ].map((t) => (
                                        <button
                                          key={t}
                                          onClick={() => change({ tab: t })}
                                        >
                                          {label(t)}
                                        </button>
                                      ))}
                                  </div>
                                </details>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {data && !data.rows.length && (
                    <p>
                      No stock records match these filters. Nothing has been
                      added from the mockup.
                    </p>
                  )}
                  {pager(data?.total ?? 0)}
                </>
              ) : (
                <>
                  {!data?.permissions.history ? (
                    <p>Movement history is not permitted for this role.</p>
                  ) : (
                    <>
                      <div className="table-scroll">
                        <table>
                          <thead>
                            <tr>
                              {[
                                "Time (Lagos)",
                                "Item / SKU",
                                "Branch",
                                "Movement",
                                "Quantity",
                                "Reference",
                                "Actor",
                                "Reason",
                              ].map((h) => (
                                <th key={h}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {moves?.rows.map((r: any) => (
                              <tr key={r.id + ":" + r.unit}>
                                <td>
                                  {new Date(r.created_at).toLocaleString(
                                    "en-NG",
                                    { timeZone: "Africa/Lagos" },
                                  )}
                                </td>
                                <td>
                                  {r.name}
                                  <br />
                                  {r.sku}
                                </td>
                                <td>{r.branch_id}</td>
                                <td>{r.kind}</td>
                                <td>
                                  {amount(r.quantity, "units")} {r.unit}
                                </td>
                                <td>{r.reference}</td>
                                <td>{r.actor ?? "Unavailable"}</td>
                                <td>{r.reason}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {moves && !moves.rows.length && (
                        <p>No committed movements match these filters.</p>
                      )}
                      {pager(moves?.total ?? 0)}
                    </>
                  )}
                </>
              )}
            </section>
            {tab === "stock" && (
              <div className="iw-bottom">
                <section className="iw-panel">
                  <h2>
                    <Flame size={23} />
                    Bulk Gas Balances
                  </h2>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          {[
                            "Branch",
                            "On hand (kg)",
                            "Reserved (kg)",
                            "Held (kg)",
                            "Available (kg)",
                            "Threshold (kg)",
                          ].map((h) => (
                            <th key={h}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data?.gas.map((r: any) => (
                          <tr key={r.branch_id}>
                            <td>{r.branch}</td>
                            {[
                              "on_hand",
                              "reserved",
                              "held",
                              "available",
                              "threshold",
                            ].map((k) => (
                              <td key={k}>
                                {r[k] === null
                                  ? "Unconfigured"
                                  : amount(r[k], "grams")}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
                <section className="iw-panel">
                  <h2>Inventory Value by Category</h2>
                  {data?.valuation.totalKobo == null ? (
                    <>
                      <strong>Unavailable</strong>
                      <p>
                        {data?.valuation.reason ??
                          "Acquisition-cost verification required."}
                      </p>
                      <Link href="/admin/reports">
                        Review valuation and reconciliation →
                      </Link>
                    </>
                  ) : (
                    <>
                      <strong>{money(data.valuation.totalKobo)}</strong>
                      <p>{data.valuation.reason}</p>
                      <ValueChart valuation={data.valuation} />
                    </>
                  )}
                </section>
              </div>
            )}
          </div>
          <aside className="iw-rail">
            <section className="iw-panel">
              <h2>Inventory Alerts</h2>
              <button
                onClick={() =>
                  change({
                    tab: "stock",
                    status: "shortage",
                    category: "all",
                    q: "",
                  })
                }
              >
                <TriangleAlert size={20} />
                {s?.alerts ?? "—"} stock records at/below threshold →
              </button>
              <button
                onClick={() =>
                  change({
                    tab: "stock",
                    status: "out",
                    category: "all",
                    q: "",
                  })
                }
              >
                <ShieldAlert size={20} />
                {s?.out ?? "—"} records out of stock →
              </button>
              {data?.permissions.approvals && (
                <Link href="/admin/approvals">
                  {data.pending} pending inventory approvals →
                </Link>
              )}
              <small>
                Sidebar alerts use your full navigation scope; these alerts
                follow the selected branch. Pending approvals are separate.
              </small>
            </section>
            <section className="iw-panel">
              <h2>Quick Actions</h2>
              <div className="iw-quick">
                {write &&
                  [
                    ["receipts", "Add Stock", PackagePlus],
                    ["adjustments", "Adjust / Stocktake", SlidersHorizontal],
                    ["transfers", "Transfer Stock", ArrowRightLeft],
                    ["returns", "Review Returns", ArrowDownToLine],
                  ].map(([t, n, Icon]: any) => (
                    <button key={t} onClick={() => change({ tab: t })}>
                      <Icon size={25} />
                      {n}
                    </button>
                  ))}
                {data?.permissions.services && (
                  <Link href="/admin/bookings">
                    Record service usage in the authorised job →
                  </Link>
                )}
              </div>
            </section>
            {data?.permissions.history && (
              <section className="iw-panel">
                <h2>Recent Stock Movements</h2>
                <button
                  onClick={() =>
                    change({
                      tab: "history",
                      q: "",
                      status: "all",
                      category: "all",
                    })
                  }
                >
                  View all movements →
                </button>
                {data?.recent.length ? (
                  data.recent.map((r: any) => (
                    <div className="iw-recent" key={r.id + ":" + r.unit}>
                      <History size={19} />
                      <div>
                        <strong>{r.kind}</strong>
                        <span>
                          {amount(r.quantity, "units")} {r.unit} · {r.reference}
                        </span>
                        <small>
                          {new Date(r.created_at).toLocaleString("en-NG", {
                            timeZone: "Africa/Lagos",
                          })}
                        </small>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>No committed stock movements.</p>
                )}
              </section>
            )}
          </aside>
        </div>
      ) : (
        <div
          className="inventory-legacy"
          role="tabpanel"
          id={"inventory-" + tab}
          aria-label={label(tab)}
        >
          <BusinessCentre
            key={tab}
            mode="inventory"
            user={user}
            inventoryTab={tab}
          />
        </div>
      )}
    </div>
  );
}
