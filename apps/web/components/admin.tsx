"use client";
import { useRecordsData as useData } from "./use-records-data";
import { approvalStatusLabel } from "../../../packages/business-rules/src/approval-progress";
import { FieldCaption } from "./field-caption";
import DriverExperience from "./driver-experience";
import TechnicianWorkspace from "./technician-workspace";
import DriversWorkspace from "./drivers-workspace";
import { privilegeById } from "../../../packages/business-rules/src/staff-privileges";
import { NotificationsTray } from "./notifications-tray";
import SettingForm from "./setting-change-form";
import SettingsPurposeGroup from "./settings-purpose-group";
import SettingVersionHistory from "./setting-version-history";
import { settingRestorationResult } from "../../../packages/business-rules/src/setting-editor";
import { settingsApprovalBadge, settingsCategoryDescriptions, settingsCategories, settingsDisplayCategory, settingsDisplay, settingsGroups } from "../../../packages/business-rules/src/settings-categories";
import { appAlert } from "./app-dialog";
import { FormInput } from "./password-input";
import SettingSummary, { readableSetting } from "./setting-summary";
import InventoryWorkspace from "./inventory-workspace";
import AdminOverview from "./admin-overview";
import AuditHistory from "./audit-history";
import OwnerGovernanceLinks from "./owner-governance-links";
import AdminSearch from "./admin-search";

import { OperationsExtensions } from "./operations-completion";
import AssistedOrder from "./assisted-order";
import AdminOrderDetails from "./admin-order-details";
import DispatchTracking from "./order-tracking";
import DispatchCentre from "./dispatch-centre";
import { ThemeToggle } from "./theme-provider";
import { TestimonialManagement } from "./testimonials";

