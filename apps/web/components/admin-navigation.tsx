"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  ShoppingCart,
  Monitor,
  UsersRound,
  Headset,
  Package,
  Warehouse,
  Cylinder,
  Layers,
  Truck,
  CalendarCheck,
  Wrench,
  HardHat,
  FileText,
  Wallet,
  RefreshCw,
  Receipt,
  ChartNoAxesCombined,
  Megaphone,
  Lightbulb,
  ShieldCheck,
  Settings,
  ClipboardList,
  TriangleAlert,
  FileCheck,
  ScrollText,
  Rocket,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  LogOut,
  MapPin,
  ExternalLink,
  X,
} from "lucide-react";
import {
  adminNavigation,
  activeNavigation,
  parseNavigationPreferences,
  badgeText,
  type NavigationItem,
} from "../../../packages/business-rules/src/admin-navigation";
const icons: Record<string, typeof House> = {
  House,
  ShoppingCart,
  Monitor,
  UsersRound,
  Headset,
  Package,
  Warehouse,
  Cylinder,
  Layers,
  Truck,
  CalendarCheck,
  Wrench,
  HardHat,
  FileText,
  Wallet,
  RefreshCw,
  Receipt,
  ChartNoAxesCombined,
  Megaphone,
  Lightbulb,
  ShieldCheck,
  Settings,
  ClipboardList,
  TriangleAlert,
  FileCheck,
  ScrollText,
  Rocket,
};
export const roleLabel = (role: string) =>
  (
    ({
      owner: "Business Owner",
      administrator: "Technical Administrator",
      manager: "Branch Manager",
      inventory: "Inventory Officer",
      sales: "Sales Attendant",
      finance: "Finance Officer",
      dispatcher: "Dispatcher",
      driver: "Delivery Driver",
      technician: "Service Technician",
      service_manager: "Service Manager",
      safety_officer: "Safety Officer",
    }) as Record<string, string>
  )[role] ?? role?.replaceAll("_", " ");
