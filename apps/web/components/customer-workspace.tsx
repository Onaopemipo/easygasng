"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ThemeToggle } from "./theme-provider";
import Link from "./workspace-link";
import { usePathname } from "next/navigation";
import {
  House,
  Bell,
  UserRound,
  Wrench,
  CalendarDays,
  ChartColumn,
  ShoppingCart,
  Wallet,
  CreditCard,
  Gift,
  RefreshCw,
  CircleGauge,
  Headphones,
  MessagesSquare,
  ChevronDown,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Menu,
  X,
  ArrowLeft,
  Search,
  MapPin,
  LogOut,
  ArrowUpRight,
} from "lucide-react";
import {
  customerGroups,
  customerNavigation,
  customerRoute,
} from "../../../packages/business-rules/src/customer-navigation";
import { useCustomerResource } from "./customer-data";
const icons = {
  House,
  Bell,
  UserRound,
  Wrench,
  CalendarDays,
  ChartColumn,
  ShoppingCart,
  Wallet,
  CreditCard,
  Gift,
  RefreshCw,
  CircleGauge,
  Headphones,
  MessagesSquare,
};
export function CustomerAccountMenu({
  user,
  onLogout,
}: {
  user: any;
  onLogout: () => Promise<void>;
}) {
  const customer = ["customer", "commercial"].includes(user.role);
  const details = useRef<HTMLDetailsElement>(null);
  const path = usePathname();
  useEffect(() => {
    details.current?.removeAttribute("open");
  }, [path]);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape" && details.current?.open) {
        details.current.removeAttribute("open");
        details.current.querySelector<HTMLElement>("summary")?.focus();
      }
    };
    const outside = (e: PointerEvent) => {
      if (!details.current?.contains(e.target as Node))
        details.current?.removeAttribute("open");
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("keydown", close);
      document.removeEventListener("pointerdown", outside);
    };
  }, []);
  return (
    <details ref={details} className="customer-account-menu">
      <summary aria-label="Open account menu">
        <span className="customer-avatar">{initials(user.name)}</span>
        <ChevronDown size={17} />
      </summary>
      <nav aria-label="Account menu">
        <strong>{user.name}</strong>
        <Link href={customer ? "/account" : "/admin"}>
          {customer ? "My Dashboard" : "Business Dashboard"}
        </Link>
        {customer && <Link href="/orders">My Orders</Link>}
        <Link href="/account-settings">Account Settings</Link>
        <Link href="/">Back to Website</Link>
        <button onClick={onLogout}>
          <LogOut size={18} />
          Sign Out
        </button>
      </nav>
    </details>
  );
}
function initials(name: string) {
  return name
    .split(/\s+/)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
export default function CustomerWorkspace({
  user,
  onLogout,
  children,
  cartCount = 0,
}: {
  user: any;
  onLogout: () => Promise<void>;
  children: ReactNode;
  cartCount?: number;
}) {
  const path = usePathname(),
    active = customerRoute(path);
  const [collapsed, setCollapsed] = useState(false),
    [groups, setGroups] = useState<string[]>([]),
    [mobile, setMobile] = useState(false),
    [ready, setReady] = useState(false),
    [query, setQuery] = useState("");
  const drawer = useRef<HTMLElement>(null),
    toggle = useRef<HTMLButtonElement>(null);
  const navigation = useCustomerResource(
    "customer.dashboard?widget=navigation",
    user.id,
  );
  useEffect(() => {
    try {
      const p = JSON.parse(
        localStorage.getItem("easygas.customer.nav." + user.id) ?? "null",
      );
      setCollapsed(
        typeof p?.collapsed === "boolean"
          ? p.collapsed
          : window.innerWidth > 900 && window.innerWidth <= 1100,
      );
      setGroups(
        Array.isArray(p?.groups)
          ? p.groups.filter((g: any) => customerGroups.some((x) => x.id === g))
          : [],
      );
    } catch {}
    setReady(true);
  }, [user.id]);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(
          "easygas.customer.nav." + user.id,
          JSON.stringify({ collapsed, groups }),
        );
      } catch {}
  }, [collapsed, groups, ready, user.id]);
  useEffect(() => {
    setMobile(false);
    if (active) setGroups((v) => v.filter((g) => g !== active.group));
  }, [path, active?.group]);
  useEffect(() => {
    if (!mobile) return;
    const previous = document.activeElement as HTMLElement,
      old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawer.current
      ?.querySelector<HTMLButtonElement>(".customer-mobile-close")
      ?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setMobile(false);
        return;
      }
      if (e.key !== "Tab") return;
      const nodes = Array.from(
        drawer.current?.querySelectorAll<HTMLElement>(
          "a[href],button:not([disabled]),summary",
        ) ?? [],
      ).filter((n) => n.getClientRects().length);
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", key);
      (toggle.current ?? previous)?.focus();
    };
  }, [mobile]);
  useEffect(() => {
    const resize = () => {
      if (window.innerWidth > 900) setMobile(false);
    };
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  return (
    <div
      className={`customer-workspace ${collapsed ? "is-compact" : ""} ${mobile ? "drawer-open" : ""}`}
    >
      <a href="#main" className="skip">
        Skip to content
      </a>
      {mobile && (
        <button
          className="customer-backdrop"
          aria-label="Close customer navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside
        ref={drawer}
        id="customer-sidebar"
        className="customer-sidebar"
        role={mobile ? "dialog" : undefined}
        aria-modal={mobile ? true : undefined}
        aria-label="Customer navigation"
        aria-busy={!ready}
      >
        <div className="customer-brand">
          <Link href="/" aria-label="EasyGas home">
            <img
              className="customer-full-logo"
              src="/assets/easygas-logo-hd.png"
              alt="EasyGas Energy Solutions"
            />
            <img
              className="customer-small-logo"
              src="/icon.png"
              alt="EasyGas"
            />
          </Link>
          <button
            className="customer-collapse"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed((v) => !v)}
          >
            {collapsed ? <ChevronsRight /> : <ChevronsLeft />}
          </button>
          <button
            className="customer-mobile-close"
            aria-label="Close navigation"
            onClick={() => setMobile(false)}
          >
            <X />
          </button>
        </div>
        <div className="customer-sidebar-identity">
          <span className="customer-avatar">{initials(user.name)}</span>
          <div>
            <strong>Hello, {user.name.split(" ")[0]}.</strong>
            <span>{user.email}</span>
          </div>
        </div>
        <nav aria-label="Customer workspace">
          {customerGroups.map((g) => {
            const closed = groups.includes(g.id);
            return (
              <section className="customer-nav-group" key={g.id}>
                {g.id !== "overview" && (
                  <button
                    className="customer-group-toggle"
                    aria-expanded={!closed}
                    aria-controls={`customer-group-${g.id}`}
                    onClick={() =>
                      setGroups((v) =>
                        v.includes(g.id)
                          ? v.filter((x) => x !== g.id)
                          : [...v, g.id],
                      )
                    }
                  >
                    {g.label}
                    <ChevronDown size={15} />
                  </button>
                )}
                <div
                  id={`customer-group-${g.id}`}
                  className={closed ? "group-closed" : ""}
                >
                  {customerNavigation
                    .filter((i) => i.group === g.id)
                    .map((i) => {
                      const Icon = icons[i.icon];
                      const count =
                        "counter" in i
                          ? navigation.data?.counts?.[i.counter]
                          : null;
                      return (
                        <Link
                          key={i.href}
                          href={i.href}
                          title={i.label}
                          aria-label={i.label}
                          aria-current={
                            active?.href === i.href ? "page" : undefined
                          }
                          className={active?.href === i.href ? "active" : ""}
                          onClick={() => setMobile(false)}
                        >
                          <Icon size={21} />
                          <span className="customer-nav-label">{i.label}</span>
                          {Number(count) > 0 && (
                            <span
                              className="customer-nav-badge"
                              aria-label={`${count} items`}
                            >
                              {count > 99 ? "99+" : count}
                            </span>
                          )}
                          <span
                            className="customer-nav-tooltip"
                            aria-hidden="true"
                          >
                            {i.label}
                          </span>
                        </Link>
                      );
                    })}
                </div>
              </section>
            );
          })}
        </nav>
        <div className="customer-nav-footer">
          <Link href="/" title="Back to Website" aria-label="Back to Website">
            <ArrowLeft size={21} />
            <span className="customer-nav-label">Back to Website</span>
            <span className="customer-nav-tooltip" aria-hidden="true">
              Back to Website
            </span>
          </Link>
          <button onClick={onLogout} title="Sign Out" aria-label="Sign Out">
            <LogOut size={21} />
            <span className="customer-nav-label">Sign Out</span>
            <span className="customer-nav-tooltip" aria-hidden="true">
              Sign Out
            </span>
          </button>
        </div>
      </aside>
      <div
        className="customer-workspace-body"
        inert={mobile ? true : undefined}
      >
        <header className="customer-header">
          <button
            ref={toggle}
            className="customer-mobile-toggle"
            aria-label="Open customer navigation"
            aria-controls="customer-sidebar"
            aria-expanded={mobile}
            onClick={() => setMobile(true)}
          >
            <Menu />
          </button>
          <form action="/products" className="customer-search">
            <Search size={21} />
            <input
              aria-label="Search products"
              name="q"
              placeholder="Search products by name or category…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button aria-label="Submit product search" type="submit">
              <ArrowUpRight size={18} />
            </button>
          </form>
          <Link
            className="customer-website-link"
            href="/"
            aria-label="Back to Website"
          >
            <ArrowLeft size={17} />
            <span>Back to Website</span>
          </Link>
          <Link
            className="customer-location"
            href="/account-settings"
            title="Manage delivery location"
          >
            <MapPin size={20} />
            <span>
              {navigation.data?.address?.zone ?? "Set Delivery Location"}
            </span>
            <ChevronDown size={15} />
          </Link>
          <Link
            className="customer-notification"
            href="/notifications"
            aria-label={`Notifications${navigation.data ? `, ${navigation.data.counts.notifications} unread` : ""}`}
          >
            <Bell size={23} />
            {navigation.data?.counts?.notifications > 0 && <span />}
          </Link>
          <Link href="/cart" className="customer-cart" aria-label={`Shopping cart, ${cartCount} items`}>
            <ShoppingCart size={23} /><span className="customer-cart-count">{cartCount}</span>
          </Link>
          <ThemeToggle />
          <CustomerAccountMenu user={user} onLogout={onLogout} />
        </header>
        {navigation.error && (
          <div className="customer-counter-error" role="status">
            Account indicators unavailable.{" "}
            <button onClick={navigation.retry}>Retry</button>
          </div>
        )}
        <div className="customer-page-content" key={user.id}>
          {children}
        </div>
        <div className="customer-shopping-footer">
          <Link href="/products">
            Continue Shopping <ChevronRight size={17} />
          </Link>
        </div>
      </div>
    </div>
  );
}