import AdminNavigation, { roleLabel } from "./admin-navigation";
import {
  navigationItems,
  failedNavigationSnapshot,
  refreshingNavigationSnapshot,
} from "../../../packages/business-rules/src/admin-navigation";
import { BusinessCentre } from "./business-centre";
import GasDeliveryAdmin from "./gas-delivery-admin";
import CustomerManagement from "./customer-management";
import StaffManagement from "./staff-management";
import Readiness from "./readiness";
import ProfessionalServices from "./professional-services";
import ProductCatalogue from "./product-catalogue";
import BundleAdmin from "./bundles";
import Reconciliation from "./reconciliation";
import PolicyAdmin from "./policies";
import RecommendationAdmin from "./recommendations";
import {
  ActionForm,
  Campaigns,
  CreditManagement,
  PointOfSale,
  OperationsWorkspace,
  SupportDesk,
} from "./workflows";
import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type FormEvent,
} from "react";
import Link, { WorkspaceAccess } from "./workspace-link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  House,
  ClipboardList,
  UsersRound,
  Package,
  Truck,
  Wallet,
  ChartNoAxesCombined,
  Settings2,
  ShieldCheck,
  Bell,
  Search,
  CircleHelp,
  ChevronDown,
  ArrowRight,
  Plus,
  Check,
  X,
  RefreshCw,
  CalendarDays,
  Flame,
  LogOut,
  Menu,
  History,
  Banknote,
  ClipboardCheck,
  AlertCircle,
  Leaf,
  Boxes,
  Download,
  LockKeyhole,
  SlidersHorizontal,
  Clock,
} from "lucide-react";
import {
  Logo,
  Empty,
  Loading,
  Notice,
  Modal,
  api,
  money,
  ProductArt,
} from "./ui";
import OperationalIncidents from "./operational-incidents";
export default function Admin({
  section,
  initialAccess,
  initialCollapsed = false,
}: {
  section: string;
  initialAccess: any;
  initialCollapsed?: boolean;
}) {
  const [user, setUser] = useState<any>(initialAccess.user),
    [access, setAccess] = useState<any>(initialAccess),
    [collapsed, setCollapsed] = useState(initialCollapsed),
    [showNotifications, setShowNotifications] = useState(false),
    [menu, setMenu] = useState(false),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0),
    [verify, setVerify] = useState(false),
    [verified, setVerified] = useState(false);
  const router = useRouter();
  const signingOut = useRef(false);
  const closeMenu = useCallback(() => setMenu(false), []);
  useEffect(() => {
    let live = true,
      inFlight = false,
      pendingController: AbortController | undefined;
    async function update() {
      if (
        signingOut.current ||
        inFlight ||
        document.visibilityState === "hidden"
      )
        return;
      inFlight = true;
      setAccess(refreshingNavigationSnapshot);
      const controller = new AbortController();
      pendingController = controller;
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const d = await api("navigation", undefined, {
          signal: controller.signal,
        });
        if (!live || signingOut.current) return;
        setUser(d.user);
        setAccess(d);
        setError("");
        if (!d.allowed.includes(section) && d.allowed.length) {
          const destination = navigationItems.find(n => d.allowed.includes(n.id));
          if (destination) router.replace(destination.href);
        }
      } catch (e: any) {
        if (!live) return;
        setAccess(failedNavigationSnapshot);
        if ([401, 403].includes(e.status)) {
          setUser(null);
          setAccess(null);
          setShowNotifications(false);
          router.replace(e.status === 401 ? "/login" : "/account");
        } else
          setError(
            "Workspace counts could not refresh. Any visible counts are from the last successful check.",
          );
      } finally {
        clearTimeout(timeout);
        inFlight = false;
        pendingController = undefined;
      }
    }
    void update();
    const timer = setInterval(update, 30000);
    let committedTimer: ReturnType<typeof setTimeout> | undefined;
    const committed = () => {
      clearTimeout(committedTimer);
      committedTimer = setTimeout(update, 300);
    };
    window.addEventListener("easygas:committed", committed);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      live = false;
      pendingController?.abort();
      clearInterval(timer);
      clearTimeout(committedTimer);
      window.removeEventListener("easygas:committed", committed);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [refresh, router, section]);
  async function logout() {
    if (signingOut.current) return;
    signingOut.current = true;
    try {
      await api("logout", {});
      setUser(null);
      setAccess(null);
      setShowNotifications(false);
      try {
        sessionStorage.removeItem("easygas.deliveryDraft");
        sessionStorage.removeItem("easygas.pendingCheckout");
      } catch {}
      // Clear cached protected router payloads as well as the authenticated session.
      window.location.assign("/login");
    } catch (error: any) {
      signingOut.current = false;
      setError(
        error.message ?? "Sign out could not complete. Please try again.",
      );
    }
  }
  return (
    <WorkspaceAccess.Provider value={access?.allowed ?? []}>
    <div
      className={`admin-shell workspace-shell ${collapsed ? "sidebar-compact" : ""}`}
    >
      <AdminNavigation
        user={user}
        access={access}
        open={menu}
        onClose={closeMenu}
        onLogout={logout}
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
      />
      <div className="admin-main">
        <header className="admin-header">
          <button
            className="icon-button admin-menu"
            id="workspace-menu-toggle"
            aria-label="Toggle business menu"
            aria-expanded={menu}
            aria-controls="workspace-navigation"
            onClick={() => setMenu(!menu)}
          >
            <Menu />
          </button>
          <AdminSearch
            identity={`${user?.id}:${user?.role}:${user?.branchId}`}
          />
          <div className="admin-header-actions">
            <ThemeToggle />
            <button
              className="icon-button"
              aria-label="Refresh information"
              onClick={() => setRefresh((n) => n + 1)}
            >
              <RefreshCw size={17} />
            </button>
            <button
              className="icon-button notification-toggle"
              aria-label="View notifications"
              aria-haspopup="dialog"
              aria-expanded={showNotifications}
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell size={19} />
              {Number(access?.unreadNotifications) > 0 && (
                <span className="ac-unread-count">
                  {Number(access.unreadNotifications) > 99
                    ? "99+"
                    : access.unreadNotifications}
                </span>
              )}
            </button>
            <Link href="/help" className="icon-button" aria-label="Help">
              <CircleHelp size={19} />
            </Link>
            <details className="workspace-account-menu">
              <summary className="admin-person" aria-label="Account menu">
                <span className="avatar">{user?.name?.slice(0, 1) ?? "E"}</span>
                <span>
                  <strong>{user?.name ?? "Your account"}</strong>
                  <small>{roleLabel(user?.role ?? "")}</small>
                </span>
                <ChevronDown size={14} />
              </summary>
              <div>
                <Link href="/account">View Profile</Link>
                <Link href="/help">Help &amp; Support</Link>
                <button onClick={() => setVerify(true)}>Verify Identity</button>
                <button onClick={logout}>Sign Out</button>
              </div>
            </details>
          </div>
        </header>
        {showNotifications && (
          <NotificationsTray
            key={user?.id}
            onClose={() => setShowNotifications(false)}
            onRead={() => setRefresh((value) => value + 1)}
          />
        )}
        <main
          className="admin-content"
          id="workspace-content"
          key={`${user?.id}:${user?.role}:${user?.branchId}`}
        >
          {user &&
            access?.allowed?.includes(section) &&
            !(
              section === "deliveries" &&
              ["owner", "manager", "driver"].includes(user.role)
            ) && <OperationsExtensions section={section} user={user} />}
          {error && <Notice type="error" message={error} />}
          <div className="admin-breadcrumb">
            Workspace <span>/</span>{" "}
            {navigationItems.find((n) => n.id === section)?.label}
          </div>
          {user?.role === "owner" && access?.allowed?.includes(section) && (
            <OwnerGovernanceLinks section={section} allowed={access.allowed} />
          )}
          {!user ? (
            <Loading />
          ) : !access?.allowed?.includes(section) ? (
            <p role="status">{access?.allowed?.length ? "Opening your workspace…" : "No workspace menus are assigned. Contact your administrator to arrange access."}</p>
          ) : section === "deliveries" && user.role === "driver" ? (
            <DriverExperience userId={user.id} />
          ) : section === "drivers" ? (
            <DriversWorkspace refresh={refresh} />
          ) : section === "testimonials" ? (
            <TestimonialManagement />
          ) : section === "policies" ? (
            <PolicyAdmin user={user} />
          ) : section === "readiness" ? (
            <Readiness />
          ) : section === "bundles" ? (
            <BundleAdmin user={user} />
          ) : section === "recommendations" ? (
            <RecommendationAdmin user={user} />
          ) : section === "reconciliation" ? (
            <Reconciliation user={user} />
          ) : section === "incidents" ? (
            <OperationalIncidents key={`${user.id}:${user.role}:${user.branchId}`} refresh={refresh} />
          ) : section === "bookings" && user.role === "technician" ? (
            <TechnicianWorkspace key={`${user.id}:${user.branchId}`} user={user} />
          ) : [
              "services",
              "bookings",
              "technicians",
              "quotations",
            ].includes(section) ? (
            <ProfessionalServices
              user={user}
              mode={section === "services" ? "catalogue" : section}
            />
          ) : section === "dashboard" ? (
            <AdminOverview user={user} />
          ) : section === "campaigns" ? (
            <Campaigns />
          ) : section === "pos" ? (
            <PointOfSale />
          ) : section === "credits" ? (
            <CreditManagement />
          ) : section === "operations" ? (
            <OperationsWorkspace isOwner={user.role === "owner"} />
          ) : section === "support" ? (
            <SupportDesk staff />
          ) : section === "customers" ? (
            <CustomerManagement />
          ) : section === "staff" ? (
            <StaffManagement user={user} refresh={refresh} />
          ) : section === "settings" ? (
            <Settings
              user={user}
              refresh={refresh}
              onChange={() => setRefresh((n) => n + 1)}
              verify={() => setVerify(true)}
            />
          ) : section === "approvals" ? (
            <Approvals
              user={user}
              refresh={refresh}
              onChange={() => setRefresh((n) => n + 1)}
              verify={() => setVerify(true)}
            />
          ) : section === "inventory" ? (
            <InventoryWorkspace user={user} />
          ) : section === "reports" || section === "finance" ? (
            <BusinessCentre
              mode={section === "finance" ? "finance" : "reports"}
              user={user}
            />
          ) : section === "audit" ? (
            <AuditHistory refresh={refresh} />
          ) : section === "products" ? (
            <ProductCatalogue user={user} />
          ) : (
            <Records
              key={JSON.stringify([section, user.id, user.role, user.branch_id ?? user.branchId])}
              section={section}
              refresh={refresh}
              user={user}
              onChange={() => setRefresh((n) => n + 1)}
            />
          )}
        </main>
        <div className="admin-footnote">
          <ShieldCheck size={13} />
          EasyGas Business · NGN · Africa/Lagos
        </div>
      </div>
      {verify && (
        <Modal title="Verify it’s you" onClose={() => setVerify(false)}>
          <p>
            Confirm your password to authorise sensitive actions for the next
            five minutes.
          </p>
          <VerifyForm
            onDone={() => {
              setVerify(false);
              setVerified(true);
            }}
          />
        </Modal>
      )}
      {verified && (
        <div className="toast" role="status" onClick={() => setVerified(false)}>
          <ShieldCheck size={18} />
          Identity verified. You can continue your action.
        </div>
      )}
    </div>
    </WorkspaceAccess.Provider>
  );
}
function VerifyForm({ onDone }: { onDone: () => void }) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          await api(
            "reauth",
            Object.fromEntries(new FormData(e.currentTarget)),
          );
          onDone();
        } catch (e: any) {
          setError(e.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        <FieldCaption required={true}>Password</FieldCaption>
        <FormInput
          name="password"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
        />
      </label>
      {error && <Notice message={error} type="error" />}
      <button className="button full" disabled={busy}>
        {busy ? "Verifying…" : "Verify Password"}
        <LockKeyhole size={17} />
      </button>
    </form>
  );
}
function Dashboard({ user, refresh }: { user: any; refresh: number }) {
  const { data, error } = useData("dashboard", refresh),
    orders = useData("orders", refresh),
    inventory = useData("inventory", refresh);
  if (error) return <Notice type="error" message={error} />;
  if (!data) return <Loading />;
  const low =
    inventory.data?.filter(
      (i: any) => i.quantity - i.reserved <= i.threshold,
    ) ?? [];
  return (
    <>
      <section className="dashboard-hero">
        <div>
          <p>
            Welcome back, {user.name.split(" ")[0]} <span>👋</span>
          </p>
          <h1>
            Your gas business,
            <br className="dashboard-break" /> <em>smarter every day.</em>
          </h1>
          <p>Track sales, manage deliveries, keep your customers cooking.</p>
        </div>
        <div className="dashboard-hero-image" />
      </section>
      <div className="metric-grid">
        {[
          [
            ChartNoAxesCombined,
            "Verified revenue",
            money(data.revenueKobo),
            "finance",
            "Verified payments only",
          ],
          [
            ClipboardList,
            "Total orders",
            data.orders,
            "orders",
            "All recorded orders",
          ],
          [
            Truck,
            "Pending deliveries",
            data.pending,
            "deliveries",
            "Awaiting completion",
          ],
          [
            UsersRound,
            "Customers",
            data.customers,
            "customers",
            "In your authorised scope",
          ],
          [
            Flame,
            "Available stock",
            Number(data.inventory).toLocaleString(),
            "inventory",
            `${low.length} items at reorder level`,
          ],
        ].map(([Icon, label, value, href, subtitle]: any, i) => (
          <Link href={`/admin/${href}`} className="metric" key={label}>
            <span className={`metric-icon color-${i}`}>
              <Icon size={23} />
            </span>
            <div>
              <span>{label}</span>
              <h2>{value}</h2>
              <small>{subtitle}</small>
            </div>
          </Link>
        ))}
      </div>
      <div className="dashboard-feature-row">
        <section className="forecast-feature">
          <div>
            <span className="eyebrow">SMARTER REFILLS START WITH HISTORY</span>
            <h2>Never miss a refill opportunity.</h2>
            <p>
              Understand your customers’ cooking rhythm with estimates based on
              verified refill history.
            </p>
            <Link className="button white" href="/admin/reports">
              View Business Reports <ArrowRight size={16} />
            </Link>
          </div>
          <img
            src="/assets/cylinder-illustration.png"
            alt="Illustrative cylinder"
          />
        </section>
        <section className="surface quick-actions">
          <div className="section-heading">
            <h2>Make things happen</h2>
            <span className="text-link">Quick actions</span>
          </div>
          <div>
            {[
              [Package, "Products", "products"],
              [Boxes, "Receive Stock", "inventory"],
              [Truck, "Manage Deliveries", "deliveries"],
              [ClipboardCheck, "Review Approvals", "approvals"],
              [UsersRound, "Customers", "customers"],
              [Settings2, "Business Settings", "settings"],
            ].map(([Icon, title, href]: any, i) => (
              <Link href={`/admin/${href}`} key={href}>
                <span className={`quick-icon color-${i}`}>
                  <Icon size={20} />
                </span>
                {title}
              </Link>
            ))}
          </div>
        </section>
      </div>
      <div className="dashboard-lower">
        <section className="surface">
          <div className="section-heading">
            <h2>Sales Overview</h2>
            <span className="date-pill">
              <CalendarDays size={13} />
              Verified records
            </span>
          </div>
          <div className="chart-empty">
            <div className="chart-grid-lines">
              <span>₦</span>
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="chart-message">
              <ChartNoAxesCombined size={29} />
              <h3>
                {data.revenueKobo
                  ? "Your verified sales are recorded."
                  : "Your first sale starts the story."}
              </h3>
              <p>
                {data.revenueKobo
                  ? "Open financial reports to review payment records."
                  : "Revenue will appear when real payments are verified."}
              </p>
              <Link href="/admin/finance" className="text-link">
                View payment records <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>
        <section className="surface">
          <div className="section-heading">
            <h2>Recent Orders</h2>
            <Link className="text-link" href="/admin/orders">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {orders.data?.length ? (
            orders.data.slice(0, 5).map((o: any) => (
              <Link href="/admin/orders" className="mini-order" key={o.id}>
                <span className="avatar">{o.customer_name[0]}</span>
                <div>
                  <strong>{o.customer_name}</strong>
                  <small>{o.reference}</small>
                </div>
                <strong>{money(o.total_kobo)}</strong>
                <span className={`status ${o.status}`}>
                  {o.status.replaceAll("_", " ")}
                </span>
              </Link>
            ))
          ) : (
            <Empty icon={ClipboardList} title="Ready for your first order.">
              Customer orders will appear here as they arrive.
            </Empty>
          )}
        </section>
      </div>
      <section className="surface stock-overview">
        <div className="section-heading">
          <h2>Inventory at a glance</h2>
          <Link className="text-link" href="/admin/inventory">
            Manage stock <ArrowRight size={14} />
          </Link>
        </div>
        {inventory.data && (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Available</th>
                  <th>Reserved</th>
                  <th>Reorder level</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {inventory.data.slice(0, 5).map((i: any) => (
                  <tr key={i.product_id}>
                    <td>{i.name}</td>
                    <td>{i.quantity - i.reserved}</td>
                    <td>{i.reserved}</td>
                    <td>{i.threshold}</td>
                    <td>
                      <span
                        className={`status ${i.quantity - i.reserved <= i.threshold ? "pending_approval" : "active"}`}
                      >
                        {i.quantity - i.reserved <= i.threshold
                          ? "Stock needed"
                          : "In stock"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
function AdminProducts() {
  const { data, error } = useData("products.manage");
  return (
    <>
      <AdminHeading
        title="Your product catalogue"
        text="One catalogue for your website, mobile application and sales operations."
        action={
          <Link className="button" href="/admin/settings">
            <Settings2 size={16} />
            Manage Pricing & Visibility
          </Link>
        }
      />
      {error ? (
        <Notice type="error" message={error} />
      ) : !data ? (
        <Loading />
      ) : (
        <div className="admin-product-grid">
          {data.products.map((p: any) => (
            <div className="surface" key={p.id}>
              <ProductArt product={p} />
              <div className="section-heading">
                <h3>{p.name}</h3>
                <span
                  className={`status ${p.published ? "active" : "pending_approval"}`}
                >
                  {p.published ? "Published" : "Draft"}
                </span>
              </div>
              <p>{p.description}</p>
              <strong>{money(p.price_kobo)}</strong>
              <small>
                {p.available} available · Illustrative product image
              </small>
              <Link className="text-link" href="/admin/settings">
                Request a price change <ArrowRight size={14} />
              </Link>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
function AdminHeading({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="admin-heading">
      <div>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      {action}
    </div>
  );
}
function Settings({
  user,
  refresh,
  onChange,
  verify,
}: {
  user: any;
  refresh: number;
  onChange: () => void;
  verify: () => void;
}) {
  const setupParams = useSearchParams();
  const settingsScope = setupParams.get("scope") || user.branchId || "lagos";
  const { data, error } = useData(
      `settings?scope=${encodeURIComponent(settingsScope)}`,
      refresh,
    ),
    [category, setCategory] = useState(""),
    [query, setQuery] = useState(""),
    [editing, setEditing] = useState<any>(null),
    [settingBusy, setSettingBusy] = useState(false),
    [history, setHistory] = useState<any>(null),
    [historyBusy, setHistoryBusy] = useState(false),
    [historyError, setHistoryError] = useState(""),
    [message, setMessage] = useState(""),
    [actionError, setActionError] = useState("");
  useEffect(() => { setQuery(setupParams.get("q") ?? ""); setCategory(setupParams.get("category") ?? ""); setEditing(null); setHistory(null); }, [setupParams]);
  const categories = settingsCategories(data ?? []);
  const current = categories.includes(category) ? category : categories[0];
  return (
    <>
      <AdminHeading
        title="Business settings"
        text="The right controls. The right people. Every change accounted for."
        action={
          <button className="button secondary" onClick={verify}>
            <ShieldCheck size={17} />
            Verify Identity
          </button>
        }
      />
      <p className="muted">Settings branch: {settingsScope}</p>
      {data && (
        <details className="settings-tools">
          <summary>Gas stock, pricing and delivery tools</summary>
          <GasDeliveryAdmin
            user={user}
            settings={data}
            onEdit={setEditing}
            refresh={refresh}
            onRefresh={onChange}
          />
        </details>
      )}
      {message && <Notice type="success" message={message} />}
      {actionError && <Notice type="error" message={actionError} />}
      <div className="settings-layout">
        <aside className="settings-nav">
          <div className="input-icon">
            <Search size={15} />
            <FormInput
              aria-label="Search settings"
              placeholder="Find a setting…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {categories.map((c: string) => (
            <button
              className={c === current ? "active" : ""}
              key={c}
              aria-pressed={c === current && !query}
              onClick={() => {
                setCategory(c);
                setQuery("");
              }}
            >
              <Settings2 size={16} />
              {c}
              <ArrowRight size={13} />
            </button>
          ))}
          <div className="governance-note">
            <ShieldCheck size={25} />
            <strong>Built on accountability.</strong>
            <p>
              Viewing a setting does not grant permission to change or approve
              it.
            </p>
            <Link href="/admin/approvals">
              Open Approval Centre <ArrowRight size={13} />
            </Link>
          </div>
        </aside>
        <section>
          {error ? (
            <Notice type="error" message={error} />
          ) : !data ? (
            <Loading />
          ) : (
            <>
              <div className="section-heading">
                <h2>{query.trim() ? "Search results" : current}</h2>
                <span className="branch-badge">
                  <span />
                  {user.branchId ?? "Lagos"}
                </span>
              </div>
              {!query.trim() && settingsCategoryDescriptions[current] && <p className="settings-purpose-intro">{settingsCategoryDescriptions[current]}</p>}
              {query.trim() && !settingsGroups(data, current, query).length && (
                  <p className="settings-empty" role="status">
                    No settings match “{query}”. Try another word or choose a
                    category.
                  </p>
                )}
              {settingsGroups(data, current, query).map((group) => (
                <SettingsPurposeGroup key={group.id} title={query.trim() && group.title !== group.category ? `${group.category} · ${group.title}` : group.title} advanced={group.advanced} searching={!!query.trim()}>
                {group.settings.map((d: any) => (
                  <article className="setting-card" key={d.key}>
                    <div className="setting-top">
                      <div>
                        <h3>{settingsDisplay(d).label}</h3>
                        <p>{settingsDisplay(d).description}</p>
                      </div>
                      <span className={`risk risk-${d.risk}`} title={settingsApprovalBadge(d, user.role).detail}>
                        {settingsApprovalBadge(d, user.role).label}
                      </span>
                    </div>
                    <div className="setting-value-row">
                      <div>
                        <small>ACTIVE VALUE · VERSION {d.version}</small>
                        <SettingSummary value={d.value} type={d.value_type} />
                      </div>
                      <div className="setting-actions">
                        <button
                          className="icon-button"
                          aria-label={`View ${settingsDisplay(d).label} history`}
                          onClick={async () => {
                            setActionError("");
                            setHistoryError("");
                            try {
                              setHistory({
                                setting: settingsDisplay(d),
                                versions: await api(
                                  `setting.history?key=${encodeURIComponent(d.key)}&scope=${d.scope}`,
                                ),
                              });
                            } catch (e: any) {
                              setActionError(e.message);
                            }
                          }}
                        >
                          <History size={17} />
                        </button>
                        {d.propose_roles.includes(user.role) && (
                          <button
                            className="button secondary"
                            onClick={() => {
                              if (d.key === "payment.integration" && d.value !== true) {
                                const gateway = data.find((setting: any) => setting.key === "payment.gateway");
                                if (gateway?.propose_roles.includes(user.role)) {
                                  setCategory(settingsDisplayCategory(gateway));
                                  setQuery("");
                                  setEditing(settingsDisplay(gateway));
                                } else setActionError("Ask an authorised owner or finance administrator to configure Online payments & fees.");
                              } else setEditing(settingsDisplay(d));
                            }}
                          >
                            {d.key === "payment.integration" && d.value !== true ? "Open online payment settings" : d.risk === 1 ? "Edit Setting" : "Propose Change"}
                            <ArrowRight size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="setting-owner">
                      <LockKeyhole size={12} />
                      Owner: {d.owner_role} ·{" "}
                      {d.owner_auto_approval
                        ? "Admin requests: automatic approval; activation checks remain"
                        : d.risk === 4
                          ? "Two distinct authorised approvers + identity verification"
                          : d.risk === 1
                            ? "Changes take effect immediately"
                            : "Independent approval required"}
                    </div>
                  </article>
                ))}
                </SettingsPurposeGroup>
              ))}
            </>
          )}
        </section>
      </div>
      {editing && (
        <Modal
          title={editing.label}
          className="settings-change-dialog"
          busy={settingBusy}
          onClose={() => setEditing(null)}
        >
          <SettingForm
            setting={editing}
            userId={user.id}
            onBusyChange={setSettingBusy}
            onDone={(result) => {
              setActionError(
                result?.status === "failed" || result?.status === "superseded"
                  ? result.failure_reason ||
                      "The change could not be activated. Review this request in the Approval Centre."
                  : "",
              );
              setEditing(null);
              setMessage(
                result?.status === "failed" || result?.status === "superseded"
                  ? ""
                  : result?.status === "draft"
                    ? "Draft saved. It is not active until submitted."
                    : result?.awaitingQualifiedReview
                      ? "Owner approval recorded automatically. An independent qualified safety review is still required before activation."
                      : result?.autoApproved
                        ? result.status === "scheduled"
                          ? "Automatically approved. It will apply on the selected effective date once activation checks pass."
                          : "Automatically approved and applied. Audit history recorded."
                        : editing.risk === 1
                          ? "Setting saved and audit history recorded."
                          : "Your request is awaiting independent approval. The current value remains active.",
              );
              onChange();
            }}
          />
        </Modal>
      )}
      {history && (
        <Modal
          title={`${history.setting.label} — history`}
          busy={historyBusy}
          onClose={() => setHistory(null)}
        >
          <SettingVersionHistory setting={history.setting} versions={history.versions} role={user.role} busy={historyBusy} error={historyError} onRestore={async (v) => {
            if (historyBusy) return;
            setHistoryBusy(true);
            setHistoryError("");
            setMessage("");
            try {
              const result = settingRestorationResult(await api("setting.rollback", {
                versionId: v.id,
                reason: `Restore the value preceding version ${v.version}.`,
              }));
              if (result.error) setHistoryError(result.error);
              else { setHistory(null); setMessage(result.message); }
              onChange();
            } catch (e: any) { setHistoryError(e.message); }
            finally { setHistoryBusy(false); }
          }} />
        </Modal>
      )}
    </>
  );
}
function formatValue(value: any, type?: string) {
  if (value === null) return "Not configured";
  if (type === "money") return money(value);
  if (typeof value === "boolean") return value ? "Enabled" : "Disabled";
  if (typeof value === "object") return readableSetting(value);
  return String(value);
}
function Approvals({
  user,
  refresh,
  onChange,
  verify,
}: {
  user: any;
  refresh: number;
  onChange: () => void;
  verify: () => void;
}) {
  const params = useSearchParams();
  const branchId = user.role === "owner" ? params.get("branchId") : null;
  const [selected, setSelected] = useState<any>(null),
    [filter, setFilter] = useState("all"),
    [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(1),
    [pageSize, setPageSize] = useState(10),
    [reason, setReason] = useState(""),
    [failure, setFailure] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);
  const { data: workspace, error } = useData(
    "approvals?" +
      new URLSearchParams({
        view: "paged",
        ...(branchId ? { branchId } : {}),
        page: String(page),
        pageSize: String(pageSize),
        q: query,
        filter,
      }),
    refresh,
  );
  const data = workspace?.rows,
    stats = workspace?.summary ?? {};
  async function decide(decision: string) {
    setBusy(true);
    setFailure("");
    try {
      await api("approval.decide", { id: selected.id, decision, reason });
      setSelected(null);
      onChange();
    } catch (e: any) {
      setFailure(e.message);
      if (e.code === "REAUTH_REQUIRED") verify();
    } finally {
      setBusy(false);
    }
  }
  const list = data;
  return (
    <div className="approval-centre">
      <AdminHeading
        title="Approval Centre"
        text="Review changes, manage decisions and track every approval in one place."
        action={
          <button className="button secondary" onClick={verify}>
            <LockKeyhole size={16} />
            Verify Identity
          </button>
        }
      />
      <div className="approval-overview" aria-label="Approval summary">
        {[
          ["Awaiting review", stats.pending, ClipboardCheck, "pending"],
          ["Scheduled", stats.scheduled, CalendarDays, "scheduled"],
          ["Activated", stats.active, ShieldCheck, "active"],
          ["Needs attention", stats.failed, AlertCircle, "failed"],
        ].map(([label, count, Icon, status]: any) => (
          <button
            key={status}
            className="surface approval-metric"
            onClick={() => {
              setFilter(status);
              setPage(1);
            }}
            aria-pressed={filter === status}
          >
            <span className={`approval-metric-icon ${status}`}>
              <Icon size={22} />
            </span>
            <span>
              {label}
              <strong>{count ?? "—"}</strong>
            </span>
          </button>
        ))}
      </div>
      <div className="approval-summary-caption">
        Totals across your authorised records. Search and filters apply to the
        request list below.
      </div>
      <div className="surface approval-request-panel">
        <div className="section-heading">
          <div>
            <h2>Change requests</h2>
            <p className="muted">
              Open a request to review its details and available actions.
            </p>
          </div>
          <label className="approval-search">
            <Search size={18} />
            <FormInput
              type="search"
              aria-label="Search approval requests"
              placeholder="Search request, ID or requester…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label className="approval-status-filter">
            <span>Status</span>
            <select
              className="small-select"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All requests</option>
              <option value="pending">Awaiting review</option>
              <option value="high">High risk</option>
              <option value="active">Active</option>
              <option value="rejected">Rejected</option>
              <option value="scheduled">Scheduled</option>
              {[
                "draft",
                "changes_requested",
                "approved",
                "partially_approved",
                "applying",
                "failed",
                "cancelled",
                "expired",
                "superseded",
                "rolled_back",
              ].map((s) => (
                <option key={s} value={s}>
                  {s.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
        </div>
        <nav
          className="approval-quick-filters"
          aria-label="Approval request filters"
        >
          {[
            ["all", "All requests", stats.total],
            ["pending", "Awaiting review", stats.pending],
            ["high", "High risk", stats.high],
            ["active", "Activated", stats.active],
          ].map(([value, label, count]: any) => (
            <button
              key={value}
              aria-pressed={filter === value}
              onClick={() => {
                setFilter(value);
                setPage(1);
              }}
            >
              {label}
              <span>{count ?? "—"}</span>
            </button>
          ))}
        </nav>
        {error ? (
          <Notice message={error} type="error" />
        ) : !list ? (
          <Loading />
        ) : !list.length ? (
          <Empty
            icon={ClipboardCheck}
            title={
              query || filter !== "all"
                ? "No requests match your filters."
                : "No change requests yet."
            }
          >
            Try another search or status. Submitted changes and decision
            histories appear here.
          </Empty>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Requested change</th>
                  <th>Requested by</th>
                  <th>Risk</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((r: any) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.label}</strong>
                      <small>
                        {r.id.slice(0, 8).toUpperCase()} · {r.scope}
                      </small>
                    </td>
                    <td><span className="approval-requested-by">Requested by</span>{r.requester}</td>
                    <td>
                      <span className={`risk risk-${r.risk}`}>
                        Level {r.risk}
                      </span>
                    </td>
                    <td>
                      <span className={`status ${r.status}`}>
                        {approvalStatusLabel(r)}
                      </span>
                    </td>
                    <td>
                      {new Date(r.created_at).toLocaleDateString("en-NG", {
                        timeZone: "Africa/Lagos",
                      })}
                    </td>
                    <td>
                      <button
                        className="button secondary approval-review-action"
                        onClick={() => {
                          setSelected(r);
                          setReason("");
                          setFailure("");
                        }}
                      >
                        Review{" "}
                        <ArrowRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <footer
          className="approval-pagination"
          aria-label="Approval pagination"
        >
          <span role="status">
            {workspace
              ? `Showing ${workspace.total ? (workspace.page - 1) * workspace.pageSize + 1 : 0}–${Math.min(workspace.page * workspace.pageSize, workspace.total)} of ${workspace.total} requests`
              : error
                ? "Requests unavailable"
                : "Loading requests…"}
          </span>
          <label>
            Rows per page
            <select
              aria-label="Approval rows per page"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <div className="approval-page-buttons">
            <button
              className="button secondary"
              disabled={!workspace || workspace.page <= 1}
              onClick={() => setPage(1)}
            >
              First
            </button>
            <button
              className="button secondary"
              disabled={!workspace || workspace.page <= 1}
              onClick={() => setPage(workspace.page - 1)}
            >
              Previous
            </button>
            <span>
              Page {workspace?.page ?? page} of{" "}
              {workspace
                ? Math.max(1, Math.ceil(workspace.total / workspace.pageSize))
                : "—"}
            </span>
            <button
              className="button secondary"
              disabled={
                !workspace ||
                workspace.page * workspace.pageSize >= workspace.total
              }
              onClick={() => setPage(workspace.page + 1)}
            >
              Next
            </button>
            <button
              className="button secondary"
              disabled={
                !workspace ||
                workspace.page * workspace.pageSize >= workspace.total
              }
              onClick={() =>
                setPage(
                  Math.max(1, Math.ceil(workspace.total / workspace.pageSize)),
                )
              }
            >
              Last
            </button>
          </div>
        </footer>
      </div>
      {selected && (
        <Modal
          title="Review requested change"
          onClose={() => setSelected(null)}
        >
          <div className="section-heading">
            <h3>{selected.label}</h3>
            <span className={`risk risk-${selected.risk}`}>
              Level {selected.risk}
            </span>
          </div>
          <p>
            Requested by <strong>{selected.requester}</strong> ·{" "}
            {selected.scope}
          </p>
          <p>
            {approvalStatusLabel(selected)} · Review progress is checked against the current request version
          </p>
          <Notice
            message={
              selected.owner_auto_approval && selected.approval_progress?.mode === "owner"
                ? "This business setting can be authorised by its requesting Admin. No second Admin is needed. Use Approve after verifying your identity. Effective date and activation checks still apply."
                : selected.owner_auto_approval
                  ? "The requesting Admin can record owner authorisation. An independent qualified safety review is still required before activation."
                : selected.risk === 4
                  ? "This restricted change needs two distinct authorised reviewers. The requester cannot review it. Required roles: " + selected.required_roles.map((role: string) => roleLabel(role)).join(", ") + ". Identity verification is required."
                  : "The requester cannot approve their own request. Authority and the active version are checked again at activation."
            }
          />
          {["pending_approval", "partially_approved"].includes(selected.status) && selected.approval_progress?.qualified_review_required && (
            <p className="muted">An independent, currently qualified safety reviewer is still required.</p>
          )}
          {["pending_approval", "partially_approved"].includes(selected.status) && selected.approval_progress?.mode === "independent" && selected.approval_progress?.missing_roles?.length > 0 && (
            <p className="muted">Still needed: {selected.approval_progress.missing_roles.map((role: string) => roleLabel(role)).join(", ")}.</p>
          )}
          {selected.approval_progress?.owner_approved && (
            <p className="muted">Admin authorisation recorded for this request version.</p>
          )}
          <div className="comparison">
            <div>
              <small>CURRENT AT SUBMISSION</small>
              <strong>
                {formatValue(
                  selected.previous_value,
                  selected.key.startsWith("price.") ||
                    [
                      "delivery.fee",
                      "wallet.maximum",
                      "gas.price_per_kg",
                    ].includes(selected.key)
                    ? "money"
                    : undefined,
                )}
              </strong>
            </div>
            <ArrowRight size={20} />
            <div>
              <small>PROPOSED VALUE</small>
              <strong>
                {formatValue(
                  selected.proposed_value,
                  selected.key.startsWith("price.") ||
                    [
                      "delivery.fee",
                      "wallet.maximum",
                      "gas.price_per_kg",
                    ].includes(selected.key)
                    ? "money"
                    : undefined,
                )}
              </strong>
            </div>
          </div>
          {selected.invitation_access && (
            <section className="surface">
              <h3>Staff invitation access</h3>
              <p>{selected.invitation_access.name} · {roleLabel(selected.proposed_value.role)}</p>
              {selected.invitation_access.changes?.length ? (
                <ul>
                  {selected.invitation_access.changes.map((change: { privilege: string; effect: string }) => (
                    <li key={change.privilege}>
                      {change.effect === "grant" ? "Grant" : "Remove"}: {privilegeById.get(change.privilege)?.label ?? change.privilege}
                    </li>
                  ))}
                </ul>
              ) : <p>Use the selected role’s default privileges.</p>}
            </section>
          )}
          {selected.business_operation && (
            <section className="surface">
              <h3>Business operation details</h3>
              <p>
                {selected.business_operation.kind} ·{" "}
                {selected.business_operation.reference}
              </p>
              <dl className="business-detail">
                {Object.entries(selected.business_operation.payload).map(
                  ([key, value]) => (
                    <div key={key}>
                      <dt>{key}</dt>
                      <dd>
                        {typeof value === "object"
                          ? JSON.stringify(value)
                          : String(value)}
                      </dd>
                    </div>
                  ),
                )}
              </dl>
              <p>
                Gas quantities and balances in this evidence are integer grams;
                money is kobo. Physical quantities are units.
              </p>
            </section>
          )}
          {selected.failure_reason && (
            <Notice type="error" message={selected.failure_reason} />
          )}
          <div className="proposal-context">
            <h3>Reason for change</h3>
            <p>{selected.reason}</p>
            <small>
              Effective:{" "}
              {new Date(selected.effective_at).toLocaleString("en-NG", {
                timeZone: "Africa/Lagos",
                timeZoneName: "short",
              })}{" "}
              · Base version {selected.base_version}
            </small>
          </div>
          {selected.can_owner_apply && (
            <button
              className="button full"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setFailure("");
                try {
                  const result = await api("approval.owner_apply", {
                    id: selected.id,
                    reason:
                      "Approve my existing request as an Admin",
                  });
                  if (["failed", "superseded"].includes(result.status)) {
                    setFailure(
                      result.failure_reason ||
                        "This request could not be activated. Review its current status before trying again.",
                    );
                    setSelected({
                      ...selected,
                      status: result.status,
                      state: result.state,
                      failure_reason: result.failure_reason,
                      can_owner_apply: result.status === "failed",
                    });
                    onChange();
                  } else {
                    setSelected(null);
                    onChange();
                  }
                } catch (e: any) {
                  setFailure(e.message);
                  if (e.code === "REAUTH_REQUIRED") verify();
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Check size={17} />
              {busy ? "Approving…" : "Approve"}
            </button>
          )}
          {selected.decisions.length > 0 && (
            <div className="decision-history">
              <h3>Review history</h3>
              {selected.decisions.map((d: any, i: number) => (
                <p key={i}>
                  <strong>{d.approver}</strong> —{" "}
                  {d.decision.replaceAll("_", " ")}
                  <small>
                    {d.reason || "No comment"} ·{" "}
                    {new Date(d.created_at).toLocaleString("en-NG", {
                      timeZone: "Africa/Lagos",
                      timeZoneName: "short",
                    })}
                  </small>
                </p>
              ))}
            </div>
          )}
          {failure && <Notice type="error" message={failure} />}
          {selected.requester_id === user.id &&
            ["draft", "changes_requested"].includes(selected.status) && (
              <div className="surface">
                <SettingForm
                  setting={{
                    ...selected,
                    value: selected.proposed_value,
                    version: selected.base_version,
                  }}
                  userId={user.id}
                  requestId={selected.id}
                  returned={selected.status === "changes_requested"}
                  onDone={() => {
                    setSelected(null);
                    onChange();
                  }}
                />
                {selected.status === "draft" && (
                  <ActionForm
                    action="approval.submit"
                    title="Submit saved draft"
                    fields={[
                      {
                        name: "id",
                        label: "Request",
                        type: "hidden",
                        value: selected.id,
                      },
                      { name: "reason", label: "Submission reason" },
                    ]}
                    onDone={() => {
                      setSelected(null);
                      onChange();
                    }}
                  />
                )}
              </div>
            )}
          {(selected.requester_id === user.id || user.role === "owner") &&
            [
              "draft",
              "pending_approval",
              "partially_approved",
              "changes_requested",
              "approved",
              "scheduled",
              "failed",
            ].includes(selected.status) && (
              <ActionForm
                action="approval.cancel"
                title="Withdraw request"
                fields={[
                  {
                    name: "id",
                    label: "Request",
                    type: "hidden",
                    value: selected.id,
                  },
                  { name: "reason", label: "Withdrawal reason" },
                ]}
                onDone={() => {
                  setSelected(null);
                  onChange();
                }}
              />
            )}
          {selected.status === "failed" &&
            selected.approve_roles.includes(user.role) && (
              <ActionForm
                action="approval.retry"
                title="Retry after resolving the cause"
                fields={[
                  {
                    name: "id",
                    label: "Request",
                    type: "hidden",
                    value: selected.id,
                  },
                  {
                    name: "reason",
                    label: "Evidence the failure cause is resolved",
                  },
                ]}
                onDone={() => {
                  setSelected(null);
                  onChange();
                }}
              />
            )}

          {["pending_approval", "partially_approved"].includes(
            selected.status,
          ) &&
          selected.requester_id !== user.id &&
          selected.can_approve ? (
            <>
              <label>
                <FieldCaption required={false}>Review comments for approval</FieldCaption>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  aria-describedby="approval-review-help"
                />
              </label>
              <small id="approval-review-help">Enter a reason if you reject the request or ask for changes.</small>
              <div className="decision-actions">
                <button
                  className="button"
                  disabled={busy}
                  onClick={() => decide("approve")}
                >
                  <Check size={17} />
                  Approve
                </button>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => decide("request_changes")}
                >
                  Request Changes
                </button>
                <button
                  className="button danger"
                  disabled={busy}
                  onClick={() => decide("reject")}
                >
                  <X size={16} />
                  Reject
                </button>
              </div>
            </>
          ) : selected.status === "scheduled" &&
            selected.approve_roles.includes(user.role) ? (
            <button
              className="button"
              onClick={async () => {
                try {
                  await api("approval.activate", { id: selected.id });
                  setSelected(null);
                  onChange();
                } catch (e: any) {
                  setFailure(e.message);
                }
              }}
            >
              Revalidate & Activate
            </button>
          ) : (
            <p className="muted">
              {selected.can_owner_apply
                ? "Use Approve above. Verify your identity first if prompted."
                : selected.owner_auto_approval &&
                    selected.requester_id === user.id
                  ? `Your owner request is ${selected.status.replaceAll("_", " ")}. Saved drafts must be submitted; qualified safety reviews and activation checks still apply.`
                  : selected.requester_id === user.id &&
                      ["pending_approval", "partially_approved"].includes(
                        selected.status,
                      )
                    ? "Your request must be reviewed by an independent authorised colleague."
                    : `This request is ${selected.status.replaceAll("_", " ")}.`}
            </p>
          )}
        </Modal>
      )}
    </div>
  );
}
function Inventory({
  user,
  refresh,
  onChange,
}: {
  user: any;
  refresh: number;
  onChange: () => void;
}) {
  const { data, error } = useData("inventory", refresh),
    [receive, setReceive] = useState(false),
    [failure, setFailure] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setFailure("");
    const d = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api("inventory.receive", {
        ...d,
        quantity: Number(d.quantity),
        branchId: user.branchId ?? "lagos",
      });
      setReceive(false);
      onChange();
    } catch (e: any) {
      setFailure(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <AdminHeading
        title="Keep your stock moving."
        text="Available quantities, reservations and traceable stock receipts."
        action={
          ["owner", "manager", "finance"].includes(user.role) && (
            <button className="button" onClick={() => setReceive(true)}>
              <Plus size={17} />
              Receive Stock
            </button>
          )
        }
      />
      {error ? (
        <Notice type="error" message={error} />
      ) : !data ? (
        <Loading />
      ) : (
        <div className="surface table-scroll">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Branch</th>
                <th>On hand</th>
                <th>Reserved</th>
                <th>Available</th>
                <th>Reorder level</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((i: any) => (
                <tr key={`${i.branch_id}:${i.product_id}`}>
                  <td>
                    <strong>{i.name}</strong>
                  </td>
                  <td>{i.branch_id}</td>
                  <td>{i.quantity}</td>
                  <td>{i.reserved}</td>
                  <td>{i.quantity - i.reserved}</td>
                  <td>{i.threshold}</td>
                  <td>
                    <span
                      className={`status ${i.quantity - i.reserved > i.threshold ? "active" : "pending_approval"}`}
                    >
                      {i.quantity - i.reserved > i.threshold
                        ? "In stock"
                        : "Reorder needed"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Notice message="Gas inventory and physical cylinders are separate records. Receiving product stock does not create or certify physical cylinders." />
      {receive && (
        <Modal title="Receive stock" onClose={() => setReceive(false)}>
          <form onSubmit={submit}>
            <label>
              <FieldCaption required={true}>Product</FieldCaption>
              <select name="productId" required>
                {data?.map((i: any) => (
                  <option value={i.product_id} key={i.product_id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <FieldCaption required={true}>Quantity received</FieldCaption>
              <FormInput
                name="quantity"
                type="number"
                min={1}
                max={100000}
                required
              />
            </label>
            <label>
              <FieldCaption required={true}>Unique receipt reference</FieldCaption>
              <FormInput
                name="reference"
                required
                minLength={5}
                placeholder="Supplier delivery note or receipt reference"
              />
            </label>
            <label>
              <FieldCaption required={true}>Reason / supplier note</FieldCaption>
              <textarea name="reason" required minLength={5} />
            </label>
            {failure && <Notice type="error" message={failure} />}
            <button className="button full" disabled={busy}>
              {busy ? "Recording…" : "Record Stock Receipt"}
              <Check size={17} />
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
function Records({
  section,
  refresh,
  user,
  onChange,
}: {
  section: string;
  refresh: number;
  user: any;
  onChange: () => void;
}) {
  const action =
    section === "reports"
      ? "finance"
      : section === "deliveries"
        ? null
        : section;
  const scope = JSON.stringify([user.id, user.role, user.branch_id ?? user.branchId]);
  const { data, error, retry } = useData(action, refresh, scope),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState<any>(null),
    [message, setMessage] = useState("");
  const staff = useData(
    selected && ["owner", "manager"].includes(user.role) ? "staff" : null,
    refresh,
    scope,
  );
  const params = useSearchParams();
  const targetOrder = params.get("orderId");
  useEffect(() => setMessage(""), [selected?.id]);
  useEffect(() => {
    let live = true;
    const controller = new AbortController();
    if (section === "orders" && targetOrder) {
      if (!/^[a-f0-9-]{36}$/i.test(targetOrder)) {
        setMessage("Invalid order link.");
        return;
      }
      api("orders?id=" + encodeURIComponent(targetOrder), undefined, {signal: controller.signal})
        .then((rows) => {
          if (live) {
            setSelected(rows[0] ?? null);
            if (!rows.length)
              setMessage("This order is unavailable in your authorised scope.");
          }
        })
        .catch((e) => {
          if (live) setMessage(e.message);
        });
    }
    return () => {
      live = false;
      controller.abort();
    };
  }, [section, targetOrder, scope]);
  if (section === "deliveries")
    return ["owner", "manager"].includes(user.role) ? (
      <DispatchCentre user={user} />
    ) : (
      <DispatchTracking user={user} />
    );
  const title =
    section === "orders"
      ? "Your orders, in one place."
      : section === "deliveries"
        ? "From your branch to their door."
        : section === "customers"
          ? "The people you keep cooking."
          : section === "staff"
            ? "Your team, working together."
            : section === "cylinders"
              ? "Every cylinder has a story."
              : section === "audit"
                ? "A clear record of every action."
                : section === "reports"
                  ? "See how your business is doing."
                  : "Every naira, accounted for.";
  const rows = data?.filter((r: any) =>
    JSON.stringify(r).toLowerCase().includes(query.toLowerCase()),
  );
  async function exportCsv() {
    if (!data) return;
    let exportRows;
    try {
      exportRows = await api("finance.export", {});
    } catch (e: any) {
      await appAlert(e.message, "Export could not be downloaded");
      return;
    }
    const keys =
      section === "customers"
        ? ["name", "email", "orders"]
        : [
            "reference",
            "total_kobo",
            "payment_method",
            "payment_status",
            "status",
            "created_at",
          ];
    const escape = (v: any) => {
      const raw = String(v ?? "");
      return (
        '"' +
        (/^[=+\-@\t\r]/.test(raw) ? "'" + raw : raw).replaceAll('"', '""') +
        '"'
      );
    };
    const blob = new Blob(
      [
        keys.join(",") +
          "\n" +
          exportRows
            .map((r: any) => keys.map((k) => escape(r[k])).join(","))
            .join("\n"),
      ],
      { type: "text/csv;charset=utf-8;" },
    );
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `easygas-${section}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <AdminHeading
        title={title}
        text={
          section === "audit"
            ? "Append-only security and business activity history."
            : "Records are limited to your account permissions and branch scope."
        }
        action={
          ["finance", "reports"].includes(section) ? (
            <button
              className="button secondary"
              disabled={!data?.length}
              onClick={exportCsv}
            >
              <Download size={16} />
              Export CSV
            </button>
          ) : section === "cylinders" &&
            ["owner", "manager", "finance"].includes(user.role) ? (
            <button
              className="button"
              onClick={() => setSelected({ newCylinder: true })}
            >
              <Plus size={16} />
              Register Cylinder
            </button>
          ) : undefined
        }
      />
      {message && <Notice message={message} />}
      {section === "orders" &&
        ["owner", "manager"].includes(user.role) && (
          <div className="orders-assisted-action">
            <AssistedOrder user={user} onCreated={onChange} />
          </div>
        )}
      {section === "finance" && (
        <CashReconciliation refresh={refresh} onChange={onChange} />
      )}
      <div className="surface">
        <div className="section-heading">
          <h2>{navigationItems.find((n) => n.id === section)?.label}</h2>
          <div className="input-icon record-search">
            <Search size={15} />
            <FormInput
              aria-label="Search records"
              placeholder="Search records…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        {error ? (
          <div className="stack"><Notice type="error" message={error} /><button type="button" className="button secondary" onClick={retry}>Try again</button></div>
        ) : !rows ? (
          <Loading label={section === "orders" ? "Loading orders" : "Loading records"} />
        ) : !rows.length ? (
          <Empty
            icon={
              section === "audit"
                ? ShieldCheck
                : section === "customers"
                  ? UsersRound
                  : section === "cylinders"
                    ? Flame
                    : ClipboardList
            }
            title={
              query
                ? "No matching records."
                : "A fresh start for your business."
            }
          >
            {query
              ? "Try a different search."
              : "Real records will appear here as your team starts using EasyGas."}
          </Empty>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {section === "customers" ? (
                    <>
                      <th>Customer</th>
                      <th>Email</th>
                      <th>Orders</th>
                      <th>Joined</th>
                    </>
                  ) : section === "staff" ? (
                    <>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Branch</th>
                      <th>Status</th>
                      <th>Account ID</th>
                    </>
                  ) : section === "audit" ? (
                    <>
                      <th>Action</th>
                      <th>Actor</th>
                      <th>Outcome</th>
                      <th>Target</th>
                      <th>Time</th>
                    </>
                  ) : section === "cylinders" ? (
                    <>
                      <th>Serial</th>
                      <th>Size</th>
                      <th>Owner</th>
                      <th>Status</th>
                      <th>Test due</th>
                    </>
                  ) : (
                    <>
                      <th>Reference</th>
                      <th>
                        {["finance", "reports"].includes(section)
                          ? "Payment method"
                          : "Customer"}
                      </th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Payment</th>
                      <th />
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.id ?? r.reference}>
                    {section === "customers" ? (
                      <>
                        <td>
                          <strong>{r.name}</strong>
                        </td>
                        <td>{r.email}</td>
                        <td>{r.orders}</td>
                        <td>{new Date(r.created_at).toLocaleDateString()}</td>
                      </>
                    ) : section === "staff" ? (
                      <>
                        <td>
                          <strong>{r.name}</strong>
                        </td>
                        <td>{roleLabel(r.role)}</td>
                        <td>{r.branch_id ?? "—"}</td>
                        <td>
                          <span className="status">
                            {r.active ? "Active" : "Suspended"}
                          </span>
                        </td>
                        <td>
                          <code className="small-code">{r.id}</code>
                        </td>
                      </>
                    ) : section === "audit" ? (
                      <>
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
                        <td>{new Date(r.created_at).toLocaleString()}</td>
                      </>
                    ) : section === "cylinders" ? (
                      <>
                        <td>
                          <strong>{r.serial}</strong>
                        </td>
                        <td>{r.size_kg}kg</td>
                        <td>{r.ownership}</td>
                        <td>
                          <span className="status">
                            {r.status.replaceAll("_", " ")}
                          </span>
                        </td>
                        <td>{new Date(r.test_due).toLocaleDateString()}</td>
                      </>
                    ) : (
                      <>
                        <td>
                          <strong>{r.reference}</strong>
                        </td>
                        <td>
                          {r.customer_name ??
                            r.payment_method?.replaceAll("_", " ")}
                        </td>
                        <td>{money(r.total_kobo)}</td>
                        <td>
                          <span className={`status ${r.status}`}>
                            {r.status.replaceAll("_", " ")}
                          </span>
                        </td>
                        <td>{r.payment_status}</td>
                        <td>
                          {r.id && (
                            <button
                              className="text-link"
                              onClick={() => setSelected(r)}
                            >
                              Details <ArrowRight size={14} />
                            </button>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {section === "staff" && (
        <Notice message="Accounts register as customers. Role changes require a protected Staff & Permissions request, two independent approvals, and verification. Staff cannot grant themselves business authority." />
      )}
      {["finance", "reports"].includes(section) && (
        <Notice message="Amounts are based on recorded orders. An unpaid order does not count as verified revenue. Purchase credit and refunds are reviewed under Credits & Refunds; external payment providers remain unconnected. CSV amounts are in kobo." />
      )}
      {selected?.newCylinder && <Modal title="Register a physical cylinder" onClose={() => setSelected(null)}>
        <CylinderForm user={user} onDone={() => { setSelected(null); onChange(); }} />
      </Modal>}
      {selected && !selected.newCylinder && <AdminOrderDetails key={selected.id} order={selected} user={user}
        drivers={staff.data ?? []} onClose={() => setSelected(null)} onChanged={() => { setSelected(null); onChange(); }} />}

    </>
  );
}
function CylinderForm({ user, onDone }: { user: any; onDone: () => void }) {
  const [error, setError] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const d = Object.fromEntries(new FormData(e.currentTarget));
        try {
          await api("cylinder.create", {
            ...d,
            sizeKg: Number(d.sizeKg),
            branchId: user.branchId ?? "lagos",
          });
          onDone();
        } catch (e: any) {
          setError(e.message);
        }
      }}
    >
      <label>
        <FieldCaption required={true}>Unique cylinder serial</FieldCaption>
        <FormInput name="serial" required minLength={4} />
      </label>
      <label>
        <FieldCaption required={true}>Size (kg)</FieldCaption>
        <FormInput
          name="sizeKg"
          type="number"
          min={1}
          max={100}
          step="0.5"
          required
        />
      </label>
      <label>
        <FieldCaption required={true}>Ownership</FieldCaption>
        <select name="ownership">
          <option value="company">Company owned</option>
          <option value="supplier">Supplier owned</option>
        </select>
      </label>
      <label>
        <FieldCaption required={true}>Physical condition</FieldCaption>
        <select name="status">
          {["filled", "empty", "damaged", "quarantined", "inspection_due"].map(
            (s) => (
              <option key={s}>{s}</option>
            ),
          )}
        </select>
      </label>
      <label>
        <FieldCaption required={true}>Next test due</FieldCaption>
        <FormInput name="testDue" type="date" required />
      </label>
      {error && <Notice type="error" message={error} />}
      <Notice message="Cylinder registration does not add gas inventory or certify its safety. Record stock separately and verify inspection documents." />
      <button className="button full">Register Cylinder</button>
    </form>
  );
}
function CashReconciliation({
  refresh,
  onChange,
}: {
  refresh: number;
  onChange: () => void;
}) {
  const { data, error } = useData("cash.collections", refresh),
    [failure, setFailure] = useState(""),
    [verify, setVerify] = useState(false);
  return (
    <section className="surface" style={{ marginBottom: 20 }}>
      <div className="section-heading">
        <h2>Cash reconciliation</h2>
        <button className="button secondary" onClick={() => setVerify(true)}>
          <ShieldCheck size={15} />
          Verify Identity
        </button>
      </div>
      {error && <Notice message={error} type="error" />}
      {failure && <Notice message={failure} type="error" />}
      {data?.length ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Collector</th>
                <th>Amount</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.map((c: any) => (
                <tr key={c.id}>
                  <td>{c.reference}</td>
                  <td>{c.collector}</td>
                  <td>{money(c.amount_kobo)}</td>
                  <td>
                    <span
                      className={`status ${c.verified_at ? "active" : "pending_approval"}`}
                    >
                      {c.verified_at ? "Verified" : "Awaiting reconciliation"}
                    </span>
                  </td>
                  <td>
                    {!c.verified_at && (
                      <button
                        className="text-link"
                        onClick={async () => {
                          try {
                            await api("cash.reconcile", { id: c.id });
                            setFailure("");
                            onChange();
                          } catch (e: any) {
                            setFailure(e.message);
                            if (e.code === "REAUTH_REQUIRED") setVerify(true);
                          }
                        }}
                      >
                        Confirm Receipt of Cash <Check size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">No driver cash collections have been recorded.</p>
      )}
      {verify && (
        <Modal title="Verify your identity" onClose={() => setVerify(false)}>
          <VerifyForm onDone={() => setVerify(false)} />
        </Modal>
      )}
    </section>
  );
}
