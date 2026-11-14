"use client";
import { FieldCaption } from "./field-caption";
import { useEffect, useState } from "react";
import Link from "./workspace-link";
import {
  Search,
  Plus,
  Upload,
  Download,
  ChevronDown,
  LayoutGrid,
  List,
  MoreHorizontal,
  Flame,
  Package,
  Cylinder,
  Settings,
  Wrench,
  MapPin,
  ArrowUpDown,
} from "lucide-react";
import { api, Loading, Notice, Modal, ProductArt, money } from "./ui";
import { CatalogueEditor } from "./workflows";
import CatalogueTools from "./catalogue-tools";
import { ServiceForm } from "./professional-services";
import {
  parseProductImport,
  productImportTemplate,
} from "../../../packages/business-rules/src/product-import";
const groups = [
  { id: "all", label: "All Products", icon: Package },
  { id: "gas", label: "Cooking Gas", icon: Flame },
  { id: "cylinders", label: "Gas Cylinders", icon: Cylinder },
  { id: "accessories", label: "Accessories", icon: Settings },
  { id: "materials", label: "Service Materials", icon: Wrench },
];
function group(p: any) {
  return /refill|cooking gas/i.test(p.category)
    ? "gas"
    : /cylinder/i.test(p.category)
      ? "cylinders"
      : /material/i.test(p.category)
        ? "materials"
        : "accessories";
}
export default function ProductCatalogue({ user }: { user: any }) {
  const [data, setData] = useState<any>(null),
    [gas, setGas] = useState<any>(null),
    [error, setError] = useState(""),
    [version, setVersion] = useState(0),
    [query, setQuery] = useState(""),
    [tab, setTab] = useState("all"),
    [category, setCategory] = useState(""),
    [status, setStatus] = useState(""),
    [location, setLocation] = useState(""),
    [sort, setSort] = useState("name"),
    [view, setView] = useState("grid"),
    [modal, setModal] = useState(""),
    [target, setTarget] = useState<any>(null),
    [importText, setImportText] = useState(""),
    [preview, setPreview] = useState<any[]>([]),
    [importError, setImportError] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const owner = user.role === "owner",
    branch = location || user.branchId || "lagos";
  useEffect(() => {
    let live = true;
    Promise.all([
      api("products.manage?" + new URLSearchParams({ branchId: branch })),
      api("gas.catalogue?" + new URLSearchParams({ branchId: branch })),
    ])
      .then(([products, g]) => {
        if (live) {
          setData(products);
          setGas(g);
          setError("");
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [version, branch]);
  const open = (mode: string, p: any = null) => {
    setTarget(p);
    setModal(mode);
    setImportError("");
    setPreview([]);
  };
  const close = () => {
    if (modal === "tools") setVersion((v) => v + 1);
    setModal("");
    setTarget(null);
  };
  if (!data)
    return error ? <Notice type="error" message={error} /> : <Loading />;
  const productStatus = (p: any) =>
    p.archived ? "archived" : p.published ? "published" : "draft";
  const price = (p: any) =>
    group(p) === "gas"
      ? Number.isFinite(gas?.priceKobo) && gas.priceKobo > 0
        ? gas.priceKobo
        : null
      : p.price_kobo;
  const items = data.products
    .filter(
      (p: any) =>
        (tab === "all" || group(p) === tab) &&
        (!category || p.category === category) &&
        (!status || productStatus(p) === status) &&
        (!location || location === branch) &&
        [p.name, p.sku, p.category]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a: any, b: any) =>
      sort === "price"
        ? (price(a) ?? Infinity) - (price(b) ?? Infinity)
        : sort === "stock"
          ? Number(b.available) - Number(a.available)
          : a.name.localeCompare(b.name),
    );
  function validateImport() {
    try {
      const rows = parseProductImport(
        importText,
        data.categories,
        data.products.map((p: any) => p.id),
      );
      setPreview(rows);
      setImportError("");
    } catch (e: any) {
      setPreview([]);
      setImportError(e.message);
    }
  }
  async function importProducts() {
    setBusy(true);
    let saved = 0;
    try {
      for (const row of preview) {
        await api("product.import", row);
        saved++;
      }
      setMessage(
        `${saved} products created as unpublished drafts. Pricing, publication and stock require their existing workflows.`,
      );
      setImportText("");
      close();
    } catch (e: any) {
      setImportError(
        `${saved} drafts saved. Import stopped: ${e.message}. Saved rows have been removed from the input. Validate the remaining rows before retrying.`,
      );
      setPreview([]);
      setImportText(JSON.stringify(preview.slice(saved), null, 2));
    } finally {
      setVersion((v) => v + 1);
      setBusy(false);
    }
  }
  return (
    <section className="catalogue-screen">
      <div className="catalogue-heading">
        <div>
          <h1>Product Catalogue</h1>
          <p>
            Manage your products, prices, stock and visibility across your
            website, mobile app and sales operations.
          </p>
        </div>
        <div className="catalogue-heading-actions">
          {owner && (
            <>
              <button
                className="button secondary"
                onClick={() => open("import")}
              >
                <Upload size={18} /> Import Products
              </button>
              <div className="catalogue-add">
                <button className="button" onClick={() => open("edit")}>
                  <Plus size={20} /> Add Product
                </button>
                <details className="catalogue-menu">
                  <summary aria-label="More product actions">
                    <ChevronDown size={18} />
                  </summary>
                  <div className="catalogue-menu-panel">
                    <button onClick={() => open("tools")}>
                      Categories, Images &amp; Variants
                    </button>
                    <button onClick={() => open("verify")}>
                      Verify Identity
                    </button>
                    <Link href="/admin/settings">Pricing &amp; Visibility</Link>
                  </div>
                </details>
              </div>
            </>
          )}
        </div>
      </div>
      {error && <Notice type="error" message={error} />}{" "}
      {message && <Notice type="success" message={message} />}
      <div className="catalogue-categories">
        {groups.map((g) => (
          <button
            key={g.id}
            className={`catalogue-category ${g.id} ${tab === g.id ? "selected" : ""}`}
            onClick={() => {
              setTab(g.id);
              setCategory("");
            }}
            aria-pressed={tab === g.id}
          >
            <span>
              <g.icon size={27} />
            </span>
            <div>
              <strong>{g.label}</strong>
              <small>
                {
                  data.products.filter(
                    (p: any) => g.id === "all" || group(p) === g.id,
                  ).length
                }{" "}
                products
              </small>
            </div>
          </button>
        ))}
      </div>
      <div className="catalogue-filters">
        <label className="catalogue-search">
          <Search size={20} />
          <input
            aria-label="Search products"
            placeholder="Search products by name, SKU or category..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="Filter category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All Categories</option>
          {data.categories.map((c: string) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          aria-label="Filter status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        <select
          aria-label="Filter location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        >
          <option value="">All Locations</option>
          {(data.branches ?? [{ id: branch, name: branch }]).map((b: any) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <label className="catalogue-sort">
          <ArrowUpDown size={17} />
          <select
            aria-label="Sort products"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="name">Sort by name</option>
            <option value="price">Price: low to high</option>
            <option value="stock">Stock: high to low</option>
          </select>
        </label>
        <div className="catalogue-view">
          <button
            aria-label="Grid view"
            aria-pressed={view === "grid"}
            className={view === "grid" ? "selected" : ""}
            onClick={() => setView("grid")}
          >
            <LayoutGrid size={20} />
          </button>
          <button
            aria-label="List view"
            aria-pressed={view === "list"}
            className={view === "list" ? "selected" : ""}
            onClick={() => setView("list")}
          >
            <List size={21} />
          </button>
        </div>
      </div>
      <div className={`catalogue-products ${view}`}>
        {items.map((p: any) => (
          <article className="catalogue-card" key={p.id}>
            <ProductArt product={p} />
            <div className="catalogue-card-content">
              <div className="catalogue-card-top">
                <span className={`catalogue-status ${productStatus(p)}`}>
                  <i />
                  {productStatus(p) === "published"
                    ? "Published"
                    : productStatus(p) === "archived"
                      ? "Archived"
                      : "Draft"}
                </span>
                <details className="catalogue-menu">
                  <summary aria-label={`Actions for ${p.name}`}>
                    <MoreHorizontal size={20} />
                  </summary>
                  <div className="catalogue-menu-panel">
                    {owner && (
                      <button onClick={() => open("tools", p)}>
                        Images, Specifications &amp; Archive
                      </button>
                    )}
                    <Link href="/admin/settings">
                      Manage Pricing &amp; Visibility
                    </Link>
                    <Link href="/admin/inventory">Manage Stock</Link>
                  </div>
                </details>
              </div>
              <h2>{p.name}</h2>
              <div className="catalogue-tags">
                <span className={group(p)}>
                  {groups.find((g) => g.id === group(p))?.label}
                </span>
                <span>
                  {group(p) === "gas" ? "Service Product" : "Physical Product"}
                </span>
              </div>
              <p className="catalogue-description">{p.description}</p>
              <strong className="catalogue-price">
                {money(price(p))}
                {group(p) === "gas" && price(p) !== null && (
                  <small> / kg</small>
                )}
              </strong>
              <p className="catalogue-stock">
                {group(p) === "gas" ? (
                  <>
                    <Flame size={17} />
                    {price(p) ? "Priced per kilogram" : "Price not configured"}
                    <span>•</span>Quoted at checkout
                  </>
                ) : (
                  <>
                    <Package size={17} />
                    {p.available} in stock<span>•</span>
                    {branch.replaceAll("-", " ")}
                  </>
                )}
              </p>
              <div className="catalogue-card-actions">
                {owner && (
                  <button
                    className="button secondary"
                    onClick={() => open("edit", p)}
                  >
                    Edit
                  </button>
                )}
                <button
                  className="button secondary"
                  onClick={() => open("details", p)}
                >
                  View Details
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {!items.length && (
        <div className="catalogue-empty">
          <Package size={34} />
          <h2>No matching products</h2>
          <p>Try another search or clear your filters.</p>
          <button
            className="button secondary"
            onClick={() => {
              setQuery("");
              setTab("all");
              setCategory("");
              setStatus("");
              setLocation("");
            }}
          >
            Clear Filters
          </button>
        </div>
      )}
      <p className="catalogue-scope">
        <MapPin size={16} /> Stock and publication reflect your{" "}
        {branch.replaceAll("-", " ")} branch. Cooking gas uses the current
        approved per-kilogram rate.
      </p>
      {modal && (
        <Modal
          title={
            modal === "edit"
              ? target
                ? "Edit Product"
                : "Add Product"
              : modal === "tools"
                ? "Product Tools"
                : modal === "import"
                  ? "Import Products"
                  : modal === "verify"
                    ? "Verify Identity"
                    : "Product Details"
          }
          onClose={busy ? () => {} : close}
        >
          {modal === "edit" && (
            <>
              <p>
                Product content is shared across branches. Pricing and
                publication use independent approvals.
              </p>
              <CatalogueEditor
                initialId={target?.id ?? "new"}
                onSaved={() => {
                  setVersion((v) => v + 1);
                  close();
                }}
              />
            </>
          )}
          {modal === "tools" && (
            <CatalogueTools user={user} initialId={target?.id ?? ""} />
          )}
          {modal === "verify" && (
            <ServiceForm
              title="Confirm your password"
              fields={[
                {
                  name: "password",
                  label: "Current password",
                  type: "password",
                },
              ]}
              send={(v) => api("reauth", v)}
              done={close}
            />
          )}
          {modal === "details" && target && (
            <>
              <ProductArt product={target} large />
              <h3>{target.name}</h3>
              <p>{target.description}</p>
              <dl>
                <dt>SKU</dt>
                <dd>{target.sku}</dd>
                <dt>Category</dt>
                <dd>{target.category}</dd>
                <dt>Safety information</dt>
                <dd>{target.safety}</dd>
                <dt>Price</dt>
                <dd>
                  {money(price(target))}
                  {group(target) === "gas" ? " per kg" : ""}
                </dd>
                <dt>Availability</dt>
                <dd>
                  {group(target) === "gas"
                    ? "Quantity quoted in kilograms at checkout"
                    : `${target.available} units available at ${branch}`}
                </dd>
              </dl>
              <Link className="button secondary" href="/admin/settings">
                Manage Pricing &amp; Visibility
              </Link>
            </>
          )}
          {modal === "import" && (
            <>
              <p>
                Import up to 25 new products as unpublished drafts using a CSV
                template or JSON. Existing products, prices and stock are never
                replaced. Verify your identity first using Add Product’s menu.
              </p>
              <p>
                Required fields: id, name, description, category, sizeKg (or
                null), asset (cylinder, burner, hose, regulator or kit), safety.
                Use an active category: {data.categories.join(", ")}.
              </p>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => {
                  const blob = new Blob(
                    [
                      productImportTemplate(
                        data.categories.includes("Accessories")
                          ? "Accessories"
                          : data.categories[0],
                      ),
                    ],
                    { type: "text/csv;charset=utf-8" },
                  );
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = "easygas-products-import-template.csv";
                  link.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                }}
              >
                <Download size={18} /> Download CSV Template
              </button>
              <p>
                Open the template in Excel or Google Sheets. Replace the example
                row, add one product per row and save as CSV (UTF-8). Keep the
                column headers. Leave sizeKg blank for accessories. Maximum 25
                products and 100 KB per file. The example row cannot be
                imported.
              </p>
              <label>
                <FieldCaption required={false}>Upload CSV or JSON file</FieldCaption>
                <input
                  type="file"
                  accept=".csv,text/csv,.json,application/json"
                  disabled={busy}
                  onChange={async (e) => {
                    setPreview([]);
                    setImportText("");
                    setImportError("");
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size > 100000) {
                      setImportError("File must be under 100 KB.");
                      return;
                    }
                    try {
                      setImportText(await f.text());
                    } catch {
                      setImportError(
                        "Could not read this file. Select it again.",
                      );
                    }
                    setPreview([]);
                  }}
                />
              </label>
              <label>
                <FieldCaption required={true}>CSV or JSON contents</FieldCaption>
                <textarea
                  rows={8}
                  value={importText}
                  disabled={busy}
                  onChange={(e) => {
                    setImportError("");
                    setImportText(e.target.value);
                    setPreview([]);
                  }}
                />
              </label>
              {importError && <Notice type="error" message={importError} />}
              <button
                className="button secondary"
                disabled={busy}
                onClick={validateImport}
              >
                Validate &amp; Preview
              </button>
              {preview.length > 0 && (
                <>
                  <ul>
                    {preview.map((p) => (
                      <li key={p.id}>
                        {p.name} · {p.id} · {p.category}
                      </li>
                    ))}
                  </ul>
                  <button
                    className="button"
                    disabled={busy}
                    onClick={importProducts}
                  >
                    {busy
                      ? "Importing…"
                      : `Create ${preview.length} Draft Products`}
                  </button>
                </>
              )}
            </>
          )}
        </Modal>
      )}
    </section>
  );
}