export default function AdminNavigation({
  user,
  access,
  open,
  onClose,
  onLogout,
  collapsed,
  onCollapsedChange,
}: {
  user: any;
  access: any;
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
  collapsed: boolean;
  onCollapsedChange: (v: boolean) => void;
}) {
  const path = usePathname(),
    active = activeNavigation(path),
    [expanded, setExpanded] = useState<Record<string, boolean>>({}),
    [ready, setReady] = useState(false),
    [mobile, setMobile] = useState(false),
    [tooltip, setTooltip] = useState<{ label: string; top: number } | null>(
      null,
    ),
    aside = useRef<HTMLElement>(null);
  const taskOnly = ["driver", "technician"].includes(user?.role),
    groups = adminNavigation
      .map((g) => ({
        ...g,
        items: g.items.filter((i) => access?.allowed?.includes(i.id)),
      }))
      .filter((g) => g.items.length);
  useEffect(() => {
    if (!user?.id) return;
    setReady(false);
    const query = window.matchMedia("(max-width: 900px)");
    setMobile(query.matches);
    const change = () => {
      setMobile(query.matches);
      onClose();
    };
    query.addEventListener("change", change);
    let saved = null;
    try {
      saved = parseNavigationPreferences(
        localStorage.getItem(`easygas.navigation.v1:${user.id}`),
      );
    } catch {}
    onCollapsedChange(
      saved?.collapsed ??
        window.matchMedia("(min-width: 901px) and (max-width: 1100px)").matches,
    );
    setExpanded(saved?.groups ?? {});
    setReady(true);
    return () => query.removeEventListener("change", change);
  }, [user?.id, onClose, onCollapsedChange]);
  useEffect(() => {
    if (!ready || !user?.id) return;
    try {
      document.cookie = `easygas_nav_${user.id}=${collapsed ? "1" : "0"}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
      localStorage.setItem(
        `easygas.navigation.v1:${user.id}`,
        JSON.stringify({ collapsed, groups: expanded }),
      );
    } catch {}
  }, [ready, user?.id, collapsed, expanded]);
  useEffect(() => {
    const group = adminNavigation.find((g) =>
      g.items.some((i) => i.id === active?.id),
    );
    if (group) setExpanded((previous) => ({ ...previous, [group.id]: true }));
    setTooltip(null);
    onClose();
  }, [path, onClose]);
  useEffect(() => {
    if (!mobile || !open) return;
    const previous = document.activeElement as HTMLElement | null,
      bodyOverflow = document.body.style.overflow,
      main = document.querySelector(".admin-main");
    document.body.style.overflow = "hidden";
    main?.setAttribute("inert", "");
    const focusable = () =>
      Array.from(
        aside.current?.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),summary,[tabindex="0"]',
        ) ?? [],
      ).filter((e) => e.getClientRects().length > 0);
    const focusDrawer = () => {
      if (!aside.current?.contains(document.activeElement)) {
        aside.current
          ?.querySelector<HTMLButtonElement>(".workspace-drawer-close")
          ?.focus();
      }
    };
    focusDrawer();
    // Retry after the visibility transition, including background tabs where RAF pauses.
    const focusTimer = setTimeout(focusDrawer, 250);
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key === "Tab") {
        const controls = focusable(),
          first = controls[0],
          last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = bodyOverflow;
      main?.removeAttribute("inert");
      document.removeEventListener("keydown", key);
      if (previous?.isConnected) previous.focus();
    };
  }, [mobile, open, onClose]);
  const reveal = (
    event: React.FocusEvent<HTMLElement> | React.MouseEvent<HTMLElement>,
    label: string,
  ) => {
    if (collapsed && !mobile)
      setTooltip({
        label,
        top: Math.min(
          window.innerHeight - 65,
          Math.max(10, event.currentTarget.getBoundingClientRect().top),
        ),
      });
  };
  function renderItem(item: NavigationItem) {
    const Icon = icons[item.icon],
      count = access?.counters?.[item.badgeKey ?? ""],
      description = access?.counterDescriptions?.[item.badgeKey ?? ""],
      isActive = active?.id === item.id,
      stale = access?.counterState === "stale",
      refreshing = access?.counterState === "loading",
      countNote = stale
        ? `Last confirmed count from ${access.generatedAt}; refresh unavailable`
        : refreshing
          ? "Last confirmed count; updating"
          : description;

    return (
      <Link
        key={item.id}
        href={item.href}
        className={`workspace-nav-link ${isActive ? "active" : ""}`}
        aria-current={isActive ? "page" : undefined}
        aria-describedby={
          tooltip?.label === item.label ? "workspace-nav-tooltip" : undefined
        }
        aria-label={
          item.label +
          (count > 0
            ? `, ${count} ${description ?? "items requiring attention"}${stale || refreshing ? `. ${countNote}` : ""}`
            : "")
        }
        onClick={onClose}
        onMouseEnter={(e) => reveal(e, item.label)}
        onMouseLeave={() => setTooltip(null)}
        onFocus={(e) => reveal(e, item.label)}
        onBlur={() => setTooltip(null)}
      >
        <Icon size={21} aria-hidden="true" />
        <span className="workspace-nav-label">{item.label}</span>
        {count > 0 && (
          <span
            className={`workspace-nav-badge ${["inventory", "approvals", "incidents"].includes(item.id) ? "attention" : ""}${stale ? " is-stale" : ""}`}
            aria-hidden="true"
            title={countNote}
          >
            {badgeText(count)}
          </span>
        )}
      </Link>
    );
  }
  return (
    <>
      {mobile && open && (
        <button
          className="workspace-nav-backdrop"
          aria-label="Close navigation backdrop"
          tabIndex={-1}
          onClick={onClose}
        />
      )}
      <aside
        ref={aside}
        className={`admin-sidebar workspace-sidebar ${collapsed ? "is-compact" : ""} ${open ? "is-open" : ""} ${taskOnly ? "task-navigation" : ""}`}
        aria-label={
          taskOnly
            ? "Assigned work navigation"
            : "Business workspace navigation"
        }
        role={mobile && open ? "dialog" : undefined}
        aria-modal={mobile && open ? true : undefined}
        id="workspace-navigation"
        aria-busy={!ready}
      >
        <div className="workspace-sidebar-brand">
          <Link
            href={groups[0]?.items[0]?.href ?? "/account"}
            aria-label="EasyGas workspace home"
          >
            <img
              className="workspace-full-logo"
              src="/assets/easygas-logo-hd.png"
              alt="EasyGas Energy Solutions"
            />
            <img
              className="workspace-compact-logo"
              src="/icon.png"
              width={32}
              height={32}
              alt=""
              aria-hidden="true"
            />
          </Link>
          <button
            className="workspace-collapse"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            onClick={() => {
              onCollapsedChange(!collapsed);
              setTooltip(null);
            }}
          >
            {collapsed ? (
              <ChevronsRight size={20} />
            ) : (
              <ChevronsLeft size={20} />
            )}
          </button>
          <button
            className="workspace-drawer-close"
            aria-label="Close business menu"
            onClick={onClose}
          >
            <X size={22} />
          </button>
        </div>
        <nav
          aria-label={taskOnly ? "Assigned work" : "Administration"}
          className="workspace-nav"
          onScroll={() => setTooltip(null)}
        >
          {groups.map((g) => (
            <section
              className={`workspace-nav-group ${expanded[g.id] !== false ? "is-expanded" : ""} ${g.items.some((i) => i.id === active?.id) ? "contains-active" : ""}`}
              key={g.id}
              aria-label={g.label}
            >
              {g.id !== "overview" && !taskOnly && (
                <button
                  className="workspace-group-toggle"
                  aria-expanded={expanded[g.id] !== false}
                  aria-controls={`nav-group-${g.id}`}
                  onClick={() =>
                    setExpanded((previous) => ({
                      ...previous,
                      [g.id]: previous[g.id] === false,
                    }))
                  }
                >
                  <span>{g.label}</span>
                  <ChevronDown size={15} aria-hidden="true" />
                </button>
              )}
              <div
                className={`workspace-group-content ${g.id === "overview" || taskOnly ? "always-open" : ""}`}
                id={`nav-group-${g.id}`}
                inert={
                  (!collapsed || mobile) &&
                  !taskOnly &&
                  g.id !== "overview" &&
                  expanded[g.id] === false
                    ? true
                    : undefined
                }
              >
                <div>{g.items.map(renderItem)}</div>
              </div>
            </section>
          ))}
        </nav>
        <footer className="workspace-sidebar-footer">
          <div
            className="workspace-branch"
            title={access?.branch?.name ?? "No branch assigned"}
          >
            <MapPin size={20} />
            <span className="workspace-nav-label">
              {access?.branch?.name ?? "No branch assigned"}
            </span>
          </div>
          <Link
            href="/"
            className="workspace-footer-link"
            aria-label="Customer Website"
            onFocus={(e) => reveal(e, "Customer Website")}
            onBlur={() => setTooltip(null)}
            onMouseEnter={(e) => reveal(e, "Customer Website")}
            onMouseLeave={() => setTooltip(null)}
          >
            <ExternalLink size={19} />
            <span className="workspace-nav-label">Customer Website</span>
          </Link>
          <Link
            href="/account"
            className="workspace-profile"
            aria-label={`Your profile: ${user?.name ?? "Account"}, ${roleLabel(user?.role ?? "")}`}
          >
            <span className="workspace-avatar">
              {user?.name?.slice(0, 1) ?? "E"}
            </span>
            <span className="workspace-profile-name">
              <strong>{user?.name ?? "Account"}</strong>
              <small>{roleLabel(user?.role ?? "")}</small>
            </span>
          </Link>
          <button
            className="workspace-signout"
            onClick={onLogout}
            disabled={!ready}
            aria-label="Sign Out"
          >
            <LogOut size={19} />
            <span className="workspace-nav-label">Sign Out</span>
          </button>
          <span className="workspace-counter-state" role="status">
            {access?.counterState === "stale"
              ? "Action counts could not refresh. Last confirmed counts shown."
              : access?.generatedAt
                ? ""
                : access?.counterState === "loading"
                  ? "Updating action counts…"
                  : "Action counts unavailable"}
          </span>
        </footer>
        {tooltip && (
          <div
            id="workspace-nav-tooltip"
            role="tooltip"
            className="workspace-nav-tooltip"
            style={{ top: tooltip.top }}
          >
            {tooltip.label}
          </div>
        )}
      </aside>
    </>
  );
}
